import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Propina {
  id: number;
  empleado: string;
  monto: number;
  fecha: string;
}

const DATOS_INICIALES: Propina[] = [
  { id: 1, empleado: 'Roberto Garza', monto: 450.00, fecha: '2026-10-10' },
  { id: 2, empleado: 'Sofía Martínez', monto: 620.50, fecha: '2026-10-09' }
];

export default function Propinas() {
  const [propinas, setPropinas] = useState<Propina[]>(() => {
    const guardados = localStorage.getItem('propinas_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleado, setEmpleado] = useState('');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    localStorage.setItem('propinas_sistema', JSON.stringify(propinas));
  }, [propinas]);

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleado || !monto) return;

    const nueva: Propina = {
      id: Date.now(),
      empleado,
      monto: parseFloat(monto),
      fecha: new Date().toISOString().split('T')[0]
    };

    setPropinas([nueva, ...propinas]);
    setEmpleado('');
    setMonto('');
    setModalAbierto(false);
  };

  const totalPropinas = propinas.reduce((acc, curr) => acc + curr.monto, 0);

  const filtradas = propinas.filter(p => p.empleado.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Control de Propinas</h2>

          <div style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0' }}>
            <div style={{ backgroundColor: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '200px' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Acumulado</p>
              <h3 style={{ color: '#16a34a', marginTop: '0.25rem' }}>${totalPropinas.toFixed(2)}</h3>
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
              + Registrar Propina
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Nueva Propina</h3>
              <form onSubmit={handleCrear}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Empleado:</label>
                  <input type="text" value={empleado} onChange={(e) => setEmpleado(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Monto ($):</label>
                  <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
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
                <th style={{ padding: '1rem' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{p.id}</td>
                  <td style={{ padding: '1rem' }}>{p.empleado}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#16a34a' }}>${p.monto.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>{p.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}