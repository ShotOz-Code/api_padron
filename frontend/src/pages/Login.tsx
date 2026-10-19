import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutenticacionService } from '../services/api';
import { Button, Input } from '../components/ui';
import { LOGO_IMG } from '../assets/logo';

export default function Login() {
  const [usuario, setUsuario] = useState('Admin');
  const [contrasena, setContrasena] = useState('xp74Hg53');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const u = usuario.trim();
    if (!u) {
      setError('Escribe tu nombre de usuario');
      return;
    }
    if (!contrasena) {
      setError('Escribe tu contraseña');
      return;
    }

    setCargando(true);
    try {
      await AutenticacionService.iniciarSesion({ usuario: u, contrasena });

      const ahora = new Date().toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      localStorage.setItem('ultimoAcceso', ahora);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xl shadow-stone-900/5">
        {/* Cabecera con Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden border border-amber-300 bg-amber-50 p-1 mb-3 shadow-2xs">
            <img
              src={LOGO_IMG}
              alt="Carnitas y Carne Asada Padrón"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            PADRÓN
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Carnitas y Carne Asada
          </p>
          <div className="mt-2.5 inline-block px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-900">
            Control de Personal y Turnos
          </div>
        </div>

        {/* Error si falló */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            placeholder="Admin"
          />

          <Input
            label="Contraseña"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={cargando}
            className="w-full justify-center py-2.5 mt-2 text-sm"
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-6 pt-3 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-400">
            Sistema Interno de Nómina y Operaciones
          </p>
        </div>
      </div>
    </div>
  );
}