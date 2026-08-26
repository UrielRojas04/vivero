## Context

`frontend/src/pages/PedidoNuevo.jsx` (1.212 líneas) es la pantalla donde el dueño arma los pedidos a proveedores de la unidad Herramientas. Nació como modal (`PedidoForm.jsx`), pasó a página completa el 2026-08-20, y desde entonces acumuló cuatro capas de features: moneda por línea + cotización del pedido (`config-costeo-por-proveedor`), perfil de costeo por defecto del proveedor, lista de descuentos con nombre por línea, persistencia del borrador en `localStorage`, y —el 2026-08-25, fuera de OpenSpec— la mini-tabla `TablaCosteoProductoExistente` que hizo editables IVA%/envío% también para productos ya existentes.

Cada capa se agregó como un bloque vertical más debajo de la línea. El resultado es que una sola línea de pedido ocupa hoy entre 3 y 6 bandas horizontales apiladas (fila de producto, fila de numéricos, tabla de costeo, lista de descuentos, vista previa, sub-formulario de producto nuevo), dentro de un contenedor `max-w-4xl` centrado que deja la mitad de la pantalla vacía. Comparar dos ítems entre sí es imposible: no hay columnas, cada dato está en un lugar distinto según el tipo de línea.

Sobre eso hay un bug de confianza: el total del header (`{items.length} ítems · Total: $X`, línea 880) y el del footer (línea 1187) se calculan en el `reduce` de la línea 652 como `cantidad × costoUnitarioPactado`, con la única sofisticación de multiplicar por la cotización si la línea es USD. No pasan por `calcularCosto`. Mientras tanto, cada fila **sí** muestra su costo real: `TablaCosteoProductoExistente` (línea 339) y la vista previa de líneas pendientes (línea 1120) ambas llaman a `calcularCosto`. El resultado está en `img/pedido ejemplo.png`: la fila dice "Costo final: $3.811,50" y los dos totales dicen "$3.000".

La causa raíz es estructural, no un typo: **existen tres cálculos de costo por línea en el mismo archivo**, dos correctos y uno crudo, sin nada que los obligue a coincidir. Cualquier corrección que no unifique esos tres puntos vuelve a divergir en el próximo cambio.

Restricción de contexto: el motor de costeo (`frontend/src/utils/costeo.js`, espejo exacto de `CostoCalculator.java`) es correcto y está fuera de discusión. El backend calcula bien al confirmar la recepción. Este change es **frontend puro**.

## Goals / Non-Goals

**Goals:**

- Que el total del header y el del footer muestren el costo real del pedido, imposibilitando estructuralmente que vuelvan a divergir del costo por fila.
- Que la carga de ítems se lea como una planilla: una fila por ítem, un dato por columna, columnas alineadas entre todas las filas independientemente del tipo de línea.
- Aprovechar el ancho completo de la pantalla.
- Impedir cargar ítems antes de elegir proveedor.
- Preservar sin regresión: borrador en `localStorage`, distinción producto existente vs pendiente, errores de validación por línea, y el payload exacto que se manda al backend.

**Non-Goals:**

- No se toca `frontend/src/utils/costeo.js` ni nada del backend.
- No se reabre ninguna decisión de costeo: cascada de descuentos, IVA sobre neto, envío en cadena sobre neto+IVA, conversión USD, auto-ratchet de costo y auto-ajuste de IVA/envío a la ficha quedan exactamente como están.
- ~~No se hacen editables los descuentos de un producto **existente** desde el pedido~~ — **SUPERADO el 2026-08-25** por una segunda ampliación (ver "Ampliación 2026-08-25 (descuentos editables)" al final de este documento): la reapertura original de esa misma fecha alcanzó sólo a IVA/envío, pero horas después el dueño del negocio confirmó el mismo criterio para descuentos. Los descuentos de una línea existente pasan de solo lectura a editables, mismo mecanismo que ya tenían las líneas pendientes.
- No se agrega confirmación al cambiar de proveedor con ítems ya cargados (hoy los pisa en silencio; queda igual — ver Riesgos).
- No se cambia el flujo de recepción (`RecepcionPedidoModal.jsx`) ni el listado de pedidos.
- No se introduce librería de tablas ni de virtualización.

