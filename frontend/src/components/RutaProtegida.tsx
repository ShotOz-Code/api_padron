import React from 'react';
import { Navigate } from 'react-router-dom';
import { estaAutenticado, obtenerRol, type Rol } from '../services/api';

interface RutaProtegidaProps {
  children: React.ReactNode;
  rolesPermitidos?: Rol[];
}

export default function RutaProtegida({ children, rolesPermitidos }: RutaProtegidaProps) {
  if (!estaAutenticado()) {
    return <Navigate to="/" replace />;
  }

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const rolActual = (obtenerRol() || 'OPERATIVO') as Rol;
    if (!rolesPermitidos.includes(rolActual)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
