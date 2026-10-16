import { useState, useEffect } from 'react';
import {
  CatalogosService,
  EmpleadosService,
  VacantesService,
  type Puesto,
  type Empleado,
  type Sucursal,
  type Vacante,
} from '../services/api';
import { Button, Select, LoadingState, Badge } from './ui';
import {
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconRefresh,
  IconBuilding,
  IconUser,
} from './ui/Icons';

interface NodoVacanteOcupada {
  vacante: Vacante;
  puesto?: Puesto;
  empleado?: Empleado;
  hijos: NodoVacanteOcupada[];
}

interface TarjetaNodoOrganigramaProps {
  nodo: NodoVacanteOcupada;
  nivel: number;
}

function TarjetaNodoOrganigrama({ nodo, nivel }: TarjetaNodoOrganigramaProps) {
  const { vacante, puesto, empleado, hijos } = nodo;
  const tieneHijos = hijos.length > 0;

  const headerEstilo =
    nivel === 1
      ? 'bg-amber-900 text-amber-50 border-amber-950'
      : nivel === 2
      ? 'bg-amber-600 text-stone-950 border-amber-700'
      : 'bg-stone-800 text-stone-100 border-stone-900';

  const nombreTitular = empleado
    ? `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno || ''}`.trim()
    : vacante.empleado || 'Titular asignado';

  const nominaTitular = empleado?.numero_empleado || '';

  return (
    <div className="flex flex-col items-center">
      {/* Tarjeta Informativa de Vacante Ocupada */}
      <div className="w-68 sm:w-74 rounded-2xl border-2 border-stone-300 bg-white shadow-sm overflow-hidden">
        {/* Cabecera con Código de Vacante y Puesto */}
        <div
          className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 ${headerEstilo}`}
        >
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider truncate">
            {vacante.codigo} — {vacante.puesto}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-black/20 shrink-0">
            Cubierta
          </span>
        </div>

        {/* Cuerpo informativo de la vacante ocupada */}
        <div className="p-3.5 space-y-2.5">
          <div>
            <h4 className="text-sm font-bold text-stone-950 leading-snug">
              {vacante.titulo}
            </h4>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              {vacante.sucursal}
            </p>
          </div>

          {/* Datos del colaborador que ocupa la vacante */}
          <div className="rounded-xl bg-[#faf7f2] border border-stone-200/80 p-2.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Titular de la Plaza
            </div>
            <div className="flex items-center justify-between gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200/70 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <IconUser size={12} className="text-amber-700 shrink-0" />
                <span className="font-bold text-stone-900 truncate">
                  {nombreTitular}
                </span>
              </div>
              {nominaTitular && (
                <span className="text-[10px] font-mono font-bold text-amber-950 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                  {nominaTitular}
                </span>
              )}
            </div>
          </div>

          {/* Información de jerarquía */}
          {puesto?.jefe_puesto && (
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
              <span className="text-stone-400">Reporta a:</span>
              <span className="font-semibold text-stone-800 truncate max-w-[160px]">
                {puesto.jefe_puesto}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Conectores ortogonales hacia vacantes subordinadas */}
      {tieneHijos && (
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-6 bg-stone-400"></div>

          <div className="flex items-start justify-center">
            {hijos.map((hijo, idx) => {
              const esUnico = hijos.length === 1;
              const esPrimero = idx === 0;
              const esUltimo = idx === hijos.length - 1;

              return (
                <div
                  key={hijo.vacante.id}
                  className="flex flex-col items-center relative px-3 sm:px-4"
                >
                  {!esUnico && (
                    <>
                      <div
                        className={`absolute top-0 left-0 w-1/2 h-0.5 ${
                          esPrimero ? 'bg-transparent' : 'bg-stone-400'
                        }`}
                      />
                      <div
                        className={`absolute top-0 right-0 w-1/2 h-0.5 ${
                          esUltimo ? 'bg-transparent' : 'bg-stone-400'
                        }`}
                      />
                    </>
                  )}

                  <div className="w-0.5 h-6 bg-stone-400"></div>

                  <TarjetaNodoOrganigrama nodo={hijo} nivel={nivel + 1} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArbolJerarquicoPuestos() {
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<number>(0);
  const [escala, setEscala] = useState<number>(100);

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatosOrganigrama = async () => {
    setCargando(true);
    try {
      const [vacantesData, puestosData, empleadosData, sucursalesData] = await Promise.all([
        VacantesService.obtenerTodas(),
        CatalogosService.obtenerPuestos(),
        EmpleadosService.obtenerTodos(),
        CatalogosService.obtenerSucursales(),
      ]);
      setVacantes(vacantesData);
      setPuestos(puestosData);
      setEmpleados(empleadosData);
      setSucursales(sucursalesData);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.message || 'Error al cargar el organigrama',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosOrganigrama();
  }, []);

  // Filtrar únicamente vacantes ocupadas (CUBIERTA) y por sucursal si aplica
  const vacantesOcupadas = vacantes.filter(
    (v) =>
      v.estado === 'CUBIERTA' &&
      (sucursalFiltro === 0 || v.sucursal_id === sucursalFiltro)
  );

  const puestosMap = new Map<number, Puesto>();
  puestos.forEach((p) => puestosMap.set(p.id, p));

  const empleadosMap = new Map<number, Empleado>();
  empleados.forEach((e) => empleadosMap.set(e.id, e));

  // Construir árbol jerárquico exclusivamente con las vacantes ocupadas
  const construirArbolVacantes = (): NodoVacanteOcupada[] => {
    const nodosMap = new Map<number, NodoVacanteOcupada>();

    vacantesOcupadas.forEach((v) => {
      nodosMap.set(v.id, {
        vacante: v,
        puesto: puestosMap.get(v.puesto_id),
        empleado: v.empleado_id ? empleadosMap.get(v.empleado_id) : undefined,
        hijos: [],
      });
    });

    const raices: NodoVacanteOcupada[] = [];

    vacantesOcupadas.forEach((v) => {
      const nodoActual = nodosMap.get(v.id)!;
      const puestoActual = nodoActual.puesto;
      const jefePuestoId = puestoActual?.jefe_puesto_id;

      let padreVacante: Vacante | undefined;
      if (jefePuestoId && jefePuestoId > 0) {
        // Buscar vacante ocupada cuyo puesto sea el jefe_puesto_id (priorizando la misma sucursal)
        padreVacante =
          vacantesOcupadas.find(
            (cand) =>
              cand.id !== v.id &&
              cand.puesto_id === jefePuestoId &&
              cand.sucursal_id === v.sucursal_id
          ) ||
          vacantesOcupadas.find(
            (cand) => cand.id !== v.id && cand.puesto_id === jefePuestoId
          );
      }

      if (padreVacante && nodosMap.has(padreVacante.id)) {
        nodosMap.get(padreVacante.id)!.hijos.push(nodoActual);
      } else {
        raices.push(nodoActual);
      }
    });

    return raices;
  };

  const nodosRaiz = construirArbolVacantes();

  const nombreSucursalActual =
    sucursalFiltro > 0
      ? sucursales.find((s) => s.id === sucursalFiltro)?.nombre || 'Sucursal'
      : 'Todas las Sucursales';

  return (
    <div className="space-y-4">
      {/* Cabecera Informativa y Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Organigrama de Vacantes Ocupadas
          </h2>
          <Badge variant="default">Informativo</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Sucursal */}
          <div className="w-52">
            <Select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(Number(e.target.value))}
            >
              <option value={0}>Todas las sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </div>

          {/* Controles de Escala / Zoom */}
          <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setEscala((s) => Math.max(75, s - 10))}
              className="px-2 py-1 font-bold text-stone-600 hover:text-stone-950 cursor-pointer"
              title="Reducir vista"
            >
              -
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold text-stone-700">
              {escala}%
            </span>
            <button
              type="button"
              onClick={() => setEscala((s) => Math.min(115, s + 10))}
              className="px-2 py-1 font-bold text-stone-600 hover:text-stone-950 cursor-pointer"
              title="Ampliar vista"
            >
              +
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={cargarDatosOrganigrama}>
            <IconRefresh size={14} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Mensaje de Error si ocurre */}
      {mensaje && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'ok' ? (
              <IconCheck size={15} />
            ) : (
              <IconAlertTriangle size={15} />
            )}
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

      {/* Lienzo Informativo del Organigrama */}
      <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs p-6 overflow-x-auto min-h-[500px]">
        {cargando ? (
          <div className="py-16">
            <LoadingState message="Cargando organigrama..." />
          </div>
        ) : vacantesOcupadas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-semibold text-stone-600">
              No hay vacantes ocupadas registradas en {nombreSucursalActual.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center min-w-max mx-auto py-4 transition-transform origin-top"
            style={{ transform: `scale(${escala / 100})` }}
          >
            {/* Nodo Superior de Sucursal / Empresa */}
            <div className="w-76 rounded-2xl border-2 border-stone-900 bg-stone-900 text-white p-4 shadow-md text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
                <IconBuilding size={13} />
                <span>PADRÓN</span>
              </div>
              <h3 className="text-base font-bold tracking-tight">
                {nombreSucursalActual}
              </h3>
              <div className="mt-2 pt-2 border-t border-stone-700/80 flex items-center justify-center text-[11px] text-stone-300">
                <span>
                  <strong className="text-amber-400">{vacantesOcupadas.length}</strong>{' '}
                  {vacantesOcupadas.length === 1 ? 'Vacante Ocupada' : 'Vacantes Ocupadas'}
                </span>
              </div>
            </div>

            {/* Conector vertical hacia el primer nivel de vacantes ocupadas */}
            <div className="w-0.5 h-7 bg-stone-400"></div>

            {/* Ramas de vacantes ocupadas */}
            <div className="flex items-start justify-center">
              {nodosRaiz.map((raiz, idx) => {
                const esUnico = nodosRaiz.length === 1;
                const esPrimero = idx === 0;
                const esUltimo = idx === nodosRaiz.length - 1;

                return (
                  <div
                    key={raiz.vacante.id}
                    className="flex flex-col items-center relative px-4 sm:px-6"
                  >
                    {!esUnico && (
                      <>
                        <div
                          className={`absolute top-0 left-0 w-1/2 h-0.5 ${
                            esPrimero ? 'bg-transparent' : 'bg-stone-400'
                          }`}
                        />
                        <div
                          className={`absolute top-0 right-0 w-1/2 h-0.5 ${
                            esUltimo ? 'bg-transparent' : 'bg-stone-400'
                          }`}
                        />
                      </>
                    )}
                    <div className="w-0.5 h-6 bg-stone-400"></div>

                    <TarjetaNodoOrganigrama nodo={raiz} nivel={1} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
