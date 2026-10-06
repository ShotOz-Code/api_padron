# Guía de integración para el frontend de PADRÓN

Este documento es el contrato de integración para el equipo que construirá la aplicación de Electron. Describe exactamente qué recibe y qué entrega la API incluida en `padron.exe`.

## 1. Convenciones generales

**URL base local:** `http://127.0.0.1:<puerto>/api/v1`. Durante desarrollo puede ser `http://127.0.0.1:8080/api/v1`.

Todas las rutas, fechas, valores de catálogo y nombres de campos están en español. Los cuerpos son JSON UTF-8 y deben enviar el encabezado `Content-Type: application/json`.

Las rutas protegidas requieren:

```http
Authorization: Bearer <token>
```

El token se obtiene al iniciar sesión, dura ocho horas y deja de ser válido al reiniciar el backend si este se inició sin `PADRON_SECRETO`. La interfaz debe tratar `401` como “volver a iniciar sesión”; no debe intentar fabricar o modificar un token.

### Roles

| Rol | Puede usar |
|---|---|
| `OPERATIVO` | Sus propios turnos, permisos, préstamos, propinas y reportes directos al buzón. |
| `ENCARGADO` | Todo lo de `OPERATIVO` más la operación y aprobaciones de personal, turnos, permisos, préstamos, propinas, buzón e informes. |
| `RH_ADMIN` | Todo lo anterior más sucursales, puestos y credenciales de usuarios. |

### Formatos y valores comunes

| Dato | Formato / valores |
|---|---|
| Fecha | `AAAA-MM-DD`, por ejemplo `2026-10-11`. |
| Hora | `HH:MM` de 24 horas, por ejemplo `09:30`. |
| Dinero | Entero en centavos. `$1,250.50` se envía como `125050`; no enviar decimales. |
| Booleanos | JSON real: `true` o `false`, nunca texto. |
| Identificadores | Enteros positivos. En una ruta se escriben, por ejemplo, `/empleados/14`. |
| PATCH | Solo enviar los campos que se desean modificar. |

No hay paginación actualmente. Para tablas largas el frontend debe considerar filtros disponibles y no asumir que la respuesta tendrá `total` ni `pagina`.

### Errores

Para cualquier error, la forma de respuesta es:

```json
{"error":"Descripción legible del problema"}
```

| Código | Significado para la interfaz |
|---|---|
| `400` | Campo, formato o regla de negocio inválida. Mostrar `error` junto al formulario. |
| `401` | Falta token, token vencido o sesión inactiva. Borrar sesión local y mostrar login. |
| `403` | El rol o el propietario no tiene autorización. Ocultar la acción en UI y mostrar aviso si ocurre. |
| `404` | El recurso ya no existe. Refrescar el listado. |
| `409` | Conflicto: duplicado o estado que ya cambió. Refrescar datos y mostrar el mensaje. |
| `500` | Error inesperado del servicio. Mostrar error genérico, conservar el formulario y permitir reintento. |

### Objetos que devuelve la API

Estos son los campos de lectura que aparecen en varias respuestas:

```ts
type Empleado = {
  id: number;
  numero_empleado: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  curp: string;
  correo: string;
  telefono: string;
  fecha_ingreso: string;
  sueldo_semanal_centavos: number;
  sucursal_id: number;
  sucursal: string;
  puesto_id: number;
  puesto: string;
  activo: 0 | 1; // En Empleado es entero, no booleano.
};

type Sucursal = {
  id: number; nombre: string; direccion: string; telefono: string;
  activo: boolean; creado_en: string;
};

type Puesto = {
  id: number; nombre: string; descripcion: string;
  es_critico: boolean; requiere_suplente: boolean;
  factor_propina: number; activo: boolean;
};
```

---

## 2. Salud y sesión

### `GET /salud`

No usa `/api/v1` ni token.

**Qué llega:** nada.

**Qué regresa — `200`:** confirma que el proceso Go está listo. Electron debe consultar esta ruta antes de cargar una ventana que dependa de la API.

```json
{"estado":"activo","servicio":"PADRÓN RH API","hora":"2026-10-06T09:55:00-06:00"}
```

### `POST /api/v1/autenticacion/iniciar-sesion`

**Qué llega:**

```json
{"usuario":"admin","contrasena":"Cambiar123!"}
```

`usuario` es obligatorio, máximo 80 caracteres. `contrasena` es obligatoria y debe tener de 8 a 128 caracteres.

**Qué regresa — `200`:**

