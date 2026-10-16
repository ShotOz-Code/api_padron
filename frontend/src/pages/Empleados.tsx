import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ModalEmpleado from '../components/ModalEmpleado';
import KardexEmpleadoView from '../components/KardexEmpleadoView';
import ArbolJerarquicoPuestos from '../components/ArbolJerarquicoPuestos';
import GestionVacantes from '../components/GestionVacantes';
import GestionSucursales from '../components/GestionSucursales';
import { EmpleadosService, type Empleado, estaAutenticado } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Badge, LoadingState, EmptyState } from '../components/ui';
import {
  IconUsers,
  IconPlus,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconFileText,
} from '../components/ui/Icons';

type SeccionRH = 'plantilla' | 'kardex' | 'puestos' | 'vacantes' | 'sucursales';

export default function Empleados() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState<SeccionRH>('plantilla');
  const [empleadoKardexId, setEmpleadoKardexId] = useState<number | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarEmpleados = () => {
    setCargando(true);
    EmpleadosService.obtenerTodos()
      .then((data) => {
        setEmpleados(data);
        // Si no hay empleado seleccionado para Kardex y hay empleados, sugerir el primero
        if (!empleadoKardexId && data.length > 0) {
          setEmpleadoKardexId(data[0].id);
        }
      })
      .catch((err) => {
        setMensaje({ tipo: 'error', texto: err.message || 'Error al cargar empleados' });
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (!estaAutenticado()) {
      navigate('/');
      return;
    }
    cargarEmpleados();
  }, [navigate]);

  const toggleEstado = async (emp: Empleado) => {
    try {
      if (emp.activo === 1) {
        if (!confirm(`¿Dar de baja a ${emp.nombres} ${emp.apellido_paterno}?`)) return;
        await EmpleadosService.darDeBaja(emp.id);
        setMensaje({ tipo: 'ok', texto: 'Empleado dado de baja.' });
      } else {
        await EmpleadosService.reactivar(emp.id);
        setMensaje({ tipo: 'ok', texto: 'Empleado reactivado.' });
      }
      cargarEmpleados();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al actualizar estado' });
    }
    setTimeout(() => setMensaje(null), 4000);
  };

  const verKardexDe = (id: number) => {
    setEmpleadoKardexId(id);
    setSeccion('kardex');
  };

  const empleadosFiltrados = empleados.filter((emp) => {
    const texto = `${emp.numero_empleado} ${emp.nombres} ${emp.apellido_paterno} ${emp.sucursal} ${emp.puesto} ${emp.jefe_puesto || ''} ${emp.vacante_codigo || ''}`.toLowerCase();
    const coincideTexto = texto.includes(busqueda.toLowerCase());
    const coincideActivo =
      filtroActivo === 'todos' ||
      (filtroActivo === 'activos' && emp.activo === 1) ||
      (filtroActivo === 'inactivos' && emp.activo === 0);
    return coincideTexto && coincideActivo;
  });

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Navegación por pestañas del módulo de RH */}
          <div className="flex p-1 bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setSeccion('plantilla')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                seccion === 'plantilla'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              Plantilla de Personal
            </button>
            <button
              type="button"
              onClick={() => setSeccion('kardex')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                seccion === 'kardex'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <IconFileText size={14} />
              <span>Kardex de Usuario</span>
            </button>
            <button
              type="button"
              onClick={() => setSeccion('puestos')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                seccion === 'puestos'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              Organigrama
            </button>
            <button
              type="button"
              onClick={() => setSeccion('vacantes')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                seccion === 'vacantes'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              Vacantes y Plazas
            </button>
            <button
              type="button"
              onClick={() => setSeccion('sucursales')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                seccion === 'sucursales'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              Sucursales
            </button>
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
                type="button"
                onClick={() => setMensaje(null)}
                className="text-stone-400 hover:text-stone-700 ml-4 cursor-pointer"
              >
                <IconX size={14} />
              </button>
            </div>
          )}

          {/* VISTA 1: PLANTILLA DE PERSONAL */}
          {seccion === 'plantilla' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2.5">
                    <IconUsers size={20} className="text-amber-800" />
                    <span>Plantilla de Personal</span>
                  </h1>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Colaboradores activos, plazas asignadas y consulta de Kardex individual.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsModalOpen(true)}
                  className="self-start sm:self-auto text-xs"
                >
                  <IconPlus size={14} />
                  <span>Registrar Empleado</span>
                </Button>
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre, nómina, puesto, vacante o jefe..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-52">
                  <Select
                    value={filtroActivo}
                    onChange={(e) => setFiltroActivo(e.target.value)}
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="activos">Sólo Activos</option>
                    <option value="inactivos">Sólo Dados de Baja</option>
                  </Select>
                </div>
              </div>

              {/* Tabla de colaboradores */}
              <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
                {cargando ? (
                  <LoadingState message="Cargando expedientes de empleados..." />
                ) : empleadosFiltrados.length === 0 ? (
                  <EmptyState
                    title="Sin resultados"
                    description="No se encontraron colaboradores que coincidan con la búsqueda."
                    action={
                      <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                        Registrar Empleado
                      </Button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-3 px-3.5">No. Nómina</th>
                          <th className="py-3 px-3.5">Colaborador</th>
                          <th className="py-3 px-3.5">Puesto y Plaza</th>
                          <th className="py-3 px-3.5">Jefe Directo</th>
                          <th className="py-3 px-3.5">Sucursal</th>
                          <th className="py-3 px-3.5">Sueldo Semanal</th>
                          <th className="py-3 px-3.5">Estado</th>
                          <th className="py-3 px-3.5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {empleadosFiltrados.map((emp) => (
                          <tr
                            key={emp.id}
                            className="hover:bg-amber-50/40 transition-colors"
                          >
                            <td className="py-3 px-3.5 font-mono font-semibold text-stone-800">
                              {emp.numero_empleado}
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-stone-900">
                                {emp.nombres} {emp.apellido_paterno} {emp.apellido_materno || ''}
                              </div>
                              <div className="text-[10px] text-stone-500 font-normal">
                                {emp.correo || emp.telefono || 'Sin datos de contacto'}
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-stone-800">{emp.puesto}</div>
                              {emp.vacante_codigo ? (
                                <span className="text-[10px] text-amber-900 font-mono font-semibold">
                                  {emp.vacante_codigo}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 italic">Sin vacante ligada</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              {emp.jefe_puesto ? (
                                <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-[11px]">
                                  {emp.jefe_puesto}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic">Encargado General</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 font-normal text-stone-700">
                              {emp.sucursal}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-semibold text-stone-900">
                              ${(emp.sueldo_semanal_centavos / 100).toFixed(2)}
                            </td>
                            <td className="py-3 px-3.5">
                              <Badge variant={emp.activo === 1 ? 'success' : 'danger'}>
                                {emp.activo === 1 ? 'Activo' : 'Baja'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => verKardexDe(emp.id)}
                                >
                                  <IconFileText size={13} />
                                  <span>Ver Kardex</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={emp.activo === 1 ? 'danger' : 'outline'}
                                  onClick={() => toggleEstado(emp)}
                                >
                                  {emp.activo === 1 ? 'Dar Baja' : 'Activar'}
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
            </div>
          )}

          {/* VISTA 2: KARDEX DE USUARIO */}
          {seccion === 'kardex' && (
            <div className="space-y-4">
              {/* Barra de selección de colaborador para Kardex */}
              <div className="p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <IconFileText size={20} className="text-amber-800 shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">
                      Kardex Integral de Colaborador
                    </h2>
                    <p className="text-[11px] text-stone-500">
                      Selecciona a un trabajador para consultar su expediente y actualizar datos laborales permitidos.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-72">
                  <Select
                    value={empleadoKardexId || 0}
                    onChange={(e) => setEmpleadoKardexId(Number(e.target.value))}
                  >
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.numero_empleado} — {emp.nombres} {emp.apellido_paterno} ({emp.puesto})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {empleadoKardexId ? (
                <KardexEmpleadoView
                  empleadoId={empleadoKardexId}
                  onCerrar={() => setSeccion('plantilla')}
                  onEmpleadoActualizado={cargarEmpleados}
                />
              ) : (
                <div className="p-8 bg-white border border-stone-200/90 rounded-2xl text-center space-y-2">
                  <p className="text-sm font-semibold text-stone-700">Ningún colaborador seleccionado</p>
                  <p className="text-xs text-stone-500">
                    Elige un colaborador en el selector superior o desde la Plantilla de Personal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VISTA 3: ÁRBOL JERÁRQUICO DE PUESTOS */}
          {seccion === 'puestos' && <ArbolJerarquicoPuestos />}

          {/* VISTA 4: VACANTES Y PLAZAS */}
          {seccion === 'vacantes' && <GestionVacantes />}

          {/* VISTA 5: SUCURSALES */}
          {seccion === 'sucursales' && <GestionSucursales />}

          <ModalEmpleado
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onEmpleadoCreado={() => {
              cargarEmpleados();
              setMensaje({ tipo: 'ok', texto: 'Empleado guardado correctamente.' });
            }}
          />
        </main>
      </div>
    </div>
  );
}