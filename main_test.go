package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

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
	admin := tokenDe(t, r, "admin", "Cambiar123!")
	primerEmpleado := `{"numero_empleado":"EMP-001","nombres":"Ana","apellido_paterno":"Cocina","fecha_ingreso":"2026-10-01","sueldo_semanal_centavos":100000,"sucursal_id":1,"puesto_id":2,"usuario":"ana","contrasena":"Secreta123!"}`
	segundoEmpleado := `{"numero_empleado":"EMP-002","nombres":"Beto","apellido_paterno":"Cocina","fecha_ingreso":"2026-10-01","sueldo_semanal_centavos":100000,"sucursal_id":1,"puesto_id":2,"usuario":"beto","contrasena":"Secreta123!"}`
	for _, cuerpo := range []string{primerEmpleado, segundoEmpleado} {
		if res := llamada(t, r, http.MethodPost, "/api/v1/empleados", admin, cuerpo); res.Code != http.StatusCreated {
			t.Fatalf("crear empleado: %d %s", res.Code, res.Body.String())
		}
	}
	ana := tokenDe(t, r, "ana", "Secreta123!")
	// 11 de octubre de 2026 es domingo: el puesto de Parrillero requiere cobertura.
	res := llamada(t, r, http.MethodPost, "/api/v1/solicitudes-permisos", ana, `{"tipo":"DESCANSO","fecha_inicio":"2026-10-11","fecha_fin":"2026-10-11","motivo":"Asunto familiar","suplente_id":2}`)
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
