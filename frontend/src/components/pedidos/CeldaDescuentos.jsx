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
        <span
          key={i}
          className="shrink-0 max-w-[110px] truncate px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600"
        >
          {d.nombre} {parseFloat(d.porcentaje)}%
        </span>
      ))}
      {efectivoPorcentaje != null && (
        <span className="shrink-0 text-[10px] font-semibold text-emerald-700">
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