```json
{
  "token":"eyJ...",
  "tipo":"Bearer",
  "expira_en_minutos":480,
  "rol":"RH_ADMIN",
  "usuario_id":1,
  "empleado_id":null
}
```

`empleado_id` es `null` para una cuenta administrativa que no está enlazada a un empleado. Guardar el token únicamente en memoria de la sesión; no incluirlo en URLs, registros o notificaciones.

### `GET /api/v1/mi-perfil`

**Qué llega:** token Bearer.

**Qué regresa — `200`:** usuario, rol y el objeto `Empleado` enlazado. En administradores sin expediente, `empleado` es `null`.

```json
{"usuario_id":2,"rol":"OPERATIVO","empleado":{"id":14,"numero_empleado":"PAD-014","nombres":"Ana","apellido_paterno":"López","apellido_materno":"","curp":"","correo":"ana@padron.mx","telefono":"","fecha_ingreso":"2026-10-01","sueldo_semanal_centavos":350000,"sucursal_id":1,"sucursal":"Matriz PADRÓN","puesto_id":2,"puesto":"Parrillero","activo":1}}
```

### `POST /api/v1/mi-perfil/cambiar-contrasena`

**Qué llega:** token y:

```json
{"contrasena_actual":"Cambiar123!","contrasena_nueva":"NuevaClave123!"}
```

La nueva contraseña debe tener de 8 a 128 caracteres.

**Qué regresa — `200`:**

```json
{"mensaje":"Contraseña actualizada correctamente"}
```

---

## 3. Catálogos y usuarios de acceso

### `GET /api/v1/catalogos/sucursales`

**Qué llega:** token.

**Qué regresa — `200`:** arreglo de `Sucursal`, incluso inactivas. Usar `activo` para deshabilitar selección en formularios nuevos.

### `POST /api/v1/sucursales` — solo `RH_ADMIN`

**Qué llega:**

```json
{"nombre":"Sucursal Norte","direccion":"Av. Central 123","telefono":"5551234567","activo":true}
```

`nombre` y `direccion` son obligatorios. `activo` es opcional y por defecto es `true`.

**Qué regresa — `201`:** `{"id":2,"mensaje":"Sucursal creada correctamente"}`.

### `PATCH /api/v1/sucursales/:id` — solo `RH_ADMIN`

**Qué llega:** token, `id` de ruta y cualquier combinación de `nombre`, `direccion`, `telefono`, `activo`.

```json
{"telefono":"5559990000","activo":false}
```

**Qué regresa — `200`:** `{"mensaje":"Sucursal actualizada correctamente"}`. No existe eliminación física.

### `GET /api/v1/catalogos/puestos`

**Qué llega:** token.

**Qué regresa — `200`:** arreglo de `Puesto`. `factor_propina` multiplica las horas trabajadas al repartir la bolsa. Un puesto con `requiere_suplente: true` también debe tener `es_critico: true`.

### `POST /api/v1/puestos` — solo `RH_ADMIN`

**Qué llega:**

```json
{"nombre":"Ayudante de cocina","descripcion":"Apoyo en preparación","es_critico":false,"requiere_suplente":false,"factor_propina":0.9}
```

`nombre` y un `factor_propina` entre `0.01` y `5` son obligatorios. Si `requiere_suplente` es `true`, `es_critico` también debe ser `true`.

**Qué regresa — `201`:** `{"id":7,"mensaje":"Puesto creado correctamente"}`.

### `PATCH /api/v1/puestos/:id` — solo `RH_ADMIN`

**Qué llega:** token, `id` y uno o varios de: `nombre`, `descripcion`, `es_critico`, `requiere_suplente`, `factor_propina`, `activo`.

**Qué regresa — `200`:** `{"mensaje":"Puesto actualizado correctamente"}`.

### `GET /api/v1/usuarios` — solo `RH_ADMIN`

**Qué llega:** token.

**Qué regresa — `200`:** arreglo de cuentas sin hashes ni contraseñas:

```json
[{"id":2,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","usuario":"ana.lopez","rol":"OPERATIVO","activo":true,"creado_en":"2026-10-06 15:00:00"}]
```

### `POST /api/v1/usuarios` — solo `RH_ADMIN`

**Qué llega:**

```json
{"empleado_id":14,"usuario":"ana.lopez","contrasena":"ClaveSegura123!","rol":"OPERATIVO"}
```

Todos los campos son obligatorios. El empleado debe existir y estar activo. Valores de `rol`: `RH_ADMIN`, `ENCARGADO`, `OPERATIVO`.

