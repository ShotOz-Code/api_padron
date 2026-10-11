import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Dashboard</h2>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Bienvenido al sistema de gestión de padrón de empleados.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h4 style={{ color: '#64748b', margin: '0 0 0.5rem 0' }}>Total Empleados</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#2563eb' }}>Gestión activa</p>
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h4 style={{ color: '#64748b', margin: '0 0 0.5rem 0' }}>Módulo de Incidencias</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>Disponible</p>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h4 style={{ color: '#64748b', margin: '0 0 0.5rem 0' }}>Estado del Sistema</h4>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#d97706' }}>Conectado</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}