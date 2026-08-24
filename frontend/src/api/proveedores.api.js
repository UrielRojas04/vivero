import api from './axios';

// payload de create/update, desde config-costeo-por-proveedor (grupo 4 de tasks.md):
// { nombre, telefono, contacto,
//   ivaIncluidoEnPrecio, ivaPorDefectoPorcentaje, manejaDolares, costoEnvioPorDefectoPorcentaje,
//   descuentosPorDefecto: [{ nombre, porcentaje }] }
// El backend (ProveedorDTO) acepta y devuelve el perfil completo — ver ProveedorForm.jsx.
export const proveedoresApi = {
  getAll: async () => {
    const { data } = await api.get('/proveedores');
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post('/proveedores', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/proveedores/${id}`, payload);
    return data;
  },
  delete: async (id) => {
    await api.delete(`/proveedores/${id}`);
  }
};
