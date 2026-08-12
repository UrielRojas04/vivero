import React, { useState } from 'react';
import { Leaf, LayoutDashboard, Settings, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import VariedadesPlantas from './VariedadesPlantas';
import VariedadesBandejas from './VariedadesBandejas';

export default function Configuracion() {
  const { hasPermission } = useAuthStore();
  const [activeSection, setActiveSection] = useState(null);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fadeIn">
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
            <button
              onClick={() => setActiveSection('plantas')}
              className={`bg-white p-6 rounded-2xl shadow-sm border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'plantas' 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'border-gray-100 hover:border-emerald-500 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'plantas' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
              }`}>
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'plantas' ? 'text-emerald-700' : 'text-gray-900 group-hover:text-emerald-700'
                }`}>
                  Variedades de Plantas
                </h2>
                <p className="text-sm text-gray-500">
                  Gestión del catálogo de plantas y crecimiento
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('bandejas')}
              className={`bg-white p-6 rounded-2xl shadow-sm border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'bandejas' 
                  ? 'border-purple-500 ring-2 ring-purple-500/20' 
                  : 'border-gray-100 hover:border-purple-500 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'bandejas' ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-100'
              }`}>
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'bandejas' ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-700'
                }`}>
                  Tipos de Bandejas
                </h2>
                <p className="text-sm text-gray-500">
                  Modelos de bandejas y cantidades de celdas
                </p>
              </div>
            </button>
          </>
        )}
      </div>

      {activeSection && (
        <div className="pt-4 animate-fadeIn">
          {activeSection === 'plantas' && <VariedadesPlantas />}
          {activeSection === 'bandejas' && <VariedadesBandejas />}
        </div>
      )}
    </div>
  );
}
