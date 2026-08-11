import axiosInstance from './axios';

export const getGastos = async (params = { q: '', page: 0, size: 10 }) => {
  const response = await axiosInstance.get('/gastos', { params });
  return response.data;
};

export const createGasto = async (gastoData) => {
  const response = await axiosInstance.post('/gastos', gastoData);
  return response.data;
};
