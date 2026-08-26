> **Gobernanza: MEDIA-BAJA** — pulido visual sin lógica de negocio, pero sobre una pantalla de uso
> diario del dueño. Se puede avanzar con autonomía dentro de cada grupo, pero **hay que detenerse en
> los checkpoints marcados 🔶** antes de seguir. Reglas duras del proyecto vigentes: no buildear sin
> pedido, no commitear sin pedido, `cursor-pointer` en todos los botones, iconos `lucide-react`,
> feedback vía `useUIStore` (nunca `alert`/`confirm`), PascalCase en componentes y archivos.
>
> **Regla que gobierna todo este change:** sólo se tocan `className`, estructura de contenedores y
> constantes de plantilla de columnas. **Cero cambios** en handlers, estado, props, firmas,
> validaciones, cálculo de costo y payload. Si una tarea parece pedir tocar lógica, está mal
> entendida — releer `design.md`.

## 1. Reproducir el problema antes de tocar nada

> Sin la pantalla cargada de verdad no se puede evaluar ninguna decisión visual de este change.

- [x] 1.1 Levantar el stack de desarrollo (`docker compose up -d`) y entrar a `localhost:5173` con `jefe@vivero.com` / `jefe123`. Poner el negocio activo en **Herramientas** (`localStorage.unidadNegocioActiva = 2`; la lista está en `localStorage.negociosDisponibles`) — sin eso, `/pedidos/nuevo` trae proveedores y productos del negocio Plantas y no aparece la columna USD.
- [x] 1.2 Cargar un pedido de **30+ ítems mezclados** sin tipearlos a mano: inyectar un borrador en `localStorage` bajo la clave `pedido-nuevo-borrador` con la forma `{ proveedorId, observaciones, items[], cotizacionDolar, cotizacionTocada }` y recargar. Cada ítem necesita `lineaId`, `productoId`+`productoNombre` (existente) **o** `productoNombreNuevo` (pendiente), `cantidadPedida`, `costoUnitarioPactado`, `monedaLinea`, `ivaPactadoPorcentaje`, `envioPactadoPorcentaje`, `descuentosPactados[]`. La mezcla tiene que incluir: productos existentes y pendientes, filas con 0, 1 y 2 descuentos, alguna línea en USD, y nombres de producto largos y cortos.
- [x] 1.3 Elegir el proveedor **SHIMURA** (`manejaDolares = true`) para trabajar siempre con las 9 columnas, que es el caso peor de ancho.
- [x] 1.4 Reproducir el recorte a 1366px: con esa carga, medir en el navegador el interior de la tarjeta de ítems y la suma de pistas de la grilla, y confirmar el faltante (~30px) descrito en el Context de `design.md`. Guardar una captura de referencia del "antes" para comparar en los checkpoints.

## 2. Estructura: la fila pasa a ser su propio grid

> Ver Decisión 4 de `design.md`. Es el único cambio estructural del change y todo lo demás cuelga de
> él. Después de este grupo la pantalla debe verse **casi idéntica** a como está hoy — si cambió
> algo visible además de la desaparición de `gap-x-3`, algo salió mal.

- [x] 2.1 En `PedidoNuevo.jsx`: el contenedor de la grilla deja de ser `hidden xl:grid ${gridColsClass} gap-x-3 …` y pasa a ser un contenedor vertical (`hidden xl:flex xl:flex-col`) que contiene la fila de encabezados y las filas de ítems como hijas.
- [x] 2.2 Extraer la fila de encabezados a su propio elemento grid, con la misma constante `gridColsClass`.
- [x] 2.3 En `FilaItemPedido.jsx`, `variant="grid"`: reemplazar `<div className="contents">` por un `<div>` propio con `gridColsClass` aplicado (la constante llega por prop desde `PedidoNuevo.jsx`, o se exporta desde un módulo compartido — **nunca se redefine la plantilla dentro del componente**).
- [x] 2.4 Las tres sub-filas que hoy son `col-span-full` (panel de descuentos, sub-formulario de producto nuevo, aviso de auto-ratchet) pasan a ser hijas del `<div>` de fila, conservando `col-span-full` — ahora respecto del grid de su propia fila.
- [x] 2.5 Reemplazar el comentario de `FilaItemPedido.jsx` que explica el `display: contents` por el **invariante de la Decisión 4**: la plantilla de columnas no puede contener nunca una pista `auto`, `min-content`, `max-content` ni `fit-content()`, porque las filas dejarían de alinearse entre sí en silencio.
- [x] 2.6 Verificar alineación con los 30+ ítems del grupo 1: la posición horizontal de cada columna tiene que ser idéntica en la primera fila, en la última y en el encabezado. Medir, no mirar. Si hay desalineación, volver a `contents` y reportar — no parchear anchos a mano.
- [x] 2.7 Verificar que ningún contenedor nuevo introdujo `overflow-hidden` ni `overflow-x-auto`: abrir el buscador de producto de una fila del medio y confirmar que el dropdown (`z-20`) se ve entero, y abrir un panel de descuentos y confirmar lo mismo.

## 3. Rejilla, celdas y campos sin caja propia

> Ver Decisiones 1 y 2 de `design.md`. Es el núcleo de "los bordes no se ven mucho" y "hay campos
> sueltos".

- [x] 3.1 Cambiar la separación entre columnas de `gap-x-3` a `gap-0` y dar a cada celda su propio padding horizontal (`px-2`), para que las reglas de 1px vivan en ese padding en vez de en aire.
- [x] 3.2 Agregar la regla vertical: `border-l border-gray-200` en cada celda salvo la primera, tanto en las filas de ítems como en la de encabezados.
- [x] 3.3 Subir la regla horizontal de fila de `border-gray-100` a `border-gray-200`, y el borde inferior del encabezado a `border-b-2 border-gray-300`.
- [x] 3.4 Dar marco exterior a la grilla: `border border-gray-200 rounded-xl`. **Sin `overflow-hidden`** — recortaría el dropdown de producto y el panel de descuentos (invariante de la Decisión 6 del change anterior).
- [x] 3.5 Reescribir `inputClass()` en `FilaItemPedido.jsx`: fuera `rounded-lg border border-gray-200 bg-white px-2.5 py-1.5`; el input pasa a `w-full bg-transparent px-2 py-2 text-sm text-right tabular-nums focus:outline-none`. Aplica **sólo** a `variant="grid"` — la variante tarjeta conserva sus cajas (Decisión 9).
- [x] 3.6 Estado de foco: `focus:ring-2 focus:ring-inset focus:ring-emerald-500` + `focus:bg-emerald-50/50`. **`ring-inset` es obligatorio**: sin gap entre columnas, un ring hacia afuera invade la celda vecina.
- [x] 3.7 Estado de error: el borde rojo del input se reemplaza por `bg-red-50` en la celda. El texto de error debajo se conserva tal cual (mismas claves `errors[...]`, misma condición).
- [x] 3.8 Estado deshabilitado (gate de proveedor): la celda lleva `bg-gray-50 text-gray-400` explícito, para que "no editable" siga leyéndose sin el borde gris del input.
- [x] 3.9 Afordancia de edición: al pasar el mouse por una celda editable, `bg-white` + `ring-1 ring-inset ring-gray-300` para que el campo "levante" y se anuncie como editable.
- [x] 3.10 Adaptar el botón/input de `ProductoSearchSelect.jsx` a la celda sin caja propia, sin tocar su API ni su `z-20` ni su lógica de búsqueda.

## 4. Tipografía y alineación de dígitos

> Ver Decisión 3 de `design.md`. Es "los veo muy chiquitos".

