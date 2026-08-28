import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart, ListChecks } from 'lucide-react';

export default function VentasLayout() {
  const location = useLocation();

  // Esconder las tabs si no estamos directamente en las rutas base (opcional, pero acá queremos que siempre se vean)
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navegación por Pestañas (Tabs) */}
      <div className="bg-paper px-6 pt-4 rounded-t-panel border-b border-line">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <NavLink
            to="/ventas/nueva"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-accent text-accent-ink'
                  : 'border-transparent text-muted hover:text-body hover:border-line-strong'
              }`
            }
          >
            <ShoppingCart className={`w-5 h-5 mr-2 ${location.pathname === '/ventas/nueva' ? 'text-accent' : 'text-faint group-hover:text-muted'}`} />
            Nueva Venta
          </NavLink>

          <NavLink
            to="/ventas/historial"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-accent text-accent-ink'
                  : 'border-transparent text-muted hover:text-body hover:border-line-strong'
              }`
            }
          >
            <ListChecks className={`w-5 h-5 mr-2 ${location.pathname === '/ventas/historial' ? 'text-accent' : 'text-faint group-hover:text-muted'}`} />
            Historial de Ventas
          </NavLink>
        </nav>
      </div>

      {/* Renderiza NuevaVenta o HistorialVentas */}
      <div className="pb-8">
        <Outlet />
      </div>
    </div>
  );
}
