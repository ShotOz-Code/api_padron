// API de Gestión y Control Operativo para Cárnitas y Carne Asada PADRÓN.
// El ejecutable usa SQLite embebido: no necesita un servidor de base de datos.
package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

const (
	rolRH        = "RH_ADMIN"
	rolEncargado = "ENCARGADO"
	rolOperativo = "OPERATIVO"
)

type aplicacion struct {
	db      *sql.DB
	secreto []byte
}

type identidad struct {
	UsuarioID  int64
	EmpleadoID sql.NullInt64
	Rol        string
}

type errorAPI struct {
	Error string `json:"error"`
}

func main() {
	var rutaBD string
	var puerto int
	flag.StringVar(&rutaBD, "bd", "", "Ruta del archivo SQLite (por defecto: padron.db junto al ejecutable)")
	flag.IntVar(&puerto, "puerto", 8080, "Puerto HTTP")
	flag.Parse()

	if rutaBD == "" {
		if valor := os.Getenv("PADRON_BD"); valor != "" {
			rutaBD = valor
		} else {
			ejecutable, err := os.Executable()
			if err != nil {
				log.Fatal("No se pudo localizar el ejecutable: ", err)
			}
			rutaBD = filepath.Join(filepath.Dir(ejecutable), "padron.db")
		}
	}
	if err := os.MkdirAll(filepath.Dir(rutaBD), 0755); err != nil {
		log.Fatal("No se pudo preparar la carpeta de datos: ", err)
	}
	db, err := sql.Open("sqlite", "file:"+filepath.ToSlash(rutaBD)+"?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)")
	if err != nil {
		log.Fatal("No se pudo abrir la base de datos: ", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatal("No se pudo conectar a SQLite: ", err)
	}
	if err := migrar(db); err != nil {
		log.Fatal("No se pudo crear la estructura de datos: ", err)
	}
	if err := datosIniciales(db); err != nil {
		log.Fatal("No se pudieron crear los datos iniciales: ", err)
	}

	secreto := make([]byte, 32)
	if configurado := os.Getenv("PADRON_SECRETO"); configurado != "" {
		secreto = []byte(configurado)
	} else if _, err := rand.Read(secreto); err != nil {
		log.Fatal(err)
	}
	a := &aplicacion{db: db, secreto: secreto}
	r := a.enrutador()
	log.Printf("PADRÓN API escuchando en http://localhost:%d | Base de datos: %s", puerto, rutaBD)
	log.Fatal(r.Run(fmt.Sprintf(":%d", puerto)))
}

func migrar(db *sql.DB) error {
	esquema := []string{
		`CREATE TABLE IF NOT EXISTS sucursales (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
            direccion TEXT NOT NULL, telefono TEXT, activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS puestos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
            descripcion TEXT, es_critico INTEGER NOT NULL DEFAULT 0,
            requiere_suplente INTEGER NOT NULL DEFAULT 0, factor_propina REAL NOT NULL DEFAULT 1.0,
            activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK(factor_propina >= 0)
        )`,
		`CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT, numero_empleado TEXT NOT NULL UNIQUE COLLATE NOCASE,
            nombres TEXT NOT NULL, apellido_paterno TEXT NOT NULL, apellido_materno TEXT,
            curp TEXT UNIQUE COLLATE NOCASE, correo TEXT UNIQUE COLLATE NOCASE, telefono TEXT,
            fecha_ingreso TEXT NOT NULL, sueldo_semanal_centavos INTEGER NOT NULL,
            sucursal_id INTEGER NOT NULL REFERENCES sucursales(id), puesto_id INTEGER NOT NULL REFERENCES puestos(id),
            activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK(sueldo_semanal_centavos > 0)
        )`,
		`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER UNIQUE REFERENCES empleados(id),
            nombre_usuario TEXT NOT NULL UNIQUE COLLATE NOCASE, contrasena_hash TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('RH_ADMIN','ENCARGADO','OPERATIVO')),
            activo INTEGER NOT NULL DEFAULT 1, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER NOT NULL REFERENCES empleados(id),
            fecha TEXT NOT NULL, hora_inicio TEXT NOT NULL, hora_fin TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'PROGRAMADO' CHECK(estado IN ('PROGRAMADO','TRABAJADO','FALTA','RETARDO','CANCELADO')),
            horas_trabajadas REAL NOT NULL DEFAULT 0, notas TEXT, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(empleado_id, fecha, hora_inicio), CHECK(horas_trabajadas >= 0)
        )`,
		`CREATE TABLE IF NOT EXISTS solicitudes_permisos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER NOT NULL REFERENCES empleados(id),
            tipo TEXT NOT NULL CHECK(tipo IN ('VACACIONES','ENFERMEDAD','DESCANSO','PERMISO_EXTRAORDINARIO')),
            fecha_inicio TEXT NOT NULL, fecha_fin TEXT NOT NULL, motivo TEXT NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('PENDIENTE_SUPLENTE','PENDIENTE_APROBACION','APROBADA','RECHAZADA','CANCELADA')),
            requiere_cobertura INTEGER NOT NULL DEFAULT 0, observacion_dictamen TEXT,
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resuelto_en TEXT,
            CHECK(fecha_fin >= fecha_inicio)
        )`,
		`CREATE TABLE IF NOT EXISTS cobertura_turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, solicitud_id INTEGER NOT NULL UNIQUE REFERENCES solicitudes_permisos(id),
            suplente_id INTEGER NOT NULL REFERENCES empleados(id),
            estado TEXT NOT NULL CHECK(estado IN ('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA')),
            confirmado_en TEXT, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK(suplente_id <> 0)
        )`,
		`CREATE TABLE IF NOT EXISTS prestamos_empleado (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER NOT NULL REFERENCES empleados(id),
            monto_original_centavos INTEGER NOT NULL, saldo_centavos INTEGER NOT NULL,
            descuento_semanal_centavos INTEGER NOT NULL, numero_semanas INTEGER NOT NULL,
            motivo TEXT NOT NULL, estado TEXT NOT NULL CHECK(estado IN ('PENDIENTE','APROBADO','RECHAZADO','LIQUIDADO','CANCELADO')),
            observacion_dictamen TEXT, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, aprobado_en TEXT,
            CHECK(monto_original_centavos > 0), CHECK(saldo_centavos >= 0),
            CHECK(descuento_semanal_centavos > 0), CHECK(numero_semanas BETWEEN 1 AND 52)
        )`,
		`CREATE TABLE IF NOT EXISTS retenciones_prestamo (
            id INTEGER PRIMARY KEY AUTOINCREMENT, prestamo_id INTEGER NOT NULL REFERENCES prestamos_empleado(id),
            semana_inicio TEXT NOT NULL, monto_centavos INTEGER NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(prestamo_id, semana_inicio), CHECK(monto_centavos > 0)
        )`,
		`CREATE TABLE IF NOT EXISTS propinas_bolsas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
            fecha TEXT NOT NULL, monto_centavos INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK(estado IN ('ABIERTA','CALCULADA','CERRADA')),
            creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(sucursal_id, fecha), CHECK(monto_centavos > 0)
        )`,
		`CREATE TABLE IF NOT EXISTS propinas_asignacion (
            id INTEGER PRIMARY KEY AUTOINCREMENT, bolsa_id INTEGER NOT NULL REFERENCES propinas_bolsas(id),
            empleado_id INTEGER NOT NULL REFERENCES empleados(id), horas_ponderadas REAL NOT NULL,
            monto_centavos INTEGER NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bolsa_id, empleado_id), CHECK(horas_ponderadas > 0), CHECK(monto_centavos >= 0)
        )`,
		`CREATE TABLE IF NOT EXISTS buzon_sugerencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER REFERENCES empleados(id),
            anonimo INTEGER NOT NULL DEFAULT 0, tipo TEXT NOT NULL CHECK(tipo IN ('SUGERENCIA','QUEJA','INCIDENTE_MANTENIMIENTO','SEGURIDAD','CLIMA_LABORAL')),
            asunto TEXT NOT NULL, descripcion TEXT NOT NULL, prioridad TEXT NOT NULL DEFAULT 'MEDIA' CHECK(prioridad IN ('BAJA','MEDIA','ALTA','CRITICA')),
            estado TEXT NOT NULL DEFAULT 'RECIBIDO' CHECK(estado IN ('RECIBIDO','EN_REVISION','ATENDIDO','CERRADO')),
            respuesta TEXT, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, atendido_en TEXT
        )`,
		`CREATE TABLE IF NOT EXISTS historico_incidencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT, empleado_id INTEGER REFERENCES empleados(id),
            tipo TEXT NOT NULL CHECK(tipo IN ('ASISTENCIA_DIA_PICO','RETARDO','FALTA_JUSTIFICADA','FALTA_INJUSTIFICADA','CAMBIO_SALARIAL','CAMBIO_PUESTO','PERMISO','PRESTAMO','OTRO')),
            descripcion TEXT NOT NULL, fecha_evento TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER REFERENCES usuarios(id), accion TEXT NOT NULL,
            entidad TEXT NOT NULL, entidad_id INTEGER, detalle TEXT, creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
		`CREATE TRIGGER IF NOT EXISTS impedir_actualizar_historico BEFORE UPDATE ON historico_incidencias BEGIN SELECT RAISE(ABORT, 'El histórico de incidencias es inmutable'); END`,
		`CREATE TRIGGER IF NOT EXISTS impedir_borrar_historico BEFORE DELETE ON historico_incidencias BEGIN SELECT RAISE(ABORT, 'El histórico de incidencias es inmutable'); END`,
	}
	for _, consulta := range esquema {
		if _, err := db.Exec(consulta); err != nil {
			return err
		}
	}
	return nil
}

func datosIniciales(db *sql.DB) error {
	var conteo int
	if err := db.QueryRow(`SELECT COUNT(*) FROM sucursales`).Scan(&conteo); err != nil {
		return err
	}
	if conteo == 0 {
		if _, err := db.Exec(`INSERT INTO sucursales(nombre,direccion,telefono) VALUES ('Matriz PADRÓN','Pendiente de configurar','')`); err != nil {
			return err
		}
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM puestos`).Scan(&conteo); err != nil {
		return err
	}
	if conteo == 0 {
		_, err := db.Exec(`INSERT INTO puestos(nombre,descripcion,es_critico,requiere_suplente,factor_propina) VALUES
            ('Maestro Carnitero','Responsable de carnitas y cazo',1,1,1.30),
            ('Parrillero','Responsable de asador',1,1,1.25),
            ('Tablajero','Preparación y corte',1,1,1.15),
            ('Mesero','Servicio al cliente',0,0,1.00),
            ('Cajero','Cobro y caja',1,1,1.00),
            ('Limpieza','Limpieza y apoyo operativo',0,0,0.80)`)
		if err != nil {
			return err
		}
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM usuarios WHERE nombre_usuario='admin'`).Scan(&conteo); err != nil {
		return err
	}
	if conteo == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("Cambiar123!"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_, err = db.Exec(`INSERT INTO usuarios(nombre_usuario,contrasena_hash,rol) VALUES ('admin',?,?)`, string(hash), rolRH)
		return err
	}
	return nil
}

func (a *aplicacion) enrutador() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), limiteCuerpo())
	r.GET("/salud", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"estado": "activo", "servicio": "PADRÓN RH API", "hora": time.Now().Format(time.RFC3339)})
	})
	r.POST("/api/v1/autenticacion/iniciar-sesion", a.iniciarSesion)

	api := r.Group("/api/v1")
	api.Use(a.autenticar())
	api.GET("/mi-perfil", a.miPerfil)
	api.POST("/mi-perfil/cambiar-contrasena", a.cambiarContrasena)
	api.GET("/catalogos/sucursales", a.listarSucursales)
	api.GET("/catalogos/puestos", a.listarPuestos)
	api.GET("/turnos/mios", a.misTurnos)
	api.GET("/solicitudes-permisos/mias", a.misSolicitudes)
	api.POST("/solicitudes-permisos", a.crearSolicitud)
	api.POST("/solicitudes-permisos/:id/cancelar", a.cancelarSolicitud)
	api.POST("/solicitudes-permisos/:id/cobertura/confirmar", a.confirmarCobertura)
	api.POST("/prestamos", a.solicitarPrestamo)
	api.GET("/prestamos/mios", a.misPrestamos)
	api.GET("/propinas/mias", a.misPropinas)
	api.POST("/buzon-sugerencias", a.enviarBuzon)
	api.GET("/buzon-sugerencias/mios", a.misBuzon)

	gestion := api.Group("")
	gestion.Use(requerirRoles(rolRH, rolEncargado))
	gestion.GET("/empleados", a.listarEmpleados)
	gestion.GET("/empleados/:id", a.obtenerEmpleado)
	gestion.POST("/empleados", a.crearEmpleado)
	gestion.PATCH("/empleados/:id", a.actualizarEmpleado)
	gestion.GET("/turnos", a.listarTurnos)
	gestion.POST("/turnos", a.crearTurno)
	gestion.PATCH("/turnos/:id", a.actualizarTurno)
	gestion.GET("/solicitudes-permisos", a.listarSolicitudes)
	gestion.POST("/solicitudes-permisos/:id/aprobar", a.aprobarSolicitud)
	gestion.POST("/solicitudes-permisos/:id/rechazar", a.rechazarSolicitud)
	gestion.GET("/prestamos", a.listarPrestamos)
	gestion.POST("/prestamos/:id/aprobar", a.aprobarPrestamo)
	gestion.POST("/prestamos/:id/rechazar", a.rechazarPrestamo)
	gestion.POST("/prestamos/:id/registrar-retencion", a.registrarRetencion)
	gestion.POST("/propinas/bolsas", a.crearBolsaPropinas)
	gestion.GET("/propinas/bolsas", a.listarBolsasPropinas)
	gestion.POST("/propinas/bolsas/:id/calcular-asignaciones", a.calcularPropinas)
	gestion.GET("/buzon-sugerencias", a.listarBuzon)
	gestion.PATCH("/buzon-sugerencias/:id", a.atenderBuzon)
	gestion.GET("/historico-incidencias", a.listarHistorico)
	gestion.POST("/historico-incidencias", a.crearHistorico)
	gestion.GET("/reportes/ausentismo", a.reporteAusentismo)
	gestion.GET("/reportes/rotacion-por-puesto", a.reporteRotacion)
	gestion.GET("/reportes/retenciones-nomina", a.reporteRetenciones)

	rh := api.Group("")
	rh.Use(requerirRoles(rolRH))
	rh.POST("/sucursales", a.crearSucursal)
	rh.PATCH("/sucursales/:id", a.actualizarSucursal)
	rh.POST("/puestos", a.crearPuesto)
	rh.PATCH("/puestos/:id", a.actualizarPuesto)
	rh.GET("/usuarios", a.listarUsuarios)
	rh.POST("/usuarios", a.crearUsuario)
	rh.PATCH("/usuarios/:id", a.actualizarUsuario)
	return r
}

func limiteCuerpo() gin.HandlerFunc {
	return func(c *gin.Context) { c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20); c.Next() }
}
func responderError(c *gin.Context, estado int, mensaje string) {
	c.JSON(estado, errorAPI{Error: mensaje})
}
func responderBD(c *gin.Context, err error) {
	log.Printf("Error SQL: %v", err)
	responderError(c, http.StatusInternalServerError, "Ocurrió un error al procesar los datos")
}

func leerJSON(c *gin.Context, destino any) bool {
	if err := c.ShouldBindJSON(destino); err != nil {
		var syntax *json.SyntaxError
		if errors.As(err, &syntax) || errors.Is(err, io.ErrUnexpectedEOF) {
			responderError(c, http.StatusBadRequest, "El JSON no tiene un formato válido")
		} else {
			responderError(c, http.StatusBadRequest, "Datos inválidos: "+err.Error())
		}
		return false
	}
	return true
}

func enteroParametro(c *gin.Context, nombre string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(nombre), 10, 64)
	if err != nil || id <= 0 {
		responderError(c, http.StatusBadRequest, "El identificador debe ser un entero positivo")
		return 0, false
	}
	return id, true
}

func fechaValida(valor string) (time.Time, error) { return time.Parse("2006-01-02", valor) }
func horaValida(valor string) error               { _, err := time.Parse("15:04", valor); return err }
func textoRequerido(valor string, max int, campo string) (string, error) {
	valor = strings.TrimSpace(valor)
	if valor == "" {
		return "", fmt.Errorf("%s es obligatorio", campo)
	}
	if len([]rune(valor)) > max {
		return "", fmt.Errorf("%s no puede exceder %d caracteres", campo, max)
	}
	return valor, nil
}
func normalizarMayusculas(valor string) string { return strings.ToUpper(strings.TrimSpace(valor)) }
func esCorreoValido(valor string) bool {
	if valor == "" {
		return true
	}
	p := strings.Split(valor, "@")
	return len(p) == 2 && p[0] != "" && strings.Contains(p[1], ".") && !strings.ContainsAny(valor, " \t\n")
}
func esCURPValida(valor string) bool {
	if valor == "" {
		return true
	}
	if len(valor) != 18 {
		return false
	}
	for _, r := range valor {
		if !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') {
			return false
		}
	}
	return true
}
func esAdministrador(i identidad) bool { return i.Rol == rolRH || i.Rol == rolEncargado }

func (a *aplicacion) iniciarSesion(c *gin.Context) {
	var entrada struct {
		Usuario    string `json:"usuario" binding:"required,max=80"`
		Contrasena string `json:"contrasena" binding:"required,min=8,max=128"`
	}
	if !leerJSON(c, &entrada) {
		return
	}
	var id int64
	var empleado sql.NullInt64
	var hash, rol string
	var activo int
	err := a.db.QueryRow(`SELECT id,empleado_id,contrasena_hash,rol,activo FROM usuarios WHERE nombre_usuario=? COLLATE NOCASE`, strings.TrimSpace(entrada.Usuario)).Scan(&id, &empleado, &hash, &rol, &activo)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && (activo == 0 || bcrypt.CompareHashAndPassword([]byte(hash), []byte(entrada.Contrasena)) != nil)) {
		responderError(c, http.StatusUnauthorized, "Usuario o contraseña incorrectos")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	token, err := a.crearToken(id, rol)
	if err != nil {
		responderBD(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "tipo": "Bearer", "expira_en_minutos": 480, "rol": rol, "usuario_id": id, "empleado_id": nuloAJSON(empleado)})
}

func (a *aplicacion) crearToken(id int64, rol string) (string, error) {
	carga := fmt.Sprintf("%d|%s|%d", id, rol, time.Now().Add(8*time.Hour).Unix())
	firma := hmac.New(sha256.New, a.secreto)
	_, _ = firma.Write([]byte(carga))
	return base64.RawURLEncoding.EncodeToString([]byte(carga)) + "." + base64.RawURLEncoding.EncodeToString(firma.Sum(nil)), nil
}
func (a *aplicacion) validarToken(token string) (int64, string, error) {
	partes := strings.Split(token, ".")
	if len(partes) != 2 {
		return 0, "", errors.New("token inválido")
	}
	carga, err := base64.RawURLEncoding.DecodeString(partes[0])
	if err != nil {
		return 0, "", err
	}
	firma, err := base64.RawURLEncoding.DecodeString(partes[1])
	if err != nil {
		return 0, "", err
	}
	esperada := hmac.New(sha256.New, a.secreto)
	_, _ = esperada.Write(carga)
	if !hmac.Equal(firma, esperada.Sum(nil)) {
		return 0, "", errors.New("firma inválida")
	}
	partesCarga := strings.Split(string(carga), "|")
	if len(partesCarga) != 3 {
		return 0, "", errors.New("carga inválida")
	}
	id, err := strconv.ParseInt(partesCarga[0], 10, 64)
	if err != nil || id <= 0 {
		return 0, "", errors.New("id inválido")
	}
	expira, err := strconv.ParseInt(partesCarga[2], 10, 64)
	if err != nil || time.Now().Unix() > expira {
		return 0, "", errors.New("token vencido")
	}
	return id, partesCarga[1], nil
}
func (a *aplicacion) autenticar() gin.HandlerFunc {
	return func(c *gin.Context) {
		cabecera := c.GetHeader("Authorization")
		partes := strings.Fields(cabecera)
		if len(partes) != 2 || !strings.EqualFold(partes[0], "Bearer") {
			responderError(c, http.StatusUnauthorized, "Se requiere un token Bearer")
			c.Abort()
			return
		}
		id, _, err := a.validarToken(partes[1])
		if err != nil {
			responderError(c, http.StatusUnauthorized, "Token inválido o vencido")
			c.Abort()
			return
		}
		var identidadActual identidad
		var activo int
		err = a.db.QueryRow(`SELECT id,empleado_id,rol,activo FROM usuarios WHERE id=?`, id).Scan(&identidadActual.UsuarioID, &identidadActual.EmpleadoID, &identidadActual.Rol, &activo)
		if err != nil || activo == 0 {
			responderError(c, http.StatusUnauthorized, "La sesión ya no está activa")
			c.Abort()
			return
		}
		c.Set("identidad", identidadActual)
		c.Next()
	}
}
func requerirRoles(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		i := obtenerIdentidad(c)
		for _, rol := range roles {
			if i.Rol == rol {
				c.Next()
				return
			}
		}
		responderError(c, http.StatusForbidden, "No tiene permiso para esta operación")
		c.Abort()
	}
}
func obtenerIdentidad(c *gin.Context) identidad {
	valor, _ := c.Get("identidad")
	return valor.(identidad)
}
func nuloAJSON(n sql.NullInt64) any {
	if n.Valid {
		return n.Int64
	}
	return nil
}
func nuloTextoAJSON(n sql.NullString) any {
	if n.Valid {
		return n.String
	}
	return nil
}

func (a *aplicacion) registrarAuditoria(usuarioID int64, accion, entidad string, entidadID int64, detalle string) {
	_, _ = a.db.Exec(`INSERT INTO auditoria(usuario_id,accion,entidad,entidad_id,detalle) VALUES (?,?,?,?,?)`, usuarioID, accion, entidad, entidadID, detalle)
}
func (a *aplicacion) registrarHistorico(empleadoID int64, tipo, descripcion, fecha string) error {
	_, err := a.db.Exec(`INSERT INTO historico_incidencias(empleado_id,tipo,descripcion,fecha_evento) VALUES (?,?,?,?)`, empleadoID, tipo, descripcion, fecha)
	return err
}

func (a *aplicacion) miPerfil(c *gin.Context) {
	i := obtenerIdentidad(c)
	if !i.EmpleadoID.Valid {
		c.JSON(http.StatusOK, gin.H{"usuario_id": i.UsuarioID, "rol": i.Rol, "empleado": nil})
		return
	}
	var e empleadoRespuesta
	err := a.db.QueryRow(consultaEmpleado+` WHERE e.id=?`, i.EmpleadoID.Int64).Scan(&e.ID, &e.NumeroEmpleado, &e.Nombres, &e.ApellidoPaterno, &e.ApellidoMaterno, &e.CURP, &e.Correo, &e.Telefono, &e.FechaIngreso, &e.SueldoSemanalCentavos, &e.SucursalID, &e.Sucursal, &e.PuestoID, &e.Puesto, &e.Activo)
	if err != nil {
		responderBD(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"usuario_id": i.UsuarioID, "rol": i.Rol, "empleado": e})
}

func (a *aplicacion) cambiarContrasena(c *gin.Context) {
	var entrada struct {
		ContrasenaActual string `json:"contrasena_actual"`
		ContrasenaNueva  string `json:"contrasena_nueva"`
	}
	if !leerJSON(c, &entrada) {
		return
	}
	if len(entrada.ContrasenaNueva) < 8 || len(entrada.ContrasenaNueva) > 128 {
		responderError(c, http.StatusBadRequest, "contrasena_nueva debe tener entre 8 y 128 caracteres")
		return
	}
	i := obtenerIdentidad(c)
	var hash string
	if err := a.db.QueryRow(`SELECT contrasena_hash FROM usuarios WHERE id=?`, i.UsuarioID).Scan(&hash); err != nil {
		responderBD(c, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(entrada.ContrasenaActual)) != nil {
		responderError(c, http.StatusUnauthorized, "La contraseña actual no es correcta")
		return
	}
	nuevoHash, err := bcrypt.GenerateFromPassword([]byte(entrada.ContrasenaNueva), bcrypt.DefaultCost)
	if err != nil {
		responderBD(c, err)
		return
	}
	if _, err = a.db.Exec(`UPDATE usuarios SET contrasena_hash=? WHERE id=?`, nuevoHash, i.UsuarioID); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(i.UsuarioID, "CAMBIAR_CONTRASENA", "USUARIO", i.UsuarioID, "Cambio propio")
	c.JSON(http.StatusOK, gin.H{"mensaje": "Contraseña actualizada correctamente"})
}

const consultaEmpleado = `SELECT e.id,e.numero_empleado,e.nombres,e.apellido_paterno,COALESCE(e.apellido_materno,''),COALESCE(e.curp,''),COALESCE(e.correo,''),COALESCE(e.telefono,''),e.fecha_ingreso,e.sueldo_semanal_centavos,e.sucursal_id,s.nombre,e.puesto_id,p.nombre,e.activo FROM empleados e JOIN sucursales s ON s.id=e.sucursal_id JOIN puestos p ON p.id=e.puesto_id`

type empleadoRespuesta struct {
	ID                    int64  `json:"id"`
	NumeroEmpleado        string `json:"numero_empleado"`
	Nombres               string `json:"nombres"`
	ApellidoPaterno       string `json:"apellido_paterno"`
	ApellidoMaterno       string `json:"apellido_materno"`
	CURP                  string `json:"curp"`
	Correo                string `json:"correo"`
	Telefono              string `json:"telefono"`
	FechaIngreso          string `json:"fecha_ingreso"`
	SueldoSemanalCentavos int64  `json:"sueldo_semanal_centavos"`
	SucursalID            int64  `json:"sucursal_id"`
	Sucursal              string `json:"sucursal"`
	PuestoID              int64  `json:"puesto_id"`
	Puesto                string `json:"puesto"`
	Activo                int    `json:"activo"`
}

func (a *aplicacion) listarSucursales(c *gin.Context) {
	filas, err := a.db.Query(`SELECT id,nombre,direccion,COALESCE(telefono,''),activo,creado_en FROM sucursales ORDER BY nombre`)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []gin.H{}
	for filas.Next() {
		var id int64
		var nombre, direccion, tel, creado string
		var activo int
		if err := filas.Scan(&id, &nombre, &direccion, &tel, &activo, &creado); err != nil {
			responderBD(c, err)
			return
		}
		resultado = append(resultado, gin.H{"id": id, "nombre": nombre, "direccion": direccion, "telefono": tel, "activo": activo == 1, "creado_en": creado})
	}
	c.JSON(http.StatusOK, resultado)
}
func (a *aplicacion) listarPuestos(c *gin.Context) {
	filas, err := a.db.Query(`SELECT id,nombre,COALESCE(descripcion,''),es_critico,requiere_suplente,factor_propina,activo FROM puestos ORDER BY nombre`)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []gin.H{}
	for filas.Next() {
		var id int64
		var nombre, desc string
		var critico, suplente, activo int
		var factor float64
		if err := filas.Scan(&id, &nombre, &desc, &critico, &suplente, &factor, &activo); err != nil {
			responderBD(c, err)
			return
		}
		resultado = append(resultado, gin.H{"id": id, "nombre": nombre, "descripcion": desc, "es_critico": critico == 1, "requiere_suplente": suplente == 1, "factor_propina": factor, "activo": activo == 1})
	}
	c.JSON(http.StatusOK, resultado)
}

func (a *aplicacion) crearSucursal(c *gin.Context) {
	var e struct {
		Nombre    string `json:"nombre"`
		Direccion string `json:"direccion"`
		Telefono  string `json:"telefono"`
		Activo    *bool  `json:"activo"`
	}
	if !leerJSON(c, &e) {
		return
	}
	nombre, err := textoRequerido(e.Nombre, 100, "nombre")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	direccion, err := textoRequerido(e.Direccion, 250, "dirección")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	activo := 1
	if e.Activo != nil && !(*e.Activo) {
		activo = 0
	}
	r, err := a.db.Exec(`INSERT INTO sucursales(nombre,direccion,telefono,activo) VALUES (?,?,?,?)`, nombre, direccion, strings.TrimSpace(e.Telefono), activo)
	if err != nil {
		responderError(c, 409, "Ya existe una sucursal con ese nombre")
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "SUCURSAL", id, nombre)
	c.JSON(201, gin.H{"id": id, "mensaje": "Sucursal creada correctamente"})
}
func (a *aplicacion) actualizarSucursal(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Nombre    *string `json:"nombre"`
		Direccion *string `json:"direccion"`
		Telefono  *string `json:"telefono"`
		Activo    *bool   `json:"activo"`
	}
	if !leerJSON(c, &e) {
		return
	}
	var nombre, direccion, telefono string
	var activo int
	err := a.db.QueryRow(`SELECT nombre,direccion,COALESCE(telefono,''),activo FROM sucursales WHERE id=?`, id).Scan(&nombre, &direccion, &telefono, &activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Sucursal no encontrada")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if e.Nombre != nil {
		nombre, err = textoRequerido(*e.Nombre, 100, "nombre")
		if err != nil {
			responderError(c, 400, err.Error())
			return
		}
	}
	if e.Direccion != nil {
		direccion, err = textoRequerido(*e.Direccion, 250, "dirección")
		if err != nil {
			responderError(c, 400, err.Error())
			return
		}
	}
	if e.Telefono != nil {
		telefono = strings.TrimSpace(*e.Telefono)
	}
	if e.Activo != nil {
		if *e.Activo {
			activo = 1
		} else {
			activo = 0
		}
	}
	if _, err = a.db.Exec(`UPDATE sucursales SET nombre=?,direccion=?,telefono=?,activo=? WHERE id=?`, nombre, direccion, telefono, activo, id); err != nil {
		responderError(c, 409, "No se pudo actualizar: el nombre ya está en uso")
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ACTUALIZAR", "SUCURSAL", id, nombre)
	c.JSON(200, gin.H{"mensaje": "Sucursal actualizada correctamente"})
}

func (a *aplicacion) crearPuesto(c *gin.Context) {
	var e struct {
		Nombre           string  `json:"nombre"`
		Descripcion      string  `json:"descripcion"`
		EsCritico        bool    `json:"es_critico"`
		RequiereSuplente bool    `json:"requiere_suplente"`
		FactorPropina    float64 `json:"factor_propina"`
	}
	if !leerJSON(c, &e) {
		return
	}
	nombre, err := textoRequerido(e.Nombre, 100, "nombre")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if e.RequiereSuplente && !e.EsCritico {
		responderError(c, 400, "Un puesto que requiere suplente debe ser crítico")
		return
	}
	if e.FactorPropina <= 0 || e.FactorPropina > 5 {
		responderError(c, 400, "factor_propina debe estar entre 0.01 y 5")
		return
	}
	r, err := a.db.Exec(`INSERT INTO puestos(nombre,descripcion,es_critico,requiere_suplente,factor_propina) VALUES (?,?,?,?,?)`, nombre, strings.TrimSpace(e.Descripcion), boolAInt(e.EsCritico), boolAInt(e.RequiereSuplente), e.FactorPropina)
	if err != nil {
		responderError(c, 409, "Ya existe un puesto con ese nombre")
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "PUESTO", id, nombre)
	c.JSON(201, gin.H{"id": id, "mensaje": "Puesto creado correctamente"})
}
func (a *aplicacion) actualizarPuesto(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Nombre           *string  `json:"nombre"`
		Descripcion      *string  `json:"descripcion"`
		EsCritico        *bool    `json:"es_critico"`
		RequiereSuplente *bool    `json:"requiere_suplente"`
		FactorPropina    *float64 `json:"factor_propina"`
		Activo           *bool    `json:"activo"`
	}
	if !leerJSON(c, &e) {
		return
	}
	var nombre, desc string
	var critico, suplente, activo int
	var factor float64
	err := a.db.QueryRow(`SELECT nombre,COALESCE(descripcion,''),es_critico,requiere_suplente,factor_propina,activo FROM puestos WHERE id=?`, id).Scan(&nombre, &desc, &critico, &suplente, &factor, &activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Puesto no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if e.Nombre != nil {
		nombre, err = textoRequerido(*e.Nombre, 100, "nombre")
		if err != nil {
			responderError(c, 400, err.Error())
			return
		}
	}
	if e.Descripcion != nil {
		desc = strings.TrimSpace(*e.Descripcion)
	}
	if e.EsCritico != nil {
		critico = boolAInt(*e.EsCritico)
	}
	if e.RequiereSuplente != nil {
		suplente = boolAInt(*e.RequiereSuplente)
	}
	if e.FactorPropina != nil {
		factor = *e.FactorPropina
	}
	if e.Activo != nil {
		activo = boolAInt(*e.Activo)
	}
	if suplente == 1 && critico == 0 {
		responderError(c, 400, "Un puesto que requiere suplente debe ser crítico")
		return
	}
	if factor <= 0 || factor > 5 {
		responderError(c, 400, "factor_propina debe estar entre 0.01 y 5")
		return
	}
	if _, err = a.db.Exec(`UPDATE puestos SET nombre=?,descripcion=?,es_critico=?,requiere_suplente=?,factor_propina=?,activo=? WHERE id=?`, nombre, desc, critico, suplente, factor, activo, id); err != nil {
		responderError(c, 409, "No se pudo actualizar el puesto")
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ACTUALIZAR", "PUESTO", id, nombre)
	c.JSON(200, gin.H{"mensaje": "Puesto actualizado correctamente"})
}
func boolAInt(valor bool) int {
	if valor {
		return 1
	}
	return 0
}

func rolValido(rol string) bool { return rol == rolRH || rol == rolEncargado || rol == rolOperativo }
func (a *aplicacion) listarUsuarios(c *gin.Context) {
	filas, err := a.db.Query(`SELECT u.id,u.empleado_id,u.nombre_usuario,u.rol,u.activo,u.creado_en,COALESCE(e.numero_empleado,''),COALESCE(e.nombres||' '||e.apellido_paterno,'') FROM usuarios u LEFT JOIN empleados e ON e.id=u.empleado_id ORDER BY u.nombre_usuario`)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []gin.H{}
	for filas.Next() {
		var id int64
		var empleado sql.NullInt64
		var usuario, rol, creado, numero, nombre string
		var activo int
		if err := filas.Scan(&id, &empleado, &usuario, &rol, &activo, &creado, &numero, &nombre); err != nil {
			responderBD(c, err)
			return
		}
		resultado = append(resultado, gin.H{"id": id, "empleado_id": nuloAJSON(empleado), "numero_empleado": numero, "empleado": nombre, "usuario": usuario, "rol": rol, "activo": activo == 1, "creado_en": creado})
	}
	c.JSON(http.StatusOK, resultado)
}
func (a *aplicacion) crearUsuario(c *gin.Context) {
	var entrada struct {
		EmpleadoID int64  `json:"empleado_id"`
		Usuario    string `json:"usuario"`
		Contrasena string `json:"contrasena"`
		Rol        string `json:"rol"`
	}
	if !leerJSON(c, &entrada) {
		return
	}
	if entrada.EmpleadoID <= 0 {
		responderError(c, http.StatusBadRequest, "empleado_id es obligatorio")
		return
	}
	if err := a.empleadoActivo(entrada.EmpleadoID); err != nil {
		responderError(c, http.StatusBadRequest, err.Error())
		return
	}
	usuario, err := textoRequerido(entrada.Usuario, 80, "usuario")
	if err != nil {
		responderError(c, http.StatusBadRequest, err.Error())
		return
	}
	if len(entrada.Contrasena) < 8 || len(entrada.Contrasena) > 128 {
		responderError(c, http.StatusBadRequest, "contrasena debe tener entre 8 y 128 caracteres")
		return
	}
	entrada.Rol = normalizarMayusculas(entrada.Rol)
	if !rolValido(entrada.Rol) {
		responderError(c, http.StatusBadRequest, "rol inválido")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(entrada.Contrasena), bcrypt.DefaultCost)
	if err != nil {
		responderBD(c, err)
		return
	}
	r, err := a.db.Exec(`INSERT INTO usuarios(empleado_id,nombre_usuario,contrasena_hash,rol) VALUES (?,?,?,?)`, entrada.EmpleadoID, usuario, hash, entrada.Rol)
	if err != nil {
		responderError(c, http.StatusConflict, "El empleado ya tiene usuario o el nombre de usuario está en uso")
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "USUARIO", id, usuario)
	c.JSON(http.StatusCreated, gin.H{"id": id, "mensaje": "Usuario creado correctamente"})
}
func (a *aplicacion) actualizarUsuario(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var entrada struct {
		Usuario    *string `json:"usuario"`
		Contrasena *string `json:"contrasena"`
		Rol        *string `json:"rol"`
		Activo     *bool   `json:"activo"`
	}
	if !leerJSON(c, &entrada) {
		return
	}
	var usuario, hash, rolActual string
	var activo int
	err := a.db.QueryRow(`SELECT nombre_usuario,contrasena_hash,rol,activo FROM usuarios WHERE id=?`, id).Scan(&usuario, &hash, &rolActual, &activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, http.StatusNotFound, "Usuario no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	rolNuevo := rolActual
	if entrada.Usuario != nil {
		usuario, err = textoRequerido(*entrada.Usuario, 80, "usuario")
		if err != nil {
			responderError(c, http.StatusBadRequest, err.Error())
			return
		}
	}
	if entrada.Contrasena != nil {
		if len(*entrada.Contrasena) < 8 || len(*entrada.Contrasena) > 128 {
			responderError(c, http.StatusBadRequest, "contrasena debe tener entre 8 y 128 caracteres")
			return
		}
		hashBytes, er := bcrypt.GenerateFromPassword([]byte(*entrada.Contrasena), bcrypt.DefaultCost)
		if er != nil {
			responderBD(c, er)
			return
		}
		hash = string(hashBytes)
	}
	if entrada.Rol != nil {
		rolNuevo = normalizarMayusculas(*entrada.Rol)
		if !rolValido(rolNuevo) {
			responderError(c, http.StatusBadRequest, "rol inválido")
			return
		}
	}
	activoNuevo := activo
	if entrada.Activo != nil {
		activoNuevo = boolAInt(*entrada.Activo)
	}
	if rolActual == rolRH && activo == 1 && (rolNuevo != rolRH || activoNuevo == 0) {
		var otros int
		if err := a.db.QueryRow(`SELECT COUNT(*) FROM usuarios WHERE rol=? AND activo=1 AND id<>?`, rolRH, id).Scan(&otros); err != nil {
			responderBD(c, err)
			return
		}
		if otros == 0 {
			responderError(c, http.StatusConflict, "Debe permanecer al menos un usuario RH_ADMIN activo")
			return
		}
	}
	if _, err := a.db.Exec(`UPDATE usuarios SET nombre_usuario=?,contrasena_hash=?,rol=?,activo=? WHERE id=?`, usuario, hash, rolNuevo, activoNuevo, id); err != nil {
		responderError(c, http.StatusConflict, "No se pudo actualizar el usuario; nombre duplicado")
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ACTUALIZAR", "USUARIO", id, usuario)
	c.JSON(http.StatusOK, gin.H{"mensaje": "Usuario actualizado correctamente"})
}

type entradaEmpleado struct {
	NumeroEmpleado        string `json:"numero_empleado"`
	Nombres               string `json:"nombres"`
	ApellidoPaterno       string `json:"apellido_paterno"`
	ApellidoMaterno       string `json:"apellido_materno"`
	CURP                  string `json:"curp"`
	Correo                string `json:"correo"`
	Telefono              string `json:"telefono"`
	FechaIngreso          string `json:"fecha_ingreso"`
	SueldoSemanalCentavos int64  `json:"sueldo_semanal_centavos"`
	SucursalID            int64  `json:"sucursal_id"`
	PuestoID              int64  `json:"puesto_id"`
	Usuario               string `json:"usuario"`
	Contrasena            string `json:"contrasena"`
	Rol                   string `json:"rol"`
}

func validarEntradaEmpleado(e *entradaEmpleado) error {
	var err error
	if e.NumeroEmpleado, err = textoRequerido(e.NumeroEmpleado, 30, "numero_empleado"); err != nil {
		return err
	}
	for _, r := range e.NumeroEmpleado {
		if !(r >= 'A' && r <= 'Z') && !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '-' && r != '_' {
			return errors.New("numero_empleado solo admite letras, números, guion y guion bajo")
		}
	}
	if e.Nombres, err = textoRequerido(e.Nombres, 80, "nombres"); err != nil {
		return err
	}
	if e.ApellidoPaterno, err = textoRequerido(e.ApellidoPaterno, 80, "apellido_paterno"); err != nil {
		return err
	}
	e.ApellidoMaterno = strings.TrimSpace(e.ApellidoMaterno)
	e.CURP = normalizarMayusculas(e.CURP)
	e.Correo = strings.ToLower(strings.TrimSpace(e.Correo))
	e.Telefono = strings.TrimSpace(e.Telefono)
	if !esCURPValida(e.CURP) {
		return errors.New("CURP debe tener 18 caracteres alfanuméricos en mayúscula")
	}
	if !esCorreoValido(e.Correo) {
		return errors.New("correo no tiene un formato válido")
	}
	if len(e.Telefono) > 25 {
		return errors.New("telefono no puede exceder 25 caracteres")
	}
	fecha, err := fechaValida(e.FechaIngreso)
	if err != nil {
		return errors.New("fecha_ingreso debe tener formato AAAA-MM-DD")
	}
	if fecha.After(time.Now().AddDate(0, 0, 1)) {
		return errors.New("fecha_ingreso no puede ser futura")
	}
	if e.SueldoSemanalCentavos <= 0 {
		return errors.New("sueldo_semanal_centavos debe ser mayor a cero")
	}
	if e.SucursalID <= 0 || e.PuestoID <= 0 {
		return errors.New("sucursal_id y puesto_id deben ser enteros positivos")
	}
	if (e.Usuario == "") != (e.Contrasena == "") {
		return errors.New("usuario y contrasena deben enviarse juntos")
	}
	if e.Usuario != "" {
		if _, err := textoRequerido(e.Usuario, 80, "usuario"); err != nil {
			return err
		}
		if len(e.Contrasena) < 8 || len(e.Contrasena) > 128 {
			return errors.New("contrasena debe tener entre 8 y 128 caracteres")
		}
		if e.Rol == "" {
			e.Rol = rolOperativo
		}
		if e.Rol != rolOperativo && e.Rol != rolEncargado && e.Rol != rolRH {
			return errors.New("rol inválido")
		}
	}
	return nil
}
func (a *aplicacion) validarSucursalYPuesto(sucursalID, puestoID int64) error {
	var activo int
	if err := a.db.QueryRow(`SELECT activo FROM sucursales WHERE id=?`, sucursalID).Scan(&activo); errors.Is(err, sql.ErrNoRows) {
		return errors.New("sucursal_id no existe")
	} else if err != nil {
		return err
	} else if activo == 0 {
		return errors.New("La sucursal está inactiva")
	}
	if err := a.db.QueryRow(`SELECT activo FROM puestos WHERE id=?`, puestoID).Scan(&activo); errors.Is(err, sql.ErrNoRows) {
		return errors.New("puesto_id no existe")
	} else if err != nil {
		return err
	} else if activo == 0 {
		return errors.New("El puesto está inactivo")
	}
	return nil
}
func (a *aplicacion) crearEmpleado(c *gin.Context) {
	var e entradaEmpleado
	if !leerJSON(c, &e) {
		return
	}
	if err := validarEntradaEmpleado(&e); err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if err := a.validarSucursalYPuesto(e.SucursalID, e.PuestoID); err != nil {
		responderError(c, 400, err.Error())
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	r, err := tx.Exec(`INSERT INTO empleados(numero_empleado,nombres,apellido_paterno,apellido_materno,curp,correo,telefono,fecha_ingreso,sueldo_semanal_centavos,sucursal_id,puesto_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, e.NumeroEmpleado, e.Nombres, e.ApellidoPaterno, nuloTexto(e.ApellidoMaterno), nuloTexto(e.CURP), nuloTexto(e.Correo), nuloTexto(e.Telefono), e.FechaIngreso, e.SueldoSemanalCentavos, e.SucursalID, e.PuestoID)
	if err != nil {
		responderError(c, 409, "No se pudo crear: número, CURP o correo ya existen")
		return
	}
	id, _ := r.LastInsertId()
	var usuarioID any = nil
	if e.Usuario != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(e.Contrasena), bcrypt.DefaultCost)
		if err != nil {
			responderBD(c, err)
			return
		}
		ur, err := tx.Exec(`INSERT INTO usuarios(empleado_id,nombre_usuario,contrasena_hash,rol) VALUES (?,?,?,?)`, id, strings.TrimSpace(e.Usuario), hash, e.Rol)
		if err != nil {
			responderError(c, 409, "El nombre de usuario ya está en uso")
			return
		}
		usuarioID, _ = ur.LastInsertId()
	}
	if err := tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "EMPLEADO", id, e.NumeroEmpleado)
	c.JSON(201, gin.H{"id": id, "usuario_id": usuarioID, "mensaje": "Empleado creado correctamente"})
}
func nuloTexto(valor string) any {
	if valor == "" {
		return nil
	}
	return valor
}
func (a *aplicacion) listarEmpleados(c *gin.Context) {
	consulta := consultaEmpleado
	argumentos := []any{}
	condiciones := []string{}
	if v := c.Query("sucursal_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			responderError(c, 400, "sucursal_id debe ser positivo")
			return
		}
		condiciones = append(condiciones, "e.sucursal_id=?")
		argumentos = append(argumentos, id)
	}
	if v := c.Query("puesto_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			responderError(c, 400, "puesto_id debe ser positivo")
			return
		}
		condiciones = append(condiciones, "e.puesto_id=?")
		argumentos = append(argumentos, id)
	}
	if v := c.Query("activo"); v != "" {
		if v != "true" && v != "false" {
			responderError(c, 400, "activo debe ser true o false")
			return
		}
		condiciones = append(condiciones, "e.activo=?")
		argumentos = append(argumentos, boolAInt(v == "true"))
	}
	if len(condiciones) > 0 {
		consulta += " WHERE " + strings.Join(condiciones, " AND ")
	}
	consulta += " ORDER BY e.nombres,e.apellido_paterno"
	filas, err := a.db.Query(consulta, argumentos...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []empleadoRespuesta{}
	for filas.Next() {
		var e empleadoRespuesta
		if err := filas.Scan(&e.ID, &e.NumeroEmpleado, &e.Nombres, &e.ApellidoPaterno, &e.ApellidoMaterno, &e.CURP, &e.Correo, &e.Telefono, &e.FechaIngreso, &e.SueldoSemanalCentavos, &e.SucursalID, &e.Sucursal, &e.PuestoID, &e.Puesto, &e.Activo); err != nil {
			responderBD(c, err)
			return
		}
		resultado = append(resultado, e)
	}
	c.JSON(200, resultado)
}
func (a *aplicacion) obtenerEmpleado(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e empleadoRespuesta
	err := a.db.QueryRow(consultaEmpleado+` WHERE e.id=?`, id).Scan(&e.ID, &e.NumeroEmpleado, &e.Nombres, &e.ApellidoPaterno, &e.ApellidoMaterno, &e.CURP, &e.Correo, &e.Telefono, &e.FechaIngreso, &e.SueldoSemanalCentavos, &e.SucursalID, &e.Sucursal, &e.PuestoID, &e.Puesto, &e.Activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Empleado no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	c.JSON(200, e)
}
func (a *aplicacion) actualizarEmpleado(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var entrada struct {
		SucursalID            *int64  `json:"sucursal_id"`
		PuestoID              *int64  `json:"puesto_id"`
		SueldoSemanalCentavos *int64  `json:"sueldo_semanal_centavos"`
		Correo                *string `json:"correo"`
		Telefono              *string `json:"telefono"`
		Activo                *bool   `json:"activo"`
	}
	if !leerJSON(c, &entrada) {
		return
	}
	var sucursal, puesto, sueldo int64
	var correo, telefono string
	var activo int
	err := a.db.QueryRow(`SELECT sucursal_id,puesto_id,sueldo_semanal_centavos,COALESCE(correo,''),COALESCE(telefono,''),activo FROM empleados WHERE id=?`, id).Scan(&sucursal, &puesto, &sueldo, &correo, &telefono, &activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Empleado no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	puestoAnterior := puesto
	sueldoAnterior := sueldo
	if entrada.SucursalID != nil {
		sucursal = *entrada.SucursalID
	}
	if entrada.PuestoID != nil {
		puesto = *entrada.PuestoID
	}
	if entrada.SueldoSemanalCentavos != nil {
		sueldo = *entrada.SueldoSemanalCentavos
	}
	if entrada.Correo != nil {
		correo = strings.ToLower(strings.TrimSpace(*entrada.Correo))
		if !esCorreoValido(correo) {
			responderError(c, 400, "correo no tiene un formato válido")
			return
		}
	}
	if entrada.Telefono != nil {
		telefono = strings.TrimSpace(*entrada.Telefono)
		if len(telefono) > 25 {
			responderError(c, 400, "telefono no puede exceder 25 caracteres")
			return
		}
	}
	if entrada.Activo != nil {
		activo = boolAInt(*entrada.Activo)
	}
	if sueldo <= 0 {
		responderError(c, 400, "sueldo_semanal_centavos debe ser mayor a cero")
		return
	}
	if err := a.validarSucursalYPuesto(sucursal, puesto); err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if _, err = a.db.Exec(`UPDATE empleados SET sucursal_id=?,puesto_id=?,sueldo_semanal_centavos=?,correo=?,telefono=?,activo=? WHERE id=?`, sucursal, puesto, sueldo, nuloTexto(correo), nuloTexto(telefono), activo, id); err != nil {
		responderError(c, 409, "No se pudo actualizar el empleado; correo duplicado")
		return
	}
	hoy := time.Now().Format("2006-01-02")
	if puesto != puestoAnterior {
		_ = a.registrarHistorico(id, "CAMBIO_PUESTO", fmt.Sprintf("Cambio de puesto %d a %d", puestoAnterior, puesto), hoy)
	}
	if sueldo != sueldoAnterior {
		_ = a.registrarHistorico(id, "CAMBIO_SALARIAL", fmt.Sprintf("Sueldo semanal actualizado de %d a %d centavos", sueldoAnterior, sueldo), hoy)
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ACTUALIZAR", "EMPLEADO", id, "Datos laborales actualizados")
	c.JSON(200, gin.H{"mensaje": "Empleado actualizado correctamente"})
}

func (a *aplicacion) empleadoActivo(id int64) error {
	var activo int
	err := a.db.QueryRow(`SELECT activo FROM empleados WHERE id=?`, id).Scan(&activo)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("empleado_id no existe")
	}
	if err != nil {
		return err
	}
	if activo == 0 {
		return errors.New("El empleado está inactivo")
	}
	return nil
}
func horasDeTurno(inicio, fin string) (float64, error) {
	if err := horaValida(inicio); err != nil {
		return 0, errors.New("hora_inicio debe tener formato HH:MM")
	}
	if err := horaValida(fin); err != nil {
		return 0, errors.New("hora_fin debe tener formato HH:MM")
	}
	a, _ := time.Parse("15:04", inicio)
	b, _ := time.Parse("15:04", fin)
	if !b.After(a) {
		return 0, errors.New("hora_fin debe ser posterior a hora_inicio")
	}
	return b.Sub(a).Hours(), nil
}
func estadoTurnoValido(v string) bool {
	return v == "PROGRAMADO" || v == "TRABAJADO" || v == "FALTA" || v == "RETARDO" || v == "CANCELADO"
}
func (a *aplicacion) crearTurno(c *gin.Context) {
	var e struct {
		EmpleadoID      int64   `json:"empleado_id"`
		Fecha           string  `json:"fecha"`
		HoraInicio      string  `json:"hora_inicio"`
		HoraFin         string  `json:"hora_fin"`
		Estado          string  `json:"estado"`
		HorasTrabajadas float64 `json:"horas_trabajadas"`
		Notas           string  `json:"notas"`
	}
	if !leerJSON(c, &e) {
		return
	}
	if err := a.empleadoActivo(e.EmpleadoID); err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if _, err := fechaValida(e.Fecha); err != nil {
		responderError(c, 400, "fecha debe tener formato AAAA-MM-DD")
		return
	}
	duracion, err := horasDeTurno(e.HoraInicio, e.HoraFin)
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	e.Estado = normalizarMayusculas(e.Estado)
	if e.Estado == "" {
		e.Estado = "PROGRAMADO"
	}
	if !estadoTurnoValido(e.Estado) {
		responderError(c, 400, "estado de turno inválido")
		return
	}
	if e.Estado == "TRABAJADO" {
		if e.HorasTrabajadas <= 0 {
			e.HorasTrabajadas = duracion
		}
		if e.HorasTrabajadas > duracion || e.HorasTrabajadas > 16 {
			responderError(c, 400, "horas_trabajadas no puede superar la duración del turno ni 16 horas")
			return
		}
	} else {
		e.HorasTrabajadas = 0
	}
	r, err := a.db.Exec(`INSERT INTO turnos(empleado_id,fecha,hora_inicio,hora_fin,estado,horas_trabajadas,notas) VALUES (?,?,?,?,?,?,?)`, e.EmpleadoID, e.Fecha, e.HoraInicio, e.HoraFin, e.Estado, e.HorasTrabajadas, strings.TrimSpace(e.Notas))
	if err != nil {
		responderError(c, 409, "Ya existe un turno para ese empleado a esa hora")
		return
	}
	id, _ := r.LastInsertId()
	if e.Estado == "FALTA" {
		_ = a.registrarHistorico(e.EmpleadoID, "FALTA_INJUSTIFICADA", "Falta registrada en turno", e.Fecha)
	}
	if e.Estado == "RETARDO" {
		_ = a.registrarHistorico(e.EmpleadoID, "RETARDO", "Retardo registrado en turno", e.Fecha)
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "TURNO", id, "Turno "+e.Fecha)
	c.JSON(201, gin.H{"id": id, "mensaje": "Turno creado correctamente"})
}
func (a *aplicacion) listarTurnos(c *gin.Context) {
	desde, hasta := c.Query("desde"), c.Query("hasta")
	if desde == "" || hasta == "" {
		responderError(c, 400, "desde y hasta son obligatorios (AAAA-MM-DD)")
		return
	}
	d, err := fechaValida(desde)
	if err != nil {
		responderError(c, 400, "desde no tiene formato válido")
		return
	}
	h, err := fechaValida(hasta)
	if err != nil || h.Before(d) {
		responderError(c, 400, "hasta debe ser igual o posterior a desde")
		return
	}
	q := `SELECT t.id,t.empleado_id,e.numero_empleado,e.nombres||' '||e.apellido_paterno,t.fecha,t.hora_inicio,t.hora_fin,t.estado,t.horas_trabajadas,COALESCE(t.notas,'') FROM turnos t JOIN empleados e ON e.id=t.empleado_id WHERE t.fecha BETWEEN ? AND ?`
	args := []any{desde, hasta}
	if raw := c.Query("empleado_id"); raw != "" {
		id, er := strconv.ParseInt(raw, 10, 64)
		if er != nil || id <= 0 {
			responderError(c, 400, "empleado_id inválido")
			return
		}
		q += " AND t.empleado_id=?"
		args = append(args, id)
	}
	q += " ORDER BY t.fecha,t.hora_inicio"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	respuesta := []gin.H{}
	for filas.Next() {
		var id, emp int64
		var numero, nombre, fecha, ini, fin, estado, notas string
		var horas float64
		if err := filas.Scan(&id, &emp, &numero, &nombre, &fecha, &ini, &fin, &estado, &horas, &notas); err != nil {
			responderBD(c, err)
			return
		}
		respuesta = append(respuesta, gin.H{"id": id, "empleado_id": emp, "numero_empleado": numero, "empleado": nombre, "fecha": fecha, "hora_inicio": ini, "hora_fin": fin, "estado": estado, "horas_trabajadas": horas, "notas": notas})
	}
	c.JSON(200, respuesta)
}
func (a *aplicacion) misTurnos(c *gin.Context) {
	i := obtenerIdentidad(c)
	if !i.EmpleadoID.Valid {
		responderError(c, 400, "Su usuario no está vinculado a un empleado")
		return
	}
	desde := c.DefaultQuery("desde", time.Now().Format("2006-01-02"))
	hasta := c.DefaultQuery("hasta", time.Now().AddDate(0, 0, 14).Format("2006-01-02"))
	c.Request.URL.RawQuery = "desde=" + desde + "&hasta=" + hasta + "&empleado_id=" + strconv.FormatInt(i.EmpleadoID.Int64, 10)
	a.listarTurnos(c)
}
func (a *aplicacion) actualizarTurno(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Estado          *string  `json:"estado"`
		HorasTrabajadas *float64 `json:"horas_trabajadas"`
		Notas           *string  `json:"notas"`
	}
	if !leerJSON(c, &e) {
		return
	}
	var empleadoID int64
	var fecha, ini, fin, estado, notas string
	var horas float64
	err := a.db.QueryRow(`SELECT empleado_id,fecha,hora_inicio,hora_fin,estado,horas_trabajadas,COALESCE(notas,'') FROM turnos WHERE id=?`, id).Scan(&empleadoID, &fecha, &ini, &fin, &estado, &horas, &notas)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Turno no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if e.Estado != nil {
		estado = normalizarMayusculas(*e.Estado)
	}
	if !estadoTurnoValido(estado) {
		responderError(c, 400, "estado de turno inválido")
		return
	}
	if e.HorasTrabajadas != nil {
		horas = *e.HorasTrabajadas
	}
	if e.Notas != nil {
		notas = strings.TrimSpace(*e.Notas)
	}
	duracion, _ := horasDeTurno(ini, fin)
	if estado == "TRABAJADO" {
		if horas <= 0 {
			horas = duracion
		}
		if horas > duracion || horas > 16 {
			responderError(c, 400, "horas_trabajadas inválidas")
			return
		}
	} else {
		horas = 0
	}
	if _, err = a.db.Exec(`UPDATE turnos SET estado=?,horas_trabajadas=?,notas=? WHERE id=?`, estado, horas, notas, id); err != nil {
		responderBD(c, err)
		return
	}
	if estado == "FALTA" {
		_ = a.registrarHistorico(empleadoID, "FALTA_INJUSTIFICADA", "Falta registrada en turno", fecha)
	}
	if estado == "RETARDO" {
		_ = a.registrarHistorico(empleadoID, "RETARDO", "Retardo registrado en turno", fecha)
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ACTUALIZAR", "TURNO", id, estado)
	c.JSON(200, gin.H{"mensaje": "Turno actualizado correctamente"})
}

func contieneFinDeSemana(inicio, fin time.Time) bool {
	for d := inicio; !d.After(fin); d = d.AddDate(0, 0, 1) {
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			return true
		}
	}
	return false
}
func (a *aplicacion) datosEmpleado(id int64) (sucursalID, puestoID int64, requiere int, activo int, err error) {
	err = a.db.QueryRow(`SELECT e.sucursal_id,e.puesto_id,p.requiere_suplente,e.activo FROM empleados e JOIN puestos p ON p.id=e.puesto_id WHERE e.id=?`, id).Scan(&sucursalID, &puestoID, &requiere, &activo)
	return
}
func (a *aplicacion) validarSuplente(solicitanteID, suplenteID int64, inicio, fin string) error {
	if solicitanteID == suplenteID {
		return errors.New("El suplente debe ser otro empleado")
	}
	var sucursal, puesto int64
	var requiere, activo int
	err := a.db.QueryRow(`SELECT e.sucursal_id,e.puesto_id,p.requiere_suplente,e.activo FROM empleados e JOIN puestos p ON p.id=e.puesto_id WHERE e.id=?`, solicitanteID).Scan(&sucursal, &puesto, &requiere, &activo)
	if err != nil {
		return errors.New("No se encontró al empleado solicitante")
	}
	var sucursalS, puestoS int64
	var activoS int
	err = a.db.QueryRow(`SELECT sucursal_id,puesto_id,activo FROM empleados WHERE id=?`, suplenteID).Scan(&sucursalS, &puestoS, &activoS)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("suplente_id no existe")
	}
	if err != nil {
		return err
	}
	if activoS == 0 {
		return errors.New("El suplente está inactivo")
	}
	if sucursal != sucursalS {
		return errors.New("El suplente debe pertenecer a la misma sucursal")
	}
	if puesto != puestoS {
		return errors.New("El suplente debe tener el mismo puesto para estar calificado")
	}
	var n int
	err = a.db.QueryRow(`SELECT COUNT(*) FROM solicitudes_permisos WHERE empleado_id=? AND estado IN ('PENDIENTE_SUPLENTE','PENDIENTE_APROBACION','APROBADA') AND fecha_inicio<=? AND fecha_fin>=?`, suplenteID, fin, inicio).Scan(&n)
	if err != nil {
		return err
	}
	if n > 0 {
		return errors.New("El suplente ya tiene una ausencia que se cruza con esas fechas")
	}
	return nil
}
func (a *aplicacion) crearSolicitud(c *gin.Context) {
	var e struct {
		EmpleadoID  int64  `json:"empleado_id"`
		Tipo        string `json:"tipo"`
		FechaInicio string `json:"fecha_inicio"`
		FechaFin    string `json:"fecha_fin"`
		Motivo      string `json:"motivo"`
		SuplenteID  *int64 `json:"suplente_id"`
	}
	if !leerJSON(c, &e) {
		return
	}
	i := obtenerIdentidad(c)
	if !esAdministrador(i) {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Su usuario no está vinculado a un empleado")
			return
		}
		e.EmpleadoID = i.EmpleadoID.Int64
	}
	if e.EmpleadoID <= 0 {
		responderError(c, 400, "empleado_id es obligatorio")
		return
	}
	inicio, err := fechaValida(e.FechaInicio)
	if err != nil {
		responderError(c, 400, "fecha_inicio debe tener formato AAAA-MM-DD")
		return
	}
	fin, err := fechaValida(e.FechaFin)
	if err != nil || fin.Before(inicio) {
		responderError(c, 400, "fecha_fin debe ser igual o posterior a fecha_inicio")
		return
	}
	if inicio.Before(time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)) {
		responderError(c, 400, "No se pueden solicitar ausencias en el pasado")
		return
	}
	e.Tipo = normalizarMayusculas(e.Tipo)
	if e.Tipo != "VACACIONES" && e.Tipo != "ENFERMEDAD" && e.Tipo != "DESCANSO" && e.Tipo != "PERMISO_EXTRAORDINARIO" {
		responderError(c, 400, "tipo de solicitud inválido")
		return
	}
	motivo, err := textoRequerido(e.Motivo, 500, "motivo")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	_, _, requiere, activo, err := a.datosEmpleado(e.EmpleadoID)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 400, "empleado_id no existe")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if activo == 0 {
		responderError(c, 400, "El empleado está inactivo")
		return
	}
	var cruces int
	err = a.db.QueryRow(`SELECT COUNT(*) FROM solicitudes_permisos WHERE empleado_id=? AND estado IN ('PENDIENTE_SUPLENTE','PENDIENTE_APROBACION','APROBADA') AND fecha_inicio<=? AND fecha_fin>=?`, e.EmpleadoID, e.FechaFin, e.FechaInicio).Scan(&cruces)
	if err != nil {
		responderBD(c, err)
		return
	}
	if cruces > 0 {
		responderError(c, 409, "Ya existe una solicitud activa que se cruza con esas fechas")
		return
	}
	necesita := requiere == 1 && contieneFinDeSemana(inicio, fin)
	if necesita && e.SuplenteID == nil {
		responderError(c, 400, "La ausencia de un puesto crítico en fin de semana exige suplente_id calificado")
		return
	}
	if !necesita && e.SuplenteID != nil {
		responderError(c, 400, "Solo se puede designar suplente cuando la cobertura es obligatoria")
		return
	}
	if necesita {
		if err := a.validarSuplente(e.EmpleadoID, *e.SuplenteID, e.FechaInicio, e.FechaFin); err != nil {
			responderError(c, 400, err.Error())
			return
		}
	}
	estado := "PENDIENTE_APROBACION"
	if necesita {
		estado = "PENDIENTE_SUPLENTE"
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	r, err := tx.Exec(`INSERT INTO solicitudes_permisos(empleado_id,tipo,fecha_inicio,fecha_fin,motivo,estado,requiere_cobertura) VALUES (?,?,?,?,?,?,?)`, e.EmpleadoID, e.Tipo, e.FechaInicio, e.FechaFin, motivo, estado, boolAInt(necesita))
	if err != nil {
		responderBD(c, err)
		return
	}
	id, _ := r.LastInsertId()
	if necesita {
		if _, err = tx.Exec(`INSERT INTO cobertura_turnos(solicitud_id,suplente_id,estado) VALUES (?,?,'PENDIENTE')`, id, *e.SuplenteID); err != nil {
			responderBD(c, err)
			return
		}
	}
	if err = tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(i.UsuarioID, "CREAR", "SOLICITUD_PERMISO", id, "Solicitud "+e.Tipo)
	c.JSON(201, gin.H{"id": id, "estado": estado, "requiere_cobertura": necesita, "mensaje": "Solicitud registrada correctamente"})
}
func (a *aplicacion) consultaSolicitudes(c *gin.Context, propias bool) {
	i := obtenerIdentidad(c)
	q := `SELECT sp.id,sp.empleado_id,e.numero_empleado,e.nombres||' '||e.apellido_paterno,sp.tipo,sp.fecha_inicio,sp.fecha_fin,sp.motivo,sp.estado,sp.requiere_cobertura,COALESCE(ct.suplente_id,0),COALESCE(se.nombres||' '||se.apellido_paterno,''),COALESCE(ct.estado,''),COALESCE(sp.observacion_dictamen,''),sp.creado_en FROM solicitudes_permisos sp JOIN empleados e ON e.id=sp.empleado_id LEFT JOIN cobertura_turnos ct ON ct.solicitud_id=sp.id LEFT JOIN empleados se ON se.id=ct.suplente_id`
	args := []any{}
	if propias {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Su usuario no está vinculado a un empleado")
			return
		}
		q += " WHERE sp.empleado_id=?"
		args = append(args, i.EmpleadoID.Int64)
	} else if v := c.Query("estado"); v != "" {
		q += " WHERE sp.estado=?"
		args = append(args, normalizarMayusculas(v))
	}
	q += " ORDER BY sp.fecha_inicio DESC,sp.id DESC"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	respuesta := []gin.H{}
	for filas.Next() {
		var id, emp, suplente int64
		var numero, nombre, tipo, inicio, fin, motivo, estado, supNombre, estadoCob, obs, creado string
		var requiere int
		if err := filas.Scan(&id, &emp, &numero, &nombre, &tipo, &inicio, &fin, &motivo, &estado, &requiere, &suplente, &supNombre, &estadoCob, &obs, &creado); err != nil {
			responderBD(c, err)
			return
		}
		var suplenteJSON any = nil
		if suplente > 0 {
			suplenteJSON = gin.H{"id": suplente, "nombre": supNombre, "estado": estadoCob}
		}
		respuesta = append(respuesta, gin.H{"id": id, "empleado_id": emp, "numero_empleado": numero, "empleado": nombre, "tipo": tipo, "fecha_inicio": inicio, "fecha_fin": fin, "motivo": motivo, "estado": estado, "requiere_cobertura": requiere == 1, "cobertura": suplenteJSON, "observacion_dictamen": obs, "creado_en": creado})
	}
	c.JSON(200, respuesta)
}
func (a *aplicacion) misSolicitudes(c *gin.Context)    { a.consultaSolicitudes(c, true) }
func (a *aplicacion) listarSolicitudes(c *gin.Context) { a.consultaSolicitudes(c, false) }
func (a *aplicacion) cancelarSolicitud(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	i := obtenerIdentidad(c)
	var empleado int64
	var estado string
	err := a.db.QueryRow(`SELECT empleado_id,estado FROM solicitudes_permisos WHERE id=?`, id).Scan(&empleado, &estado)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Solicitud no encontrada")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if !esAdministrador(i) && (!i.EmpleadoID.Valid || i.EmpleadoID.Int64 != empleado) {
		responderError(c, 403, "Solo puede cancelar sus propias solicitudes")
		return
	}
	if estado != "PENDIENTE_SUPLENTE" && estado != "PENDIENTE_APROBACION" {
		responderError(c, 409, "Solo se pueden cancelar solicitudes pendientes")
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(`UPDATE solicitudes_permisos SET estado='CANCELADA',resuelto_en=CURRENT_TIMESTAMP WHERE id=?`, id)
	if err == nil {
		_, err = tx.Exec(`UPDATE cobertura_turnos SET estado='CANCELADA' WHERE solicitud_id=? AND estado='PENDIENTE'`, id)
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if err = tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(i.UsuarioID, "CANCELAR", "SOLICITUD_PERMISO", id, "")
	c.JSON(200, gin.H{"mensaje": "Solicitud cancelada correctamente"})
}
func (a *aplicacion) confirmarCobertura(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Aceptar    bool   `json:"aceptar"`
		Comentario string `json:"comentario"`
	}
	if !leerJSON(c, &e) {
		return
	}
	i := obtenerIdentidad(c)
	if !i.EmpleadoID.Valid {
		responderError(c, 403, "Solo un empleado puede confirmar una cobertura")
		return
	}
	var suplente int64
	var estado string
	err := a.db.QueryRow(`SELECT ct.suplente_id,ct.estado FROM cobertura_turnos ct WHERE ct.solicitud_id=?`, id).Scan(&suplente, &estado)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "La solicitud no requiere cobertura")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if suplente != i.EmpleadoID.Int64 {
		responderError(c, 403, "Esta cobertura fue asignada a otro empleado")
		return
	}
	if estado != "PENDIENTE" {
		responderError(c, 409, "La cobertura ya fue atendida")
		return
	}
	estadoNuevo := "RECHAZADA"
	solicitudNuevo := "PENDIENTE_SUPLENTE"
	if e.Aceptar {
		estadoNuevo = "ACEPTADA"
		solicitudNuevo = "PENDIENTE_APROBACION"
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(`UPDATE cobertura_turnos SET estado=?,confirmado_en=CURRENT_TIMESTAMP WHERE solicitud_id=?`, estadoNuevo, id)
	if err == nil {
		_, err = tx.Exec(`UPDATE solicitudes_permisos SET estado=?,observacion_dictamen=? WHERE id=?`, solicitudNuevo, strings.TrimSpace(e.Comentario), id)
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if err = tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(i.UsuarioID, "CONFIRMAR_COBERTURA", "SOLICITUD_PERMISO", id, estadoNuevo)
	c.JSON(200, gin.H{"estado_cobertura": estadoNuevo, "estado_solicitud": solicitudNuevo})
}
func (a *aplicacion) dictaminarSolicitud(c *gin.Context, aprobada bool) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Observacion string `json:"observacion"`
	}
	if !leerJSON(c, &e) {
		return
	}
	observacion := strings.TrimSpace(e.Observacion)
	if !aprobada && observacion == "" {
		responderError(c, 400, "observacion es obligatoria al rechazar")
		return
	}
	var empleado int64
	var inicio, estado string
	var requiere int
	err := a.db.QueryRow(`SELECT empleado_id,fecha_inicio,estado,requiere_cobertura FROM solicitudes_permisos WHERE id=?`, id).Scan(&empleado, &inicio, &estado, &requiere)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Solicitud no encontrada")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if estado != "PENDIENTE_APROBACION" {
		responderError(c, 409, "La solicitud no está lista para dictamen")
		return
	}
	if requiere == 1 {
		var cobertura string
		err = a.db.QueryRow(`SELECT estado FROM cobertura_turnos WHERE solicitud_id=?`, id).Scan(&cobertura)
		if err != nil || cobertura != "ACEPTADA" {
			responderError(c, 409, "Se requiere una cobertura aceptada antes de aprobar")
			return
		}
	}
	nuevo := "RECHAZADA"
	if aprobada {
		nuevo = "APROBADA"
	}
	if _, err = a.db.Exec(`UPDATE solicitudes_permisos SET estado=?,observacion_dictamen=?,resuelto_en=CURRENT_TIMESTAMP WHERE id=?`, nuevo, observacion, id); err != nil {
		responderBD(c, err)
		return
	}
	if aprobada {
		_ = a.registrarHistorico(empleado, "PERMISO", "Permiso aprobado (solicitud "+strconv.FormatInt(id, 10)+")", inicio)
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, nuevo, "SOLICITUD_PERMISO", id, observacion)
	c.JSON(200, gin.H{"mensaje": "Solicitud " + strings.ToLower(nuevo) + " correctamente", "estado": nuevo})
}
func (a *aplicacion) aprobarSolicitud(c *gin.Context)  { a.dictaminarSolicitud(c, true) }
func (a *aplicacion) rechazarSolicitud(c *gin.Context) { a.dictaminarSolicitud(c, false) }