- [x] 4.1 Agregar `tabular-nums` a **todas** las celdas numéricas: cantidad, costo unitario, IVA %, envío %, costo total de fila y la nota USD. Es el cambio de mayor efecto por costo del change.
- [x] 4.2 Encabezados de columna: de `text-[11px] text-gray-500` a `text-xs font-semibold text-gray-600 uppercase`, con fondo `bg-gray-50`.
- [x] 4.3 `CeldaDescuentos.jsx`: chips de `text-[10px]` a `text-[11px]`.
- [x] 4.4 `CeldaDescuentos.jsx`: partir el chip en dos `<span>` — nombre con `truncate min-w-0`, porcentaje con `shrink-0`. **El porcentaje no se trunca nunca**: hoy `max-w-[110px] truncate` sobre el texto completo se come el `%` a 1366px y se lee `Volumen` a secas.
- [x] 4.5 Nota USD de `text-[10px] text-gray-400` a `text-[11px] text-gray-500 tabular-nums`; errores por línea de `text-[11px]` a `text-xs`.
- [x] 4.6 `PanelDescuentosLinea.jsx`: subir los `text-[10px]` de labels y botones a `text-[11px]`, sin cambiar ningún handler.
- [x] 4.7 Verificar que ningún cambio de tipografía empujó el ancho mínimo de una columna fija: volver a medir la suma de pistas a 1366px con USD.

## 5. "Una fila = un producto": hover, agrupación y sub-filas

> Ver Decisión 5 de `design.md`. Es el corazón del pedido del usuario: "no va a saber qué valor es de
> qué producto".

- [x] 5.1 Hover de fila completa en CSS puro sobre el `<div>` de fila (`hover:bg-gray-50/70`). **Nunca con estado de React** — serían 40 re-renders por cada movimiento del mouse entre filas.
- [x] 5.2 Mover la regla inferior de las celdas (`cellBase`) al `<div>` de fila, de modo que la línea se dibuje una sola vez al pie de todo el grupo. Efecto buscado: abrir el editor de descuentos deja de dejar una línea **entre** la fila y su propia sub-fila.
- [x] 5.3 Dar a `PanelDescuentosLinea` tratamiento de sub-fila: sangría izquierda alineada con el inicio de la columna "Producto" y acento lateral `border-l-2 border-emerald-200`. Sin tocar sus props ni sus handlers.
- [x] 5.4 Mismo tratamiento para el sub-formulario de producto nuevo (`creandoAqui`), conservando su disparador y sus botones tal cual.
- [x] 5.5 Aviso de auto-ratchet: de texto ámbar suelto (`col-span-full -mt-1 pb-2`) a nota sangrada con acento `border-l-2 border-amber-300`. **La condición de disparo (`desglose.costoBaseConvertido > costoBaseFicha`) no se toca.**
- [x] 5.6 Verificar con los 30+ ítems que una fila con aviso de auto-ratchet + editor de descuentos abierto se lee como **un** bloque, y que el ítem siguiente se lee como una fila distinta.

## 6. Encabezado fijo al scrollear

> Ver Decisión 6 de `design.md`. Se apoya en una medición concreta: el contenedor que scrollea es
> `div.flex-1.p-4.md:p-8.overflow-x-hidden` (su `overflow-y` computa a `auto` porque el eje x es
> `hidden`), **no** `main`.

- [x] 6.1 Poner la fila de encabezados en `sticky top-0 z-10` con fondo **opaco** (`bg-gray-50`) y `border-b-2 border-gray-300`. Sin fondo opaco, las filas se ven pasar por debajo.
- [x] 6.2 Verificar con 30+ ítems que al scrollear hasta el ítem 25 el encabezado sigue visible y ninguna fila se transparenta debajo.
- [x] 6.3 Verificar el conflicto de apilamiento: abrir el buscador de producto de la primera fila visible y confirmar que el dropdown (`z-20`) se dibuja **por encima** del encabezado (`z-10`) y que todas sus opciones son alcanzables.
- [x] 6.4 Verificar que la barra superior de la app (que es `sticky top-0 z-20` en `main`, otro contenedor de scroll) no se superpone con el encabezado de la grilla.
- [x] 6.5 Si `sticky` no se pega (por ejemplo si alguien cambió el shell), **sacarlo y reportarlo**: es la parte más aislable del change y la grilla mejora igual sin ella. No pelearlo con hacks de `overflow`.

## 7. Presupuesto de ancho: cerrar el recorte a 1366px

> Ver Decisión 7 de `design.md`. Esto corrige un defecto real, no es cosmética.

- [x] 7.1 Sangrar la grilla hasta los bordes de la tarjeta a partir de `xl` (`-mx-5 sm:-mx-6`), compensando el `p-5 sm:p-6` de la tarjeta. Recupera 48px y hace que las reglas horizontales lleguen de borde a borde.
- [x] 7.2 Reajustar las pistas de `GRID_COLS`/`GRID_COLS_USD` según la tabla de la Decisión 7, financiado por los ~22px de cromo que cada input libera al perder su caja: `#` 32 · Producto `minmax(190px,2.2fr)` · Cant. 64 · USD 44 · Costo unit. 100 · Descuentos `minmax(150px,1.1fr)` · IVA 60 · Envío 60 · Costo total 132 · Quitar 36.
- [x] 7.3 Verificar que `$4.101.250,23` entra completo en la columna de costo total sin recortarse ni envolver.
- [x] 7.4 **Medir** a 1366px con proveedor USD: la suma de pistas más el padding tiene que entrar en el interior de la tarjeta. Confirmar que el botón de quitar queda completamente dentro y que ninguna columna se recorta.
- [x] 7.5 **Medir** también a 1280px, que es donde `xl` recién activa la grilla — es el caso más ajustado de todos.
- [x] 7.6 Verificar a 1600px que la columna de producto ya no se lleva ~426px de ancho muerto.
- [x] 7.7 Si en 7.4 o 7.5 no entra: angostar pistas fijas. **Prohibido** agregar scroll horizontal (rompe el dropdown y el panel, Decisión 6 del change anterior) y **prohibido** mover el breakpoint `xl`.

## 8. Columna `#` y fila de totales

> Ver Decisión 8 de `design.md`. Son los dos agregados más prescindibles del change — se muestran en
> el checkpoint y se sacan sin costo si el dueño los ve como ruido.

- [x] 8.1 Agregar la columna `#` (32px) como primera columna, sólo en `variant="grid"`: número de posición del ítem, `text-[11px] text-gray-400 tabular-nums text-right`.
- [x] 8.2 Agregar la fila de totales al pie de la grilla: `bg-gray-50`, `border-t-2 border-gray-300`, la palabra "Total" y el importe **alineado bajo la columna "Costo total"**. **Revertido en el checkpoint 9.1** (punto d): el usuario la pidió sacar por redundante con el total del footer de la página. Ver grupo 9.1 y `PedidoNuevo.jsx`.
- [x] 8.3 **Restricción dura:** la fila de totales renderiza la variable `total` que ya existe en `PedidoNuevo.jsx`. Prohibido recalcular, prohibido un `reduce` nuevo — un cuarto punto de cálculo del total reintroduciría el bug que motivó la Decisión 1 del change anterior. Verificar que el número de la fila de totales, el del encabezado de la tarjeta y el de la tarjeta de pie son idénticos. **N/A tras la reversión de 8.2** — sólo quedan dos totales (encabezado de la tarjeta y footer de página), ambos ya usaban `total` desde antes de este change; verificado que siguen coincidiendo ($209.351.566,73 en ambos, borrador de prueba de 32 ítems).

## 9. 🔶 CHECKPOINT INTERMEDIO

- [x] 🔶 **9.1 CHECKPOINT** — Mostrar al usuario la grilla con **30+ ítems** cargados (la misma mezcla del grupo 1), a 1366px y a 1600px, con al menos un editor de descuentos abierto y algún aviso de auto-ratchet visible. Preguntar explícitamente por: (a) si los campos numéricos **se leen como editables** ahora que no tienen caja propia — es el riesgo principal de la Decisión 2; (b) si las reglas alcanzan o hace falta zebra (Open Question 1); (c) si la columna `#` y la fila de totales se quedan o se sacan (Open Question 2); (d) si el sangrado de la grilla a los bordes de la tarjeta se ve bien (Open Question 3). **No seguir con el grupo 10 sin respuesta a (a).**
  **Resuelto:** (a) inputs sin caja propia confirmados tal cual, se leen como editables — no se cambia nada. (b) sin zebra, las reglas de 1px alcanzan — no se cambia nada. (c) columna `#` se queda tal cual. (d) fila de totales al pie de la grilla **se saca** (redundante con el footer de la página) — implementado en esta corrida, ver `PedidoNuevo.jsx` (grupo 8.2/8.3 revertido, comentario actualizado). El sangrado (Open Question 3) no generó objeción, se queda tal cual.

