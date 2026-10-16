# PADRÓN — Sistema Integral de Recursos Humanos y Operación

Plataforma de escritorio y API REST en español desarrollada para **Carnitas y Carne Asada PADRÓN**. Administra la estructura organizacional, sucursales, árbol jerárquico de puestos, vacantes (plazas), plantilla de personal, Kardex de colaborador, estaciones críticas, turnos, permisos con suplencia, préstamos con retención nominal, propinas ponderadas, buzón interno, bitácora inmutable de incidencias y reportes ejecutivos.

Construido con una arquitectura autónoma de **Go (Gin) + SQLite embebido + React 19 + TypeScript + Tailwind CSS + Electron**.

---

## Documentación del Proyecto

| Documento | Descripción |
| :--- | :--- |
| **[`README.md`](README.md)** | Guía rápida de inicio, referencia de endpoints, comandos de compilación y empaquetado. |
| **[`DOCUMENTACION_FRONTEND.md`](DOCUMENTACION_FRONTEND.md)** | Documentación técnica del Frontend (arquitectura React, componentes, diseño UI, servicios API y contrato de integración Electron). |
| **[`MANUAL_TECNICO_Y_FLUJO.md`](MANUAL_TECNICO_Y_FLUJO.md)** | Manual Técnico integral del sistema (arquitectura, base de datos, seguridad, reglas de negocio) y **Flujo Normal de Operación** paso a paso. |
| **[`frontend/README.md`](frontend/README.md)** | Guía específica del paquete de interfaz gráfica y empaquetador Electron. |

---

## Ejecución y Empaquetado (Aplicación Completa de Escritorio)

El sistema cuenta con dos modalidades de distribución listas para ejecutarse en cualquier equipo Windows **sin necesidad de instalar Go, Node.js, SQLite ni servidores externos** (ubicadas en `frontend/dist/` tras empaquetar):

1. **Ejecutable Portable (`PADRON RH Portable.exe`):**
   - Un único archivo `.exe` autónomo.
   - Al ejecutarse por primera vez en una computadora limpia o memoria USB, crea automáticamente la carpeta `PADRON-datos/padron.db` **en el mismo directorio donde se encuentre el `.exe`**, copiando la base de datos semilla o inicializando las tablas y catálogos base.
2. **Instalador de Windows (`PADRON RH Setup 1.0.0.exe`):**
   - Asistente de instalación NSIS con accesos directos e ícono institucional de PADRÓN.
   - Almacena la base de datos en `%APPDATA%\PADRON RH\PADRON-datos\padron.db`, garantizando persistencia entre actualizaciones.

### Credenciales Iniciales por Defecto
- **Usuario:** `admin`
- **Contraseña:** `Cambiar123!`
- **Rol:** `RH_ADMIN`

---

## Comandos de Desarrollo y Compilación

Desde la raíz del proyecto (`c:\Users\Sistemas\Desktop\humanPadron`):

```powershell
# 1. Ejecutar pruebas automatizadas del backend (Go)
npm test
# o directamente: go test -v ./...

# 2. Compilar el binario optimizado del backend
npm run build:backend

# 3. Compilar el frontend (TypeScript + Vite)
npm run build:frontend

# 4. Compilar ambos (Backend + Frontend)
npm run build

# 5. Iniciar en modo desarrollo (Vite + Electron simultáneamente)
npm run dev

# 6. Generar ejecutables finales (.exe Portable + Instalador NSIS)
npm run package
```

### Ejecución Independiente solo de la API (`padron.exe`)
Si deseas levantar únicamente el servidor HTTP local sin interfaz gráfica:

```powershell
.\entregable\padron.exe
# Escucha por defecto en http://localhost:8080
```
Opciones por línea de comandos:
- `-puerto 8090`: Define el puerto de escucha.
- `-bd D:\datos\padron.db`: Define la ruta del archivo SQLite (también configurable vía variable de entorno `PADRON_BD`).
- Variable `PADRON_SECRETO`: Define la semilla de firma HMAC para que los tokens sobrevivan reinicios del proceso.

> **Convención Monetaria:** Todas las cantidades monetarias en la API se manejan en **centavos enteros** para evitar errores de coma flotante (por ejemplo, `$1,250.50` se transmite como `125050`).

---

## Mapa Completo de Endpoints REST

**URL Base:** `http://127.0.0.1:<puerto>`
- **Público:** Sin autenticación.
- **Sesión:** Cualquier usuario autenticado (`OPERATIVO`, `ENCARGADO`, `RH_ADMIN`).
- **Gestión:** Roles de supervisión y administración (`RH_ADMIN` y `ENCARGADO`).
- **RH:** Exclusivo para `RH_ADMIN`.