func lunesDeSemana(fecha string) (string, error) {
	d, err := fechaValida(fecha)
	if err != nil {
		return "", errors.New("semana_inicio debe tener formato AAAA-MM-DD")
	}
	if d.Weekday() != time.Monday {
		return "", errors.New("semana_inicio debe ser lunes")
	}
	return fecha, nil
}
func (a *aplicacion) sueldoEmpleado(id int64) (int64, error) {
	var sueldo int64
	var activo int
	err := a.db.QueryRow(`SELECT sueldo_semanal_centavos,activo FROM empleados WHERE id=?`, id).Scan(&sueldo, &activo)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, errors.New("empleado_id no existe")
	}
	if err != nil {
		return 0, err
	}
	if activo == 0 {
		return 0, errors.New("El empleado está inactivo")
	}
	return sueldo, nil
}
func (a *aplicacion) solicitarPrestamo(c *gin.Context) {
	var e struct {
		EmpleadoID    int64  `json:"empleado_id"`
		MontoCentavos int64  `json:"monto_centavos"`
		NumeroSemanas int    `json:"numero_semanas"`
		Motivo        string `json:"motivo"`
	}
	if !leerJSON(c, &e) {
		return
	}
	i := obtenerIdentidad(c)
	if !esAdministrador(i) {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Su usuario no está vinculado a un empleado")
			return
		}
		e.EmpleadoID = i.EmpleadoID.Int64
	}
	if e.EmpleadoID <= 0 || e.MontoCentavos <= 0 || e.NumeroSemanas < 1 || e.NumeroSemanas > 52 {
		responderError(c, 400, "empleado_id, monto_centavos y numero_semanas (1 a 52) son obligatorios")
		return
	}
	motivo, err := textoRequerido(e.Motivo, 500, "motivo")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	sueldo, err := a.sueldoEmpleado(e.EmpleadoID)
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if e.MontoCentavos > sueldo*2 {
		responderError(c, 400, "El monto solicitado no puede exceder dos sueldos semanales")
		return
	}
	descuento := int64(math.Ceil(float64(e.MontoCentavos) / float64(e.NumeroSemanas)))
	if descuento*100 > sueldo*35 {
		responderError(c, 400, "El descuento semanal excede 35% del sueldo; aumente numero_semanas")
		return
	}
	r, err := a.db.Exec(`INSERT INTO prestamos_empleado(empleado_id,monto_original_centavos,saldo_centavos,descuento_semanal_centavos,numero_semanas,motivo,estado) VALUES (?,?,?,?,?,?,'PENDIENTE')`, e.EmpleadoID, e.MontoCentavos, e.MontoCentavos, descuento, e.NumeroSemanas, motivo)
	if err != nil {
		responderBD(c, err)
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(i.UsuarioID, "CREAR", "PRESTAMO", id, "Solicitud de préstamo")
	c.JSON(201, gin.H{"id": id, "descuento_semanal_centavos": descuento, "mensaje": "Solicitud de préstamo registrada"})
}
func (a *aplicacion) consultaPrestamos(c *gin.Context, propios bool) {
	i := obtenerIdentidad(c)
	q := `SELECT pe.id,pe.empleado_id,e.numero_empleado,e.nombres||' '||e.apellido_paterno,pe.monto_original_centavos,pe.saldo_centavos,pe.descuento_semanal_centavos,pe.numero_semanas,pe.motivo,pe.estado,COALESCE(pe.observacion_dictamen,''),pe.creado_en,COALESCE(pe.aprobado_en,'') FROM prestamos_empleado pe JOIN empleados e ON e.id=pe.empleado_id`
	args := []any{}
	if propios {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Su usuario no está vinculado a un empleado")
			return
		}
		q += " WHERE pe.empleado_id=?"
		args = append(args, i.EmpleadoID.Int64)
	} else if estado := c.Query("estado"); estado != "" {
		q += " WHERE pe.estado=?"
		args = append(args, normalizarMayusculas(estado))
	}
	q += " ORDER BY pe.id DESC"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []gin.H{}
	for filas.Next() {
		var id, emp, monto, saldo, descuento int64
		var semanas int
		var numero, nombre, motivo, estado, obs, creado, aprobado string
		if err := filas.Scan(&id, &emp, &numero, &nombre, &monto, &saldo, &descuento, &semanas, &motivo, &estado, &obs, &creado, &aprobado); err != nil {
			responderBD(c, err)
			return
		}
		resultado = append(resultado, gin.H{"id": id, "empleado_id": emp, "numero_empleado": numero, "empleado": nombre, "monto_original_centavos": monto, "saldo_centavos": saldo, "descuento_semanal_centavos": descuento, "numero_semanas": semanas, "motivo": motivo, "estado": estado, "observacion_dictamen": obs, "creado_en": creado, "aprobado_en": aprobado})
	}
	c.JSON(200, resultado)
}
func (a *aplicacion) misPrestamos(c *gin.Context)    { a.consultaPrestamos(c, true) }
func (a *aplicacion) listarPrestamos(c *gin.Context) { a.consultaPrestamos(c, false) }
func (a *aplicacion) dictaminarPrestamo(c *gin.Context, aprobar bool) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Observacion string `json:"observacion"`
	}
	if !leerJSON(c, &e) {
		return
	}
	observacion := strings.TrimSpace(e.Observacion)
	if !aprobar && observacion == "" {
		responderError(c, 400, "observacion es obligatoria al rechazar")
		return
	}
	var empleado, monto, descuento int64
	var estado string
	err := a.db.QueryRow(`SELECT empleado_id,monto_original_centavos,descuento_semanal_centavos,estado FROM prestamos_empleado WHERE id=?`, id).Scan(&empleado, &monto, &descuento, &estado)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Préstamo no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if estado != "PENDIENTE" {
		responderError(c, 409, "El préstamo ya fue dictaminado")
		return
	}
	if aprobar {
		sueldo, err := a.sueldoEmpleado(empleado)
		if err != nil {
			responderError(c, 400, err.Error())
			return
		}
		var descuentosActuales int64
		if err := a.db.QueryRow(`SELECT COALESCE(SUM(descuento_semanal_centavos),0) FROM prestamos_empleado WHERE empleado_id=? AND estado='APROBADO'`, empleado).Scan(&descuentosActuales); err != nil {
			responderBD(c, err)
			return
		}
		if (descuentosActuales+descuento)*100 > sueldo*40 {
			responderError(c, 409, "La retención total activa excedería 40% del sueldo semanal")
			return
		}
	}
	nuevo := "RECHAZADO"
	if aprobar {
		nuevo = "APROBADO"
	}
	if _, err = a.db.Exec(`UPDATE prestamos_empleado SET estado=?,observacion_dictamen=?,aprobado_en=CURRENT_TIMESTAMP WHERE id=?`, nuevo, observacion, id); err != nil {
		responderBD(c, err)
		return
	}
	if aprobar {
		_ = a.registrarHistorico(empleado, "PRESTAMO", fmt.Sprintf("Préstamo aprobado por %d centavos", monto), time.Now().Format("2006-01-02"))
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, nuevo, "PRESTAMO", id, observacion)
	c.JSON(200, gin.H{"estado": nuevo, "mensaje": "Préstamo " + strings.ToLower(nuevo) + " correctamente"})
}
func (a *aplicacion) aprobarPrestamo(c *gin.Context)  { a.dictaminarPrestamo(c, true) }
func (a *aplicacion) rechazarPrestamo(c *gin.Context) { a.dictaminarPrestamo(c, false) }
func (a *aplicacion) registrarRetencion(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		SemanaInicio  string `json:"semana_inicio"`
		MontoCentavos *int64 `json:"monto_centavos"`
	}
	if !leerJSON(c, &e) {
		return
	}
	semana, err := lunesDeSemana(e.SemanaInicio)
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	var saldo, descuento int64
	var estado string
	err = tx.QueryRow(`SELECT saldo_centavos,descuento_semanal_centavos,estado FROM prestamos_empleado WHERE id=?`, id).Scan(&saldo, &descuento, &estado)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Préstamo no encontrado")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if estado != "APROBADO" {
		responderError(c, 409, "Solo se pueden retener préstamos aprobados")
		return
	}
	monto := descuento
	if e.MontoCentavos != nil {
		monto = *e.MontoCentavos
	}
	if monto <= 0 || monto > descuento || monto > saldo {
		responderError(c, 400, "monto_centavos debe ser positivo y no exceder el descuento pactado ni el saldo")
		return
	}
	_, err = tx.Exec(`INSERT INTO retenciones_prestamo(prestamo_id,semana_inicio,monto_centavos) VALUES (?,?,?)`, id, semana, monto)
	if err != nil {
		responderError(c, 409, "Ya existe una retención para esa semana")
		return
	}
	nuevoSaldo := saldo - monto
	nuevoEstado := "APROBADO"
	if nuevoSaldo == 0 {
		nuevoEstado = "LIQUIDADO"
	}
	_, err = tx.Exec(`UPDATE prestamos_empleado SET saldo_centavos=?,estado=? WHERE id=?`, nuevoSaldo, nuevoEstado, id)
	if err != nil {
		responderBD(c, err)
		return
	}
	if err = tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "RETENCION_NOMINA", "PRESTAMO", id, "Semana "+semana)
	c.JSON(201, gin.H{"monto_centavos": monto, "saldo_centavos": nuevoSaldo, "estado": nuevoEstado})
}

