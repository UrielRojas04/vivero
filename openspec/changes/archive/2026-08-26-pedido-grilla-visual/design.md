## Context

`frontend/src/pages/PedidoNuevo.jsx` + `frontend/src/components/pedidos/` son el resultado del change `pedido-planilla-editable` (archivado 2026-08-25). Ese change ya resolvió la estructura: una fila por ítem, una columna por dato, plantilla de columnas única compartida, sub-fila expandible para descuentos, colapso a tarjetas por debajo de `xl`. **Nada de eso se reabre acá.** Este change es la capa de acabado que a esa estructura le falta.

### Estado actual, medido (no estimado)

Se reprodujo la pantalla contra el stack de desarrollo real (Docker en marcha, `localhost:5173`, `jefe@vivero.com`, negocio Herramientas) inyectando un borrador de 30 ítems mezclados —productos existentes, líneas pendientes, líneas en USD, filas con 0, 1 y 2 descuentos— con el proveedor SHIMURA (`manejaDolares = true`, o sea las 9 columnas). Evidencia: `img/grilla-actual-1600.png` y `img/grilla-actual-1366-usd.png` (la carpeta `img/` está en `.gitignore`; las capturas son material de trabajo, no artefactos del repo).

**Cadena de contenedores medida** (viewport 1366 × Herramientas × proveedor USD):

| Nivel | Elemento | Ancho |
|---|---|---|
| viewport | — | 1366 |
| sidebar fija | `DashboardLayout.jsx` | −256 |
| shell scrolleable | `div.flex-1.p-4.md:p-8.overflow-x-hidden` | `clientWidth` 1110 → interior 1046 (`p-8` = 32×2) |
| tarjeta de ítems | `bg-white rounded-2xl … p-5 sm:p-6` | interior **998** (`p-6` = 24×2) |
| grilla, mínimo requerido | 9 pistas (932px) + 8 `gap-x-3` (96px) | **1028** |

**1028 > 998 → la grilla se recorta ~30px, en silencio.** El shell tiene `overflow-x: hidden` fijo, así que no aparece scrollbar: el botón de quitar queda montado sobre el borde de la tarjeta y el ojo no tiene forma de saber que falta algo. `getBoundingClientRect().width` del contenedor devuelve 996 mientras las pistas piden 1028, y la columna de producto ya está clavada en su `minmax()` mínimo de 200px.

Esto es la ventana residual que la Decisión 6 de `pedido-planilla-editable` dejó anotada como "~1280–1340px, viewport poco común". La medición la corrige: **llega hasta 1366px inclusive**, que es el ancho de laptop más común. No es un caso de borde.

A 1600px, en cambio, sobra espacio: la grilla mide 1230 dentro de 1232 disponibles, y la columna de producto se estira a **426px** para nombres de tres palabras — de ahí el "demasiado espacio entre valores".

### Los cuatro defectos visuales concretos

Anclados a las clases reales de hoy, no a impresiones:

1. **No hay líneas.** Separación de fila: `cellBase = 'py-3 border-b border-gray-100'` (`FilaItemPedido.jsx:201`) — `gray-100` sobre blanco es casi invisible a 40 filas. Separación de columna: **ninguna**, sólo `gap-x-3` (12px de aire). El ojo no tiene ningún riel que seguir en ninguna de las dos direcciones.
2. **"Campos sueltos".** Cada input numérico dibuja su propia cajita: `inputClass()` (`FilaItemPedido.jsx:117`) = `w-full px-2.5 py-1.5 rounded-lg border bg-white … border-gray-200`. Cinco cajitas blancas flotando sobre fondo blanco, sin nada que las ate a su fila ni a su columna. Es literalmente lo que el usuario describió.
3. **"Muy chiquitos".** Encabezados `text-[11px]` gris claro sin fondo (`PedidoNuevo.jsx:831-840`); chips de descuento `text-[10px]` con `max-w-[110px] truncate` (`CeldaDescuentos.jsx:37`) — a 1366px el truncado se come el dato que importa y se lee `Volumen` sin su `5%`; nota USD `text-[10px]`; labels de la tarjeta `text-[10px]`.
4. **La fila se parte en dos.** El aviso de auto-ratchet es `col-span-full -mt-1 pb-2` con texto ámbar suelto (`FilaItemPedido.jsx:296`), sin ninguna marca de pertenencia. En la captura de 30 ítems aparece bajo casi todas las filas y se lee como una fila propia intercalada, que es exactamente lo contrario de "una fila = un producto".

Y no hay encabezado `sticky`: al llegar al ítem 20 no queda ninguna referencia de qué columna es cuál.

## Goals / Non-Goals

**Goals:**

- Que con 30–40 ítems cargados se pueda atribuir cada valor a su producto y a su columna de un vistazo, sin contar con el dedo.
- Que los encabezados de columna sigan disponibles mientras se scrollea la lista completa.
- Que una fila y todo lo que le cuelga (sub-fila de descuentos, sub-formulario de producto nuevo, aviso de auto-ratchet) se lean como un único bloque.
- Eliminar el recorte silencioso a 1366px con columna USD.
- Aspecto de planilla profesional: bordes definidos, alineación de dígitos, espaciado consistente.
- Preservar **sin una sola excepción** todo el comportamiento actual.

**Non-Goals:**

- No se toca `frontend/src/utils/pedidoCosteo.js` (lógica pura, no visual) ni `utils/costeo.js` ni nada de `backend/`.
- No se cambia ningún handler, estado, validación, forma del payload ni formato del borrador de `localStorage`.
- No se reabre ninguna decisión funcional de `pedido-planilla-editable`: cascada de descuentos, celda-resumen + sub-fila expandible (Decisión 4), sub-formulario de producto nuevo como sub-fila (Decisión 5), gate de proveedor (Decisión 7), la cotización no es columna (Decisión 9).
- **No se mueve el breakpoint `xl` de colapso a tarjetas** ni la lógica de cuándo se activa (Decisión 6 de aquel change). Las tarjetas sí reciben el mismo lenguaje visual, pero el umbral no se toca.
- No se agrega `overflow-x-auto` ni scroll horizontal en ningún nivel (Decisión 6 de aquel change lo prohíbe explícitamente: recorta el dropdown absoluto de `ProductoSearchSelect` y el panel de descuentos).
- No se agrega ninguna librería (ni de tablas, ni de virtualización) ni ninguna dependencia de npm.
- No se reordenan las columnas ni se agregan/quitan datos, salvo la columna `#` (Decisión 8).

## Decisions

### Decisión 1 — Reglas de 1px en las dos direcciones, no zebra

**Qué:** la grilla dibuja líneas reales.

- **Vertical:** cada celda salvo la primera lleva `border-l border-gray-200`. Las líneas nacen del contenedor de la grilla y bajan por todas las filas, incluida la de encabezados, porque cada fila usa la misma plantilla.
- **Horizontal:** el separador de fila sube de `border-gray-100` a `border-gray-200`, y el borde inferior del encabezado sube a `border-b-2 border-gray-300`.
- El marco exterior de la grilla es `border border-gray-200 rounded-xl overflow-visible` — **`rounded` sí, `overflow-hidden` jamás** (ver Decisión 4 e invariante de la Decisión 6 del change anterior: ningún ancestro de la fila puede recortar, o el dropdown de producto y el panel de descuentos desaparecen).

**Por qué reglas y no zebra (bandas alternadas):** con 40 filas hay dos problemas de seguimiento simultáneos, no uno. La zebra resuelve sólo el horizontal y no dice nada del vertical, que es el que más duele acá porque la columna de descuentos suele estar vacía y deja un vacío de ~200px entre "Costo unit." e "IVA %". Además —y esto es decisivo— la Decisión 2 de abajo hace que **el fondo de la celda sea el fondo del input**: el canal "color de fondo" queda reservado para los estados de foco (`emerald`), error (`red`) y deshabilitado (`gray`). Si la zebra ya pintó la mitad de las filas, esos tres estados dejan de leerse de forma unívoca. Las reglas cuestan el canal "borde", que hoy está desaprovechado, y dejan el canal "fondo" libre para el estado.

Alternativas consideradas y descartadas:
- *Zebra sutil (`odd:bg-gray-50/50`)*: descartada por lo anterior. Queda como salida de emergencia si en el checkpoint 4 las reglas solas no alcanzan (ver Open Questions).
- *`<table>` real con `border-collapse`*: descartada por la Decisión 2 del change anterior — obliga a `colspan` para las sub-filas y rompe la semántica de tabla en el colapso a tarjetas. La rejilla visual se consigue igual con Grid.
- *Sombras/elevación por fila*: descartada, 40 sombras es ruido y costo de pintado.

### Decisión 2 — El input pierde su caja; la celda **es** la caja

**Qué:** `inputClass()` deja de emitir `rounded-lg border border-gray-200 bg-white px-2.5 py-1.5`. El input pasa a ser transparente y a llenar la celda: `w-full bg-transparent px-2 py-2 text-sm text-right tabular-nums focus:outline-none`. El marco lo dan las reglas de la Decisión 1.

Los estados pasan del borde al fondo de la celda:

| Estado | Hoy | Propuesto |
|---|---|---|
| normal | `border-gray-200` | sin nada; las reglas de la celda alcanzan |
| hover de fila | — | `bg-gray-50/70` en toda la fila (Decisión 5) |
| foco | `focus:ring-2 focus:ring-emerald-500` (crece hacia afuera) | `focus:ring-2 focus:ring-inset focus:ring-emerald-500` + `focus:bg-emerald-50/50` |
| error | `border-red-300` | `bg-red-50` en la celda + el texto de error debajo, ya existente |
| deshabilitado (gate de proveedor) | `opacity-60` heredado | `bg-gray-50 text-gray-400` en la celda |

**Por qué:** es la respuesta directa a "hay campos sueltos". Cinco rectángulos redondeados blancos sobre fondo blanco, cada uno con su propio borde, es justo lo que hace que un valor no se sienta parte de una fila ni de una columna: cada input compite por ser su propio objeto. Cuando la celda es la caja, el valor pertenece visualmente a la intersección fila×columna — que es cómo se lee una planilla.

**Y, no menos importante, es lo que financia el resto del change.** Cada input gasta hoy `px-2.5` (10px por lado) + `border` (1px por lado) = **22px de cromo por columna numérica**. Sacarlo libera ancho suficiente para pagar las reglas de 1px, la columna `#` y una tipografía más grande **sin** empujar el ancho mínimo de la grilla. Sin esta decisión, el change no entra a 1366px (Decisión 7).

