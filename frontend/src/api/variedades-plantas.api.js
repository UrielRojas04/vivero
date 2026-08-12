import api from './axios';

export const variedadesPlantasApi = {
  getAll: () => api.get('/variedades-plantas'),
  getById: (id) => api.get(`/variedades-plantas/${id}`),
  create: (data) => api.post('/variedades-plantas', data),
  update: (id, data) => api.put(`/variedades-plantas/${id}`, data),
  delete: (id) => api.delete(`/variedades-plantas/${id}`)
};
