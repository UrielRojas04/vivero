import React, { useState } from 'react';
import { Leaf, LayoutDashboard, Settings, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import VariedadesPlantas from './VariedadesPlantas';
import VariedadesBandejas from './VariedadesBandejas';
import Proveedores from './Proveedores';
import ConfiguracionHerramientas from '../components/ConfiguracionHerramientas';
import { Truck } from 'lucide-react';
// ConfiguracionMarcas ya no se renderiza acá (OQ10, grupo 10 de config-costeo-por-proveedor,
// tarea 10.7): la pestaña "Marcas" se esconde, pero el componente, MarcaController,
// MarcaService(Impl), MarcaRepository, MarcaDTO y los endpoints /api/marcas quedan intactos
// como red de rollback de la unificación Marca->Proveedor (OQ1). Borrarlos de verdad es un
// chore posterior. No reimportar este componente sin volver a leer esa decisión.

export default function Configuracion() {
  const { hasPermission, unidadNegocioActiva } = useAuthStore();
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
        {/* Vivero Configs require ADMIN_DB */}
        {hasPermission('ADMIN_DB') && unidadNegocioActiva !== '2' && (
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

        {/* Herramientas Configs require ESCRIBIR_STOCK or ADMIN_DB */}
        {(hasPermission('ESCRIBIR_STOCK') || hasPermission('ADMIN_DB')) && unidadNegocioActiva === '2' && (
          <>
            <button
              onClick={() => setActiveSection('herramientas')}
              className={`bg-white p-6 rounded-2xl shadow-sm border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'herramientas'
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-gray-100 hover:border-orange-500 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'herramientas' ? 'bg-orange-100 text-orange-700' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'
              }`}>
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'herramientas' ? 'text-orange-700' : 'text-gray-900 group-hover:text-orange-700'
                }`}>
                  Costos de Envío
                </h2>
                <p className="text-sm text-gray-500">
                  Configuración de recargos para herramientas
                </p>
              </div>
            </button>
          </>
        )}

        {/* Proveedores requiere LEER_PEDIDOS (sólo lo tienen JEFE y ADMIN 2 hoy) — a propósito
            separado del resto de "Herramientas Configs", que gobierna ESCRIBIR_STOCK: la
            configuración de proveedores incluye datos de costeo (IVA, descuentos, moneda) que
            no debería ver cualquiera con permiso de stock, sólo quien gestiona pedidos. */}
        {hasPermission('LEER_PEDIDOS') && unidadNegocioActiva === '2' && (
          <button
            onClick={() => setActiveSection('proveedores')}
            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
              activeSection === 'proveedores'
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-gray-100 hover:border-blue-500 hover:shadow-md'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              activeSection === 'proveedores' ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            }`}>
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold transition-colors mb-1 ${
                activeSection === 'proveedores' ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-700'
              }`}>
                Proveedores
              </h2>
              <p className="text-sm text-gray-500">
                Perfil de costeo por defecto: IVA, descuentos, envío y moneda
              </p>
            </div>
          </button>
        )}
      </div>

      {activeSection && (
        <div className="pt-4 animate-fadeIn">
          {activeSection === 'plantas' && <VariedadesPlantas />}
          {activeSection === 'bandejas' && <VariedadesBandejas />}
          {activeSection === 'herramientas' && <ConfiguracionHerramientas />}
          {activeSection === 'proveedores' && <Proveedores />}
        </div>
      )}
    </div>
  );
}
