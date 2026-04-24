import api from './config';

const API_URL = `/auth`;

export const login = (credentials) => api.post(`${API_URL}/login`, credentials);
export const register = (userData) => api.post(`${API_URL}/register`, userData);