**`focus:ring-inset` es obligatorio, no cosmético:** un `ring` normal se pinta hacia afuera del input y, sin gap entre columnas, invadiría la celda vecina.

**Riesgo asumido y cómo se controla:** un input sin borde puede no leerse como editable. Mitigación: el `hover` de fila tiñe toda la fila y el `hover` de celda editable agrega `bg-white` con `ring-1 ring-inset ring-gray-300`, de modo que al pasar el mouse la celda "levanta" y se anuncia como campo. **Es lo primero a validar en el checkpoint 4**; si el dueño no lo lee como editable, la salida es devolver un borde inferior sutil (`border-b border-gray-300`) sólo a las celdas de input, que cuesta 0px de ancho.

### Decisión 3 — Escala tipográfica: qué sube, qué no, y qué nunca se trunca

**Qué:**

| Elemento | Hoy | Propuesto |
|---|---|---|
| Valores numéricos (cantidad, costo, IVA, envío) | `text-sm` | `text-sm` + **`tabular-nums`** |
| Costo total de fila | `text-sm font-semibold` | `text-sm font-semibold tabular-nums` |
| Encabezados de columna | `text-[11px] text-gray-500 uppercase` | `text-xs font-semibold text-gray-600 uppercase` + fondo `bg-gray-50` |
| Chips de descuento | `text-[10px]` | `text-[11px]` |
| Nota USD (`US$ 250`) | `text-[10px] text-gray-400` | `text-[11px] text-gray-500 tabular-nums` |
| Errores por línea | `text-[11px]` | `text-xs` |
| Labels de la variante tarjeta | `text-[10px] text-gray-400` | `text-[11px] font-medium text-gray-500` |
| Aviso de auto-ratchet | `text-[11px]` | `text-[11px]` (se queda chico a propósito: es una nota al pie, no un dato) |

**`tabular-nums` es la decisión de mayor rendimiento por costo del change.** Con cifras proporcionales, una columna de 40 importes no alinea sus dígitos y el ojo no puede comparar magnitudes de un barrido vertical; con cifras tabulares sí. Cuesta una clase de Tailwind y cero píxeles de ancho.

**Los valores numéricos NO suben de tamaño.** `text-sm` (14px) ya es correcto para el dato principal; el problema nunca fue el tamaño de los números sino el de los elementos accesorios (`text-[10px]`) y la falta de estructura. Subir los números a `text-base` empujaría el ancho mínimo de las columnas fijas y reabriría el recorte a 1366px, que es exactamente lo que este change viene a cerrar.

**Qué nunca se trunca:** hoy el chip es `max-w-[110px] truncate` sobre `"{nombre} {porcentaje}%"`, y a 1366px el truncado se come el `%` — se lee `Volumen` a secas. El porcentaje **es** el dato; el nombre es la etiqueta. El chip pasa a dos `<span>`: el nombre trunca (`truncate min-w-0`), el porcentaje es `shrink-0` y siempre se ve completo. Misma regla en cualquier lugar donde convivan etiqueta y número.

### Decisión 4 — La fila deja de ser `display: contents` y pasa a ser su propio grid

**Qué:** hoy `FilaItemPedido` con `variant="grid"` devuelve `<div className="contents">` para que sus celdas sean hijas directas del grid del padre y compartan su plantilla (`FilaItemPedido.jsx:203`). Pasa a devolver un `<div>` propio con **la misma constante de plantilla** (`GRID_COLS`/`GRID_COLS_USD`) aplicada a sí mismo. El padre deja de ser un grid con todo adentro y pasa a ser un contenedor vertical: fila de encabezados (grid propio) + N filas (grid propio cada una) + fila de totales (grid propio).

**Por qué es necesario:** `display: contents` elimina la caja de la fila. Sin caja de fila **no hay dónde colgar** ninguna de las tres cosas que este change necesita:

1. `hover` de fila completa (Decisión 5) — sin elemento de fila habría que hacerlo con estado de React por fila, lo que significa re-renderizar 40 filas en cada `mousemove` entre filas. Inaceptable y evitable.
2. El borde de agrupación fila+sub-filas (Decisión 5).
3. La contención de las sub-filas: hoy son `col-span-full` sobre el grid del padre, o sea hermanas de las celdas de todas las demás filas; nada las ata a la suya.

**Por qué es seguro (la parte que hay que entender antes de tocar nada):** la Decisión 2 del change anterior eligió `contents` para garantizar que todas las filas compartan la resolución de columnas. Grids independientes resuelven sus pistas por separado — pero resuelven **al mismo resultado** si y sólo si (a) tienen el mismo ancho de contenedor y (b) la plantilla no tiene ninguna pista dimensionada por contenido. Ambas se cumplen: todas las filas son hijas del mismo contenedor de ancho fijo, y la plantilla actual es íntegramente `px` y `minmax(px, fr)` — cero `auto`, `min-content` o `max-content`.

> **Invariante que este change instala y hay que respetar de acá en adelante:** `GRID_COLS`/`GRID_COLS_USD` **no pueden contener nunca** una pista `auto`, `min-content`, `max-content` ni `fit-content()`. Si alguna vez hiciera falta una, las filas dejarían de alinearse entre sí en silencio (cada una se ajustaría a su propio contenido) y habría que volver a `display: contents` renunciando a hover y agrupación. El comentario que hoy dice "nunca redefinir la plantilla acá adentro" se reemplaza por éste, que es la razón real.

Alternativas consideradas:
- *Quedarse con `contents` y hacer el hover con CSS `:has()`*: `.grid:has(> [data-fila="17"]:hover) > [data-fila="17"] { … }` no es expresable en Tailwind sin CSS a medida por fila, y el selector tendría que existir por cada `lineaId` (que son IDs generados en runtime). Inviable.
- *Quedarse con `contents` y hacer el hover con estado de React*: descartado por el re-render de 40 filas descrito arriba.
- *Envolver cada fila en un `<div className="col-span-full">` que a su vez es grid*: es exactamente la solución propuesta, sólo que sin necesidad de que el padre siga siendo grid. Se simplifica: el padre es un `flex flex-col` común.

### Decisión 5 — "Una fila = un producto": hover, agrupación y sub-filas que se leen como propias

**Qué:**

- **Hover de fila:** el `<div>` de fila lleva `hover:bg-gray-50/70`, en CSS puro. Cubre la fila entera de punta a punta, incluidas sus sub-filas abiertas (son sus hijas).
- **La regla inferior la dibuja el último elemento del grupo.** Hoy cada celda lleva `border-b` (`cellBase`), así que cuando hay una sub-fila abierta la línea queda **entre** la fila y su propia sub-fila, partiéndola. Propuesto: la regla `border-b border-gray-200` se mueve al `<div>` de fila (una sola línea, al pie de todo el grupo) y las celdas dejan de dibujarla. Abrir descuentos deja de cortar la fila al medio.
- **Sub-filas sangradas y con acento:** las tres cosas que hoy son `col-span-full` sueltas —panel de descuentos, sub-formulario de producto nuevo y aviso de auto-ratchet— reciben el mismo tratamiento de pertenencia: sangría izquierda alineada con el inicio de la columna "Producto" y un acento lateral `border-l-2` (`emerald-200` para los editores, `amber-300` para el aviso). Se leen como un anexo de su fila, no como una fila más.
- **El aviso de auto-ratchet** pasa de texto ámbar suelto a nota con ese tratamiento. Su condición de disparo (`desglose.costoBaseConvertido > costoBaseFicha`) **no se toca**.

**Por qué el acento lateral y no un recuadro completo:** un recuadro cerrado vuelve a leerse como un objeto independiente —el mismo problema de los inputs con caja propia—. Una línea que baja desde la fila padre dice "esto cuelga de arriba", que es exactamente la relación real.

**Qué NO cambia:** el mecanismo de expansión (`Set` de `lineaId` en `PedidoNuevo.jsx`), el auto-expandir al presionar `+` (tarea 4.6 del change anterior), el clic en la celda para abrir/cerrar, y que la celda-resumen sea de **altura fija** (Decisión 4 del change anterior: si la celda crece con la cantidad de descuentos, la grilla deja de ser planilla). Todo eso se conserva tal cual.

### Decisión 6 — Encabezado de columna `sticky`

**Qué:** la fila de encabezados pasa a `sticky top-0 z-10` con fondo opaco `bg-gray-50` y `border-b-2 border-gray-300`.

**Por qué es viable acá y no era obvio:** se midió el contenedor de scroll real. La cadena desde la grilla hacia arriba es:

| Elemento | `overflow-y` | `scrollHeight` / `clientHeight` |
|---|---|---|
| `div.flex-1.p-4.md:p-8.overflow-x-hidden` | `auto` | **3074 / 1136 → éste es el que scrollea** |
| `main.flex-1…max-h-screen.overflow-y-auto` | `auto` | 1200 / 1200 (no scrollea) |
| `div.min-h-screen…overflow-hidden` | `hidden` | 1200 / 1200 |

El detalle no evidente: ese `div` declara sólo `overflow-x: hidden`, pero por especificación CSS, cuando un eje es `hidden` el otro deja de poder ser `visible` y computa a `auto` — por eso termina siendo el contenedor de scroll. `position: sticky` se ancla al ancestro scrolleable más cercano, así que se ancla ahí. **`overflow-x: hidden` no rompe `sticky` en el eje vertical.**

**Fondo opaco obligatorio:** sin `bg-*` propio, las filas se ven pasar por debajo del encabezado.

**Análisis de `z-index` (el punto delicado):** el dropdown de `ProductoSearchSelect` es `absolute z-20` dentro de una celda `relative` (`ProductoSearchSelect.jsx:127`). Con el encabezado en `z-10`, ambos compiten en el mismo contexto de apilamiento y **gana el dropdown**, que es lo correcto: la lista de productos de la primera fila no puede quedar tapada por el encabezado. La barra superior de la app es `sticky top-0 z-20` pero vive en `main`, **otro** contenedor de scroll, por encima del que scrollea: no compite. El encabezado se pega al borde superior del área de contenido, justo debajo de esa barra.

Alternativas consideradas:
- *Sin sticky, repetir el encabezado cada 10 filas*: descartado, es más código, más ruido visual y se desincroniza al agregar/quitar ítems.
- *Header sticky por celda con `contents`*: dejaría de hacer falta con la Decisión 4, que le da al encabezado su propio elemento de grid. Más simple.

**Verificación obligatoria** (no se da por sentado): con 30+ ítems, scrollear hasta el ítem 25 y confirmar (a) que el encabezado sigue visible, (b) que ninguna fila se transparenta debajo, y (c) que abrir el buscador de producto de la primera fila visible muestra el dropdown **por encima** del encabezado.