## Decisions

### Decisión 1 — Un único cálculo de costo por línea, extraído a función pura

**Qué:** se crea `frontend/src/utils/pedidoCosteo.js` con dos funciones puras:

```js
porcentajesDescuentoDeLinea(linea, productos) → number[]
costoFinalDeLinea(linea, productos, cotizacionDolar) → number   // 0 si no hay costo cargado
```

`costoFinalDeLinea` resuelve internamente el tipo de línea y delega en `calcularCosto`. **Los tres puntos que hoy calculan por separado —fila de producto existente, vista previa de línea pendiente y el total— pasan a llamar a esta misma función.** El total queda:

```js
const total = items.reduce((acc, it) =>
  acc + (parseFloat(it.cantidadPedida) || 0) * costoFinalDeLinea(it, productos, cotizacionDolar), 0);
```

**Por qué:** el bug no es que el total esté mal escrito, es que hay tres fórmulas donde debería haber una. Corregir sólo el `reduce` deja el mismo terreno para la próxima divergencia. Al ser pura y estar fuera del componente, además es la única parte de este change verificable sin navegador.

**Detalle que no es obvio y hay que respetar:** la fuente de los descuentos **depende del tipo de línea**.
- Línea *pendiente* (`!productoId && productoNombreNuevo`) → `linea.descuentosPactados` (los que el usuario editó en la fila).
- Línea de *producto existente* (`productoId`) → `producto.descuentos` de la ficha en el catálogo, **no** `descuentosPactados` (que para esas líneas queda con los defaults del proveedor y no se aplica).

Confundir estas dos fuentes es la forma más fácil de romper este change: el total daría un número distinto al de la fila, que es exactamente el bug que venimos a arreglar. `TablaCosteoProductoExistente` ya hace lo correcto hoy (línea 333); ese criterio se conserva tal cual.

**Redondeo:** el total suma `costoFinal` (ya redondeado a 2 decimales) × cantidad, no el costo a precisión completa. Alternativa considerada: acumular a escala intermedia 6 y redondear al final. Rechazada porque el backend congela en `MovimientoStock` el costo unitario redondeado a 2 decimales, y el usuario suma mentalmente lo que ve en cada fila: el total tiene que cerrar con las filas, no con una precisión que nadie ve.

**Casos borde preservados:** línea sin costo cargado aporta 0. Línea USD sin cotización aporta 0 (nunca suma dólares como si fueran pesos) — comportamiento actual, se mantiene.

### Decisión 2 — CSS Grid con plantilla de columnas compartida, no `<table>`

**Qué:** la grilla se construye con `display: grid` y una plantilla de columnas definida **una sola vez** como constante de módulo, aplicada tanto a la fila de encabezados como a cada fila de ítem:

```js
// columnas: producto · cant · [USD] · costo unit. · descuentos · IVA% · envío% · total · ✕
const GRID_COLS = 'grid-cols-[minmax(200px,2.2fr)_84px_110px_minmax(170px,1.1fr)_76px_76px_120px_40px]';
const GRID_COLS_USD = 'grid-cols-[minmax(200px,2.2fr)_84px_56px_110px_minmax(170px,1.1fr)_76px_76px_120px_40px]';
```

**Por qué Grid y no `<table>`:** las filas necesitan una sub-fila expandible de ancho completo (Decisión 4) y un colapso a tarjeta apilada en pantallas angostas (Decisión 6). Con `<table>` eso obliga a `colspan` y a romper la semántica de tabla en mobile; con Grid, la sub-fila es un hijo `col-span-full` y el colapso es cambiar la plantilla en el breakpoint. La alineación entre filas —el único motivo real para querer `<table>`— se consigue igual porque **todas las filas comparten la misma constante**.

