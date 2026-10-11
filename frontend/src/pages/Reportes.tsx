import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Reporte {
  id: number;
  titulo: string;
  tipo: string;
  fecha: string;
}

const DATOS_INICIALES: Reporte[] = [
  { id: 1, titulo: 'Reporte Mensual de Asistencia - Septiembre', tipo: 'Asistencia', fecha: '2026-10-01' },
  { id: 2, titulo: 'Corte General de Propinas Q3', tipo: 'Financiero', fecha: '2026-10-05' }
];

export default function Reportes() {
  const [reportes, setReportes] = useState<Reporte[]>(() => {
    const guardados = localStorage.getItem('reportes_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Asistencia');

  useEffect(() => {
    localStorage.setItem('reportes_sistema', JSON.stringify(reportes));
  }, [reportes]);

  const generarReporte = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) return;

    const nuevo: Reporte = {
      id: Date.now(),
      titulo,
      tipo,
      fecha: new Date().toISOString().split('T')[0]
    };

    setReportes([nuevo, ...reportes]);
    setTitulo('');
    setModalAbierto(false);
  };

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Reportes del Sistema</h2>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', marginTop: '1rem' }}>
            <button 
              onClick={() => setModalAbierto(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Generar Nuevo Reporte
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '450px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Generar Reporte</h3>
              <form onSubmit={generarReporte}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Título del Reporte:</label>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Categoría:</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="Asistencia">Asistencia</option>
                    <option value="Financiero">Financiero</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Generar</button>
                  <button type="button" onClick={() => setModalAbierto(false)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Título</th>
                <th style={{ padding: '1rem' }}>Categoría</th>
                <th style={{ padding: '1rem' }}>Fecha de Creación</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{r.id}</td>
                  <td style={{ padding: '1rem' }}>{r.titulo}</td>
                  <td style={{ padding: '1rem' }}>{r.tipo}</td>
                  <td style={{ padding: '1rem' }}>{r.fecha}</td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => alert(`Descargando reporte: ${r.titulo}`)} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Descargar PDF</button>
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