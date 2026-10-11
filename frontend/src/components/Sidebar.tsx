import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: 'calc(100vh - 60px)',
      padding: '1rem'
    }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/empleados" style={{ color: '#fff', textDecoration: 'none' }}>Empleados</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/incidencias" style={{ color: '#fff', textDecoration: 'none' }}>Incidencias</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/permisos" style={{ color: '#fff', textDecoration: 'none' }}>Permisos</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/prestamos" style={{ color: '#fff', textDecoration: 'none' }}>Préstamos</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/propinas" style={{ color: '#fff', textDecoration: 'none' }}>Propinas</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/reportes" style={{ color: '#fff', textDecoration: 'none' }}>Reportes</Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/solicitudes" style={{ color: '#fff', textDecoration: 'none' }}>Solicitudes</Link>
        </li>
      </ul>
    </aside>
  );
}