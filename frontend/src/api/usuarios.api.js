import axiosInstance from './axios';

export const usuariosApi = {
  getAll: async () => {
    const response = await axiosInstance.get('/usuarios');
    return response.data;
  }
};
