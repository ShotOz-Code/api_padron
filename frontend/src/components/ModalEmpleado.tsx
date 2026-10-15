import React, { useState, useEffect } from 'react';
import {
  EmpleadosService,
  CatalogosService,
  VacantesService,
  type Sucursal,
  type Puesto,
  type Vacante,
  type Rol,
} from '../services/api';
import { Button, Input, Select, Modal } from './ui';

interface ModalEmpleadoProps {
  isOpen: boolean;
  onClose: () => void;
  onEmpleadoCreado: () => void;
}

export default function ModalEmpleado({ isOpen, onClose, onEmpleadoCreado }: ModalEmpleadoProps) {
  const hoyStr = new Date().toISOString().split('T')[0];
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [crearUsuario, setCrearUsuario] = useState(false);

  const [formData, setFormData] = useState({
    numero_empleado: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    correo: '',
    telefono: '',
    fecha_ingreso: hoyStr,
    sueldo_semanal: '3500.00',
    sucursal_id: 1,
    puesto_id: 1,
    vacante_id: 0,
    usuario: '',
    contrasena: '',
    rol: 'OPERATIVO' as Rol,
  });

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      CatalogosService.obtenerSucursales()
        .then((res) => {
          const activas = res.filter((s) => s.activo);
          setSucursales(activas);
          if (activas.length > 0) {
            setFormData((prev) => ({ ...prev, sucursal_id: activas[0].id }));
          }
        })
        .catch(console.error);

      CatalogosService.obtenerPuestos()
        .then((res) => {
          const activos = res.filter((p) => p.activo);
          setPuestos(activos);
          if (activos.length > 0) {
            setFormData((prev) => ({ ...prev, puesto_id: activos[0].id }));
          }
        })
        .catch(console.error);

      VacantesService.obtenerTodas({ estado: 'DISPONIBLE' })
        .then((res) => setVacantes(res))
        .catch(console.error);
    }
  }, [isOpen]);

  const puestoActual = puestos.find((p) => p.id === Number(formData.puesto_id));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'vacante_id') {
      const vId = Number(value);
      const v = vacantes.find((item) => item.id === vId);
      if (v) {
        setFormData((prev) => ({
          ...prev,
          vacante_id: vId,
          sucursal_id: v.sucursal_id,
          puesto_id: v.puesto_id,
          sueldo_semanal: v.sueldo_ofertado_centavos > 0 ? (v.sueldo_ofertado_centavos / 100).toFixed(2) : prev.sueldo_semanal,
        }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numEmp = formData.numero_empleado.trim();
    if (!numEmp) {
      setError('El número de empleado es obligatorio.');
      return;
    }
    if (numEmp.length > 30) {
      setError('El número de empleado no puede superar 30 caracteres.');
      return;
    }
    const patronNumEmp = /^[A-Za-z0-9\-_]+$/;
    if (!patronNumEmp.test(numEmp)) {
      setError('El número de empleado solo puede incluir letras, números, guiones y guiones bajos.');
      return;
    }

    const nombres = formData.nombres.trim();
    if (!nombres) {
      setError('El nombre del empleado es obligatorio.');
      return;
    }
    if (nombres.length > 80) {
      setError('El nombre no puede superar 80 caracteres.');
      return;
    }

    const apPaterno = formData.apellido_paterno.trim();
    if (!apPaterno) {
      setError('El apellido paterno es obligatorio.');
      return;
    }
    if (apPaterno.length > 80) {
      setError('El apellido paterno no puede superar 80 caracteres.');
      return;
    }

    const curp = formData.curp.trim().toUpperCase();
    if (curp) {
      if (curp.length !== 18) {
        setError('La CURP debe tener exactamente 18 caracteres.');
        return;
      }
      const curpValida = /^[A-Z0-9]{18}$/.test(curp);
      if (!curpValida) {
        setError('La CURP solo puede contener letras mayúsculas y números sin espacios ni caracteres especiales.');
        return;
      }
    }

    const correo = formData.correo.trim();
    if (correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        setError('El formato del correo electrónico no es válido.');
        return;
      }
      if (correo.length > 120) {
        setError('El correo no puede exceder 120 caracteres.');
        return;
      }
    }

    const telefono = formData.telefono.trim();
    if (telefono && telefono.length > 25) {
      setError('El teléfono no puede exceder 25 caracteres.');
      return;
    }

    if (!formData.fecha_ingreso) {
      setError('La fecha de ingreso es obligatoria.');
      return;
    }
    if (formData.fecha_ingreso > hoyStr) {
      setError('La fecha de ingreso no puede ser posterior al día de hoy.');
      return;
    }

    const sueldoNum = parseFloat(formData.sueldo_semanal);
    if (isNaN(sueldoNum) || sueldoNum <= 0) {
      setError('El sueldo semanal debe ser un número mayor a cero.');
      return;
    }

    if (!formData.sucursal_id || Number(formData.sucursal_id) <= 0) {
      setError('Debes seleccionar una sucursal.');
      return;
    }

    if (!formData.puesto_id || Number(formData.puesto_id) <= 0) {
      setError('Debes seleccionar un puesto.');
      return;
    }

    if (crearUsuario) {
      const usr = formData.usuario.trim();
      if (!usr) {
        setError('El nombre de usuario es obligatorio si habilitas cuenta de acceso.');
        return;
      }
      if (usr.length > 80) {
        setError('El nombre de usuario no puede exceder 80 caracteres.');
        return;
      }
      if (!formData.contrasena || formData.contrasena.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (formData.contrasena.length > 128) {
        setError('La contraseña no puede exceder 128 caracteres.');
        return;
      }
    }

    setGuardando(true);
    try {
      const payload: any = {
        numero_empleado: numEmp,
        nombres,
        apellido_paterno: apPaterno,
        fecha_ingreso: formData.fecha_ingreso,
        sueldo_semanal_centavos: Math.round(sueldoNum * 100),
        sucursal_id: Number(formData.sucursal_id),
        puesto_id: Number(formData.puesto_id),
      };

      if (formData.apellido_materno.trim()) payload.apellido_materno = formData.apellido_materno.trim();
      if (curp) payload.curp = curp;
      if (correo) payload.correo = correo;
      if (telefono) payload.telefono = telefono;
      if (formData.vacante_id && Number(formData.vacante_id) > 0) {
        payload.vacante_id = Number(formData.vacante_id);
      }

      if (crearUsuario && formData.usuario.trim() && formData.contrasena) {
        payload.usuario = formData.usuario.trim();
        payload.contrasena = formData.contrasena;
        payload.rol = formData.rol;
      }

      await EmpleadosService.crear(payload);
      onEmpleadoCreado();
      onClose();

      setFormData({
        numero_empleado: '',
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        curp: '',
        correo: '',
        telefono: '',
        fecha_ingreso: hoyStr,
        sueldo_semanal: '3500.00',
        sucursal_id: sucursales[0]?.id || 1,
        puesto_id: puestos[0]?.id || 1,
        vacante_id: 0,
        usuario: '',
        contrasena: '',
        rol: 'OPERATIVO',
      });
      setCrearUsuario(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el empleado');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alta de Empleado"
      description="Registra un nuevo colaborador y asigna su puesto con jefatura directa."
      maxWidth="max-w-xl"
    >
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-3 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Nº Nómina *"
            name="numero_empleado"
            value={formData.numero_empleado}
            onChange={handleChange}
            placeholder="PAD-001"
            maxLength={30}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Nombres *"
              name="nombres"
              value={formData.nombres}
              onChange={handleChange}
              placeholder="María"
              maxLength={80}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Apellido Paterno *"
            name="apellido_paterno"
            value={formData.apellido_paterno}
            onChange={handleChange}
            placeholder="López"
            maxLength={80}
            required
          />
          <Input
            label="Apellido Materno"
            name="apellido_materno"
            value={formData.apellido_materno}
            onChange={handleChange}
            placeholder="Soto"
            maxLength={80}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="CURP (18 caracteres)"
            name="curp"
            value={formData.curp}
            onChange={handleChange}
            placeholder="LOPM900101HMCPRR01"
            maxLength={18}
            className="uppercase font-mono"
          />
          <Input
            label="Sueldo Semanal ($ MXN) *"
            type="number"
            step="0.01"
            name="sueldo_semanal"
            value={formData.sueldo_semanal}
            onChange={handleChange}
            required
          />
        </div>

        {vacantes.length > 0 && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
            <Select
              label="Asignar Vacante Disponible (Opcional)"
              name="vacante_id"
              value={formData.vacante_id}
              onChange={handleChange}
            >
              <option value={0}>Sin vacante asignada al ingreso (se configurará manualmente)</option>
              {vacantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.codigo} — {v.titulo} ({v.sucursal})
                </option>
              ))}
            </Select>
            <p className="text-[10px] text-stone-500">
              Al seleccionar una vacante, se autocompletarán la sucursal, puesto y sueldo ofertado de la plaza.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Sucursal *"
            name="sucursal_id"
            value={formData.sucursal_id}
            onChange={handleChange}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>

          <Select
            label="Puesto Asignado *"
            name="puesto_id"
            value={formData.puesto_id}
            onChange={handleChange}
          >
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.es_critico ? '(Crítico)' : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* Indicador de Jefe Directo del puesto */}
        {puestoActual && (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between text-xs">
            <span className="font-medium text-stone-700">Jefe Directo del Puesto:</span>
            <span className="font-semibold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
              {puestoActual.jefe_puesto ? puestoActual.jefe_puesto : 'Encargado General de Sucursal'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Fecha Ingreso *"
            type="date"
            name="fecha_ingreso"
            value={formData.fecha_ingreso}
            max={hoyStr}
            onChange={handleChange}
            required
          />
          <Input
            label="Correo Electrónico"
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            placeholder="maria@padron.mx"
          />
          <Input
            label="Teléfono"
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="5555555555"
          />
        </div>

        <div className="pt-2 border-t border-stone-100 space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={crearUsuario}
              onChange={(e) => setCrearUsuario(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-amber-600 accent-amber-600"
            />
            Habilitar usuario de acceso al sistema
          </label>

          {crearUsuario && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
              <Input
                label="Usuario *"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                required={crearUsuario}
                placeholder="maria.lopez"
              />
              <Input
                label="Contraseña (min 8) *"
                type="password"
                name="contrasena"
                value={formData.contrasena}
                onChange={handleChange}
                required={crearUsuario}
                minLength={8}
                placeholder="••••••••"
              />
              <Select
                label="Rol de Acceso *"
                name="rol"
                value={formData.rol}
                onChange={handleChange}
              >
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="ENCARGADO">ENCARGADO</option>
                <option value="RH_ADMIN">RH_ADMIN</option>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={guardando}>
            Registrar Empleado
          </Button>
        </div>
      </form>
    </Modal>
  );
}