func (a *aplicacion) crearBolsaPropinas(c *gin.Context) {
	var e struct {
		SucursalID    int64  `json:"sucursal_id"`
		Fecha         string `json:"fecha"`
		MontoCentavos int64  `json:"monto_centavos"`
	}
	if !leerJSON(c, &e) {
		return
	}
	if e.SucursalID <= 0 || e.MontoCentavos <= 0 {
		responderError(c, 400, "sucursal_id y monto_centavos deben ser mayores a cero")
		return
	}
	fecha, err := fechaValida(e.Fecha)
	if err != nil {
		responderError(c, 400, "fecha debe tener formato AAAA-MM-DD")
		return
	}
	if fecha.After(time.Now().AddDate(0, 0, 1)) {
		responderError(c, 400, "No se puede crear una bolsa de propinas futura")
		return
	}
	var activo int
	err = a.db.QueryRow(`SELECT activo FROM sucursales WHERE id=?`, e.SucursalID).Scan(&activo)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 400, "sucursal_id no existe")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if activo == 0 {
		responderError(c, 400, "La sucursal está inactiva")
		return
	}
	r, err := a.db.Exec(`INSERT INTO propinas_bolsas(sucursal_id,fecha,monto_centavos) VALUES (?,?,?)`, e.SucursalID, e.Fecha, e.MontoCentavos)
	if err != nil {
		responderError(c, 409, "Ya existe una bolsa para esa sucursal y fecha")
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "BOLSA_PROPINAS", id, e.Fecha)
	c.JSON(201, gin.H{"id": id, "mensaje": "Bolsa de propinas creada correctamente"})
}
func (a *aplicacion) listarBolsasPropinas(c *gin.Context) {
	q := `SELECT b.id,b.sucursal_id,s.nombre,b.fecha,b.monto_centavos,b.estado,b.creado_en,COUNT(pa.id) FROM propinas_bolsas b JOIN sucursales s ON s.id=b.sucursal_id LEFT JOIN propinas_asignacion pa ON pa.bolsa_id=b.id`
	args := []any{}
	if f := c.Query("fecha"); f != "" {
		if _, err := fechaValida(f); err != nil {
			responderError(c, 400, "fecha no tiene formato válido")
			return
		}
		q += " WHERE b.fecha=?"
		args = append(args, f)
	}
	q += " GROUP BY b.id ORDER BY b.fecha DESC,b.id DESC"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	for filas.Next() {
		var id, suc, monto int64
		var nombre, fecha, estado, creado string
		var asignaciones int
		if err := filas.Scan(&id, &suc, &nombre, &fecha, &monto, &estado, &creado, &asignaciones); err != nil {
			responderBD(c, err)
			return
		}
		r = append(r, gin.H{"id": id, "sucursal_id": suc, "sucursal": nombre, "fecha": fecha, "monto_centavos": monto, "estado": estado, "asignaciones": asignaciones, "creado_en": creado})
	}
	c.JSON(200, r)
}
func (a *aplicacion) calcularPropinas(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	tx, err := a.db.Begin()
	if err != nil {
		responderBD(c, err)
		return
	}
	defer tx.Rollback()
	var sucursal, monto int64
	var fecha, estado string
	err = tx.QueryRow(`SELECT sucursal_id,fecha,monto_centavos,estado FROM propinas_bolsas WHERE id=?`, id).Scan(&sucursal, &fecha, &monto, &estado)
	if errors.Is(err, sql.ErrNoRows) {
		responderError(c, 404, "Bolsa de propinas no encontrada")
		return
	}
	if err != nil {
		responderBD(c, err)
		return
	}
	if estado == "CERRADA" {
		responderError(c, 409, "No se puede recalcular una bolsa cerrada")
		return
	}
	filas, err := tx.Query(`SELECT t.empleado_id,t.horas_trabajadas*p.factor_propina FROM turnos t JOIN empleados e ON e.id=t.empleado_id JOIN puestos p ON p.id=e.puesto_id WHERE e.sucursal_id=? AND t.fecha=? AND t.estado='TRABAJADO' AND t.horas_trabajadas>0 ORDER BY t.empleado_id`, sucursal, fecha)
	if err != nil {
		responderBD(c, err)
		return
	}
	type participacion struct {
		id         int64
		ponderadas float64
	}
	participantes := []participacion{}
	total := float64(0)
	for filas.Next() {
		var x participacion
		if err := filas.Scan(&x.id, &x.ponderadas); err != nil {
			filas.Close()
			responderBD(c, err)
			return
		}
		participantes = append(participantes, x)
		total += x.ponderadas
	}
	filas.Close()
	if len(participantes) == 0 || total <= 0 {
		responderError(c, 409, "No hay turnos trabajados con horas registradas para distribuir la bolsa")
		return
	}
	if _, err = tx.Exec(`DELETE FROM propinas_asignacion WHERE bolsa_id=?`, id); err != nil {
		responderBD(c, err)
		return
	}
	asignado := int64(0)
	for indice, x := range participantes {
		asignacion := int64(math.Floor(float64(monto) * x.ponderadas / total))
		if indice == len(participantes)-1 {
			asignacion = monto - asignado
		}
		asignado += asignacion
		if _, err = tx.Exec(`INSERT INTO propinas_asignacion(bolsa_id,empleado_id,horas_ponderadas,monto_centavos) VALUES (?,?,?,?)`, id, x.id, x.ponderadas, asignacion); err != nil {
			responderBD(c, err)
			return
		}
	}
	if _, err = tx.Exec(`UPDATE propinas_bolsas SET estado='CALCULADA' WHERE id=?`, id); err != nil {
		responderBD(c, err)
		return
	}
	if err = tx.Commit(); err != nil {
		responderBD(c, err)
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CALCULAR", "BOLSA_PROPINAS", id, fmt.Sprintf("%d participantes", len(participantes)))
	c.JSON(200, gin.H{"mensaje": "Propinas asignadas correctamente", "participantes": len(participantes), "monto_distribuido_centavos": monto})
}
func (a *aplicacion) misPropinas(c *gin.Context) {
	i := obtenerIdentidad(c)
	if !i.EmpleadoID.Valid {
		responderError(c, 400, "Su usuario no está vinculado a un empleado")
		return
	}
	filas, err := a.db.Query(`SELECT pa.id,b.id,b.fecha,s.nombre,pa.horas_ponderadas,pa.monto_centavos FROM propinas_asignacion pa JOIN propinas_bolsas b ON b.id=pa.bolsa_id JOIN sucursales s ON s.id=b.sucursal_id WHERE pa.empleado_id=? ORDER BY b.fecha DESC`, i.EmpleadoID.Int64)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	for filas.Next() {
		var id, bolsa, monto int64
		var fecha, sucursal string
		var horas float64
		if err := filas.Scan(&id, &bolsa, &fecha, &sucursal, &horas, &monto); err != nil {
			responderBD(c, err)
			return
		}
		r = append(r, gin.H{"id": id, "bolsa_id": bolsa, "fecha": fecha, "sucursal": sucursal, "horas_ponderadas": horas, "monto_centavos": monto})
	}
	c.JSON(200, r)
}

func tipoBuzonValido(v string) bool {
	return v == "SUGERENCIA" || v == "QUEJA" || v == "INCIDENTE_MANTENIMIENTO" || v == "SEGURIDAD" || v == "CLIMA_LABORAL"
}
func prioridadValida(v string) bool {
	return v == "BAJA" || v == "MEDIA" || v == "ALTA" || v == "CRITICA"
}
func (a *aplicacion) enviarBuzon(c *gin.Context) {
	var e struct {
		Anonimo     bool   `json:"anonimo"`
		Tipo        string `json:"tipo"`
		Asunto      string `json:"asunto"`
		Descripcion string `json:"descripcion"`
		Prioridad   string `json:"prioridad"`
	}
	if !leerJSON(c, &e) {
		return
	}
	e.Tipo = normalizarMayusculas(e.Tipo)
	e.Prioridad = normalizarMayusculas(e.Prioridad)
	if e.Prioridad == "" {
		e.Prioridad = "MEDIA"
	}
	if !tipoBuzonValido(e.Tipo) {
		responderError(c, 400, "tipo de buzón inválido")
		return
	}
	if !prioridadValida(e.Prioridad) {
		responderError(c, 400, "prioridad inválida")
		return
	}
	asunto, err := textoRequerido(e.Asunto, 150, "asunto")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	descripcion, err := textoRequerido(e.Descripcion, 2000, "descripcion")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	i := obtenerIdentidad(c)
	var empleado any = nil
	if !e.Anonimo {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Para un reporte directo su usuario debe estar vinculado a un empleado")
			return
		}
		empleado = i.EmpleadoID.Int64
	}
	r, err := a.db.Exec(`INSERT INTO buzon_sugerencias(empleado_id,anonimo,tipo,asunto,descripcion,prioridad) VALUES (?,?,?,?,?,?)`, empleado, boolAInt(e.Anonimo), e.Tipo, asunto, descripcion, e.Prioridad)
	if err != nil {
		responderBD(c, err)
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(i.UsuarioID, "CREAR", "BUZON", id, e.Tipo)
	c.JSON(201, gin.H{"id": id, "anonimo": e.Anonimo, "mensaje": "Reporte enviado al buzón"})
}
func (a *aplicacion) consultaBuzon(c *gin.Context, propios bool) {
	i := obtenerIdentidad(c)
	q := `SELECT b.id,b.empleado_id,b.anonimo,b.tipo,b.asunto,b.descripcion,b.prioridad,b.estado,COALESCE(b.respuesta,''),b.creado_en,COALESCE(b.atendido_en,''),COALESCE(e.numero_empleado,''),COALESCE(e.nombres||' '||e.apellido_paterno,'') FROM buzon_sugerencias b LEFT JOIN empleados e ON e.id=b.empleado_id`
	args := []any{}
	if propios {
		if !i.EmpleadoID.Valid {
			responderError(c, 400, "Su usuario no está vinculado a un empleado")
			return
		}
		q += " WHERE b.empleado_id=? AND b.anonimo=0"
		args = append(args, i.EmpleadoID.Int64)
	} else if estado := c.Query("estado"); estado != "" {
		q += " WHERE b.estado=?"
		args = append(args, normalizarMayusculas(estado))
	}
	q += " ORDER BY CASE b.prioridad WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4 END,b.creado_en DESC"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	resultado := []gin.H{}
	for filas.Next() {
		var id int64
		var empleado sql.NullInt64
		var anonimo int
		var tipo, asunto, desc, prioridad, estado, respuesta, creado, atendido, numero, nombre string
		if err := filas.Scan(&id, &empleado, &anonimo, &tipo, &asunto, &desc, &prioridad, &estado, &respuesta, &creado, &atendido, &numero, &nombre); err != nil {
			responderBD(c, err)
			return
		}
		autor := any(nil)
		if anonimo == 0 && empleado.Valid {
			autor = gin.H{"id": empleado.Int64, "numero_empleado": numero, "nombre": nombre}
		}
		resultado = append(resultado, gin.H{"id": id, "anonimo": anonimo == 1, "autor": autor, "tipo": tipo, "asunto": asunto, "descripcion": desc, "prioridad": prioridad, "estado": estado, "respuesta": respuesta, "creado_en": creado, "atendido_en": atendido})
	}
	c.JSON(200, resultado)
}
func (a *aplicacion) misBuzon(c *gin.Context)    { a.consultaBuzon(c, true) }
func (a *aplicacion) listarBuzon(c *gin.Context) { a.consultaBuzon(c, false) }
func (a *aplicacion) atenderBuzon(c *gin.Context) {
	id, ok := enteroParametro(c, "id")
	if !ok {
		return
	}
	var e struct {
		Estado    string `json:"estado"`
		Respuesta string `json:"respuesta"`
	}
	if !leerJSON(c, &e) {
		return
	}
	e.Estado = normalizarMayusculas(e.Estado)
	if e.Estado != "EN_REVISION" && e.Estado != "ATENDIDO" && e.Estado != "CERRADO" {
		responderError(c, 400, "estado inválido; use EN_REVISION, ATENDIDO o CERRADO")
		return
	}
	respuesta := strings.TrimSpace(e.Respuesta)
	if (e.Estado == "ATENDIDO" || e.Estado == "CERRADO") && respuesta == "" {
		responderError(c, 400, "respuesta es obligatoria al atender o cerrar")
		return
	}
	r, err := a.db.Exec(`UPDATE buzon_sugerencias SET estado=?,respuesta=?,atendido_en=CASE WHEN ? IN ('ATENDIDO','CERRADO') THEN CURRENT_TIMESTAMP ELSE atendido_en END WHERE id=?`, e.Estado, nuloTexto(respuesta), e.Estado, id)
	if err != nil {
		responderBD(c, err)
		return
	}
	afectadas, _ := r.RowsAffected()
	if afectadas == 0 {
		responderError(c, 404, "Reporte de buzón no encontrado")
		return
	}
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "ATENDER", "BUZON", id, e.Estado)
	c.JSON(200, gin.H{"mensaje": "Reporte actualizado correctamente"})
}

