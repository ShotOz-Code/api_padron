/**
 * Cliente HTTP completo para PADRÓN — Recursos Humanos y Operación.
 * Se conecta automáticamente al backend embebido en Electron mediante el puente IPC,
 * o a través del proxy de desarrollo / variable de entorno.
 */

export type Rol = 'RH_ADMIN' | 'ENCARGADO' | 'OPERATIVO';

export interface Credenciales {
  usuario: string;
  contrasena: string;
}

export interface Sesion {
  token: string;
  tipo: 'Bearer';
  expira_en_minutos: number;
  rol: Rol;
  usuario_id: number;
  empleado_id: number | null;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  activo: boolean;
  creado_en: string;
}

export interface Puesto {
  id: number;
  nombre: string;
  descripcion: string;
  es_critico: boolean;
  requiere_suplente: boolean;
  factor_propina: number;
  activo: boolean;
  jefe_puesto_id?: number | null;
  jefe_puesto?: string | null;
  num_empleados?: number;
  num_vacantes?: number;
}

export interface Vacante {
  id: number;
  codigo: string;
  titulo: string;
  puesto_id: number;
  puesto: string;
  sucursal_id: number;
  sucursal: string;
  empleado_id: number | null;
  empleado: string | null;
  estado: 'DISPONIBLE' | 'CUBIERTA' | 'PAUSADA' | 'CANCELADA';
  sueldo_ofertado_centavos: number;
  requisitos: string;
  creado_en: string;
  cubierta_en?: string | null;
}

export interface Empleado {
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
  jefe_puesto?: string;
  nombre_usuario?: string;
  vacante_id?: number | null;
  vacante_codigo?: string;
  vacante_titulo?: string;
  activo: 0 | 1;
}

export interface KardexEmpleado {
  empleado: Empleado;
  estadisticas: {
    dias_antiguedad: number;
    saldo_prestamos_centavos: number;
    total_prestamos_activos: number;
    total_incidencias: number;
    total_permisos: number;
  };
  incidencias: Array<{
    id: number;
    tipo: string;
    descripcion: string;
    fecha_evento: string;
    creado_en: string;
  }>;
  permisos: Array<{
    id: number;
    tipo: string;
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
    estado: string;
    requiere_cobertura: boolean;
    observacion_dictamen?: string;
    suplente?: string;
    creado_en: string;
  }>;
  prestamos: Array<{
    id: number;
    monto_original_centavos: number;
    saldo_centavos: number;
    descuento_semanal_centavos: number;
    numero_semanas: number;
    motivo: string;
    estado: string;
    observacion_dictamen?: string;
    creado_en: string;
    aprobado_en?: string;
  }>;
}

export interface CrearEmpleado {
  numero_empleado: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  curp?: string;
  correo?: string;
  telefono?: string;
  fecha_ingreso: string;
  sueldo_semanal_centavos: number;
  sucursal_id: number;
  puesto_id: number;
  vacante_id?: number;
  usuario?: string;
  contrasena?: string;
  rol?: Rol;
}

export interface ActualizarEmpleado {
  sucursal_id?: number;
  puesto_id?: number;
  vacante_id?: number;
  sueldo_semanal_centavos?: number;
  correo?: string;
  telefono?: string;
  activo?: boolean;
}

export interface Usuario {
  id: number;
  empleado_id: number | null;
  numero_empleado: string;
  empleado: string;
  usuario: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
}

export interface PerfilRespuesta {
  usuario_id: number;
  rol: Rol;
  empleado: Empleado | null;
}

export interface Turno {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'PROGRAMADO' | 'TRABAJADO' | 'FALTA' | 'RETARDO' | 'CANCELADO';
  horas_trabajadas: number;
  notas: string;
}

export interface SolicitudPermiso {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  tipo: 'VACACIONES' | 'ENFERMEDAD' | 'DESCANSO' | 'PERMISO_EXTRAORDINARIO';
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: 'PENDIENTE_SUPLENTE' | 'PENDIENTE_APROBACION' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
  requiere_cobertura: boolean;
  cobertura: {
    id: number;
    nombre: string;
    estado: string;
  } | null;
  observacion_dictamen: string;
  creado_en: string;
}

export interface Prestamo {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  monto_original_centavos: number;
  saldo_centavos: number;
  descuento_semanal_centavos: number;
  numero_semanas: number;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'LIQUIDADO' | 'CANCELADO';
  observacion_dictamen: string;
  creado_en: string;
  aprobado_en: string;
}