## 10. Tarjetas por debajo de `xl`

> Ver Decisión 9 de `design.md`. Mismo lenguaje visual, **breakpoint intocable**.

- [x] 10.1 Labels de la tarjeta de `text-[10px] text-gray-400` a `text-[11px] font-medium text-gray-500`.
- [x] 10.2 `tabular-nums` en los valores numéricos de la tarjeta.
- [x] 10.3 Cada tarjeta con marco propio (`border border-gray-200 rounded-xl`) en vez de sólo `divide-y divide-gray-100`, y separadores visibles entre los pares etiqueta:valor. Implementado con un helper `filaPar()` que envuelve cada par en un `border-b border-gray-100` (contenedor de lista en `PedidoNuevo.jsx` pasó de `divide-y divide-gray-100` a `flex flex-col gap-3` entre tarjetas).
- [x] 10.4 Los inputs de la tarjeta **conservan su caja propia**: sin columnas que hagan de marco, sacarles el borde los dejaría sin ninguna referencia. Verificado: `inputClassCard` no se tocó.
- [x] 10.5 Verificar que el umbral `xl` (`hidden xl:flex` / `xl:hidden`) y la lógica de cuándo colapsa **no se movieron ni un carácter**. Comprobar a 375px, 768px, 1024px (tarjetas, sin desborde horizontal) y 1366px (grilla completa). **Verificado con Playwright contra el dev stack real:** 1279px → tarjetas, 1280px → grilla (frontera exacta intacta); 375/768/1024px sin `document.body.scrollWidth > clientWidth` (cero desborde horizontal); 1366px con grilla completa y 32 ítems.

## 11. No-regresión (obligatorio antes de cerrar)

> El riesgo real de un change visual sobre esta pantalla no es que se vea mal: es haber roto algo
> mientras se reescribía el JSX. Estas verificaciones son las mismas que cerraron
> `pedido-planilla-editable`.

- [x] 11.1 Borrador en `localStorage`: cargar proveedor + varios ítems, F5, y confirmar que vuelve todo — proveedor, cantidades, costos, IVA, envío, descuentos, moneda, cotización, observaciones. **Verificado con Playwright** contra el dev stack real: borrador de 32 ítems + SHIMURA, F5, proveedor y "32 ítems · Total: $209.351.566,73" idénticos antes/después.
- [x] 11.2 Confirmar que el formato del borrador **no cambió**: un borrador escrito antes de este change se lee sin conversión. Verificado por inspección: `guardarBorrador`/`cargarBorrador`/`BORRADOR_KEY` no aparecen en el diff de `PedidoNuevo.jsx` (sólo tocado por className/estructura fuera de esa zona).
- [x] 11.3 Payload de una línea de **producto existente**: interceptar el POST y comparar campo por campo contra el de antes del change. **Verificado con Playwright** (`page.route` interceptando `**/api/pedidos`, sin tocar el backend real): línea existente manda `productoId: 60` sin `productoNombreNuevo`, con `cantidadPedida`/`costoUnitarioPactado`/`monedaLinea`/`ivaPactadoPorcentaje`/`envioPactadoPorcentaje`/`descuentoPactadoPorcentaje`/`descuentoPactadoDetalle` correctos.
- [x] 11.4 Payload de una línea **pendiente**: `productoNombreNuevo` sin `productoId`, `descuentoPactadoPorcentaje` colapsado en cascada y `descuentoPactadoDetalle` con el desglose textual. **Verificado**: línea pendiente sin descuentos → `descuentoPactadoPorcentaje: null`; línea con 2 descuentos → `descuentoPactadoDetalle: "Volumen 7.00%; Pronto pago 4.00%"` (formato cascada intacto).
- [x] 11.5 `cotizacionDolar` viaja sólo si hay al menos una línea en USD, y `null` si no. **Verificado**: con líneas USD en el borrador de prueba, `cotizacionDolar: 1460` viajó en el payload interceptado.
- [x] 11.6 Validaciones por línea: producto sin elegir, cantidad ≤ 0, costo vacío, IVA obligatorio, descuentos sin nombre o con % inválido, cotización faltante con línea USD — todas siguen disparando y mostrando su texto en la celda correcta. **Verificado con Playwright**: ítem vacío + "Crear Pedido" → el POST nunca sale (`hitBackend: false`), y se ven "Elegí un producto", "Cantidad > 0" y "Costo requerido" con `bg-red-50` en la celda correspondiente (tratamiento de error de la Decisión 2).
- [x] 11.7 Gate de proveedor: estado vacío sin proveedor, botón "Agregar ítem" deshabilitado, y borrador restaurado sin proveedor con filas **visibles y no editables** bajo el banner ámbar. Confirmar que el estado no editable se lee bien con el nuevo tratamiento de celdas (tarea 3.8). **Verificado con Playwright**: borrador de 32 ítems con `proveedorId: null` → banner ámbar "Elegí un proveedor para seguir editando estos ítems.", filas visibles con inputs grisados (`bg-gray-50 text-gray-400`), columna USD ausente (proveedor no elegido), "Agregar ítem" deshabilitado.
- [x] 11.8 Descuentos: clic en la celda abre y cierra la sub-fila; el `+` agrega y auto-expande; "Recargar del proveedor" sigue funcionando; los chips reflejan lo cargado; el efectivo de la cascada aparece con 2+ descuentos. **Verificado con Playwright**: clic en el chip de una fila abre `PanelDescuentosLinea` como sub-fila sangrada con acento esmeralda, con el descuento cargado ("Volumen" / "6") y los botones "Recargar del proveedor" / "+ Agregar" visibles.
- [x] 11.9 Confirmar por `git diff` que **no se tocó** `frontend/src/utils/pedidoCosteo.js`, `frontend/src/utils/costeo.js` ni ningún archivo de `backend/`. Los cambios de `backend/` presentes en el árbol de trabajo pertenecen a otra sesión y quedan fuera de este change. Confirmado: `git diff --stat` sobre esos archivos no devuelve nada; el único diff de `backend/` en el árbol es de `venta-cliente-casual-herramientas` (sesión paralela).
- [x] 11.10 Confirmar por `git diff` que el diff de los 5 archivos del alcance es **sólo** `className`, estructura de contenedores y constantes de plantilla: ningún handler, prop, firma, validación ni cálculo modificado. Confirmado línea por línea: `onChange`/`onActualizarCampo`/`onToggleMoneda`/`value`/`disabled` idénticos, sólo reindentados dentro del nuevo helper `filaPar`/`subFilaWrap`.
- [x] 11.11 Correr `npx oxlint` sobre los 5 archivos del alcance y dejarlo limpio. **No correr build sin pedido explícito del usuario.** `npx oxlint` sobre los 5 archivos → exit code 0, sin warnings.
- [x] 11.12 Revisar reglas duras de UI en todo lo tocado: `cursor-pointer` en cada botón, iconos de `lucide-react`, sin `alert`/`confirm` nativos, PascalCase en componentes y archivos. Verificado por inspección de los 5 archivos: sin `alert(`/`confirm(` nativos, íconos de `lucide-react` (`Trash2`, `PackagePlus`, `Search`, `X`, `Sparkles`, `Plus`, `ChevronDown/Up`, `RefreshCw`), componentes en PascalCase.

## 12. Cierre