**Qué regresa — `201`:** `{"id":2,"mensaje":"Usuario creado correctamente"}`.

### `PATCH /api/v1/usuarios/:id` — solo `RH_ADMIN`

**Qué llega:** token, `id` y uno o varios de `usuario`, `contrasena`, `rol`, `activo`.

```json
{"rol":"ENCARGADO","activo":true}
```

**Qué regresa — `200`:** `{"mensaje":"Usuario actualizado correctamente"}`. La API impide desactivar o degradar al último `RH_ADMIN` activo.

---

## 4. Empleados y turnos

### `GET /api/v1/empleados` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token. Filtros opcionales: `?sucursal_id=1`, `?puesto_id=2`, `?activo=true` o `?activo=false`. Se pueden combinar.

**Qué regresa — `200`:** arreglo de `Empleado`.

### `GET /api/v1/empleados/:id` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token e `id` del empleado.

**Qué regresa — `200`:** un objeto `Empleado`.

### `POST /api/v1/empleados` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:**

```json
{
  "numero_empleado":"PAD-014",
  "nombres":"Ana",
  "apellido_paterno":"López",
  "apellido_materno":"Soto",
  "curp":"LOSA900101HMCPNN01",
  "correo":"ana@padron.mx",
  "telefono":"5555555555",
  "fecha_ingreso":"2026-10-01",
  "sueldo_semanal_centavos":350000,
  "sucursal_id":1,
  "puesto_id":2,
  "usuario":"ana.lopez",
  "contrasena":"ClaveSegura123!",
  "rol":"OPERATIVO"
}
```

Obligatorios: `numero_empleado`, `nombres`, `apellido_paterno`, `fecha_ingreso`, `sueldo_semanal_centavos`, `sucursal_id`, `puesto_id`. `curp`, `correo`, `telefono` y los tres datos de cuenta son opcionales. Si se envía `usuario`, también deben enviarse `contrasena`; con ambos se crea su acceso en la misma operación. CURP debe tener 18 caracteres alfanuméricos en mayúsculas y el correo debe ser válido.

**Qué regresa — `201`:**

```json
{"id":14,"usuario_id":2,"mensaje":"Empleado creado correctamente"}
```

Si no se creó cuenta, `usuario_id` es `null`.

### `PATCH /api/v1/empleados/:id` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token, `id` y al menos un campo de este grupo:

```json
{"sucursal_id":1,"puesto_id":3,"sueldo_semanal_centavos":370000,"correo":"ana.nueva@padron.mx","telefono":"5555550000","activo":false}
```

No modifica nombres, CURP ni fecha de ingreso. Un cambio de puesto o sueldo genera una incidencia histórica automática. La baja es lógica usando `activo:false`.

**Qué regresa — `200`:** `{"mensaje":"Empleado actualizado correctamente"}`.

### `GET /api/v1/turnos/mios`

**Qué llega:** token de un usuario vinculado a empleado. Filtros opcionales `desde` y `hasta`; si se omiten, entrega desde hoy hasta 14 días después.

**Qué regresa — `200`:** arreglo:

```json
[{"id":8,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","fecha":"2026-10-11","hora_inicio":"09:00","hora_fin":"17:00","estado":"PROGRAMADO","horas_trabajadas":0,"notas":""}]
```

### `GET /api/v1/turnos` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token y **obligatoriamente** `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`; permite `&empleado_id=14`.

**Qué regresa — `200`:** el mismo arreglo de turnos anterior.

### `POST /api/v1/turnos` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:**

```json
{"empleado_id":14,"fecha":"2026-10-11","hora_inicio":"09:00","hora_fin":"17:00","estado":"TRABAJADO","horas_trabajadas":8,"notas":"Cobertura de parrilla"}
```

`empleado_id`, fecha y horas son obligatorios; `estado` por defecto es `PROGRAMADO`. Valores: `PROGRAMADO`, `TRABAJADO`, `FALTA`, `RETARDO`, `CANCELADO`. En `TRABAJADO`, si no se manda `horas_trabajadas`, se toma la duración completa; no puede superar el turno ni 16 horas. Para los demás estados se guarda `0` horas.

**Qué regresa — `201`:** `{"id":8,"mensaje":"Turno creado correctamente"}`.

### `PATCH /api/v1/turnos/:id` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token, `id` y cualquier subconjunto de:

```json
{"estado":"RETARDO","notas":"Llegó 20 minutos después"}
```

