import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Permiso {
  id: number;
  empleado: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  estatus: string;
}

const DATOS_INICIALES: Permiso[] = [
  { id: 1, empleado: 'Carlos López', motivo: 'Cita médica', fechaInicio: '2026-10-12', fechaFin: '2026-10-12', estatus: 'Pendiente' },
  { id: 2, empleado: 'Ana Torres', motivo: 'Asuntos personales', fechaInicio: '2026-10-15', fechaFin: '2026-10-16', estatus: 'Aprobada' }
];

export default function Permisos() {
  const [permisos, setPermisos] = useState<Permiso[]>(() => {
    const guardados = localStorage.getItem('permisos_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState('');
  const [nuevoMotivo, setNuevoMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Sincronizar con localStorage cada vez que cambien los permisos
  useEffect(() => {
    localStorage.setItem('permisos_sistema', JSON.stringify(permisos));
  }, [permisos]);

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEmpleado || !nuevoMotivo || !fechaInicio || !fechaFin) return;

    const nuevoPermiso: Permiso = {
      id: Date.now(),
      empleado: nuevoEmpleado,
      motivo: nuevoMotivo,
      fechaInicio,
      fechaFin,
      estatus: 'Pendiente'
    };

    setPermisos([nuevoPermiso, ...permisos]);
    setNuevoEmpleado('');
    setNuevoMotivo('');
    setFechaInicio('');
    setFechaFin('');
    setModalAbierto(false);
  };

  const cambiarEstatus = (id: number, nuevoEstatus: string) => {
    setPermisos(permisos.map(p => p.id === id ? { ...p, estatus: nuevoEstatus } : p));
  };

  const permisosFiltrados = permisos.filter((p) =>
    p.empleado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.motivo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Gestión de Permisos</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar por empleado o motivo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '0.6rem 1rem', width: '300px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              onClick={() => setModalAbierto(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Nuevo Permiso
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Registrar Nueva Solicitud de Permiso</h3>
              <form onSubmit={handleCrear}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Empleado:</label>
                  <input type="text" value={nuevoEmpleado} onChange={(e) => setNuevoEmpleado(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Motivo:</label>
                  <input type="text" value={nuevoMotivo} onChange={(e) => setNuevoMotivo(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Desde:</label>
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Hasta:</label>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
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
                <th style={{ padding: '1rem' }}>Motivo</th>
                <th style={{ padding: '1rem' }}>Desde</th>
                <th style={{ padding: '1rem' }}>Hasta</th>
                <th style={{ padding: '1rem' }}>Estatus</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {permisosFiltrados.length > 0 ? (
                permisosFiltrados.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>{p.id}</td>
                    <td style={{ padding: '1rem' }}>{p.empleado}</td>
                    <td style={{ padding: '1rem' }}>{p.motivo}</td>
                    <td style={{ padding: '1rem' }}>{p.fechaInicio}</td>
                    <td style={{ padding: '1rem' }}>{p.fechaFin}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        backgroundColor: p.estatus === 'Aprobada' ? '#dcfce7' : p.estatus === 'Rechazada' ? '#fee2e2' : '#fef9c3',
                        color: p.estatus === 'Aprobada' ? '#166534' : p.estatus === 'Rechazada' ? '#991b1b' : '#854d0e'
                      }}>
                        {p.estatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => cambiarEstatus(p.id, 'Aprobada')} style={{ marginRight: '0.5rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Aprobar</button>
                      <button onClick={() => cambiarEstatus(p.id, 'Rechazada')} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Rechazar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No hay solicitudes de permisos registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}