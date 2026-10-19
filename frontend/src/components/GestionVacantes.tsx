import React, { useState, useEffect } from 'react';
import {
  VacantesService,
  CatalogosService,
  EmpleadosService,
  type Vacante,
  type Sucursal,
  type Puesto,
  type Empleado,
} from '../services/api';
import { Button, Input, Select, Badge, LoadingState } from './ui';
import {
  IconPlus,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconRefresh,
  IconUsers,
} from './ui/Icons';

export default function GestionVacantes() {
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroSucursal, setFiltroSucursal] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modal para crear / editar vacante
  const [modalAbierto, setModalAbierto] = useState(false);
  const [vacanteEditando, setVacanteEditando] = useState<Vacante | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Modal para dar de alta un nuevo puesto
  const [modalPuestoAbierto, setModalPuestoAbierto] = useState(false);
  const [guardandoPuesto, setGuardandoPuesto] = useState(false);
  const [puestoForm, setPuestoForm] = useState({
    nombre: '',
    descripcion: '',
    es_critico: false,
    requiere_suplente: false,
    factor_propina: 1.0,
    jefe_puesto_id: 0,
  });

  // Modal para asignar vacante a usuario
  const [modalAsignar, setModalAsignar] = useState<Vacante | null>(null);
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<number>(0);
  const [asignando, setAsignando] = useState(false);

  const [formData, setFormData] = useState({
    codigo: '',
    titulo: '',
    puesto_id: 1,
    sucursal_id: 1,
    sueldo_ofertado: '3500.00',
    requisitos: '',
    estado: 'DISPONIBLE' as Vacante['estado'],
  });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [vacs, sucs, psts, emps] = await Promise.all([
        VacantesService.obtenerTodas(),
        CatalogosService.obtenerSucursales().catch(() => []),
        CatalogosService.obtenerPuestos().catch(() => []),
        EmpleadosService.obtenerTodos({ activo: true }).catch(() => []),
      ]);

      setVacantes(vacs);
      setSucursales(sucs.filter((s) => s.activo));
      setPuestos(psts.filter((p) => p.activo));
      setEmpleados(emps);

      if (sucs.length > 0 && psts.length > 0) {
        setFormData((prev) => ({
          ...prev,
          sucursal_id: sucs[0].id,
          puesto_id: psts[0].id,
        }));
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al cargar las vacantes' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirCrear = () => {
    setVacanteEditando(null);
    const proximoNum = vacantes.length + 1;
    const codSugerido = `VAC-${String(proximoNum).padStart(3, '0')}`;

    setFormData({
      codigo: codSugerido,
      titulo: '',
      puesto_id: puestos[0]?.id || 1,
      sucursal_id: sucursales[0]?.id || 1,
      sueldo_ofertado: '3500.00',
      requisitos: '',
      estado: 'DISPONIBLE',
    });
    setModalAbierto(true);
  };

  const abrirEditar = (v: Vacante) => {
    setVacanteEditando(v);
    setFormData({
      codigo: v.codigo,
      titulo: v.titulo,
      puesto_id: v.puesto_id,
      sucursal_id: v.sucursal_id,
      sueldo_ofertado: (v.sueldo_ofertado_centavos / 100).toFixed(2),
      requisitos: v.requisitos || '',
      estado: v.estado,
    });
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const cod = formData.codigo.trim().toUpperCase();
    const tit = formData.titulo.trim();
    if (!cod) {
      setMensaje({ tipo: 'error', texto: 'El código de vacante es obligatorio.' });
      return;
    }
    if (!tit) {
      setMensaje({ tipo: 'error', texto: 'El título de la vacante es obligatorio.' });
      return;
    }

    const sueldoNum = parseFloat(formData.sueldo_ofertado);
    if (isNaN(sueldoNum) || sueldoNum <= 0) {
      setMensaje({ tipo: 'error', texto: 'El sueldo ofertado debe ser mayor a cero.' });
      return;
    }

    setGuardando(true);
    try {
      if (vacanteEditando) {
        await VacantesService.actualizar(vacanteEditando.id, {
          titulo: tit,
          puesto_id: Number(formData.puesto_id),
          sucursal_id: Number(formData.sucursal_id),
          estado: formData.estado,
          sueldo_ofertado_centavos: Math.round(sueldoNum * 100),
          requisitos: formData.requisitos.trim(),
        });
        setMensaje({ tipo: 'ok', texto: 'Vacante actualizada correctamente.' });
      } else {
        await VacantesService.crear({
          codigo: cod,
          titulo: tit,
          puesto_id: Number(formData.puesto_id),
          sucursal_id: Number(formData.sucursal_id),
          sueldo_ofertado_centavos: Math.round(sueldoNum * 100),
          requisitos: formData.requisitos.trim(),
        });
        setMensaje({ tipo: 'ok', texto: 'Vacante dada de alta exitosamente.' });
      }

      setModalAbierto(false);
      cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar vacante' });
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearPuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const nom = puestoForm.nombre.trim();
    if (!nom) {
      setMensaje({ tipo: 'error', texto: 'El nombre del puesto es obligatorio.' });
      return;
    }

    setGuardandoPuesto(true);
    try {
      await CatalogosService.crearPuesto({
        nombre: nom,
        descripcion: puestoForm.descripcion.trim(),
        es_critico: puestoForm.es_critico,
        requiere_suplente: puestoForm.requiere_suplente,
        factor_propina: Number(puestoForm.factor_propina),
        jefe_puesto_id:
          Number(puestoForm.jefe_puesto_id) > 0 ? Number(puestoForm.jefe_puesto_id) : null,
      } as any);
      setMensaje({ tipo: 'ok', texto: 'Puesto creado correctamente.' });
      setModalPuestoAbierto(false);
      setPuestoForm({
        nombre: '',
        descripcion: '',
        es_critico: false,
        requiere_suplente: false,
        factor_propina: 1.0,
        jefe_puesto_id: 0,
      });
      cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar puesto' });
    } finally {
      setGuardandoPuesto(false);
    }
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAsignar || !empleadoSeleccionadoId) return;

    setAsignando(true);
    try {
      await VacantesService.asignar(modalAsignar.id, empleadoSeleccionadoId);
      setMensaje({ tipo: 'ok', texto: 'Vacante asignada exitosamente al colaborador seleccionado.' });
      setModalAsignar(null);
      setEmpleadoSeleccionadoId(0);
      cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al asignar vacante' });
    } finally {
      setAsignando(false);
    }
  };

  const handleLiberar = async (v: Vacante) => {
    if (!confirm(`¿Liberar la vacante "${v.codigo} - ${v.titulo}"? Pasará a estar DISPONIBLE.`)) return;
    try {
      await VacantesService.liberar(v.id);
      setMensaje({ tipo: 'ok', texto: 'Vacante liberada y disponible para nueva asignación.' });
      cargarDatos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al liberar vacante' });
    }
  };

  const filtradas = vacantes.filter((v) => {
    const cumpleEstado = filtroEstado === 'todos' || v.estado === filtroEstado;
    const cumpleSucursal = filtroSucursal === 'todos' || String(v.sucursal_id) === filtroSucursal;
    return cumpleEstado && cumpleSucursal;
  });

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Gestión y Asignación de Vacantes
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos}>
            <IconRefresh size={14} />
            <span>Refrescar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalPuestoAbierto(true)}
          >
            <IconPlus size={14} />
            <span>Nuevo Puesto</span>
          </Button>
          <Button variant="primary" size="sm" onClick={abrirCrear}>
            <IconPlus size={14} />
            <span>Dar de Alta Vacante</span>
          </Button>
        </div>
      </div>

      {/* Notificación de feedback */}
      {mensaje && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'ok' ? <IconCheck size={15} /> : <IconAlertTriangle size={15} />}
            <span>{mensaje.texto}</span>
          </div>
          <button
            onClick={() => setMensaje(null)}
            className="text-stone-400 hover:text-stone-700 ml-3 cursor-pointer"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="w-full sm:w-52">
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="CUBIERTA">Cubiertas</option>
            <option value="PAUSADA">Pausadas</option>
            <option value="CANCELADA">Canceladas</option>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)}>
            <option value="todos">Todas las Sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tabla de vacantes */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
        {cargando ? (
          <div className="p-8">
            <LoadingState message="Cargando catálogo de vacantes y plazas..." />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-stone-500 font-medium">No se encontraron vacantes con los filtros seleccionados.</p>
            <Button variant="primary" size="sm" onClick={abrirCrear}>
              Dar de Alta Nueva Vacante
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Código</th>
                  <th className="py-3 px-3.5">Título de Plaza</th>
                  <th className="py-3 px-3.5">Puesto</th>
                  <th className="py-3 px-3.5">Sucursal</th>
                  <th className="py-3 px-3.5">Sueldo Ofertado</th>
                  <th className="py-3 px-3.5">Asignado a</th>
                  <th className="py-3 px-3.5">Estatus</th>
                  <th className="py-3 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtradas.map((v) => (
                  <tr key={v.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-amber-950">{v.codigo}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-stone-900">{v.titulo}</div>
                      {v.requisitos && (
                        <div className="text-[10px] text-stone-500 line-clamp-1">{v.requisitos}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-stone-800">{v.puesto}</td>
                    <td className="py-3 px-3.5 font-medium text-stone-700">{v.sucursal}</td>
                    <td className="py-3 px-3.5 font-mono font-bold text-stone-900">
                      ${(v.sueldo_ofertado_centavos / 100).toFixed(2)}/sem
                    </td>
                    <td className="py-3 px-3.5">
                      {v.empleado ? (
                        <span className="font-semibold text-stone-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {v.empleado}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Sin colaborador asignado</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <Badge
                        variant={
                          v.estado === 'DISPONIBLE'
                            ? 'warning'
                            : v.estado === 'CUBIERTA'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {v.estado}
                      </Badge>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {v.estado === 'DISPONIBLE' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setModalAsignar(v);
                              if (empleados.length > 0) setEmpleadoSeleccionadoId(empleados[0].id);
                            }}
                          >
                            <IconUsers size={13} />
                            <span>Asignar</span>
                          </Button>
                        ) : v.estado === 'CUBIERTA' ? (
                          <Button variant="outline" size="sm" onClick={() => handleLiberar(v)}>
                            <span>Liberar</span>
                          </Button>
                        ) : null}

                        <Button variant="outline" size="sm" onClick={() => abrirEditar(v)}>
                          <span>Editar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Vacante */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {vacanteEditando ? `Editar Vacante: ${vacanteEditando.codigo}` : 'Dar de Alta Vacante'}
              </h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Código *"
                  placeholder="VAC-001"
                  value={formData.codigo}
                  disabled={Boolean(vacanteEditando)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, codigo: e.target.value }))}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Título de la Plaza *"
                    placeholder="Ej. Maestro Carnitero Titular"
                    value={formData.titulo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Puesto Requerido *"
                  value={formData.puesto_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, puesto_id: Number(e.target.value) }))}
                  required
                >
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Sucursal Destino *"
                  value={formData.sucursal_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sucursal_id: Number(e.target.value) }))}
                  required
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Sueldo Ofertado Semanal ($ MXN) *"
                  type="number"
                  step="0.01"
                  value={formData.sueldo_ofertado}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sueldo_ofertado: e.target.value }))}
                  required
                />

                {vacanteEditando && (
                  <Select
                    label="Estado de la Vacante"
                    value={formData.estado}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value as any }))}
                  >
                    <option value="DISPONIBLE">DISPONIBLE</option>
                    <option value="CUBIERTA">CUBIERTA</option>
                    <option value="PAUSADA">PAUSADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </Select>
                )}
              </div>

              <Input
                label="Requisitos y Habilidades"
                placeholder="Ej. Experiencia mínima de 1 año en asador y cortes..."
                value={formData.requisitos}
                onChange={(e) => setFormData((prev) => ({ ...prev, requisitos: e.target.value }))}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={guardando}>
                  {guardando ? 'Guardando...' : vacanteEditando ? 'Actualizar Vacante' : 'Crear Vacante'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Puesto */}
      {modalPuestoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Dar de Alta Puesto</h3>
              <button
                type="button"
                onClick={() => setModalPuestoAbierto(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearPuesto} className="space-y-3.5 text-xs">
              <Input
                label="Nombre del Puesto *"
                placeholder="Ej. Maestro Carnitero, Parrillero, Cajero..."
                value={puestoForm.nombre}
                onChange={(e) => setPuestoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />

              <Input
                label="Descripción"
                placeholder="Funciones principales..."
                value={puestoForm.descripcion}
                onChange={(e) => setPuestoForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Jefe Inmediato"
                  value={puestoForm.jefe_puesto_id}
                  onChange={(e) =>
                    setPuestoForm((prev) => ({ ...prev, jefe_puesto_id: Number(e.target.value) }))
                  }
                >
                  <option value={0}>Mando de 1er Nivel</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Factor Propina"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="5.0"
                  value={puestoForm.factor_propina}
                  onChange={(e) =>
                    setPuestoForm((prev) => ({
                      ...prev,
                      factor_propina: parseFloat(e.target.value) || 1,
                    }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={puestoForm.es_critico}
                    onChange={(e) =>
                      setPuestoForm((prev) => ({
                        ...prev,
                        es_critico: e.target.checked,
                        requiere_suplente: e.target.checked ? prev.requiere_suplente : false,
                      }))
                    }
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-stone-800">Puesto Crítico</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={puestoForm.requiere_suplente}
                    disabled={!puestoForm.es_critico}
                    onChange={(e) =>
                      setPuestoForm((prev) => ({ ...prev, requiere_suplente: e.target.checked }))
                    }
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className={`font-semibold ${puestoForm.es_critico ? 'text-stone-800' : 'text-stone-400'}`}>
                    Exige Suplente
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalPuestoAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={guardandoPuesto}>
                  {guardandoPuesto ? 'Guardando...' : 'Crear Puesto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Vacante a Colaborador */}
      {modalAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                Asignar Plaza: {modalAsignar.codigo}
              </h3>
              <button
                type="button"
                onClick={() => setModalAsignar(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Selecciona el colaborador al que se le asignará la vacante{' '}
              <strong className="text-stone-900">{modalAsignar.titulo}</strong> en sucursal{' '}
              <strong className="text-stone-900">{modalAsignar.sucursal}</strong>:
            </p>

            <form onSubmit={handleAsignar} className="space-y-4 text-xs">
              <Select
                label="Colaborador de la Plantilla *"
                value={empleadoSeleccionadoId}
                onChange={(e) => setEmpleadoSeleccionadoId(Number(e.target.value))}
                required
              >
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombres} {emp.apellido_paterno} (Nómina: {emp.numero_empleado} — {emp.puesto})
                  </option>
                ))}
              </Select>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAsignar(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={asignando}>
                  {asignando ? 'Asignando...' : 'Confirmar Asignación'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