**Por qué la columna USD es condicional a nivel grilla, no a nivel fila:** el checkbox USD sólo tiene sentido si `proveedorSeleccionado.manejaDolares`. Se decide por **proveedor**, y el proveedor es uno solo para todo el pedido — así que la columna existe o no existe para la grilla entera. Nunca hay filas con distinta cantidad de columnas.

### Decisión 3 — Se levanta el `max-w-4xl`; ancho completo con piso de columnas

**Qué:** el contenedor de la página pasa de `max-w-4xl mx-auto` a `w-full` (con el padding del layout). Las columnas no crecen indefinidamente: `producto` y `descuentos` son las únicas flexibles (`fr`), el resto tiene ancho fijo en `px`.

**Por qué:** el pedido explícito fue "aprovechemos todo el espacio posible". Alternativa considerada: subir a `max-w-7xl`. Rechazada: en el monitor del negocio sigue dejando franjas muertas, y con 9 columnas cada píxel de la columna de producto se nota (los nombres tipo "escalera shimura aluminio 4.70m" hoy se truncan).

**Qué se conserva:** el header de la página y los bloques de proveedor/observaciones/cotización **no** se estiran a ancho completo — quedan en un `max-w-4xl` propio. Sólo la grilla de ítems usa todo el ancho. Estirar dos campos de formulario a 2.000px sería peor, no mejor.

### Decisión 4 — Los descuentos viven en una celda-resumen con edición en sub-fila expandible

**Qué:** la celda de descuentos muestra siempre un resumen compacto de altura fija:

- Sin descuentos: `—` (y, si la línea es pendiente, un `+` para agregar).
- Con descuentos: chips truncados `Proveedor 10%` `Volumen 5%` y, cuando la cascada da algo, el efectivo total `(-14,5%)`.

Al hacer clic en la celda (o en el `+`) se despliega **una sub-fila `col-span-full` debajo de esa fila**, que contiene el editor completo de descuentos que hoy vive inline (lista de `{nombre, %}` con agregar/quitar, el botón "Recargar del proveedor", y los errores de validación). El estado de expansión es un `Set` de `lineaId` en el componente padre; se puede tener más de una fila abierta.

**Por qué:** es la decisión de layout más difícil del change. Si la lista editable vive dentro de la celda, una fila con tres descuentos mide el triple que las demás y la grilla deja de leerse como planilla — que es justo el problema que venimos a resolver. Alternativas consideradas:

- *Popover flotante sobre la celda*: descartado por z-index contra el dropdown de `ProductoSearchSelect`, manejo de foco y cierre por clic afuera — mucha complejidad accidental para una pantalla de escritorio.
- *Modal por línea*: descartado; el jefe viene de un modal y pidió salir de ahí.
- *Columna de altura variable (estado actual)*: es el problema, no la solución.

La sub-fila expandible es lo que hace Excel al expandir una fila agrupada: el eje de columnas nunca se mueve.

**Para líneas de producto existente** la celda mostraba originalmente los chips de `producto.descuentos` en solo lectura, **sin** `+` y **sin** expansión editable, con un `title` que aclaraba que se editaban en la ficha del producto. **Superado el 2026-08-25** (ver Ampliación al final del documento): ahora es editable igual que una línea pendiente, con los chips saliendo de `linea.descuentosPactados` (precargada con los descuentos actuales de la ficha al elegir el producto) en vez de `producto.descuentos`. El prop `soloLectura` de `CeldaDescuentos` se eliminó del componente — dejó de tener sentido, ambos tipos de línea usan la misma rama de render.

### Decisión 5 — El sub-formulario de producto pendiente reusa el mismo mecanismo de sub-fila

**Qué:** el bloque `creandoParaLinea === it.lineaId` (captura del nombre del producto nuevo) deja de ser un bloque suelto debajo de la línea y pasa a renderizarse como sub-fila `col-span-full`, igual que el editor de descuentos.

