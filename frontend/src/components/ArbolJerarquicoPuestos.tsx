import React, { useState, useEffect } from 'react';
import { CatalogosService, type Puesto } from '../services/api';
import { Button, Input, Select, Badge, LoadingState } from './ui';
import {
  IconUsers,
  IconPlus,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconRefresh,
} from './ui/Icons';

interface ArbolNodoProps {
  puesto: Puesto;
  todosPuestos: Puesto[];
  nivel: number;
  onEditar: (puesto: Puesto) => void;
  onAgregarSubordinado: (jefeId: number) => void;
}

function ArbolNodo({
  puesto,
  todosPuestos,
  nivel,
  onEditar,
  onAgregarSubordinado,
}: ArbolNodoProps) {
  const [expandido, setExpandido] = useState(true);

  // Subordinados directos
  const subordinados = todosPuestos.filter((p) => p.jefe_puesto_id === puesto.id);
  const tieneHijos = subordinados.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Tarjeta del puesto en el árbol */}
      <div
        className={`w-64 sm:w-72 p-3.5 rounded-2xl border transition-all shadow-xs ${
          puesto.es_critico
            ? 'bg-amber-50/90 border-amber-300/80 text-stone-900 shadow-amber-900/5'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-900 block mb-0.5">
              Nivel {nivel} {puesto.jefe_puesto ? `(Reporta a: ${puesto.jefe_puesto})` : '(Mando Superior)'}
            </span>
            <h4 className="text-sm font-bold truncate text-stone-950">{puesto.nombre}</h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {puesto.es_critico && (
              <Badge variant="warning" size="sm">
                Crítico
              </Badge>
            )}
          </div>
        </div>

        {puesto.descripcion && (
          <p className="text-[11px] text-stone-600 line-clamp-2 mt-1">{puesto.descripcion}</p>
        )}

        {/* Métricas del puesto */}
        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-stone-100 text-[11px]">
          <div className="flex items-center gap-1.5 text-stone-700">
            <IconUsers size={13} className="text-amber-800 shrink-0" />
            <span className="font-semibold text-stone-900">{puesto.num_empleados ?? 0}</span>
            <span className="text-[10px] text-stone-500">personal</span>
          </div>
          <div className="text-right text-stone-600">
            <span className="font-semibold text-amber-950">{puesto.num_vacantes ?? 0}</span>
            <span className="text-[10px] text-stone-500 ml-1">plazas</span>
          </div>
        </div>

        {/* Botones de acción del nodo */}
        <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => onEditar(puesto)}
            className="text-[11px] font-semibold text-stone-600 hover:text-amber-900 cursor-pointer"
          >
            Editar
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAgregarSubordinado(puesto.id)}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2 py-0.5 rounded bg-amber-100/70 cursor-pointer"
            >
              + Subordinado
            </button>
            {tieneHijos && (
              <button
                type="button"
                onClick={() => setExpandido(!expandido)}
                className="text-[10px] font-mono font-bold text-stone-500 hover:text-stone-800 px-1.5 py-0.5 rounded bg-stone-100 cursor-pointer"
                title={expandido ? 'Colapsar subordinados' : 'Expandir subordinados'}
              >
                {expandido ? `▲ (${subordinados.length})` : `▼ (${subordinados.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ramas hacia los subordinados */}
      {tieneHijos && expandido && (
        <div className="flex flex-col items-center w-full">
          {/* Línea vertical conectora inferior del padre */}
          <div className="w-0.5 h-6 bg-amber-400"></div>

          {/* Contenedor horizontal de hijos con líneas conectoras */}
          <div className="flex justify-center gap-6 relative pt-2">
            {subordinados.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-amber-300"
                style={{
                  left: `${100 / (subordinados.length * 2)}%`,
                  right: `${100 / (subordinados.length * 2)}%`,
                }}
              ></div>
            )}

            {subordinados.map((hijo) => (
              <div key={hijo.id} className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-amber-400 mb-1"></div>
                <ArbolNodo
                  puesto={hijo}
                  todosPuestos={todosPuestos}
                  nivel={nivel + 1}
                  onEditar={onEditar}
                  onAgregarSubordinado={onAgregarSubordinado}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArbolJerarquicoPuestos() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modal para crear / editar puesto
  const [modalAbierto, setModalAbierto] = useState(false);
  const [puestoEditando, setPuestoEditando] = useState<Puesto | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    es_critico: false,
    requiere_suplente: false,
    factor_propina: 1.0,
    jefe_puesto_id: 0,
    activo: true,
  });

  const cargarPuestos = async () => {
    setCargando(true);
    try {
      const data = await CatalogosService.obtenerPuestos();
      setPuestos(data);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al cargar puestos' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPuestos();
  }, []);

  const abrirCrear = (jefeId?: number) => {
    setPuestoEditando(null);
    setFormData({
      nombre: '',
      descripcion: '',
      es_critico: false,
      requiere_suplente: false,
      factor_propina: 1.0,
      jefe_puesto_id: jefeId || 0,
      activo: true,
    });
    setModalAbierto(true);
  };

  const abrirEditar = (p: Puesto) => {
    setPuestoEditando(p);
    setFormData({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      es_critico: p.es_critico,
      requiere_suplente: p.requiere_suplente,
      factor_propina: p.factor_propina,
      jefe_puesto_id: p.jefe_puesto_id || 0,
      activo: p.activo,
    });
    setModalAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const nom = formData.nombre.trim();
    if (!nom) {
      setMensaje({ tipo: 'error', texto: 'El nombre del puesto es obligatorio.' });
      return;
    }

    setGuardando(true);
    try {
      if (puestoEditando) {
        await CatalogosService.actualizarPuesto(puestoEditando.id, {
          nombre: nom,
          descripcion: formData.descripcion.trim(),
          es_critico: formData.es_critico,
          requiere_suplente: formData.requiere_suplente,
          factor_propina: Number(formData.factor_propina),
          jefe_puesto_id: Number(formData.jefe_puesto_id) > 0 ? Number(formData.jefe_puesto_id) : null,
          activo: formData.activo,
        });
        setMensaje({ tipo: 'ok', texto: 'Puesto actualizado correctamente en el organigrama.' });
      } else {
        await CatalogosService.crearPuesto({
          nombre: nom,
          descripcion: formData.descripcion.trim(),
          es_critico: formData.es_critico,
          requiere_suplente: formData.requiere_suplente,
          factor_propina: Number(formData.factor_propina),
          jefe_puesto_id: Number(formData.jefe_puesto_id) > 0 ? Number(formData.jefe_puesto_id) : null,
        } as any);
        setMensaje({ tipo: 'ok', texto: 'Nuevo puesto dado de alta exitosamente en la jerarquía.' });
      }

      setModalAbierto(false);
      cargarPuestos();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar puesto' });
    } finally {
      setGuardando(false);
    }
  };

  // Puestos raíces: no tienen jefe_puesto_id asignado o su jefe no existe
  const puestosRaiz = puestos.filter(
    (p) => !p.jefe_puesto_id || p.jefe_puesto_id === 0 || !puestos.some((padre) => padre.id === p.jefe_puesto_id)
  );

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Árbol Jerárquico y Catálogo de Puestos</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Organigrama interactivo de relaciones de mando, criticidad operativa y asignación de jefaturas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarPuestos}>
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => abrirCrear()}>
            <IconPlus size={14} />
            <span>Dar de Alta Puesto</span>
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

      {/* Contenedor del Árbol Interactivo */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs p-6 overflow-x-auto min-h-[460px] flex justify-center items-start">
        {cargando ? (
          <div className="py-12">
            <LoadingState message="Generando estructura de puestos y jerarquías..." />
          </div>
        ) : puestos.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-stone-500 font-medium">No hay puestos dados de alta en el sistema.</p>
            <Button variant="primary" size="sm" onClick={() => abrirCrear()}>
              Dar de Alta Primer Puesto
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-12 py-4">
            {puestosRaiz.map((raiz) => (
              <ArbolNodo
                key={raiz.id}
                puesto={raiz}
                todosPuestos={puestos}
                nivel={1}
                onEditar={abrirEditar}
                onAgregarSubordinado={(jefeId) => abrirCrear(jefeId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Puesto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {puestoEditando ? `Editar Puesto: ${puestoEditando.nombre}` : 'Dar de Alta Nuevo Puesto'}
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
                label="Nombre del Puesto *"
                placeholder="Ej. Maestro Carnitero, Parrillero, etc."
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />

              <Input
                label="Descripción / Funciones Clave"
                placeholder="Responsabilidades principales del puesto..."
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Jefe Directo en Jerarquía"
                  value={formData.jefe_puesto_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jefe_puesto_id: Number(e.target.value) }))}
                >
                  <option value={0}>Ninguno (Puesto Superior Autónomo)</option>
                  {puestos
                    .filter((p) => !puestoEditando || p.id !== puestoEditando.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                </Select>

                <Input
                  label="Factor de Ponderación Propina"
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="5.0"
                  value={formData.factor_propina}
                  onChange={(e) => setFormData((prev) => ({ ...prev, factor_propina: parseFloat(e.target.value) || 1 }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_critico}
                    onChange={(e) => setFormData((prev) => ({ ...prev, es_critico: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-stone-800">Puesto Crítico</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiere_suplente}
                    disabled={!formData.es_critico}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requiere_suplente: e.target.checked }))}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className={`font-semibold ${formData.es_critico ? 'text-stone-800' : 'text-stone-400'}`}>
                    Requiere Suplente
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={guardando}>
                  {guardando ? 'Guardando...' : puestoEditando ? 'Actualizar Puesto' : 'Crear Puesto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
