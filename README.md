# PADRÓN — API de Recursos Humanos y Operación

API REST en español para Cárnitas y Carne Asada PADRÓN. Administra personal, estaciones críticas, turnos, permisos, préstamos, propinas, incidencias y reportes. Usa **Go + Gin + SQLite embebido**.

## Ejecutar de forma portable

El archivo entregable es `padron.exe`. Cópialo a una USB o a cualquier carpeta con permiso de escritura y ejecútalo. Al primer inicio creará `padron.db` en esa misma carpeta; no necesita instalar SQLite, Go, un servidor ni otro servicio.

```powershell
.\padron.exe
# escucha en http://localhost:8080
```

Opciones: `padron.exe -puerto 8090` y `padron.exe -bd D:\datos\padron.db`. También se puede definir `PADRON_BD`. Para que los tokens sobrevivan reinicios puede definirse `PADRON_SECRETO` con un secreto largo; si no se define, basta iniciar sesión de nuevo después de reiniciar.

Usuario inicial (cámbialo tras la primera prueba): `admin` / `Cambiar123!`.

Para compilar desde código fuente (solo en el equipo de desarrollo):

```powershell
go test ./...
go build -trimpath -ldflags="-s -w" -o .\entregable\padron.exe .
```

Las cantidades monetarias se expresan en **centavos** para evitar errores de redondeo: por ejemplo, `$1,250.50` se envía como `125050`.

## Autenticación en Bruno

1. `POST /api/v1/autenticacion/iniciar-sesion` con:

```json
{"usuario":"admin","contrasena":"Cambiar123!"}
```

2. Copia `token` de la respuesta y configura el encabezado de las solicitudes protegidas:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Todos los errores devuelven JSON con la clave `error`. Los códigos principales son `400` (formato/regla de negocio), `401` (sin sesión), `403` (rol insuficiente), `404` y `409` (conflicto de estado o dato duplicado).

Para el equipo de interfaz está disponible la [documentación detallada de integración con Electron](DOCUMENTACION_FRONTEND.md): describe qué recibe y devuelve cada endpoint, los estados que debe representar la UI y cómo crear un ejecutable portable que incluya esta API.

## Endpoints

Base URL: `http://localhost:8080`. Las rutas marcadas **RH** son solo `RH_ADMIN`; **Gestión** permite `RH_ADMIN` y `ENCARGADO`; las demás permiten al empleado autenticado.

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| GET | `/salud` | Público | Estado del servicio |
| POST | `/api/v1/autenticacion/iniciar-sesion` | Público | Obtiene token Bearer |
| GET | `/api/v1/mi-perfil` | Sesión | Perfil y rol propios |
| POST | `/api/v1/mi-perfil/cambiar-contrasena` | Sesión | Cambia la contraseña propia |
| GET | `/api/v1/catalogos/sucursales` | Sesión | Sucursales |
| POST | `/api/v1/sucursales` | RH | Crear sucursal |
| PATCH | `/api/v1/sucursales/:id` | RH | Actualizar/activar sucursal |
| GET | `/api/v1/catalogos/puestos` | Sesión | Puestos y criticidad |
| POST | `/api/v1/puestos` | RH | Crear puesto |
| PATCH | `/api/v1/puestos/:id` | RH | Actualizar/activar puesto |
| GET | `/api/v1/empleados` | Gestión | Lista; filtros `sucursal_id`, `puesto_id`, `activo` |
| GET | `/api/v1/empleados/:id` | Gestión | Detalle de empleado |
| POST | `/api/v1/empleados` | Gestión | Alta de empleado y, opcionalmente, usuario |
| PATCH | `/api/v1/empleados/:id` | Gestión | Puesto, sueldo, contacto o baja lógica |
| GET | `/api/v1/usuarios` | RH | Lista credenciales sin exponer hashes |
| POST | `/api/v1/usuarios` | RH | Crea acceso para empleado existente |
| PATCH | `/api/v1/usuarios/:id` | RH | Rol, contraseña, usuario o activación |
| GET | `/api/v1/turnos/mios` | Sesión | Turnos propios; filtros `desde`, `hasta` |
| GET | `/api/v1/turnos` | Gestión | Turnos; requiere `desde`, `hasta`; filtro opcional `empleado_id` |
| POST | `/api/v1/turnos` | Gestión | Programa o registra asistencia |
| PATCH | `/api/v1/turnos/:id` | Gestión | Estado, horas trabajadas o notas |
| GET | `/api/v1/solicitudes-permisos/mias` | Sesión | Solicitudes propias |
| POST | `/api/v1/solicitudes-permisos` | Sesión | Crea permiso/descanso/vacaciones |
| POST | `/api/v1/solicitudes-permisos/:id/cancelar` | Dueño/Gestión | Cancela solicitud pendiente |
| POST | `/api/v1/solicitudes-permisos/:id/cobertura/confirmar` | Suplente | Acepta o rechaza cobertura |
| GET | `/api/v1/solicitudes-permisos` | Gestión | Bandeja; filtro `estado` |
| POST | `/api/v1/solicitudes-permisos/:id/aprobar` | Gestión | Dictamen favorable |
| POST | `/api/v1/solicitudes-permisos/:id/rechazar` | Gestión | Rechazo con observación |
| GET | `/api/v1/prestamos/mios` | Sesión | Préstamos propios |
| POST | `/api/v1/prestamos` | Sesión | Solicita préstamo/adelanto |
| GET | `/api/v1/prestamos` | Gestión | Lista; filtro `estado` |
| POST | `/api/v1/prestamos/:id/aprobar` | Gestión | Autoriza préstamo |
| POST | `/api/v1/prestamos/:id/rechazar` | Gestión | Rechaza préstamo |
| POST | `/api/v1/prestamos/:id/registrar-retencion` | Gestión | Aplica descuento semanal |
| GET | `/api/v1/propinas/mias` | Sesión | Propinas propias |
| POST | `/api/v1/propinas/bolsas` | Gestión | Registra bolsa diaria |
| GET | `/api/v1/propinas/bolsas` | Gestión | Lista bolsas; filtro `fecha` |
| POST | `/api/v1/propinas/bolsas/:id/calcular-asignaciones` | Gestión | Distribuye por horas × factor de puesto |
| POST | `/api/v1/buzon-sugerencias` | Sesión | Sugerencia, queja o incidente anónimo/directo |
| GET | `/api/v1/buzon-sugerencias/mios` | Sesión | Reportes directos propios |
| GET | `/api/v1/buzon-sugerencias` | Gestión | Bandeja; filtro `estado` |
| PATCH | `/api/v1/buzon-sugerencias/:id` | Gestión | Atiende o cierra reporte |
| GET | `/api/v1/historico-incidencias` | Gestión | Bitácora inmutable; filtro `empleado_id` |
| POST | `/api/v1/historico-incidencias` | Gestión | Agrega incidencia manual |
| GET | `/api/v1/reportes/ausentismo` | Gestión | Requiere `desde` y `hasta` |
| GET | `/api/v1/reportes/rotacion-por-puesto` | Gestión | Bajas y cambios por puesto |
| GET | `/api/v1/reportes/retenciones-nomina` | Gestión | Requiere `semana_inicio` (lunes) |

