import axiosInstance from './axios';

export const chequesApi = {
  getAll: async (page = 0, size = 20) => {
    const response = await axiosInstance.get(`/cheques?page=${page}&size=${size}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/cheques/${id}`);
    return response.data;
  },

  create: async (payload) => {
    const response = await axiosInstance.post('/cheques', payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await axiosInstance.put(`/cheques/${id}`, payload);
    return response.data;
  }
};
