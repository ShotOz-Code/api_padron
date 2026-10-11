import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#1e293b',
      color: '#fff'
    }}>
      <h3 style={{ margin: 0 }}>Padrón de Empleados</h3>
      <div>
        <button 
          onClick={() => navigate('/perfil')}
          style={{ marginRight: '1rem', cursor: 'pointer' }}
        >
          Mi Perfil
        </button>
        <button 
          onClick={() => navigate('/login')}
          style={{ cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}