import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import FormattedNumberInput from '../FormattedNumberInput';
import ProductoSearchSelect from './ProductoSearchSelect';
import CeldaDescuentos from './CeldaDescuentos';
import PanelDescuentosLinea from './PanelDescuentosLinea';
import { costoFinalDeLinea, desgloseDeLinea, porcentajesDescuentoDeLinea, efectivoCascadaDescuentos } from '../../utils/pedidoCosteo';

// Una fila de la grilla de ítems de PedidoNuevo.jsx (change pedido-planilla-editable, grupo 3 —
// Decisiones 2, 3, 6 y 9 de design.md; pulido visual del change pedido-grilla-visual, grupos 2-5 —
// Decisiones 1/2/4/5 de su design.md). No guarda estado del pedido: todo lo que compone al pedido
// (línea, handlers) llega por props desde PedidoNuevo.jsx, que sigue siendo el único dueño de
// `items`.
//
// Dos variantes de render, elegidas por el padre según el breakpoint (mismo patrón que Pedidos.jsx:
// dos loops separados, uno dentro del contenedor "hidden xl:flex" y otro "xl:hidden" — nunca las
// dos visibles a la vez; breakpoint ajustado de `lg` a `xl` durante pedido-planilla-editable, ver
// Decisión 6 de aquel design.md — el shell de la app envuelve toda página en `overflow-x-hidden`
// fijo y a `lg` la grilla recortaba en silencio, sin scrollbar):
// - variant="grid": la fila deja de ser `className="contents"` (pedido-grilla-visual, Decisión 4)
//   y pasa a ser su PROPIO grid, con la misma `gridColsClass` que recibe por prop desde
//   PedidoNuevo.jsx (nunca redefinida acá adentro — ver el invariante junto a GRID_COLS en
//   PedidoNuevo.jsx). Esto le da a la fila una caja propia de la que
//   cuelgan el hover (Decisión 5), el borde inferior único del grupo y la contención de sus
//   sub-filas (siguen siendo `col-span-full`, pero ahora respecto del grid de la fila, no del
//   padre).
// - variant="card": tarjeta apilada de ancho completo con pares etiqueta:valor, sin scroll
//   horizontal (Decisión 6 de pedido-planilla-editable). Sin cambios en este change (grupo 10,
//   fuera del alcance de esta corrida).
//
// Celda de descuentos (grupo 4 — Decisión 4 de design.md): la celda de la grilla es
// `CeldaDescuentos`, un resumen compacto de altura fija con chips + el efectivo de la cascada. Al
// hacer clic (o en el `+`) se abre `PanelDescuentosLinea` con el editor completo — en variant="grid"
// como un POPOVER FLOTANTE anclado a esta celda (pedido-grilla-visual, ronda posterior al
// checkpoint 12.3, ver el comentario largo junto a `panelDescuentosPopover` más abajo; ya NO es una
// sub-fila `col-span-full` como en las rondas anteriores de este mismo change), en variant="card"
// como bloque inline debajo de la tarjeta (sin cambios). El estado de expansión
// (`expandida`/`onToggleExpansion`) sigue siendo un `Set` de `lineaId` que vive en
// `PedidoNuevo.jsx` — esta fila no lo posee, sólo lo consume; sólo cambió CÓMO se renderiza el
// panel cuando `expandida` es true, nunca el mecanismo de apertura/cierre en sí.
//
// Sub-formulario de "producto nuevo": ELIMINADO (grupo 17 de tasks.md, ronda posterior al
// checkpoint 16.4 — pedido explícito del usuario: no quiere confirmar "Usar en esta línea" por
// cada producto nuevo, y ese popover de confirmación era además la causa real de un segundo bug
// reportado — se abría solo al confirmar, sin que el usuario tocara la celda de descuentos, ver
// el comentario junto a `seleccionarProducto` en `PedidoNuevo.jsx`). Elegir "+ Crear producto
// nuevo…" en `ProductoSearchSelect` marca la línea como pendiente de inmediato con el nombre ya
// tipeado en el buscador — sin popover intermedio. El nombre sigue siendo editable después con el
// botón "Cambiar" de `ProductoSearchSelect` (mismo botón que ya existía para cambiar de producto),
// no un gate obligatorio.
//
// Ronda de ajustes post-12.3 (5 puntos de feedback sobre lo ya aprobado, ver la sección
// correspondiente al final de design.md): altura de celda vs. input (punto 1, comentario largo
// junto a `gridCellInput`), color en chips/encabezados/botón eliminar (punto 3), bordes más
// marcados (`gray-200`→`gray-300`/`gray-100`→`gray-200`, punto 4), y la columna USD vuelve a ser
// condicional por proveedor (punto 5, revert de la Decisión 10 anterior).
const FilaItemPedido = ({
  linea,
  variant,
  productos,
  manejaDolares,
  cotizacionDolar,
  errors,
  onActualizarCampo,
  onSeleccionarProducto,
  onToggleMoneda,
  onEliminar,
  canEliminar,
  onAgregarDescuento,
  onQuitarDescuento,
  onActualizarDescuento,
  onRecargarDefaultsProveedor,
  expandida,
  onToggleExpansion,
  // Gate de proveedor (grupo 5 — Decisión 7 de design.md): true cuando la fila viene de un
  // borrador restaurado sin proveedor todavía elegido. La fila queda VISIBLE (nunca se descarta)
  // pero con todos sus inputs deshabilitados hasta que se elija un proveedor.
  disabled = false,
  // Plantilla de columnas compartida (pedido-grilla-visual, tarea 2.3): llega por prop desde
  // PedidoNuevo.jsx — sólo se usa en variant="grid", nunca se redefine acá.
  gridColsClass,
  // Número de posición del ítem (pedido-grilla-visual, tarea 8.1), sólo variant="grid".
  indice,
}) => {
  const esPendiente = !linea.productoId && !!linea.productoNombreNuevo;
  const esExistente = !esPendiente && !!linea.productoId;
  const producto = esExistente ? productos.find((p) => String(p.id) === String(linea.productoId)) : null;

  // Único cálculo de costo de línea del change (Decisión 1 de design.md): se reusa
  // `desgloseDeLinea`/`costoFinalDeLinea` de utils/pedidoCosteo.js — la misma función que el total
  // del header/footer — para que esta celda nunca pueda divergir del número que se suma arriba.
  const desglose = desgloseDeLinea(linea, productos, cotizacionDolar);
  // `costoFinalDeLinea` da el costo de UNA unidad (con descuentos/IVA/envío ya aplicados) — el
  // total del header/footer siempre multiplicó por cantidad (`PedidoNuevo.jsx`, `const total =
  // items.reduce(...)`), pero esta celda "Costo total" de la fila se había quedado mostrando sólo
  // el costo unitario (bug real reportado 2026-08-26: no cambiaba al cambiar la cantidad).
  // Corregido acá para que ambos números — el de la fila y el de la suma de arriba — cierren.
  const cantidadNum = parseFloat(linea.cantidadPedida) || 0;
  const costoUnitarioFinal = costoFinalDeLinea(linea, productos, cotizacionDolar);
  const costoFinal = costoUnitarioFinal * cantidadNum;
  const costoBaseFicha = producto?.costoProducto ? parseFloat(producto.costoProducto) : 0;
  // Mismo criterio que MovimientoStockServiceImpl (guardado.getCostoBase() vs
  // producto.getCostoProducto()): aviso de auto-ratchet, conservado tal cual (tarea 3.10).
  const disparaAjuste = esExistente && desglose ? desglose.costoBaseConvertido > costoBaseFicha : false;

  // Fuente de los descuentos para la celda-resumen (ampliación 2026-08-25, ver comentario de
  // `porcentajesDescuentoDeLinea` en utils/pedidoCosteo.js): ya no depende del tipo de línea —
  // `linea.descuentosPactados` para AMBOS casos (producto existente y pendiente), porque las dos
  // son editables por igual ahora. Para una línea existente, `descuentosPactados` se precarga con
  // los descuentos actuales de la ficha en `seleccionarProducto` (PedidoNuevo.jsx).
  const descuentosFuente = linea.descuentosPactados;
  const descuentosConNombre = (descuentosFuente || []).filter((d) => (
    d.nombre && d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined && !Number.isNaN(parseFloat(d.porcentaje))
  ));
  // Efectivo total de la cascada (Decisión 4 de design.md: "y, cuando la cascada da algo, el
  // efectivo total"): sólo tiene sentido mostrarlo con 2+ descuentos — con uno solo, el chip ya
  // muestra ese mismo número y repetirlo es ruido. Reusa `porcentajesDescuentoDeLinea` (misma
  // fuente que el cálculo real del costo, nunca una lectura distinta de `descuentosFuente`) para
  // que el efectivo mostrado acá nunca pueda divergir del que realmente se aplicó al costo.
  const efectivoPorcentaje = descuentosConNombre.length > 1
    ? efectivoCascadaDescuentos(porcentajesDescuentoDeLinea(linea))
    : null;

  const errorProducto = errors[`producto-${linea.lineaId}`];
  const errorCantidad = errors[`cantidad-${linea.lineaId}`];
  const errorCosto = errors[`costo-${linea.lineaId}`];
  const errorIva = errors[`iva-${linea.lineaId}`];
  const errorDescuentos = errors[`descuentos-${linea.lineaId}`];

  const costoFormateado = desglose
    ? `$${costoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
  // Nota en dólares: mismo criterio que el peso de arriba — total de la línea (costo pactado ×
  // cantidad), no el costo unitario suelto, para no mezclar un total en pesos con un unitario en
  // dólares.
  const notaUsd = linea.monedaLinea === 'USD' && linea.costoUnitarioPactado !== '' && !Number.isNaN(parseFloat(linea.costoUnitarioPactado))
    ? `US$ ${(parseFloat(linea.costoUnitarioPactado) * cantidadNum).toLocaleString('es-AR')}`
    : null;

  const avisoAutoRatchet = disparaAjuste ? (
    <p className="text-[11px] text-amber-600">
      ⚠️ Este costo es mayor al de la ficha (${costoBaseFicha.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) — al
      confirmar, el costo y el precio de venta del producto se van a actualizar solos hacia este valor.
    </p>
  ) : null;

  // variant="card": SIN CAMBIOS respecto de antes de pedido-grilla-visual — la tarjeta conserva su
  // caja propia por input (Decisión 9 de design.md, grupo 10, fuera del alcance de esta corrida).
  const inputClassCard = (hasError) => `w-full px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
    hasError ? 'border-red-300' : 'border-gray-200'
  }`;

  // variant="grid": el input pierde su caja propia — la celda ES la caja (pedido-grilla-visual,
  // Decisión 2, tarea 3.5/3.6/3.7). `ring-inset` es obligatorio (no cosmético): sin gap entre
  // columnas, un ring hacia afuera invadiría la celda vecina. El estado de error ya no es un borde
  // rojo del input sino `bg-red-50` en la celda que lo envuelve (ver `gridCellInput` más abajo); el
  // estado deshabilitado (gate de proveedor) también se resuelve en esa celda, no acá.
  //
  // Padding vertical `py-2` → `py-1.5` (ronda de ajustes post-12.3, punto 1): ver la nota completa
  // junto a `gridCellInput` de por qué el input se leía más chico que su celda.
  const inputClassGrid = () => 'w-full bg-transparent px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 focus:bg-emerald-50/50';

  // Celda de input de la grilla (pedido-grilla-visual, Decisión 1/2/3.6-3.9): borde vertical entre
  // columnas, fondo de error, fondo/color de deshabilitado, y afordancia de hover ("la celda
  // levanta y se anuncia como editable") — todo vive acá, nunca en el input.
  //
  // Altura celda vs. input (ronda de ajustes post-12.3, punto 1 — "sobra espacio, la celda es más
  // alta que el input"): la causa real NO era el padding del input en sí, sino que la celda
  // "Producto" tenía padding DOBLE (`px-2 py-2` acá + `px-2 py-2` propio del botón de
  // ProductoSearchSelect) — quedaba ~52px de alto contra los ~36px de un input numérico con una
  // sola capa de padding. Como todas las celdas de una fila son grid items con
  // `align-items: stretch` (default), la fila entera se estiraba a esos ~52px y el input, que no
  // se estira (es `block`, no `flex`), quedaba pegado arriba con el resto del alto libre abajo —
  // más visible todavía al enfocar, porque el `ring` sólo dibuja el contorno del input, no el de
  // la celda. Se resolvió en dos frentes, aplicados IGUAL en las cuatro celdas numéricas (cantidad,
  // costo unit., IVA %, envío %) para que ninguna quede distinta de las demás:
  // 1) se le sacó el padding duplicado a la celda de Producto (ver más abajo) y se bajó el padding
  //    propio de `ProductoSearchSelect` (`py-2`→`py-1.5`) para que su altura natural quede
  //    alineada con la de un input numérico — ya no hay una celda "más alta" que fuerce a las
  //    demás a estirarse de más;
  // 2) esta celda pasa de `block` a `flex flex-col justify-center`, para que si el alto de la fila
  //    igual queda determinado por una celda vecina más alta (ej. Descuentos, o esta misma celda
  //    con su texto de error debajo), el input (y su error, si lo hay) se centren verticalmente en
  //    vez de quedar pegados arriba con el sobrante abajo.
  const gridCellInput = (hasError) => `border-l border-gray-300 flex flex-col justify-center ${
    hasError ? 'bg-red-50' : ''
  } ${
    disabled ? 'bg-gray-50 text-gray-400' : 'hover:bg-white hover:ring-1 hover:ring-inset hover:ring-gray-400'
  }`;

  // Tamaño del botón reducido (pedido-grilla-visual, ampliación posterior al checkpoint 12.3,
  // verificación explícita del punto 1 de la referencia visual: "el botón de eliminar cortado" es
  // un bug DEL MOCKUP a evitar, no a replicar). Con `p-2` + `w-4 h-4` el botón medía 32px de ancho
  // dentro de una columna "Quitar" de 36px con `px-2` de padding de celda (20px de caja de
  // contenido disponible) — quedaba a ~2px del borde de la grilla, medido con Playwright contra el
  // dev stack real. `p-1.5` + `w-3.5 h-3.5` (mismo tamaño que el botón de quitar descuento de
  // `PanelDescuentosLinea.jsx`, para consistencia de escala dentro de la misma pantalla) baja el
  // ancho del botón a 26px, dejando ~5px de aire de cada lado — verificado que no se corta en
  // 1280/1366/1600px. No se tocó el ancho de la columna: eso hubiera roto el presupuesto de ancho
  // ya validado sin holgura a 1280px (Decisión 7 de design.md).
  // Color en reposo (segunda ronda de ajustes, feedback recibido mientras se implementaba el
  // popover de descuentos de más abajo): la ronda anterior (post-12.3, punto 3c) había subido sólo
  // un escalón el gris de reposo (`gray-400`→`gray-500`), a propósito, para no romper el patrón
  // "gris apagado hasta el hover, rojo recién al pasar el mouse" que usan los demás botones de
  // eliminar de la app (`Proveedores.jsx`/`Productos.jsx`). El usuario pidió explícitamente MÁS
  // color en reposo, no sólo al hover — acá se prioriza ese pedido directo sobre la consistencia
  // con esos otros botones (decisión consciente, no un olvido de la convención): el ícono pasa a
  // `text-red-400` en reposo (rojo suave con presencia propia, ya no gris) y se intensifica a
  // `text-red-600` al hover — mismo par de tonos que ya usa el resto de la app para "rojo" (error,
  // eliminar), sólo que ahora visible desde el reposo en vez de recién al hover.
  const botonQuitar = (
    <button
      type="button"
      onClick={onEliminar}
      disabled={disabled || !canEliminar}
      title="Quitar ítem"
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
        disabled || !canEliminar ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
      }`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );

  // Celda-resumen de descuentos (grupo 4 — Decisión 4 de design.md, ampliado 2026-08-25):
  // `CeldaDescuentos` es editable para cualquier tipo de línea ahora, ya no distingue
  // sólo-lectura/editable por `esExistente`.
  const celdaDescuentos = (
    <CeldaDescuentos
      descuentos={descuentosConNombre}
      efectivoPorcentaje={efectivoPorcentaje}
      expandida={!!expandida}
      onToggle={onToggleExpansion}
      onAgregar={onAgregarDescuento}
      disabled={disabled}
    />
  );

  // Popover flotante de descuentos (pedido-grilla-visual, ronda posterior al checkpoint 12.3 —
  // pedido explícito del usuario: "no hace falta que se abra una ventana que ocupe todo el ancho
  // de la tabla sino... una ventana flotante que salga de la celda de descuentos... se desplace
  // hacia abajo y... no sea del ancho de la grilla, sino lo suficiente para mostrar los descuentos
  // y sus porcentajes"). Reemplaza la sub-fila `col-span-full` que usaba esta pantalla hasta ahora
  // — SÓLO para el panel de descuentos: el aviso de auto-ratchet y el sub-formulario de producto
  // pendiente NO se tocan, siguen siendo `col-span-full` inline vía `subFilaWrap` más abajo.
  // Sólo aplica a variant="grid" — en variant="card" el panel se sigue mostrando inline debajo de
  // la tarjeta (ver `panelDescuentosContenido` más abajo): una tarjeta ya es una columna angosta
  // de ancho completo, no hay "ancho completo de la tabla" del que escapar ahí, y un popover ahí
  // no resolvería ningún problema real.
  const descuentosAnchorRef = useRef(null);
  const descuentosPopoverRef = useRef(null);
  // `null` = no renderizar el popover todavía (ni la primera vez, ni cuando el ancla está oculta
  // por CSS — ver el guard de abajo). Arranca en `null` a propósito: las dos variantes (grid/card)
  // de esta misma fila están MONTADAS A LA VEZ (una oculta con `hidden`/`xl:hidden` según el
  // breakpoint activo, nunca desmontada) y comparten el mismo `expandida` (mismo `lineaId` en el
  // `Set` de PedidoNuevo.jsx) — sin este guard, expandir la fila desde la tarjeta (variant="card")
  // también "abre" el popover de la fila grid oculta, con el ancla en `display:none` devolviendo
  // un rect en (0,0,0,0) → un popover fantasma anclado en la esquina superior izquierda de la
  // pantalla. Bug real encontrado en esta misma ronda de verificación con Playwright (captura
  // `verif-card-variant.png` del árbol de trabajo, borrada al terminar), no algo hipotético.
  const [popoverStyle, setPopoverStyle] = useState(null);

  const calcularPosicionPopover = useCallback(() => {
    const anchor = descuentosAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    // Ancla oculta por CSS (`display:none` en algún ancestro — la variante hermana no visible al
    // breakpoint actual): `getBoundingClientRect()` de un descendiente de `display:none` da todo
    // en cero. Tratarlo como "no mostrar el popover" en vez de posicionarlo en (0,0) — ver el
    // comentario largo junto a `popoverStyle` más arriba.
    if (rect.width === 0 && rect.height === 0) {
      setPopoverStyle(null);
      return;
    }
    const popoverEl = descuentosPopoverRef.current;
    // Primera pasada (recién abierto, el popover todavía no se montó): estimado razonable para un
    // panel de 1-2 descuentos. Pasadas siguientes (scroll/resize, o el segundo cálculo del mismo
    // `useLayoutEffect` de abajo): tamaño REAL ya medido del DOM.
    const alto = popoverEl ? popoverEl.offsetHeight : 220;
    const ancho = popoverEl ? popoverEl.offsetWidth : 320;
    const margen = 8;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    // Dropdown "inteligente": abre hacia abajo por default; si no entra el alto real por debajo Y
    // arriba hay más lugar que abajo, abre hacia arriba en su lugar. Con pedidos de 30-40 ítems no
    // se da el caso "no entra ni arriba ni abajo" (un panel de pocos descuentos siempre encuentra
    // lugar en alguna de las dos direcciones) — no se agregó scroll interno al popover por eso,
    // sería complejidad sin caso de uso real hoy.
    const abrirHaciaArriba = espacioAbajo < alto + margen && espacioArriba > espacioAbajo;
    let left = rect.left;
    if (left + ancho > window.innerWidth - margen) left = window.innerWidth - ancho - margen;
    if (left < margen) left = margen;
    setPopoverStyle({
      position: 'fixed',
      left,
      top: abrirHaciaArriba ? Math.max(margen, rect.top - alto - 4) : rect.bottom + 4,
      zIndex: 30,
    });
  }, []);

  // Recalcula la posición cuando se abre, y la mantiene sincronizada mientras el usuario scrollea
  // el contenedor de la grilla o redimensiona la ventana (el popover es `position: fixed`, así que
  // NO sigue solo al contenedor scrolleable). `useLayoutEffect` (no `useEffect`): corre antes del
  // paint del navegador, así el usuario nunca ve el popover en la posición estimada inicial —
  // el `requestAnimationFrame` extra fuerza una segunda medición ya con el popover realmente
  // montado en el DOM (tamaño real, no estimado), para que el flip hacia arriba use el alto real
  // del contenido (0, 1 o varios descuentos) en vez de adivinarlo.
  useLayoutEffect(() => {
    if (variant !== 'grid' || !expandida) return undefined;
    calcularPosicionPopover();
    const raf = requestAnimationFrame(calcularPosicionPopover);
    // El contenedor que realmente scrollea (`div.flex-1…overflow-x-hidden` en PedidoNuevo.jsx, ver
    // Decisión 6 de design.md) es un ancestro de la fila, no `window` — pero los eventos `scroll`
    // no hacen bubble y SÍ se pueden escuchar en fase de captura desde `window`, que los ve pasar
    // antes de llegar al elemento que realmente scrollea.
    window.addEventListener('scroll', calcularPosicionPopover, true);
    window.addEventListener('resize', calcularPosicionPopover);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', calcularPosicionPopover, true);
      window.removeEventListener('resize', calcularPosicionPopover);
    };
  }, [variant, expandida, calcularPosicionPopover]);

  // Cierre por click afuera y por Escape (pedido explícito del usuario) — mismo mecanismo de
  // apertura/cierre que ya existía (el `Set` de `lineaId` expandidos en PedidoNuevo.jsx, vía
  // `onToggleExpansion`), sólo se le suman estas dos formas nuevas de cerrar. El click en la propia
  // celda (toggle) sigue funcionando igual: si el click cae dentro del ancla o del popover, este
  // handler no hace nada y deja que el `onClick` normal de `CeldaDescuentos` resuelva el toggle.
  //
  // `e.stopPropagation()` en Escape es necesario: `PedidoNuevo.jsx` tiene un listener de Escape en
  // `window` que cancela TODO el pedido (`handleVolver`, borra el borrador y navega afuera) salvo
  // que haya un sub-formulario de producto nuevo abierto. `document` se visita ANTES que `window`
  // en la fase de bubbling, así que frenar la propagación acá evita que Escape, con el popover de
  // descuentos abierto, termine cancelando el pedido entero en vez de sólo cerrar el popover.
  useEffect(() => {
    if (variant !== 'grid' || !expandida) return undefined;
    const handlePointerDown = (e) => {
      if (descuentosPopoverRef.current?.contains(e.target)) return;
      if (descuentosAnchorRef.current?.contains(e.target)) return;
      onToggleExpansion();
    };
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onToggleExpansion();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [variant, expandida, onToggleExpansion]);

  // Contenido del editor de descuentos (Decisión 4 de design.md — SIN cambios de contenido, sólo
  // cambia el contenedor que lo envuelve): en variant="grid" se monta dentro del popover flotante
  // de abajo; en variant="card" se sigue mostrando inline, sin popover.
  const panelDescuentosContenido = expandida ? (
    <PanelDescuentosLinea
      descuentos={linea.descuentosPactados}
      error={errorDescuentos}
      onAgregar={onAgregarDescuento}
      onQuitar={onQuitarDescuento}
      onActualizar={onActualizarDescuento}
      onRecargarDefaultsProveedor={onRecargarDefaultsProveedor}
    />
  ) : null;

  // z-index / apilamiento (motivo original por el que pedido-planilla-editable había descartado un
  // popover para esto — resuelto acá): `createPortal` monta este div directamente en
  // `document.body`, FUERA del árbol de la grilla, así que nunca comparte contexto de apilamiento
  // con el `sticky z-10` del encabezado de la grilla ni con el `absolute z-20` del dropdown de
  // `ProductoSearchSelect` (ambos siguen viviendo DENTRO de la grilla). z-30 (mayor que los dos)
  // asegura que, si este popover llegara a superponerse en pantalla con cualquiera de los otros
  // dos, gane el que el usuario acaba de abrir. En la práctica los tres conviven sin pisarse: el
  // header sticky ocupa una franja fija arriba que el popover no invade (se abre debajo de SU
  // fila; si abre hacia arriba, sigue sin subir más arriba del techo de su propia fila); y el
  // dropdown de producto de OTRA fila puede estar abierto al mismo tiempo sin conflicto porque cada
  // uno se posiciona en un punto distinto de la pantalla — no comparten celda ni columna. Varias
  // filas también pueden tener su propio popover de descuentos abierto a la vez (el `Set` de
  // `PedidoNuevo.jsx` ya lo permitía) sin pisarse entre sí, por el mismo motivo.
  const panelDescuentosPopover = (variant === 'grid' && expandida && popoverStyle)
    ? createPortal(
        <div
          ref={descuentosPopoverRef}
          style={popoverStyle}
          className="min-w-[280px] max-w-[360px] w-max"
        >
          {panelDescuentosContenido}
        </div>,
        document.body,
      )
    : null;

  // `productoAnchorRef`/`nuevoProductoPopoverRef`/`nuevoProductoPopoverStyle`,
  // `calcularPosicionNuevoProductoPopover`, `subFormularioNuevoContenido` y
  // `subFormularioNuevoPopover` ELIMINADOS en esta ronda (grupo 17 de tasks.md) junto con todo el
  // sub-formulario que dependía de ellos — ver el comentario junto a la declaración de props más
  // arriba. La celda de PRODUCTO ya no necesita un ref propio para anclar ningún popover.

  if (variant === 'grid') {
    // Sangría + acento lateral de las sub-filas (pedido-grilla-visual, Decisión 5, tareas
    // 5.3-5.5): alineada con el inicio de la columna "Producto" — que arranca exactamente a los
    // 32px de la columna `#` (`pl-8` = 2rem = 32px) — con una línea `border-l-2` que dice "esto
    // cuelga de la fila de arriba" en vez de leerse como una fila independiente.
    const subFilaWrap = (contenido, colorAcento) => (
      <div className="col-span-full pl-8 pr-2 pb-2">
        <div className={`border-l-2 ${colorAcento} pl-3`}>
          {contenido}
        </div>
      </div>
    );

    return (
      // Fragment: la fila (su propio grid, ver comentario de abajo) y el popover flotante de
      // descuentos (`panelDescuentosPopover`) son ahora elementos hermanos — se porta a
      // `document.body` vía `createPortal`, así que "hermano en el árbol de React" no significa
      // "hermano en el DOM real" (ver el comentario largo junto a `panelDescuentosPopover` más
      // arriba para el detalle de posicionamiento/z-index).
      <>
      {/* La fila deja de ser `display: contents` (pedido-grilla-visual, Decisión 4) y pasa a ser su
          propio grid con `gridColsClass` (misma plantilla que encabezado y totales, ver invariante
          en PedidoNuevo.jsx). Esto le da a la fila una caja propia de la que cuelgan: el borde
          inferior único del grupo (antes vivía repetido en cada celda, tarea 5.2 — así abrir el
          editor de descuentos ya no deja una línea entre la fila y su propia sub-fila), y el hover
          en CSS puro (tarea 5.1 — nunca con estado de React: serían 40 re-renders por `mousemove`). */}
      <div className={`grid ${gridColsClass} border-b border-gray-300 hover:bg-gray-50/70 transition-colors`}>
        {/* # (posición del ítem, tarea 8.1) */}
        <div className="px-2 py-1.5 flex items-center justify-end">
          <span className="text-[11px] text-gray-400 tabular-nums">{indice}</span>
        </div>

        {/* Producto: SIN padding vertical propio (ronda de ajustes post-12.3, punto 1) — antes
            tenía `py-2` acá Y `py-2` en el botón de `ProductoSearchSelect`, padding duplicado que
            inflaba el alto de toda la fila (ver la nota larga junto a `gridCellInput` más arriba).
            `flex flex-col justify-center` para centrar el contenido si el alto de fila termina
            gobernado por otra celda (ej. Descuentos). */}
        <div className="border-l border-gray-300 px-2 relative min-w-0 flex flex-col justify-center">
          <ProductoSearchSelect
            productos={productos}
            productoId={linea.productoId}
            productoNombre={linea.productoNombre}
            productoNombreNuevo={linea.productoNombreNuevo}
            onSelect={onSeleccionarProducto}
            hasError={!!errorProducto}
            disabled={disabled}
          />
          {errorProducto && <p className="mt-1 text-xs text-red-500 font-medium">{errorProducto}</p>}
        </div>

        {/* Cantidad */}
        <div className={gridCellInput(!!errorCantidad)}>
          <FormattedNumberInput
            value={linea.cantidadPedida}
            onChange={(val) => onActualizarCampo('cantidadPedida', val)}
            placeholder="0"
            className={inputClassGrid()}
            disabled={disabled}
          />
          {errorCantidad && <p className="text-xs text-red-500 font-medium px-2 pb-1">{errorCantidad}</p>}
        </div>

        {/* USD: columna CONDICIONAL, revertido (ronda de ajustes post-12.3, punto 5 — el usuario
            confirmó explícitamente volver atrás sobre la ampliación anterior que la había dejado
            siempre presente). Sólo se renderiza cuando el proveedor elegido maneja dólares —
            `gridColsClass` ya trae la plantilla correcta (`GRID_COLS_USD`, 10 columnas) sólo en
            ese caso, ver `PedidoNuevo.jsx`. El checkbox ya no necesita distinguir "deshabilitado
            por gate de proveedor" de "deshabilitado por no manejar dólares": si la columna existe,
            el proveedor maneja dólares, así que sólo queda el gate normal (`disabled`). */}
        {manejaDolares && (
          <div className={`border-l border-gray-300 px-2 py-1.5 flex items-center justify-center ${disabled ? 'bg-gray-50' : ''}`}>
            <input
              type="checkbox"
              checked={linea.monedaLinea === 'USD'}
              onChange={onToggleMoneda}
              disabled={disabled}
              className="cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
              title="Línea en dólares"
            />
          </div>
        )}

        {/* Costo unitario */}
        <div className={gridCellInput(!!errorCosto)}>
          <FormattedNumberInput
            value={linea.costoUnitarioPactado}
            onChange={(val) => onActualizarCampo('costoUnitarioPactado', val)}
            placeholder="0"
            className={inputClassGrid()}
            disabled={disabled}
          />
          {errorCosto && <p className="text-xs text-red-500 font-medium px-2 pb-1">{errorCosto}</p>}
        </div>

        {/* Descuentos: celda-resumen + sub-fila expandible (grupo 4). `CeldaDescuentos` ya centra
            su propio contenido internamente (`min-h-[28px] flex items-center`), así que esta
            celda se queda `block` — envolverla en `flex` acá rompería el `w-full` implícito que
            hoy le da el layout de bloque (el hijo dejaría de estirarse al ancho completo). */}
        <div ref={descuentosAnchorRef} className={`border-l border-gray-300 px-2 py-1.5 min-w-0 ${disabled ? 'bg-gray-50' : ''}`}>
          {celdaDescuentos}
        </div>

        {/* IVA % */}
        <div className={gridCellInput(!!errorIva)}>
          <FormattedNumberInput
            value={linea.ivaPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('ivaPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClassGrid()}
            disabled={disabled}
          />
          {errorIva && <p className="text-xs text-red-500 font-medium px-2 pb-1">{errorIva}</p>}
        </div>

        {/* Envío % */}
        <div className={gridCellInput(false)}>
          <FormattedNumberInput
            value={linea.envioPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('envioPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClassGrid()}
            disabled={disabled}
          />
        </div>

        {/* Costo total de la línea */}
        <div className={`border-l border-gray-300 px-2 py-1.5 text-right flex flex-col justify-center ${disabled ? 'bg-gray-50' : ''}`}>
          <p className="text-sm font-semibold text-gray-800 tabular-nums whitespace-nowrap">{costoFormateado}</p>
          {notaUsd && <p className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">{notaUsd}</p>}
        </div>

        {/* Quitar */}
        <div className="border-l border-gray-300 px-2 py-1.5 flex items-center justify-center">
          {botonQuitar}
        </div>

        {/* Aviso de auto-ratchet: sub-fila sangrada con acento ámbar (tarea 5.5) — la condición de
            disparo (desglose.costoBaseConvertido > costoBaseFicha) no se toca. */}
        {avisoAutoRatchet && subFilaWrap(avisoAutoRatchet, 'border-amber-300')}

        {/* Sub-formulario de producto pendiente: ELIMINADO (grupo 17 de tasks.md) — elegir "+
            Crear producto nuevo…" ya marca la línea como pendiente sin popover intermedio, ver el
            comentario junto a la declaración de props más arriba. */}
      </div>
      {panelDescuentosPopover}
      </>
    );
  }

  // variant === 'card': colapso responsive por debajo de xl (tarea 3.12), pares etiqueta:valor,
  // sin scroll horizontal. Pulido visual (pedido-grilla-visual, Decisión 9, grupo 10): cada tarjeta
  // recibe marco propio (`border rounded-xl`, antes sólo `divide-y` entre tarjetas — ese `divide-y`
  // se sacó del contenedor en PedidoNuevo.jsx) y separadores visibles (`border-b border-gray-200`,
  // subido un escalón en la ronda de ajustes post-12.3, punto 4, mismo criterio que la grilla)
  // entre cada par etiqueta:valor, en vez de apoyarse sólo en el `gap` de la grilla. Los inputs
  // CONSERVAN su caja propia (`inputClassCard`, sin tocar) — sin columnas que hagan de marco acá,
  // sacarles el borde los dejaría sin ninguna referencia.
  const filaPar = (children, ultima = false) => (
    <div className={`grid grid-cols-2 gap-3 pb-3 ${ultima ? '' : 'border-b border-gray-200 mb-3'}`}>
      {children}
    </div>
  );

  return (
    <div className="border border-gray-300 rounded-xl p-4">
      <div className="flex items-start gap-2 pb-3 border-b border-gray-200 mb-3">
        <div className="flex-1 min-w-0 relative">
          <ProductoSearchSelect
            productos={productos}
            productoId={linea.productoId}
            productoNombre={linea.productoNombre}
            productoNombreNuevo={linea.productoNombreNuevo}
            onSelect={onSeleccionarProducto}
            hasError={!!errorProducto}
            disabled={disabled}
          />
          {errorProducto && <p className="mt-1 text-xs text-red-500 font-medium">{errorProducto}</p>}
        </div>
        {botonQuitar}
      </div>

      {filaPar(
        <>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Cantidad</label>
            <FormattedNumberInput
              value={linea.cantidadPedida}
              onChange={(val) => onActualizarCampo('cantidadPedida', val)}
              placeholder="0"
              className={`${inputClassCard(!!errorCantidad)} tabular-nums`}
              disabled={disabled}
            />
            {errorCantidad && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCantidad}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Costo unit.</label>
            <FormattedNumberInput
              value={linea.costoUnitarioPactado}
              onChange={(val) => onActualizarCampo('costoUnitarioPactado', val)}
              placeholder="0"
              className={`${inputClassCard(!!errorCosto)} tabular-nums`}
              disabled={disabled}
            />
            {errorCosto && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCosto}</p>}
          </div>
        </>
      )}

      {/* Fila "Línea en USD": condicional, revertido (ronda de ajustes post-12.3, punto 5) — mismo
          criterio que en variant="grid", vuelve a existir sólo cuando el proveedor elegido maneja
          dólares en vez de estar siempre presente con el checkbox deshabilitado. */}
      {manejaDolares && filaPar(
        <label className={`col-span-2 flex items-center gap-1.5 text-xs font-medium ${
          disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 cursor-pointer'
        }`}>
          <input
            type="checkbox"
            checked={linea.monedaLinea === 'USD'}
            onChange={onToggleMoneda}
            disabled={disabled}
            className="cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
          />
          Línea en USD
        </label>
      )}

      {filaPar(
        <>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">IVA %</label>
            <FormattedNumberInput
              value={linea.ivaPactadoPorcentaje}
              onChange={(val) => onActualizarCampo('ivaPactadoPorcentaje', val)}
              placeholder="0"
              className={`${inputClassCard(!!errorIva)} tabular-nums`}
              disabled={disabled}
            />
            {errorIva && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorIva}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Envío %</label>
            <FormattedNumberInput
              value={linea.envioPactadoPorcentaje}
              onChange={(val) => onActualizarCampo('envioPactadoPorcentaje', val)}
              placeholder="0"
              className={`${inputClassCard(false)} tabular-nums`}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {filaPar(
        <div className="col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Descuentos</label>
          {celdaDescuentos}
        </div>,
        true
      )}

      <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-200">
        <span className="text-gray-500">Costo total</span>
        <div className="text-right">
          <span className="font-semibold text-gray-900 tabular-nums">{costoFormateado}</span>
          {notaUsd && <p className="text-[11px] text-gray-500 tabular-nums">{notaUsd}</p>}
        </div>
      </div>
      {avisoAutoRatchet}
      {panelDescuentosContenido && <div className="mt-2">{panelDescuentosContenido}</div>}
    </div>
  );
};

export default FilaItemPedido;