### Decisión 7 — Presupuesto de ancho: la grilla sangra a los bordes de la tarjeta y las pistas se ajustan

**Qué:** dos movimientos, en este orden.

1. **Sangrado:** dentro de la tarjeta, la grilla se extiende hasta sus bordes (`-mx-5 sm:-mx-6` a `xl`, compensando el `p-5 sm:p-6` de la tarjeta). Recupera **48px**.
2. **Reajuste de pistas**, financiado por los 22px de cromo que la Decisión 2 libera en cada columna numérica:

| Columna | Hoy | Propuesto | Nota |
|---|---|---|---|
| `#` | — | 32 | nueva (Decisión 8) |
| Producto | `minmax(200px, 2.2fr)` | `minmax(190px, 2.2fr)` | sin caja propia el nombre respira igual |
| Cant. | 84 | 64 | 3–4 dígitos |
| USD | 56 | 44 | sólo un checkbox |
| Costo unit. | 110 | 100 | |
| Descuentos | `minmax(170px, 1.1fr)` | `minmax(150px, 1.1fr)` | |
| IVA % | 76 | 60 | |
| Envío % | 76 | 60 | |
| Costo total | 120 | 132 | tiene que entrar `$4.101.250,23` completo |
| Quitar | 40 | 36 | |
| separación | 8 × `gap-x-3` = 96 | `gap-0` + `px-2` por celda | las reglas de 1px viven en el padding |

Mínimo resultante con columna USD: **868px** contra **1046px** disponibles a 1366 (con sangrado) — 178px de holgura, contra los −30px de hoy. A 1600px la columna de producto deja de llevarse 426px porque hay una columna más y varias más anchas donde repartir.

**Estos números son un presupuesto de partida, no un dogma.** La verificación es medir, no mirar: con proveedor USD a 1366px, la suma de pistas + padding debe entrar en el interior de la tarjeta, y a 1280px (donde `xl` recién activa la grilla) también. Si no entra, se angostan pistas fijas — **nunca** se agrega scroll horizontal ni se mueve el breakpoint.

**Por qué el sangrado y no simplemente achicar el `p-6` de la tarjeta:** una planilla al ras de su contenedor es la convención (Excel, cualquier `<table>` dentro de un panel) y además hace que las reglas horizontales lleguen de borde a borde, que es lo que las vuelve rieles útiles. Achicar el padding de la tarjeta afectaría también al encabezado "Ítems del pedido" y al botón "Agregar ítem", que están bien donde están.

### Decisión 8 — Columna `#` y fila de totales al pie

**Qué:**

- **Columna `#`** de 32px como primera columna, sólo en `variant="grid"`: el número de posición del ítem (1…40), `text-[11px] text-gray-400 tabular-nums text-right`.
- **Fila de totales** como última fila de la grilla, con fondo `bg-gray-50`, borde superior `border-t-2 border-gray-300`, la palabra "Total" y el importe **alineado bajo la columna "Costo total"**.

**Por qué el `#`:** es lo que hace Excel y es el ancla más barata para "no sé qué valor es de qué producto" — da una referencia estable en el borde izquierdo y permite hablar de "el ítem 27" en voz alta. 32px es asequible dentro de los 178px de holgura de la Decisión 7.

**Por qué la fila de totales:** el total ya se muestra dos veces (encabezado de la tarjeta y tarjeta de pie), pero en ningún lado **alineado con la columna que suma**. Que el total caiga exactamente bajo "Costo total" es lo que hace que la columna se lea como una columna que suma, y es el gesto más "planilla profesional" del change por unidad de esfuerzo.

> **Restricción dura:** la fila de totales renderiza la **misma variable `total`** que ya existe en `PedidoNuevo.jsx`. Prohibido recalcular, prohibido un `reduce` nuevo. La Decisión 1 de `pedido-planilla-editable` existe precisamente porque tres cálculos paralelos del total divergieron; agregar un cuarto punto de cálculo sería reintroducir ese bug.

Ambos son los ítems más prescindibles del change: si en el checkpoint 4 el dueño los ve como ruido, se sacan sin tocar nada más.

### Decisión 9 — Las tarjetas (`< xl`) reciben el mismo lenguaje, el breakpoint no se toca

**Qué:** `variant="card"` sufre los mismos defectos (labels `text-[10px]`, separación por `divide-y divide-gray-100`, inputs con caja propia sobre fondo blanco). Recibe la misma pasada: labels a `text-[11px] font-medium`, pares etiqueta:valor con reglas visibles, `tabular-nums` en los números, y cada tarjeta con marco propio (`border border-gray-200 rounded-xl`) en vez de sólo una línea divisoria. Los inputs de la tarjeta **conservan su caja** (Decisión 2 sólo aplica a la grilla): sin columnas que hagan de marco, sacarles el borde los dejaría sin ninguna referencia.

**Qué no se toca, bajo ningún concepto:** el umbral `xl` (`hidden xl:grid` / `xl:hidden`) ni la lógica de cuándo colapsa. La Decisión 6 de `pedido-planilla-editable` lo bajó de `lg` a `xl` porque a `lg` la grilla se recortaba en silencio contra el `overflow-x-hidden` del shell. Ese motivo sigue vigente. Que la Decisión 7 recupere ancho **no** es razón para volver a `lg`: sería reabrir un problema ya pagado, y a 1024px nueve columnas no son legibles ni entrando.

## Risks / Trade-offs

- **[Filas desalineadas entre sí al pasar de `display: contents` a grids por fila]** Es el único cambio estructural del change y su modo de falla es silencioso: las columnas se corren de a poco entre filas y nadie lo nota hasta ver una captura. → **Mitigación:** la plantilla no tiene pistas dimensionadas por contenido (invariante de la Decisión 4, que queda escrito en el código); verificación explícita con 30+ ítems mezclados —nombres de producto largos y cortos, filas con 0/1/2 descuentos, filas en USD, filas con sub-fila abierta— comparando la posición horizontal de una misma columna en la primera y en la última fila. Si aparece cualquier desalineación, la salida es volver a `contents` y renunciar al hover, no parchear anchos a mano.

- **[Un input sin borde no se lee como editable]** El riesgo directo de la Decisión 2: el dueño podría no darse cuenta de que puede tipear ahí. → **Mitigación:** hover de celda que "levanta" el campo (`bg-white` + `ring-1 ring-inset ring-gray-300`) y foco inequívoco (`ring-2 ring-inset` + tinte esmeralda). Es lo primero que se valida en el checkpoint 4. Salida si falla: borde inferior sutil sólo en celdas de input, que cuesta 0px de ancho.

- **[El estado deshabilitado del gate de proveedor deja de leerse]** Hoy el "deshabilitado" se apoya en `opacity-60` y en el borde gris del input; sin borde hay menos señal, justo en el caso donde el usuario tiene que entender por qué no puede escribir. → **Mitigación:** las celdas deshabilitadas llevan fondo `bg-gray-50` explícito y el banner ámbar "Elegí un proveedor para seguir editando estos ítems" sigue igual. Verificación dedicada con un borrador restaurado sin proveedor.

- **[`sticky` que no se pega, o que tapa el dropdown de producto]** El contenedor de scroll es un `div` con `overflow-x: hidden` cuyo `overflow-y` computa a `auto`; funciona, pero es exactamente el tipo de detalle que se rompe si alguien más adelante toca el shell. → **Mitigación:** verificación explícita de los tres puntos de la Decisión 6. Si `sticky` no se pegara, se saca: es la parte más aislable del change y la grilla sigue mejorando sin ella.

- **[Regresión de comportamiento mientras se reescribe el JSX]** El change toca cinco archivos de una pantalla de uso diario. Un `onChange` mal recableado guarda un pedido mal, sin error visible. → **Mitigación:** ningún handler, ninguna prop y ninguna firma cambian — sólo `className` y estructura de contenedores; y el grupo 6 de `tasks.md` repite la verificación de no-regresión que ya usó `pedido-planilla-editable` (borrador con F5, payload de línea existente y de línea pendiente, validaciones, cotización USD).

- **[Sigue sin haber test runner en el frontend]** `frontend/package.json` define sólo `dev`/`build`/`lint` (`oxlint`); no hay vitest ni ningún `*.test.*`. Se resolvió en el change anterior (tarea 7.1) que no se agrega. → Verificación manual + `npx oxlint`. Para un change puramente visual el impacto es menor que en aquél: no hay lógica pura nueva que testear (`pedidoCosteo.js` no se toca).

- **[Trade-off: 40 filas con hover en CSS]** Se elige CSS puro sobre estado de React justamente para no re-renderizar 40 filas al mover el mouse. El costo es que el hover no puede coordinar nada fuera de la fila (por ejemplo, resaltar también la columna). → Aceptado: resaltar la columna entera es un extra que nadie pidió y que en una planilla con campos editables suele molestar más de lo que ayuda.

- **[El delta de spec de `pedido-planilla-editable` nunca se sincronizó]** El commit de archivado `ae4e062` movió los artefactos pero no actualizó `openspec/specs/pedidos-proveedores/spec.md`; los escenarios de aquel change no están en la fuente de verdad. → **Mitigación en este change:** su delta se escribe como `ADDED Requirements` (requisito nuevo y propio), nunca como `MODIFIED` sobre "Pantallas del circuito de pedidos" — modificar ese requisito a partir del texto base incompleto borraría los escenarios del change anterior al archivar éste. Recuperar el delta perdido es trabajo aparte y se reporta al usuario.

## Migration Plan

No hay migración: el change es de presentación pura. No cambia el esquema de la base, el contrato con el backend, ni el formato del borrador en `localStorage` (`pedido-nuevo-borrador`: `proveedorId`, `observaciones`, `items`, `cotizacionDolar`, `cotizacionTocada`) — un borrador escrito por la versión anterior se lee sin conversión.

Despliegue: el frontend se sirve desde el contenedor de Vite en desarrollo con el código montado por volumen, así que los cambios se ven al guardar, sin rebuild. **No se corre build sin pedido explícito del usuario** (regla dura del proyecto).

Rollback: revertir el commit del change. No queda estado inconsistente en ningún lado.

## Open Questions

1. **¿Zebra sutil además de las reglas?** La Decisión 1 la descarta porque compite con los estados de foco/error/deshabilitado, que ahora viven en el fondo de la celda. Si en el checkpoint 4 con 30+ ítems el dueño sigue perdiendo la fila, la salida es una zebra muy tenue (`odd:bg-gray-50/40`) aceptando que los estados se lean un poco menos nítidos en las filas impares. **Se decide mirando la pantalla, no antes.**

