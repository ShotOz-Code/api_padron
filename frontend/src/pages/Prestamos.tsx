import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Prestamo {
  id: number;
  empleado: string;
  monto: number;
  quincenas: number;
  fecha: string;
  estatus: string;
}

const DATOS_INICIALES: Prestamo[] = [
  { id: 1, empleado: 'Jorge Ramírez', monto: 3000.00, quincenas: 6, fecha: '2026-10-02', estatus: 'Activo' },
  { id: 2, empleado: 'Carmen Sosa', monto: 1500.00, quincenas: 3, fecha: '2026-10-05', estatus: 'Pagado' }
];

export default function Prestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>(() => {
    const guardados = localStorage.getItem('prestamos_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleado, setEmpleado] = useState('');
  const [monto, setMonto] = useState('');
  const [quincenas, setQuincenas] = useState('4');

  useEffect(() => {
    localStorage.setItem('prestamos_sistema', JSON.stringify(prestamos));
  }, [prestamos]);

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleado || !monto) return;

    const nuevo: Prestamo = {
      id: Date.now(),
      empleado,
      monto: parseFloat(monto),
      quincenas: parseInt(quincenas),
      fecha: new Date().toISOString().split('T')[0],
      estatus: 'Activo'
    };

    setPrestamos([nuevo, ...prestamos]);
    setEmpleado('');
    setMonto('');
    setQuincenas('4');
    setModalAbierto(false);
  };

  const cambiarEstatus = (id: number, estatus: string) => {
    setPrestamos(prestamos.map(p => p.id === id ? { ...p, estatus } : p));
  };

  const totalPrestamosActivos = prestamos
    .filter(p => p.estatus === 'Activo')
    .reduce((acc, curr) => acc + curr.monto, 0);

  const filtrados = prestamos.filter(p => p.empleado.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Gestión de Préstamos</h2>

          <div style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0' }}>
            <div style={{ backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '220px' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Préstamos Activos (Deuda)</p>
              <h3 style={{ color: '#d97706', marginTop: '0.25rem' }}>${totalPrestamosActivos.toFixed(2)}</h3>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar por empleado..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '0.6rem 1rem', width: '300px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              onClick={() => setModalAbierto(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Nuevo Préstamo
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Registrar Préstamo</h3>
              <form onSubmit={handleCrear}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Empleado:</label>
                  <input type="text" value={empleado} onChange={(e) => setEmpleado(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Monto ($):</label>
                  <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Plazo (Quincenas):</label>
                  <input type="number" value={quincenas} onChange={(e) => setQuincenas(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
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
                <th style={{ padding: '1rem' }}>Monto</th>
                <th style={{ padding: '1rem' }}>Plazo</th>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Estatus</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{p.id}</td>
                  <td style={{ padding: '1rem' }}>{p.empleado}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>${p.monto.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>{p.quincenas} quincenas</td>
                  <td style={{ padding: '1rem' }}>{p.fecha}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem',
                      backgroundColor: p.estatus === 'Activo' ? '#fef9c3' : '#dcfce7',
                      color: p.estatus === 'Activo' ? '#854d0e' : '#166534'
                    }}>
                      {p.estatus}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {p.estatus === 'Activo' ? (
                      <button onClick={() => cambiarEstatus(p.id, 'Pagado')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Marcar Pagado</button>
                    ) : (
                      <button onClick={() => cambiarEstatus(p.id, 'Activo')} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Reactivar</button>
                    )}
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