**Por qué:** un solo mecanismo de expansión para todo lo que no entra en una fila. Menos conceptos visuales, y garantiza que ningún panel auxiliar desalinee las columnas.

### Decisión 6 — Colapso a tarjetas apiladas por debajo de `xl`, sin scroll horizontal

**Qué:** por debajo de `xl` (1280px) la grilla no scrollea horizontalmente: cada ítem se renderiza como tarjeta apilada de ancho completo con pares `etiqueta: valor`, que es esencialmente el layout actual. La fila de encabezados de columnas se oculta (`hidden xl:grid`).

**Por qué `xl` y no `lg` (ajustado durante la implementación del grupo 3, verificado con Playwright contra el dev stack real — no era evidente sin medirlo):** el plan original de este documento proponía `lg` (1024px). Al implementarlo se detectó que el shell de la app (`DashboardLayout.jsx`, fuera del alcance de este change) envuelve **toda** página en un contenedor `overflow-x-hidden` fijo (sidebar de 256px + padding). Con la columna USD activa, el ancho mínimo real de la grilla (9 columnas: ~1028px de columnas + gaps) no entra en el área de contenido disponible entre 1024px y ~1340px de viewport — así que a `lg` la grilla no desbordaba con scrollbar, **se recortaba en silencio**: IVA %, Envío %, Costo total y hasta el botón de quitar quedaban invisibles e inalcanzables, sin ninguna señal para el usuario. Es exactamente el riesgo "Densidad visual en 1024–1280px" que ya estaba anotado en la sección de Riesgos de este documento, con la salida que el propio documento pre-autorizaba: bajar el breakpoint de colapso, nunca agregar scroll horizontal. Verificado tras el cambio: sin recorte en 1024px/1152px (tarjetas) ni en 1366px+ (grilla completa); queda una ventana angosta y residual entre ~1280–1340px (un ancho de viewport exacto poco común en la práctica — la mayoría de las laptops reales parten de 1366px) donde la grilla activa (`xl` es 1280px) todavía recorta unos ~60px del borde derecho. Se documenta acá para que la próxima persona que retome el change lo tenga presente; no se persiguió más allá porque angostar columnas fijas es una decisión de densidad que corresponde al checkpoint 3.14, no a resolver en silencio.

**Por qué no `md`:** nueve columnas no entran legibles en 768px. Y **por qué no `overflow-x-auto`:** un contenedor con scroll horizontal recorta el dropdown absoluto de `ProductoSearchSelect` y el panel de descuentos expandido. Evitar el scroll horizontal elimina esa clase entera de bugs de recorte, en vez de pelearla con `z-index`. Esto además respeta la convención ya establecida del spec `ui-responsive` (tabla en anchos grandes, tarjetas apiladas abajo).

**Consecuencia a respetar:** la celda de producto lleva `relative` y el dropdown `z-20`, y **ningún ancestro de la fila puede tener `overflow-hidden`**.

### Decisión 7 — Gate de proveedor: dos estados distintos según haya ítems o no

**Qué:** mientras `!proveedorId`:

- **Sin ítems cargados** (caso normal, entrada limpia): la tarjeta de ítems muestra un estado vacío — icono, "Elegí un proveedor para empezar a cargar ítems", y el subtexto de por qué (el IVA, el envío y los descuentos por defecto salen del proveedor). El botón "Agregar ítem" está `disabled` con `title` explicativo. No se renderiza ninguna fila.
- **Con ítems cargados** (sólo posible al restaurar un borrador viejo guardado antes de este cambio): las filas se renderizan **visibles pero con todos sus inputs `disabled`**, bajo un banner ámbar "Elegí un proveedor para seguir editando estos ítems". **No se descartan.**

Además, el estado inicial de `items` deja de ser `[lineaVacia()]` y pasa a `[]` cuando no hay proveedor; la primera fila se crea al elegir proveedor.

