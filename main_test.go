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
}