| Método | Ruta | Acceso | Función |
| :--- | :--- | :--- | :--- |
| `GET` | `/salud` | Público | Estado de salud del servidor y marca de tiempo |
| `POST` | `/api/v1/autenticacion/iniciar-sesion` | Público | Autentica credenciales y emite token Bearer |
| `GET` | `/api/v1/mi-perfil` | Sesión | Obtiene perfil, rol, puesto, sucursal y jefe directo |
| `POST` | `/api/v1/mi-perfil/cambiar-contrasena` | Sesión | Actualiza la contraseña del usuario actual |
| `GET` | `/api/v1/catalogos/sucursales` | Sesión | Lista sucursales registradas |
| `POST` | `/api/v1/sucursales` | RH | Da de alta una nueva sucursal |
| `PATCH` | `/api/v1/sucursales/:id` | RH | Modifica datos o estatus activo de una sucursal |
| `GET` | `/api/v1/catalogos/puestos` | Sesión | Lista puestos con criticidad, jefe jerárquico, empleados y vacantes |
| `POST` | `/api/v1/puestos` | RH | Crea un puesto dentro del árbol organizacional |
| `PATCH` | `/api/v1/puestos/:id` | RH | Actualiza puesto, criticidad, factor de propina o `jefe_puesto_id` |
| `GET` | `/api/v1/vacantes` | Gestión | Lista vacantes/plazas; filtros `sucursal_id`, `puesto_id`, `estado` |
| `POST` | `/api/v1/vacantes` | RH | Crea una nueva plaza/vacante operativa |
| `PATCH` | `/api/v1/vacantes/:id` | RH | Modifica título, requisitos, sueldo ofertado o estado de vacante |
| `POST` | `/api/v1/vacantes/:id/asignar` | RH | Asigna una vacante a un empleado y la marca `CUBIERTA` |
| `POST` | `/api/v1/vacantes/:id/liberar` | RH | Libera la plaza dejándola nuevamente `DISPONIBLE` |
| `GET` | `/api/v1/empleados` | Gestión | Lista plantilla; filtros `sucursal_id`, `puesto_id`, `activo` |
| `GET` | `/api/v1/empleados/:id` | Gestión | Obtiene el detalle de un colaborador |
| `GET` | `/api/v1/empleados/:id/kardex` | Gestión | Obtiene el **Kardex integral** (expediente, antigüedad, saldos e históricos) |
| `POST` | `/api/v1/empleados` | Gestión | Alta de empleado (con asignación opcional de vacante y usuario) |
| `PATCH` | `/api/v1/empleados/:id` | Gestión | Actualiza campos editables (protege nombre, CURP, nómina, ingreso y usuario) |
| `GET` | `/api/v1/usuarios` | RH | Lista cuentas de usuario sin exponer hashes de contraseña |
| `POST` | `/api/v1/usuarios` | RH | Crea cuenta de acceso para un colaborador existente |
| `PATCH` | `/api/v1/usuarios/:id` | RH | Modifica rol, contraseña o estado activo de una cuenta |
| `GET` | `/api/v1/turnos/mios` | Sesión | Consulta turnos propios (`desde`, `hasta`) |
| `GET` | `/api/v1/turnos` | Gestión | Consulta turnos generales (`desde`, `hasta`, `empleado_id`) |
| `POST` | `/api/v1/turnos` | Gestión | Programa turno o registra asistencia/falta/retardo |
| `PATCH` | `/api/v1/turnos/:id` | Gestión | Actualiza estado de asistencia, horas trabajadas o notas |
| `GET` | `/api/v1/solicitudes-permisos/mias` | Sesión | Lista solicitudes de ausencia del propio colaborador |
| `POST` | `/api/v1/solicitudes-permisos` | Sesión | Registra solicitud de vacaciones, descanso, enfermedad o permiso |
| `POST` | `/api/v1/solicitudes-permisos/:id/cancelar` | Dueño/Gestión | Cancela una solicitud pendiente |
| `POST` | `/api/v1/solicitudes-permisos/:id/cobertura/confirmar` | Suplente | El suplente acepta o rechaza cubrir el turno crítico |
| `GET` | `/api/v1/solicitudes-permisos` | Gestión | Bandeja general de solicitudes; filtro `estado` |
| `POST` | `/api/v1/solicitudes-permisos/:id/aprobar` | Gestión | Dictamen favorable por jefe directo / encargado |
| `POST` | `/api/v1/solicitudes-permisos/:id/rechazar` | Gestión | Rechaza solicitud con observación obligatoria |
| `GET` | `/api/v1/prestamos/mios` | Sesión | Lista préstamos y saldos propios |
| `POST` | `/api/v1/prestamos` | Sesión | Solicita préstamo o adelanto de nómina |
| `GET` | `/api/v1/prestamos` | Gestión | Lista préstamos de toda la plantilla; filtro `estado` |
| `POST` | `/api/v1/prestamos/:id/aprobar` | Gestión | Autoriza préstamo validando topes de descuento |
| `POST` | `/api/v1/prestamos/:id/rechazar` | Gestión | Rechaza préstamo con motivo |
| `POST` | `/api/v1/prestamos/:id/registrar-retencion` | Gestión | Aplica descuento semanal en nómina (lunes) |
| `GET` | `/api/v1/propinas/mias` | Sesión | Consulta asignaciones de propina propias |
| `POST` | `/api/v1/propinas/bolsas` | Gestión | Abre una bolsa diaria de propinas por sucursal |
| `GET` | `/api/v1/propinas/bolsas` | Gestión | Lista bolsas de propinas; filtro `fecha` |
| `POST` | `/api/v1/propinas/bolsas/:id/calcular-asignaciones` | Gestión | Distribuye propinas por `horas_trabajadas × factor_propina` |
| `POST` | `/api/v1/buzon-sugerencias` | Sesión | Envía reporte, queja o sugerencia (directo o anónimo) |
| `GET` | `/api/v1/buzon-sugerencias/mios` | Sesión | Lista reportes no anónimos enviados por el empleado |
| `GET` | `/api/v1/buzon-sugerencias` | Gestión | Bandeja administrativa del buzón; filtro `estado` |
| `PATCH` | `/api/v1/buzon-sugerencias/:id` | Gestión | Cambia estado (`EN_REVISION`, `ATENDIDO`, `CERRADO`) y responde |
| `GET` | `/api/v1/historico-incidencias` | Gestión | Consulta la bitácora inmutable; filtro `empleado_id` |
| `POST` | `/api/v1/historico-incidencias` | Gestión | Registra incidencia manual en el expediente |
| `GET` | `/api/v1/reportes/ausentismo` | Gestión | Indicadores de faltas, retardos y ausencias en fin de semana |
| `GET` | `/api/v1/reportes/rotacion-por-puesto` | Gestión | Estadística de plantilla activa, bajas y cambios por puesto |
| `GET` | `/api/v1/reportes/retenciones-nomina` | Gestión | Corte semanal de descuentos de préstamos por lunes de nómina |