**Por qué la distinción:** borrar en silencio ítems que el usuario ya cargó es inaceptable, y es un caso real: los borradores en `localStorage` existentes fueron escritos sin este gate. Alternativa considerada: descartar el borrador si no tiene proveedor. Rechazada — pérdida de trabajo silenciosa. Alternativa considerada: ocultar la tarjeta de ítems entera hasta que haya proveedor. Rechazada: el usuario pierde la referencia de dónde está parado en la página.

**Interacción con la precarga del perfil de costeo:** el `useEffect` que precarga los defaults del proveedor depende de `[proveedorId]` y está guardado por `primerRenderProveedor` (línea 473). Con un borrador sin proveedor, ese guard se consume en el montaje y la transición `'' → X` **sí** dispara la precarga, pisando IVA/envío/descuentos de las filas restauradas. Eso es lo correcto en este caso: esos valores nunca vinieron de un proveedor. Hay que verificarlo explícitamente al implementar, no asumirlo.

**Bug encontrado y corregido durante el grupo 6 (tarea 6.1, verificación de F5, no era evidente sin probarlo contra el dev stack real):** el guard original (`primerRenderProveedor`, un booleano `useRef(true)` consumido una sola vez) se rompe bajo `React.StrictMode` (activo en `main.jsx`) — en desarrollo, React invoca cada efecto de montaje DOS veces para detectar código no idempotente, y el `.current` del ref sobrevive esa doble invocación (es el mismo fiber, no un remount real). La primera invocación consumía la guarda (`true → false`); la segunda, inmediata y antes de que `['proveedores']` resolviera, pasaba de largo y ejecutaba el reset de verdad con `proveedorSeleccionado` todavía en `null` — pisando cada F5 con un borrador restaurado, IVA/envío/descuentos quedaban en blanco (reproducido con Playwright contra `localhost:5173`: `guardarBorrador` conservaba los valores correctos, pero el primer render post-F5 ya los mostraba vacíos). Reemplazado por un ref que guarda el `proveedorId` ANTERIOR (inicializado con el valor del primer render, restaurado o no) en vez de un flag "corrido/no corrido": ambas invocaciones de StrictMode ven el mismo `proveedorId` sin cambios reales y saltean por igual, sin importar cuántas veces React decida invocar el efecto de montaje. Ver `proveedorIdAnteriorRef` en `PedidoNuevo.jsx`.

### Decisión 8 — Extracción de sub-componentes y retiro de `TablaCosteoProductoExistente`

**Qué:**

| Destino | Contenido |
|---|---|
| `frontend/src/utils/pedidoCosteo.js` | `costoFinalDeLinea`, `porcentajesDescuentoDeLinea` (puras) |
| `frontend/src/components/pedidos/ProductoSearchSelect.jsx` | movido tal cual desde `PedidoNuevo.jsx`, misma API |
| `frontend/src/components/pedidos/FilaItemPedido.jsx` | una fila de la grilla + sus sub-filas expandibles |
| `frontend/src/components/pedidos/CeldaDescuentos.jsx` | resumen compacto (chips + efectivo) para ambos tipos de línea |
| `frontend/src/components/pedidos/PanelDescuentosLinea.jsx` | editor completo dentro de la sub-fila |
| — eliminado — | `TablaCosteoProductoExistente` |

`TablaCosteoProductoExistente` se elimina porque sus cuatro columnas (Costo unit. · IVA % · Envío % · Costo final) **son** ahora columnas de la grilla principal. Su aviso de auto-ratchet ("este costo es mayor al de la ficha…") no se pierde: se conserva como texto al pie de la fila, con el mismo criterio de disparo (`costoBaseConvertido > producto.costoProducto`).

