import api from './axios';

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
