import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { BuzonService, PerfilService, obtenerRol, type BuzonItem, type Rol, estaAutenticado } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconInbox, IconPlus, IconX, IconCheck, IconAlertTriangle } from '../components/ui/Icons';

const TIPOS_BUZON = [
  'SUGERENCIA',
  'QUEJA',
  'INCIDENTE_MANTENIMIENTO',
  'SEGURIDAD',
  'CLIMA_LABORAL',
] as const;

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;

export default function Solicitudes() {
  const navigate = useNavigate();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const esGestion = rol === 'RH_ADMIN' || rol === 'ENCARGADO';

  const [items, setItems] = useState<BuzonItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [tieneExpediente, setTieneExpediente] = useState(false);

  // Pop-up Modals
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalAtender, setModalAtender] = useState<{ abierto: boolean; id: number; asunto: string } | null>(null);

  // Formulario nuevo buzón
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<typeof TIPOS_BUZON[number]>('SUGERENCIA');
  const [prioridad, setPrioridad] = useState<typeof PRIORIDADES[number]>('MEDIA');
  const [anonimo, setAnonimo] = useState(true);
  const [formError, setFormError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Formulario atender buzón
  const [respuestaAtencion, setRespuestaAtencion] = useState('');
  const [atenderError, setAtenderError] = useState('');
  const [guardandoAtencion, setGuardandoAtencion] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [data, perfil] = await Promise.all([
        esGestion ? BuzonService.obtenerTodos().catch(() => BuzonService.obtenerMios()) : BuzonService.obtenerMios(),
        PerfilService.obtenerPerfil().catch(() => null),
      ]);
      setItems(data);
      const vinculada = Boolean(perfil?.empleado);
      setTieneExpediente(vinculada);
      if (!vinculada) {
        setAnonimo(true);
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al cargar buzón' });
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

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const as = asunto.trim();
    if (!as) {
      setFormError('El asunto es obligatorio.');
      return;
    }
    if (as.length > 120) {
      setFormError('El asunto no puede exceder 120 caracteres.');
      return;
    }

    const desc = descripcion.trim();
    if (!desc) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (desc.length > 1000) {
      setFormError('La descripción no puede exceder 1,000 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      await BuzonService.enviar({
        asunto: as,
        descripcion: desc,
        tipo,
        prioridad,
        anonimo: !tieneExpediente ? true : anonimo,
      });

      setFeedback({ tipo: 'ok', texto: 'Reporte registrado exitosamente en el buzón.' });
      setModalNuevoAbierto(false);
      setAsunto('');
      setDescripcion('');
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al enviar reporte');
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarAtencion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAtender) return;
    setAtenderError('');

    if (!respuestaAtencion.trim()) {
      setAtenderError('La respuesta u observación es obligatoria.');
      return;
    }

    setGuardandoAtencion(true);
    try {
      await BuzonService.atender(modalAtender.id, {
        estado: 'ATENDIDO',
        respuesta: respuestaAtencion.trim(),
      });
      setFeedback({ tipo: 'ok', texto: 'Reporte atendido con éxito.' });
      setModalAtender(null);
      setRespuestaAtencion('');
      cargarDatos();
    } catch (err: any) {
      setAtenderError(err.message || 'Error al atender reporte');
    } finally {
      setGuardandoAtencion(false);
    }
  };

  const getPrioridadVariant = (p: string) => {
    switch (p) {
      case 'CRITICA':
        return 'danger';
      case 'ALTA':
        return 'warning';
      case 'MEDIA':
        return 'info';
      default:
        return 'default';
    }
  };

  const filtrados = items.filter((i) => {
    const texto = `${i.asunto} ${i.descripcion} ${i.tipo} ${i.autor?.nombre || 'anónimo'}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
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
                  <IconInbox size={20} className="text-amber-800" />
                  <span>Buzón Interno de Colaborador</span>
                </h1>
                <Badge variant={esGestion ? 'warning' : 'neutral'}>
                  {esGestion ? 'Bandeja de Atención' : 'Canal Confidencial'}
                </Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {esGestion
                  ? 'Revisión y respuesta a incidentes de seguridad, sugerencias y quejas de clima laboral.'
                  : 'Canal seguro para reportar observaciones o propuestas de forma anónima y directa.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormError('');
                setModalNuevoAbierto(true);
              }}
            >
              <IconPlus size={14} />
              <span>Nuevo Reporte</span>
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

          {/* Buscador */}
          <div className="my-2">
            <Input
              placeholder="Buscar en el buzón por asunto, tipo o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Listado de tarjetas limpias */}
          <div className="space-y-3">
            {cargando ? (
              <LoadingState message="Cargando reportes del buzón..." />
            ) : filtrados.length > 0 ? (
              filtrados.map((item) => {
                const esCerrado = item.estado === 'ATENDIDO' || item.estado === 'CERRADO';

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs space-y-2.5 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getPrioridadVariant(item.prioridad)}>{item.prioridad}</Badge>
                        <Badge variant="default">{item.tipo}</Badge>
                        <span className="text-[11px] text-stone-400 font-mono font-medium">#{item.id}</span>
                        <span className="text-[11px] text-stone-500 font-normal">{item.creado_en}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={esCerrado ? 'success' : 'neutral'}>{item.estado}</Badge>
                        {esGestion && !esCerrado && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setRespuestaAtencion('');
                              setAtenderError('');
                              setModalAtender({
                                abierto: true,
                                id: item.id,
                                asunto: item.asunto,
                              });
                            }}
                          >
                            Atender
                          </Button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900">{item.asunto}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed font-normal">{item.descripcion}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-stone-500 pt-2.5 border-t border-stone-100">
                      <span>
                        Remitente:{' '}
                        <strong className="text-stone-800 font-medium">
                          {item.autor ? `${item.autor.nombre} (${item.autor.numero_empleado})` : 'Confidencial / Anónimo'}
                        </strong>
                      </span>
                      {item.respuesta && (
                        <span className="text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Respuesta: {item.respuesta}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="Buzón sin reportes"
                description="No hay incidencias ni sugerencias registradas con los criterios de búsqueda."
              />
            )}
          </div>

          {/* POP-UP MODAL 1: Nuevo Reporte */}
          <Modal
            isOpen={modalNuevoAbierto}
            onClose={() => setModalNuevoAbierto(false)}
            title="Nuevo Reporte en Buzón"
            description="Envía una sugerencia, reporte de mantenimiento o incidente de clima laboral."
          >
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCrear} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Tipo de Asunto *"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  required
                >
                  {TIPOS_BUZON.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Prioridad *"
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as any)}
                  required
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Asunto (máximo 120 caracteres) *"
                maxLength={120}
                placeholder="Resumen del tema..."
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Descripción Detallada (máximo 1,000 caracteres) *
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  placeholder="Detalla hechos, observaciones o sugerencias con claridad..."
                  className="w-full bg-white border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 rounded-lg p-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition-all"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!tieneExpediente ? true : anonimo}
                    disabled={!tieneExpediente}
                    onChange={(e) => setAnonimo(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-amber-600 accent-amber-600"
                  />
                  Registrar como reporte 100% confidencial y anónimo
                </label>
                {!tieneExpediente && (
                  <p className="text-[10px] text-stone-500 pl-6">
                    Las cuentas administrativas centrales sin expediente se registran de forma anónima automáticamente.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalNuevoAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardando}>
                  Enviar al Buzón
                </Button>
              </div>
            </form>
          </Modal>

          {/* POP-UP MODAL 2: Atender Reporte */}
          <Modal
            isOpen={Boolean(modalAtender?.abierto)}
            onClose={() => setModalAtender(null)}
            title="Atender Reporte de Buzón"
            description={`Registrar respuesta u acción resolutiva para "${modalAtender?.asunto}".`}
          >
            {atenderError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3">
                {atenderError}
              </div>
            )}

            <form onSubmit={handleEnviarAtencion} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Respuesta o Acción Tomada *
                </label>
                <textarea
                  rows={4}
                  value={respuestaAtencion}
                  onChange={(e) => setRespuestaAtencion(e.target.value)}
                  required
                  placeholder="Detalla las medidas implementadas o el dictamen resolutivo..."
                  className="w-full bg-white border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 rounded-lg p-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAtender(null)}>
                  Cerrar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardandoAtencion}>
                  Guardar Respuesta
                </Button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}