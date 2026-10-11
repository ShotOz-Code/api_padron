import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Solicitud {
  id: number;
  empleado: string;
  tipo: string;
  fecha: string;
  estatus: string;
}

const DATOS_INICIALES: Solicitud[] = [
  { id: 1, empleado: 'Fernando Garza', tipo: 'Constancia Laboral', fecha: '2026-10-07', estatus: 'Pendiente' },
  { id: 2, empleado: 'Diana Ríos', tipo: 'Cambio de Turno', fecha: '2026-10-09', estatus: 'Aprobada' }
];

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() => {
    const guardados = localStorage.getItem('solicitudes_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');

  useEffect(() => {
    localStorage.setItem('solicitudes_sistema', JSON.stringify(solicitudes));
  }, [solicitudes]);

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEmpleado || !nuevoTipo) return;

    const nueva: Solicitud = {
      id: Date.now(),
      empleado: nuevoEmpleado,
      tipo: nuevoTipo,
      fecha: new Date().toISOString().split('T')[0],
      estatus: 'Pendiente'
    };

    setSolicitudes([nueva, ...solicitudes]);
    setNuevoEmpleado('');
    setNuevoTipo('');
    setModalAbierto(false);
  };

  const cambiarEstatus = (id: number, estatus: string) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estatus } : s));
  };

  const filtradas = solicitudes.filter(s =>
    s.empleado.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Gestión de Solicitudes</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar por empleado o tipo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '0.6rem 1rem', width: '300px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              onClick={() => setModalAbierto(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Nueva Solicitud
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Nueva Solicitud</h3>
              <form onSubmit={handleCrear}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Empleado:</label>
                  <input type="text" value={nuevoEmpleado} onChange={(e) => setNuevoEmpleado(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tipo de Solicitud:</label>
                  <input type="text" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
                  <button type="button" onClick={() => setModalAbierto(false)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Empleado</th>
                <th style={{ padding: '1rem' }}>Tipo de Solicitud</th>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Estatus</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{s.id}</td>
                  <td style={{ padding: '1rem' }}>{s.empleado}</td>
                  <td style={{ padding: '1rem' }}>{s.tipo}</td>
                  <td style={{ padding: '1rem' }}>{s.fecha}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem',
                      backgroundColor: s.estatus === 'Aprobada' ? '#dcfce7' : s.estatus === 'Rechazada' ? '#fee2e2' : '#fef9c3',
                      color: s.estatus === 'Aprobada' ? '#166534' : s.estatus === 'Rechazada' ? '#991b1b' : '#854d0e'
                    }}>
                      {s.estatus}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => cambiarEstatus(s.id, 'Aprobada')} style={{ marginRight: '0.5rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Atender</button>
                    <button onClick={() => cambiarEstatus(s.id, 'Rechazada')} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}