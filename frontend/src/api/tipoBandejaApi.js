import api from './config';

const API_URL = `/tipos-bandeja`;

export const getTiposBandeja = () => api.get(API_URL);
export const saveTipoBandeja = (tipo) => api.post(API_URL, tipo);
export const deleteTipoBandeja = (id) => api.delete(`${API_URL}/${id}`);