También acepta `horas_trabajadas`. Cuando el estado es `FALTA` o `RETARDO`, se registra la incidencia histórica.

**Qué regresa — `200`:** `{"mensaje":"Turno actualizado correctamente"}`.

---

## 5. Permisos y coberturas

### Estados que la UI debe representar

| Estado | Significado y acción posible |
|---|---|
| `PENDIENTE_SUPLENTE` | Espera que el suplente acepte o rechace. No puede aprobarse aún. |
| `PENDIENTE_APROBACION` | Gestión puede aprobar o rechazar. |
| `APROBADA` / `RECHAZADA` / `CANCELADA` | Estado final. |

### `GET /api/v1/solicitudes-permisos/mias`

**Qué llega:** token de usuario vinculado a empleado.

**Qué regresa — `200`:** arreglo de solicitudes. `cobertura` es `null` si no aplica.

```json
[{"id":4,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","tipo":"DESCANSO","fecha_inicio":"2026-10-11","fecha_fin":"2026-10-11","motivo":"Compromiso familiar","estado":"PENDIENTE_SUPLENTE","requiere_cobertura":true,"cobertura":{"id":15,"nombre":"Beto Ruiz","estado":"PENDIENTE"},"observacion_dictamen":"","creado_en":"2026-10-06 15:00:00"}]
```

### `POST /api/v1/solicitudes-permisos`

**Qué llega:** un operativo envía sus propios datos y no debe mostrar `empleado_id`. Gestión puede incluirlo para registrar en nombre de otro empleado.

```json
{"tipo":"DESCANSO","fecha_inicio":"2026-10-11","fecha_fin":"2026-10-11","motivo":"Compromiso familiar","suplente_id":15}
```

Valores de `tipo`: `VACACIONES`, `ENFERMEDAD`, `DESCANSO`, `PERMISO_EXTRAORDINARIO`. Las fechas no pueden ser pasadas ni cruzarse con otra solicitud activa del titular.

Para un puesto que es crítico y requiere suplente, si el intervalo toca sábado o domingo, `suplente_id` es obligatorio. El suplente debe ser activo, de la misma sucursal y del mismo puesto, y no tener una ausencia que se cruce. Fuera de ese caso no enviar `suplente_id`.

**Qué regresa — `201`:**

```json
{"id":4,"estado":"PENDIENTE_SUPLENTE","requiere_cobertura":true,"mensaje":"Solicitud registrada correctamente"}
```

### `POST /api/v1/solicitudes-permisos/:id/cancelar`

**Qué llega:** token del solicitante o de Gestión e `id`. Sin cuerpo.

**Qué regresa — `200`:** `{"mensaje":"Solicitud cancelada correctamente"}`. Solo opera en solicitudes pendientes.

### `POST /api/v1/solicitudes-permisos/:id/cobertura/confirmar`

**Qué llega:** token del empleado designado como suplente, `id` y:

```json
{"aceptar":true,"comentario":"Cubriré el turno de apertura"}
```

`aceptar` es booleano; `comentario` es opcional. El propio suplente es el único que puede llamar la ruta.

**Qué regresa — `200`:**

```json
{"estado_cobertura":"ACEPTADA","estado_solicitud":"PENDIENTE_APROBACION"}
```

Si `aceptar` es `false`, los estados son `RECHAZADA` y `PENDIENTE_SUPLENTE` respectivamente; Gestión deberá conseguir otra cobertura antes de aprobar.

### `GET /api/v1/solicitudes-permisos` — `RH_ADMIN` o `ENCARGADO`

**Qué llega:** token y filtro opcional `?estado=PENDIENTE_APROBACION`.

**Qué regresa — `200`:** mismo arreglo de solicitudes propias, pero de toda la operación.

### `POST /api/v1/solicitudes-permisos/:id/aprobar` — Gestión

**Qué llega:** token, `id` y cuerpo opcional:

```json
{"observacion":"Cobertura confirmada"}
```

**Qué regresa — `200`:** `{"mensaje":"Solicitud aprobada correctamente","estado":"APROBADA"}`. Una solicitud con cobertura obligatoria requiere que la cobertura esté en `ACEPTADA`.

### `POST /api/v1/solicitudes-permisos/:id/rechazar` — Gestión

**Qué llega:** token, `id` y observación obligatoria:

```json
{"observacion":"No hay cobertura disponible para la estación"}
```

**Qué regresa — `200`:** `{"mensaje":"Solicitud rechazada correctamente","estado":"RECHAZADA"}`.

