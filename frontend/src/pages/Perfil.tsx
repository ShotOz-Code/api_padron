import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { PerfilService, type PerfilRespuesta, estaAutenticado, obtenerNombreUsuario } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Badge, LoadingState } from '../components/ui';
import { IconUser, IconCheck, IconAlertTriangle, IconLock, IconX } from '../components/ui/Icons';

export default function Perfil() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<PerfilRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeOk, setMensajeOk] = useState('');
  const [error, setError] = useState('');

  // Cambio de contraseña
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarNueva, setConfirmarNueva] = useState('');
  const [cambiando, setCambiando] = useState(false);

  const nombreUsuario = obtenerNombreUsuario();
  const ultimoAcceso = localStorage.getItem('ultimoAcceso') || 'Sesión activa';

  useEffect(() => {
    if (!estaAutenticado()) {
      navigate('/');
      return;
    }

    PerfilService.obtenerPerfil()
      .then((data) => setPerfil(data))
      .catch((err) => setError(err.message || 'Error al obtener perfil'))
      .finally(() => setCargando(false));
  }, [navigate]);

  const handleCambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensajeOk('');

    if (contrasenaNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (contrasenaNueva !== confirmarNueva) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setCambiando(true);
    try {
      const res = await PerfilService.cambiarContrasena({
        contrasena_actual: contrasenaActual,
        contrasena_nueva: contrasenaNueva,
      });

      setMensajeOk(res.mensaje || 'Contraseña actualizada con éxito');
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmarNueva('');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseña');
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-800 font-bold mb-1">
              <span>PADRÓN</span>
              <span>/</span>
              <span className="text-stone-500">MI CUENTA</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-100/80 text-amber-800">
                <IconUser size={20} />
              </span>
              Perfil y Credenciales de Acceso
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Información de tu identidad activa en el sistema y actualización de contraseña.
            </p>
          </div>

          {/* Feedback messages */}
          {mensajeOk && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <IconCheck size={16} className="text-emerald-600 shrink-0" />
                {mensajeOk}
              </span>
              <button
                type="button"
                onClick={() => setMensajeOk('')}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <IconX size={14} />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-medium flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <IconAlertTriangle size={16} className="text-red-600 shrink-0" />
                {error}
              </span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-950 p-1 cursor-pointer"
              >
                <IconX size={14} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta de información de la cuenta */}
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                  Datos de Acceso
                </h2>
                <Badge variant={perfil?.rol === 'RH_ADMIN' ? 'info' : perfil?.rol === 'ENCARGADO' ? 'warning' : 'default'}>
                  {perfil?.rol || 'OPERATIVO'}
                </Badge>
              </div>

              {cargando ? (
                <LoadingState message="Cargando información del perfil..." />
              ) : (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                      Usuario
                    </span>
                    <p className="mt-1 text-base font-bold text-amber-950 font-mono">
                      {nombreUsuario}
                    </p>
                  </div>

                  {perfil?.empleado ? (
                    <>
                      <div>
                        <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                          Expediente de Colaborador
                        </span>
                        <p className="mt-1 font-bold text-stone-900 text-sm">
                          {perfil.empleado.nombres} {perfil.empleado.apellido_paterno}
                        </p>
                        <span className="text-[11px] font-mono font-medium text-amber-900">
                          No. Empleado: {perfil.empleado.numero_empleado}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-100">
                        <div>
                          <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                            Puesto / Plaza
                          </span>
                          <p className="mt-1 text-stone-900 font-semibold">
                            {perfil.empleado.puesto}
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                            Sucursal
                          </span>
                          <p className="mt-1 text-stone-900 font-semibold">
                            {perfil.empleado.sucursal}
                          </p>
                        </div>
                      </div>

                      {perfil.empleado.jefe_puesto && (
                        <div className="pt-3 border-t border-stone-100">
                          <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                            Jefe Directo
                          </span>
                          <p className="mt-1 text-stone-900 font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            {perfil.empleado.jefe_puesto}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-stone-700 font-medium">
                      Cuenta administrativa central sin expediente operativo ligado.
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-100">
                    <span className="text-stone-500 block font-semibold uppercase tracking-wider text-[11px]">
                      Último Acceso Registrado
                    </span>
                    <p className="mt-1 text-stone-600 font-mono text-[11px]">
                      {ultimoAcceso}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de cambio de contraseña */}
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 space-y-5 shadow-xs">
              <div className="border-b border-stone-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-mono">
                  Actualizar Contraseña
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Protege tu cuenta con una contraseña de al menos 8 caracteres.
                </p>
              </div>

              <form onSubmit={handleCambiarContrasena} className="space-y-4">
                <Input
                  label="Contraseña Actual *"
                  type="password"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <Input
                  label="Nueva Contraseña (mínimo 8 caracteres) *"
                  type="password"
                  value={contrasenaNueva}
                  onChange={(e) => setContrasenaNueva(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <Input
                  label="Confirmar Nueva Contraseña *"
                  type="password"
                  value={confirmarNueva}
                  onChange={(e) => setConfirmarNueva(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={cambiando}
                  className="w-full justify-center mt-2 flex items-center gap-2"
                >
                  <IconLock size={15} />
                  <span>{cambiando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
                </Button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