2. **¿La columna `#` y la fila de totales se quedan?** Son los dos agregados más prescindibles (Decisión 8). Se muestran en el checkpoint 4 y el dueño decide; sacarlos no afecta a ninguna otra decisión.

3. **¿La grilla queda al ras de la tarjeta o conviene una tarjeta propia?** La Decisión 7 sangra la grilla hasta los bordes de la tarjeta de ítems. La alternativa es sacarla de la tarjeta y darle su propio marco de ancho completo, lo que recuperaría otros ~2px y cambiaría más la página de lo que este change se propone. Se evalúa en el checkpoint 4 sólo si el sangrado se ve mal.

## Open Questions — Resueltas (checkpoint 9.1)

Mostrada la grilla con 32 ítems mezclados (existentes, pendientes, USD, 0/1/2 descuentos, nombres
largos y cortos) a 1366px y 1600px con proveedor SHIMURA, el dueño respondió las 4 preguntas
bloqueantes:

1. **Zebra sutil (Open Question 1): NO.** Los inputs sin caja propia se leen como editables tal
   cual están (Decisión 2 confirmada sin cambios) y las reglas de 1px alcanzan solas — no hace
   falta zebra (Decisión 1 confirmada sin cambios).
2. **Columna `#` y fila de totales (Open Question 2): mixto.**
   - La columna `#` **se queda tal cual** (Decisión 8, primera mitad, confirmada sin cambios).
   - La fila de totales al pie de la grilla **se saca**. Motivo textual del dueño: "No el total ya
     aparece abajo, la numeracion de fila la podes dejar" — el total en el footer de la página
     (fuera de la tarjeta de ítems, junto a "Cancelar"/"Crear Pedido") alcanza; la fila de totales
     que quedaba al pie de la propia grilla (dentro de la tarjeta "Ítems del pedido", tareas 8.2/8.3)
     era redundante con ese footer y con el encabezado de la tarjeta ("N ítems · Total: $X"). Se
     eliminó la fila y su bloque de comentario en `PedidoNuevo.jsx`; `GRID_COLS`/`GRID_COLS_USD` no
     cambiaron (la columna `#` sigue existiendo, sólo dejó de tener una tercera fila que la usara
     para alinear la palabra "Total"). El contenedor de la grilla pasó de apilar tres bloques (header
     + filas + totales) a apilar dos (header + filas).
3. **Sangrado a los bordes de la tarjeta (Open Question 3): SIN OBJECIÓN, se queda tal cual**
   (Decisión 7 confirmada sin cambios).

Con (a) confirmado (inputs sin caja se leen como editables), el grupo 10 (tarjetas `< xl`) se
implementó sin bloqueos.

## Medición final (post checkpoint 9.1)

Anchos de pista **finales** realmente usados (`GRID_COLS`/`GRID_COLS_USD` en `PedidoNuevo.jsx`,
sin cambios respecto del presupuesto de la Decisión 7 — el checkpoint 9.1 no tocó columnas, sólo
sacó la fila de totales):

```
GRID_COLS     = grid-cols-[32px_minmax(190px,2.2fr)_64px_100px_minmax(150px,1.1fr)_60px_60px_132px_36px]
GRID_COLS_USD = grid-cols-[32px_minmax(190px,2.2fr)_64px_44px_100px_minmax(150px,1.1fr)_60px_60px_132px_36px]
```

Medido con Playwright contra el dev stack real (Docker, `localhost:5173`, negocio Herramientas,
proveedor SHIMURA, borrador de 32 ítems mezclados), leyendo directamente
`getBoundingClientRect()`/`scrollWidth`/`clientWidth` de la fila de encabezados:

| Viewport | Ancho interior de tarjeta (`clientWidth`) | Suma de pistas (`scrollWidth`) | Resultado |
|---|---|---|---|
| 1280px (frontera `xl`) | 956px | 956px | **Entra exacto, sin recorte** (`scrollWidth === clientWidth`, cero overflow) |
| 1366px | 1042px | 1042px | **Entra con holgura** (columna Producto se estira a 343px en vez de quedar en su mínimo) |
| 1600px | 1278px | 1278px | Columna Producto se estira aún más, sin el "espacio muerto" de ~426px del estado anterior |

En los tres viewports `scrollWidth === clientWidth`: la grilla nunca se recorta ni desborda, y
nunca aparece scroll horizontal. Columnas medidas a 1366px (caso USD, 10 columnas):
`# 32 · Producto 343 · Cant. 64 · USD 44 · Costo unit. 100 · Descuentos 171 · IVA% 60 · Envío% 60 ·
Costo total 132 · Quitar 36` (suma 1042). El importe de prueba más grande usado
(`$8.879.270,00`-clase, columna "Costo total") entró completo sin recortarse ni envolver.

Frontera de colapso `xl` verificada bit a bit: a 1279px el contenedor de grilla computa
`display: none` y el de tarjetas `display: flex`; a 1280px se invierte. El umbral no se movió.

## Ampliación (post checkpoint 12.3, antes del archive) — referencia visual + 3 ajustes puntuales

Con el change ya en el checkpoint final 12.3 (69/70 tasks, verificado, esperando el OK del
usuario para archivar), el usuario compartió una imagen de referencia (`img/grilla ejemplo.png`,
mockup no pixel-perfect) y pidió una ronda más de ajustes ANTES de archivar. Se trata como una
ampliación de este mismo change, no un change nuevo.

**Nota sobre el mockup:** el usuario fue explícito en que la imagen tiene defectos PROPIOS del
mockup que había que evitar, no replicar: el botón de eliminar se ve cortado en el borde derecho,
algunos valores numéricos no están bien alineados/centrados, y el chip "Volumen 5%" muestra el "5%"
en una segunda línea debajo del nombre. Los tres son bugs del mockup, no requisitos.

### Decisión 10 — Columna USD siempre presente en la plantilla; el proveedor gobierna la celda, no la columna

**Qué pidió el usuario (verbatim):** *"No habrá columnas que desaparezcan según el proveedor como
por ejemplo la de USD."*

**Qué había:** dos plantillas de columnas, `GRID_COLS` (9 columnas, sin USD) y `GRID_COLS_USD` (10
columnas, con USD), elegidas en `PedidoNuevo.jsx` según `proveedorSeleccionado?.manejaDolares`.
Cambiar de proveedor dentro del mismo pedido podía cambiar la cantidad de columnas y el ancho total
de la grilla — el layout "saltaba".

**Qué cambia:** una única plantilla (`GRID_COLS`, 10 columnas, los anchos que antes eran
`GRID_COLS_USD` — ya validados sin overflow en la sección "Medición final" de arriba, que es
justamente el caso más exigente de los dos). `GRID_COLS_USD` se elimina. `gridColsClass` deja de
depender de `manejaDolares`. La columna USD (checkbox "línea en dólares") se renderiza siempre,
tanto en el encabezado como en cada fila, en las dos variantes (`grid` y, por paridad, `card`).

**Tratamiento de la celda cuando el proveedor no maneja dólares:** el checkbox se deshabilita
(`disabled`) y queda destildado, con `title="Este proveedor no maneja dólares"` y el mismo fondo
`bg-gray-50` que ya usa el resto de las celdas deshabilitadas de la grilla (Decisión 2 original) —
mismo lenguaje visual, no uno nuevo. No hace falta tocar el useEffect de `PedidoNuevo.jsx` que ya
fuerza `monedaLinea` a `'ARS'` al elegir un proveedor sin dólares: eso ya existía y sigue siendo la
única fuente de verdad de si una línea "puede" estar en USD — este cambio es sólo de si la CELDA se
ve o no, nunca de la lógica de negocio.

**Decisión no obvia — se aplicó también a `variant="card"`:** el pedido del usuario habla de
"columnas", que en sentido estricto sólo existen en la grilla (`variant="grid"`); la tarjeta apilada
no tiene columnas, tiene filas de pares etiqueta:valor. Se decidió aplicar el mismo criterio ahí
también (la fila "Línea en USD" siempre visible, checkbox deshabilitado si el proveedor no maneja
dólares) en vez de dejarla condicional como estaba, para que el mismo ítem no muestre capacidades
distintas según se lo mire en la grilla (`xl` para arriba) o en la tarjeta (por debajo de `xl`) — de
lo contrario, agrandar o achicar la ventana alrededor del breakpoint haría "aparecer y desaparecer"
la posibilidad de marcar USD, que es exactamente el tipo de salto que el pedido del usuario buscaba
eliminar. Riesgo bajo: no cambia ningún handler ni el modelo de datos, sólo si el control se
renderiza deshabilitado o no.

**Verificado con Playwright contra el dev stack real** (`localhost:5173`/`:8080`, `jefe@vivero.com`,
negocio Herramientas, proveedores SHIMURA —maneja dólares— e INGCO —no maneja dólares—, en la misma
sesión de pruebas):
- A 1366px, con SHIMURA y con INGCO, el encabezado de la grilla mide exactamente el mismo ancho
  (`1042px`) y la misma cantidad de columnas (`colCount: 10`) en los dos casos — cero salto de
  layout al cambiar de proveedor.
- Prueba interactiva (no sólo con datos precargados): elegir SHIMURA en el `<select>` real, tildar
  el checkbox USD de la primera línea (pasa a `checked: true`), y CAMBIAR el `<select>` a INGCO en
  caliente — el checkbox pasa a `disabled: true, checked: false` con el título correcto, y la
  cantidad de columnas del encabezado se mantiene en 10. Confirma que el useEffect existente de
  normalización de moneda (`monedaLinea` forzado a `'ARS'` sin proveedor USD) sigue intacto.
- Con INGCO se ve la columna USD completa (encabezado + celdas grises deshabilitadas) en la
  captura `img/verif-1366-sin-usd.png`; con SHIMURA, `img/verif-1366-con-usd.png`.

### Decisión 11 — El campo de producto pierde su borde en reposo; aparece con hover o al editar

**Qué pidió el usuario (verbatim):** *"Me gustaría que no esté el borde de la barra de búsqueda sino
que apareciera cuando paso por arriba del mouse o cuando aprieto el botón cambiar."*

**Qué había en `ProductoSearchSelect.jsx`:** el botón (estado "reposo", no editando) tenía
`border-gray-200` siempre visible, con `hover:border-emerald-300` como único cambio al pasar el
mouse — el borde nunca desaparecía.

