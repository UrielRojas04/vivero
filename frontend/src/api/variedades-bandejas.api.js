import api from './axios';

export const variedadesBandejasApi = {
  getAll: () => api.get('/variedades-bandejas'),
  getById: (id) => api.get(`/variedades-bandejas/${id}`),
  create: (data) => api.post('/variedades-bandejas', data),
  update: (id, data) => api.put(`/variedades-bandejas/${id}`, data),
  delete: (id) => api.delete(`/variedades-bandejas/${id}`)
};
