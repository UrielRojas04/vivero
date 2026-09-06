import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// VITE_API_URL (opcional, ver frontend/.env): pisa la URL del backend cuando no alcanza con
// derivarla del hostname actual -- caso real: demo por túnel (ngrok/Cloudflare Tunnel), donde
// frontend y backend quedan cada uno detrás de una URL pública distinta y no hay forma de
// derivar una a partir de la otra. Sin la variable, sigue el comportamiento de siempre.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080/api`,
});

// Interceptor para inyectar el JWT en cada request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const state = useAuthStore.getState();
    const unidadNegocioActiva = state.unidadNegocioActiva;
    if (unidadNegocioActiva) {
      config.headers['X-Unidad-Negocio'] = unidadNegocioActiva;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar el 401 (Unauthorized) globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login'; // O usar navigate si está disponible fuera de componentes
    }
    return Promise.reject(error);
  }
);

export default api;