export interface BolsaPropinas {
  id: number;
  sucursal_id: number;
  sucursal: string;
  fecha: string;
  monto_centavos: number;
  estado: 'ABIERTA' | 'CALCULADA' | 'CERRADA';
  asignaciones: number;
  creado_en: string;
}

export interface PropinaPropia {
  id: number;
  bolsa_id: number;
  fecha: string;
  sucursal: string;
  horas_ponderadas: number;
  monto_centavos: number;
}

export interface IncidenciaHistorica {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  tipo: string;
  descripcion: string;
  fecha_evento: string;
  creado_en: string;
}

export interface BuzonItem {
  id: number;
  anonimo: boolean;
  autor: {
    id: number;
    numero_empleado: string;
    nombre: string;
  } | null;
  tipo: 'SUGERENCIA' | 'QUEJA' | 'INCIDENTE_MANTENIMIENTO' | 'SEGURIDAD' | 'CLIMA_LABORAL';
  asunto: string;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: 'RECIBIDO' | 'EN_REVISION' | 'ATENDIDO' | 'CERRADO';
  respuesta: string;
  creado_en: string;
  atendido_en: string;
}

export interface ReporteAusentismoItem {
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  sucursal: string;
  puesto: string;
  turnos_programados: number;
  faltas: number;
  retardos: number;
  faltas_fin_semana: number;
}

export interface ReporteAusentismo {
  desde: string;
  hasta: string;
  resultados: ReporteAusentismoItem[];
}

export interface ReporteRotacionItem {
  puesto_id: number;
  puesto: string;
  empleados_historicos: number;
  activos: number;
  bajas: number;
  cambios_de_puesto_registrados: number;
}

export interface ReporteRetencionItem {
  id: number;
  prestamo_id: number;
  empleado_id: number;
  numero_empleado: string;
  empleado: string;
  semana_inicio: string;
  monto_centavos: number;
  saldo_posterior_centavos: number;
}

export class ErrorAPI extends Error {
  constructor(
    message: string,
    public readonly estado: number,
  ) {
    super(message);
    this.name = 'ErrorAPI';
  }
}

const TOKEN_KEY = 'padron.token';
const ROL_KEY = 'padron.rol';
const USUARIO_KEY = 'padron.usuario';

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined' && (window as any).padron?.getApiUrl) {
    const api = (window as any).padron.getApiUrl();
    if (api) return api.replace(/\/$/, '');
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  return '/api/v1';
}

export function getRawServerUrl(): string {
  if (typeof window !== 'undefined' && (window as any).padron?.getBaseUrl) {
    const base = (window as any).padron.getBaseUrl();
    if (base) return base.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8080';
}

export function guardarSesion(sesion: Sesion, usuario = ''): void {
  sessionStorage.setItem(TOKEN_KEY, sesion.token);
  sessionStorage.setItem(ROL_KEY, sesion.rol);
  if (usuario) {
    sessionStorage.setItem(USUARIO_KEY, usuario);
  }
}

export function obtenerToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function obtenerRol(): Rol | null {
  return sessionStorage.getItem(ROL_KEY) as Rol | null;
}

export function obtenerNombreUsuario(): string {
  return sessionStorage.getItem(USUARIO_KEY) || 'admin';
}

export function estaAutenticado(): boolean {
  return Boolean(obtenerToken());
}

export function cerrarSesion(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROL_KEY);
  sessionStorage.removeItem(USUARIO_KEY);
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  if (respuesta.status === 204) return undefined;
  return respuesta.json().catch(() => undefined);
}

async function fetchAPI<T>(
  endpoint: string,
  opciones: RequestInit = {},
  incluirToken = true,
): Promise<T> {
  const { headers: encabezadosOpcionales, ...restoOpciones } = opciones;
  const encabezados = new Headers(encabezadosOpcionales);
  encabezados.set('Content-Type', 'application/json');

  const token = obtenerToken();
  if (incluirToken && token) {
    encabezados.set('Authorization', `Bearer ${token}`);
  }

  const baseUrl = getBaseApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      ...restoOpciones,
      headers: encabezados,
    });
  } catch (err: any) {
    throw new ErrorAPI(`No se pudo conectar al servidor: ${err.message}`, 0);
  }

  const cuerpo = (await leerCuerpo(respuesta)) as { error?: string } | undefined;

  if (!respuesta.ok) {
    throw new ErrorAPI(cuerpo?.error ?? `Error HTTP ${respuesta.status}`, respuesta.status);
  }

  return cuerpo as T;
}

