import React, { useState, useEffect } from 'react';
import { CatalogosService, type Sucursal } from '../services/api';
import { Button, Input, Badge, LoadingState } from './ui';
import { IconPlus, IconCheck, IconAlertTriangle, IconX, IconRefresh } from './ui/Icons';

export default function GestionSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modal para crear / editar sucursal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState<Sucursal | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    activo: true,
  });

  const cargarSucursales = async () => {
    setCargando(true);
    try {
      const data = await CatalogosService.obtenerSucursales();
      setSucursales(data);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al cargar sucursales' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSucursales();
  }, []);

  const abrirCrear = () => {
    setSucursalEditando(null);
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      activo: true,
    });
    setModalAbierto(true);
  };

  const abrirEditar = (s: Sucursal) => {
    setSucursalEditando(s);
    setFormData({
      nombre: s.nombre,
      direccion: s.direccion,
      telefono: s.telefono || '',
      activo: s.activo,
    });
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const nom = formData.nombre.trim();
    const dir = formData.direccion.trim();
    if (!nom) {
      setMensaje({ tipo: 'error', texto: 'El nombre de la sucursal es obligatorio.' });
      return;
    }
    if (!dir) {
      setMensaje({ tipo: 'error', texto: 'La dirección es obligatoria.' });
      return;
    }

    setGuardando(true);
    try {
      if (sucursalEditando) {
        await CatalogosService.actualizarSucursal(sucursalEditando.id, {
          nombre: nom,
          direccion: dir,
          telefono: formData.telefono.trim(),
          activo: formData.activo,
        });
        setMensaje({ tipo: 'ok', texto: 'Sucursal actualizada correctamente.' });
      } else {
        await CatalogosService.crearSucursal({
          nombre: nom,
          direccion: dir,
          telefono: formData.telefono.trim(),
          activo: formData.activo,
        });
        setMensaje({ tipo: 'ok', texto: 'Sucursal dada de alta exitosamente en PADRÓN.' });
      }

      setModalAbierto(false);
      cargarSucursales();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar la sucursal' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Catálogo y Alta de Sucursales</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Registro oficial de ubicaciones operativas, cocinas centrales y puntos de venta de Cárnitas y Asada PADRÓN.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarSucursales}>
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={abrirCrear}>
            <IconPlus size={14} />
            <span>Dar de Alta Sucursal</span>
          </Button>
        </div>
      </div>

      {/* Feedback */}
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

      {/* Lista de sucursales */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden">
        {cargando ? (
          <div className="p-8">
            <LoadingState message="Cargando catálogo de sucursales..." />
          </div>
        ) : sucursales.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-stone-500 font-medium">No hay sucursales registradas.</p>
            <Button variant="primary" size="sm" onClick={abrirCrear}>
              Dar de Alta Primera Sucursal
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/70 border-b border-amber-200/60 text-stone-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5">Nombre de Sucursal</th>
                  <th className="py-3 px-3.5">Dirección</th>
                  <th className="py-3 px-3.5">Teléfono</th>
                  <th className="py-3 px-3.5">Estatus</th>
                  <th className="py-3 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sucursales.map((s) => (
                  <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-stone-600">#{s.id}</td>
                    <td className="py-3 px-3.5 font-bold text-stone-900">{s.nombre}</td>
                    <td className="py-3 px-3.5 text-stone-700">{s.direccion}</td>
                    <td className="py-3 px-3.5 font-mono text-stone-600">
                      {s.telefono || <span className="text-stone-400 italic">Sin teléfono</span>}
                    </td>
                    <td className="py-3 px-3.5">
                      <Badge variant={s.activo ? 'success' : 'danger'}>
                        {s.activo ? 'Operativa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => abrirEditar(s)}>
                        <span>Editar</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Sucursal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {sucursalEditando ? `Editar Sucursal: ${sucursalEditando.nombre}` : 'Dar de Alta Sucursal'}
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
              <Input
                label="Nombre de la Sucursal *"
                placeholder="Ej. Sucursal Cimatario, Matriz Juriquilla..."
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />

              <Input
                label="Dirección Completa *"
                placeholder="Calle, número, colonia, código postal..."
                value={formData.direccion}
                onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                required
              />

              <Input
                label="Teléfono de Contacto"
                placeholder="442 123 4567"
                value={formData.telefono}
                onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                maxLength={25}
              />

              <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-xs font-semibold text-stone-700">Estado de Operación:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-stone-800">
                    {formData.activo ? 'Sucursal Activa' : 'Sucursal Inactiva'}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={guardando}>
                  {guardando ? 'Guardando...' : sucursalEditando ? 'Guardar Cambios' : 'Registrar Sucursal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