`PedidoNuevo.jsx` conserva **todo** el estado y los handlers (`actualizarLinea`, `seleccionarProducto`, `agregarLinea`, `eliminarLinea`, `toggleMonedaLinea`, `agregarDescuentoLinea`, `quitarDescuentoLinea`, `actualizarDescuentoLinea`, `recargarDefaultsProveedorLinea`, `confirmarProductoPendiente`, `validate`, `handleSubmit`) y los pasa por props. **Los sub-componentes no tienen estado del pedido**, sólo estado de UI local. Esto mantiene intactos el `useEffect` del borrador y el armado del payload.

**Por qué en `components/pedidos/`:** es el primer subdirectorio de `components/`, que hoy es plano con 24 archivos. Se justifica: son cuatro componentes que sólo existen para esta pantalla y no se reusan en ningún otro lado. Alternativa considerada: dejarlos en `PedidoNuevo.jsx`. Rechazada: el archivo ya tiene 1.212 líneas.

### Decisión 9 — La cotización del dólar no es columna

**Qué:** la cotización sigue siendo un campo a nivel pedido, en el bloque de cabecera, visible sólo si hay alguna línea en USD (comportamiento actual). En la grilla, el marcador de moneda es el checkbox USD de la fila, y la celda de **costo total** de una fila USD muestra el importe **ya convertido a pesos** más una nota chica con el original (`US$ 250`).

**Por qué:** la cotización es un dato del pedido, no del ítem — replicarla por fila sugeriría que se puede tener una cotización distinta por línea, que es falso y contradice el modelo del backend. Que el total de fila esté en pesos es lo que hace que la columna sume verticalmente, que es la razón de ser de una planilla.

## Risks / Trade-offs

- **[El total cambia de valor de un día para el otro]** El jefe va a ver que el mismo pedido que ayer decía $3.000 hoy dice $3.811,50 y puede leerlo como un aumento. → Mitigación: el desglose queda visible en la propia fila (costo unit. → IVA% → envío% → total), de modo que el número nuevo es auditable a simple vista. Vale la pena mencionárselo en el checkpoint antes de dar el change por cerrado.

- **[Regresión silenciosa en el payload al backend]** La reescritura del render toca la pantalla completa; si un campo deja de actualizarse, el pedido se guarda mal sin error visible. → Mitigación: `handleSubmit`, `validate` y la forma de `items` quedan **intactos** por diseño (Decisión 8); ningún sub-componente escribe estado del pedido. Verificación obligatoria antes de cerrar: crear un pedido de cada tipo y comparar el payload contra el actual.

- **[Regresión en el borrador de `localStorage`]** Si `items` pasa a `[]` inicial y la restauración no se ajusta, se pierde el pedido en curso al recargar. → Mitigación: tarea dedicada + verificación explícita de los tres casos (borrador con proveedor, borrador sin proveedor con ítems, sin borrador).

- **[No hay forma de testear esto automáticamente]** El frontend **no tiene test runner** (`frontend/package.json` sólo define `dev`/`build`/`lint` con `oxlint`; no hay vitest ni ningún `*.test.*` en el repo). El Strict TDD Mode del proyecto no es aplicable acá por falta de runner, no por decisión. → Mitigación: la lógica que realmente puede fallar en silencio se aisló en funciones puras (`pedidoCosteo.js`) justamente para que sean testeables el día que exista runner. Ver Open Questions.

- **[Trade-off: la sub-fila expandible agrega un clic]** Editar un descuento ahora requiere abrir la fila, cuando antes los inputs estaban a la vista. → Aceptado: es el precio de que las columnas queden alineadas, que es el pedido explícito. Se compensa auto-expandiendo la sub-fila al presionar `+` (agregar descuento) y al crear una línea pendiente que ya trae descuentos por defecto del proveedor.

- **[Cambiar de proveedor sigue pisando en silencio los ítems cargados]** Comportamiento preexistente (`useEffect` línea 473), fuera del alcance de este change. → Se documenta acá para que no se lea como una regresión introducida. Si molesta, es un change aparte.

