import api from './axios';

export const getAllCategoriasAbono = () => api.get('/categorias-abono');
export const createCategoriaAbono = (categoria) => api.post('/categorias-abono', categoria);
export const updateCategoriaAbono = (id, categoria) => api.put(`/categorias-abono/${id}`, categoria);
export const deleteCategoriaAbono = (id) => api.delete(`/categorias-abono/${id}`);
