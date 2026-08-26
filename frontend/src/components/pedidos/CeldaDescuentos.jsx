import React from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

// Celda-resumen de descuentos de una fila de pedido (change pedido-planilla-editable, grupo 4 —
// Decisión 4 de design.md). Resumen compacto de ALTURA FIJA: nunca crece con la cantidad de
// descuentos cargados — eso es justo lo que rompía la alineación de la grilla en el diseño
// anterior. El editor completo vive en `PanelDescuentosLinea`, una sub-fila `col-span-full` que
// este componente abre/cierra (el estado de expansión — un `Set` de `lineaId` — vive en
// `PedidoNuevo.jsx`, acá sólo se recibe `expandida` + el handler).
//
// Ampliación 2026-08-25 (pedido explícito del dueño del negocio, "los descuentos y los impuestos
// pueden ir variando a pesar de que sea el mismo producto" — mismo criterio ya aplicado antes a
// IVA/envío): el modo `soloLectura` desapareció. AMBOS tipos de línea (producto existente y
// "pendiente de crear") son editables por igual ahora — los chips vienen de
// `linea.descuentosPactados` en los dos casos (ver `porcentajesDescuentoDeLinea` en
// utils/pedidoCosteo.js, actualizado en la misma ampliación). Toda la celda es clickeable para
// abrir/cerrar la sub-fila `PanelDescuentosLinea`, y además hay un botón `+` para agregar un
// descuento nuevo (que auto-expande la sub-fila — tarea 4.6, ver `PedidoNuevo.jsx`).
const CeldaDescuentos = ({
  descuentos,
  efectivoPorcentaje,
  expandida,
  onToggle,
  onAgregar,
  disabled = false,
}) => {
  const hayDescuentos = descuentos && descuentos.length > 0;
  const resumenTitle = hayDescuentos
    ? descuentos.map((d) => `${d.nombre} ${parseFloat(d.porcentaje)}%`).join(', ')
    : null;

  const chips = hayDescuentos ? (
    <span className="flex items-center gap-1 min-w-0 overflow-hidden">
      {descuentos.map((d, i) => (
        // Chip partido en dos <span> (pedido-grilla-visual, tarea 4.4): el nombre trunca
        // (`truncate min-w-0`), el porcentaje es `shrink-0` y NUNCA se trunca — es el dato, el
        // nombre es la etiqueta. Antes `max-w-[110px] truncate` sobre el texto completo se comía
        // el "%" a 1366px y se leía "Volumen" a secas.
        //
        // Color (ronda de ajustes post-12.3, punto 3a — "dale color a las etiquetas de
        // descuentos"): `bg-gray-100 text-gray-600` (neutro) pasa a `bg-emerald-50 text-emerald-700`
        // — no es un color inventado para esta pantalla: es el mismo par que ya usa la app para un
        // badge de "condición del proveedor" en `Proveedores.jsx` (`PerfilBadges`, badge "USD"),
        // así que un descuento pactado se lee con el mismo lenguaje que el resto del sistema usa
        // para "atributo positivo/activo".
        <span
          key={i}
          className="shrink-0 flex items-center gap-0.5 max-w-[110px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-[11px] font-medium text-emerald-700"
        >
          <span className="truncate min-w-0">{d.nombre}</span>
          <span className="shrink-0">{parseFloat(d.porcentaje)}%</span>
        </span>
      ))}
      {efectivoPorcentaje != null && (
        <span className="shrink-0 text-[11px] font-semibold text-emerald-700">
          (-{efectivoPorcentaje.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%)
        </span>
      )}
    </span>
  ) : (
    <span className="text-xs text-gray-400">—</span>
  );

  return (
    <div className="min-h-[28px] flex items-center gap-1 min-w-0">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        title={resumenTitle || 'Ver/editar descuentos'}
        className={`flex items-center gap-1 min-w-0 flex-1 text-left group ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="min-w-0 flex-1 overflow-hidden">{chips}</span>
        {hayDescuentos && (
          expandida
            ? <ChevronUp className="w-3 h-3 text-gray-400 shrink-0 group-hover:text-gray-600" />
            : <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 group-hover:text-gray-600" />
        )}
      </button>
      <button
        type="button"
        onClick={onAgregar}
        disabled={disabled}
        title="Agregar descuento"
        className={`shrink-0 p-0.5 rounded text-emerald-600 hover:bg-emerald-50 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default CeldaDescuentos;
