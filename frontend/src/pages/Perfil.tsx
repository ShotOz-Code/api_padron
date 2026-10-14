
import { useState, useEffect, type FormEvent } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function Perfil() {
  const [usuario, setUsuario] = useState({
    username: localStorage.getItem('username') || 'admin',
    rol: localStorage.getItem('rol') || 'Administrador del Sistema',
    email: localStorage.getItem('email') || 'admin@sistema.local',
    ultimoAcceso:
      localStorage.getItem('ultimoAcceso') || 'Primer inicio de sesión',
  });

  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!mensaje) return;

    const timer = window.setTimeout(() => setMensaje(''), 3500);
    return () => window.clearTimeout(timer);
  }, [mensaje]);

  const iniciales =
    usuario.username
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('') || 'AD';

  const handleGuardar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const username = usuario.username.trim();
    const email = usuario.email.trim();

    if (!username || !email) {
      setMensaje('Completa tu nombre de usuario y correo.');
      return;
    }

    setCargando(true);

    try {
      localStorage.setItem('username', username);
      localStorage.setItem('email', email);

      setUsuario((actual) => ({
        ...actual,
        username,
        email,
      }));

      setEditando(false);
      setMensaje('¡Tu perfil se actualizó correctamente!');
    } catch {
      setMensaje('No se pudieron guardar los cambios.');
    } finally {
      setCargando(false);
    }
  };

  const cancelarEdicion = () => {
    setUsuario({
      username: localStorage.getItem('username') || 'admin',
      rol: localStorage.getItem('rol') || 'Administrador del Sistema',
      email: localStorage.getItem('email') || 'admin@sistema.local',
      ultimoAcceso:
        localStorage.getItem('ultimoAcceso') || 'Primer inicio de sesión',
    });

    setEditando(false);
    setMensaje('');
  };

  return (
    <div className="perfil-app">
      <style>{`
        .perfil-app {
          --perfil-bg: #f4f6fb;
          --perfil-ink: #172033;
          --perfil-muted: #78839a;
          --perfil-line: #e8ebf3;
          color: var(--perfil-ink);
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 90% 8%, rgba(99,102,241,.10), transparent 35%),
            var(--perfil-bg);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .perfil-layout { display: flex; align-items: stretch; min-width: 0; }
        .perfil-main { flex: 1; min-width: 0; padding: clamp(20px, 3vw, 42px); overflow: hidden; }
        .perfil-container { max-width: 1250px; margin: 0 auto; }
        .perfil-breadcrumb { color: var(--perfil-muted); font-size: 12px; font-weight: 700; letter-spacing: .12em; margin-bottom: 12px; }
        .perfil-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; }
        .perfil-heading h1 { margin: 0; font-size: clamp(28px, 3vw, 39px); letter-spacing: -.055em; line-height: 1.12; font-weight: 850; color: #182238; }
        .perfil-heading p { margin: 10px 0 0; color: var(--perfil-muted); font-size: 14px; line-height: 1.7; }
        .perfil-status { display: inline-flex; align-items: center; gap: 9px; background: #fff; border: 1px solid var(--perfil-line); border-radius: 100px; padding: 11px 15px; color: #47536b; font-size: 12px; font-weight: 750; }
        .perfil-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #16c784; }
        .perfil-hero { position: relative; isolation: isolate; overflow: hidden; border-radius: 24px; padding: clamp(23px, 3vw, 36px); color: white; background: linear-gradient(118deg, #172554, #312e81 49%, #5b4be8); box-shadow: 0 20px 55px rgba(49,46,129,.20); margin-bottom: 23px; }
        .perfil-hero::before { content: ""; position: absolute; z-index: -1; width: 320px; height: 320px; border-radius: 50%; top: -190px; right: 7%; border: 1px solid rgba(255,255,255,.16); box-shadow: 0 0 0 32px rgba(255,255,255,.035), 0 0 0 68px rgba(255,255,255,.025); }
        .perfil-hero-content { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .perfil-identity { display: flex; align-items: center; gap: 22px; min-width: 0; }
        .perfil-avatar { width: 94px; height: 94px; flex: 0 0 94px; display: grid; place-items: center; border-radius: 27px; font-size: 29px; font-weight: 900; color: #fff; background: linear-gradient(145deg, rgba(255,255,255,.27), rgba(255,255,255,.08)); border: 1px solid rgba(255,255,255,.30); }
        .perfil-kicker { margin-bottom: 9px; font-size: 10px; letter-spacing: .16em; font-weight: 850; color: #c7d2fe; }
        .perfil-hero h2 { overflow-wrap: anywhere; margin: 0; font-size: clamp(22px, 2.5vw, 32px); font-weight: 850; }
        .perfil-hero-email { margin-top: 8px; font-size: 13px; color: #d9defe; overflow-wrap: anywhere; }
        .perfil-role { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; border: 1px solid rgba(255,255,255,.20); background: rgba(255,255,255,.10); border-radius: 100px; padding: 7px 11px; font-size: 11px; font-weight: 750; }
        .perfil-edit-button { display: inline-flex; justify-content: center; align-items: center; gap: 9px; border: 1px solid rgba(255,255,255,.32); background: rgba(255,255,255,.13); color: white; padding: 13px 18px; border-radius: 12px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; }
        .perfil-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px; margin-bottom: 24px; }
        .perfil-stat { background: #fff; border: 1px solid var(--perfil-line); border-radius: 18px; padding: 21px; min-width: 0; }
        .perfil-stat-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--perfil-muted); font-size: 12px; font-weight: 700; }
        .perfil-stat-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; }
        .perfil-stat-value { font-size: clamp(17px, 2vw, 23px); line-height: 1.3; margin-top: 15px; font-weight: 850; overflow-wrap: anywhere; }
        .perfil-stat-note { margin-top: 7px; font-size: 11px; color: #929bb0; }
        .perfil-content-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(245px, .85fr); align-items: start; gap: 23px; }
        .perfil-card { min-width: 0; background: #fff; border: 1px solid var(--perfil-line); border-radius: 21px; padding: clamp(20px, 2.5vw, 29px); }
        .perfil-card-header { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 26px; }
        .perfil-card-icon { width: 43px; height: 43px; flex: 0 0 43px; display: grid; place-items: center; border-radius: 13px; color: #4f46e5; background: #eef2ff; font-size: 20px; }
        .perfil-card h3 { margin: 0; font-size: 16px; font-weight: 850; color: #202b42; }
        .perfil-card-subtitle { margin: 6px 0 0; color: var(--perfil-muted); font-size: 12px; line-height: 1.6; }
        .perfil-field { margin-bottom: 22px; }
        .perfil-field label { display: block; margin-bottom: 9px; color: #49546b; font-size: 12px; font-weight: 800; }
        .perfil-input-wrap { position: relative; }
        .perfil-input-icon { position: absolute; top: 50%; left: 15px; transform: translateY(-50%); color: #929bb0; pointer-events: none; }
        .perfil-input { box-sizing: border-box; display: block; width: 100%; min-width: 0; border: 1px solid #e3e7f0; border-radius: 12px; padding: 14px 15px 14px 43px; background: #f8f9fc; color: #28344b; font: inherit; font-size: 13px; outline: none; }
        .perfil-input:focus { background: #fff; border-color: #818cf8; box-shadow: 0 0 0 4px rgba(99,102,241,.10); }
        .perfil-input:disabled { color: #7e899e; cursor: not-allowed; background: #f2f4f8; }
        .perfil-field-hint { margin: 7px 0 0; color: #9aa3b5; font-size: 10px; line-height: 1.5; }
        .perfil-form-actions { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 4px; }
        .perfil-primary, .perfil-secondary { border: 0; border-radius: 11px; padding: 13px 17px; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
        .perfil-primary { color: white; background: linear-gradient(110deg, #4f46e5, #6366f1); }
        .perfil-secondary { color: #566178; background: #f0f2f8; }
        .perfil-primary:disabled { cursor: wait; opacity: .7; }
        .perfil-security-banner { display: flex; align-items: center; gap: 11px; border-radius: 13px; padding: 14px; background: #ecfdf5; border: 1px solid #d1fae5; color: #047857; margin-bottom: 23px; }
        .perfil-security-banner-icon { font-size: 21px; }
        .perfil-security-banner strong { display: block; font-size: 12px; }
        .perfil-security-banner span { display: block; font-size: 10px; margin-top: 4px; color: #059669; line-height: 1.5; }
        .perfil-detail-row { display: flex; align-items: flex-start; gap: 12px; padding: 16px 0; border-bottom: 1px solid #edf0f6; }
        .perfil-detail-row:last-child { border-bottom: 0; padding-bottom: 0; }
        .perfil-detail-icon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 10px; background: #f3f4ff; color: #6366f1; }
        .perfil-detail-label { color: #8b95a9; font-size: 10px; font-weight: 700; }
        .perfil-detail-value { margin-top: 5px; color: #354158; font-size: 12px; font-weight: 750; line-height: 1.5; overflow-wrap: anywhere; }
        .perfil-security-meter { height: 6px; margin-top: 12px; background: #e9edf5; border-radius: 20px; overflow: hidden; }
        .perfil-security-meter div { height: 100%; width: 100%; border-radius: inherit; background: linear-gradient(90deg, #34d399, #059669); }
        .perfil-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 24px; padding: 17px 3px; color: #9aa3b5; font-size: 10px; }
        .perfil-toast { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border: 1px solid #bbf7d0; border-radius: 13px; padding: 14px 16px; color: #166534; background: #f0fdf4; font-size: 13px; font-weight: 700; }
        @media (max-width: 1000px) { .perfil-content-grid { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 650px) {
          .perfil-main { padding: 19px 13px; }
          .perfil-stats { grid-template-columns: minmax(0, 1fr); gap: 11px; }
          .perfil-stat { padding: 16px; }
          .perfil-identity { align-items: flex-start; gap: 15px; }
          .perfil-avatar { width: 67px; height: 67px; flex-basis: 67px; border-radius: 20px; font-size: 22px; }
          .perfil-hero { border-radius: 19px; }
          .perfil-card { border-radius: 17px; }
          .perfil-edit-button { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .perfil-app *, .perfil-app *::before, .perfil-app *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <Navbar />

      <div className="perfil-layout">
        <Sidebar />

        <main className="perfil-main">
          <div className="perfil-container">
            <div className="perfil-heading">
              <div>
                <div className="perfil-breadcrumb">SISTEMA PADRÓN / CONFIGURACIÓN</div>
                <h1>Mi perfil</h1>
                <p>Administra tu identidad, información personal y preferencias de cuenta desde un solo lugar.</p>
              </div>
              <div className="perfil-status">
                <span className="perfil-status-dot" />
                Panel de cuenta
              </div>
            </div>

            {mensaje && (
              <div className="perfil-toast" role="status" aria-live="polite">
                <span>✓</span>
                {mensaje}
              </div>
            )}

            <section className="perfil-hero">
              <div className="perfil-hero-content">
                <div className="perfil-identity">
                  <div className="perfil-avatar">{iniciales}</div>
                  <div>
                    <div className="perfil-kicker">✦ CUENTA DEL SISTEMA</div>
                    <h2>{usuario.username}</h2>
                    <div className="perfil-hero-email">{usuario.email}</div>
                    <div className="perfil-role">♛ {usuario.rol}</div>
                  </div>
                </div>

                <button
                  className="perfil-edit-button"
                  type="button"
                  onClick={() => editando ? cancelarEdicion() : setEditando(true)}
                >
                  {editando ? '↩ Cancelar edición' : '✎ Editar perfil'}
                </button>
              </div>
            </section>

            <section className="perfil-stats">
              <div className="perfil-stat">
                <div className="perfil-stat-top">
                  Tipo de cuenta
                  <span className="perfil-stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>♛</span>
                </div>
                <div className="perfil-stat-value">Administrador</div>
                <div className="perfil-stat-note">Rol asignado a esta cuenta</div>
              </div>

              <div className="perfil-stat">
                <div className="perfil-stat-top">
                  Estado de sesión
                  <span className="perfil-stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>◉</span>
                </div>
                <div className="perfil-stat-value">Disponible</div>
                <div className="perfil-stat-note">Estado visual de la cuenta</div>
              </div>

              <div className="perfil-stat">
                <div className="perfil-stat-top">
                  Último acceso
                  <span className="perfil-stat-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>◷</span>
                </div>
                <div className="perfil-stat-value" style={{ fontSize: 16 }}>{usuario.ultimoAcceso}</div>
                <div className="perfil-stat-note">Información disponible en este dispositivo</div>
              </div>
            </section>

            <div className="perfil-content-grid">
              <section className="perfil-card">
                <div className="perfil-card-header">
                  <div className="perfil-card-icon">♙</div>
                  <div>
                    <h3>Información personal</h3>
                    <p className="perfil-card-subtitle">Mantén actualizados los datos asociados a tu cuenta.</p>
                  </div>
                </div>

                <form onSubmit={handleGuardar}>
                  <div className="perfil-field">
                    <label htmlFor="perfil-username">Nombre de usuario</label>
                    <div className="perfil-input-wrap">
                      <span className="perfil-input-icon">♙</span>
                      <input
                        id="perfil-username"
                        className="perfil-input"
                        type="text"
                        value={usuario.username}
                        disabled={!editando || cargando}
                        autoComplete="username"
                        maxLength={80}
                        required
                        onChange={(e) => setUsuario({ ...usuario, username: e.target.value })}
                      />
                    </div>
                    <p className="perfil-field-hint">Este nombre se muestra en tu perfil.</p>
                  </div>

                  <div className="perfil-field">
                    <label htmlFor="perfil-email">Correo electrónico</label>
                    <div className="perfil-input-wrap">
                      <span className="perfil-input-icon">✉</span>
                      <input
                        id="perfil-email"
                        className="perfil-input"
                        type="email"
                        value={usuario.email}
                        disabled={!editando || cargando}
                        autoComplete="email"
                        maxLength={254}
                        required
                        onChange={(e) => setUsuario({ ...usuario, email: e.target.value })}
                      />
                    </div>
                    <p className="perfil-field-hint">Utiliza un correo válido asociado a tu cuenta.</p>
                  </div>

                  <div className="perfil-field">
                    <label htmlFor="perfil-rol">Rol en el sistema</label>
                    <div className="perfil-input-wrap">
                      <span className="perfil-input-icon">♛</span>
                      <input
                        id="perfil-rol"
                        className="perfil-input"
                        type="text"
                        value={usuario.rol}
                        disabled
                        readOnly
                      />
                    </div>
                    <p className="perfil-field-hint">Los permisos y roles deben administrarse desde el sistema de acceso.</p>
                  </div>

                  {editando && (
                    <div className="perfil-form-actions">
                      <button className="perfil-primary" type="submit" disabled={cargando}>
                        {cargando ? 'Guardando...' : '✓ Guardar cambios'}
                      </button>
                      <button className="perfil-secondary" type="button" onClick={cancelarEdicion} disabled={cargando}>
                        Descartar
                      </button>
                    </div>
                  )}
                </form>
              </section>

              <aside className="perfil-card">
                <div className="perfil-card-header">
                  <div className="perfil-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>◈</div>
                  <div>
                    <h3>Resumen de cuenta</h3>
                    <p className="perfil-card-subtitle">Información general de tu perfil.</p>
                  </div>
                </div>

                <div className="perfil-security-banner">
                  <div className="perfil-security-banner-icon">✓</div>
                  <div>
                    <strong>Panel de perfil disponible</strong>
                    <span>Esta indicación no sustituye una verificación real de seguridad del servidor.</span>
                  </div>
                </div>

                {[
                  { icon: '✉', label: 'CORREO REGISTRADO', value: usuario.email },
                  { icon: '♙', label: 'IDENTIFICADOR', value: usuario.username },
                  { icon: '♛', label: 'NIVEL DE ACCESO', value: usuario.rol },
                  { icon: '◷', label: 'ÚLTIMA ACTIVIDAD', value: usuario.ultimoAcceso },
                ].map((item) => (
                  <div className="perfil-detail-row" key={item.label}>
                    <div className="perfil-detail-icon">{item.icon}</div>
                    <div>
                      <div className="perfil-detail-label">{item.label}</div>
                      <div className="perfil-detail-value">{item.value}</div>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, fontWeight: 800, color: '#59657b' }}>
                    <span>INFORMACIÓN DEL PERFIL</span>
                    <span style={{ color: '#059669' }}>3 campos</span>
                  </div>
                  <div className="perfil-security-meter"><div /></div>
                  <p className="perfil-field-hint">Indicador visual de los campos principales; no representa una auditoría de seguridad.</p>
                </div>
              </aside>
            </div>

            <footer className="perfil-footer">
              <span>SISTEMA PADRÓN · GESTIÓN DE PERSONAL</span>
              <span>Panel de cuenta · Interfaz de usuario</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
