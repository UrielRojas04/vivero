import api from './axios';

export const negociosApi = {
  getAll: async () => {
    const { data } = await api.get('/negocios');
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/negocios/${id}`, payload);
    return data;
  },
};
