import { create } from 'zustand';

// Revisión post-implementación (switch-tema-claro-oscuro): el usuario probó la versión de tres
// estados con persistencia en localStorage y pidió simplificarla a un toggle de dos estados,
// sólo en memoria (ver "Revisión post-implementación" en design.md). Sin `persist`: el store es
// un Zustand plano, sin middleware, sin escritura a localStorage.
//
// `tema` se inicializa UNA SOLA VEZ al cargar el módulo, consultando matchMedia directamente —
// no hay tercer estado "sistema" que resolver en cada render. A partir de ahí es sólo un toggle:
// cada clic invierte el valor en memoria. Al recargar la pestaña, el módulo se reevalúa desde
// cero y vuelve a arrancar siguiendo el sistema operativo, igual que el comportamiento pasivo
// original (previo a este change).
const temaInicial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';

export const useThemeStore = create((set) => ({
  tema: temaInicial, // 'claro' | 'oscuro'

  toggleTema: () => set((state) => ({ tema: state.tema === 'claro' ? 'oscuro' : 'claro' })),
}));
