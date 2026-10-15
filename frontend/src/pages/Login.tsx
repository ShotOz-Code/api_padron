import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutenticacionService } from '../services/api';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('Cambiar123!');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const usuario = email.trim();
    if (!usuario || !password) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }

    setCargando(true);
    try {
      await AutenticacionService.iniciarSesion({ usuario, contrasena: password });

      const ahora = new Date().toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      localStorage.setItem('ultimoAcceso', ahora);

      navigate('/dashboard', {
        state: { usuario, recordarme },
      });
    } catch (err: any) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-background" />

      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              <rect x="9" y="10" width="6" height="5" rx="1" />
              <path d="M10 10V8a2 2 0 0 1 4 0v2" />
            </svg>
          </div>

          <span className="brand-name">SISTEMA PADRÓN</span>
          <span className="brand-caption">
            Plataforma de gestión administrativa
          </span>
        </div>

        <div className="login-heading">
          <h1>Bienvenido de nuevo</h1>
          <p>Ingresa tus credenciales para continuar.</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            marginBottom: '18px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usuario">Nombre de usuario</label>

            <div className="input-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
              </svg>

              <input
                id="usuario"
                type="text"
                placeholder="Ingresa tu usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>

            <div className="input-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>

              <input
                id="password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={
                  mostrarPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-option">
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              <span>Recordarme</span>
            </label>

            <button
              type="button"
              className="forgot-link"
              onClick={() =>
                window.alert(
                  'Contacta al administrador para recuperar tu acceso.'
                )
              }
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" className="login-button" disabled={cargando}>
            <span>{cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
            <span className="button-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </form>

        <div className="login-footer">
          <span className="footer-line" />
          <span>Sistema Padrón</span>
          <span className="footer-line" />
        </div>

        <p className="security-note">
          <span className="status-dot" />
          Acceso al sistema de gestión
        </p>
      </section>

      <footer className="page-footer">
        © {new Date().getFullYear()} Sistema Padrón · Todos los derechos
        reservados
      </footer>
    </main>
  );
}