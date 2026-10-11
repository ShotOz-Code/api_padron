import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/incidencias" element={<Incidencias />} />
        <Route path="/permisos" element={<Permisos />} />
        <Route path="/prestamos" element={<Prestamos />} />
        <Route path="/propinas" element={<Propinas />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/solicitudes" element={<Solicitudes />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </Router>
  );
}