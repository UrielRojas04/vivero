import api from './config';

const API_URL = `/bandejas`;

export const getBandejas = () => api.get(API_URL);

export const saveBandeja = (bandeja, username) =>
    api.post(API_URL, bandeja, { params: { username } });

export const updateBandeja = (id, bandeja) => api.put(`${API_URL}/${id}`, bandeja);

export const deleteBandeja = (id) => api.delete(`${API_URL}/${id}`);

export const assignToGreenhouse = (id, ubicacionId, username, cantidadAMover) =>
    api.put(`${API_URL}/${id}/asignar-ubicacion`, null, {
        params: { ubicacionId, username, cantidadAMover }
    });

export const moveToTelas = (id, nuevaUbicacionId, username, cantidadAMover) =>
    api.put(`${API_URL}/${id}/mover-a-telas`, null, {
        params: { nuevaUbicacionId, username, cantidadAMover }
    });

// CORRECCIÓN: Ahora envía el username para el log de movimientos
export const sellBandeja = (id, username) =>
    api.patch(`${API_URL}/${id}/vender`, null, { params: { username } });