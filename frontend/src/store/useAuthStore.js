import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  unidadNegocioActiva: localStorage.getItem('unidadNegocioActiva') || null,
  negociosDisponibles: JSON.parse(localStorage.getItem('negociosDisponibles')) || [],
  login: (token, user, negocios) => {
    localStorage.setItem('token', token);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    if (negocios) {
      localStorage.setItem('negociosDisponibles', JSON.stringify(negocios));
    }
    set({ token, user, negociosDisponibles: negocios || [] });
    
    if (negocios && negocios.length > 0) {
      const { unidadNegocioActiva } = useAuthStore.getState();
      if (!unidadNegocioActiva || !negocios.find(n => n.id.toString() === unidadNegocioActiva)) {
        const defaultId = negocios[0].id.toString();
        localStorage.setItem('unidadNegocioActiva', defaultId);
        set({ unidadNegocioActiva: defaultId });
      }
    }
  },
  setNegociosDisponibles: (negocios) => {
    set({ negociosDisponibles: negocios });
    // Auto-select first if none active
    const { unidadNegocioActiva } = useAuthStore.getState();
    if (!unidadNegocioActiva && negocios.length > 0) {
      const defaultId = negocios[0].id.toString();
      localStorage.setItem('unidadNegocioActiva', defaultId);
      set({ unidadNegocioActiva: defaultId });
    }
  },
  setUnidadNegocioActiva: (id) => {
    localStorage.setItem('unidadNegocioActiva', id.toString());
    set({ unidadNegocioActiva: id.toString() });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('unidadNegocioActiva');
    localStorage.removeItem('negociosDisponibles');
    set({ token: null, user: null, unidadNegocioActiva: null, negociosDisponibles: [] });
  },
  hasPermission: (permission) => {
    const { user } = useAuthStore.getState();
    if (!user || !user.authorities) return false;
    return user.authorities.includes(permission);
  },
}));
