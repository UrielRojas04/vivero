import api from './axios';

export const productosApi = {
  getAll: async () => {
    const { data } = await api.get('/productos');
    return data;
  }
};
