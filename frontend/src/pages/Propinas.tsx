import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  PropinasService,
  CatalogosService,
  obtenerRol,
  type BolsaPropinas,
  type PropinaPropia,
  type Sucursal,
  type Rol,
  estaAutenticado,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconCoins, IconPlus, IconX, IconCheck, IconAlertTriangle } from '../components/ui/Icons';

export default function Propinas() {
  const navigate = useNavigate();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const esGestion = rol === 'RH_ADMIN' || rol === 'ENCARGADO';

  const hoyLocal = new Date();
  const hoyStr = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, '0')}-${String(hoyLocal.getDate()).padStart(2, '0')}`;

  const [bolsas, setBolsas] = useState<BolsaPropinas[]>([]);
  const [misPropinas, setMisPropinas] = useState<PropinaPropia[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Formulario nueva bolsa
  const [sucursalId, setSucursalId] = useState<number>(1);
  const [fecha, setFecha] = useState(hoyStr);
  const [montoPesos, setMontoPesos] = useState('4250.00');
  const [formError, setFormError] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (esGestion) {
        const [listBolsas, listSuc] = await Promise.all([
          PropinasService.obtenerBolsas().catch(() => []),
          CatalogosService.obtenerSucursales().catch(() => []),
        ]);
        setBolsas(listBolsas);
        const activas = listSuc.filter((s) => s.activo);
        setSucursales(activas);
        if (activas.length > 0) setSucursalId(activas[0].id);
      } else {
        const mias = await PropinasService.obtenerMias().catch(() => []);
        setMisPropinas(mias);
      }
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al cargar propinas' });
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

    if (!sucursalId || Number(sucursalId) <= 0) {
      setFormError('Selecciona una sucursal.');
      return;
    }
    if (!fecha) {
      setFormError('La fecha es obligatoria.');
      return;
    }
    if (fecha > hoyStr) {
      setFormError('No se puede crear una bolsa de propinas con fecha futura.');
      return;
    }

    const monto = parseFloat(montoPesos);
    if (isNaN(monto) || monto <= 0) {
      setFormError('El monto de la bolsa debe ser mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      await PropinasService.crearBolsa({
        sucursal_id: Number(sucursalId),
        fecha,
        monto_centavos: Math.round(monto * 100),
      });

      setFeedback({ tipo: 'ok', texto: 'Bolsa de propinas registrada exitosamente.' });
      setModalAbierto(false);
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear bolsa');
    } finally {
      setGuardando(false);
    }
  };

  const calcularReparto = async (id: number) => {
    try {
      const res = await PropinasService.calcularAsignaciones(id);
      setFeedback({
        tipo: 'ok',
        texto: `${res.mensaje}: distribuido $${(res.monto_distribuido_centavos / 100).toFixed(2)} entre ${
          res.participantes
        } colaboradores según horas trabajadas y factor de puesto.`,
      });
      cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'error', texto: err.message || 'Error al calcular asignaciones' });
    }
  };

  const totalDistribuido = esGestion
    ? bolsas.reduce((acc, curr) => acc + curr.monto_centavos, 0)
    : misPropinas.reduce((acc, curr) => acc + curr.monto_centavos, 0);

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
                  <IconCoins size={20} className="text-amber-800" />
                  <span>Control de Propinas</span>
                </h1>
                <Badge variant={esGestion ? 'warning' : 'neutral'}>
                  {esGestion ? 'Gestión de Reparto' : 'Mis Propinas'}
                </Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Bolsas de propinas del restaurante repartidas equitativamente por puntos y horas de turno.
              </p>
            </div>

            {esGestion && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setFormError('');
                  setModalAbierto(true);
                }}
              >
                <IconPlus size={14} />
                <span>Nueva Bolsa Diaria</span>
              </Button>
            )}
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

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
            <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                {esGestion ? 'Bolsas Registradas' : 'Repartos Recibidos'}
              </span>
              <p className="text-2xl font-bold text-stone-900 mt-1">
                {esGestion ? bolsas.length : misPropinas.length}
              </p>
              <span className="text-xs text-stone-400 mt-0.5 block">Historial de turnos</span>
            </div>
            <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                {esGestion ? 'Monto Total Distribuido' : 'Mis Propinas Acumuladas'}
              </span>
              <p className="text-2xl font-bold text-amber-900 font-mono mt-1">
                ${(totalDistribuido / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-stone-400 mt-0.5 block">
                {esGestion ? 'Repartido entre colaboradores' : 'Asignado por tus turnos trabajados'}
              </span>
            </div>
          </div>

          {/* Tabla de Bolsas / Mis Propinas */}
          <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              {esGestion ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-3.5">ID</th>
                      <th className="py-3 px-3.5">Sucursal</th>
                      <th className="py-3 px-3.5">Fecha</th>
                      <th className="py-3 px-3.5">Monto de Bolsa</th>
                      <th className="py-3 px-3.5">Estado</th>
                      <th className="py-3 px-3.5">Asignaciones</th>
                      <th className="py-3 px-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cargando ? (
                      <tr>
                        <td colSpan={7}>
                          <LoadingState message="Cargando bolsas de propinas..." />
                        </td>
                      </tr>
                    ) : bolsas.length > 0 ? (
                      bolsas.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-3.5 text-stone-500 font-mono font-medium">#{item.id}</td>
                          <td className="py-3 px-3.5 font-semibold text-stone-900">{item.sucursal}</td>
                          <td className="py-3 px-3.5 text-stone-700 font-medium">{item.fecha}</td>
                          <td className="py-3 px-3.5 font-mono font-semibold text-stone-900">
                            ${(item.monto_centavos / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-3.5">
                            <Badge variant={item.estado === 'CALCULADA' ? 'success' : 'warning'}>
                              {item.estado}
                            </Badge>
                          </td>
                          <td className="py-3 px-3.5 text-stone-700 font-normal">
                            {item.asignaciones > 0 ? `${item.asignaciones} colaboradores` : 'Pendiente de cálculo'}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => calcularReparto(item.id)}
                            >
                              {item.estado === 'CALCULADA' ? 'Recalcular' : 'Distribuir'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-4">
                          <EmptyState
                            title="Sin bolsas registradas"
                            description="Aún no se han registrado bolsas de propinas para esta sucursal."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-3.5">Bolsa</th>
                      <th className="py-3 px-3.5">Sucursal</th>
                      <th className="py-3 px-3.5">Fecha</th>
                      <th className="py-3 px-3.5">Puntos / Horas Ponderadas</th>
                      <th className="py-3 px-3.5 text-right">Monto Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cargando ? (
                      <tr>
                        <td colSpan={5}>
                          <LoadingState message="Cargando tus propinas asignadas..." />
                        </td>
                      </tr>
                    ) : misPropinas.length > 0 ? (
                      misPropinas.map((item) => (
                        <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-3.5 text-stone-500 font-mono font-medium">#{item.bolsa_id}</td>
                          <td className="py-3 px-3.5 font-semibold text-stone-900">{item.sucursal}</td>
                          <td className="py-3 px-3.5 text-stone-700 font-medium">{item.fecha}</td>
                          <td className="py-3 px-3.5 font-mono text-stone-700">{item.horas_ponderadas.toFixed(2)} pts</td>
                          <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 text-right">
                            ${(item.monto_centavos / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4">
                          <EmptyState
                            title="Sin propinas asignadas"
                            description="Aún no tienes propinas distribuidas en tus turnos trabajados."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* POP-UP MODAL: Nueva Bolsa */}
          <Modal
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
            title="Nueva Bolsa de Propinas"
            description="Registra el acumulado diario de propinas de la sucursal."
          >
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCrear} className="space-y-3.5">
              <Select
                label="Sucursal *"
                value={sucursalId}
                onChange={(e) => setSucursalId(Number(e.target.value))}
                required
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Fecha de la Bolsa *"
                  type="date"
                  value={fecha}
                  max={hoyStr}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
                <Input
                  label="Monto Total ($ MXN) *"
                  type="number"
                  step="0.01"
                  value={montoPesos}
                  onChange={(e) => setMontoPesos(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardando}>
                  Registrar Bolsa
                </Button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}