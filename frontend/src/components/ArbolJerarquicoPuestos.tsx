import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

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

type DireccionLayout = 'TB' | 'LR';

interface DatosNodoCupula extends Record<string, unknown> {
  titulo: string;
  totalOcupadas: number;
  direccion: DireccionLayout;
}

interface DatosNodoVacante extends Record<string, unknown> {
  codigo: string;
  titulo: string;
  puesto: string;
  sucursal: string;
  titularNombre: string;
  titularNomina: string;
  jefePuesto?: string | null;
  nivel: number;
  direccion: DireccionLayout;
}

const ANCHO_NODO = 290;
const ALTO_NODO = 185;
const ANCHO_CUPULA = 300;
const ALTO_CUPULA = 115;

function NodoCupula({ data }: NodeProps<Node<DatosNodoCupula>>) {
  const sourcePos = data.direccion === 'LR' ? Position.Right : Position.Bottom;

  return (
    <div className="w-[300px] rounded-2xl border-2 border-stone-900 bg-stone-900 text-white p-4 shadow-lg text-center select-none">
      <div className="flex items-center justify-center gap-2 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
        <IconBuilding size={13} />
        <span>PADRÓN</span>
      </div>
      <h3 className="text-base font-bold tracking-tight truncate">{data.titulo}</h3>
      <div className="mt-2 pt-2 border-t border-stone-700/80 flex items-center justify-center text-[11px] text-stone-300">
        <span>
          <strong className="text-amber-400">{data.totalOcupadas}</strong>{' '}
          {data.totalOcupadas === 1 ? 'Vacante Ocupada' : 'Vacantes Ocupadas'}
        </span>
      </div>
      <Handle
        type="source"
        position={sourcePos}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-stone-900"
      />
    </div>
  );
}

