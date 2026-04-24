import api from './config';

const API_URL = `/variedades`;

export const getVariedades = () => api.get(API_URL);
export const saveVariedad = (variedad) => api.post(API_URL, variedad);
export const deleteVariedad = (id) => api.delete(`${API_URL}/${id}`);
export const updateVariedad = (id, variedad) => api.put(`${API_URL}/${id}`, variedad);