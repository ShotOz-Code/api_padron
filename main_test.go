package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func nuevaAPIPrueba(t *testing.T) *aplicacion {
	t.Helper()
	ruta := filepath.Join(t.TempDir(), "padron-prueba.db")
	db, err := sql.Open("sqlite", "file:"+filepath.ToSlash(ruta)+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := migrar(db); err != nil {
		t.Fatal(err)
	}
	if err := datosIniciales(db); err != nil {
		t.Fatal(err)
	}
	return &aplicacion{db: db, secreto: []byte("secreto-de-prueba-de-32-bytes-000")}
}

func llamada(t *testing.T, r http.Handler, metodo, ruta, token, cuerpo string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(metodo, ruta, bytes.NewBufferString(cuerpo))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	return res
}

func tokenDe(t *testing.T, r http.Handler, usuario, contrasena string) string {
	t.Helper()
	res := llamada(t, r, http.MethodPost, "/api/v1/autenticacion/iniciar-sesion", "", `{"usuario":"`+usuario+`","contrasena":"`+contrasena+`"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("inicio de sesión %s: %d %s", usuario, res.Code, res.Body.String())
	}
	var respuesta struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &respuesta); err != nil {
		t.Fatal(err)
	}
	return respuesta.Token
}

func TestFlujoPermisoCriticoConSuplente(t *testing.T) {
	a := nuevaAPIPrueba(t)
	r := a.enrutador()
	if res := llamada(t, r, http.MethodGet, "/salud", "", ""); res.Code != http.StatusOK {
		t.Fatalf("salud: %d", res.Code)
	}
	admin := tokenDe(t, r, "Admin", "xp74Hg53")
	if res := llamada(t, r, http.MethodPost, "/api/v1/sucursales", admin, `{"nombre":"Sucursal Prueba","direccion":"Av. Principal 100","telefono":"4420000000"}`); res.Code != http.StatusCreated {
		t.Fatalf("crear sucursal: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Maestro Carnitero","descripcion":"Cazo","es_critico":true,"requiere_suplente":true,"factor_propina":1.3}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 1: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Parrillero","descripcion":"Asador","es_critico":true,"requiere_suplente":true,"factor_propina":1.25,"jefe_puesto_id":1}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 2: %d %s", res.Code, res.Body.String())
	}
	primerEmpleado := `{"numero_empleado":"EMP-001","nombres":"Ana","apellido_paterno":"Cocina","fecha_ingreso":"2026-10-01","sueldo_semanal_centavos":100000,"sucursal_id":1,"puesto_id":2,"usuario":"ana","contrasena":"Secreta123!"}`
	segundoEmpleado := `{"numero_empleado":"EMP-002","nombres":"Beto","apellido_paterno":"Cocina","fecha_ingreso":"2026-10-01","sueldo_semanal_centavos":100000,"sucursal_id":1,"puesto_id":2,"usuario":"beto","contrasena":"Secreta123!"}`
	for _, cuerpo := range []string{primerEmpleado, segundoEmpleado} {
		if res := llamada(t, r, http.MethodPost, "/api/v1/empleados", admin, cuerpo); res.Code != http.StatusCreated {
			t.Fatalf("crear empleado: %d %s", res.Code, res.Body.String())
		}
	}
	ana := tokenDe(t, r, "ana", "Secreta123!")
	// El puesto de Parrillero es crítico y en fin de semana (domingo) requiere suplente.
	hoy := time.Now()
	diasHastaDomingo := (7 - int(hoy.Weekday())) % 7
	if diasHastaDomingo == 0 {
		diasHastaDomingo = 7
	}
	domingo := hoy.AddDate(0, 0, diasHastaDomingo).Format("2006-01-02")

	solicitudCuerpo := fmt.Sprintf(`{"tipo":"DESCANSO","fecha_inicio":"%s","fecha_fin":"%s","motivo":"Asunto familiar","suplente_id":2}`, domingo, domingo)
	res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos", ana, solicitudCuerpo)
	if res.Code != http.StatusCreated {
		t.Fatalf("crear solicitud: %d %s", res.Code, res.Body.String())
	}
	var solicitud struct {
		ID     int64  `json:"id"`
		Estado string `json:"estado"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &solicitud); err != nil {
		t.Fatal(err)
	}
	if solicitud.Estado != "PENDIENTE_SUPLENTE" {
		t.Fatalf("estado inesperado: %s", solicitud.Estado)
	}
	beto := tokenDe(t, r, "beto", "Secreta123!")
	if res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos/1/cobertura/confirmar", beto, `{"aceptar":true}`); res.Code != http.StatusOK {
		t.Fatalf("confirmar cobertura: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos/1/aprobar", admin, `{}`); res.Code != http.StatusOK {
		t.Fatalf("aprobar solicitud: %d %s", res.Code, res.Body.String())
	}
}

func TestRequiereAutenticacion(t *testing.T) {
	a := nuevaAPIPrueba(t)
	res := llamada(t, a.enrutador(), http.MethodGet, "/api/v1/empleados", "", "")
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("se esperaba 401, llegó %d", res.Code)
	}
}