**Qué cambia:** en el estado de reposo sin error, el botón pasa a `border-transparent
bg-transparent`; al hacer `hover` gana `border-emerald-300 bg-white` (mismo color de acento que ya
usaba antes, ahora además con el fondo blanco "levantando" el campo — mismo lenguaje de afordancia
que `gridCellInput` ya usa en `FilaItemPedido.jsx` para las celdas numéricas: "la celda levanta y se
anuncia como editable"). El estado de búsqueda/edición (`buscando`, disparado por "Cambiar" o por
elegir "+ Crear producto nuevo…") ya tenía borde siempre visible desde antes — ese caso cumplía el
pedido sin tocarlo.

**Dos excepciones deliberadas, no tocadas:**
- **Error de validación (`hasError`):** borde rojo (`border-red-300`) SIEMPRE visible, no sólo al
  hover — un error tiene que poder verse sin pasar el mouse por encima, mismo criterio que el resto
  de la grilla (las celdas de error usan `bg-red-50` fijo, nunca condicionado a hover).
- **Deshabilitado (gate de proveedor, `disabled`):** sin cambios — conserva su borde gris siempre
  visible con `opacity-60`. No hay interacción de hover posible en ese estado (el botón ni siquiera
  dispara `onClick`), así que no había ningún caso que journalizar ahí.

**Verificado con Playwright** (capturas `img/verif-producto-reposo.png`,
`img/verif-producto-hover.png`, `img/verif-producto-editando.png`, 1366px, proveedor SHIMURA): en
reposo el nombre del producto se lee como texto plano junto al link "Cambiar", sin caja visible; al
pasar el mouse aparece el borde esmeralda con fondo blanco; al hacer clic en "Cambiar" aparece el
input de búsqueda con su borde de siempre.

### Verificación adicional (no pedida explícitamente, pero exigida por el brief de esta ampliación): botón de eliminar

El brief de esta ampliación pidió explícitamente confirmar que el botón de eliminar (`Trash2`) del
mockup — cortado contra el borde de la tarjeta — **no** se reproduce en la implementación real. Se
midió con Playwright contra el dev stack real: con el tamaño original del botón (`p-2` + `w-4 h-4`,
32px de ancho) dentro de la columna "Quitar" de 36px con `px-2` de padding de celda (20px de caja de
contenido), el borde derecho del botón quedaba a **~2-3.5px** del borde de la grilla en 1366px — no
llegaba a cortarse (no hay overflow ni scroll horizontal), pero era un margen demasiado ajustado
para el "suficiente padding a la derecha" que pidió el usuario.

**Se redujo el botón** (`FilaItemPedido.jsx`, `botonQuitar`) de `p-2`/`w-4 h-4` a `p-1.5`/`w-3.5
h-3.5` — mismo tamaño que ya usa el botón de quitar descuento dentro de `PanelDescuentosLinea.jsx`,
así que no introduce una escala de ícono nueva en la pantalla. Ancho del botón: 32px → 26px. **No se
tocó el ancho de la columna "Quitar" (36px)**: agrandar la columna hubiera roto el presupuesto de
ancho a 1280px, que ya estaba validado SIN holgura (`scrollWidth === clientWidth`, cero margen) —
sumar aunque sea un puñado de píxeles ahí habría reabierto el recorte que la Decisión 7 original
cerró. Reducir el botón en cambio no cuesta nada de ancho total.

**Verificado con Playwright** en 1280px, 1366px y 1600px, con el proveedor USD (10 columnas, caso
más exigente): el margen entre el borde derecho del botón y el borde derecho de la grilla es de
**5.5px** en los tres anchos, sin overflow horizontal en ningún caso (`document.body.scrollWidth`
nunca excede el viewport).

### Alcance respetado

Sólo se tocaron los 5 archivos ya en alcance de este change (`PedidoNuevo.jsx`,
`FilaItemPedido.jsx`, `ProductoSearchSelect.jsx` — `CeldaDescuentos.jsx` y
`PanelDescuentosLinea.jsx` no necesitaron cambios en esta ampliación, ya cumplían lo pedido desde el
grupo 4). No se tocó `DashboardLayout.jsx` ni ningún archivo del sidebar (pedido explícito: "el menú
de la izquierda no lo cambies"). No se tocó `pedidoCosteo.js` ni ningún archivo de `backend/`. El
breakpoint `xl` no se movió — se verificó que sigue intacto en la misma medición de columnas
(`colCount: 10` estable en 1280/1366/1600px).

## Ampliación 2 (segunda ronda post-12.3) — 5 puntos de feedback sobre lo ya aprobado

Con la Ampliación anterior (Decisiones 10/11) ya implementada y en revisión, el usuario pidió una
ronda más de ajustes puntuales antes de dar el OK final de archivo, verbatim: *"Al seleccionar un
input numerico veo que la celda de la grilla no tiene el mismo height que el input sino que es mas
alta y sobra espacio innecesario... Ademas hay en el cabezal de la columna ENVÍO el porcentaje sale
abajo de la palabra y no al lado, Ademas agregale un poco de color, se siente muy apagada... Ademas
remarca los bordes aun mas y saca la columna de USD de los proveedores con la configuracion en donde
no usen USD."* Cinco puntos, tratados como continuación del mismo change (mismo criterio que la
ampliación anterior). Verificado con Playwright contra el dev stack real (`localhost:5173`/`:8080`,
`jefe@vivero.com`, negocio Herramientas, proveedores SHIMURA —maneja dólares— e INGCO —no maneja
dólares—) en esta misma corrida; los scripts y capturas usados para medir fueron borrados al
terminar (no forman parte del repo).

### Decisión 12 — Altura de celda vs. input: el padding duplicado de la celda "Producto", no el
tamaño de los valores

**Diagnóstico (no una elección estética, una causa raíz encontrada leyendo el layout real):** cada
celda de una fila de la grilla es un *grid item* con `align-items: stretch` (default de CSS Grid),
así que toda la fila se estira al alto de su celda más alta. La celda "Producto" tenía padding
**duplicado**: `px-2 py-2` en el `<div>` contenedor (`FilaItemPedido.jsx`) **más** `px-2 py-2` propio
del botón de `ProductoSearchSelect` — dos capas de 16px verticales en vez de una, dando ~52px de alto
contra los ~36px de un input numérico de una sola capa. Esa celda, presente en todas las filas,
terminaba fijando el alto de la fila entera; el input de Cantidad/Costo/IVA/Envío, que es `block` y
no se estira, quedaba pegado arriba con el resto del alto libre abajo — más visible al enfocar porque
el `ring` sólo dibuja el contorno del input, nunca el de la celda completa.

