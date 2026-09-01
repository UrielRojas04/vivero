import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Truck, Warehouse } from 'lucide-react';

export default function TrasladosAbonoLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navegación por Pestañas (Tabs) */}
      <div className="bg-paper px-6 pt-4 rounded-t-panel border-b border-line">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <NavLink
            to="/abono/traslados/registrar"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-accent text-accent-ink'
                  : 'border-transparent text-muted hover:text-body hover:border-line-strong'
              }`
            }
          >
            <Truck className={`w-5 h-5 mr-2 ${location.pathname === '/abono/traslados/registrar' ? 'text-accent' : 'text-faint group-hover:text-muted'}`} />
            Registrar Traslado
          </NavLink>

          <NavLink
            to="/abono/traslados/stock"
            className={({ isActive }) =>
              `group inline-flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-accent text-accent-ink'
                  : 'border-transparent text-muted hover:text-body hover:border-line-strong'
              }`
            }
          >
            <Warehouse className={`w-5 h-5 mr-2 ${location.pathname === '/abono/traslados/stock' ? 'text-accent' : 'text-faint group-hover:text-muted'}`} />
            Stock por Ubicación
          </NavLink>
        </nav>
      </div>

      {/* Renderiza RegistrarTrasladoAbono o StockUbicacionAbono */}
      <div className="pb-8">
        <Outlet />
      </div>
    </div>
  );
}
