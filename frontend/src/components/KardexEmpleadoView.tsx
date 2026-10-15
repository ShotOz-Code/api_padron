import React, { useState, useEffect } from 'react';
import {
  EmpleadosService,
  CatalogosService,
  VacantesService,
  type KardexEmpleado,
  type Sucursal,
  type Puesto,
  type Vacante,
} from '../services/api';
import { Button, Input, Select, Badge, LoadingState } from './ui';
import {
  IconUser,
  IconLock,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconBanknote,
  IconCalendar,
  IconCoins,
} from './ui/Icons';

interface KardexEmpleadoViewProps {
  empleadoId: number;
  onCerrar?: () => void;
  onEmpleadoActualizado?: () => void;
}

export default function KardexEmpleadoView({
  empleadoId,
  onCerrar,
  onEmpleadoActualizado,
}: KardexEmpleadoViewProps) {
  const [kardex, setKardex] = useState<KardexEmpleado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Catálogos para edición de campos modificables
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [vacantes, setVacantes] = useState<Vacante[]>([]);

  // Pestaña de historial dentro del Kardex: 'incidencias' | 'permisos' | 'prestamos'
  const [tabHistorial, setTabHistorial] = useState<'incidencias' | 'permisos' | 'prestamos'>('incidencias');

  // Estado del formulario de campos modificables
  const [editData, setEditData] = useState({
    sucursal_id: 0,
    puesto_id: 0,
    vacante_id: 0,
    sueldo_semanal: '0.00',
    correo: '',
    telefono: '',
    activo: true,
  });

  const cargarKardex = async () => {
    setCargando(true);
    try {
      const [kardexData, sucs, psts, vacs] = await Promise.all([
        EmpleadosService.obtenerKardex(empleadoId),
        CatalogosService.obtenerSucursales().catch(() => []),
        CatalogosService.obtenerPuestos().catch(() => []),
        VacantesService.obtenerTodas().catch(() => []),
      ]);

      setKardex(kardexData);
      setSucursales(sucs.filter((s) => s.activo));
      setPuestos(psts.filter((p) => p.activo));
      setVacantes(vacs);

      const emp = kardexData.empleado;
      setEditData({
        sucursal_id: emp.sucursal_id,
        puesto_id: emp.puesto_id,
        vacante_id: emp.vacante_id || 0,
        sueldo_semanal: (emp.sueldo_semanal_centavos / 100).toFixed(2),
        correo: emp.correo || '',
        telefono: emp.telefono || '',
        activo: emp.activo === 1,
      });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al cargar el Kardex del colaborador' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (empleadoId > 0) {
      cargarKardex();
    }
  }, [empleadoId]);

  const handleGuardarModificaciones = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const sueldoNum = parseFloat(editData.sueldo_semanal);
    if (isNaN(sueldoNum) || sueldoNum <= 0) {
      setMensaje({ tipo: 'error', texto: 'El sueldo semanal debe ser un valor numérico mayor a cero.' });
      return;
    }

    setGuardando(true);
    try {
      await EmpleadosService.actualizar(empleadoId, {
        sucursal_id: Number(editData.sucursal_id),
        puesto_id: Number(editData.puesto_id),
        vacante_id: Number(editData.vacante_id),
        sueldo_semanal_centavos: Math.round(sueldoNum * 100),
        correo: editData.correo.trim(),
        telefono: editData.telefono.trim(),
        activo: editData.activo,
      });

      setMensaje({ tipo: 'ok', texto: 'Kardex y datos laborales actualizados correctamente.' });
      await cargarKardex();
      if (onEmpleadoActualizado) {
        onEmpleadoActualizado();
      }
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al actualizar el expediente' });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-8 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <LoadingState message="Cargando Kardex integral del colaborador..." />
      </div>
    );
  }

  if (!kardex) {
    return (
      <div className="p-6 bg-white border border-stone-200/90 rounded-2xl text-center space-y-3">
        <p className="text-sm text-stone-600 font-medium">No se pudo cargar la información del colaborador.</p>
        {onCerrar && (
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Volver
          </Button>
        )}
      </div>
    );
  }

  const { empleado, estadisticas, incidencias, permisos, prestamos } = kardex;
  const nombreCompleto = `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim();
  const mesesAntiguedad = Math.floor(estadisticas.dias_antiguedad / 30);

  // Vacantes disponibles más la actualmente asignada a este empleado
  const vacantesOpciones = vacantes.filter(
    (v) => v.estado === 'DISPONIBLE' || v.id === empleado.vacante_id
  );

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden space-y-5 p-5 sm:p-7">
      {/* Encabezado del Kardex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
            <IconUser size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-stone-900">{nombreCompleto}</h2>
              <Badge variant={empleado.activo === 1 ? 'success' : 'danger'}>
                {empleado.activo === 1 ? 'Colaborador Activo' : 'Baja'}
              </Badge>
              <Badge variant="neutral">Nómina: {empleado.numero_empleado}</Badge>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {empleado.puesto} — Sucursal: {empleado.sucursal}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCerrar && (
            <Button variant="outline" size="sm" onClick={onCerrar}>
              <IconX size={14} />
              <span>Cerrar Kardex</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notificaciones */}
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

      {/* Métricas rápidas del Kardex */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">Antigüedad</span>
          <p className="text-sm font-bold text-stone-900 mt-0.5">
            {mesesAntiguedad > 0 ? `${mesesAntiguedad} meses` : `${estadisticas.dias_antiguedad} días`}
          </p>
          <span className="text-[10px] text-stone-500 font-mono">Desde {empleado.fecha_ingreso}</span>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">Saldo Anticipos</span>
          <p className="text-sm font-bold text-stone-900 font-mono mt-0.5">
            ${(estadisticas.saldo_prestamos_centavos / 100).toFixed(2)}
          </p>
          <span className="text-[10px] text-stone-500 font-medium">
            {estadisticas.total_prestamos_activos} préstamo(s) activo(s)
          </span>
        </div>

        <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">Permisos</span>
          <p className="text-sm font-bold text-stone-900 mt-0.5">{estadisticas.total_permisos} registros</p>
          <span className="text-[10px] text-stone-500 font-medium">Historial acumulado</span>
        </div>

        <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">Incidencias</span>
          <p className="text-sm font-bold text-stone-900 mt-0.5">{estadisticas.total_incidencias} eventos</p>
          <span className="text-[10px] text-stone-500 font-medium">Turnos y disciplina</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* BLOQUE 1: DATOS PROTEGIDOS (READ-ONLY) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 bg-stone-100 rounded-xl text-stone-800 text-xs font-semibold">
            <IconLock size={15} className="text-amber-800 shrink-0" />
            <span>Datos Protegidos (Solo Lectura — Políticas RH PADRÓN)</span>
          </div>

          <div className="space-y-3 bg-stone-50/70 border border-stone-200/80 p-4 rounded-xl text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Nombre Completo (Bloqueado)
              </label>
              <input
                type="text"
                value={nombreCompleto}
                disabled
                className="w-full p-2 bg-stone-200/70 border border-stone-300/80 rounded-lg text-stone-800 font-semibold cursor-not-allowed text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  CURP (Bloqueado)
                </label>
                <input
                  type="text"
                  value={empleado.curp || 'No registrada'}
                  disabled
                  className="w-full p-2 bg-stone-200/70 border border-stone-300/80 rounded-lg text-stone-800 font-mono font-semibold cursor-not-allowed text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  No. Nómina (Bloqueado)
                </label>
                <input
                  type="text"
                  value={empleado.numero_empleado}
                  disabled
                  className="w-full p-2 bg-stone-200/70 border border-stone-300/80 rounded-lg text-stone-800 font-mono font-bold cursor-not-allowed text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Fecha de Ingreso (Bloqueado)
                </label>
                <input
                  type="date"
                  value={empleado.fecha_ingreso}
                  disabled
                  className="w-full p-2 bg-stone-200/70 border border-stone-300/80 rounded-lg text-stone-800 font-mono font-semibold cursor-not-allowed text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Usuario del Sistema (Bloqueado)
                </label>
                <input
                  type="text"
                  value={empleado.nombre_usuario || 'Sin usuario de acceso'}
                  disabled
                  className="w-full p-2 bg-stone-200/70 border border-stone-300/80 rounded-lg text-stone-800 font-mono font-semibold cursor-not-allowed text-xs"
                />
              </div>
            </div>

            <p className="text-[11px] text-stone-500 italic pt-1">
              * Por normas de auditoría, las identidades oficiales, nómina y usuarios de acceso se mantienen inmutables tras su registro inicial.
            </p>
          </div>
        </div>

        {/* BLOQUE 2: CAMPOS MODIFICABLES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl text-amber-950 text-xs font-semibold border border-amber-200/70">
            <IconCheck size={15} className="text-amber-800 shrink-0" />
            <span>Campos Laborales Modificables en Kardex</span>
          </div>

          <form onSubmit={handleGuardarModificaciones} className="space-y-3 bg-white border border-stone-200 p-4 rounded-xl text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Puesto de Trabajo *"
                value={editData.puesto_id}
                onChange={(e) => setEditData((prev) => ({ ...prev, puesto_id: Number(e.target.value) }))}
                required
              >
                {puestos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.es_critico ? '(Crítico)' : ''}
                  </option>
                ))}
              </Select>

              <Select
                label="Sucursal Asignada *"
                value={editData.sucursal_id}
                onChange={(e) => setEditData((prev) => ({ ...prev, sucursal_id: Number(e.target.value) }))}
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
              <Select
                label="Vacante / Plaza Asignada"
                value={editData.vacante_id}
                onChange={(e) => setEditData((prev) => ({ ...prev, vacante_id: Number(e.target.value) }))}
              >
                <option value={0}>Sin vacante específica asignada</option>
                {vacantesOpciones.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.codigo} — {v.titulo} ({v.sucursal})
                  </option>
                ))}
              </Select>

              <Input
                label="Sueldo Semanal ($ MXN) *"
                type="number"
                step="0.01"
                value={editData.sueldo_semanal}
                onChange={(e) => setEditData((prev) => ({ ...prev, sueldo_semanal: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Teléfono de Contacto"
                value={editData.telefono}
                onChange={(e) => setEditData((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="442 000 0000"
                maxLength={25}
              />

              <Input
                label="Correo Electrónico"
                type="email"
                value={editData.correo}
                onChange={(e) => setEditData((prev) => ({ ...prev, correo: e.target.value }))}
                placeholder="colaborador@padron.mx"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-xs font-semibold text-stone-700">Estatus del Colaborador:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditData((prev) => ({ ...prev, activo: true }))}
                  className={`px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-all ${
                    editData.activo
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => setEditData((prev) => ({ ...prev, activo: false }))}
                  className={`px-3 py-1 text-xs rounded-md font-semibold cursor-pointer transition-all ${
                    !editData.activo
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                  }`}
                >
                  Baja
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" disabled={guardando} className="w-full sm:w-auto">
                <IconCheck size={15} />
                <span>{guardando ? 'Guardando en Kardex...' : 'Guardar Modificaciones del Kardex'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* BLOQUE 3: HISTORIALES DEL KARDEX */}
      <div className="pt-4 border-t border-stone-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
            Expediente e Historial Cronológico
          </h3>

          <div className="flex p-1 bg-stone-100 rounded-xl gap-1 text-xs">
            <button
              type="button"
              onClick={() => setTabHistorial('incidencias')}
              className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                tabHistorial === 'incidencias'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Incidencias y Movimientos ({incidencias.length})
            </button>
            <button
              type="button"
              onClick={() => setTabHistorial('permisos')}
              className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                tabHistorial === 'permisos'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Permisos y Ausencias ({permisos.length})
            </button>
            <button
              type="button"
              onClick={() => setTabHistorial('prestamos')}
              className={`py-1 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                tabHistorial === 'prestamos'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Anticipos y Préstamos ({prestamos.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Incidencias */}
        {tabHistorial === 'incidencias' && (
          <div className="border border-stone-200/90 rounded-xl overflow-hidden bg-white">
            {incidencias.length === 0 ? (
              <p className="p-6 text-center text-xs text-stone-500 font-medium">
                Sin incidencias registradas en el expediente histórico.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Tipo de Evento</th>
                    <th className="py-2.5 px-3">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {incidencias.map((inc) => (
                    <tr key={inc.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-mono text-stone-700 font-medium whitespace-nowrap">
                        {inc.fecha_evento}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            inc.tipo.includes('FALTA')
                              ? 'danger'
                              : inc.tipo.includes('RETARDO')
                              ? 'warning'
                              : inc.tipo.includes('SALARIAL')
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {inc.tipo}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-stone-800 font-medium">{inc.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Permisos */}
        {tabHistorial === 'permisos' && (
          <div className="border border-stone-200/90 rounded-xl overflow-hidden bg-white">
            {permisos.length === 0 ? (
              <p className="p-6 text-center text-xs text-stone-500 font-medium">
                Sin solicitudes de permisos registradas.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Periodo</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Motivo</th>
                    <th className="py-2.5 px-3">Suplente</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {permisos.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-mono text-stone-700 font-medium whitespace-nowrap">
                        {p.fecha_inicio} al {p.fecha_fin}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-800">{p.tipo}</td>
                      <td className="py-2.5 px-3 text-stone-600">{p.motivo}</td>
                      <td className="py-2.5 px-3 text-stone-700">
                        {p.suplente ? p.suplente : <span className="text-stone-400 italic">N/A</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            p.estado === 'APROBADA'
                              ? 'success'
                              : p.estado === 'RECHAZADA'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {p.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Préstamos */}
        {tabHistorial === 'prestamos' && (
          <div className="border border-stone-200/90 rounded-xl overflow-hidden bg-white">
            {prestamos.length === 0 ? (
              <p className="p-6 text-center text-xs text-stone-500 font-medium">
                Sin solicitudes de anticipos o préstamos registradas.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Monto Original</th>
                    <th className="py-2.5 px-3">Saldo Actual</th>
                    <th className="py-2.5 px-3">Descuento Semanal</th>
                    <th className="py-2.5 px-3">Plazo</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {prestamos.map((pr) => (
                    <tr key={pr.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                        ${(pr.monto_original_centavos / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                        ${(pr.saldo_centavos / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-700">
                        ${(pr.descuento_semanal_centavos / 100).toFixed(2)}/sem
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">{pr.numero_semanas} semanas</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            pr.estado === 'LIQUIDADO'
                              ? 'success'
                              : pr.estado === 'APROBADO'
                              ? 'info'
                              : pr.estado === 'RECHAZADO'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {pr.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