**Qué se eligió (de las dos opciones que planteó el usuario) y por qué:** reducir padding, no subir
el tamaño de los valores. Subir el tamaño de los números (`text-sm` → `text-base`) ya se había
descartado explícitamente en la Decisión 3 original de este mismo `design.md` ("los valores
numéricos NO suben de tamaño... reabriría el recorte a 1366px") — nada cambió esa razón entre
rondas, así que reabrir esa decisión sólo para resolver un problema de padding hubiera sido
contradictorio. Reducir padding, en cambio, no cuesta ancho (Decisión 7 sigue intacta) y ataca la
causa real.

**Qué se tocó, en los 5 archivos:**
- `ProductoSearchSelect.jsx`: el botón en reposo baja de `py-2` a `py-1.5` (las dos variantes,
  producto existente y pendiente) — saca la capa de padding duplicada de raíz. De paso queda
  alineado con `inputClassCard`, que ya usaba `py-1.5` desde antes.
- `FilaItemPedido.jsx`, celda "Producto" (`variant="grid"`): pierde su `py-2` propio (queda sólo
  `px-2`), delegando el alto vertical enteramente al botón que envuelve.
- `FilaItemPedido.jsx`, `inputClassGrid()`: `py-2` → `py-1.5`, aplicado igual en las cuatro celdas
  numéricas (cantidad, costo unit., IVA %, envío %) vía la misma función — no hay forma de que quede
  una distinta de las demás.
- `FilaItemPedido.jsx`, `gridCellInput()`: pasa de `block` a `flex flex-col justify-center`. Esto es
  la segunda pata de la solución, defensiva: aunque el padding ya no duplique, el alto de una fila
  puede seguir viniendo de OTRA celda más alta por contenido real (ej. Descuentos con chips, o el
  costo total con la nota USD en dos líneas) — centrar el input (y su texto de error, si lo hay)
  reparte ese sobrante arriba/abajo en vez de dejarlo todo abajo.
- Mismo tratamiento (`flex flex-col justify-center`) en la celda "Producto" y en la celda "Costo
  total", por la misma razón.
- Bordes de celda subidos de paso (ver Decisión 14) porque se tocaban las mismas clases.

**Medido con Playwright contra el dev stack real, foco en el input de Cantidad de la primera fila
(SHIMURA, 1366px):**
- Antes de este ajuste no se volvió a medir el estado viejo (ya no existía en el código), pero la
  cadena de causas de arriba se confirma con la medición del estado NUEVO: en una fila cuyo alto
  queda gobernado por la celda de Costo total con nota USD en dos líneas, la celda de Cantidad mide
  48.5px de alto contra 32px del input — la diferencia (16.5px) queda repartida **simétricamente**,
  8.25px arriba y 8.25px abajo (`gapArriba: 8.25, gapAbajo: 8.25`), en vez de los ~16px concentrados
  abajo que había antes de este ajuste.
- En una fila "normal" (sin nota USD, con 1 descuento — el caso más común), el alto de fila baja a
  41px, la celda de Cantidad a 40px, el input a 32px, con un sobrante de sólo 4px arriba y 4px abajo
  (`gapArriba: 4, gapAbajo: 4`) — prácticamente imperceptible.
- En ambos casos el sobrante quedó centrado, nunca todo concentrado en un extremo — el efecto visual
  reportado por el usuario ("sobra espacio hacia abajo") queda resuelto incluso en las filas donde
  matemáticamente sigue habiendo algún sobrante (por contenido real de una celda vecina, no por
  padding desperdiciado).

### Decisión 13 — Encabezado "ENVÍO %" en una sola línea

**Diagnóstico:** a igual ancho de columna (60px) y mismo tratamiento tipográfico, "IVA %" (5
caracteres) entraba con margen mientras "ENVÍO %" (7 caracteres, con tilde) no — envolvía en dos
líneas ("Envío" arriba, "%" abajo).

**Qué se tocó:** ancho de columna reasignado entre las dos, no agregado — IVA % baja de 60px a 56px
(le sobraba) y Envío % sube de 60px a 64px. La SUMA no cambia, así que el presupuesto de ancho medido
en la sección "Medición final" de arriba (868px mínimo con USD, exacto a 1280px) sigue válido sin
tener que volver a remedir la grilla entera — sólo se remidieron los tres viewports de siempre para
confirmarlo (ver tabla abajo). Además, sólo en estas dos columnas: `px-2`→`px-1` (más aire de
contenido) y se saca `tracking-wider` (el resto de los encabezados lo conserva). `whitespace-nowrap`
agregado como garantía dura en las dos: si el ancho quedara corto por un puñado de píxeles en algún
navegador/fuente, el texto se recorta contra el borde vecino en vez de volver a partirse en dos
líneas.

**Medido con Playwright:** a 1366px, el `<span>` del encabezado "Envío %" mide `width: 64` (el ancho
de columna completo) con `scrollWidth: 63` — el contenido entra con 1px de margen, en una sola línea
(`height: 28`, la misma altura que cualquier otro encabezado de una sola línea). Confirmado también
visualmente en capturas a 1280/1366/1600px: "ENVÍO %" en una sola línea en los tres viewports, con
proveedor SHIMURA (caso de 10 columnas, el más ajustado).

### Decisión 14 — Más color: chips de descuento, encabezados y botón de eliminar

**Regla seguida en los tres casos:** ningún color nuevo — se reusó paleta que la propia app ya usa en
componentes equivalentes (grepeado antes de tocar nada), para que la grilla de pedidos no termine
hablando un lenguaje de color distinto del resto del sistema.

- **Chips de descuento** (`CeldaDescuentos.jsx`): `bg-gray-100 text-gray-600` (neutro) → `bg-emerald-50
  text-emerald-700`. Tomado tal cual del badge "USD" de `PerfilBadges` en `Proveedores.jsx`
  (`bg-emerald-50 text-emerald-700 text-[11px] font-medium`) — mismo par que la app ya usa para
  "atributo activo/positivo" de un proveedor. Confirmado con Playwright: color de fondo computado
  `oklch(0.979 0.021 166.113)` y de texto `oklch(0.508 0.118 165.612)`, exactamente los valores de
  Tailwind `emerald-50`/`emerald-700`.
- **Encabezados de columna:** `bg-gray-50 text-gray-600 font-semibold` → `bg-gray-100 text-gray-700
  font-bold`. Tomado del patrón de encabezado "con más peso" que ya usa `FacturaCliente.jsx`
  (`thead className="bg-gray-100 ... text-gray-700 ... border-b-2 border-gray-300"`), en vez de
  inventar un color nuevo para esta pantalla — la mayoría de los `<thead>` de la app usan la versión
  más suave (`bg-gray-50`/`text-gray-500`, ver `Cheques.jsx`/`Finanzas.jsx`/`Clientes.jsx`), pero esa
  variante más marcada YA es parte del vocabulario visual del sistema, no una invención de esta
  ronda. La línea inferior del encabezado sube un escalón más (`border-gray-300`→`border-gray-400`)
  que el resto de las reglas de la grilla, a propósito: la frontera header/filas queda la más
  marcada de todas (jerarquía visual esperada).
- **Botón de eliminar** (`Trash2`, `FilaItemPedido.jsx`): se evaluaron las dos alternativas que
  planteó el usuario. Antes de elegir se grepeó cómo tratan el mismo botón el resto de las pantallas
  de la app (`Proveedores.jsx`, `Productos.jsx`): TODAS usan el mismo patrón hover-to-red
  (`text-gray-400 hover:text-red-600 hover:bg-red-50`, gris en reposo, rojo sólo al pasar el mouse).
  Pasar a "rojo siempre visible" en esta pantalla habría roto esa convención sin necesidad real —
  se eligió en cambio subir un escalón el gris de reposo (`gray-400`→`gray-500`, confirmado con
  Playwright: color computado `oklch(0.551 0.027 264.364)`, exactamente Tailwind `gray-500`) para que
  deje de leerse "apagado" sin introducir un tratamiento que ningún otro botón de eliminar de la app
  usa.

### Decisión 15 — Bordes más marcados

**Qué:** un escalón más de intensidad en todos los separadores de la grilla y (por paridad, Decisión
9) de las tarjetas `< xl`: `border-gray-200`→`border-gray-300` (reglas verticales de columna, borde
inferior de fila, marco exterior de la grilla, marco de cada tarjeta) y `border-gray-100`→
`border-gray-200` (separadores entre pares etiqueta:valor dentro de una tarjeta, panel de descuentos
`PanelDescuentosLinea.jsx`). El separador header/filas sube un escalón más todavía
(`border-gray-400`, ver Decisión 14) para quedar como la línea más marcada de la jerarquía. El anillo
de hover de una celda editable (`hover:ring-gray-300`→`hover:ring-gray-400`) también sube un
escalón, para seguir leyéndose distinto de la regla de base ahora que ésta subió a `gray-300`.

**Verificado con Playwright:** color computado de `border-left` de una celda de datos y de
`border-bottom` de una fila, ambos `oklch(0.872 0.01 258.338)` — exactamente Tailwind `gray-300`.

### Decisión 16 — Revert de la Decisión 10: la columna USD vuelve a ser condicional por proveedor

**Qué pidió el usuario (verbatim):** confirmó explícitamente, ante una pregunta directa, que quiere
volver atrás sobre la Decisión 10 de la ampliación anterior — la columna USD (checkbox "línea en
dólares") vuelve a aparecer/desaparecer según `proveedorSeleccionado.manejaDolares`, en vez de estar
siempre presente con el checkbox deshabilitado.

**Cómo se revirtió (mecanismo original, no reinventado):** se recuperó de `git show
ae4e062:frontend/src/pages/PedidoNuevo.jsx` (el commit previo a `pedido-grilla-visual`, con el
mecanismo de `pedido-planilla-editable` intacto) el patrón de dos plantillas condicionales —
`gridColsClass = manejaDolares ? GRID_COLS_USD : GRID_COLS` — y el idiom `{manejaDolares && (...)}`
envolviendo la celda entera, tanto en el encabezado (`PedidoNuevo.jsx`) como en la fila (ambas
variantes de `FilaItemPedido.jsx`, `grid` y `card`). El checkbox deja de necesitar distinguir
"deshabilitado por gate de proveedor" de "deshabilitado por no manejar dólares" (`disabled ||
!manejaDolares`): si la celda existe, el proveedor maneja dólares, así que sólo queda el gate normal
(`disabled`) — se sacó el código muerto de la versión "siempre presente" (el `title` condicional, el
`bg-gray-50` atado a `!manejaDolares`). El resto de la ampliación anterior (Decisión 11: borde del
campo de producto sólo en hover/edición; botón de eliminar más chico) **se mantiene sin cambios** —
sólo se revirtió la columna USD.

`GRID_COLS`/`GRID_COLS_USD` recuperan los anchos de la sección "Medición final" de arriba (9 y 10
columnas respectivamente), con el ajuste IVA/Envío de la Decisión 13 ya incorporado:

```
GRID_COLS     = grid-cols-[32px_minmax(190px,2.2fr)_64px_100px_minmax(150px,1.1fr)_56px_64px_132px_36px]
GRID_COLS_USD = grid-cols-[32px_minmax(190px,2.2fr)_64px_44px_100px_minmax(150px,1.1fr)_56px_64px_132px_36px]
```

**Verificado con Playwright contra el dev stack real**, proveedor CON dólares (SHIMURA) y SIN dólares
(INGCO), en la misma corrida:

| Viewport | SHIMURA (con USD) | INGCO (sin USD) |
|---|---|---|
| 1280px | `headerWidth 956, scrollWidth 956, cols 10` — sin overflow | `headerWidth 956, scrollWidth 956, cols 9` — sin overflow |
| 1366px | `headerWidth 1042, scrollWidth 1042, cols 10` — sin overflow | `headerWidth 1042, scrollWidth 1042, cols 9` — sin overflow |
| 1600px | `headerWidth 1276, scrollWidth 1276, cols 10` — sin overflow | `headerWidth 1276, scrollWidth 1276, cols 9` — sin overflow |

En los seis casos `scrollWidth === headerWidth === viewport` (`document.body.scrollWidth` nunca
excede el viewport): la grilla nunca se recorta ni desborda, ni con la columna USD presente ni
ausente. La columna USD efectivamente desaparece para INGCO (`tieneUSD: false`, 9 columnas) y las
columnas flexibles (Producto, Descuentos) absorben el ancho liberado en vez de dejar un hueco — mismo
comportamiento que tenía `pedido-planilla-editable` antes de la Decisión 10.

**El punto de recorte a 1366px (y a 1280px) no cambió:** sigue siendo exacto a 1280px
(`scrollWidth === clientWidth`, cero holgura) y con holgura a 1366/1600px, igual que documentado en
"Medición final" — el revert de la Decisión 10 y el reajuste IVA/Envío de la Decisión 13 se
compensaron entre sí (una resta 44px en el caso sin USD, la otra no toca la suma total), así que no
hizo falta volver a mover ninguna otra pista para mantenerlo.

## Ampliación 3 (tercera ronda post-12.3) — popover flotante de descuentos + más color en "Quitar"

Con la Ampliación 2 (grupo 14 de tasks.md, Decisiones 12-16) todavía sin el OK final del usuario
(checkpoint 14.9 pendiente), el usuario pidió dos ajustes más mientras seguía revisando la
pantalla, verbatim: *"Al agregar o abrir los descuentos no hace falta que se abra una ventana que
ocupe todo el ancho de la tabla sino que se habra una ventana flotante que salga de la celda de
descuentos como que se desplaze hacia abajo y que no sea del ancho de la grilla sino lo suficiente
para mostrar los descuentos y sus porcentajes"* — y, aparte, más color de reposo en el botón de
eliminar. Se tratan como una tercera ampliación del mismo change, no un change nuevo.

### Decisión 17 — El editor de descuentos pasa de sub-fila `col-span-full` a popover flotante

**Qué había:** `PanelDescuentosLinea` se renderizaba, en `variant="grid"`, como una sub-fila
`col-span-full` dentro del grid de la propia fila (Decisión 5 de este mismo `design.md`, sección
original) — ocupaba el ancho completo de la grilla (hasta 1042px a 1366px con proveedor USD).

**Qué pidió el usuario, resuelto cómo:** un popover flotante, angosto, que "sale" de la celda de
descuentos y se despliega hacia abajo. Implementado en `FilaItemPedido.jsx`:

- `createPortal` monta el popover directamente en `document.body`, FUERA del árbol de la grilla.
- `position: fixed`, calculada desde `getBoundingClientRect()` de la celda de descuentos de esa
  fila (`descuentosAnchorRef`), alineado a su borde izquierdo, desplegado hacia abajo por default.
- Ancho `min-w-[280px] max-w-[360px] w-max` — lo suficiente para nombre + % + botones de una lista
  de 1-3 descuentos, medido en la verificación: `357px` reales con dos descuentos cargados
  ("Volumen 5%", "Pronto pago 3%"), dentro del rango.
- Sólo aplica a `variant="grid"`. En `variant="card"` el panel se sigue mostrando inline debajo de
  la tarjeta, sin cambios: una tarjeta ya es una columna angosta de ancho completo — no hay "ancho
  de la tabla" del que escapar ahí, y un popover no resolvería ningún problema real en ese layout.
- El aviso de auto-ratchet y el sub-formulario de producto pendiente (`creandoAqui`) **no se
  tocaron**: siguen siendo `col-span-full` inline, mismo `subFilaWrap`, mismas condiciones de
  disparo — el pedido del usuario fue específicamente sobre el panel de descuentos.

**El conflicto de z-index que había hecho descartar un popover en `pedido-planilla-editable`
(resuelto, no ignorado):** aquel change original evaluó un popover para esto y lo descartó por (1)
conflicto de `z-index` contra el dropdown de `ProductoSearchSelect` (`z-20`) y (2) el usuario venía
de salir de un diseño en modal. El motivo (2) ya no aplica (pedido explícito y consciente de volver
a un flotante). El motivo (1) se resuelve de raíz, no se esquiva: al montar el popover con
`createPortal` en `document.body`, queda completamente FUERA del árbol de la grilla — nunca
comparte contexto de apilamiento con el `sticky z-10` del encabezado de la grilla (Decisión 6) ni
con el `absolute z-20` del dropdown de `ProductoSearchSelect` (ambos siguen viviendo DENTRO de la
grilla). Se le da `z-index: 30` (mayor que los dos) para que, si en algún momento llegara a
superponerse en pantalla con cualquiera de los otros dos, gane el que el usuario acaba de abrir.

**¿Pueden coexistir dos flotantes de filas distintas al mismo tiempo?** Sí, geométricamente no se
pisan (cada uno se posiciona en un punto distinto de la pantalla, nunca comparten celda ni
columna) — verificado con Playwright: popover de descuentos de la fila 2 + dropdown de producto de
la fila 4 abiertos a la vez, sin solape de sus cajas (`boundingBox`). Con una salvedad de
mecanismo, no de diseño visual: el popover de descuentos SE CIERRA solo con cualquier click afuera
(Decisión de abajo), así que si se abre el popover de descuentos PRIMERO y después se hace click en
el buscador de otra fila, ese click cuenta como "afuera" y cierra el popover — el orden correcto
para verlos juntos es abrir el buscador de producto primero (no tiene cierre por click-afuera propio,
no se tocó en este change) y el popover de descuentos después. Esto es intencional, no una
limitación: es el mismo comportamiento estándar de "abrir algo nuevo cierra el flotante anterior"
que tiene cualquier menú/popover del sistema, y es consecuencia directa de agregar click-outside
(pedido explícito de esta ronda) — antes de este cambio, el mecanismo viejo (`Set` de `lineaId`
expandidos) sí permitía dejar varias sub-filas de descuentos abiertas a la vez sin que ninguna
cerrara a la otra; con un popover flotante y click-outside, "abrir uno cierra al anterior" es el
comportamiento esperado por el usuario al pedir explícitamente el cierre por click afuera.

**Dropdown "inteligente" (abre hacia abajo, sube si no entra):** se evaluó si valía la pena esa
complejidad (ver el brief de esta ronda) — se implementó porque el costo fue bajo y el caso de uso
real (grilla de 12-40 ítems, filas cerca del borde inferior de la ventana) sí ocurre. Mecanismo en
dos pasadas para evitar parpadeo: 1) al abrir, se calcula una posición con el tamaño ESTIMADO (o el
último real conocido); 2) en el mismo ciclo, `useLayoutEffect` corre antes del paint del navegador
y un `requestAnimationFrame` extra mide el tamaño REAL ya montado y corrige. Si no entra el alto
real por debajo de la fila Y hay más lugar arriba que abajo, se abre hacia arriba. No se agregó
scroll interno al popover: con pedidos de 30-40 ítems no se da el caso "no entra ni arriba ni
abajo" (un panel de pocos descuentos siempre encuentra lugar en alguna de las dos direcciones) —
sería complejidad sin caso de uso real hoy.