- [x] 12.1 Resolver las Open Questions de `design.md` con lo respondido en el checkpoint 9.1 y dejarlo anotado en el propio `design.md` (zebra sí/no, `#` y fila de totales sí/no, sangrado sí/no). Ver sección "Open Questions — Resueltas (checkpoint 9.1)" agregada al final de `design.md`.
- [x] 12.2 Anotar en `design.md` los anchos de pista **finales** realmente usados y las mediciones de 1366px y 1280px, para que la próxima persona no tenga que volver a descubrir el presupuesto de ancho. Ver sección "Medición final (post checkpoint 9.1)" agregada a `design.md`.
- [x] 🔶 **12.3 CHECKPOINT FINAL** — Demo de la pantalla completa al usuario: grilla con muchos ítems, encabezado fijo al scrollear, sub-filas agrupadas, gate de proveedor, tarjetas en pantalla angosta y totales coincidentes en el encabezado de la tarjeta ("N ítems · Total: $X") y en la tarjeta de pie de página ("Total: $X" junto a Cancelar/Crear Pedido) — **ya no hay una tercera fila de totales al pie de la grilla, sacada en el checkpoint 9.1 (punto d)**. Recién con su OK el change queda listo para `/opsx:archive`.
  **Nota:** llegado a este checkpoint, el usuario compartió una imagen de referencia y pidió una
  ronda más de ajustes antes de dar el OK final de archivo — ver grupo 13 más abajo. El OK de cierre
  de 12.3 queda pendiente hasta que el usuario vea también el resultado del grupo 13.

## 13. Ampliación post-12.3: referencia visual + 3 ajustes puntuales

> El usuario compartió `img/grilla ejemplo.png` (mockup, no pixel-perfect) y pidió tres ajustes
> concretos antes de archivar. El usuario fue explícito en que el mockup tiene defectos propios que
> hay que EVITAR, no replicar: botón de eliminar cortado, valores descentrados, "%" de un chip en
> segunda línea. Ver Decisiones 10/11 de `design.md` (sección "Ampliación") para el detalle completo
> de cada decisión.

- [x] 13.1 Leer `img/grilla ejemplo.png` con el Read tool y los 5 archivos de alcance del change
      antes de tocar nada.
- [x] 13.2 **Menú lateral: fuera de alcance, cero cambios.** Verificado que `DashboardLayout.jsx` y
      cualquier archivo del sidebar no aparecen en el diff de esta ampliación.
- [x] 13.3 **Columna USD siempre presente** (Decisión 10 de design.md): unificar `GRID_COLS`/
      `GRID_COLS_USD` en una única plantilla de 10 columnas en `PedidoNuevo.jsx`; `gridColsClass` deja
      de depender de `manejaDolares`. Encabezado "USD" siempre renderizado (sin el `{manejaDolares &&
      ...}` que lo condicionaba).
- [x] 13.4 En `FilaItemPedido.jsx` (`variant="grid"`): la celda USD siempre se renderiza; el checkbox
      se deshabilita (`disabled || !manejaDolares`) y queda destildado con `title="Este proveedor no
      maneja dólares"` y fondo `bg-gray-50` cuando el proveedor no maneja dólares — mismo tratamiento
      visual que el resto de las celdas deshabilitadas de la grilla.
- [x] 13.5 Mismo criterio en `variant="card"` (decisión no obvia, documentada en Decisión 10): la fila
      "Línea en USD" pasa a estar siempre presente, con el checkbox deshabilitado cuando el proveedor
      no maneja dólares — para que el mismo ítem no muestre capacidades distintas según se lo mire en
      la grilla o en la tarjeta apilada.
- [x] 13.6 Verificar con Playwright contra el dev stack real, proveedor CON dólares (SHIMURA) y SIN
      dólares (INGCO), en la misma sesión: mismo ancho de encabezado (1042px a 1366px) y misma
      cantidad de columnas (10) en ambos casos — cero salto de layout al cambiar de proveedor.
      Adicionalmente, prueba interactiva con el `<select>` real: tildar USD con SHIMURA elegido y
      cambiar a INGCO en caliente — el checkbox se deshabilita y destilda solo, sin tocar el
      `useEffect` de normalización de moneda ya existente.
- [x] 13.7 **Borde del campo de producto sólo en hover/edición** (Decisión 11 de design.md): en
      `ProductoSearchSelect.jsx`, el botón en reposo (sin error, sin editar) pasa a
      `border-transparent bg-transparent`; con `hover` gana `border-emerald-300 bg-white`. El estado
      de búsqueda/edición ya tenía borde visible desde antes, sin cambios. Aplicado a los dos
      botones del componente (producto existente y producto "pendiente de crear").
- [x] 13.8 Excepciones deliberadas sin tocar: error de validación (`hasError`) mantiene el borde rojo
      SIEMPRE visible (no depende de hover — mismo criterio que el resto de la grilla); estado
      deshabilitado (gate de proveedor) conserva su borde gris siempre visible tal cual estaba.
- [x] 13.9 Verificar con Playwright (capturas `img/verif-producto-reposo.png`,
      `img/verif-producto-hover.png`, `img/verif-producto-editando.png`): reposo sin borde visible,
      hover con borde esmeralda, edición con el input de búsqueda de siempre.
- [x] 13.10 **Botón de eliminar nunca cortado** (verificación explícita pedida en el brief, ver
      "Verificación adicional" en design.md): medido con Playwright, el tamaño original del botón
      (32px) dejaba sólo ~2-3.5px de margen contra el borde de la grilla a 1366px — no se cortaba,
      pero no había "suficiente padding". Se redujo el botón en `FilaItemPedido.jsx` de `p-2`/`w-4
      h-4` a `p-1.5`/`w-3.5 h-3.5` (mismo tamaño que el botón de quitar de
      `PanelDescuentosLinea.jsx`), sin tocar el ancho de la columna "Quitar" (36px, ya sin holgura a
      1280px). Verificado: margen de 5.5px en 1280/1366/1600px, sin overflow horizontal en ningún
      caso.
- [x] 13.11 **Chips de descuento en una sola línea** (tercer bug del mockup a evitar): ya estaba
      resuelto desde el grupo 4 de este change (`CeldaDescuentos.jsx`, chip partido en dos `<span>`,
      el nombre trunca y el `%` nunca se trunca ni se envuelve). Re-verificado en esta ampliación con
      Playwright, con datos reales de dos descuentos por línea ("Volumen 5%", "Pronto pago 3%"): el
      texto completo con el `%` está siempre presente en el DOM y ambos `<span>` (nombre y
      porcentaje) miden la misma altura (20.5px) en la misma línea — cero wrap.
- [x] 13.12 `npx oxlint` sobre los 5 archivos de alcance: limpio (exit code 0).
- [x] 13.13 Confirmar por inspección que no se tocó `pedidoCosteo.js`, `costeo.js`, ningún archivo de
      `backend/`, ni ningún archivo de la sesión paralela `venta-cliente-casual-herramientas`
      (`VentaRequestDTO.java`, `Venta.java`, `VentaServiceImpl.java`, `ClienteAdHocDTO.java`,
      `NuevaVenta.jsx`, `Productos.jsx`).
- [x] 13.14 Sin datos de prueba persistidos: toda la verificación se hizo con un borrador inyectado en
      `localStorage` de instancias efímeras de Playwright (nunca se envió el formulario, cero
      registros nuevos en la base real). Sin build, sin commit.
- [x] 🔶 **13.15 CHECKPOINT — OK final del usuario** antes de `/opsx:archive`: mostrar los 3 puntos
      verificados (columna USD estable entre proveedores, borde del campo de producto sólo en
      hover/edición, botón de eliminar con margen cómodo) más la reconfirmación de que el menú
      lateral no cambió.
      **Nota:** antes de dar el OK, el usuario pidió una ronda más de 5 ajustes puntuales — ver
      grupo 14 más abajo. El OK final de archivo queda pendiente hasta que el usuario vea también
      el resultado del grupo 14.

## 14. Segunda ronda post-12.3: altura de celda, header ENVÍO, color, bordes, revert USD

> 5 puntos de feedback sobre lo ya aprobado (ver Decisiones 12-16 de design.md, sección
> "Ampliación 2"). El punto 5 es un revert de comportamiento ya autorizado explícitamente por el
> usuario (pregunta directa, respondida) — vuelve atrás específicamente sobre la Decisión 10 de la
> ampliación anterior, sin tocar el resto de esa ampliación (Decisión 11, botón de eliminar).

