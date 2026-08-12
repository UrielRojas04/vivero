import React from 'react';
import { NavLink } from 'react-router-dom';
import { Leaf, LayoutDashboard, Settings } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Configuracion() {
  const { hasPermission } = useAuthStore();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
            <Settings className="w-7 h-7" />
          </div>
          Configuración General
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasPermission('ADMIN_DB') && (
          <>
            <NavLink
              to="/variedades-plantas"
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-500 hover:shadow-md transition-all group flex items-start gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1">
                  Variedades de Plantas
                </h2>
                <p className="text-sm text-gray-500">
                  Gestión del catálogo de plantas, nombres y días estimados de crecimiento.
                </p>
              </div>
            </NavLink>

            <NavLink
              to="/variedades-bandejas"
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-500 hover:shadow-md transition-all group flex items-start gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1">
                  Tipos de Bandejas
                </h2>
                <p className="text-sm text-gray-500">
                  Definición de modelos de bandejas y sus respectivas cantidades de celdas.
                </p>
              </div>
            </NavLink>
          </>
        )}

        {/* Espacio para futuras configuraciones (ej: Usuarios, Perfil, etc) */}
      </div>
    </div>
  );
}
