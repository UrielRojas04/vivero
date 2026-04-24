import api from './config';

const API_URL = `/ubicaciones`;

export const getUbicaciones = () => api.get(API_URL);
export const saveUbicacion = (u) => api.post(API_URL, u);
export const deleteUbicacion = (id) => api.delete(`${API_URL}/${id}`);