## Cuerpos principales para Bruno

Crear empleado (los campos `usuario`, `contrasena` y `rol` son opcionales; sin ellos se crea solo el expediente):

```json
{
  "numero_empleado": "PAD-001",
  "nombres": "María",
  "apellido_paterno": "López",
  "curp": "LOPM900101HMCPRR01",
  "correo": "maria@padron.mx",
  "telefono": "5555555555",
  "fecha_ingreso": "2026-10-06",
  "sueldo_semanal_centavos": 350000,
  "sucursal_id": 1,
  "puesto_id": 2,
  "usuario": "maria.lopez",
  "contrasena": "ClaveSegura123!",
  "rol": "OPERATIVO"
}
```

Crear turno trabajado:

```json
{"empleado_id":1,"fecha":"2026-10-11","hora_inicio":"09:00","hora_fin":"17:00","estado":"TRABAJADO","horas_trabajadas":8}
```

Solicitud crítica en domingo; `suplente_id` debe ser empleado activo, de la misma sucursal y del mismo puesto:

```json
{"tipo":"DESCANSO","fecha_inicio":"2026-10-11","fecha_fin":"2026-10-11","motivo":"Compromiso familiar","suplente_id":2}
```

El suplente confirma con `POST /api/v1/solicitudes-permisos/:id/cobertura/confirmar`:

```json
{"aceptar":true,"comentario":"Cubriré apertura y servicio"}
```

Solicitud de préstamo:

```json
{"monto_centavos":150000,"numero_semanas":5,"motivo":"Anticipo por emergencia"}
```

Cambio de contraseña propio:

```json
{"contrasena_actual":"Cambiar123!","contrasena_nueva":"NuevaClave123!"}
```

La API limita el préstamo a dos sueldos semanales, su descuento a 35% del sueldo, y las retenciones activas acumuladas a 40% al aprobar. Para registrar una retención: `{"semana_inicio":"2026-10-05"}`; la fecha debe ser lunes.

Bolsa de propinas y cálculo:

```json
{"sucursal_id":1,"fecha":"2026-10-11","monto_centavos":425000}
```

Después llama `POST /api/v1/propinas/bolsas/:id/calcular-asignaciones`. Requiere turnos con estado `TRABAJADO` y horas registradas ese día. El total se conserva exactamente, incluidos los centavos residuales.

Buzón anónimo de seguridad:

```json
{"anonimo":true,"tipo":"SEGURIDAD","asunto":"Extractor con ruido","descripcion":"El extractor de humo presenta vibración anormal.","prioridad":"ALTA"}
```

## Reglas de negocio implementadas

- Un puesto marcado crítico y con suplencia obligatoria exige cobertura aceptada cuando la ausencia toca sábado o domingo.
- El suplente no puede ser el solicitante, debe ser activo, compartir sucursal y puesto, y no tener una ausencia activa que choque con las fechas.
- RH/Encargado no puede aprobar una solicitud crítica hasta que el suplente la acepte.
- Las horas trabajadas no pueden superar el turno ni 16 horas. Faltas y retardos quedan en el histórico.
- CURP, correo, fechas, importes, identificadores y estados se validan antes de persistir.
- El histórico no permite `UPDATE` ni `DELETE` incluso directamente en SQLite, mediante triggers.
- Las claves se almacenan con bcrypt; los tokens están firmados y expiran en ocho horas.
