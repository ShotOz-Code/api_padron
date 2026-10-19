import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  PrestamosService,
  EmpleadosService,
  PerfilService,
  obtenerRol,
  type Prestamo,
  type Empleado,
  type Rol,
  estaAutenticado,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconBanknote, IconPlus, IconX, IconCheck, IconAlertTriangle } from '../components/ui/Icons';

function obtenerLunesActual(): string {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
  const lunes = new Date(hoy.setDate(diff));
  return lunes.toISOString().split('T')[0];
}

export default function Prestamos() {
  const navigate = useNavigate();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const esRH = rol === 'RH_ADMIN';
  const esJefe = rol === 'ENCARGADO';
  const esGestion = esRH || esJefe;

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Pop-up Modal Estados
  const [modalSolicitudAbierto, setModalSolicitudAbierto] = useState(false);
  const [modalDictamen, setModalDictamen] = useState<{ abierto: boolean; id: number; empleado: string } | null>(null);
  const [modalRetencion, setModalRetencion] = useState<{ abierto: boolean; id: number; empleado: string } | null>(null);

  // Formulario nuevo préstamo
  const [empleadoId, setEmpleadoId] = useState<number>(0);
  const [montoPesos, setMontoPesos] = useState('1500.00');
  const [numeroSemanas, setNumeroSemanas] = useState(5);
  const [motivo, setMotivo] = useState('Anticipo por emergencia');
  const [formError, setFormError] = useState('');
  const [miEmpleadoId, setMiEmpleadoId] = useState<number | null>(null);
  const [guardandoSolicitud, setGuardandoSolicitud] = useState(false);

  // Formulario Dictamen
  const [dictamenAprobar, setDictamenAprobar] = useState(true);
  const [observacionDictamen, setObservacionDictamen] = useState('');
  const [dictamenError, setDictamenError] = useState('');
  const [guardandoDictamen, setGuardandoDictamen] = useState(false);

  // Formulario Retención
  const [semanaInicioRetencion, setSemanaInicioRetencion] = useState(obtenerLunesActual());
  const [retencionError, setRetencionError] = useState('');
  const [guardandoRetencion, setGuardandoRetencion] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [list, emps, perfil] = await Promise.all([
        esGestion ? PrestamosService.obtenerTodos().catch(() => PrestamosService.obtenerMios()) : PrestamosService.obtenerMios(),
        esGestion ? EmpleadosService.obtenerTodos({ activo: true }).catch(() => []) : Promise.resolve([]),
        PerfilService.obtenerPerfil().catch(() => null),
      ]);
      setPrestamos(list);
      setEmpleados(emps);

      if (perfil?.empleado) {
        setMiEmpleadoId(perfil.empleado.id);
        setEmpleadoId(perfil.empleado.id);
      } else if (emps.length > 0 && empleadoId === 0) {
        setEmpleadoId(emps[0].id);
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al cargar préstamos' });
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

  const empSeleccionado = empleados.find((e) => e.id === Number(empleadoId));
  const sueldoSemanal = empSeleccionado ? empSeleccionado.sueldo_semanal_centavos / 100 : 3500;
  const maxMontoPermitido = 2 * sueldoSemanal;
  const maxDescuentoSemanal = 0.35 * sueldoSemanal;

  const montoNum = parseFloat(montoPesos) || 0;
  const semanasMinimas = Math.max(1, Math.ceil(montoNum / (maxDescuentoSemanal || 1)));

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetEmpId = esGestion ? Number(empleadoId) : (miEmpleadoId || Number(empleadoId));
    if (!targetEmpId || targetEmpId <= 0) {
      setFormError('Debes seleccionar el empleado solicitante.');
      return;
    }

    if (montoNum <= 0) {
      setFormError('El monto solicitado debe ser mayor a cero.');
      return;
    }

    if (empSeleccionado && montoNum > maxMontoPermitido) {
      setFormError(`El monto excede el tope de dos salarios semanales ($${maxMontoPermitido.toFixed(2)}).`);
      return;
    }

    if (numeroSemanas < 1 || numeroSemanas > 52) {
      setFormError('El plazo debe ser de entre 1 y 52 semanas.');
      return;
    }

    const descuentoProyectado = montoNum / numeroSemanas;
    if (empSeleccionado && descuentoProyectado > maxDescuentoSemanal) {
      setFormError(
        `El descuento semanal proyectado ($${descuentoProyectado.toFixed(
          2
        )}) supera el 35% del salario semanal. El plazo mínimo para este monto es de ${semanasMinimas} semanas.`
      );
      return;
    }

    if (!motivo.trim()) {
      setFormError('El motivo del anticipo es obligatorio.');
      return;
    }

    setGuardandoSolicitud(true);
    try {
      await PrestamosService.solicitar({
        empleado_id: targetEmpId,
        monto_centavos: Math.round(montoNum * 100),
        numero_semanas: Number(numeroSemanas),
        motivo: motivo.trim(),
      });

      setFeedback({ tipo: 'ok', texto: 'Préstamo solicitado con éxito y canalizado a autorización.' });
      setModalSolicitudAbierto(false);
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al solicitar préstamo');
    } finally {
      setGuardandoSolicitud(false);
    }
  };

  const handleEnviarDictamen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDictamen) return;
    setDictamenError('');

    if (!dictamenAprobar && !observacionDictamen.trim()) {
      setDictamenError('La observación es obligatoria para rechazar el préstamo.');
      return;
    }

    setGuardandoDictamen(true);
    try {
      if (dictamenAprobar) {
        await PrestamosService.aprobar(modalDictamen.id, observacionDictamen.trim());
        setFeedback({ tipo: 'ok', texto: 'Préstamo autorizado exitosamente.' });
      } else {
        await PrestamosService.rechazar(modalDictamen.id, observacionDictamen.trim());
        setFeedback({ tipo: 'ok', texto: 'Préstamo rechazado con éxito.' });
      }
      setModalDictamen(null);
      setObservacionDictamen('');
      cargarDatos();
    } catch (err: any) {
      setDictamenError(err.message || 'Error al dictaminar préstamo');
    } finally {
      setGuardandoDictamen(false);
    }
  };

  const handleRegistrarRetencion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRetencion) return;
    setRetencionError('');

    const d = new Date(semanaInicioRetencion + 'T00:00:00');
    if (d.getDay() !== 1) {
      setRetencionError('La semana de inicio debe ser estrictamente un día lunes.');
      return;
    }

    setGuardandoRetencion(true);
    try {
      await PrestamosService.registrarRetencion(modalRetencion.id, semanaInicioRetencion.trim());
      setFeedback({ tipo: 'ok', texto: 'Retención de nómina aplicada correctamente.' });
      setModalRetencion(null);
      cargarDatos();
    } catch (err: any) {
      setRetencionError(err.message || 'Error al aplicar retención');
    } finally {
      setGuardandoRetencion(false);
    }
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'APROBADO':
        return 'info';
      case 'LIQUIDADO':
        return 'success';
      case 'RECHAZADO':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const filtrados = prestamos.filter((p) => {
    const texto = `${p.empleado} ${p.motivo} ${p.estado}`.toLowerCase();
    const matchTexto = texto.includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
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
                  <IconBanknote size={20} className="text-amber-800" />
                  <span>Préstamos y Anticipos</span>
                </h1>
                <Badge variant={esGestion ? 'warning' : 'neutral'}>
                  {esGestion ? 'Amortizaciones' : 'Colaborador'}
                </Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {esGestion
                  ? 'Autorización de anticipos y programación de retenciones semanales de nómina.'
                  : 'Historial de préstamos solicitados y saldos pendientes.'}
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
              <span>Solicitar Préstamo</span>
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
          <div className="flex flex-col sm:flex-row gap-2.5 my-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por empleado o motivo de anticipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="todos">Todos los Estados</option>
                <option value="PENDIENTE">Pendientes de Autorización</option>
                <option value="APROBADO">Aprobados / Con Saldo</option>
                <option value="LIQUIDADO">Liquidados</option>
                <option value="RECHAZADO">Rechazados</option>
              </Select>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-3.5">ID</th>
                    <th className="py-3 px-3.5">Colaborador</th>
                    <th className="py-3 px-3.5">Monto Original</th>
                    <th className="py-3 px-3.5">Saldo Actual</th>
                    <th className="py-3 px-3.5">Descuento Semanal</th>
                    <th className="py-3 px-3.5">Estado</th>
                    <th className="py-3 px-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cargando ? (
                    <tr>
                      <td colSpan={7}>
                        <LoadingState message="Cargando cartera de préstamos..." />
                      </td>
                    </tr>
                  ) : filtrados.length > 0 ? (
                    filtrados.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-100/60 transition-colors even:bg-amber-50/40">
                        <td className="py-2.5 px-3 text-stone-500 font-mono font-bold">#{item.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-stone-950">{item.empleado}</div>
                          <div className="text-[10px] text-stone-500 font-medium">
                            {item.motivo} ({item.numero_semanas} sem.)
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-800 font-mono font-bold">
                          ${(item.monto_original_centavos / 100).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black">
                          <span className={item.saldo_centavos > 0 ? 'text-amber-800' : 'text-green-800'}>
                            ${(item.saldo_centavos / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-mono">
                          ${(item.descuento_semanal_centavos / 100).toFixed(2)}/sem
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={getBadgeVariant(item.estado)}>{item.estado}</Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {esGestion && item.estado === 'PENDIENTE' && (
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

                            {esGestion && item.estado === 'APROBADO' && item.saldo_centavos > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSemanaInicioRetencion(obtenerLunesActual());
                                  setRetencionError('');
                                  setModalRetencion({
                                    abierto: true,
                                    id: item.id,
                                    empleado: item.empleado,
                                  });
                                }}
                              >
                                Aplicar Retención
                              </Button>
                            )}

                            {item.estado === 'LIQUIDADO' && (
                              <span className="text-[11px] text-emerald-400 font-medium">Liquidado</span>
                            )}
                            {!esGestion && item.estado === 'PENDIENTE' && (
                              <span className="text-[11px] text-amber-400">En revisión</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4">
                        <EmptyState
                          title="No hay préstamos registrados"
                          description="No se encontraron solicitudes de anticipo con los filtros seleccionados."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POP-UP MODAL 1: Solicitar Préstamo */}
          <Modal
            isOpen={modalSolicitudAbierto}
            onClose={() => setModalSolicitudAbierto(false)}
            title="Solicitar Préstamo / Anticipo"
            description="Límite legal: hasta 2 semanas de salario y descuento semanal máximo del 35%."
          >
            {formError && (
              <div className="p-3 rounded-xl text-xs bg-red-50 text-red-800 border border-red-200 mb-3 font-medium">
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
                    <option key={emp.id} value={emp.id}>
                      {emp.nombres} {emp.apellido_paterno} (Sueldo Semanal: ${(emp.sueldo_semanal_centavos / 100).toFixed(2)})
                    </option>
                  ))}
                </Select>
              )}

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Monto Máximo Permitido (2 semanas):</span>
                  <span className="font-mono font-bold text-amber-950">${maxMontoPermitido.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Tope Descuento Semanal (35% sueldo):</span>
                  <span className="font-mono font-bold text-amber-950">${maxDescuentoSemanal.toFixed(2)}/sem</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Monto Solicitado ($ MXN) *"
                  type="number"
                  step="0.01"
                  value={montoPesos}
                  onChange={(e) => setMontoPesos(e.target.value)}
                  required
                />

                <Input
                  label={`Plazo Semanal (mínimo: ${semanasMinimas}) *`}
                  type="number"
                  min={semanasMinimas}
                  max={52}
                  value={numeroSemanas}
                  onChange={(e) => setNumeroSemanas(Number(e.target.value))}
                  required
                />
              </div>

              <Input
                label="Motivo del Anticipo *"
                placeholder="Ej. Gasto médico imprevisto, colegiatura..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalSolicitudAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardandoSolicitud}>
                  Registrar Solicitud
                </Button>
              </div>
            </form>
          </Modal>

          {/* POP-UP MODAL 2: Dictamen de Préstamo */}
          <Modal
            isOpen={Boolean(modalDictamen?.abierto)}
            onClose={() => setModalDictamen(null)}
            title="Dictaminar Solicitud de Préstamo"
            description={`Resolución para la solicitud de ${modalDictamen?.empleado}.`}
          >
            {dictamenError && (
              <div className="p-3 rounded-xl text-xs bg-red-50 text-red-800 border border-red-200 mb-3 font-medium">
                {dictamenError}
              </div>
            )}

            <form onSubmit={handleEnviarDictamen} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">Resolución Oficial *</label>
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
                    <span>Autorizar Préstamo</span>
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
                label={dictamenAprobar ? 'Observación de Aprobación (Opcional)' : 'Motivo del Rechazo (Obligatorio) *'}
                placeholder={dictamenAprobar ? 'Detalles de desembolso...' : 'Explica la razón del rechazo...'}
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

          {/* POP-UP MODAL 3: Aplicar Retención de Nómina */}
          <Modal
            isOpen={Boolean(modalRetencion?.abierto)}
            onClose={() => setModalRetencion(null)}
            title="Aplicar Retención de Nómina"
            description={`Registrar descuento semanal para el préstamo de ${modalRetencion?.empleado}.`}
          >
            {retencionError && (
              <div className="p-3 rounded-xl text-xs bg-red-50 text-red-800 border border-red-200 mb-3 font-medium">
                {retencionError}
              </div>
            )}

            <form onSubmit={handleRegistrarRetencion} className="space-y-4">
              <Input
                label="Semana Inicio (Lunes) *"
                type="date"
                value={semanaInicioRetencion}
                onChange={(e) => setSemanaInicioRetencion(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalRetencion(null)}>
                  Cerrar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardandoRetencion}>
                  Aplicar Descuento
                </Button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}