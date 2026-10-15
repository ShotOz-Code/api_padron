import React, { useState, useEffect } from 'react';
import { PerfilService, AutenticacionService, type PerfilRespuesta, obtenerNombreUsuario, obtenerRol } from '../services/api';
import { Modal, Button, Input, Badge } from './ui';
import { IconUser, IconLock, IconCheck, IconAlertTriangle } from './ui/Icons';
import { useNavigate } from 'react-router-dom';

interface ModalUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalUsuario({ isOpen, onClose }: ModalUsuarioProps) {
  const navigate = useNavigate();
  const usuario = obtenerNombreUsuario();
  const rol = obtenerRol() || 'OPERATIVO';

  const [perfil, setPerfil] = useState<PerfilRespuesta | null>(null);
  const [cargando, setCargando] = useState(false);

  // Tab interna: 'perfil' | 'seguridad'
  const [tab, setTab] = useState<'perfil' | 'seguridad'>('perfil');

  // Cambio de contraseña
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarNueva, setConfirmarNueva] = useState('');
  const [mensajePass, setMensajePass] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [guardandoPass, setGuardandoPass] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCargando(true);
      PerfilService.obtenerPerfil()
        .then((data) => setPerfil(data))
        .catch((err) => console.error('Error cargando perfil:', err))
        .finally(() => setCargando(false));
    }
  }, [isOpen]);

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajePass(null);

    if (contrasenaNueva.length < 8) {
      setMensajePass({ tipo: 'error', texto: 'La nueva contraseña debe tener mínimo 8 caracteres.' });
      return;
    }
    if (contrasenaNueva !== confirmarNueva) {
      setMensajePass({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }

    setGuardandoPass(true);
    try {
      const res = await PerfilService.cambiarContrasena({
        contrasena_actual: contrasenaActual,
        contrasena_nueva: contrasenaNueva,
      });
      setMensajePass({ tipo: 'ok', texto: res.mensaje || 'Contraseña actualizada con éxito.' });
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmarNueva('');
    } catch (err: any) {
      setMensajePass({ tipo: 'error', texto: err.message || 'Error al cambiar contraseña' });
    } finally {
      setGuardandoPass(false);
    }
  };

  const handleCerrarSesion = () => {
    AutenticacionService.cerrarSesion();
    onClose();
    navigate('/');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Panel de Usuario" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Cabecera del usuario */}
        <div className="flex items-center gap-3.5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <IconUser size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-stone-900 truncate">{usuario}</h4>
              <Badge variant={rol === 'RH_ADMIN' ? 'default' : rol === 'ENCARGADO' ? 'warning' : 'neutral'}>
                {rol === 'RH_ADMIN' ? 'RH Administrador' : rol === 'ENCARGADO' ? 'Encargado' : 'Operativo'}
              </Badge>
            </div>
            <p className="text-xs text-stone-600 font-medium truncate mt-0.5">
              {perfil?.empleado
                ? `${perfil.empleado.nombres} ${perfil.empleado.apellido_paterno} — ${perfil.empleado.puesto}`
                : 'Cuenta Administrativa de Sistema'}
            </p>
          </div>
        </div>

        {/* Pestañas limpias (Segmented Control) */}
        <div className="flex p-1 bg-stone-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setTab('perfil')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs rounded-lg transition-all cursor-pointer ${
              tab === 'perfil'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 font-medium'
            }`}
          >
            <IconUser size={14} />
            <span>Mi Identidad</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('seguridad')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs rounded-lg transition-all cursor-pointer ${
              tab === 'seguridad'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 font-medium'
            }`}
          >
            <IconLock size={14} />
            <span>Seguridad y Contraseña</span>
          </button>
        </div>

        {/* Tab 1: Perfil */}
        {tab === 'perfil' && (
          <div className="space-y-3 pt-1">
            {cargando ? (
              <div className="p-4 text-center text-xs text-stone-500 font-medium">Cargando perfil...</div>
            ) : perfil?.empleado ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">No. Nómina</span>
                  <span className="font-mono font-bold text-stone-900 mt-0.5 block">{perfil.empleado.numero_empleado}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Sucursal</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">{perfil.empleado.sucursal}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Puesto Asignado</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">{perfil.empleado.puesto}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Jefe Directo</span>
                  <span className="font-semibold text-stone-900 mt-0.5 block">{perfil.empleado.jefe_puesto || 'Encargado General'}</span>
                </div>
                {perfil.empleado.vacante_codigo && (
                  <div className="col-span-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase block">Plaza / Vacante</span>
                    <span className="font-semibold text-amber-900 mt-0.5 block">
                      {perfil.empleado.vacante_codigo} — {perfil.empleado.vacante_titulo}
                    </span>
                  </div>
                )}
                <div className="col-span-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Contacto</span>
                  <span className="text-stone-800 mt-0.5 block">{perfil.empleado.correo || perfil.empleado.telefono || 'Sin datos de contacto'}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
                Usuario administrativo sin expediente de nómina ligado.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="danger" size="sm" onClick={handleCerrarSesion}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Seguridad */}
        {tab === 'seguridad' && (
          <form onSubmit={handleCambiarPassword} className="space-y-3 pt-1">
            {mensajePass && (
              <div
                className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  mensajePass.tipo === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {mensajePass.tipo === 'ok' ? <IconCheck size={14} /> : <IconAlertTriangle size={14} />}
                <span>{mensajePass.texto}</span>
              </div>
            )}

            <Input
              label="Contraseña Actual"
              type="password"
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Input
              label="Nueva Contraseña (mínimo 8 caracteres)"
              type="password"
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Input
              label="Confirmar Nueva Contraseña"
              type="password"
              value={confirmarNueva}
              onChange={(e) => setConfirmarNueva(e.target.value)}
              required
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={guardandoPass}
              className="w-full justify-center mt-2"
            >
              {guardandoPass ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