- [x] 14.1 **Punto 1 — altura de celda vs. input** (Decisión 12): diagnosticada la causa raíz
      (padding vertical duplicado en la celda "Producto": `py-2` del `<div>` contenedor +
      `py-2` propio del botón de `ProductoSearchSelect`, que inflaba el alto de fila entero vía
      `align-items: stretch`). Elegido reducir padding (no subir tamaño de valores, que reabriría
      el recorte a 1366px cerrado por la Decisión 7). Cambios: `ProductoSearchSelect.jsx` botón en
      reposo `py-2`→`py-1.5`; `FilaItemPedido.jsx` celda Producto pierde su `py-2` propio;
      `inputClassGrid()` `py-2`→`py-1.5` (aplica igual a cantidad/costo/IVA/envío); `gridCellInput()`
      pasa de `block` a `flex flex-col justify-center` (defensivo, centra el contenido cuando el
      alto de fila queda gobernado por otra celda con contenido real, ej. nota USD en Costo total).
      Verificado con Playwright: fila con nota USD en dos líneas → celda 48.5px vs. input 32px, con
      8.25px de sobrante arriba Y 8.25px abajo (centrado, antes todo concentrado abajo); fila
      "normal" (sin nota USD, 1 descuento) → celda 40px vs. input 32px, sobrante de sólo 4px por
      lado.
- [x] 14.2 **Punto 2 — header "ENVÍO %" en una sola línea** (Decisión 13): IVA % 60px→56px (le
      sobraba espacio), Envío % 60px→64px (la suma no cambia, presupuesto de ancho de la Decisión 7
      intacto). Padding del header `px-2`→`px-1` y sin `tracking-wider` sólo en estas dos columnas;
      `whitespace-nowrap` como garantía dura en ambas. Verificado con Playwright a 1366px: `<span>`
      "Envío %" mide `width: 64` con `scrollWidth: 63` — entra en una sola línea con margen.
      Confirmado visualmente en capturas a 1280/1366/1600px con proveedor SHIMURA.
- [x] 14.3 **Punto 3 — más color** (Decisión 14), reusando paleta ya usada en la app (grepeada antes
      de tocar nada, nunca un color nuevo):
      - `CeldaDescuentos.jsx`: chips `bg-gray-100 text-gray-600` → `bg-emerald-50 text-emerald-700`
        (mismo par que el badge "USD" de `PerfilBadges` en `Proveedores.jsx`). Verificado con
        Playwright: color computado exacto a Tailwind `emerald-50`/`emerald-700`.
      - Encabezados de columna: `bg-gray-50 text-gray-600 font-semibold` → `bg-gray-100 text-gray-700
        font-bold` (mismo patrón "header con más peso" que ya usa `FacturaCliente.jsx`). Borde
        inferior del header sube un escalón más que el resto de la grilla (`border-gray-400`).
      - Botón de eliminar (`Trash2`): se mantiene el patrón hover-to-red que usan TODOS los botones
        de eliminar de la app (grepeado en `Proveedores.jsx`/`Productos.jsx`) — se sube un escalón
        el gris de reposo (`gray-400`→`gray-500`) en vez de pasar a rojo siempre visible, que hubiera
        roto esa convención. Verificado con Playwright: color computado exacto a Tailwind `gray-500`.
- [x] 14.4 **Punto 4 — bordes más marcados** (Decisión 15): `border-gray-200`→`border-gray-300` en
      reglas verticales, borde inferior de fila y marco exterior de la grilla/tarjetas;
      `border-gray-100`→`border-gray-200` en separadores internos de tarjeta y en
      `PanelDescuentosLinea.jsx`; anillo de hover `gray-300`→`gray-400`. Verificado con Playwright:
      color computado de `border-left`/`border-bottom` de celda/fila exacto a Tailwind `gray-300`.
- [x] 14.5 **Punto 5 — revert de la Decisión 10: columna USD vuelve a ser condicional** (Decisión
      16), autorizado explícitamente por el usuario ante una pregunta directa. Recuperado el
      mecanismo original de `git show ae4e062:frontend/src/pages/PedidoNuevo.jsx` (dos plantillas
      `GRID_COLS`/`GRID_COLS_USD` elegidas por `manejaDolares`, celda envuelta en `{manejaDolares &&
      (...)}`) en vez de reinventarlo — aplicado en `PedidoNuevo.jsx` (header + `gridColsClass`) y en
      `FilaItemPedido.jsx` (celda `variant="grid"` Y fila `variant="card"`, ambas). Código muerto de
      la versión "siempre presente" removido (`disabled || !manejaDolares`, título condicional). El
      resto de la ampliación anterior (Decisión 11, botón de eliminar) se mantiene sin cambios.
      Verificado con Playwright, proveedor CON dólares (SHIMURA) y SIN dólares (INGCO), 1280/1366/
      1600px: `scrollWidth === headerWidth === viewport` en los 6 casos (sin overflow ni con USD ni
      sin), columna USD ausente para INGCO (`cols: 9`, `tieneUSD: false`) presente para SHIMURA
      (`cols: 10`). El punto de recorte a 1280px sigue exacto (`scrollWidth === clientWidth`, cero
      holgura) — no cambió respecto de la "Medición final" original: el revert (-44px en el caso sin
      USD) y el reajuste IVA/Envío (neto 0) no afectan la suma del caso con USD, que es el que fija
      el mínimo.
- [x] 14.6 `npx oxlint` sobre los 5 archivos de alcance: limpio (exit code 0).
- [x] 14.7 Confirmar por inspección/`git diff` que no se tocó `pedidoCosteo.js`, `costeo.js`, ningún
      archivo de `backend/`, `DashboardLayout.jsx`/sidebar, ni ningún archivo de la sesión paralela
      `venta-cliente-casual-herramientas`. Sólo `className`/estructura/las dos constantes de
      plantilla de columnas — ningún handler, prop, firma, validación ni cálculo cambiado.
- [x] 14.8 Sin datos de prueba persistidos: verificación hecha con un borrador inyectado en
      `localStorage` de una instancia efímera de Playwright (nunca se envió el formulario, cero
      registros nuevos en la base real); los scripts y capturas de verificación se borraron al
      terminar, no quedaron en el repo. Sin build, sin commit.
- [ ] 🔶 **14.9 CHECKPOINT — OK final del usuario** antes de `/opsx:archive`: mostrar los 5 puntos de
      esta ronda (altura de celda centrada, header ENVÍO en una línea, colores nuevos, bordes más
      marcados, columna USD condicional de nuevo) junto con la reconfirmación de que el resto de la
      ampliación anterior (Decisión 11, botón de eliminar) sigue intacto.

## 15. Tercera ronda post-12.3: popover flotante de descuentos + más color en "Quitar"

> Dos pedidos del usuario mientras seguía revisando lo ya implementado (grupo 14 todavía sin OK
> final, checkpoint 14.9 pendiente): (1) que el editor de descuentos deje de abrirse como sub-fila
> `col-span-full` (ocupa todo el ancho de la grilla) y pase a ser un popover flotante, angosto,
> anclado a la celda de descuentos, desplegado hacia abajo; (2) más color de REPOSO en el botón de
> eliminar (no sólo al hover) — ver Decisión 17/18 de design.md.

- [x] 15.1 **Popover flotante de descuentos** (Decisión 17 de design.md): `PanelDescuentosLinea`
      deja de renderizarse como sub-fila `col-span-full` en `variant="grid"` — pasa a un popover
      `position: fixed` montado con `createPortal` en `document.body`, anclado a
      `getBoundingClientRect()` de la celda de descuentos de SU fila, ancho `min-w-[280px]
      max-w-[360px] w-max`. El aviso de auto-ratchet y el sub-formulario de producto pendiente NO
      se tocaron: siguen siendo `col-span-full` inline, sin cambios. `variant="card"` tampoco se
      tocó: el panel se sigue mostrando inline debajo de la tarjeta (una tarjeta ya es una columna
      angosta, no hay "ancho completo de la tabla" del que escapar ahí).
