import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  PermisosService,
  EmpleadosService,
  CatalogosService,
  PerfilService,
  obtenerRol,
  type SolicitudPermiso,
  type Empleado,
  type Puesto,
  type Rol,
  estaAutenticado,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconCalendar, IconPlus, IconX, IconCheck, IconAlertTriangle } from '../components/ui/Icons';

const TIPOS = ['VACACIONES', 'ENFERMEDAD', 'DESCANSO', 'PERMISO_EXTRAORDINARIO'] as const;

function tocaFinDeSemana(inicioStr: string, finStr: string): boolean {
  if (!inicioStr || !finStr) return false;
  const dInicio = new Date(inicioStr + 'T00:00:00');
  const dFin = new Date(finStr + 'T00:00:00');
  for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay();
    if (dia === 0 || dia === 6) return true;
  }
  return false;
}

export default function Permisos() {
  const navigate = useNavigate();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const esRH = rol === 'RH_ADMIN';
  const esJefe = rol === 'ENCARGADO';
  const esGestion = esRH || esJefe;

  const hoyLocal = new Date();
  const hoyStr = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, '0')}-${String(hoyLocal.getDate()).padStart(2, '0')}`;

  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Pop-up Modal Estados
  const [modalSolicitudAbierto, setModalSolicitudAbierto] = useState(false);
  const [modalDictamen, setModalDictamen] = useState<{ abierto: boolean; id: number; empleado: string } | null>(null);
  const [modalCobertura, setModalCobertura] = useState<{ abierto: boolean; id: number; empleado: string } | null>(null);

  // Formulario Solicitud
  const [empleadoId, setEmpleadoId] = useState<number>(0);
  const [tipo, setTipo] = useState<'VACACIONES' | 'ENFERMEDAD' | 'DESCANSO' | 'PERMISO_EXTRAORDINARIO'>('DESCANSO');
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [motivo, setMotivo] = useState('');
  const [suplenteId, setSuplenteId] = useState<number | undefined>(undefined);
  const [formError, setFormError] = useState('');
  const [miEmpleadoId, setMiEmpleadoId] = useState<number | null>(null);

  // Formulario Dictamen
  const [dictamenAprobar, setDictamenAprobar] = useState(true);
  const [observacionDictamen, setObservacionDictamen] = useState('');
  const [dictamenError, setDictamenError] = useState('');
  const [guardandoDictamen, setGuardandoDictamen] = useState(false);

  // Formulario Cobertura
  const [coberturaAceptar, setCoberturaAceptar] = useState(true);
  const [comentarioCobertura, setComentarioCobertura] = useState('');
  const [coberturaError, setCoberturaError] = useState('');
  const [guardandoCobertura, setGuardandoCobertura] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [perms, emps, listPuestos, perfil] = await Promise.all([
        esGestion ? PermisosService.obtenerTodos().catch(() => PermisosService.obtenerMios()) : PermisosService.obtenerMios(),
        EmpleadosService.obtenerTodos({ activo: true }).catch(() => []),
        CatalogosService.obtenerPuestos().catch(() => []),
        PerfilService.obtenerPerfil().catch(() => null),
      ]);
      setSolicitudes(perms);
      setEmpleados(emps);
      setPuestos(listPuestos);

      if (perfil?.empleado) {
        setMiEmpleadoId(perfil.empleado.id);
        setEmpleadoId(perfil.empleado.id);
      } else if (emps.length > 0 && empleadoId === 0) {
        setEmpleadoId(emps[0].id);
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al cargar permisos' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!estaAutenticado()) {
      navigate('/');
      return;
    }
    cargarDatos();
  }, [navigate]);

  const empleadoSeleccionado = empleados.find((e) => e.id === Number(empleadoId));
  const puestoSeleccionado = puestos.find((p) => p.id === empleadoSeleccionado?.puesto_id);
  const esFinDeSemana = tocaFinDeSemana(fechaInicio, fechaFin);
  const requiereCobertura = Boolean(
    empleadoSeleccionado &&
      puestoSeleccionado?.requiere_suplente &&
      esFinDeSemana
  );

  const suplentesCandidatos = empleados.filter(
    (e) =>
      empleadoSeleccionado &&
      e.id !== empleadoSeleccionado.id &&
      e.sucursal_id === empleadoSeleccionado.sucursal_id &&
      e.puesto_id === empleadoSeleccionado.puesto_id &&
      e.activo === 1
  );

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!empleadoId || empleadoId <= 0) {
      setFormError('Debes seleccionar el empleado solicitante.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setFormError('Las fechas son obligatorias.');
      return;
    }
    if (fechaInicio < hoyStr) {
      setFormError('No se pueden solicitar permisos en fechas pasadas.');
      return;
    }
    if (fechaFin < fechaInicio) {
      setFormError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    if (!motivo.trim()) {
      setFormError('El motivo es obligatorio.');
      return;
    }

    if (requiereCobertura && (!suplenteId || Number(suplenteId) <= 0)) {
      setFormError('El puesto es crítico y el turno toca fin de semana: se requiere suplente obligatorio.');
      return;
    }

    try {
      await PermisosService.crear({
        empleado_id: esGestion ? Number(empleadoId) : (miEmpleadoId || Number(empleadoId)),
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo: motivo.trim(),
        suplente_id: requiereCobertura && suplenteId ? Number(suplenteId) : null,
      });

      setFeedback({ tipo: 'ok', texto: 'Solicitud de permiso enviada a tu Jefe Directo para autorización.' });
      setModalSolicitudAbierto(false);
      setMotivo('');
      setSuplenteId(undefined);
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear solicitud');
    }
  };

  const handleEnviarDictamen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDictamen) return;
    setDictamenError('');

    if (!dictamenAprobar && !observacionDictamen.trim()) {
      setDictamenError('La observación es obligatoria para rechazar la solicitud.');
      return;
    }

    setGuardandoDictamen(true);
    try {
      if (dictamenAprobar) {
        await PermisosService.aprobar(modalDictamen.id, observacionDictamen.trim());
        setFeedback({ tipo: 'ok', texto: 'Solicitud autorizada exitosamente por jefatura.' });
      } else {
        await PermisosService.rechazar(modalDictamen.id, observacionDictamen.trim());
        setFeedback({ tipo: 'ok', texto: 'Solicitud rechazada correctamente.' });
      }
      setModalDictamen(null);
      setObservacionDictamen('');
      cargarDatos();
    } catch (err: any) {
      setDictamenError(err.message || 'Error al dictaminar solicitud');
    } finally {
      setGuardandoDictamen(false);
    }
  };

  const handleEnviarCobertura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCobertura) return;
    setCoberturaError('');

    if (!coberturaAceptar && !comentarioCobertura.trim()) {
      setCoberturaError('Debes indicar el motivo del rechazo de la cobertura.');
      return;
    }

    setGuardandoCobertura(true);
    try {
      await PermisosService.confirmarCobertura(modalCobertura.id, {
        aceptar: coberturaAceptar,
        comentario: comentarioCobertura.trim() || undefined,
      });
      setFeedback({
        tipo: 'ok',
        texto: coberturaAceptar ? 'Has aceptado la cobertura de turno.' : 'Has rechazado la cobertura de turno.',
      });
      setModalCobertura(null);
      setComentarioCobertura('');
      cargarDatos();
    } catch (err: any) {
      setCoberturaError(err.message || 'Error al confirmar cobertura');
    } finally {
      setGuardandoCobertura(false);
    }
  };

  const cancelar = async (id: number) => {
    if (!confirm('¿Deseas cancelar esta solicitud de permiso pendiente?')) return;
    try {
      await PermisosService.cancelar(id);
      setFeedback({ tipo: 'ok', texto: 'Solicitud cancelada.' });
      cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al cancelar solicitud' });
    }
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'APROBADA':
        return 'success';
      case 'RECHAZADA':
        return 'danger';
      case 'CANCELADA':
        return 'default';
      case 'PENDIENTE_SUPLENTE':
        return 'warning';
      default:
        return 'info';
    }
  };

  const filtradas = solicitudes.filter((s) => {
    const texto = `${s.numero_empleado} ${s.empleado} ${s.tipo} ${s.motivo}`.toLowerCase();
    const matchTexto = texto.includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
    return matchTexto && matchEstado;
  });

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
                  <IconCalendar size={20} className="text-amber-800" />
                  <span>Permisos y Ausencias</span>
                </h1>
                <Badge variant={esJefe ? 'warning' : esRH ? 'default' : 'neutral'}>
                  {esJefe ? 'Jefatura' : esRH ? 'Control RH' : 'Colaborador'}
                </Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {esRH
                  ? 'Supervisión de permisos. Las autorizaciones operativas corresponden al encargado directo.'
                  : esJefe
                  ? 'Autorización y dictamen de permisos y descansos del personal a tu cargo.'
                  : 'Solicita permisos personales y consulta el estado de tus trámites.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormError('');
                setModalSolicitudAbierto(true);
              }}
            >
              <IconPlus size={14} />
              <span>Solicitar Permiso</span>
            </Button>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                feedback.tipo === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.tipo === 'ok' ? <IconCheck size={15} /> : <IconAlertTriangle size={15} />}
                <span>{feedback.texto}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700 ml-2 cursor-pointer">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2.5 my-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por empleado, motivo o tipo de permiso..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los Estados</option>
                <option value="PENDIENTE_APROBACION">Pendiente de Aprobación</option>
                <option value="PENDIENTE_SUPLENTE">Pendiente de Suplente</option>
                <option value="APROBADA">Aprobadas</option>
                <option value="RECHAZADA">Rechazadas</option>
                <option value="CANCELADA">Canceladas</option>
              </Select>
            </div>
          </div>

          {/* Tabla de Permisos */}
          <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Empleado</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Periodo</th>
                    <th className="py-2.5 px-3">Motivo & Cobertura</th>
                    <th className="py-2.5 px-3">Autorizador</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-amber-900/10">
                  {cargando ? (
                    <tr>
                      <td colSpan={8}>
                        <LoadingState message="Cargando solicitudes de permisos..." />
                      </td>
                    </tr>
                  ) : filtradas.length > 0 ? (
                    filtradas.map((item) => {
                      const esPendiente = item.estado.startsWith('PENDIENTE');
                      const esMiSuplencia = Boolean(
                        item.cobertura &&
                          miEmpleadoId &&
                          (item.cobertura.suplente_id === miEmpleadoId || item.cobertura.id === miEmpleadoId) &&
                          item.estado === 'PENDIENTE_SUPLENTE'
                      );

                      return (
                        <tr key={item.id} className="hover:bg-amber-100/60 transition-colors even:bg-amber-50/40">
                          <td className="py-2.5 px-3 text-stone-500 font-mono font-bold">#{item.id}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-stone-950">{item.empleado}</div>
                            <div className="text-[10px] text-stone-500 font-mono">{item.numero_empleado}</div>
                          </td>
                          <td className="py-2.5 px-3 text-stone-800 font-bold">{item.tipo}</td>
                          <td className="py-2.5 px-3 text-stone-700 font-medium">
                            {item.fecha_inicio} al {item.fecha_fin}
                          </td>
                          <td className="py-2.5 px-3 text-stone-800 max-w-xs">
                            <div className="font-medium">{item.motivo}</div>
                            {item.cobertura && (
                              <div className="text-[11px] text-amber-900 font-bold mt-0.5">
                                Suplente: {item.cobertura.nombre} ({item.cobertura.estado})
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-amber-900 font-black">Jefe Directo</div>
                            <div className="text-[10px] text-stone-500">Encargado de Área</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={getBadgeVariant(item.estado)}>{item.estado}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Suplente responde cobertura */}
                              {esMiSuplencia && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    setModalCobertura({
                                      abierto: true,
                                      id: item.id,
                                      empleado: item.empleado,
                                    })
                                  }
                                >
                                  Responder Cobertura
                                </Button>
                              )}

                              {/* Jefatura / Encargado autoriza */}
                              {esJefe && esPendiente && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    setModalDictamen({
                                      abierto: true,
                                      id: item.id,
                                      empleado: item.empleado,
                                    })
                                  }
                                >
                                  Dictaminar
                                </Button>
                              )}

                              {/* RH supervisa administrativamente */}
                              {esRH && esPendiente && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Supervisión o dictamen extraordinario de RH"
                                  onClick={() =>
                                    setModalDictamen({
                                      abierto: true,
                                      id: item.id,
                                      empleado: item.empleado,
                                    })
                                  }
                                >
                                  Dictamen RH
                                </Button>
                              )}

                              {/* Cancelar por dueño de solicitud */}
                              {esPendiente && (esGestion || item.empleado_id === miEmpleadoId) && (
                                <Button variant="ghost" size="sm" onClick={() => cancelar(item.id)}>
                                  Cancelar
                                </Button>
                              )}

                              {!esPendiente && (
                                <span className="text-[11px] text-zinc-500">Concluido</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-4">
                        <EmptyState
                          title="No hay solicitudes de permiso"
                          description="No se encontraron registros con los filtros seleccionados."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POP-UP MODAL 1: Solicitar Permiso */}
          <Modal
            isOpen={modalSolicitudAbierto}
            onClose={() => setModalSolicitudAbierto(false)}
            title="Solicitar Permiso o Descanso"
            description="La solicitud será canalizada a tu Jefe Directo para su autorización."
          >
            {formError && (
              <div className="p-2.5 rounded-md text-xs bg-red-500/10 text-red-300 border border-red-500/20 mb-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCrear} className="space-y-3.5">
              {esGestion && (
                <Select
                  label="Empleado Solicitante *"
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(Number(e.target.value))}
                  required
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-zinc-900 text-zinc-100">
                      {emp.nombres} {emp.apellido_paterno} — {emp.puesto} ({emp.sucursal})
                    </option>
                  ))}
                </Select>
              )}

              {/* Información del Jefe Directo */}
              <div className="p-2.5 rounded-md bg-zinc-950/60 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Jefe Directo que Autoriza:</span>
                <span className="font-medium text-zinc-200">
                  {puestoSeleccionado?.jefe_puesto ? puestoSeleccionado.jefe_puesto : 'Encargado de Sucursal'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Tipo de Ausencia *"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  required
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t} className="bg-zinc-900 text-zinc-100">
                      {t}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Fecha Inicio *"
                  type="date"
                  value={fechaInicio}
                  min={hoyStr}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />

                <Input
                  label="Fecha Fin *"
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || hoyStr}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Motivo Detallado *"
                placeholder="Explica la causa del permiso..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />

              {requiereCobertura && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="text-xs font-semibold text-amber-300">
                    Cobertura Obligatoria de Estación Crítica (Fin de Semana)
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    El puesto es crítico y el turno toca sábado o domingo. Selecciona un suplente activo del mismo puesto y sucursal.
                  </p>
                  <Select
                    value={suplenteId || ''}
                    onChange={(e) => setSuplenteId(e.target.value ? Number(e.target.value) : undefined)}
                    required
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      -- Seleccionar suplente activo calificado --
                    </option>
                    {suplentesCandidatos.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                        {s.nombres} {s.apellido_paterno} ({s.numero_empleado})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalSolicitudAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Enviar a Jefatura
                </Button>
              </div>
            </form>
          </Modal>

          {/* POP-UP MODAL 2: Dictamen de Jefatura / Encargado */}
          <Modal
            isOpen={Boolean(modalDictamen?.abierto)}
            onClose={() => setModalDictamen(null)}
            title="Dictamen de Permiso"
            description={`Resolución oficial de jefatura para la solicitud de ${modalDictamen?.empleado}.`}
          >
            {dictamenError && (
              <div className="p-2.5 rounded-md text-xs bg-red-500/10 text-red-300 border border-red-500/20 mb-3">
                {dictamenError}
              </div>
            )}

            <form onSubmit={handleEnviarDictamen} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">Resolución de Jefatura *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDictamenAprobar(true)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      dictamenAprobar
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <IconCheck size={14} />
                    <span>Autorizar Permiso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDictamenAprobar(false)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      !dictamenAprobar
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <IconX size={14} />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>

              <Input
                label={dictamenAprobar ? 'Observación de Jefatura (Opcional)' : 'Motivo del Rechazo (Obligatorio) *'}
                placeholder={dictamenAprobar ? 'Detalles de la autorización...' : 'Explica la razón del rechazo...'}
                value={observacionDictamen}
                onChange={(e) => setObservacionDictamen(e.target.value)}
                required={!dictamenAprobar}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalDictamen(null)}>
                  Cerrar
                </Button>
                <Button type="submit" variant={dictamenAprobar ? 'primary' : 'danger'} size="sm" loading={guardandoDictamen}>
                  Guardar Dictamen
                </Button>
              </div>
            </form>
          </Modal>

          {/* POP-UP MODAL 3: Confirmación de Cobertura de Turno */}
          <Modal
            isOpen={Boolean(modalCobertura?.abierto)}
            onClose={() => setModalCobertura(null)}
            title="Confirmar Cobertura de Turno"
            description={`Has sido propuesto como suplente para cubrir la ausencia de ${modalCobertura?.empleado}.`}
          >
            {coberturaError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3">
                {coberturaError}
              </div>
            )}

            <form onSubmit={handleEnviarCobertura} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">Tu Respuesta *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoberturaAceptar(true)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      coberturaAceptar
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <IconCheck size={14} />
                    <span>Aceptar Cobertura</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoberturaAceptar(false)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      !coberturaAceptar
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <IconX size={14} />
                    <span>No Puedo Cubrir</span>
                  </button>
                </div>
              </div>

              <Input
                label={coberturaAceptar ? 'Comentario (Opcional)' : 'Motivo del Rechazo (Obligatorio) *'}
                placeholder={coberturaAceptar ? 'Detalle de disponibilidad...' : 'Indica por qué no puedes cubrir...'}
                value={comentarioCobertura}
                onChange={(e) => setComentarioCobertura(e.target.value)}
                required={!coberturaAceptar}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalCobertura(null)}>
                  Cerrar
                </Button>
                <Button type="submit" variant={coberturaAceptar ? 'primary' : 'danger'} size="sm" loading={guardandoCobertura}>
                  Enviar Respuesta
                </Button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}