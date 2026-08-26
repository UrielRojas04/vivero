import React from 'react';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import FormattedNumberInput from '../FormattedNumberInput';

// Editor completo de descuentos pactados de una línea de pedido (change pedido-planilla-editable,
// grupo 4 — Decisión 4 de design.md): lista de `{nombre, %}` con agregar/quitar, el botón
// "Recargar del proveedor" y el error de validación de descuentos. Vive dentro de la sub-fila que
// abre/cierra `CeldaDescuentos` — no tiene estado propio ni de expansión, sólo renderiza lo que
// le llega por props y delega cada cambio en los handlers de `PedidoNuevo.jsx`
// (`agregarDescuentoLinea`, `quitarDescuentoLinea`, `actualizarDescuentoLinea`,
// `recargarDefaultsProveedorLinea`), sin tocarlos.
//
// Ampliación 2026-08-25 (pedido explícito del dueño del negocio, mismo criterio ya aplicado a
// IVA/envío): ahora también se usa para una línea de producto YA EXISTENTE, precargada con los
// descuentos actuales de su ficha (`seleccionarProducto` en `PedidoNuevo.jsx`) — antes sólo
// existía para líneas "pendiente de crear". "Recargar del proveedor" se deja disponible en ambos
// casos: para una línea existente pisa lo precargado de la ficha con los defaults del proveedor,
// que puede ser justo lo que el usuario quiere si el proveedor cambió sus condiciones (mismo botón,
// mismo criterio que ya vale para IVA/envío en esa misma línea).
//
// Contenedor (pedido-grilla-visual, ronda posterior al checkpoint 12.3): en variant="grid" de
// FilaItemPedido.jsx este componente ya no se renderiza inline como sub-fila — su contenedor
// padre es un popover flotante (`position: fixed`, ver `panelDescuentosPopover` en
// FilaItemPedido.jsx). Fondo sólido (`bg-white`, antes `bg-gray-50/70`) y `shadow-lg` en vez de
// sin sombra: flotando por encima de otras filas necesita despegarse visualmente del contenido de
// abajo, cosa que no hacía falta cuando vivía embebido en el flujo de la grilla. El borde sigue
// siendo el mismo (`gray-200`→`gray-300` de la ronda anterior, "remarcá los bordes aun más") — en
// variant="card" este mismo componente se sigue viendo inline, sin popover, y el fondo sólido +
// sombra no molestan ahí tampoco (la tarjeta ya tiene su propio fondo blanco).
const PanelDescuentosLinea = ({ descuentos, error, onAgregar, onQuitar, onActualizar, onRecargarDefaultsProveedor }) => (
  <div className="pt-2 pb-3 px-3 bg-white border border-gray-300 rounded-lg shadow-lg">
    <div className="flex items-center justify-between">
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Descuentos pactados</label>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRecargarDefaultsProveedor}
          title="Volver a traer IVA/envío/descuentos por defecto del proveedor (por si cambiaron después de seleccionarlo)"
          className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Recargar del proveedor
        </button>
        <button
          type="button"
          onClick={onAgregar}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>
    </div>
    {descuentos.length === 0 ? (
      <p className="mt-1 text-[11px] text-gray-400 italic">Sin descuentos cargados.</p>
    ) : (
      <div className="space-y-1 mt-1.5">
        {descuentos.map((d, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <input
              type="text"
              value={d.nombre}
              onChange={(e) => onActualizar(index, 'nombre', e.target.value)}
              placeholder="Ej: Proveedor, Volumen"
              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="w-16 shrink-0">
              <FormattedNumberInput
                value={d.porcentaje}
                onChange={(val) => onActualizar(index, 'porcentaje', val)}
                placeholder="%"
                className="w-full px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => onQuitar(index)}
              className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              aria-label="Quitar descuento"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    )}
    {error && <p className="mt-1 text-[11px] text-red-500 leading-tight">{error}</p>}
  </div>
);

export default PanelDescuentosLinea;