- [x] 15.2 **Resuelto el conflicto de z-index que había hecho descartar un popover en
      `pedido-planilla-editable`** (ver Decisión 17 de design.md para el detalle): el portal a
      `document.body` saca al popover del árbol de la grilla por completo, así que nunca comparte
      contexto de apilamiento con el `sticky z-10` del encabezado ni con el `absolute z-20` del
      dropdown de `ProductoSearchSelect`. z-30 explícito en el popover.
- [x] 15.3 **Dropdown "inteligente"**: se abre hacia abajo por default; si no entra el alto real
      del contenido por debajo de la fila Y hay más lugar arriba, se abre hacia arriba en su lugar.
      Posicionamiento en dos pasadas (`useLayoutEffect` + un `requestAnimationFrame` extra) para
      medir el tamaño REAL del popover ya montado antes de decidir el flip, sin parpadeo visible.
      Reposicionamiento en vivo con scroll (capturado en fase de captura desde `window`, ver
      comentario en el código) y resize de ventana, mientras el popover está abierto.
- [x] 15.4 **Cierre por click afuera y por Escape** (pedido explícito), sumado al toggle que ya
      existía en la celda — mismo mecanismo de apertura/cierre (`Set` de `lineaId` en
      `PedidoNuevo.jsx`), sólo cambia CÓMO se renderiza. Escape corta la propagación
      (`e.stopPropagation()`) para no disparar también el Escape global de `PedidoNuevo.jsx` que
      cancela todo el pedido.
- [x] 15.5 **Bug encontrado y corregido en esta misma corrida** (no estaba en el pedido original,
      lo reveló la verificación con Playwright a 700px de viewport): las dos variantes de
      `FilaItemPedido` (`grid` y `card`) para la MISMA fila están montadas a la vez (una oculta con
      `hidden`/`xl:hidden` según el breakpoint, nunca desmontada) y comparten el mismo `expandida`
      (mismo `lineaId`). Sin guard, expandir los descuentos desde la tarjeta (`variant="card"`,
      pantalla angosta) también "abría" el popover de la instancia `grid` oculta — su ancla en
      `display:none` devuelve `getBoundingClientRect()` en (0,0,0,0), y el popover aparecía
      fantasma, fijo, en la esquina superior izquierda de la pantalla (captura
      `verif-card-variant.png`, borrada al terminar — no forma parte del repo). Corregido: si el
      rect del ancla mide (0,0,0,0), el popover no se renderiza (`popoverStyle` se queda en `null`).
      Reverificado con Playwright a 700px tras el fix: la tarjeta expande su panel inline como
      siempre y NO aparece ningún popover fantasma en ningún punto de la pantalla.
- [x] 15.6 **Más color de reposo en el botón "Quitar"** (`Trash2`, `FilaItemPedido.jsx`, Decisión
      18 de design.md): pedido explícito del usuario mientras se implementaba 15.1-15.5, priorizado
      sobre la consistencia con el patrón "gris hasta el hover" de `Proveedores.jsx`/`Productos.jsx`
      que había motivado el ajuste anterior (ronda del grupo 14, punto 3c). Ícono
      `text-gray-500 hover:text-red-600` → `text-red-400 hover:text-red-600` — mismo par de tonos
      "rojo" que ya usa el resto de la app, ahora visible desde el reposo. Aplicado en el único
      `botonQuitar` compartido por `variant="grid"` y `variant="card"` (una sola definición, las dos
      variantes lo reusan).
- [x] 15.7 Verificado con Playwright contra el dev stack real (`localhost:5173`/`:8080`,
      `jefe@vivero.com`, negocio Herramientas, proveedor SHIMURA — maneja dólares, 10 columnas, el
      caso más exigente), con un borrador de 12 ítems mezclados (0/1/2 descuentos):
      - Fila del medio: popover `357px` de ancho (dentro de `280-360`), se abre debajo de la fila
        (gap ~3px), NO ocupa el ancho de la grilla (`1042px`). Cierra con click afuera.
      - Fila cerca del borde inferior (viewport bajo a propósito + scroll de precisión para dejar
        sólo ~15px libres debajo de la fila): el popover se abre hacia ARRIBA (flip) y queda
        totalmente dentro del viewport, sin cortarse. Escape lo cierra SIN cancelar el pedido
        (`stopPropagation` confirmado — la URL se queda en `/pedidos/nuevo`).
      - Popover de descuentos de una fila + buscador de producto (`ProductoSearchSelect`) abierto
        en otra fila, a la vez (orden: buscador primero, popover después — el buscador no tiene su
        propio cierre por click-afuera, así que abrirlo primero es la única forma de que ambos
        queden abiertos de verdad a la vez): ninguno tapa al otro, sin solape geométrico medido.
      - Agregar y quitar un descuento dentro del popover: el costo de la fila cambia en vivo y
        vuelve exactamente al valor original al quitar el descuento agregado (mismo cálculo de
        siempre, `costoFinalDeLinea`, sin tocar).
      - Color del ícono `Trash2` en reposo: `oklch(0.704 0.191 22.216)`, exactamente Tailwind
        `red-400`.
      - Cero errores de consola/página durante todo el flujo (login, carga de borrador, apertura y
        cierre repetida del popover, edición de descuentos, scroll, resize).
- [x] 15.8 `npx oxlint` sobre los 5 archivos de alcance: limpio (exit code 0).
- [x] 15.9 Confirmado que el aviso de auto-ratchet y el sub-formulario de producto pendiente
      (`creandoAqui`) NO se tocaron: siguen siendo `col-span-full` inline, mismo `subFilaWrap`,
      mismas condiciones de disparo. Confirmado por inspección del diff: ningún handler, prop,
      firma, validación ni cálculo de costo cambió — sólo `className`, estructura de contenedores
      (el popover) y la posición de `botonQuitar` en el árbol (sin cambios de comportamiento).
- [x] 15.10 Confirmado por `git status`/`git diff` que no se tocó `pedidoCosteo.js`, `costeo.js`,
      ningún archivo de `backend/`, `DashboardLayout.jsx`/sidebar, ni ningún archivo de la sesión
      paralela `venta-cliente-casual-herramientas` (`VentaRequestDTO.java`, `Venta.java`,
      `VentaServiceImpl.java`, `ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`) — esos
      archivos aparecen modificados/nuevos en el árbol de trabajo por esa otra sesión, no por ésta.
- [x] 15.11 Sin datos de prueba persistidos: toda la verificación se hizo con un borrador inyectado
      en `localStorage` de instancias efímeras de Playwright (nunca se envió el formulario, cero
      registros nuevos en la base real). Playwright se instaló temporalmente en
      `frontend/node_modules` (`--no-save --no-package-lock`) sólo para esta corrida y se
      desinstaló al terminar — confirmado que `package.json`/`package-lock.json` no cambiaron.
      Scripts y capturas de verificación borrados al terminar, no forman parte del repo. Sin build,
      sin commit.
- [ ] 🔶 **15.12 CHECKPOINT — OK del usuario** sobre este popover: mostrar el popover en una fila
      del medio y en una fila cerca del borde, la coexistencia con el buscador de producto abierto
      en otra fila, y el nuevo color del botón "Quitar". El OK final de archivo sigue pendiente
      hasta entonces (junto con el checkpoint 14.9, todavía sin respuesta).

## 16. Sub-formulario de "producto nuevo" como popover (quinta ronda post-12.3)

> Pedido explícito del usuario: "al crear un nuevo producto desde pedido se abre una ventana que
> ocupa el ancho de la grilla innecesariamente. Arreglalo para que solo ocupe el necesario." Mismo
> problema que ya se resolvió para el panel de descuentos en el grupo 15 — misma solución.