---

## 6. Préstamos y retenciones

### Estados

`PENDIENTE`, `APROBADO`, `RECHAZADO`, `LIQUIDADO`, `CANCELADO`.

### `POST /api/v1/prestamos`

**Qué llega:** operativo: los tres campos siguientes. Gestión puede añadir `empleado_id` para solicitar por otra persona.

```json
{"monto_centavos":150000,"numero_semanas":5,"motivo":"Anticipo por emergencia"}
```

El monto no puede exceder dos sueldos semanales. El descuento calculado no puede exceder 35% del sueldo semanal. `numero_semanas` debe estar entre 1 y 52.

**Qué regresa — `201`:**

```json
{"id":3,"descuento_semanal_centavos":30000,"mensaje":"Solicitud de préstamo registrada"}
```

### `GET /api/v1/prestamos/mios`

**Qué llega:** token de usuario vinculado.

**Qué regresa — `200`:** arreglo de préstamos:

```json
[{"id":3,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","monto_original_centavos":150000,"saldo_centavos":150000,"descuento_semanal_centavos":30000,"numero_semanas":5,"motivo":"Anticipo por emergencia","estado":"PENDIENTE","observacion_dictamen":"","creado_en":"2026-10-06 15:00:00","aprobado_en":""}]
```

### `GET /api/v1/prestamos` — Gestión

**Qué llega:** token y filtro opcional `?estado=PENDIENTE`.

**Qué regresa — `200`:** mismo arreglo, de todos los empleados.

### `POST /api/v1/prestamos/:id/aprobar` — Gestión

**Qué llega:** token, `id` y un cuerpo JSON, que puede estar vacío: `{}` o `{"observacion":"Autorizado por RH"}`.

**Qué regresa — `200`:** `{"estado":"APROBADO","mensaje":"Préstamo aprobado correctamente"}`. La API valida que la suma de retenciones de préstamos activos no supere 40% del sueldo semanal.

### `POST /api/v1/prestamos/:id/rechazar` — Gestión

**Qué llega:** token, `id` y observación obligatoria:

```json
{"observacion":"Documentación incompleta"}
```

**Qué regresa — `200`:** `{"estado":"RECHAZADO","mensaje":"Préstamo rechazado correctamente"}`.

### `POST /api/v1/prestamos/:id/registrar-retencion` — Gestión

**Qué llega:** token, `id` y:

```json
{"semana_inicio":"2026-10-05","monto_centavos":30000}
```

`semana_inicio` es obligatoria y debe ser lunes. `monto_centavos` es opcional; al omitirlo se toma el descuento semanal pactado. Si se envía, debe ser positivo, no mayor al descuento ni al saldo. No puede haber dos retenciones para el mismo préstamo y semana.

**Qué regresa — `201`:**

```json
{"monto_centavos":30000,"saldo_centavos":120000,"estado":"APROBADO"}
```

Cuando el saldo llega a cero, `estado` es `LIQUIDADO`.

---

## 7. Propinas

### `GET /api/v1/propinas/mias`

**Qué llega:** token de usuario vinculado.

**Qué regresa — `200`:**

```json
[{"id":9,"bolsa_id":4,"fecha":"2026-10-11","sucursal":"Matriz PADRÓN","horas_ponderadas":10,"monto_centavos":58000}]
```

### `POST /api/v1/propinas/bolsas` — Gestión

**Qué llega:**

```json
{"sucursal_id":1,"fecha":"2026-10-11","monto_centavos":425000}
```

No admite fecha futura ni una segunda bolsa de la misma sucursal y fecha.

**Qué regresa — `201`:** `{"id":4,"mensaje":"Bolsa de propinas creada correctamente"}`.

### `GET /api/v1/propinas/bolsas` — Gestión

**Qué llega:** token y filtro opcional `?fecha=2026-10-11`.

**Qué regresa — `200`:**

```json
[{"id":4,"sucursal_id":1,"sucursal":"Matriz PADRÓN","fecha":"2026-10-11","monto_centavos":425000,"estado":"CALCULADA","asignaciones":8,"creado_en":"2026-10-11 20:00:00"}]
```

Estados de bolsa: `ABIERTA`, `CALCULADA`, `CERRADA`. La API actual crea bolsas abiertas y, tras calcular, las deja en calculadas.

### `POST /api/v1/propinas/bolsas/:id/calcular-asignaciones` — Gestión