function NodoVacanteOcupada({ data }: NodeProps<Node<DatosNodoVacante>>) {
  const targetPos = data.direccion === 'LR' ? Position.Left : Position.Top;
  const sourcePos = data.direccion === 'LR' ? Position.Right : Position.Bottom;

  const headerEstilo =
    data.nivel === 1
      ? 'bg-amber-900 text-amber-50 border-amber-950'
      : data.nivel === 2
      ? 'bg-amber-600 text-stone-950 border-amber-700'
      : 'bg-stone-800 text-stone-100 border-stone-900';

  return (
    <div className="w-[290px] rounded-2xl border-2 border-stone-300 bg-white shadow-md overflow-hidden select-none">
      <Handle
        type="target"
        position={targetPos}
        className="!w-2.5 !h-2.5 !bg-stone-500 !border-2 !border-white"
      />

      {/* Cabecera con Código de Vacante y Puesto */}
      <div
        className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 ${headerEstilo}`}
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider truncate">
          {data.codigo} — {data.puesto}
        </span>
        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-black/20 shrink-0">
          Cubierta
        </span>
      </div>

      {/* Cuerpo informativo de la vacante ocupada */}
      <div className="p-3.5 space-y-2.5">
        <div>
          <h4 className="text-sm font-bold text-stone-950 leading-snug truncate">
            {data.titulo}
          </h4>
          <p className="text-[11px] text-stone-500 font-medium mt-0.5 truncate">
            {data.sucursal}
          </p>
        </div>

        {/* Datos del colaborador titular */}
        <div className="rounded-xl bg-[#faf7f2] border border-stone-200/80 p-2.5 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Titular de la Plaza
          </div>
          <div className="flex items-center justify-between gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200/70 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <IconUser size={12} className="text-amber-700 shrink-0" />
              <span className="font-bold text-stone-900 truncate">
                {data.titularNombre}
              </span>
            </div>
            {data.titularNomina && (
              <span className="text-[10px] font-mono font-bold text-amber-950 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                {data.titularNomina}
              </span>
            )}
          </div>
        </div>

        {/* Jerarquía */}
        {data.jefePuesto && (
          <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
            <span className="text-stone-400">Reporta a:</span>
            <span className="font-semibold text-stone-800 truncate max-w-[165px]">
              {data.jefePuesto}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={sourcePos}
        className="!w-2.5 !h-2.5 !bg-amber-700 !border-2 !border-white"
      />
    </div>
  );
}

const tiposNodos = {
  cupula: NodoCupula,
  vacanteOcupada: NodoVacanteOcupada,
};

function calcularLayoutDagre(
  nodes: Node[],
  edges: Edge[],
  direccion: DireccionLayout
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direccion,
    nodesep: direccion === 'TB' ? 50 : 40,
    ranksep: direccion === 'TB' ? 75 : 90,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    const esCupula = node.type === 'cupula';
    g.setNode(node.id, {
      width: esCupula ? ANCHO_CUPULA : ANCHO_NODO,
      height: esCupula ? ALTO_CUPULA : ALTO_NODO,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const nodosPosicion = nodes.map((node) => {
    const pos = g.node(node.id);
    const esCupula = node.type === 'cupula';
    const w = esCupula ? ANCHO_CUPULA : ANCHO_NODO;
    const h = esCupula ? ALTO_CUPULA : ALTO_NODO;

    return {
      ...node,
      targetPosition: direccion === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direccion === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });

  return { nodes: nodosPosicion, edges };
}

function LienzoOrganigrama({
  vacantesOcupadas,
  puestosMap,
  empleadosMap,
  nombreSucursalActual,
  direccion,
}: {
  vacantesOcupadas: Vacante[];
  puestosMap: Map<number, Puesto>;
  empleadosMap: Map<number, Empleado>;
  nombreSucursalActual: string;
  direccion: DireccionLayout;
}) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    const idCupula = 'cupula-padron';
    rawNodes.push({
      id: idCupula,
      type: 'cupula',
      position: { x: 0, y: 0 },
      data: {
        titulo: nombreSucursalActual,
        totalOcupadas: vacantesOcupadas.length,
        direccion,
      },
    });

    // Mapa de padre por vacante ocupada
    const padreDeVacante = new Map<number, number>();
    vacantesOcupadas.forEach((v) => {
      const puestoActual = puestosMap.get(v.puesto_id);
      const jefePuestoId = puestoActual?.jefe_puesto_id;
      if (jefePuestoId && jefePuestoId > 0) {
        const padre =
          vacantesOcupadas.find(
            (cand) =>
              cand.id !== v.id &&
              cand.puesto_id === jefePuestoId &&
              cand.sucursal_id === v.sucursal_id
          ) ||
          vacantesOcupadas.find(
            (cand) => cand.id !== v.id && cand.puesto_id === jefePuestoId
          );
        if (padre) {
          padreDeVacante.set(v.id, padre.id);
        }
      }
    });

    // Calcular nivel jerárquico de cada vacante evitando ciclos
    const obtenerNivel = (idVac: number): number => {
      let nivel = 1;
      let actual = idVac;
      const visitados = new Set<number>([actual]);
      while (padreDeVacante.has(actual)) {
        const pId = padreDeVacante.get(actual)!;
        if (visitados.has(pId)) break;
        visitados.add(pId);
        nivel++;
        actual = pId;
      }
      return nivel;
    };

    vacantesOcupadas.forEach((v) => {
      const puesto = puestosMap.get(v.puesto_id);
      const emp = v.empleado_id ? empleadosMap.get(v.empleado_id) : undefined;
      const titularNombre = emp
        ? `${emp.nombres} ${emp.apellido_paterno} ${emp.apellido_materno || ''}`.trim()
        : v.empleado || 'Titular asignado';
      const titularNomina = emp?.numero_empleado || '';
      const nivel = obtenerNivel(v.id);
      const nodoId = `vac-${v.id}`;

      rawNodes.push({
        id: nodoId,
        type: 'vacanteOcupada',
        position: { x: 0, y: 0 },
        data: {
          codigo: v.codigo,
          titulo: v.titulo,
          puesto: v.puesto,
          sucursal: v.sucursal,
          titularNombre,
          titularNomina,
          jefePuesto: puesto?.jefe_puesto,
          nivel,
          direccion,
        },
      });

      const padreId = padreDeVacante.get(v.id);
      const sourceId = padreId ? `vac-${padreId}` : idCupula;

      rawEdges.push({
        id: `edge-${sourceId}-${nodoId}`,
        source: sourceId,
        target: nodoId,
        type: 'smoothstep',
        style: { stroke: '#78716c', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#78716c',
          width: 16,
          height: 16,
        },
      });
    });

    return calcularLayoutDagre(rawNodes, rawEdges, direccion);
  }, [vacantesOcupadas, puestosMap, empleadosMap, nombreSucursalActual, direccion]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 250 });
    }, 60);
    return () => clearTimeout(timer);
  }, [nodes, direccion, fitView]);

  return (
    <div className="w-full h-[600px] bg-[#faf7f2]/50 rounded-2xl border border-stone-200/90 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={tiposNodos}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d6d3d1" gap={20} size={1.2} />
        <Controls showInteractive={false} className="!bg-white !border-stone-200 !shadow-sm !rounded-xl overflow-hidden" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.type === 'cupula' ? '#1c1917' : '#d97706')}
          maskColor="rgba(250, 247, 242, 0.75)"
          className="!bg-white !border !border-stone-200 !rounded-xl !shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}

export default function ArbolJerarquicoPuestos() {
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<number>(0);
  const [direccion, setDireccion] = useState<DireccionLayout>('TB');

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatosOrganigrama = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    cargarDatosOrganigrama();
  }, [cargarDatosOrganigrama]);

  const vacantesOcupadas = useMemo(
    () =>
      vacantes.filter(
        (v) =>
          v.estado === 'CUBIERTA' &&
          (sucursalFiltro === 0 || v.sucursal_id === sucursalFiltro)
      ),
    [vacantes, sucursalFiltro]
  );

  const puestosMap = useMemo(() => {
    const map = new Map<number, Puesto>();
    puestos.forEach((p) => map.set(p.id, p));
    return map;
  }, [puestos]);

  const empleadosMap = useMemo(() => {
    const map = new Map<number, Empleado>();
    empleados.forEach((e) => map.set(e.id, e));
    return map;
  }, [empleados]);

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

          {/* Selector de Orientación del Diagrama (Vertical / Horizontal) */}
          <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDireccion('TB')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                direccion === 'TB'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setDireccion('LR')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                direccion === 'LR'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Horizontal
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

      {/* Contenedor del Organigrama con motor Dagre + ReactFlow */}
      {cargando ? (
        <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs py-20">
          <LoadingState message="Cargando organigrama..." />
        </div>
      ) : vacantesOcupadas.length === 0 ? (
        <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs text-center py-20">
          <p className="text-sm font-semibold text-stone-600">
            No hay vacantes ocupadas registradas en {nombreSucursalActual.toLowerCase()}.
          </p>
        </div>
      ) : (
        <ReactFlowProvider>
          <LienzoOrganigrama
            vacantesOcupadas={vacantesOcupadas}
            puestosMap={puestosMap}
            empleadosMap={empleadosMap}
            nombreSucursalActual={nombreSucursalActual}
            direccion={direccion}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}
