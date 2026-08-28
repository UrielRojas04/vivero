import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

// Revisión post-implementación (switch-tema-claro-oscuro): ya no hay preferencia de tres estados
// ni resolución contra matchMedia en cada render — `tema` en el store ya es un valor concreto
// ('claro' | 'oscuro'), decidido una sola vez al cargar el módulo (ver useThemeStore.js). Este
// hook se reduce a proyectar ese valor al DOM cada vez que cambia, sin ninguna suscripción propia
// a matchMedia (esa consulta vive únicamente en la inicialización del store).
//
// Se monta en App.jsx (raíz común de login y dashboard) y no en DashboardLayout.jsx, porque
// DashboardLayout sólo envuelve las rutas autenticadas y dejaría el login sin cubrir (Decisión 4
// de design.md).
export const useTheme = () => {
  const tema = useThemeStore((state) => state.tema);

  useEffect(() => {
    document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light';
  }, [tema]);
};