// ---------------- Servicios ----------------

export const SaludService = {
  async verificar(): Promise<{ estado: string; servicio: string; hora: string }> {
    const rawUrl = getRawServerUrl();
    const res = await fetch(`${rawUrl}/salud`);
    if (!res.ok) throw new Error('API no responde en /salud');
    return res.json();
  },
};

export const AutenticacionService = {
  async iniciarSesion(credenciales: Credenciales): Promise<Sesion> {
    const sesion = await fetchAPI<Sesion>(
      '/autenticacion/iniciar-sesion',
      { method: 'POST', body: JSON.stringify(credenciales) },
      false,
    );
    guardarSesion(sesion, credenciales.usuario);
    return sesion;
  },
  guardarSesion,
  obtenerToken,
  obtenerRol,
  estaAutenticado,
  cerrarSesion,
};

export const PerfilService = {
  obtenerPerfil: () => fetchAPI<PerfilRespuesta>('/mi-perfil'),
  cambiarContrasena: (datos: { contrasena_actual: string; contrasena_nueva: string }) =>
    fetchAPI<{ mensaje: string }>('/mi-perfil/cambiar-contrasena', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
};

export const CatalogosService = {
  obtenerSucursales: () => fetchAPI<Sucursal[]>('/catalogos/sucursales'),
  crearSucursal: (datos: { nombre: string; direccion: string; telefono?: string; activo?: boolean }) =>
    fetchAPI<{ id: number; mensaje: string }>('/sucursales', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizarSucursal: (id: number, datos: Partial<Sucursal>) =>
    fetchAPI<{ mensaje: string }>(`/sucursales/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),

  obtenerPuestos: () => fetchAPI<Puesto[]>('/catalogos/puestos'),
  crearPuesto: (datos: {
    nombre: string;
    descripcion?: string;
    es_critico?: boolean;
    requiere_suplente?: boolean;
    factor_propina: number;
  }) =>
    fetchAPI<{ id: number; mensaje: string }>('/puestos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizarPuesto: (id: number, datos: Partial<Puesto>) =>
    fetchAPI<{ mensaje: string }>(`/puestos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};

export const UsuariosService = {
  obtenerUsuarios: () => fetchAPI<Usuario[]>('/usuarios'),
  crearUsuario: (datos: { empleado_id: number; usuario: string; contrasena: string; rol: Rol }) =>
    fetchAPI<{ id: number; mensaje: string }>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizarUsuario: (id: number, datos: { usuario?: string; contrasena?: string; rol?: Rol; activo?: boolean }) =>
    fetchAPI<{ mensaje: string }>(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};

export const EmpleadosService = {
  obtenerTodos: (filtros?: { sucursal_id?: number; puesto_id?: number; activo?: boolean }) => {
    const parametros = new URLSearchParams();
    if (filtros?.sucursal_id) parametros.set('sucursal_id', String(filtros.sucursal_id));
    if (filtros?.puesto_id) parametros.set('puesto_id', String(filtros.puesto_id));
    if (filtros?.activo !== undefined) parametros.set('activo', String(filtros.activo));
    const consulta = parametros.size > 0 ? `?${parametros}` : '';
    return fetchAPI<Empleado[]>(`/empleados${consulta}`);
  },
  obtenerPorId: (id: number) => fetchAPI<Empleado>(`/empleados/${id}`),
  crear: (datos: CrearEmpleado) =>
    fetchAPI<{ id: number; usuario_id: number | null; mensaje: string }>('/empleados', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id: number, datos: ActualizarEmpleado) =>
    fetchAPI<{ mensaje: string }>(`/empleados/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
  darDeBaja: (id: number) =>
    fetchAPI<{ mensaje: string }>(`/empleados/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: false }),
    }),
  reactivar: (id: number) =>
    fetchAPI<{ mensaje: string }>(`/empleados/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: true }),
    }),
  obtenerKardex: (id: number) => fetchAPI<KardexEmpleado>(`/empleados/${id}/kardex`),
};

export const VacantesService = {
  obtenerTodas: (filtros?: { sucursal_id?: number; puesto_id?: number; estado?: string }) => {
    const params = new URLSearchParams();
    if (filtros?.sucursal_id) params.set('sucursal_id', String(filtros.sucursal_id));
    if (filtros?.puesto_id) params.set('puesto_id', String(filtros.puesto_id));
    if (filtros?.estado) params.set('estado', filtros.estado);
    const q = params.size > 0 ? `?${params}` : '';
    return fetchAPI<Vacante[]>(`/vacantes${q}`);
  },
  crear: (datos: {
    codigo: string;
    titulo: string;
    puesto_id: number;
    sucursal_id: number;
    sueldo_ofertado_centavos: number;
    requisitos?: string;
  }) =>
    fetchAPI<{ id: number; mensaje: string }>('/vacantes', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id: number, datos: Partial<Vacante>) =>
    fetchAPI<{ mensaje: string }>(`/vacantes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
  asignar: (vacante_id: number, empleado_id: number) =>
    fetchAPI<{ mensaje: string }>(`/vacantes/${vacante_id}/asignar`, {
      method: 'POST',
      body: JSON.stringify({ empleado_id }),
    }),
  liberar: (vacante_id: number) =>
    fetchAPI<{ mensaje: string }>(`/vacantes/${vacante_id}/liberar`, {
      method: 'POST',
    }),
};

export const TurnosService = {
  obtenerMios: (desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const q = params.size > 0 ? `?${params}` : '';
    return fetchAPI<Turno[]>(`/turnos/mios${q}`);
  },
  obtenerTodos: (desde: string, hasta: string, empleado_id?: number) => {
    const params = new URLSearchParams({ desde, hasta });
    if (empleado_id) params.set('empleado_id', String(empleado_id));
    return fetchAPI<Turno[]>(`/turnos?${params}`);
  },
  crear: (datos: {
    empleado_id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    estado?: string;
    horas_trabajadas?: number;
    notas?: string;
  }) =>
    fetchAPI<{ id: number; mensaje: string }>('/turnos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  actualizar: (id: number, datos: { estado?: string; horas_trabajadas?: number; notas?: string }) =>
    fetchAPI<{ mensaje: string }>(`/turnos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};

export const PermisosService = {
  obtenerMios: () => fetchAPI<SolicitudPermiso[]>('/solicitudes-permisos/mias'),
  obtenerTodos: (estado?: string) => {
    const q = estado ? `?estado=${estado}` : '';
    return fetchAPI<SolicitudPermiso[]>(`/solicitudes-permisos${q}`);
  },
  crear: (datos: {
    empleado_id?: number;
    tipo: 'VACACIONES' | 'ENFERMEDAD' | 'DESCANSO' | 'PERMISO_EXTRAORDINARIO';
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
    suplente_id?: number;
  }) =>
    fetchAPI<{ id: number; estado: string; requiere_cobertura: boolean; mensaje: string }>(
      '/solicitudes-permisos',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      },
    ),
  aprobar: (id: number, observacion?: string) =>
    fetchAPI<{ mensaje: string; estado: string }>(`/solicitudes-permisos/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ observacion: observacion || '' }),
    }),
  rechazar: (id: number, observacion: string) =>
    fetchAPI<{ mensaje: string; estado: string }>(`/solicitudes-permisos/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ observacion }),
    }),
  cancelar: (id: number) =>
    fetchAPI<{ mensaje: string }>(`/solicitudes-permisos/${id}/cancelar`, {
      method: 'POST',
    }),
  confirmarCobertura: (id: number, datos: { aceptar: boolean; comentario?: string }) =>
    fetchAPI<{ estado_cobertura: string; estado_solicitud: string }>(
      `/solicitudes-permisos/${id}/cobertura/confirmar`,
      {
        method: 'POST',
        body: JSON.stringify(datos),
      },
    ),
};

export const PrestamosService = {
  obtenerMios: () => fetchAPI<Prestamo[]>('/prestamos/mios'),
  obtenerTodos: (estado?: string) => {
    const q = estado ? `?estado=${estado}` : '';
    return fetchAPI<Prestamo[]>(`/prestamos${q}`);
  },
  solicitar: (datos: {
    empleado_id?: number;
    monto_centavos: number;
    numero_semanas: number;
    motivo: string;
  }) =>
    fetchAPI<{ id: number; descuento_semanal_centavos: number; mensaje: string }>('/prestamos', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  aprobar: (id: number, observacion?: string) =>
    fetchAPI<{ estado: string; mensaje: string }>(`/prestamos/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ observacion: observacion || '' }),
    }),
  rechazar: (id: number, observacion: string) =>
    fetchAPI<{ estado: string; mensaje: string }>(`/prestamos/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ observacion }),
    }),
  registrarRetencion: (id: number, datos: { semana_inicio: string; monto_centavos?: number }) =>
    fetchAPI<{ monto_centavos: number; saldo_centavos: number; estado: string }>(
      `/prestamos/${id}/registrar-retencion`,
      {
        method: 'POST',
        body: JSON.stringify(datos),
      },
    ),
};

export const PropinasService = {
  obtenerMias: () => fetchAPI<PropinaPropia[]>('/propinas/mias'),
  obtenerBolsas: (fecha?: string) => {
    const q = fecha ? `?fecha=${fecha}` : '';
    return fetchAPI<BolsaPropinas[]>(`/propinas/bolsas${q}`);
  },
  crearBolsa: (datos: { sucursal_id: number; fecha: string; monto_centavos: number }) =>
    fetchAPI<{ id: number; mensaje: string }>('/propinas/bolsas', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  calcularAsignaciones: (id: number) =>
    fetchAPI<{ mensaje: string; participantes: number; monto_distribuido_centavos: number }>(
      `/propinas/bolsas/${id}/calcular-asignaciones`,
      { method: 'POST' },
    ),
};

export const IncidenciasService = {
  obtenerHistorico: (empleado_id?: number) => {
    const q = empleado_id ? `?empleado_id=${empleado_id}` : '';
    return fetchAPI<IncidenciaHistorica[]>(`/historico-incidencias${q}`);
  },
  obtenerTodos: (empleado_id?: number) => {
    const q = empleado_id ? `?empleado_id=${empleado_id}` : '';
    return fetchAPI<IncidenciaHistorica[]>(`/historico-incidencias${q}`);
  },
  crear: (datos: {
    empleado_id: number;
    tipo: string;
    descripcion: string;
    fecha_evento: string;
  }) =>
    fetchAPI<{ id: number; mensaje: string }>('/historico-incidencias', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  crearManual: (datos: {
    empleado_id: number;
    tipo: string;
    descripcion: string;
    fecha_evento: string;
  }) =>
    fetchAPI<{ id: number; mensaje: string }>('/historico-incidencias', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
};

export const BuzonService = {
  obtenerMios: () => fetchAPI<BuzonItem[]>('/buzon-sugerencias/mios'),
  obtenerTodos: (estado?: string) => {
    const q = estado ? `?estado=${estado}` : '';
    return fetchAPI<BuzonItem[]>(`/buzon-sugerencias${q}`);
  },
  enviar: (datos: {
    anonimo?: boolean;
    tipo: 'SUGERENCIA' | 'QUEJA' | 'INCIDENTE_MANTENIMIENTO' | 'SEGURIDAD' | 'CLIMA_LABORAL';
    asunto: string;
    descripcion: string;
    prioridad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  }) =>
    fetchAPI<{ id: number; anonimo: boolean; mensaje: string }>('/buzon-sugerencias', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
  atender: (id: number, datos: { estado: 'EN_REVISION' | 'ATENDIDO' | 'CERRADO'; respuesta?: string }) =>
    fetchAPI<{ mensaje: string }>(`/buzon-sugerencias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    }),
};

export const ReportesService = {
  obtenerAusentismo: (desde: string, hasta: string) =>
    fetchAPI<ReporteAusentismo>(`/reportes/ausentismo?desde=${desde}&hasta=${hasta}`),
  ausentismo: (desde: string, hasta: string) =>
    fetchAPI<ReporteAusentismo>(`/reportes/ausentismo?desde=${desde}&hasta=${hasta}`),
  obtenerRotacionPorPuesto: () =>
    fetchAPI<ReporteRotacionItem[]>('/reportes/rotacion-por-puesto'),
  rotacionPorPuesto: () =>
    fetchAPI<ReporteRotacionItem[]>('/reportes/rotacion-por-puesto'),
  obtenerRetencionesNomina: (semanaInicio: string) =>
    fetchAPI<ReporteRetencionItem[]>(`/reportes/retenciones-nomina?semana_inicio=${semanaInicio}`),
  retencionesNomina: (semanaInicio: string) =>
    fetchAPI<ReporteRetencionItem[]>(`/reportes/retenciones-nomina?semana_inicio=${semanaInicio}`),
};
