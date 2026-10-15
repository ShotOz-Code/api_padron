import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutenticacionService, obtenerNombreUsuario, obtenerRol } from '../services/api';
import { useSidebar } from '../context/SidebarContext';
import { LOGO_IMG } from '../assets/logo';
import ModalUsuario from './ModalUsuario';

import { IconUser, IconLogOut } from './ui/Icons';

export default function Navbar() {
  const navigate = useNavigate();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const usuario = obtenerNombreUsuario();
  const rol = obtenerRol() || 'OPERATIVO';

  const [modalUsuarioAbierto, setModalUsuarioAbierto] = useState(false);

  const handleCerrar = () => {
    AutenticacionService.cerrarSesion();
    navigate('/');
  };

  return (
    <>
      <nav className="h-14 bg-amber-500 border-b border-amber-600/40 px-3 sm:px-5 flex items-center justify-between text-stone-950 select-none z-30 shrink-0 shadow-xs">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
            className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-stone-900 border border-amber-600/20 transition-all cursor-pointer"
            title="Menú lateral"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-600/15 transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-600/30 bg-white flex items-center justify-center shrink-0 shadow-2xs">
              <img
                src={LOGO_IMG}
                alt="Carnitas y Carne Asada Padrón"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-tight text-stone-950 block">
                PADRÓN
              </span>
              <span className="text-[10px] font-medium text-amber-950/80 block">
                Carnitas y Carne Asada
              </span>
            </div>
          </div>
        </div>

        {/* Right: Botón Usuario + Salir */}
        <div className="flex items-center gap-2">
          {/* Botón de Usuario con Perfil y Carga de Archivos */}
          <button
            type="button"
            onClick={() => setModalUsuarioAbierto(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white border border-amber-600/25 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-xs font-semibold text-stone-900"
            title="Mi perfil y documentos"
          >
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center">
              <IconUser size={12} />
            </span>
            <span className="max-w-[120px] truncate">{usuario}</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase">
              {rol === 'RH_ADMIN' ? 'RH' : rol === 'ENCARGADO' ? 'Jefe' : 'Op'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCerrar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <IconLogOut size={13} />
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* Modal interactivo de usuario */}
      <ModalUsuario
        isOpen={modalUsuarioAbierto}
        onClose={() => setModalUsuarioAbierto(false)}
      />
    </>
  );
}