**Qué llega:** token e `id` de bolsa. Sin cuerpo.

**Qué regresa — `200`:**

```json
{"mensaje":"Propinas asignadas correctamente","participantes":8,"monto_distribuido_centavos":425000}
```

Solo usa turnos de la sucursal y día indicados cuyo estado sea `TRABAJADO` y tengan horas mayores a cero. La distribución es proporcional a `horas_trabajadas × factor_propina`; el último centavo residual se ajusta para que el total distribuido sea exacto. Si ya se calculó, puede recalcularse mientras no esté cerrada.

---

## 8. Buzón, histórico y reportes

### `POST /api/v1/buzon-sugerencias`

**Qué llega:** token y:

```json
{"anonimo":true,"tipo":"SEGURIDAD","asunto":"Extractor con ruido","descripcion":"El extractor presenta vibración anormal.","prioridad":"ALTA"}
```

`tipo`, `asunto` y `descripcion` son obligatorios. `anonimo` es opcional y por defecto es `false`; si se omite `prioridad`, se usa `MEDIA`. Tipos: `SUGERENCIA`, `QUEJA`, `INCIDENTE_MANTENIMIENTO`, `SEGURIDAD`, `CLIMA_LABORAL`. Prioridades: `BAJA`, `MEDIA`, `ALTA`, `CRITICA`.

Si `anonimo` es `false`, el usuario debe estar vinculado a empleado y se guarda su identidad. Si es `true`, no se asocia autor.

**Qué regresa — `201`:** `{"id":7,"anonimo":true,"mensaje":"Reporte enviado al buzón"}`.

### `GET /api/v1/buzon-sugerencias/mios`

**Qué llega:** token de empleado.

**Qué regresa — `200`:** reportes directos propios, nunca los anónimos:

```json
[{"id":8,"anonimo":false,"autor":{"id":14,"numero_empleado":"PAD-014","nombre":"Ana López"},"tipo":"SUGERENCIA","asunto":"Nuevo horario","descripcion":"...","prioridad":"MEDIA","estado":"RECIBIDO","respuesta":"","creado_en":"2026-10-06 15:00:00","atendido_en":""}]
```

### `GET /api/v1/buzon-sugerencias` — Gestión

**Qué llega:** token y filtro opcional `?estado=RECIBIDO`.

**Qué regresa — `200`:** mismo arreglo; en reportes anónimos `autor` es `null`. Estados: `RECIBIDO`, `EN_REVISION`, `ATENDIDO`, `CERRADO`.

### `PATCH /api/v1/buzon-sugerencias/:id` — Gestión

**Qué llega:** token, `id` y:

```json
{"estado":"ATENDIDO","respuesta":"Mantenimiento revisará el extractor esta tarde"}
```

Estados admitidos aquí: `EN_REVISION`, `ATENDIDO`, `CERRADO`. Para `ATENDIDO` o `CERRADO`, `respuesta` es obligatoria.

**Qué regresa — `200`:** `{"mensaje":"Reporte actualizado correctamente"}`.

### `GET /api/v1/historico-incidencias` — Gestión

**Qué llega:** token y filtro opcional `?empleado_id=14`.

**Qué regresa — `200`:**

```json
[{"id":20,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","tipo":"RETARDO","descripcion":"Retardo registrado en turno","fecha_evento":"2026-10-11","creado_en":"2026-10-11 17:01:00"}]
```

El histórico no se puede editar ni borrar; la interfaz no debe ofrecer dichas acciones.

### `POST /api/v1/historico-incidencias` — Gestión

**Qué llega:**

```json
{"empleado_id":14,"tipo":"FALTA_JUSTIFICADA","descripcion":"Incapacidad médica presentada","fecha_evento":"2026-10-11"}
```

El empleado debe existir y estar activo. Tipos: `ASISTENCIA_DIA_PICO`, `RETARDO`, `FALTA_JUSTIFICADA`, `FALTA_INJUSTIFICADA`, `CAMBIO_SALARIAL`, `CAMBIO_PUESTO`, `PERMISO`, `PRESTAMO`, `OTRO`.

**Qué regresa — `201`:** `{"id":20,"mensaje":"Incidencia registrada; el histórico es inmutable"}`.

### `GET /api/v1/reportes/ausentismo` — Gestión

**Qué llega:** token y fechas obligatorias: `?desde=2026-10-01&hasta=2026-10-31`.

**Qué regresa — `200`:**

