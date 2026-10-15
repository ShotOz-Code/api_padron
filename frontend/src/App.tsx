import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from './context/SidebarContext';
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';
import Incidencias from './pages/Incidencias';
import Permisos from './pages/Permisos';
import Prestamos from './pages/Prestamos';
import Propinas from './pages/Propinas';
import Reportes from './pages/Reportes';
import Solicitudes from './pages/Solicitudes';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import RutaProtegida from './components/RutaProtegida';

export default function App() {
  return (
    <SidebarProvider>
      <Router>
        <Routes>
        {/* Ruta pública */}
        <Route path="/" element={<Login />} />

        {/* Rutas compartidas para todos los roles con sesión */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }
        />
        <Route
          path="/permisos"
          element={
            <RutaProtegida>
              <Permisos />
            </RutaProtegida>
          }
        />
        <Route
          path="/prestamos"
          element={
            <RutaProtegida>
              <Prestamos />
            </RutaProtegida>
          }
        />
        <Route
          path="/propinas"
          element={
            <RutaProtegida>
              <Propinas />
            </RutaProtegida>
          }
        />
        <Route
          path="/solicitudes"
          element={
            <RutaProtegida>
              <Solicitudes />
            </RutaProtegida>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <Perfil />
            </RutaProtegida>
          }
        />

        {/* Rutas exclusivas de gestión y administración (RH_ADMIN y ENCARGADO) */}
        <Route
          path="/empleados"
          element={
            <RutaProtegida rolesPermitidos={['RH_ADMIN', 'ENCARGADO']}>
              <Empleados />
            </RutaProtegida>
          }
        />
        <Route
          path="/incidencias"
          element={
            <RutaProtegida rolesPermitidos={['RH_ADMIN', 'ENCARGADO']}>
              <Incidencias />
            </RutaProtegida>
          }
        />
        <Route
          path="/reportes"
          element={
            <RutaProtegida rolesPermitidos={['RH_ADMIN', 'ENCARGADO']}>
              <Reportes />
            </RutaProtegida>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </SidebarProvider>
  );
}