**Reposicionamiento en vivo:** el popover es `position: fixed`, así que NO sigue solo al
contenedor que realmente scrollea (`div.flex-1…overflow-x-hidden`, Decisión 6). Se escuchan
`scroll` (en fase de captura desde `window`, porque el evento no hace bubble pero sí se puede
capturar desde un ancestro) y `resize` de ventana mientras el popover está abierto, recalculando la
posición en cada uno.

**Cierre por click afuera y por Escape** (pedido explícito, sumado al toggle que ya existía en la
celda — mismo `Set` de `lineaId` de `PedidoNuevo.jsx`, sólo cambia CÓMO se renderiza el panel):
`Escape` corta la propagación del evento (`e.stopPropagation()`) porque `PedidoNuevo.jsx` tiene su
propio listener de `Escape` en `window` que cancela TODO el pedido (`handleVolver`) — sin cortar la
propagación, cerrar el popover con Escape también hubiera cancelado el pedido entero. `document` se
visita antes que `window` en la fase de bubbling, así que frenarlo ahí alcanza.

**Bug real encontrado y corregido en esta misma corrida** (no era parte del pedido original, lo
reveló la verificación con Playwright a 700px de viewport — no algo hipotético): las dos variantes
de `FilaItemPedido` para la misma fila (`grid` y `card`) están MONTADAS A LA VEZ — una oculta con
`hidden`/`xl:hidden` según el breakpoint activo, nunca desmontada — y comparten el mismo
`expandida` (mismo `lineaId` en el `Set` de `PedidoNuevo.jsx`). Sin guard, expandir los descuentos
desde la tarjeta (pantalla angosta) también "abría" el popover de la instancia `grid` oculta: su
ancla vive dentro de un ancestro `display:none`, así que `getBoundingClientRect()` devuelve todo en
cero, y el popover aparecía fantasma, fijo, en la esquina superior izquierda de la pantalla (un
portal escapa de `display:none` — no se oculta solo). Corregido: si el rect del ancla mide
`(0,0,0,0)`, el popover simplemente no se renderiza (`popoverStyle` se queda en `null`).
Reverificado con Playwright a 700px tras el fix: la tarjeta expande su panel inline como siempre y
no aparece ningún popover fantasma en ningún punto de la pantalla.

**Ancho elegido, sin build de por medio:** `min-w-[280px] max-w-[360px]` es un criterio de diseño,
no una medición exacta pedida — medido en la verificación en `357px` reales con 2 descuentos, se ve
proporcional (ni diminuto ni gigante) en las capturas tomadas contra el dev stack real.

**Verificado con Playwright contra el dev stack real** (`localhost:5173`/`:8080`,
`jefe@vivero.com`, negocio Herramientas, proveedor SHIMURA — maneja dólares, 10 columnas, caso más
exigente — borrador de 12 ítems mezclados con 0/1/2 descuentos):
- Fila del medio: popover `357px` de ancho, se abre debajo de la fila (gap ~3px), no ocupa el ancho
  de la grilla (`1042px`). Cierra con click afuera.
- Fila cerca del borde inferior (viewport bajo a propósito + scroll de precisión dejando ~15px
  libres debajo de la fila): el popover se abre hacia ARRIBA (flip) y queda totalmente dentro del
  viewport. Escape lo cierra sin cancelar el pedido (URL se queda en `/pedidos/nuevo`).
- Popover de descuentos de una fila + buscador de producto abierto en otra fila, a la vez (orden:
  buscador primero): ninguno tapa al otro, sin solape geométrico medido (`boundingBox`).
- Agregar y quitar un descuento dentro del popover: el costo de la fila cambia en vivo
  (`costoFinalDeLinea`, sin tocar) y vuelve exactamente al valor original al quitar.
- Cero errores de consola/página durante todo el flujo.

### Decisión 18 — Más color de reposo en el botón "Quitar" (`Trash2`)

**Qué pidió el usuario:** más color en el ícono de eliminar EN REPOSO, no sólo al pasar el mouse.

**Tensión con la ronda anterior (grupo 14, punto 3c):** esa ronda había subido sólo un escalón el
gris de reposo (`gray-400`→`gray-500`), a propósito, para no romper el patrón "gris apagado hasta
el hover, rojo recién al pasar el mouse" que usan los demás botones de eliminar de la app
(`Proveedores.jsx`/`Productos.jsx`). Esta vez se prioriza el pedido directo del usuario sobre esa
consistencia — decisión consciente, no un olvido de la convención.

**Qué cambió:** `FilaItemPedido.jsx`, `botonQuitar` (una única definición compartida por
`variant="grid"` y `variant="card"`): `text-gray-500 hover:text-red-600` →
`text-red-400 hover:text-red-600`. Mismo par de tonos "rojo" que ya usa el resto de la app para
error/eliminar, ahora visible desde el reposo en vez de recién al hover. Verificado con Playwright:
color computado del ícono en reposo `oklch(0.704 0.191 22.216)`, exactamente Tailwind `red-400`.

### Alcance respetado (tercera ronda)

Los 5 archivos tocados son los mismos 5 ya en alcance del change completo (`PedidoNuevo.jsx` no
necesitó cambios en esta ronda — el popover se resolvió íntegramente dentro de
`FilaItemPedido.jsx`; `PanelDescuentosLinea.jsx` sólo cambió su fondo/sombra para verse elevado
como popover, sin cambios de contenido ni de API). No se tocó `pedidoCosteo.js`, `costeo.js`,
`DashboardLayout.jsx`/sidebar, ni ningún archivo de la sesión paralela
`venta-cliente-casual-herramientas` (`VentaRequestDTO.java`, `Venta.java`, `VentaServiceImpl.java`,
`ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`) — confirmado por `git status`/`git diff`.
Ningún handler, prop, firma, validación ni cálculo de costo cambió: sólo `className`, estructura de
contenedores (el popover) y la posición del botón de eliminar en el árbol. Verificación hecha con
un borrador inyectado en `localStorage` de instancias efímeras de Playwright (nunca se envió el
formulario, cero registros nuevos en la base real); Playwright se instaló temporalmente en
`frontend/node_modules` sólo para esta corrida (`--no-save --no-package-lock`, confirmado que
`package.json`/`package-lock.json` no cambiaron) y se desinstaló al terminar; scripts y capturas de
esta verificación se borraron al terminar, no forman parte del repo. Sin build, sin commit.

