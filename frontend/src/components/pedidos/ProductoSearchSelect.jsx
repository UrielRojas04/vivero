import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
//
// Botón sin borde en reposo (pedido-grilla-visual, ampliación posterior al checkpoint 12.3, punto
// 3 del pedido del usuario): en el estado "botón" (no editando) el borde queda `border-transparent`
// para que el nombre del producto se lea como texto plano con el link "Cambiar" al lado, sin la
// sensación de "caja de formulario" que tenía la celda de producto. El borde reaparece en DOS
// casos: (a) `hover`, como afordancia de que el campo es clickeable — mismo lenguaje que
// `gridCellInput` en FilaItemPedido.jsx ("la celda levanta y se anuncia como editable"); (b) el
// estado de búsqueda/edición (`buscando`, más abajo), que es un render distinto y SIEMPRE tuvo
// borde visible — eso ya cumplía el pedido sin tocarlo. El error de validación (`hasError`) es la
// única excepción: se mantiene con borde SIEMPRE visible (no sólo al hover), porque es información
// que el usuario tiene que poder ver sin pasar el mouse por encima — mismo criterio que el resto
// de la grilla, donde el estado de error nunca depende de hover. El estado deshabilitado (gate de
// proveedor) tampoco cambia: conserva su borde gris siempre visible, ya que ahí no hay ninguna
// interacción de hover que pueda revelarlo.
//
// Padding vertical del botón en reposo `py-2`→`py-1.5` (pedido-grilla-visual, ronda de ajustes
// post-12.3, punto 1): era la causa real de "la celda es más alta que el input" en `variant="grid"`
// de `FilaItemPedido.jsx` — la celda que envuelve este botón tenía SU PROPIO `py-2` además del
// `py-2` de este botón (padding duplicado), inflando el alto de toda la fila por encima del de un
// input numérico de una sola capa de padding. Ver el comentario largo junto a `gridCellInput` en
// `FilaItemPedido.jsx` para el detalle completo. No afecta al estado de búsqueda/edición (el input
// con `pl-8 pr-8 py-2`, sin tocar) ni a `variant="card"` más allá de emparejar mejor con
// `inputClassCard`, que ya usaba `py-1.5`.
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

  // Flip-up del desplegable de resultados (grupo 18 de tasks.md, fix 2026-08-26: el desplegable
  // SIEMPRE abría hacia abajo (`top-full`) sin mirar el espacio disponible — en una fila cerca del
  // borde inferior de la pantalla quedaba tapado/cortado, ya que el contenedor real que scrollea la
  // página es `<main class="max-h-screen overflow-y-auto">` en DashboardLayout.jsx: el desplegable,
  // al ser `position: absolute`, se agrega al alto scrolleable de ESE contenedor en vez de recortarse
  // sin más — visualmente indistinguible de "tapado" porque nada lo trae a la vista solo).
  // Mismo patrón "abre abajo por default, sube si no entra" que `calcularPosicionPopover` de
  // `PanelDescuentosLinea` (ver FilaItemPedido.jsx) — no se reinventa la lógica de flip, sólo se
  // adapta a este caso más simple:
  // - SIN portal a `document.body` ni `position: fixed`: se verificó que ningún ancestro entre este
  //   combobox y `<main>` usa `overflow-hidden` — la grilla de PedidoNuevo.jsx lo evita a propósito
  //   ("SIN `overflow-hidden`: recortaría el dropdown de ProductoSearchSelect", ver el comentario
  //   junto al contenedor de la grilla) — así que nada recorta este dropdown de forma invisible;
  //   alcanza con seguir `position: absolute` respecto de este mismo contenedor (`relative`) y
  //   alternar `top-full`/`bottom-full` según haya lugar, evitando la complejidad extra de un portal.
  // - SIN doble pasada de medición (estimado → rAF → real) como en el popover de descuentos: ahí
  //   hacía falta porque el popover completo sólo se monta en el DOM una vez que `popoverStyle` (el
  //   resultado del cálculo) ya existe — huevo y gallina. Acá la lista YA se renderiza siempre que
  //   `busqueda` es verdadero, sin depender de este cálculo, así que cuando corre este
  //   `useLayoutEffect` el nodo real ya está montado en el DOM (refs se asignan en el commit, antes
  //   de que corran los layout effects) — `listaRef.current.offsetHeight` ya es el alto real desde
  //   la primera pasada, sin necesidad de una segunda con `requestAnimationFrame`.
  const anchorRef = useRef(null);
  const listaRef = useRef(null);
  const [abrirHaciaArriba, setAbrirHaciaArriba] = useState(false);

  const calcularDireccion = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const lista = listaRef.current;
    // Estimado (168px = `max-h-40` 160px + `mt-1`/`mb-1` 4px + borde ~2px, redondeado) sólo como
    // resguardo defensivo si el nodo todavía no está montado — en la práctica siempre está (ver
    // comentario de arriba), así que esta rama casi nunca se toma.
    const alto = lista ? lista.offsetHeight : 168;
    const margen = 8;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    setAbrirHaciaArriba(espacioAbajo < alto + margen && espacioArriba > espacioAbajo);
  }, []);

  useLayoutEffect(() => {
    if (!busqueda) return undefined;
    calcularDireccion();
    // El contenedor que realmente scrollea (`<main>` en DashboardLayout.jsx) es un ancestro lejano
    // de esta fila, no `window` — pero los eventos `scroll` no hacen bubble y sí se pueden escuchar
    // en fase de captura desde `window` (mismo mecanismo que `PanelDescuentosLinea`).
    window.addEventListener('scroll', calcularDireccion, true);
    window.addEventListener('resize', calcularDireccion);
    return () => {
      window.removeEventListener('scroll', calcularDireccion, true);
      window.removeEventListener('resize', calcularDireccion);
    };
  }, [busqueda, calcularDireccion]);

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
          className={`w-full min-w-0 px-2 py-1.5 rounded-lg border text-sm text-left flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            disabled
              ? 'cursor-not-allowed opacity-60 border-gray-200 bg-white'
              : hasError
                ? 'cursor-pointer border-red-300 bg-white'
                : 'cursor-pointer border-transparent bg-transparent hover:border-emerald-300 hover:bg-white'
          }`}
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
        className={`w-full min-w-0 px-2 py-1.5 rounded-lg border text-sm text-left flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          disabled
            ? 'cursor-not-allowed opacity-60 border-gray-200 bg-white'
            : hasError
              ? 'cursor-pointer border-red-300 bg-white'
              : 'cursor-pointer border-transparent bg-transparent hover:border-emerald-300 hover:bg-white'
        }`}
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
  // raíz pasa a `relative` para que ese `absolute` se posicione respecto de este combobox — y ahora
  // también sirve de ancla (`ref={anchorRef}`) para el cálculo de flip-up de más arriba.
  return (
    <div className="relative" ref={anchorRef}>
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
        <div
          ref={listaRef}
          className={`absolute z-20 left-0 right-0 max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg divide-y divide-gray-100 ${
            abrirHaciaArriba ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
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
