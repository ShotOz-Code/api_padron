const API_BASE_URL = 'http://localhost:8080/api';

// peticiones HTTP
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error HTTP: ${response.status}`);
  }

  return response.json();
}

// servicios de empleados
export const EmpleadosService = {
  obtenerTodos: () => fetchAPI<any[]>('/empleados'),
  obtenerPorId: (id: number) => fetchAPI<any>(`/empleados/${id}`),
  crear: (datos: any) => fetchAPI<any>('/empleados', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: number, datos: any) => fetchAPI<any>(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  eliminar: (id: number) => fetchAPI<void>(`/empleados/${id}`, { method: 'DELETE' }),
};