func tipoHistoricoValido(v string) bool {
	return v == "ASISTENCIA_DIA_PICO" || v == "RETARDO" || v == "FALTA_JUSTIFICADA" || v == "FALTA_INJUSTIFICADA" || v == "CAMBIO_SALARIAL" || v == "CAMBIO_PUESTO" || v == "PERMISO" || v == "PRESTAMO" || v == "OTRO"
}
func (a *aplicacion) crearHistorico(c *gin.Context) {
	var e struct {
		EmpleadoID  int64  `json:"empleado_id"`
		Tipo        string `json:"tipo"`
		Descripcion string `json:"descripcion"`
		FechaEvento string `json:"fecha_evento"`
	}
	if !leerJSON(c, &e) {
		return
	}
	if e.EmpleadoID <= 0 {
		responderError(c, 400, "empleado_id es obligatorio")
		return
	}
	if _, err := a.sueldoEmpleado(e.EmpleadoID); err != nil {
		responderError(c, 400, err.Error())
		return
	}
	e.Tipo = normalizarMayusculas(e.Tipo)
	if !tipoHistoricoValido(e.Tipo) {
		responderError(c, 400, "tipo de incidencia inválido")
		return
	}
	desc, err := textoRequerido(e.Descripcion, 1000, "descripcion")
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	if _, err := fechaValida(e.FechaEvento); err != nil {
		responderError(c, 400, "fecha_evento debe tener formato AAAA-MM-DD")
		return
	}
	r, err := a.db.Exec(`INSERT INTO historico_incidencias(empleado_id,tipo,descripcion,fecha_evento) VALUES (?,?,?,?)`, e.EmpleadoID, e.Tipo, desc, e.FechaEvento)
	if err != nil {
		responderBD(c, err)
		return
	}
	id, _ := r.LastInsertId()
	a.registrarAuditoria(obtenerIdentidad(c).UsuarioID, "CREAR", "HISTORICO_INCIDENCIA", id, e.Tipo)
	c.JSON(201, gin.H{"id": id, "mensaje": "Incidencia registrada; el histórico es inmutable"})
}
func (a *aplicacion) listarHistorico(c *gin.Context) {
	q := `SELECT h.id,h.empleado_id,COALESCE(e.numero_empleado,''),COALESCE(e.nombres||' '||e.apellido_paterno,''),h.tipo,h.descripcion,h.fecha_evento,h.creado_en FROM historico_incidencias h LEFT JOIN empleados e ON e.id=h.empleado_id`
	args := []any{}
	if emp := c.Query("empleado_id"); emp != "" {
		id, err := strconv.ParseInt(emp, 10, 64)
		if err != nil || id <= 0 {
			responderError(c, 400, "empleado_id inválido")
			return
		}
		q += " WHERE h.empleado_id=?"
		args = append(args, id)
	}
	q += " ORDER BY h.fecha_evento DESC,h.id DESC"
	filas, err := a.db.Query(q, args...)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	for filas.Next() {
		var id int64
		var empleado sql.NullInt64
		var numero, nombre, tipo, desc, fecha, creado string
		if err := filas.Scan(&id, &empleado, &numero, &nombre, &tipo, &desc, &fecha, &creado); err != nil {
			responderBD(c, err)
			return
		}
		r = append(r, gin.H{"id": id, "empleado_id": nuloAJSON(empleado), "numero_empleado": numero, "empleado": nombre, "tipo": tipo, "descripcion": desc, "fecha_evento": fecha, "creado_en": creado})
	}
	c.JSON(200, r)
}

