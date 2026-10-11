import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ModalEmpleado from '../components/ModalEmpleado';
import { EmpleadosService } from '../services/api';

interface Empleado {
  id: number;
  nombre: string;
  puesto: string;
  departamento: string;
  estatus: string;
}

export default function Empleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cargarEmpleados = () => {
    EmpleadosService.obtenerTodos()
      .then((data) => setEmpleados(data))
      .catch((err) => console.log('Sin backend activo aún, cargando plantilla de prueba.', err));
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const empleadosFiltrados = empleados.filter((emp) =>
    emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    emp.puesto.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', backgroundColor: '#f1efef', minHeight: 'calc(100vh - 60px)' }}>
          <h2 style={{ color: '#1e293b' }}>Gestión de Empleados</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar por nombre o puesto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '0.6rem 1rem', width: '300px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              + Nuevo Empleado
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Nombre</th>
                <th style={{ padding: '1rem' }}>Puesto</th>
                <th style={{ padding: '1rem' }}>Departamento</th>
                <th style={{ padding: '1rem' }}>Estatus</th>
                <th style={{ padding: '1rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleadosFiltrados.length > 0 ? (
                empleadosFiltrados.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>{emp.id}</td>
                    <td style={{ padding: '1rem' }}>{emp.nombre}</td>
                    <td style={{ padding: '1rem' }}>{emp.puesto}</td>
                    <td style={{ padding: '1rem' }}>{emp.departamento}</td>
                    <td style={{ padding: '1rem' }}>{emp.estatus}</td>
                    <td style={{ padding: '1rem' }}>
                      <button style={{ marginRight: '0.5rem', cursor: 'pointer' }}>Editar</button>
                      <button style={{ color: '#dc2626', cursor: 'pointer' }}>Eliminar</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No hay registros de empleados disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>

      <ModalEmpleado 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onEmpleadoCreado={cargarEmpleados} 
      />
    </div>
  );
}