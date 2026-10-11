import React, { useState } from 'react';
import { EmpleadosService } from '../services/api';

interface ModalEmpleadoProps {
  isOpen: boolean;
  onClose: () => void;
  onEmpleadoCreado: () => void;
}

export default function ModalEmpleado({ isOpen, onClose, onEmpleadoCreado }: ModalEmpleadoProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    puesto: '',
    departamento: '',
    estatus: 'Activo'
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await EmpleadosService.crear(formData);
      onEmpleadoCreado();
      onClose();
      setFormData({ nombre: '', puesto: '', departamento: '', estatus: 'Activo' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar el empleado');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '400px', color: '#000' }}>
        <h3>Registrar Nuevo Empleado</h3>
        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Nombre:</label><br />
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Puesto:</label><br />
            <input type="text" name="puesto" value={formData.puesto} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Departamento:</label><br />
            <input type="text" name="departamento" value={formData.departamento} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Estatus:</label><br />
            <select name="estatus" value={formData.estatus} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}