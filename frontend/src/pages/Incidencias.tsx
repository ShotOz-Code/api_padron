import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface Incidencia {
  id: number;
  empleado: string;
  tipo: string;
  fecha: string;
  descripcion: string;
}

const DATOS_INICIALES: Incidencia[] = [
  { id: 1, empleado: 'Mario Gómez', tipo: 'Retardo', fecha: '2026-10-10', descripcion: 'Llegada tarde por tráfico pesado.' },
  { id: 2, empleado: 'Lucía Pérez', tipo: 'Falta Injustificada', fecha: '2026-10-08', descripcion: 'No se presentó ni avisó motivo.' }
];

export default function Incidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>(() => {
    const guardados = localStorage.getItem('incidencias_sistema');
    return guardados ? JSON.parse(guardados) : DATOS_INICIALES;
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [empleado, setEmpleado] = useState('');
  const [tipo, setTipo] = useState('Retardo');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    localStorage.setItem('incidencias_sistema', JSON.stringify(incidencias));
  }, [incidencias]);

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleado || !descripcion) return;

    const nueva: Incidencia = {
      id: Date.now(),
      empleado,
      tipo,
      fecha: new Date().toISOString().split('T')[0],
      descripcion
    };

    setIncidencias([nueva, ...incidencias]);
    setEmpleado('');
    setDescripcion('');
    setModalAbierto(false);
  };

  const eliminar = (id: number) => {
    setIncidencias(incidencias.filter(i => i.id !== id));
  };

  const filtradas = incidencias.filter(i =>
    i.empleado.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Gestión de Incidencias</h2>

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
              + Nueva Incidencia
            </button>
          </div>

          {modalAbierto && (
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '450px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Registrar Incidencia</h3>
              <form onSubmit={handleCrear}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Empleado:</label>
                  <input type="text" value={empleado} onChange={(e) => setEmpleado(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Tipo de Incidencia:</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="Retardo">Retardo</option>
                    <option value="Falta Injustificada">Falta Injustificada</option>
                    <option value="Amonestación">Amonestación</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Descripción:</label>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
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
                <th style={{ padding: '1rem' }}>Tipo</th>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Descripción</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem' }}>{i.id}</td>
                  <td style={{ padding: '1rem' }}>{i.empleado}</td>
                  <td style={{ padding: '1rem' }}>{i.tipo}</td>
                  <td style={{ padding: '1rem' }}>{i.fecha}</td>
                  <td style={{ padding: '1rem' }}>{i.descripcion}</td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => eliminar(i.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>Eliminar</button>
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