import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Vuelta atrás parcial (2026-09-05, reportado por el dueño): sin persistencia, cada F5 o cambio
// de negocio (que hace window.location.reload()) perdía la elección manual y volvía a seguir el
// modo del sistema operativo -- si el SO tiene oscuro activado, cada recarga "revertía" el tema
// aunque el usuario acabara de elegir claro a mano. Se reintroduce `persist` (localStorage) para
// que el toggle manual sobreviva a un reload, pero se mantiene el resto de la simplificación
// anterior: sigue siendo un toggle de dos estados sin menú ni tercer estado "sistema" en cada
// render -- eso no cambia.
//
// `tema` sólo se resuelve contra matchMedia la PRIMERA vez que este usuario/navegador usa la
// app (nada guardado todavía en localStorage); a partir de ahí, persist toma el control y el
// valor guardado siempre gana sobre la preferencia del sistema.
const temaInicial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';

export const useThemeStore = create(
  persist(
    (set) => ({
      tema: temaInicial, // 'claro' | 'oscuro'

      toggleTema: () => set((state) => ({ tema: state.tema === 'claro' ? 'oscuro' : 'claro' })),
    }),
    {
      name: 'tema-vivero',
    }
  )
);