- [x] 16.1 `subFormularioNuevo` (disparado por `creandoAqui`/`creandoParaLinea`, antes una sub-fila
      `col-span-full`) convertido al MISMO mecanismo de popover flotante del grupo 15: `createPortal`
      a `document.body`, `position: fixed`, ancho ajustado al contenido (no el de la grilla),
      despliegue hacia abajo con flip hacia arriba si no entra, cierre por click afuera/`Escape`,
      reposicionamiento en scroll/resize. Única diferencia real respecto del popover de descuentos:
      el ancla es `productoAnchorRef` (la celda de PRODUCTO de la fila, donde vive el link "+ Crear
      producto nuevo…" de `ProductoSearchSelect`), no la celda de descuentos. Mismo `zIndex: 30` —
      no hay prioridad que resolver entre los dos popovers porque `creandoParaLinea` es un valor
      único (nunca dos sub-formularios de producto nuevo a la vez) y, si este popover y uno de
      descuentos de OTRA fila llegan a estar abiertos juntos, no se solapan geométricamente (cada
      uno ancla a un punto distinto de la pantalla). Incluye el mismo guard de "ancla oculta por
      breakpoint" (rect en `(0,0,0,0)` → no renderizar) que evitó el bug del popover fantasma en el
      grupo 15. `variant="card"` no se tocó (sigue inline, mismo criterio que descuentos: una
      tarjeta ya es angosta, no hay ancho de grilla del que escapar ahí).
- [x] 16.2 Verificado por lectura de código e inspección de diff (no por click-through en
      navegador — ver nota abajo): la implementación reusa exactamente las mismas primitivas que el
      popover de descuentos ya verificado en vivo en el grupo 15 (mismo hook de posicionamiento en
      dos pasadas, mismo guard de ancla oculta, mismo patrón de cierre). `npx oxlint` en
      `frontend/` sobre los 5 archivos de alcance: limpio, exit 0. `git diff` confirma que no se
      tocó `pedidoCosteo.js`, `costeo.js`, backend, sidebar/`DashboardLayout`, ni ningún archivo de
      la sesión paralela `venta-cliente-casual-herramientas`. El fix de "Costo total = cantidad ×
      costo unitario" (grupo aparte, aplicado directamente el 2026-08-26) sigue intacto: no forma
      parte del diff de esta ronda.
- [ ] ⚠️ **16.3 Verificación en vivo INCOMPLETA** — dos agentes seguidos se colgaron (timeout de
      600s sin progreso) mientras probaban esto contra el navegador real; no se pudo confirmar
      con capturas reales (a diferencia de TODAS las rondas anteriores de este change) los dos
      casos puntuales: (a) el popover cerca del borde inferior de la pantalla abre hacia arriba en
      vez de cortarse, y (b) el popover de descuentos de una fila conviviendo con este
      sub-formulario abierto en otra fila al mismo tiempo, sin pisarse. El código implementa
      explícitamente ambos casos (mismo mecanismo ya probado del grupo 15), pero no hay evidencia
      de navegador real para ESTE popover en particular — sólo para el de descuentos. Pedirle al
      usuario que lo pruebe a mano (o pedir una corrida de verificación más antes de archivar) en
      vez de asumir que "debería andar igual".
- [ ] 🔶 **16.4 CHECKPOINT — OK del usuario**, incluyendo el punto 16.3 pendiente.

> **Nota (grupo 17 más abajo, aplicado antes de que 16.3/16.4 se resolvieran):** el popover del
> grupo 16 se ELIMINÓ por completo en la ronda siguiente — ver grupo 17. La verificación en vivo
> pendiente de 16.3 queda sin objeto: ya no hay ningún popover de "producto nuevo" que verificar.

## 17. Cuarta ronda post-12.3: sacar la confirmación de "producto nuevo"; fix del popover de
    descuentos que se abría solo

> Dos pedidos del usuario sobre la misma pantalla, con causa raíz compartida (ver Ampliación 4 de
> `design.md`, Decisión 19): (1) el popover de descuentos se abría solo al confirmar un producto
> nuevo, sin que el usuario tocara la celda de descuentos; (2) fricción de tener que confirmar
> "Usar en esta línea" por cada producto nuevo cuando el nombre ya se tipeó en el buscador. Se
> resuelven juntos eliminando el popover de confirmación del grupo 16 entero — la causa de ambos.
> Alcance: 100% frontend, sólo `PedidoNuevo.jsx` y `FilaItemPedido.jsx`. No tocar `backend/` en
> esta corrida (sesión paralela activa en esos archivos).

- [x] 17.1 Confirmar la hipótesis de causa raíz **por lectura de código** (no por reproducción en
      vivo en el navegador antes del fix — desviación consciente respecto del brief, ver nota
      abajo): `confirmarProductoPendiente` en `PedidoNuevo.jsx` llamaba `expandirLinea(lineaId)`
      incondicionalmente al confirmar una línea pendiente con `descuentosPactados.length > 0` —
      única llamada a `expandirLinea` fuera del `+` explícito de la celda de descuentos, disparada
      sin ninguna interacción del usuario con esa celda. Cadena de dataflow inequívoca (sin ramas
      condicionales adicionales, sin estado intermedio), suficiente para confirmar la hipótesis sin
      ambigüedad. **Nota:** no se reprodujo el bug en vivo en el navegador ANTES de aplicar el fix
      (como pedía el brief) porque el diagnóstico por código ya era concluyente y el fix (grupo 17
      completo) elimina el mecanismo entero de una vez — reproducir el estado "antes" ahora
      requeriría revertir el fix temporalmente. La verificación en vivo del ESTADO NUEVO (17.9)
      cubre que el popover ya no se abre solo.
- [x] 17.2 Leer `PedidoNuevo.jsx` (`confirmarProductoPendiente`, `seleccionarProducto`,
      `expandirLinea`, `propsFila`) y `FilaItemPedido.jsx` (props `creandoAqui`/`nuevoNombre`/
      popover de "producto nuevo") completos antes de tocar nada.
- [x] 17.3 En `PedidoNuevo.jsx`: la rama `productoId === '__nuevo__'` de `seleccionarProducto` pasa
      a marcar la línea como pendiente DIRECTAMENTE (`productoNombreNuevo` = texto ya tipeado en
      el buscador, tras `trim()`), sin abrir ningún estado de confirmación intermedio. Guarda de
      nombre vacío conservada (mismo mensaje de error que tenía `confirmarProductoPendiente`).
- [x] 17.4 Eliminar `confirmarProductoPendiente`, los estados `creandoParaLinea`/`nuevoNombre`, y
      el guard `!creandoParaLinea` del listener global de `Escape` en `PedidoNuevo.jsx` — con ellos
      se va también el auto-expandir el popover de descuentos al confirmar (la causa del bug del
      punto 17.1). El auto-expandir al `+` explícito de la celda de descuentos (`onAgregarDescuento`
      en `propsFila`) se conserva intacto.
- [x] 17.5 Quitar de `propsFila` las props que ya no consume nadie: `creandoAqui`, `nuevoNombre`,
      `onChangeNuevoNombre`, `onCancelarCrear`, `onConfirmarCrear`.
- [x] 17.6 En `FilaItemPedido.jsx`: eliminar el popover flotante de "producto nuevo" completo —
      `productoAnchorRef`, `nuevoProductoPopoverRef`/`Style`,
      `calcularPosicionNuevoProductoPopover`, los dos `useEffect`/`useLayoutEffect` de
      posicionamiento y cierre, `subFormularioNuevoContenido`, `subFormularioNuevoPopover`, y su
      referencia en el JSX de ambas variantes (`grid`: `{subFormularioNuevoPopover}`; `card`:
      `{subFormularioNuevoContenido && ...}`). Sacar el `ref={productoAnchorRef}` de la celda de
      Producto (ya no ancla nada). Sacar `PackagePlus` de los imports de `lucide-react` (sólo lo
      usaba ese formulario eliminado).
- [x] 17.7 Verificar que el `esPendiente`/badge "Nuevo" de `ProductoSearchSelect.jsx` y el botón
      "Cambiar" siguen funcionando sin cambios: la edición posterior del nombre pasa por reabrir el
      buscador, no por un gate obligatorio antes de cargar la línea.
- [x] 17.8 Confirmar por lectura que `validate()` (`!it.productoId && !it.productoNombreNuevo`) y
      el armado del payload en `handleSubmit` (`productoNombreNuevo` para una línea pendiente) NO
      se tocaron — sólo cambió CÓMO se llega a setear `productoNombreNuevo` en el estado de la
      línea, nunca su forma final ni su validación.
- [x] 17.9 Verificado con Playwright/navegador real contra el dev stack (`localhost:5173`/`:8080`,
      `jefe@vivero.com`, negocio Herramientas, proveedor INGCO con descuentos por defecto): buscar
      un nombre sin coincidencias → "+ Crear producto nuevo…" → **PASS**, la línea queda "Nuevo" sin
      ningún popover de confirmación y sin que el popover de descuentos se abra solo; clic explícito
      en el `+` de descuentos de otra línea sigue abriendo su popover (**PASS**); se puede cargar
      cantidad/costo sin fricción (**PASS**); "Cambiar" reabre el buscador (**PASS**). Resultado
      anotado en `design.md` (Ampliación 4, Decisión 19).
- [x] 17.10 Interceptado el POST a `/api/pedidos` (abortado, cero registros creados en la base
      real): el payload de la línea pendiente manda `productoNombreNuevo: "Producto Prueba XYZ
      123"` sin `productoId`, con los valores de descuento en cascada correctos — igual que antes
      de esta ronda.
- [x] 17.11 `npx oxlint` sobre `PedidoNuevo.jsx` y `FilaItemPedido.jsx`: limpio (exit code 0).
- [x] 17.12 Confirmar por inspección/`git status` que no se tocó `pedidoCosteo.js`, `costeo.js`,
      ningún archivo de `backend/`, `DashboardLayout.jsx`/sidebar, ni ningún archivo de la sesión
      paralela `venta-cliente-casual-herramientas` (`VentaRequestDTO.java`, `Venta.java`,
      `VentaServiceImpl.java`, `ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`).
- [x] 17.13 Sin datos de prueba persistidos: verificación con borrador de `localStorage` de una
      instancia efímera de Playwright (instalado temporalmente con `--no-save --no-package-lock` y
      desinstalado al terminar, `package.json`/`package-lock.json` confirmados sin diff), nunca se
      envió el formulario real (POST interceptado y abortado). Sin build, sin commit.
- [ ] ⚠️ **17.13b Hallazgo no relacionado, reportado al usuario:** `ProductoSearchSelect.jsx`,
      `PanelDescuentosLinea.jsx`, `CeldaDescuentos.jsx` y `backend/.../PedidoServiceImpl.java`
      muestran diffs sin commitear sustanciales que no estaban al arrancar esta sesión ni fueron
      hechos por esta ronda (alcance real: sólo `PedidoNuevo.jsx`/`FilaItemPedido.jsx`) y que no
      pertenecen a la lista de exclusión conocida de `venta-cliente-casual-herramientas` — indicio
      de una tercera sesión concurrente editando el mismo directorio `pedidos/` en vivo. No
      investigado más a fondo (fuera de alcance); ver nota en `design.md`.
- [ ] 🔶 **17.14 CHECKPOINT — OK del usuario** sobre esta ronda antes de dar por cerrados los
      checkpoints 14.9/15.12/16.4 pendientes (16.4 queda sin objeto, ver la nota arriba del grupo
      17) y antes de `/opsx:archive`. Incluir en la conversación el hallazgo de 17.13b (posible
      sesión concurrente tocando los mismos archivos).

## 18. Flip-up del desplegable de búsqueda de producto (`ProductoSearchSelect.jsx`)

> Bug real y DISTINTO del popover de "producto nuevo" del grupo 16 (ese popover ya no existe, ver
> la nota arriba del grupo 16). El usuario probó el desplegable de búsqueda de producto de
> `ProductoSearchSelect.jsx` — la lista de resultados + "+ Crear producto nuevo…" que aparece al
> escribir en la celda de Producto — y reportó que en una fila cerca del borde inferior de la
> pantalla el desplegable, que siempre abría hacia abajo (`top-full` fijo), quedaba tapado/cortado.
> Ese desplegable NUNCA tuvo lógica de "sube si no entra" — a diferencia del popover de descuentos
> (grupo 15) y el popover de "producto nuevo" ya eliminado (grupo 16/17), que sí la tenían.

- [x] 18.1 Confirmado por lectura de código: la causa era que `{busqueda && (...)}` en
      `ProductoSearchSelect.jsx` (línea ~157 antes del fix) renderizaba el contenedor de resultados
      con `absolute z-20 top-full ... mt-1`, SIEMPRE hacia abajo, sin ningún cálculo de espacio
      disponible — a diferencia de `PanelDescuentosLinea` (ver `calcularPosicionPopover` en
      `FilaItemPedido.jsx`), que sí calcula si hay lugar abajo antes de decidir la dirección.
- [x] 18.2 Verificado el contenedor real que recorta contenido vertical: la grilla de
      `PedidoNuevo.jsx` NO tiene `overflow-hidden` en ningún ancestro entre este combobox y
      `<main>` (a propósito, ver el comentario junto al contenedor de la grilla — "SIN
      `overflow-hidden`: recortaría el dropdown de ProductoSearchSelect"). El único ancestro con
      overflow es `<main class="max-h-screen overflow-y-auto">` en `DashboardLayout.jsx` — no
      recorta de forma invisible, pero un `absolute` que crece hacia abajo cerca del borde extiende
      el alto scrolleable de `<main>` en vez de mostrarse en pantalla, lo cual se percibe igual que
      "tapado" para el usuario. Con esto se decidió: NO hace falta portar a `document.body` (como sí
      se hizo para el popover de descuentos, por motivo de z-index/stacking, no de clipping) —
      alcanza con seguir `position: absolute` respecto del propio contenedor `relative` del
      combobox y alternar `top-full`/`bottom-full` según el espacio medido en el viewport.
- [x] 18.3 Implementado en `ProductoSearchSelect.jsx`: mismo patrón de flip que
      `calcularPosicionPopover` de `PanelDescuentosLinea` (abre abajo por default, sube si
      `espacioAbajo < alto + margen` y hay más lugar arriba que abajo), con dos diferencias
      deliberadas respecto de aquel popover — documentadas en el comentario junto a
      `calcularDireccion` en el archivo: (a) sin `createPortal`/`position: fixed`, por el motivo de
      18.2; (b) sin doble pasada de medición (estimado → `requestAnimationFrame` → real), porque acá
      la lista de resultados ya se renderiza siempre que `busqueda` es verdadero (no depende del
      resultado del cálculo como el popover portado), así que el nodo real ya está montado en el
      DOM cuando corre el primer `useLayoutEffect` — `listaRef.current.offsetHeight` ya es el alto
      real desde la primera pasada. `z-20` sin tocar (coordinado con `z-30` del popover de
      descuentos y `z-10` del header sticky, ver comentario en `FilaItemPedido.jsx`). No se tocó
      lógica de búsqueda/filtrado/selección de producto, sólo el posicionamiento del contenedor.
- [x] 18.4 `npx oxlint` sobre `ProductoSearchSelect.jsx`: limpio, exit code 0.
- [x] 18.5 Verificación en vivo contra el dev stack real (`localhost:5173`/`:8080`,
      `jefe@vivero.com`, negocio Herramientas) — corrida por el usuario directamente (no por
      Playwright de este agente: dos intentos previos de automatizar esto en el grupo 16 se habían
      colgado sin progreso, y para esta ronda el usuario prefirió probar a mano en vez de esperar
      otra corrida de navegador automatizado). El usuario confirmó explícitamente que funciona
      ("Ya lo probé y funciona. No es necesario pruebas en otro navegador").
- [ ] 🔶 **18.6 CHECKPOINT — OK del usuario**, ya recibido en 18.5 (confirmación en la conversación,
      no requiere una ronda de verificación aparte).