```json
{"desde":"2026-10-01","hasta":"2026-10-31","resultados":[{"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","sucursal":"Matriz PADRÓN","puesto":"Parrillero","turnos_programados":12,"faltas":1,"retardos":2,"faltas_fin_semana":1}]}
```

### `GET /api/v1/reportes/rotacion-por-puesto` — Gestión

**Qué llega:** token.

**Qué regresa — `200`:**

```json
[{"puesto_id":2,"puesto":"Parrillero","empleados_historicos":9,"activos":7,"bajas":2,"cambios_de_puesto_registrados":3}]
```

### `GET /api/v1/reportes/retenciones-nomina` — Gestión

**Qué llega:** token y `?semana_inicio=2026-10-05`, que obligatoriamente debe ser lunes.

**Qué regresa — `200`:**

```json
{"semana_inicio":"2026-10-05","total_retenciones_centavos":90000,"retenciones":[{"id":4,"prestamo_id":3,"empleado_id":14,"numero_empleado":"PAD-014","empleado":"Ana López","semana_inicio":"2026-10-05","monto_centavos":30000,"saldo_posterior_centavos":120000}]}
```

---

## 9. Instrucciones para construir la aplicación Electron portable

### Resultado esperado

El equipo debe generar un único ejecutable Windows portable, por ejemplo `Padron-RH-Portable.exe`. Al copiarlo a una USB y abrirlo en otra PC Windows debe arrancar tanto Electron como la API Go, sin instalar Node.js, Go, SQLite ni un servidor de base de datos.

La base de datos debe quedar junto al ejecutable portable, en una carpeta controlada por la aplicación, **no** dentro de `resources` ni dentro del archivo ASAR. Así viaja también al mover la USB.

### Decisiones obligatorias de arquitectura

1. Empaquetar `padron.exe` como recurso adicional de Electron; no reconstruirlo ni depender de Go en el equipo cliente.
2. Electron debe iniciar y detener el proceso Go desde el **proceso principal** (`main`), nunca desde el renderer.
3. El renderer no debe llamar directamente a `http://localhost`. La API actual no publica encabezados CORS. El proceso principal debe hacer las peticiones HTTP y exponer únicamente operaciones permitidas mediante `preload` + `contextBridge` + IPC.
4. Mantener `contextIsolation: true` y `nodeIntegration: false`. No desactivar seguridad web para “resolver” CORS.
5. Usar una sola instancia de Electron. Dos instancias podrían abrir la misma SQLite y generar bloqueos o datos inconsistentes.
6. Antes de distribución pública, solicitar al responsable del backend que restrinja Gin a `127.0.0.1`. La versión actual escucha en todas las interfaces de red del equipo; aunque Electron la consuma localmente, una regla de firewall o ese ajuste evita exposición en la red local.

### Estructura sugerida

```text
proyecto-electron/
  src/main.ts              # inicia API, crea BrowserWindow e IPC
  src/preload.ts           # puente seguro y tipado
  src/renderer/            # UI React/Vue/HTML
  recursos/padron.exe      # copia exacta del ejecutable entregado
  package.json
```

### Configuración de `electron-builder`

Instalar las dependencias de desarrollo en el equipo de desarrollo y configurar el `package.json` del proyecto Electron así (ajustar rutas al proyecto real):

```json
{
  "scripts": {
    "desarrollo": "electron .",
    "empaquetar:portable": "electron-builder --win portable"
  },
  "build": {
    "appId": "mx.padron.rh",
    "productName": "PADRON RH",
    "asar": true,
    "files": ["dist/**/*", "package.json"],
    "extraResources": [
      { "from": "recursos/padron.exe", "to": "backend/padron.exe" }
    ],
    "win": { "target": ["portable"] }
  }
}
```

`extraResources` es importante: deja el binario fuera del ASAR y electron-builder lo coloca bajo la carpeta de recursos, accesible en producción mediante `process.resourcesPath`. El objetivo `portable` genera un ejecutable sin instalador. electron-builder expone `PORTABLE_EXECUTABLE_DIR`, que identifica la carpeta donde está dicho ejecutable portable.

### Inicio del backend desde `main.ts`

El siguiente ejemplo es una base para el equipo; debe integrarse en su estructura TypeScript. Busca un puerto libre, guarda la base junto al portable y no abre la ventana hasta que `/salud` responda:

