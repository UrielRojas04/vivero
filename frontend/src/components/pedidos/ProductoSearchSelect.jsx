import React, { useState } from 'react';
import { X, Search, Sparkles } from 'lucide-react';

// Combobox de búsqueda de producto para una línea del pedido (grupo 12, pedido puntual
// post-apply del usuario: reemplaza el <select> nativo, incómodo con catálogos grandes).
// Sigue el estilo visual del buscador de productos de NuevaVenta.jsx (icono Search, input
// con pl-10, lista de resultados filtrados debajo), pero cada línea tiene su PROPIO estado
// de búsqueda — no hay un buscador global compartido. Definido a nivel de módulo (no anidado
// dentro de PedidoNuevo) para que su estado interno no se resetee en cada render del padre.
// No reimplementa selección/alta: delega en `onSelect` (que en PedidoNuevo es `seleccionarProducto`).
//
// Extraído a su propio archivo en el change pedido-planilla-editable (grupo 2, tarea 2.2):
// misma API exacta (`productos`, `productoId`, `productoNombre`, `productoNombreNuevo`,
// `onSelect`, `hasError`), sin cambios de comportamiento — sólo cambia de dónde vive.
//
// Prop `disabled` agregada en el grupo 5 (gate de proveedor, Decisión 7 de design.md): cuando se
// restaura un borrador con ítems y sin proveedor, las filas se muestran pero con todos sus inputs
// deshabilitados hasta que se elija un proveedor. Fuerza el combobox a quedar SIEMPRE en modo
// "botón" (nunca abre la búsqueda), sin importar el estado interno de edición.
//
// Fix de desborde (rediseño página completa, 2026-08-20): el nombre de producto ahora SIEMPRE
// trunca con ellipsis en vez de empujar el layout. La causa real del bug del modal viejo era que
// el <span> del nombre no tenía min-w-0 — en un flex row los hijos no se achican por debajo de su
// ancho de contenido (min-width:auto por default), así que `truncate` nunca llegaba a aplicarse
// y el botón (y sus ancestros) se estiraban para acomodar el texto completo. Acá se agrega
// min-w-0 explícito en el span truncado y un `title` nativo con el nombre completo.
const ProductoSearchSelect = ({ productos, productoId, productoNombre, productoNombreNuevo, onSelect, hasError, disabled = false }) => {
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(false);

  const esPendiente = !productoId && !!productoNombreNuevo;
  const buscando = !disabled && (editando || (!productoId && !esPendiente));

  const abrirBusqueda = () => {
    setBusqueda('');
    setEditando(true);
  };

  const handleSeleccionar = (id) => {
    onSelect(id, busqueda);
    setBusqueda('');
    setEditando(false);
  };

  const filtrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  if (!buscando) {
    if (esPendiente) {
      // Grupo 13: el producto NO existe todavía en el catálogo. Tratamiento sobrio (rediseño
      // 2026-08-20): el botón ya NO es una tarjeta amarilla entera — fondo/borde neutros, la
      // única señal de color es el badge chico "Nuevo", igual que para cualquier otra línea.
      return (
        <button
          type="button"
          onClick={disabled ? undefined : abrirBusqueda}
          disabled={disabled}
          title={productoNombreNuevo}
          className={`w-full min-w-0 px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 transition-colors ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-emerald-300'
          } ${hasError ? 'border-red-300' : 'border-gray-200'}`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate min-w-0 text-gray-800">{productoNombreNuevo}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Nuevo
            </span>
          </span>
          {!disabled && <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={disabled ? undefined : abrirBusqueda}
        disabled={disabled}
        title={productoNombre || undefined}
        className={`w-full min-w-0 px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 transition-colors ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-emerald-300'
        } ${hasError ? 'border-red-300' : 'border-gray-200'}`}
      >
        <span className="truncate min-w-0 text-gray-800">
          {productoNombre || (disabled ? 'Sin producto elegido' : '')}
        </span>
        {!disabled && <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>}
      </button>
    );
  }

  // Rediseño a grilla (change pedido-planilla-editable, tarea 3.6): la lista de resultados pasa a
  // `absolute` (antes vivía en flujo normal, empujando hacia abajo todo lo que estaba debajo). En
  // una celda de grilla eso desalinearía la fila entera con las demás — acá, en cambio, la lista
  // flota por encima del resto de la fila (`z-20`) sin cambiar la altura de la celda. El contenedor
  // raíz pasa a `relative` para que ese `absolute` se posicione respecto de este combobox.
  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className={`w-full pl-8 pr-8 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
            hasError ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {(productoId || esPendiente) && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Cancelar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {busqueda && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg divide-y divide-gray-50">
          {filtrados.length > 0 ? (
            filtrados.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSeleccionar(p.id)}
                className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate min-w-0">{p.nombre}</span>
                <span className="text-xs text-gray-400 shrink-0">stock: {p.stock}</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">No se encontraron productos.</p>
          )}
          <div
            onClick={() => handleSeleccionar('__nuevo__')}
            className="px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer"
          >
            + Crear producto nuevo…
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductoSearchSelect;