- **[Densidad visual en 1024–1280px]** Nueve columnas en un portátil chico quedan justas. → Mitigación: sólo dos columnas son flexibles y el resto tiene ancho fijo pensado para el contenido real (porcentajes de 2–4 caracteres, importes de hasta 9). Si en la práctica no entra, la salida es bajar el breakpoint de colapso a `xl`, no meter scroll horizontal.

## Migration Plan

No hay migración de datos: el change es de presentación y no altera el contrato con el backend ni el esquema de la base.

Único artefacto persistido con formato propio: el borrador en `localStorage` bajo la clave `pedido-nuevo-borrador`. **El formato no cambia** (mismos campos: `proveedorId`, `observaciones`, `items`, `cotizacionDolar`, `cotizacionTocada`), de modo que un borrador escrito por la versión anterior se lee sin conversión. El único caso nuevo es el borrador con ítems y sin proveedor, cubierto por la Decisión 7.

Rollback: revertir el commit del change. No queda estado inconsistente.

## Open Questions

1. **¿Se agrega `vitest` al frontend para poder testear `pedidoCosteo.js`?** Es la única parte de este change con lógica pura y es exactamente el tipo de función que el bug demostró que se puede romper en silencio. Agregar un test runner es una decisión de dependencia que excede este change y debe confirmarla el usuario. Si dice que no, la verificación es manual y así queda anotado en `tasks.md`.

## Ampliación 2026-08-25 (descuentos editables para línea existente)

**Contexto:** horas después de la reapertura de la Decisión 6 que hizo editables IVA%/envío% para una línea de producto **existente** (documentada en el párrafo de Context de este mismo documento), el dueño del negocio confirmó el mismo criterio también para descuentos: "los descuentos y los impuestos pueden ir variando a pesar de que sea el mismo producto". Esta sección documenta esa segunda ampliación, sobre los mismos componentes del grupo 4 (`CeldaDescuentos.jsx`, `PanelDescuentosLinea.jsx`) — no es un change nuevo de OpenSpec, es una extensión de éste.

**Qué cambió, resumen:**

- `CeldaDescuentos.jsx`: se eliminó el modo `soloLectura` (y el prop `tituloSoloLectura`) por completo — antes tenía dos ramas de render (chips estáticos vs. celda clickeable+`+`), ahora sólo la editable, para cualquier tipo de línea.
- `FilaItemPedido.jsx`: `descuentosFuente` deja de depender de `esExistente`/`esPendiente` — siempre lee `linea.descuentosPactados`. El `panelDescuentos` (sub-fila expandible) se abre para cualquier línea expandida, ya no sólo para `esPendiente`.
- `PedidoNuevo.jsx` → `seleccionarProducto`: al elegir un producto YA EXISTENTE, además de precargar `ivaPactadoPorcentaje`/`envioPactadoPorcentaje` (como ya hacía desde la reapertura de IVA/envío), ahora también precarga `descuentosPactados` con `producto.descuentos` de la ficha, mapeado a `{nombre, porcentaje}`.
- `PedidoNuevo.jsx` → `validate()`: la validación de la lista de descuentos (nombre requerido, % ≥ 0) dejó de estar condicionada a `esPendiente` — aplica a cualquier línea con `descuentosPactados.length > 0`.
- `PedidoNuevo.jsx` → `handleSubmit()`: `descuentoPactadoPorcentaje`/`descuentoPactadoDetalle` viajan en el payload para **cualquier** tipo de línea — antes sólo para pendiente (`...(it.productoId ? {} : {...})`, ahora incondicional).
- `frontend/src/utils/pedidoCosteo.js` → `porcentajesDescuentoDeLinea`: perdió el `if (esLineaPendiente(linea))` — ahora siempre lee `linea.descuentosPactados` (para ambos tipos), nunca `producto.descuentos` del catálogo. Se sacó el parámetro `productos`, que ya no se usaba (ver también `desgloseDeLinea`, que sigue recibiéndolo para no romper su propia firma pública, aunque ya no lo reenvía).
- Backend (`MovimientoStockService`/`MovimientoStockServiceImpl`, `ProductoService`/`ProductoServiceImpl`, `PedidoServiceImpl.confirmarRecepcion`): mismo patrón exacto que la reapertura de IVA/envío —
  - `MovimientoStockService.registrarMovimiento` gana una sobrecarga de 11 parámetros con `descuentoPactadoExplicito`/`descuentoPactadoDetalleExplicito`: cuando `descuentoPactadoExplicito` no es `null`, reemplaza por completo la cascada de `producto.getDescuentos()` para ESE movimiento (congela un único factor ya colapsado, no una lista).
  - `ProductoService.actualizarDescuentosSiDistinto(producto, descuentoPactadoPorcentaje, descuentoPactadoDetalle)`: si el % pactado de la línea es numéricamente distinto del % efectivo colapsado actual de la ficha, reemplaza `producto.descuentos` por una única entrada sintética `"Proveedor"` — mismo criterio de colapso que ya usa `PedidoServiceImpl.confirmarRecepcion()` al dar de alta un producto nuevo desde una línea pendiente. Sin ratchet: sube o baja según corresponda.
  - `PedidoServiceImpl.confirmarRecepcion()` llama a ambos, justo después de la llamada existente a `actualizarIvaEnvioSiDistinto`.