---

## Reglas de Negocio Principales

1. **Inmutabilidad de Identidad en el Kardex:** Una vez dado de alta un trabajador, su **Nombre Completo, CURP, Número de Nómina (`numero_empleado`), Fecha de Ingreso y Usuario de Acceso** quedan bloqueados contra edición. Solo se permite actualizar sucursal, puesto, vacante asignada, sueldo semanal, teléfono, correo y estatus activo.
2. **Jerarquía de Puestos y Vacantes:** Los puestos se estructuran en un árbol jerárquico (`jefe_puesto_id`). Las vacantes vinculan un puesto y una sucursal con un estado controlado (`DISPONIBLE`, `CUBIERTA`, `PAUSADA`, `CANCELADA`).
3. **Separación Operativa de Autorizaciones:** Recursos Humanos (`RH_ADMIN`) administra el padrón, catálogos, vacantes y Kardex, mientras que los jefes directos / encargados (`ENCARGADO`) dictaminan solicitudes operativas y permisos.
4. **Cobertura Obligatoria en Estaciones Críticas:** Si un puesto es crítico y requiere suplente (ej. *Maestro Carnitero*, *Parrillero*), cualquier permiso que toque sábado o domingo exige un suplente activo del mismo puesto y sucursal que acepte previamente la cobertura (`PENDIENTE_SUPLENTE` -> `PENDIENTE_APROBACION`).
5. **Límites Financieros en Préstamos:** Ningún préstamo puede exceder 2 sueldos semanales, su abono semanal no puede rebasar el 35% del salario del trabajador, y la suma de descuentos activos acumulados no puede superar el 40% al momento de aprobar.
6. **Reparto Exacto de Propinas:** La distribución pondera las horas trabajadas en turnos con estado `TRABAJADO` por el `factor_propina` del puesto, asignando el centavo residual para que la suma repartida cuadre exactamente con el monto de la bolsa.
7. **Bitácora Inmutable:** La tabla `historico_incidencias` está protegida con triggers SQLite (`BEFORE UPDATE` y `BEFORE DELETE`) que impiden cualquier alteración o borrado de registros históricos.
