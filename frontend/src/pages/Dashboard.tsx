import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
  EmpleadosService,
  PrestamosService,
  PermisosService,
  PropinasService,
  obtenerRol,
  type Rol,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LoadingState, Badge } from '../components/ui';
import {
  IconUsers,
  IconCalendar,
  IconCoins,
  IconBanknote,
  IconAlertTriangle,
  IconBarChart,
  IconInbox,
  IconArrowRight,
} from '../components/ui/Icons';
import { LOGO_IMG } from '../assets/logo';

export default function Dashboard() {
  const navigate = useNavigate();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const esGestion = rol === 'RH_ADMIN' || rol === 'ENCARGADO';

  const [stats, setStats] = useState({
    empleadosTotales: 0,
    empleadosActivos: 0,
    prestamosPendientes: 0,
    permisosPendientes: 0,
    bolsasPropinas: 0,
    misPrestamosActivos: 0,
    misPermisosActivos: 0,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        if (esGestion) {
          const [empleados, prestamos, permisos, propinas] = await Promise.allSettled([
            EmpleadosService.obtenerTodos(),
            PrestamosService.obtenerTodos(),
            PermisosService.obtenerTodos(),
            PropinasService.obtenerBolsas(),
          ]);

          const empList = empleados.status === 'fulfilled' ? empleados.value : [];
          const prestList = prestamos.status === 'fulfilled' ? prestamos.value : [];
          const permList = permisos.status === 'fulfilled' ? permisos.value : [];
          const propList = propinas.status === 'fulfilled' ? propinas.value : [];

          setStats({
            empleadosTotales: empList.length,
            empleadosActivos: empList.filter((e) => e.activo === 1).length,
            prestamosPendientes: prestList.filter((p) => p.estado === 'PENDIENTE').length,
            permisosPendientes: permList.filter((p) => p.estado.startsWith('PENDIENTE')).length,
            bolsasPropinas: propList.length,
            misPrestamosActivos: 0,
            misPermisosActivos: 0,
          });
        } else {
          const [misPrestamos, misPermisos] = await Promise.allSettled([
            PrestamosService.obtenerMios(),
            PermisosService.obtenerMios(),
          ]);

          const pList = misPrestamos.status === 'fulfilled' ? misPrestamos.value : [];
          const permList = misPermisos.status === 'fulfilled' ? misPermisos.value : [];

          setStats({
            empleadosTotales: 0,
            empleadosActivos: 0,
            prestamosPendientes: 0,
            permisosPendientes: 0,
            bolsasPropinas: 0,
            misPrestamosActivos: pList.filter((p) => p.estado === 'APROBADO' || p.estado === 'PENDIENTE').length,
            misPermisosActivos: permList.filter((p) => p.estado.startsWith('PENDIENTE') || p.estado === 'APROBADA').length,
          });
        }
      } catch (err) {
        console.error('Error cargando indicadores:', err);
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [esGestion]);

  const modulos = [
    {
      titulo: 'Personal y Vacantes',
      desc: 'Altas, bajas, puestos y asignación de jefes directos.',
      ruta: '/empleados',
      icono: IconUsers,
      badge: `${stats.empleadosActivos} Activos`,
      roles: ['RH_ADMIN', 'ENCARGADO'] as Rol[],
    },
    {
      titulo: 'Permisos y Ausencias',
      desc: esGestion ? 'Aprobar o denegar descansos, vacaciones y faltas.' : 'Solicitar permiso o consultar estado de trámites.',
      ruta: '/permisos',
      icono: IconCalendar,
      badge: esGestion ? `${stats.permisosPendientes} Por Revisar` : `${stats.misPermisosActivos} Mis Permisos`,
      roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'] as Rol[],
    },
    {
      titulo: 'Bolsas de Propinas',
      desc: 'Reparto transparente de puntos entre turnos y puestos.',
      ruta: '/propinas',
      icono: IconCoins,
      badge: esGestion ? `${stats.bolsasPropinas} Bolsas` : 'Consultar',
      roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'] as Rol[],
    },
    {
      titulo: 'Préstamos y Anticipos',
      desc: esGestion ? 'Autorizar adelantos y retenciones semanales de nómina.' : 'Revisar saldo remanente y abonos programados.',
      ruta: '/prestamos',
      icono: IconBanknote,
      badge: esGestion ? `${stats.prestamosPendientes} Pendientes` : `${stats.misPrestamosActivos} Activos`,
      roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'] as Rol[],
    },
    {
      titulo: 'Incidencias del Turno',
      desc: 'Bitácora operativa de retardos, ausencias y notas.',
      ruta: '/incidencias',
      icono: IconAlertTriangle,
      badge: 'Bitácora',
      roles: ['RH_ADMIN', 'ENCARGADO'] as Rol[],
    },
    {
      titulo: 'Reportes y Auditoría',
      desc: 'Estadísticas de ausentismo crítico, rotación y deducciones.',
      ruta: '/reportes',
      icono: IconBarChart,
      badge: 'Estadísticas',
      roles: ['RH_ADMIN', 'ENCARGADO'] as Rol[],
    },
    {
      titulo: 'Buzón de Sugerencias',
      desc: 'Canal directo y confidencial para quejas y mejoras.',
      ruta: '/solicitudes',
      icono: IconInbox,
      badge: 'Buzón',
      roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'] as Rol[],
    },
  ].filter((m) => m.roles.includes(rol));

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Barra de cabecera limpia */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200/90 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3.5">
              <img
                src={LOGO_IMG}
                alt="Logo Padrón"
                className="w-12 h-12 rounded-xl object-cover border border-amber-300 shadow-2xs"
              />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight leading-tight">
                  PADRÓN — SISTEMA DE CONTROL
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Gestión Operativa de Recursos Humanos y Turnos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-semibold text-amber-900">
              <IconCalendar size={14} />
              <span>{new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {cargando ? (
            <LoadingState message="Cargando módulos operativos..." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modulos.map((mod) => {
                const IconComponent = mod.icono;
                return (
                  <div
                    key={mod.ruta}
                    onClick={() => navigate(mod.ruta)}
                    className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Cabecera de la tarjeta con icono y badge */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                          <IconComponent size={20} />
                        </div>
                        <Badge variant="default">{mod.badge}</Badge>
                      </div>

                      {/* Contenido */}
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-800 transition-colors mt-3.5">
                        {mod.titulo}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed font-normal">
                        {mod.desc}
                      </p>
                    </div>

                    {/* Botón de pie */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-800">
                      <span>Abrir módulo</span>
                      <IconArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}