```ts
import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

let api: ChildProcessWithoutNullStreams | undefined;
let baseApi = '';

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const servidor = createServer();
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address();
      const puerto = typeof direccion === 'object' && direccion ? direccion.port : 0;
      servidor.close(error => error ? reject(error) : resolve(puerto));
    });
  });
}

async function esperarApi(url: string): Promise<void> {
  for (let intento = 0; intento < 40; intento++) {
    try {
      const respuesta = await fetch(`${url}/salud`);
      if (respuesta.ok) return;
    } catch { /* El proceso aún está iniciando. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('La API local PADRÓN no inició a tiempo');
}

async function iniciarApi() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  // En instalación normal usa userData; en portable, conserva datos junto al .exe.
  const raizDatos = portableDir ?? app.getPath('userData');
  const carpetaDatos = path.join(raizDatos, 'PADRON-datos');
  await mkdir(carpetaDatos, { recursive: true });

  const ejecutable = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'padron.exe')
    : path.resolve('recursos', 'padron.exe');
  const puerto = await puertoLibre();
  baseApi = `http://127.0.0.1:${puerto}`;

  api = spawn(ejecutable, [
    '-puerto', String(puerto),
    '-bd', path.join(carpetaDatos, 'padron.db')
  ], {
    windowsHide: true,
    env: { ...process.env }
  });
  api.stderr.on('data', datos => console.error('[PADRON API]', String(datos)));
  await esperarApi(baseApi);
}

const instanciaPrincipal = app.requestSingleInstanceLock();
if (!instanciaPrincipal) {
  app.quit();
} else app.whenReady().then(async () => {
  await iniciarApi();
  const ventana = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await ventana.loadFile(path.join(__dirname, '../renderer/index.html'));
});

app.on('before-quit', () => { if (api && !api.killed) api.kill(); });
```

No usar un puerto fijo como 8080 en producción, porque podría estar ocupado. No guardar `padron.db` dentro de `process.resourcesPath`: esa ubicación puede ser de solo lectura o temporal según el modo de empaquetado.

### Puente seguro para la UI

Crear operaciones concretas por IPC; no exponer `ipcRenderer`, `spawn`, rutas del sistema, ni una función arbitraria que acepte cualquier URL.

```ts
// src/main.ts
import { ipcMain } from 'electron';

ipcMain.handle('sesion:iniciar', async (_evento, datos) => {
  const respuesta = await fetch(`${baseApi}/api/v1/autenticacion/iniciar-sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const json = await respuesta.json();
  if (!respuesta.ok) throw new Error(json.error ?? 'No fue posible iniciar sesión');
  return json;
});
```

```ts
// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('padron', {
  iniciarSesion: (usuario: string, contrasena: string) =>
    ipcRenderer.invoke('sesion:iniciar', { usuario, contrasena })
  // Agregar un método específico para cada caso de uso de la UI.
});
```

La UI conserva el token recibido solo mientras está abierta y lo entrega al método IPC correspondiente. El proceso principal agrega el encabezado `Authorization` al llamar al backend. Los errores deben propagarse con el texto de `json.error`.

### Checklist de entrega para Electron

- [ ] Incluir la misma versión probada de `padron.exe` mediante `extraResources`.
- [ ] Arrancar API, esperar `/salud`, y solo entonces habilitar login.
- [ ] Cerrar el proceso hijo al salir de Electron; no matar procesos por nombre ni puerto.
- [ ] Implementar una única instancia de aplicación.
- [ ] Para portable, guardar `PADRON-datos/padron.db` junto a `PORTABLE_EXECUTABLE_DIR`; para instalable usar `app.getPath('userData')`.
- [ ] Incluir una acción de copia de seguridad que copie la base **solo cuando la app esté cerrada** o después de detener la API.
- [ ] No mostrar ni registrar contraseñas o tokens; cambiar la contraseña inicial antes de operación real.
- [ ] Probar el artefacto final desde una USB en una computadora sin Node, Go ni SQLite instalados.
- [ ] Probar que un puerto ocupado no impide iniciar, que un directorio USB sin permisos presenta error claro, y que la base persiste al volver a abrir.
- [ ] Firmar el ejecutable de distribución si se contará con certificado; reduce alertas de Windows SmartScreen, pero no cambia la lógica funcional.

## 10. Fuentes de la estrategia de empaquetado

- [electron-builder: recursos adicionales y binarios externos](https://www.electron.build/docs/contents/)
- [electron-builder: destino portable para Windows](https://www.electron.build/nsis/)
- [Electron: `process.resourcesPath`](https://www.electronjs.org/docs/latest/api/process)
- [Electron: aislamiento de contexto y `contextBridge`](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
