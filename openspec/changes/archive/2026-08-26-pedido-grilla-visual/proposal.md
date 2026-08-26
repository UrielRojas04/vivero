## Why

El change `pedido-planilla-editable` (archivado el 2026-08-25) convirtió la carga de ítems de `PedidoNuevo.jsx` en una grilla CSS Grid con una columna por dato. La estructura funcional quedó bien y el dueño del negocio la aprobó, pero al mirarla cargada dijo textualmente: *"hay campos sueltos y los bordes no se ven mucho y hay demasiado espacio entre valores o los veo muy chiquitos. Imaginate cuando el jefe arme un pedido con 30 o 40 items, no va a saber que valor es de que producto."*

No es una impresión: se reprodujo contra el stack de desarrollo real con un pedido de 30 ítems (evidencia en `img/grilla-actual-1600.png` y `img/grilla-actual-1366-usd.png`). Con esa carga la grilla falla en las dos direcciones de lectura a la vez:

- **Horizontal** (qué valor es de qué producto): la única separación entre filas es `border-b border-gray-100` —una línea casi invisible— y encima el aviso de auto-ratchet, que es `col-span-full`, se intercala entre las filas y se lee como una fila propia, partiendo cada ítem en dos.
- **Vertical** (en qué columna estoy): no hay ni una sola línea vertical. La separación entre columnas es `gap-x-3` (12px de aire) y, como la columna de descuentos suele estar vacía o casi, entre "Costo unit." e "IVA %" queda un vacío grande donde el ojo se pierde.
- **Encabezados**: `text-[11px]` gris claro, sin fondo y sin `sticky`. Al scrollear al ítem 20 ya no hay ninguna referencia de qué columna es cuál.
- **"Campos sueltos"**: cada input numérico dibuja su propia cajita (`rounded-lg border border-gray-200`) flotando en el aire, sin nada que la ate a su fila ni a su columna. Ese es literalmente el efecto que el usuario describe.
- **"Muy chiquitos"**: los chips de descuento y la nota USD son `text-[10px]`, y a 1366px el chip trunca justo el dato que importa (se lee `Volumen` sin el `5%`).

Además hay un defecto de ancho medido, no estimado: a 1366px de viewport con un proveedor que maneja dólares (9 columnas), el ancho mínimo de la grilla es **1028px** contra **998px** disponibles dentro de la tarjeta — la grilla se **recorta en silencio ~30px** (el shell de la app tiene `overflow-x-hidden` fijo, así que no aparece scrollbar). La columna de producto ya está clavada en su mínimo de 200px. Es el mismo riesgo que la Decisión 6 del change anterior dejó anotado como ventana residual "~1280–1340px"; la medición muestra que llega hasta 1366px inclusive, que es el ancho de laptop más común.

## What Changes

Change **puramente visual y de densidad**. Cero cambios de comportamiento, de lógica de negocio, de estado, de handlers, de validaciones y de payload al backend. Todo lo que hoy funciona sigue funcionando idéntico: agregar descuentos, abrir/cerrar la sub-fila con un clic, chips de descuento, campos editables por línea, gate de proveedor, borrador en `localStorage`, total correcto y aviso de auto-ratchet.

- **Rejilla real con líneas de 1px**: separadores verticales entre columnas y separador de fila más marcado, en vez de sólo aire (`gap-x-3`) y una línea `gray-100` casi invisible.
- **Los inputs pierden su caja propia y la celda pasa a ser la caja**: se van los `rounded-lg border` de cada input numérico; el input llena la celda y el borde de la celda hace de marco. Esto elimina los "campos sueltos" y, de paso, **libera el ancho** que financia todo lo demás.
- **Escala tipográfica más legible**: encabezados `text-[11px]` → `text-xs` con fondo propio; chips y nota USD `text-[10px]` → `text-[11px]`; números con `tabular-nums` para que las columnas alineen dígito con dígito.
- **Encabezado de columna `sticky`**: queda fijo arriba mientras se scrollean 40 filas.
- **Agrupación explícita "una fila = un producto"**: hover por fila, columna `#` con el número de ítem, y las sub-filas (descuentos, producto nuevo, aviso de auto-ratchet) pasan a leerse como parte de su fila —sangradas y con acento lateral— en vez de como filas sueltas.
- **Fila de totales al pie de la grilla**, con el importe alineado bajo la columna "Costo total" (muestra la MISMA variable `total` que ya existe, nunca un cálculo nuevo).
- **La fila deja de renderizarse como `display: contents`** y pasa a ser su propio grid con la misma plantilla de columnas compartida. Es el cambio estructural que habilita hover, agrupación y contención de sub-filas. La alineación entre filas se mantiene porque la plantilla no tiene ninguna pista dimensionada por contenido (ver design.md, Decisión 6).
- **Se corrige el recorte silencioso a 1366px con columna USD**, que hoy deja el botón de quitar fuera de la tarjeta.
- **Las tarjetas apiladas (`< xl`) reciben el mismo lenguaje visual**. El breakpoint `xl` y la lógica de cuándo colapsa **no se tocan** (Decisión 6 del change anterior).