**Decisión no obvia — reemplazo de `producto.getDescuentos()` en el lugar, nunca `setDescuentos(List.of(...))` directo:** `Producto.descuentos` es `@OneToMany(mappedBy="producto", cascade=ALL, orphanRemoval=true)`. Reemplazar la lista por una nueva instancia sin pasar por la colección gestionada por Hibernate dejaría la entidad hija sin la FK seteada (`entidad.setProducto(producto)` nunca se llamaría), insertando con `producto_id NULL`. `actualizarDescuentosSiDistinto` hace `producto.getDescuentos().clear()` seguido de `.add(entidad)` con la FK seteada a mano — mismo patrón exacto que el método privado ya existente `reemplazarDescuentos()` de `ProductoServiceImpl`.

**Decisión no obvia — "Recargar del proveedor" se deja habilitado también para línea existente:** el botón pisa IVA/envío/descuentos de la línea con los defaults del proveedor. Para una línea existente eso significa reemplazar lo precargado de la ficha del producto — se evaluó ocultarlo en ese caso por posible confusión, pero se decidió dejarlo (mismo criterio que ya aplicaba para IVA/envío desde la reapertura anterior): puede ser exactamente lo que el usuario quiere si el proveedor cambió sus condiciones y quiere alinear el producto a las nuevas.

**Verificación realizada** (ver tarea 8.12/8.13 de `tasks.md` para el detalle completo): backend ejercitado end-to-end contra el dev stack real vía la misma API que consume el frontend (pedido a INGCO con línea de producto existente `"prueba 2"`, sin descuentos propios → confirmación de recepción → `producto.descuentos` actualizado a la entrada sintética `"Proveedor 10%"` y movimiento de stock con el descuento correcto congelado; casos adicionales de no-op y de baja sin ratchet; regresión de línea pendiente sin cambios). **Sin navegador real**: este entorno de ejecución no tuvo herramienta de automatización de navegador disponible, así que la interacción visual (clic para expandir la celda, agregar un descuento a mano, ver el costo reaccionar en vivo) se validó por revisión de código — es la misma rama de render (`CeldaDescuentos`/`PanelDescuentosLinea`) que la línea pendiente ya ejercitaba en corridas anteriores de este change — y por el payload real verificado en la prueba de backend, que es exactamente lo que la UI arma y envía.

2. **¿La columna de cantidad debería admitir decimales?** Hoy `handleSubmit` hace `parseInt(it.cantidadPedida, 10)`. Se mantiene entero — no se cambia nada acá, pero conviene confirmarlo si aparecen ítems que se piden por peso o metro.
