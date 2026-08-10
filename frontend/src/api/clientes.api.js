import api from './axios';

export const clientesApi = {
  getAll: async () => {
    const { data } = await api.get('/clientes');
    return data;
  }
};
