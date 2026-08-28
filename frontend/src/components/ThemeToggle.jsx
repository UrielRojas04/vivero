import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

// Revisión post-implementación (switch-tema-claro-oscuro): el usuario probó el popover de tres
// opciones y pidió reemplazarlo por un botón único que alterna directamente entre claro y oscuro
// con un solo clic, sin menú ni backdrop (ver "Revisión post-implementación" en design.md).
//
// El ícono mostrado es el del tema AL QUE SE VA a cambiar (patrón común de toggle: un ícono de
// sol en modo oscuro invita a "volver a la luz", uno de luna en modo claro invita a "pasar a
// oscuro"), no el del tema actual.
//
// Mismo punto de montaje que antes (DashboardLayout.jsx, a la izquierda de la campana de
// notificaciones): este change de rumbo sólo reemplaza el contenido del componente.
const ThemeToggle = () => {
  const tema = useThemeStore((state) => state.tema);
  const toggleTema = useThemeStore((state) => state.toggleTema);

  const Icono = tema === 'oscuro' ? Sun : Moon;

  return (
    <button
      onClick={toggleTema}
      className="relative p-2 text-muted hover:text-accent hover:bg-accent-soft rounded-full transition-colors outline-none focus:ring-2 focus:ring-accent cursor-pointer"
      aria-label="Cambiar tema"
    >
      <Icono className="w-5 h-5" />
    </button>
  );
};

export default ThemeToggle;
