import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function Perfil() {
  const [usuario, setUsuario] = useState({
    username: 'admin',
    rol: 'Administrador del Sistema',
    email: 'admin@sistema.local',
    ultimoAcceso: localStorage.getItem('ultimoAcceso') || 'Primer inicio de sesión'
  });

  const [mensaje, setMensaje] = useState('');

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('¡Perfil actualizado con éxito!');
    setTimeout(() => setMensaje(''), 3000);
  };

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Perfil del Usuario</h2>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Administra la información de tu cuenta y credenciales de acceso.</p>

          {mensaje && (
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', marginTop: '1rem' }}>
              {mensaje}
            </div>
          )}

          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '600px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '1.5rem' }}>
            <form onSubmit={handleGuardar}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Nombre de Usuario:</label>
                <input 
                  type="text" 
                  value={usuario.username} 
                  onChange={(e) => setUsuario({ ...usuario, username: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Rol en el Sistema:</label>
                <input 
                  type="text" 
                  value={usuario.rol} 
                  disabled 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Correo Electrónico:</label>
                <input 
                  type="email" 
                  value={usuario.email} 
                  onChange={(e) => setUsuario({ ...usuario, email: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Último Acceso:</label>
                <input 
                  type="text" 
                  value={usuario.ultimoAcceso} 
                  disabled 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              <button 
                type="submit" 
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}