func (a *aplicacion) reporteAusentismo(c *gin.Context) {
	desde, hasta := c.Query("desde"), c.Query("hasta")
	if desde == "" || hasta == "" {
		responderError(c, 400, "desde y hasta son obligatorios")
		return
	}
	d, err := fechaValida(desde)
	if err != nil {
		responderError(c, 400, "desde no tiene formato válido")
		return
	}
	h, err := fechaValida(hasta)
	if err != nil || h.Before(d) {
		responderError(c, 400, "hasta debe ser igual o posterior a desde")
		return
	}
	filas, err := a.db.Query(`SELECT e.id,e.numero_empleado,e.nombres||' '||e.apellido_paterno,s.nombre,p.nombre,COUNT(t.id),SUM(CASE WHEN t.estado='FALTA' THEN 1 ELSE 0 END),SUM(CASE WHEN t.estado='RETARDO' THEN 1 ELSE 0 END),SUM(CASE WHEN t.estado='FALTA' AND CAST(strftime('%w',t.fecha) AS INTEGER) IN (0,6) THEN 1 ELSE 0 END) FROM empleados e JOIN sucursales s ON s.id=e.sucursal_id JOIN puestos p ON p.id=e.puesto_id LEFT JOIN turnos t ON t.empleado_id=e.id AND t.fecha BETWEEN ? AND ? GROUP BY e.id ORDER BY 7 DESC,8 DESC,e.nombres`, desde, hasta)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	for filas.Next() {
		var id, total, faltas, retardos, faltasPico int64
		var numero, nombre, sucursal, puesto string
		if err := filas.Scan(&id, &numero, &nombre, &sucursal, &puesto, &total, &faltas, &retardos, &faltasPico); err != nil {
			responderBD(c, err)
			return
		}
		r = append(r, gin.H{"empleado_id": id, "numero_empleado": numero, "empleado": nombre, "sucursal": sucursal, "puesto": puesto, "turnos_programados": total, "faltas": faltas, "retardos": retardos, "faltas_fin_semana": faltasPico})
	}
	c.JSON(200, gin.H{"desde": desde, "hasta": hasta, "resultados": r})
}
func (a *aplicacion) reporteRotacion(c *gin.Context) {
	filas, err := a.db.Query(`SELECT p.id,p.nombre,COUNT(DISTINCT e.id),COUNT(DISTINCT CASE WHEN e.activo=1 THEN e.id END),COUNT(DISTINCT CASE WHEN e.activo=0 THEN e.id END),SUM(CASE WHEN h.tipo='CAMBIO_PUESTO' THEN 1 ELSE 0 END) FROM puestos p LEFT JOIN empleados e ON e.puesto_id=p.id LEFT JOIN historico_incidencias h ON h.empleado_id=e.id GROUP BY p.id ORDER BY p.nombre`)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	for filas.Next() {
		var id, total, activos, inactivos, cambios int64
		var nombre string
		if err := filas.Scan(&id, &nombre, &total, &activos, &inactivos, &cambios); err != nil {
			responderBD(c, err)
			return
		}
		r = append(r, gin.H{"puesto_id": id, "puesto": nombre, "empleados_historicos": total, "activos": activos, "bajas": inactivos, "cambios_de_puesto_registrados": cambios})
	}
	c.JSON(200, r)
}
func (a *aplicacion) reporteRetenciones(c *gin.Context) {
	semana, err := lunesDeSemana(c.Query("semana_inicio"))
	if err != nil {
		responderError(c, 400, err.Error())
		return
	}
	filas, err := a.db.Query(`SELECT rp.id,rp.prestamo_id,e.id,e.numero_empleado,e.nombres||' '||e.apellido_paterno,rp.semana_inicio,rp.monto_centavos,pe.saldo_centavos FROM retenciones_prestamo rp JOIN prestamos_empleado pe ON pe.id=rp.prestamo_id JOIN empleados e ON e.id=pe.empleado_id WHERE rp.semana_inicio=? ORDER BY e.nombres`, semana)
	if err != nil {
		responderBD(c, err)
		return
	}
	defer filas.Close()
	r := []gin.H{}
	var total int64
	for filas.Next() {
		var id, prestamo, empleado, monto, saldo int64
		var numero, nombre, fecha string
		if err := filas.Scan(&id, &prestamo, &empleado, &numero, &nombre, &fecha, &monto, &saldo); err != nil {
			responderBD(c, err)
			return
		}
		total += monto
		r = append(r, gin.H{"id": id, "prestamo_id": prestamo, "empleado_id": empleado, "numero_empleado": numero, "empleado": nombre, "semana_inicio": fecha, "monto_centavos": monto, "saldo_posterior_centavos": saldo})
	}
	c.JSON(200, gin.H{"semana_inicio": semana, "total_retenciones_centavos": total, "retenciones": r})
}