### Alcance respetado (segunda ronda)

Los 5 archivos tocados son los mismos 5 ya en alcance del change completo. No se tocó
`DashboardLayout.jsx` ni ningún archivo del sidebar. No se tocó `pedidoCosteo.js`, `costeo.js` ni
ningún archivo de `backend/`. No se tocó ningún archivo de la sesión paralela
`venta-cliente-casual-herramientas` (`VentaRequestDTO.java`, `Venta.java`, `VentaServiceImpl.java`,
`ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`) — confirmado por `git status`/`git diff`
antes de tocar nada y de nuevo al terminar. Ningún handler, prop, firma, validación ni cálculo de
costo cambió: sólo `className`, estructura de contenedores y las dos constantes de plantilla de
columnas. Verificación hecha con un borrador inyectado en `localStorage` de una instancia efímera de
Playwright (nunca se envió el formulario, cero registros nuevos en la base real); los scripts y
capturas de esta verificación se borraron al terminar, no forman parte del repo. Sin build, sin
commit.

## Ampliación 4 (cuarta ronda) — sacar la confirmación de "producto nuevo"; fix del popover que se
abría solo

Con el checkpoint 16.4 todavía pendiente (verificación en vivo del popover de "producto nuevo" del
grupo 16 incompleta — dos agentes se habían colgado probándolo), el usuario reportó dos problemas
nuevos sobre esa misma pantalla, verbatim (traducido):

1. *"Cuando selecciono el boton de usar esta linea al crear un producto desde pedido se abre el
   modal de descuentos por una razon"* — el popover de descuentos se abría solo, sin que el usuario
   tocara la celda de descuentos.
2. *"No me gustaría tener que confirmar por cada producto nuevo 'usar esta linea' ... sino que
   automaticamente se ponga la etiqueta nuevo para que no sea engorroso"* — fricción de tener que
   confirmar un segundo paso ("Usar en esta línea") después de ya haber tipeado el nombre en el
   buscador.

Investigados juntos porque comparten la misma causa raíz: el popover de "producto nuevo" del grupo
16 (confirmación con re-tipeo del nombre + botón "Usar en esta línea") es exactamente el paso que
generaba ambos síntomas — el popover en sí (síntoma 2) y el auto-expandir del popover de descuentos
al confirmarlo (síntoma 1, hipótesis confirmada por lectura de código antes de tocar nada: el
`confirmarProductoPendiente` de `PedidoNuevo.jsx` llamaba a `expandirLinea(lineaId)` si la línea
recién confirmada traía descuentos por defecto del proveedor — código heredado de `tarea 4.6` de
`pedido-planilla-editable`, de cuando el panel de descuentos era una sub-fila inline discreta; desde
que pasó a ser un popover flotante (Decisión 17, Ampliación 3) esa misma auto-expansión se sentía
como una ventana apareciendo sola). Solución elegida: eliminar el paso de confirmación entero en vez
de parchear el síntoma 1 por separado — saca ambos problemas de raíz con un solo cambio, y es
exactamente lo que pidió el usuario en el punto 2.

### Decisión 19 — El popover de confirmación de "producto nuevo" se elimina; el clic en "+ Crear
producto nuevo…" ya alcanza

**Qué había (grupo 16 de tasks.md):** elegir "+ Crear producto nuevo…" en `ProductoSearchSelect`
abría un popover flotante (mismo mecanismo que el de descuentos, Decisión 17) con un campo de texto
que REPETÍA el nombre ya tipeado en el buscador, más un botón "Usar en esta línea" para confirmar.
Sólo al hacer clic ahí, `confirmarProductoPendiente` marcaba la línea como pendiente
(`productoNombreNuevo`) — y, si el proveedor tenía descuentos por defecto, además auto-expandía el
popover de descuentos (el bug del síntoma 1).

**Qué cambia:** el nombre YA se tipeó en el buscador (`textoBuscado`, el mismo `busqueda` de
`ProductoSearchSelect` en el momento del clic) — pedirlo una segunda vez era la fricción exacta que
el usuario señaló. La rama `productoId === '__nuevo__'` de `seleccionarProducto`
(`PedidoNuevo.jsx`) marca la línea como pendiente DIRECTAMENTE, sin ningún popover intermedio: un
solo clic en "+ Crear producto nuevo…" alcanza para que la línea muestre la etiqueta "Nuevo" con el
nombre tipeado, lista para seguir cargando cantidad/costo. `confirmarProductoPendiente` se elimina
por completo (junto con su auto-expandir del popover de descuentos — arreglando el síntoma 1 sin
tocar nada del mecanismo de auto-expandir al `+` explícito, que se conserva intacto). Se eliminó
también todo el mecanismo de popover flotante para "producto nuevo" en `FilaItemPedido.jsx`
(`productoAnchorRef`, `nuevoProductoPopoverRef`/`Style`,
`calcularPosicionNuevoProductoPopover`, los dos `useEffect`/`useLayoutEffect` de posicionamiento y
cierre, `subFormularioNuevoContenido`/`subFormularioNuevoPopover`) — código muerto ahora que no hay
ningún formulario que anclar ahí. `PackagePlus` se sacó de los imports de `lucide-react` de ese
archivo (sólo lo usaba ese formulario eliminado).

**¿Y si el usuario deja el buscador en blanco (o sólo espacios) y hace clic en "+ Crear producto
nuevo…"?** En la práctica no puede pasar por accidente: la opción "+ Crear producto nuevo…" sólo se
renderiza dentro del bloque `{busqueda && (...)}` de `ProductoSearchSelect.jsx` — hace falta haber
tipeado algo primero. Como guarda defensiva de todos modos (mismo mensaje de error que ya existía
en el viejo `confirmarProductoPendiente`), `seleccionarProducto` rechaza un nombre vacío tras
`trim()` con un toast de error y no toca la línea.

**¿Sigue siendo editable el nombre después, sin popover?** Sí — no es un gate. El botón "Cambiar" de
`ProductoSearchSelect` (el mismo que ya existía para reemplazar cualquier producto ya elegido)
reabre el buscador sobre una línea "pendiente de crear" tal cual lo hacía antes; el usuario puede
buscar de nuevo y elegir un producto existente o volver a crear uno con otro nombre. No se agregó
edición inline del nombre dentro del botón en reposo (habría sido una superficie de interacción
nueva no pedida) — el mecanismo de "Cambiar" ya cumplía el criterio de "editable después, no
obligatorio antes" sin tocarlo.

**Qué NO se tocó:** el resto de `seleccionarProducto` (rama de producto existente), la validación de
`validate()` (`!it.productoId && !it.productoNombreNuevo`), el armado del payload en `handleSubmit`
(`productoNombreNuevo` sigue viajando exactamente igual para una línea pendiente), y el mecanismo de
auto-expandir el popover de descuentos al clic explícito en el `+` de la celda de descuentos
(`onAgregarDescuento` en `propsFila`) — ese es un gesto directo del usuario sobre la celda de
descuentos, no un efecto colateral de crear un producto.

**Verificado con Playwright contra el dev stack real** (`localhost:5173`/`:8080`,
`jefe@vivero.com`, negocio Herramientas, proveedor INGCO — con descuentos por defecto
configurados): buscar un nombre sin coincidencias ("Producto Prueba XYZ 123"), clic en "+ Crear
producto nuevo…" → **PASS**, la línea queda "Nuevo" de inmediato, cero coincidencias de "Usar en
esta línea" en el DOM (el popover de confirmación ya no existe) y el popover de descuentos **no**
se abre solo. Clic explícito en el `+` de la celda de descuentos de otra línea → **PASS**, el
popover "Descuentos pactados" sigue abriendo normalmente (confirmado por DOM y captura). Cargar
cantidad/costo en la línea recién creada sin fricción → **PASS**. "Cambiar" reabre el buscador
sobre la línea pendiente → **PASS**. Payload interceptado (`POST /api/pedidos` abortado, cero
registros creados en la base real): `productoNombreNuevo: "Producto Prueba XYZ 123"`, sin
`productoId`, con los valores de descuento en cascada correctos. Cero errores de consola reales
(el único `net::ERR_FAILED` visto fue el abort intencional del POST interceptado). Verificación
hecha con Playwright instalado temporalmente (`--no-save --no-package-lock`) y desinstalado al
terminar; sin scripts ni capturas persistidos; sin build, sin commit.

**Hallazgo no relacionado, no tocado:** durante esta verificación se detectó que
`ProductoSearchSelect.jsx`, `PanelDescuentosLinea.jsx`, `CeldaDescuentos.jsx` y
`backend/.../PedidoServiceImpl.java` tienen diffs sin commitear sustanciales que **no** estaban
presentes al arrancar esta sesión ni fueron hechos por esta ronda (alcance de esta ronda: sólo
`PedidoNuevo.jsx`/`FilaItemPedido.jsx`). Ninguno de esos cuatro archivos está en la lista de
exclusión conocida de la sesión paralela `venta-cliente-casual-herramientas` — sugiere una
**tercera sesión concurrente** editando en vivo el mismo directorio `frontend/src/components/
pedidos/` (y `PedidoServiceImpl.java` en el backend) mientras corría esta ronda. Reportado al
usuario; no se tocó ni se investigó más a fondo por estar fuera del alcance declarado de esta
corrida.

### Alcance respetado (cuarta ronda)

Sólo se tocaron `PedidoNuevo.jsx` y `FilaItemPedido.jsx` (2 de los 5 archivos ya en alcance del
change completo) — `ProductoSearchSelect.jsx`, `CeldaDescuentos.jsx` y `PanelDescuentosLinea.jsx`
no necesitaron ningún cambio en esta ronda. No se tocó `backend/` (esta corrida fue 100% frontend
por instrucción explícita), `pedidoCosteo.js`, `costeo.js`, `DashboardLayout.jsx`/sidebar, ni
ningún archivo de la sesión paralela `venta-cliente-casual-herramientas`
(`VentaRequestDTO.java`, `Venta.java`, `VentaServiceImpl.java`, `ClienteAdHocDTO.java`,
`NuevaVenta.jsx`, `Productos.jsx`). `npx oxlint` sobre los archivos tocados: limpio. Sin datos de
prueba persistidos (verificación con borrador de `localStorage` de una instancia efímera de
Playwright, nunca se envió el formulario real). Sin build, sin commit.
