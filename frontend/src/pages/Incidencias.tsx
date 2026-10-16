import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { IncidenciasService, EmpleadosService, type IncidenciaHistorica, type Empleado, estaAutenticado } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Modal, Badge, EmptyState, LoadingState } from '../components/ui';
import { IconAlertTriangle, IconPlus, IconX, IconCheck } from '../components/ui/Icons';

const TIPOS_INCIDENCIA = [
  'RETARDO',
  'FALTA_JUSTIFICADA',
  'FALTA_INJUSTIFICADA',
  'ASISTENCIA_DIA_PICO',
  'CAMBIO_SALARIAL',
  'CAMBIO_PUESTO',
  'PERMISO',
  'PRESTAMO',
  'OTRO',
];

export default function Incidencias() {
  const navigate = useNavigate();
  const hoyStr = new Date().toISOString().split('T')[0];

  const [incidencias, setIncidencias] = useState<IncidenciaHistorica[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<number>(0);
  const [tipo, setTipo] = useState('RETARDO');
  const [fechaEvento, setFechaEvento] = useState(hoyStr);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState('');
  const [mensajeOk, setMensajeOk] = useState('');

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [hist, emps] = await Promise.all([
        IncidenciasService.obtenerHistorico(),
        EmpleadosService.obtenerTodos({ activo: true }),
      ]);
      setIncidencias(hist);
      setEmpleados(emps);
      if (emps.length > 0 && empleadoId === 0) {
        setEmpleadoId(emps[0].id);
      }
    } catch (err: any) {
      console.error(err);
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
    setMensajeOk('');

    if (!empleadoId || empleadoId <= 0) {
      setFormError('Debes seleccionar un empleado.');
      return;
    }
    if (!fechaEvento) {
      setFormError('La fecha del evento es obligatoria.');
      return;
    }
    if (!descripcion.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }

    setGuardando(true);
    try {
      const fn = IncidenciasService.crearManual || IncidenciasService.crear;
      await fn({
        empleado_id: Number(empleadoId),
        tipo,
        fecha_evento: fechaEvento,
        descripcion: descripcion.trim(),
      });

      setMensajeOk('Incidencia registrada de forma inmutable en la bitácora.');
      setModalAbierto(false);
      setDescripcion('');
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar incidencia');
    } finally {
      setGuardando(false);
    }
  };

  const getTipoBadgeVariant = (t: string) => {
    if (t.includes('FALTA')) return 'danger';
    if (t === 'RETARDO') return 'warning';
    if (t === 'ASISTENCIA_DIA_PICO') return 'success';
    return 'default';
  };

  const filtradas = incidencias.filter((item) => {
    const texto = `${item.numero_empleado} ${item.empleado} ${item.tipo} ${item.descripcion}`.toLowerCase();
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
              <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
                <IconAlertTriangle size={20} className="text-amber-800" />
                <span>Bitácora de Incidencias</span>
              </h1>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormError('');
                setModalAbierto(true);
              }}
            >
              <IconPlus size={14} />
              <span>Registrar Incidencia</span>
            </Button>
          </div>

          {mensajeOk && (
            <div className="p-3 rounded-xl border text-xs font-medium flex items-center justify-between bg-emerald-50 border-emerald-200 text-emerald-800">
              <div className="flex items-center gap-2">
                <IconCheck size={15} />
                <span>{mensajeOk}</span>
              </div>
              <button onClick={() => setMensajeOk('')} className="text-stone-400 hover:text-stone-700 ml-2 cursor-pointer">
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* Buscador */}
          <div className="my-2">
            <Input
              placeholder="Buscar en bitácora por empleado, tipo o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Tabla de incidencias */}
          <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-3.5">ID</th>
                    <th className="py-3 px-3.5">Colaborador</th>
                    <th className="py-3 px-3.5">Tipo de Incidencia</th>
                    <th className="py-3 px-3.5">Fecha del Evento</th>
                    <th className="py-3 px-3.5">Descripción / Hechos</th>
                    <th className="py-3 px-3.5">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cargando ? (
                    <tr>
                      <td colSpan={6}>
                        <LoadingState message="Cargando bitácora de incidencias..." />
                      </td>
                    </tr>
                  ) : filtradas.length > 0 ? (
                    filtradas.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-3.5 text-stone-500 font-mono font-medium">#{item.id}</td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-stone-900">{item.empleado}</div>
                          <div className="text-[10px] text-stone-500 font-mono">{item.numero_empleado}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <Badge variant={getTipoBadgeVariant(item.tipo)}>{item.tipo}</Badge>
                        </td>
                        <td className="py-3 px-3.5 text-stone-700 font-medium">{item.fecha_evento}</td>
                        <td className="py-3 px-3.5 text-stone-800 max-w-md font-normal leading-relaxed">{item.descripcion}</td>
                        <td className="py-3 px-3.5 text-stone-600 text-xs font-medium">{item.creado_por || 'Sistema'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <EmptyState
                          title="No se encontraron incidencias"
                          description="La bitácora no tiene registros con los filtros actuales."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POP-UP MODAL: Registrar Incidencia */}
          <Modal
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
            title="Registrar Incidencia"
          >
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleCrear} className="space-y-3.5">
              <Select
                label="Empleado *"
                value={empleadoId}
                onChange={(e) => setEmpleadoId(Number(e.target.value))}
                required
              >
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombres} {emp.apellido_paterno} ({emp.numero_empleado}) — {emp.puesto}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Tipo de Evento *"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                >
                  {TIPOS_INCIDENCIA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Fecha del Evento *"
                  type="date"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Descripción / Hechos Observados *
                </label>
                <textarea
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  placeholder="Detalla lo sucedido con precisión y neutralidad..."
                  className="w-full bg-white border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 rounded-lg p-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={guardando}>
                  Guardar en Bitácora
                </Button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </div>
  );
}