**No se toca**: `frontend/src/utils/pedidoCosteo.js`, `frontend/src/utils/costeo.js`, ningún archivo de `backend/`, `RecepcionPedidoModal.jsx`, el listado de pedidos, ni ninguna decisión funcional de `pedido-planilla-editable`.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `pedidos-proveedores`: se agrega un requisito de **legibilidad de la grilla de carga de ítems** — encabezados de columna visibles durante el scroll, agrupación visual verificable de fila + sub-filas, y ausencia de recorte horizontal en los anchos de trabajo reales. Los requisitos funcionales existentes no cambian.

> **Nota de estado del spec (hallazgo, fuera del alcance de este change):** el delta de `pedido-planilla-editable` (`openspec/changes/archive/2026-08-25-pedido-planilla-editable/specs/pedidos-proveedores/spec.md`) **nunca se sincronizó** a `openspec/specs/pedidos-proveedores/spec.md` — el commit de archivado `ae4e062` movió los artefactos pero no tocó el spec principal. Por eso este change escribe su delta como `## ADDED Requirements` (un requisito nuevo y propio) en vez de `MODIFIED` sobre "Pantallas del circuito de pedidos": modificar ese requisito ahora, a partir de un texto base que le falta el delta anterior, **borraría** los escenarios de aquel change al archivar éste. Recuperar ese delta perdido es un trabajo aparte.

## Impact

**Código afectado** (frontend únicamente, 5 archivos):

| Archivo | Qué cambia |
|---|---|
| `frontend/src/pages/PedidoNuevo.jsx` | Constantes de plantilla de columnas (`GRID_COLS`/`GRID_COLS_USD`), contenedor de la grilla, fila de encabezados (sticky), fila de totales, sangrado de la grilla en la tarjeta. Estado y handlers **intactos**. |
| `frontend/src/components/pedidos/FilaItemPedido.jsx` | La fila pasa de `contents` a grid propio; celdas con bordes; inputs sin caja; hover; columna `#`; sub-filas sangradas; misma pasada visual en `variant="card"`. Props y handlers **sin cambios**. |
| `frontend/src/components/pedidos/CeldaDescuentos.jsx` | Chips más legibles, truncado del nombre pero nunca del `%`. Sin cambios de API. |
| `frontend/src/components/pedidos/PanelDescuentosLinea.jsx` | Tratamiento de sub-fila (sangría + acento lateral), tipografía. Sin cambios de API. |
| `frontend/src/components/pedidos/ProductoSearchSelect.jsx` | El botón/input se adapta a la celda sin caja propia. Su `z-20` y su API **no cambian**. |

**Sin impacto en**: backend, base de datos, contrato de API, formato del borrador en `localStorage`, dependencias de npm.

**Riesgo principal**: pasar la fila de `display: contents` a grid propio es el único cambio estructural. Si la plantilla de columnas llegara a contener una pista dimensionada por contenido, las filas dejarían de alinearse entre sí. Hoy no la tiene y el change agrega una verificación explícita de alineación con 30+ ítems.

**Gobernanza**: MEDIA-BAJA (pulido visual sin lógica de negocio), pero sobre una pantalla de uso diario del dueño → checkpoint intermedio obligatorio con 30+ ítems cargados y checkpoint final de demo.
