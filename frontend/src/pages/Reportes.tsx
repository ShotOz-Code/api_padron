import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  ReportesService,
  type ReporteAusentismoItem,
  type ReporteRotacionItem,
  type ReporteRetencionItem,
  estaAutenticado,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconBarChart, IconCalendar, IconRefresh, IconBanknote, IconSearch, IconX, IconAlertTriangle } from '../components/ui/Icons';

type TipoReporte = 'ausentismo' | 'rotacion' | 'retenciones';

function formatearFechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function obtenerLunes(fechaStr: string): string {
  const d = new Date(fechaStr + 'T00:00:00');
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
  return formatearFechaLocal(new Date(d.getFullYear(), d.getMonth(), diff));
}

export default function Reportes() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TipoReporte>('ausentismo');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Fechas ausentismo
  const hoy = new Date();
  const hoyStr = formatearFechaLocal(hoy);
  const primerDiaMes = formatearFechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoyStr);
  const [datosAusentismo, setDatosAusentismo] = useState<ReporteAusentismoItem[]>([]);

  // Rotación
  const [datosRotacion, setDatosRotacion] = useState<ReporteRotacionItem[]>([]);

  // Retenciones
  const [semanaInicio, setSemanaInicio] = useState(obtenerLunes(hoyStr));
  const [datosRetenciones, setDatosRetenciones] = useState<ReporteRetencionItem[]>([]);

  useEffect(() => {
    if (!estaAutenticado()) {
      navigate('/');
      return;
    }
  }, [navigate]);

  const consultarAusentismo = async () => {
    if (!desde || !hasta) {
      setError('Las fechas desde y hasta son obligatorias.');
      return;
    }
    if (hasta < desde) {
      setError('La fecha "hasta" debe ser igual o posterior a "desde".');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const fn = ReportesService?.obtenerAusentismo || ReportesService?.ausentismo;
      if (typeof fn !== 'function') {
        throw new Error('El servicio de reporte de ausentismo no está disponible en este momento.');
      }
      const res = await fn(desde, hasta);
      setDatosAusentismo(res.resultados || []);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener reporte de ausentismo');
    } finally {
      setCargando(false);
    }
  };

  const consultarRotacion = async () => {
    setCargando(true);
    setError('');
    try {
      const fn = ReportesService?.obtenerRotacionPorPuesto || ReportesService?.rotacionPorPuesto;
      if (typeof fn !== 'function') {
        throw new Error('El servicio de rotación por puesto no está disponible en este momento.');
      }
      const res = await fn();
      setDatosRotacion(res || []);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener rotación por puesto');
    } finally {
      setCargando(false);
    }
  };

  const consultarRetenciones = async () => {
    if (!semanaInicio) {
      setError('La fecha de semana_inicio es obligatoria.');
      return;
    }

    const fechaLunes = obtenerLunes(semanaInicio);
    if (fechaLunes !== semanaInicio) {
      setSemanaInicio(fechaLunes);
    }

    setCargando(true);
    setError('');
    try {
      const fn = ReportesService?.obtenerRetencionesNomina || ReportesService?.retencionesNomina;
      if (typeof fn !== 'function') {
        throw new Error('El servicio de retenciones de nómina no está disponible en este momento.');
      }
      const res: any = await fn(fechaLunes);
      setDatosRetenciones(Array.isArray(res) ? res : (res?.retenciones || []));
    } catch (err: any) {
      setError(err?.message || 'Error al obtener retenciones de nómina');
    } finally {
      setCargando(false);
    }
  };

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
                  <IconBarChart size={20} className="text-amber-800" />
                  <span>Reportes y Auditoría RH</span>
                </h1>
                <Badge variant="default">Análisis Operativo</Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Informes de ausentismo en turnos críticos, rotación por vacante y deducciones semanales de nómina.
              </p>
            </div>
          </div>

          {/* Selector de Pestañas Limpio */}
          <div className="flex p-1 bg-stone-100 rounded-xl gap-1 max-w-fit flex-wrap">
            <button
              onClick={() => {
                setTab('ausentismo');
                setError('');
              }}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 text-xs rounded-lg transition-all cursor-pointer ${
                tab === 'ausentismo'
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              <IconCalendar size={14} />
              <span>Ausentismo y Días Pico</span>
            </button>
            <button
              onClick={() => {
                setTab('rotacion');
                setError('');
              }}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 text-xs rounded-lg transition-all cursor-pointer ${
                tab === 'rotacion'
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              <IconRefresh size={14} />
              <span>Rotación por Puesto</span>
            </button>
            <button
              onClick={() => {
                setTab('retenciones');
                setError('');
              }}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 text-xs rounded-lg transition-all cursor-pointer ${
                tab === 'retenciones'
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 font-medium'
              }`}
            >
              <IconBanknote size={14} />
              <span>Retenciones de Nómina</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconAlertTriangle size={15} />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-stone-400 hover:text-stone-700 ml-2 cursor-pointer">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* TAB 1: Ausentismo */}
          {tab === 'ausentismo' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-end gap-3">
                <div className="w-full sm:w-48">
                  <Input
                    label="Desde *"
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Input
                    label="Hasta *"
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </div>
                <Button variant="primary" size="sm" onClick={consultarAusentismo} loading={cargando}>
                  <IconSearch size={14} />
                  <span>Consultar Reporte</span>
                </Button>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-3.5">No. Nómina</th>
                        <th className="py-3 px-3.5">Colaborador</th>
                        <th className="py-3 px-3.5">Sucursal</th>
                        <th className="py-3 px-3.5">Puesto</th>
                        <th className="py-3 px-3.5 text-center">Turnos Prog.</th>
                        <th className="py-3 px-3.5 text-center">Faltas</th>
                        <th className="py-3 px-3.5 text-center">Retardos</th>
                        <th className="py-3 px-3.5 text-center">Faltas Fin Sem.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {cargando ? (
                        <tr>
                          <td colSpan={8}>
                            <LoadingState message="Calculando ausentismo..." />
                          </td>
                        </tr>
                      ) : datosAusentismo.length > 0 ? (
                        datosAusentismo.map((r) => (
                          <tr key={r.empleado_id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 px-3.5 font-mono font-medium text-stone-700">{r.numero_empleado}</td>
                            <td className="py-3 px-3.5 font-semibold text-stone-900">{r.empleado}</td>
                            <td className="py-3 px-3.5 text-stone-600">{r.sucursal}</td>
                            <td className="py-3 px-3.5 text-stone-700 font-normal">{r.puesto}</td>
                            <td className="py-3 px-3.5 text-center text-stone-800 font-semibold">
                              {r.turnos_programados}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={r.faltas > 0 ? 'text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-stone-400'}>
                                {r.faltas}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={r.retardos > 0 ? 'text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-stone-400'}>
                                {r.retardos}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={r.faltas_fin_semana > 0 ? 'text-rose-800 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-stone-400'}>
                                {r.faltas_fin_semana}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-4">
                            <EmptyState
                              title="Sin datos de ausentismo"
                              description="Selecciona un rango de fechas y presiona 'Consultar Reporte'."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rotación */}
          {tab === 'rotacion' && (
            <div className="space-y-4">
              <div>
                <Button variant="primary" size="sm" onClick={consultarRotacion} loading={cargando}>
                  <IconRefresh size={14} />
                  <span>Actualizar Rotación</span>
                </Button>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-3.5">Puesto / Vacante</th>
                        <th className="py-3 px-3.5 text-center">Total Histórico</th>
                        <th className="py-3 px-3.5 text-center">Personal Activo</th>
                        <th className="py-3 px-3.5 text-center">Bajas Registradas</th>
                        <th className="py-3 px-3.5 text-center">Cambios de Puesto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {cargando ? (
                        <tr>
                          <td colSpan={5}>
                            <LoadingState message="Consultando índices de rotación..." />
                          </td>
                        </tr>
                      ) : datosRotacion.length > 0 ? (
                        datosRotacion.map((r) => (
                          <tr key={r.puesto_id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 px-3.5 font-semibold text-stone-900">{r.puesto}</td>
                            <td className="py-3 px-3.5 text-center font-mono text-stone-700">{r.empleados_historicos}</td>
                            <td className="py-3 px-3.5 text-center font-semibold text-emerald-700">{r.activos}</td>
                            <td className="py-3 px-3.5 text-center font-medium">
                              <span className={r.bajas > 0 ? 'text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-stone-400'}>
                                {r.bajas}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center text-stone-700 font-mono">
                              {r.cambios_de_puesto_registrados}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4">
                            <EmptyState
                              title="Sin datos de rotación"
                              description="Haz clic en 'Actualizar Rotación' para calcular las estadísticas históricas."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Retenciones */}
          {tab === 'retenciones' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-end gap-3">
                <div className="w-full sm:w-56">
                  <Input
                    label="Semana Inicio (Lunes) *"
                    type="date"
                    value={semanaInicio}
                    onChange={(e) => setSemanaInicio(e.target.value)}
                  />
                </div>
                <Button variant="primary" size="sm" onClick={consultarRetenciones} loading={cargando}>
                  <IconBanknote size={14} />
                  <span>Consultar Retenciones</span>
                </Button>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-3.5">ID Retención</th>
                        <th className="py-3 px-3.5">Colaborador</th>
                        <th className="py-3 px-3.5">Semana Inicio</th>
                        <th className="py-3 px-3.5">Monto Descontado</th>
                        <th className="py-3 px-3.5">Saldo Remanente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {cargando ? (
                        <tr>
                          <td colSpan={5}>
                            <LoadingState message="Cargando retenciones de nómina..." />
                          </td>
                        </tr>
                      ) : datosRetenciones.length > 0 ? (
                        datosRetenciones.map((r) => (
                          <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 px-3.5 text-stone-500 font-mono font-medium">
                              #{r.id} (P#{r.prestamo_id})
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-stone-900">{r.empleado}</div>
                              <div className="text-[10px] text-stone-500 font-mono">{r.numero_empleado}</div>
                            </td>
                            <td className="py-3 px-3.5 text-stone-600 font-normal">{r.semana_inicio}</td>
                            <td className="py-3 px-3.5 font-mono font-semibold text-stone-900">
                              ${(r.monto_centavos / 100).toFixed(2)}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold">
                              <span className={r.saldo_posterior_centavos > 0 ? 'text-amber-800' : 'text-emerald-700'}>
                                ${(r.saldo_posterior_centavos / 100).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4">
                            <EmptyState
                              title="Sin deducciones en esta semana"
                              description="Selecciona un lunes y presiona 'Consultar Retenciones'."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}