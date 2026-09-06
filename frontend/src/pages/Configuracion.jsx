import React, { useState } from 'react';
import { Leaf, LayoutDashboard, Settings, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import VariedadesPlantas from './VariedadesPlantas';
import VariedadesBandejas from './VariedadesBandejas';
import Proveedores from './Proveedores';
import ConfiguracionHerramientas from '../components/ConfiguracionHerramientas';
import ConfiguracionAbono from '../components/ConfiguracionAbono';
import ConfiguracionAbonoCategorias from './ConfiguracionAbonoCategorias';
import { Truck, Percent } from 'lucide-react';
// ConfiguracionMarcas ya no se renderiza acá (OQ10, grupo 10 de config-costeo-por-proveedor,
// tarea 10.7): la pestaña "Marcas" se esconde, pero el componente, MarcaController,
// MarcaService(Impl), MarcaRepository, MarcaDTO y los endpoints /api/marcas quedan intactos
// como red de rollback de la unificación Marca->Proveedor (OQ1). Borrarlos de verdad es un
// chore posterior. No reimportar este componente sin volver a leer esa decisión.

export default function Configuracion() {
  const { hasPermission, unidadNegocioActiva, negociosDisponibles } = useAuthStore();
  const [activeSection, setActiveSection] = useState(null);

  const activeBusinessId = parseInt(unidadNegocioActiva);
  const unidadSlug = negociosDisponibles.find(n => n.id === activeBusinessId)?.nombre?.toLowerCase() || 'vivero';
  const isAbono = unidadSlug === 'abono';

  // Sin animate-fadeIn en el div de abajo a propósito (bug real, 2026-09-04): esa clase estaba
  // puesta en el CONTENEDOR de toda la página, no en un modal -- un elemento con una animación
  // CSS activa se convierte en el "contenedor de referencia" para sus descendientes con
  // position:fixed, así que los modales abiertos desde acá (VariedadPlantaForm, etc., todos fixed
  // inset-0) quedaban atrapados dentro de este div en vez de cubrir toda la pantalla: el fondo
  // desenfocado no llegaba hasta la sidebar. El fade-in de entrada de la página no vale ese costo
  // -- si algún modal necesita su propia animación de aparición, animate-fadeIn va en el modal
  // mismo (así ya lo hacen ProductoForm.jsx, InsumoForm.jsx, etc.), no en un ancestro.
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
          <div className="p-2 bg-accent-soft rounded-base text-accent-ink">
            <Settings className="w-7 h-7" />
          </div>
          Configuración General
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vivero Configs: ADMIN_DB (histórico) o LEER_CONFIGURACION (permiso dedicado nuevo,
            2026-09-05 -- pedido del dueño de poder otorgar esta sección desde el modal de roles
            sin depender de ADMIN_DB, que es un permiso más amplio de "Usuarios (Admin)"). */}
        {(hasPermission('ADMIN_DB') || hasPermission('LEER_CONFIGURACION')) && unidadSlug === 'vivero' && (
          <>
            <button
              onClick={() => setActiveSection('plantas')}
              className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'plantas'
                  ? 'border-accent ring-2 ring-accent/20'
                  : 'border-line hover:border-accent'
              }`}
            >
              <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'plantas' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
              }`}>
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'plantas' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
                }`}>
                  Variedades de Plantas
                </h2>
                <p className="text-sm text-muted">
                  Gestión del catálogo de plantas y crecimiento
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('bandejas')}
              className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'bandejas'
                  ? 'border-accent ring-2 ring-accent/20'
                  : 'border-line hover:border-accent'
              }`}
            >
              <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'bandejas' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
              }`}>
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'bandejas' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
                }`}>
                  Tipos de Bandejas
                </h2>
                <p className="text-sm text-muted">
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
              className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
                activeSection === 'herramientas'
                  ? 'border-accent ring-2 ring-accent/20'
                  : 'border-line hover:border-accent'
              }`}
            >
              <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
                activeSection === 'herramientas' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
              }`}>
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className={`text-lg font-bold transition-colors mb-1 ${
                  activeSection === 'herramientas' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
                }`}>
                  Costos de Envío
                </h2>
                <p className="text-sm text-muted">
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
            className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
              activeSection === 'proveedores'
                ? 'border-accent ring-2 ring-accent/20'
                : 'border-line hover:border-accent'
            }`}
          >
            <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
              activeSection === 'proveedores' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
            }`}>
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold transition-colors mb-1 ${
                activeSection === 'proveedores' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
              }`}>
                Proveedores
              </h2>
              <p className="text-sm text-muted">
                Perfil de costeo por defecto: IVA, descuentos, envío y moneda
              </p>
            </div>
          </button>
        )}

        {/* Abono Configs: ADMIN_DB (histórico) o LEER_CONFIGURACION (ver comentario arriba) */}
        {(hasPermission('ADMIN_DB') || hasPermission('LEER_CONFIGURACION')) && isAbono && (
          <button
            onClick={() => setActiveSection('abono')}
            className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
              activeSection === 'abono'
                ? 'border-accent ring-2 ring-accent/20'
                : 'border-line hover:border-accent'
            }`}
          >
            <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
              activeSection === 'abono' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
            }`}>
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold transition-colors mb-1 ${
                activeSection === 'abono' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
              }`}>
                Reparto de Abono
              </h2>
              <p className="text-sm text-muted">
                Porcentajes de compensación entre Jefe y Colega
              </p>
            </div>
          </button>
        )}

        {/* Abono Categorias: ADMIN_DB (histórico) o LEER_CONFIGURACION (ver comentario arriba) */}
        {(hasPermission('ADMIN_DB') || hasPermission('LEER_CONFIGURACION')) && isAbono && (
          <button
            onClick={() => setActiveSection('categorias-abono')}
            className={`bg-paper p-6 rounded-panel border transition-all group flex items-start gap-4 cursor-pointer text-left w-full ${
              activeSection === 'categorias-abono'
                ? 'border-accent ring-2 ring-accent/20'
                : 'border-line hover:border-accent'
            }`}
          >
            <div className={`w-12 h-12 rounded-base flex items-center justify-center shrink-0 transition-colors ${
              activeSection === 'categorias-abono' ? 'bg-accent text-paper' : 'bg-accent-soft text-accent-ink'
            }`}>
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold transition-colors mb-1 ${
                activeSection === 'categorias-abono' ? 'text-accent-ink' : 'text-ink group-hover:text-accent-ink'
              }`}>
                Categorías de Abono
              </h2>
              <p className="text-sm text-muted">
                Tipos de abono para producir y vender
              </p>
            </div>
          </button>
        )}
      </div>

      {activeSection && (
        // Sin animate-fadeIn (mismo bug de arriba): este div es el padre directo de
        // VariedadesPlantas/Proveedores/etc., que abren sus propios modales fixed inset-0 -- era
        // el trap más cercano al problema real.
        <div className="pt-4">
          {activeSection === 'plantas' && <VariedadesPlantas />}
          {activeSection === 'bandejas' && <VariedadesBandejas />}
          {activeSection === 'herramientas' && <ConfiguracionHerramientas />}
          {activeSection === 'proveedores' && <Proveedores />}
          {activeSection === 'abono' && <ConfiguracionAbono unidadId={activeBusinessId} />}
          {activeSection === 'categorias-abono' && <ConfiguracionAbonoCategorias />}
        </div>
      )}
    </div>
  );
}
