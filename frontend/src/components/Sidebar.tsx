import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { obtenerRol, type Rol } from '../services/api';
import { useSidebar } from '../context/SidebarContext';
import { LOGO_IMG } from '../assets/logo';
import {
  IconHome,
  IconUsers,
  IconCalendar,
  IconCoins,
  IconBanknote,
  IconAlertTriangle,
  IconBarChart,
  IconInbox,
} from './ui/Icons';

interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
  icono: React.ComponentType<{ size?: number; className?: string }>;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Inicio y Módulos',
    shortLabel: 'Inicio',
    icono: IconHome,
    roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'],
  },
  {
    path: '/empleados',
    label: 'Personal y Vacantes',
    shortLabel: 'Personal',
    icono: IconUsers,
    roles: ['RH_ADMIN', 'ENCARGADO'],
  },
  {
    path: '/permisos',
    label: 'Permisos y Ausencias',
    shortLabel: 'Permisos',
    icono: IconCalendar,
    roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'],
  },
  {
    path: '/propinas',
    label: 'Bolsas de Propinas',
    shortLabel: 'Propinas',
    icono: IconCoins,
    roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'],
  },
  {
    path: '/prestamos',
    label: 'Préstamos y Anticipos',
    shortLabel: 'Préstamos',
    icono: IconBanknote,
    roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'],
  },
  {
    path: '/incidencias',
    label: 'Incidencias en Turno',
    shortLabel: 'Incidencias',
    icono: IconAlertTriangle,
    roles: ['RH_ADMIN', 'ENCARGADO'],
  },
  {
    path: '/reportes',
    label: 'Reportes y Auditoría',
    shortLabel: 'Reportes',
    icono: IconBarChart,
    roles: ['RH_ADMIN', 'ENCARGADO'],
  },
  {
    path: '/solicitudes',
    label: 'Buzón de Sugerencias',
    shortLabel: 'Buzón',
    icono: IconInbox,
    roles: ['RH_ADMIN', 'ENCARGADO', 'OPERATIVO'],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { isCollapsed } = useSidebar();
  const rol = (obtenerRol() || 'OPERATIVO') as Rol;
  const itemsVisibles = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <aside
      className={`bg-white border-r border-stone-200 text-stone-900 min-h-[calc(100vh-56px)] flex flex-col justify-between shrink-0 select-none transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-16 p-2' : 'w-56 p-3'
      }`}
    >
      <div>
        {/* Encabezado del menú */}
        {!isCollapsed && (
          <div className="px-2.5 pb-2 mb-2 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
              Módulos
            </span>
          </div>
        )}

        {/* Lista de navegación */}
        <nav className="space-y-1">
          {itemsVisibles.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icono;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-xs transition-all ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-amber-50 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-transparent font-medium'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-amber-800' : 'text-stone-400'}`}>
                  <IconComponent size={17} />
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-stone-100">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-2.5">
            <img
              src={LOGO_IMG}
              alt="Padrón"
              className="w-7 h-7 rounded-lg object-cover border border-amber-300/50 shrink-0"
            />
            <div className="overflow-hidden leading-tight">
              <div className="text-xs font-bold text-stone-900 truncate">
                PADRÓN
              </div>
              <div className="text-[10px] text-stone-500 truncate">
                Recursos Humanos
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <img
              src={LOGO_IMG}
              alt="Padrón"
              className="w-7 h-7 rounded-lg object-cover border border-amber-300/50"
            />
          </div>
        )}
      </div>
    </aside>
  );
}