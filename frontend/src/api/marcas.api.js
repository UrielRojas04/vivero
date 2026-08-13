import api from './axios';

export const marcasApi = {
  getAll: async () => {
    const { data } = await api.get('/marcas');
    return data;
  },
  create: async (marca) => {
    const { data } = await api.post('/marcas', marca);
    return data;
  },
  update: async (id, marca) => {
    const { data } = await api.put(`/marcas/${id}`, marca);
    return data;
  },
  delete: async (id) => {
    await api.delete(`/marcas/${id}`);
  }
};
