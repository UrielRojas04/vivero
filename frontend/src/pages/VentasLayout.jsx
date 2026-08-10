import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart, ListChecks } from 'lucide-react';

export default function VentasLayout() {
  const location = useLocation();

  // Esconder las tabs si no estamos directamente en las rutas base (opcional, pero acá queremos que siempre se vean)
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navegación por Pestañas (Tabs) */}
      <div className="bg-white px-6 pt-4 rounded-t-2xl border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <NavLink
            to="/ventas/nueva"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }
          >
            <ShoppingCart className={`w-5 h-5 mr-2 ${location.pathname === '/ventas/nueva' ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
            Nueva Venta
          </NavLink>

          <NavLink
            to="/ventas/historial"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`
            }
          >
            <ListChecks className={`w-5 h-5 mr-2 ${location.pathname === '/ventas/historial' ? 'text-emerald-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
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