func TestKardexYVacantes(t *testing.T) {
	a := nuevaAPIPrueba(t)
	r := a.enrutador()
	admin := tokenDe(t, r, "Admin", "xp74Hg53")

	if res := llamada(t, r, http.MethodPost, "/api/v1/sucursales", admin, `{"nombre":"Sucursal Prueba","direccion":"Av. Principal 100","telefono":"4420000000"}`); res.Code != http.StatusCreated {
		t.Fatalf("crear sucursal: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Maestro Carnitero","descripcion":"Cazo","es_critico":true,"requiere_suplente":true,"factor_propina":1.3}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 1: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Parrillero","descripcion":"Asador","es_critico":true,"requiere_suplente":true,"factor_propina":1.25,"jefe_puesto_id":1}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 2: %d %s", res.Code, res.Body.String())
	}

	// 1. Listar vacantes iniciales
	res := llamada(t, r, http.MethodGet, "/api/v1/vacantes", admin, "")
	if res.Code != http.StatusOK {
		t.Fatalf("listar vacantes: %d %s", res.Code, res.Body.String())
	}

	// 2. Crear una nueva vacante
	nuevaVac := `{"codigo":"VAC-TEST01","titulo":"Parrillero de Fin de Semana","puesto_id":2,"sucursal_id":1,"sueldo_ofertado_centavos":320000,"requisitos":"Disponibilidad sábado y domingo"}`
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes", admin, nuevaVac)
	if res.Code != http.StatusCreated {
		t.Fatalf("crear vacante: %d %s", res.Code, res.Body.String())
	}

	// 3. Crear empleado
	empleadoJson := `{"numero_empleado":"EMP-100","nombres":"Carlos","apellido_paterno":"Gómez","fecha_ingreso":"2026-01-15","sueldo_semanal_centavos":250000,"sucursal_id":1,"puesto_id":2,"usuario":"carlos","contrasena":"Clave123!4"}`
	res = llamada(t, r, http.MethodPost, "/api/v1/empleados", admin, empleadoJson)
	if res.Code != http.StatusCreated {
		t.Fatalf("crear empleado: %d %s", res.Code, res.Body.String())
	}
	var empCreado struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &empCreado)

	// 4. Asignar vacante al empleado
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes/1/asignar", admin, fmt.Sprintf(`{"empleado_id":%d}`, empCreado.ID))
	if res.Code != http.StatusOK {
		t.Fatalf("asignar vacante: %d %s", res.Code, res.Body.String())
	}

	// 5. Consultar Kardex del empleado
	res = llamada(t, r, http.MethodGet, fmt.Sprintf("/api/v1/empleados/%d/kardex", empCreado.ID), admin, "")
	if res.Code != http.StatusOK {
		t.Fatalf("obtener kardex: %d %s", res.Code, res.Body.String())
	}
	var kardexResp struct {
		Empleado struct {
			ID             int64  `json:"id"`
			NumeroEmpleado string `json:"numero_empleado"`
			Nombres        string `json:"nombres"`
			VacanteCodigo  string `json:"vacante_codigo"`
		} `json:"empleado"`
		Estadisticas struct {
			DiasAntiguedad int `json:"dias_antiguedad"`
		} `json:"estadisticas"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &kardexResp); err != nil {
		t.Fatal(err)
	}
	if kardexResp.Empleado.NumeroEmpleado != "EMP-100" {
		t.Fatalf("empleado incorrecto en kardex: %s", kardexResp.Empleado.NumeroEmpleado)
	}
	if kardexResp.Empleado.VacanteCodigo != "VAC-TEST01" {
		t.Fatalf("vacante no asignada correctamente: %s", kardexResp.Empleado.VacanteCodigo)
	}

	// 6. Intentar asignar una segunda vacante al mismo empleado debe fallar con 409 (un empleado solo puede tener un puesto a la vez)
	segundaVac := `{"codigo":"VAC-TEST02","titulo":"Maestro Carnitero Titular","puesto_id":1,"sucursal_id":1,"sueldo_ofertado_centavos":500000,"requisitos":"Experiencia en cazo"}`
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes", admin, segundaVac)
	if res.Code != http.StatusCreated {
		t.Fatalf("crear segunda vacante: %d %s", res.Code, res.Body.String())
	}
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes/2/asignar", admin, fmt.Sprintf(`{"empleado_id":%d}`, empCreado.ID))
	if res.Code != http.StatusConflict {
		t.Fatalf("se esperaba 409 al asignar segundo puesto a empleado con plaza activa, llegó: %d %s", res.Code, res.Body.String())
	}

	// 7. Liberar la primera vacante permite asignar la segunda
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes/1/liberar", admin, `{}`)
	if res.Code != http.StatusOK {
		t.Fatalf("liberar vacante: %d %s", res.Code, res.Body.String())
	}
	res = llamada(t, r, http.MethodPost, "/api/v1/vacantes/2/asignar", admin, fmt.Sprintf(`{"empleado_id":%d}`, empCreado.ID))
	if res.Code != http.StatusOK {
		t.Fatalf("asignar segunda vacante tras liberar la primera: %d %s", res.Code, res.Body.String())
	}
}

func TestValidacionesLogicaRepositorio(t *testing.T) {
	a := nuevaAPIPrueba(t)
	r := a.enrutador()
	admin := tokenDe(t, r, "Admin", "xp74Hg53")

	// Crear sucursal y puestos
	if res := llamada(t, r, http.MethodPost, "/api/v1/sucursales", admin, `{"nombre":"Sucursal Centro","direccion":"Centro 1","telefono":"4421111111"}`); res.Code != http.StatusCreated {
		t.Fatalf("crear sucursal: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Gerente","descripcion":"Líder","es_critico":true,"requiere_suplente":false,"factor_propina":1.0}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 1: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/puestos", admin, `{"nombre":"Cocinero","descripcion":"Cocina","es_critico":true,"requiere_suplente":true,"factor_propina":1.2,"jefe_puesto_id":1}`); res.Code != http.StatusCreated {
		t.Fatalf("crear puesto 2: %d %s", res.Code, res.Body.String())
	}

	// Validar que no se permita ciclo circular entre puestos (hacer que puesto 1 tenga como jefe al puesto 2)
	if res := llamada(t, r, http.MethodPatch, "/api/v1/puestos/1", admin, `{"jefe_puesto_id":2}`); res.Code != http.StatusBadRequest {
		t.Fatalf("se esperaba 400 por ciclo circular en puestos, llegó: %d %s", res.Code, res.Body.String())
	}

	// Crear dos empleados operativos
	emp1 := `{"numero_empleado":"EMP-201","nombres":"Luis","apellido_paterno":"Pérez","fecha_ingreso":"2026-02-01","sueldo_semanal_centavos":200000,"sucursal_id":1,"puesto_id":2,"usuario":"luis","contrasena":"Clave123!4"}`
	emp2 := `{"numero_empleado":"EMP-202","nombres":"Mario","apellido_paterno":"López","fecha_ingreso":"2026-02-01","sueldo_semanal_centavos":200000,"sucursal_id":1,"puesto_id":2,"usuario":"mario","contrasena":"Clave123!4"}`
	for _, c := range []string{emp1, emp2} {
		if res := llamada(t, r, http.MethodPost, "/api/v1/empleados", admin, c); res.Code != http.StatusCreated {
			t.Fatalf("crear empleado: %d %s", res.Code, res.Body.String())
		}
	}

	// No se debe permitir desactivar sucursal o puesto con empleados activos
	if res := llamada(t, r, http.MethodPatch, "/api/v1/sucursales/1", admin, `{"activo":false}`); res.Code != http.StatusConflict {
		t.Fatalf("se esperaba 409 al desactivar sucursal con empleados activos, llegó: %d", res.Code)
	}
	if res := llamada(t, r, http.MethodPatch, "/api/v1/puestos/2", admin, `{"activo":false}`); res.Code != http.StatusConflict {
		t.Fatalf("se esperaba 409 al desactivar puesto con empleados activos, llegó: %d", res.Code)
	}

	// Préstamos: no permitir dos solicitudes PENDIENTE simultáneas
	luis := tokenDe(t, r, "luis", "Clave123!4")
	if res := llamada(t, r, http.MethodPost, "/api/v1/prestamos", luis, `{"monto_centavos":100000,"numero_semanas":4,"motivo":"Urgencia médica"}`); res.Code != http.StatusCreated {
		t.Fatalf("solicitar préstamo 1: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/prestamos", luis, `{"monto_centavos":50000,"numero_semanas":4,"motivo":"Segundo préstamo"}`); res.Code != http.StatusConflict {
		t.Fatalf("se esperaba 409 por préstamo pendiente duplicado, llegó: %d %s", res.Code, res.Body.String())
	}

	// Suplente rechaza cobertura -> la solicitud debe pasar a RECHAZADA (no quedarse bloqueada en PENDIENTE_SUPLENTE)
	hoy := time.Now()
	diasHastaDomingo := (7 - int(hoy.Weekday())) % 7
	if diasHastaDomingo == 0 {
		diasHastaDomingo = 7
	}
	domingo := hoy.AddDate(0, 0, diasHastaDomingo).Format("2006-01-02")
	sol := fmt.Sprintf(`{"tipo":"DESCANSO","fecha_inicio":"%s","fecha_fin":"%s","motivo":"Salida familiar","suplente_id":2}`, domingo, domingo)
	if res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos", luis, sol); res.Code != http.StatusCreated {
		t.Fatalf("crear solicitud: %d %s", res.Code, res.Body.String())
	}
	mario := tokenDe(t, r, "mario", "Clave123!4")
	// Mario debe ver la solicitud en /solicitudes-permisos/mias por ser suplente
	resMias := llamada(t, r, http.MethodGet, "/api/v1/solicitudes-permisos/mias", mario, "")
	if resMias.Code != http.StatusOK || !bytes.Contains(resMias.Body.Bytes(), []byte(`"suplente_id":2`)) {
		t.Fatalf("mario no ve la solicitud donde es suplente: %d %s", resMias.Code, resMias.Body.String())
	}
	if res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos/1/cobertura/confirmar", mario, `{"aceptar":false,"comentario":"No puedo cubrir"}`); res.Code != http.StatusOK {
		t.Fatalf("rechazar cobertura: %d %s", res.Code, res.Body.String())
	}
	// Ahora Luis puede volver a solicitar para esa misma fecha porque la anterior quedó RECHAZADA
	if res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos", luis, sol); res.Code != http.StatusCreated {
		t.Fatalf("re-solicitar tras rechazo de suplente: %d %s", res.Code, res.Body.String())
	}

	// Al dar de baja a un empleado, su sesión/usuario queda inactivo inmediatamente
	if res := llamada(t, r, http.MethodPatch, "/api/v1/empleados/2", admin, `{"activo":false}`); res.Code != http.StatusOK {
		t.Fatalf("desactivar empleado 2: %d %s", res.Code, res.Body.String())
	}
	if res := llamada(t, r, http.MethodGet, "/api/v1/mi-perfil", mario, ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("se esperaba 401 para empleado dado de baja, llegó: %d", res.Code)
	}
}
