## Context

### Qué es "Facturación" en este sistema

`Facturación` no es la cuenta corriente. La cuenta corriente registra pagos contra ventas puntuales;
**Facturación es el documento formal que se le presenta al cliente**, con facturas que se abren y se
cierran por período. Eso define el criterio estético de todo este change: el resultado tiene que
poder imprimirse o mandarse por WhatsApp y leerse como un comprobante, no como un dashboard interno.

Dos pantallas:

| Ruta | Archivo | Rol |
|------|---------|-----|
| `/facturas` | `frontend/src/pages/Facturas.jsx` | Listado de clientes, puerta de entrada |
| `/facturas/:clienteId` | `frontend/src/pages/FacturaCliente.jsx` | Detalle, con pestañas `activa` / `historial` y exportación a imagen |

### Estado actual, medido (no estimado)

Todo lo que sigue se reprodujo contra el stack de desarrollo real (`docker compose`, `localhost:5173`
+ `:8080`, `jefe@vivero.com`), cliente **Sotomayor** (id 6, factura #12 ABIERTA con 4 ventas y 4
pagos, factura #11 CERRADA), midiendo el DOM con Playwright. Capturas de referencia del "antes" en
`img/repro-desktop-activa.png`, `img/repro-mobile-listado.png`, `img/repro-mobile-activa.png`,
`img/repro2-desktop-historial-expandido.png`.

**Listado `/facturas` a 390px:**

| Medición | Valor |
|---|---|
| Ancho del contenedor de la tabla | 356px |
| `scrollWidth` de la tabla (`min-w-[600px]`) | 600px |
| Recorte horizontal | **244px** |
| Botón "Factura Activa" | **completamente fuera de pantalla** |

La única acción de la pantalla es inalcanzable sin scrollear de costado. Esto no es una regresión: el
change `2026-08-24-facturacion-responsive-mobile` resolvió el problema **agregando** `overflow-x-auto`
(su tarea 1.1). El scroll horizontal es la solución anterior, y es la que el usuario ahora rechaza.

**Detalle de factura activa a 1366px:** cuatro tarjetas independientes, cada una con
`bg-white rounded-xl border border-gray-200 shadow-sm`, separadas por `space-y-6` sobre el
`bg-gray-50` de la app: (1) cabecera con título y botonera, (2) grilla de 4 indicadores con **fondo de
color pleno** (`bg-emerald-50/50`, `bg-red-50`), (3) tabla "Detalle de Artículos", (4) tarjeta
flotante "Total a Pagar" alineada a la derecha. Es exactamente la descripción del usuario:
"contenedores separados con bordes redondeados como si estuvieran flotando".

**Historial expandido — el bug, con números:**

| Medición | Pestaña "activa" | Historial expandido | Δ |
|---|---|---|---|
| Borde izquierdo del contenido (desktop 1366px) | 299px | **365px** | **+66px** |
| Ancho del contenido | 1024px | **958px** | **−66px** |
| Ancho de la tabla de artículos | 1022px | **956px** | −66px |
| Borde izquierdo (mobile 390px) | 16px | **50px** | **+34px** |
| Recorte horizontal de la tabla (mobile) | 426px | **460px** | +34px |
| Scrollers horizontales anidados sobre la tabla | 1 | **2** | +1 |

El contador de la pestaña dice `Historial (2)` mientras renderiza **1** tarjeta.

### Restricciones duras que gobiernan el change

1. **`capturarNodoComoImagen` y `esperarProximoFrame` no se tocan.** Se arreglaron en esta sesión
   tras dos bugs difíciles (imagen en blanco por herencia de `position: fixed`, columnas faltantes en
   mobile por estilos computados congelados). Sus comentarios explicativos se conservan íntegros.
   Este change cambia **qué** se captura, nunca **cómo**.
2. **Cero pérdida de funcionalidad.** Registrar Pago, Agregar Concepto, Descargar, Cerrar Factura,
   Abrir Factura Manualmente, rechazo de pagos y ambos modales siguen funcionando igual. Ningún
   handler, estado, firma, cálculo ni payload cambia.
3. **Cero pérdida de color.** Todo color semántico que hoy comunica algo (deuda roja, pago parcial
   naranja, abonado verde, pago rechazado tachado en rojo) sigue comunicando lo mismo.
4. **Reglas duras del proyecto**: `cursor-pointer` en todo botón, íconos `lucide-react`, feedback vía
   `useUIStore` (nunca `alert`/`confirm`), PascalCase, DTOs en backend, `Controller → Service →
   Repository`. No buildear ni commitear sin pedido explícito.
5. **Sesión paralela en el mismo working directory.** Hay cambios sin commitear de otra sesión en
   `VentaRequestDTO.java`, `Venta.java`, `VentaRepository.java`, `ChequeServiceImpl.java`,
   `VentaServiceImpl.java`, `ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`,
   `ComprobanteVentaModal.jsx`. **No se tocan ni se usan de referencia.**

### La referencia visual

`img/ejemplo factura.png` es un mockup aproximado provisto por el usuario, que aclaró explícitamente
que "le faltan cosas como el total abajo de la grilla y demás". Lo que sí es vinculante de esa imagen:

- **Un panel único**, no tarjetas flotando con aire entre ellas.
- **Indicadores con barra de acento a la izquierda** (azul / verde / rojo), no fondo de color pleno ni
  card redondeada aparte.
- **Tabla con bordes de fila limpios**, no filas como pill separadas.
- Cabecera con título de factura a la izquierda y botonera a la derecha, en la misma línea.

Lo que **no** es vinculante: la cantidad de indicadores (el mockup muestra 3, la app tiene 4), la
ausencia del total al pie (el propio usuario lo señala como falta del mockup), y los datos de ejemplo.

## Goals / Non-Goals

**Goals:**

- Que `/facturas` no requiera **ningún** scroll horizontal en mobile y que la acción principal sea
  alcanzable con el pulgar.
- Que la factura activa se lea como un documento de papel serio, conservando el 100% de la
  funcionalidad y del color semántico actuales.
- Mostrar el teléfono del cliente en la factura y en la tarjeta mobile del listado.
- Que el detalle del historial se abra **centrado y con el mismo ancho** que la factura activa, y que
  la lista de facturas cerradas tenga el mismo nivel de cuidado visual que el resto.
- Que la exportación a imagen siga produciendo la misma calidad de resultado que hoy (sin reabrir el
  bug de recorte ni el de imagen en blanco).

**Non-Goals:**

- No se rediseña el sidebar, la barra superior ni ningún otro módulo.
- No se toca la lógica de negocio de facturación: apertura, cierre, cálculo de totales, filtrado de
  pagos `RECHAZADO`, conceptos, ni ningún endpoint más allá de agregar un campo al DTO de respuesta.
- No se agrega paginación, filtros nuevos ni ordenamiento nuevo al listado.
- No se implementa exportación a PDF (sigue siendo PNG vía `html-to-image`).
- No se toca `capturarNodoComoImagen` / `esperarProximoFrame`.
- No se crea ningún campo nuevo en el modelo de datos.

## Decisions

### Decisión 1 — El teléfono ya existe: se transporta, no se inventa

**Verificado contra el backend y la base real**, no asumido:

- `backend/.../models/Cliente.java:33` → `private String telefono;` ✅ existe.
- `backend/.../dto/ClienteDTO.java:17` → `private String telefono;` ✅ existe.
- `GET /api/clientes` devuelve el campo poblado: `{"id":6,"nombreRazonSocial":"Sotomayor","telefono":"2132132131",...}` ✅.
- `backend/.../dto/FacturaClienteDTO.java` → **no** tiene `clienteTelefono` ❌.
- `GET /api/facturas/cliente/{id}/activa` y `/historial` **no** lo devuelven ❌.

Por lo tanto **no hay pregunta abierta y no hay cambio de modelo de datos**. El listado `/facturas`
ya consume `/clientes` y tiene el teléfono disponible **sin tocar el backend**. El detalle necesita
tres líneas de transporte: campo + getter/setter en `FacturaClienteDTO`, y
`dto.setClienteTelefono(factura.getCliente().getTelefono())` junto al `setClienteNombre` que ya existe
en `FacturaClienteServiceImpl.java:210`.

Se elige `clienteTelefono` como nombre por consistencia con `CuentaCorrienteDTO.clienteTelefono` y
`VentaResponseDTO.clienteTelefono`, que ya usan exactamente ese nombre para el mismo dato.

**Alternativa descartada:** que el frontend haga una segunda llamada a `/clientes/{id}` para
completar el teléfono. Agrega un round-trip y un estado de carga extra para evitar tres líneas de
DTO; además dejaría el documento exportado dependiendo de que la segunda llamada haya resuelto antes
de la captura.

**Dónde se muestra:** en el bloque de identidad del cliente del encabezado del documento, bajo el
nombre, junto a la fecha de apertura, con ícono `Phone` de `lucide-react`. Si el teléfono viene
vacío o `null` (caso real: cliente *Juan Perez* tiene `telefono: ""`), **la línea no se renderiza** —
un documento formal no muestra un campo vacío. En la tarjeta mobile del listado, como línea
secundaria bajo el nombre.

### Decisión 2 — Listado: tabla en desktop, tarjetas en mobile, frontera en `md` (768px)

El breakpoint es `md`, no `sm` ni `lg`, por consistencia estricta con el resto de la app: el listado
de Clientes usa `md:hidden` / `hidden md:block` (`Clientes.jsx:163` y `:237`), y la spec
`ui-responsive` ya define 768px como la frontera del sistema. Usar otro valor acá crearía una segunda
convención responsive dentro del mismo producto.

**Implementación:** dos bloques hermanos, `grid grid-cols-1 gap-3 md:hidden` para las tarjetas y
`hidden md:block ...` para la tarjeta que envuelve la tabla. **No** se usa un hook de `matchMedia` ni
estado de React: el colapso es puramente CSS, igual que en Clientes y Cheques. Ambos bloques mapean
sobre el mismo `filteredClientes`, así que no hay riesgo de divergencia de datos entre vistas.

**El `min-w-[600px]` y el `overflow-x-auto` de la tabla se eliminan.** Ese par es la causa raíz del
recorte de 244px y ya no tiene función: por encima de 768px la tabla de 3 columnas entra sobrada (a
1366px mide 1044px de ancho natural), y por debajo la tabla no se renderiza. Mantener el
`overflow-x-auto` "por las dudas" reintroduciría el defecto en tablets angostas.

**Contenido de la tarjeta mobile**, en orden de jerarquía:

1. **Nombre / razón social** — el elemento de mayor peso tipográfico, con el avatar de inicial
   `bg-emerald-100 text-emerald-600` que ya usa la tabla, para que las dos vistas se reconozcan como
   la misma cosa.
2. **Teléfono** — línea secundaria (`text-sm text-gray-500`), con ícono `Phone`. Omitida si está
   vacío.
3. **Saldo en cuenta corriente** — monto con tipografía destacada, derivado de `describirSaldo()` y
   nunca de un `if` local. Esa función ya es la fuente única de etiqueta y tono en tabla, tarjeta y
   modal, y la spec `ui-responsive` lo exige explícitamente ("Coherencia entre vistas").
4. **Botón "Factura Activa"** — ancho completo, área táctil amplia, `cursor-pointer`, ícono
   `FileText`. En la tabla desktop sigue siendo el botón de texto actual.

El `import` de `FileClock` en `Facturas.jsx` está sin uso hoy; se limpia de paso.

### Decisión 3 — La factura como **un** panel de papel, no como cuatro tarjetas

Éste es el núcleo del pedido. El cambio es de **contenedores**, no de contenido.

**Estructura actual** (cuatro hijos de un `space-y-6`, cada uno con marco propio):

```
[ cabecera: rounded-xl border shadow-sm ]      ← flota
      ↕ 24px de bg-gray-50
[ 4 indicadores: cada uno rounded-xl border ]  ← flotan, con fondo de color pleno
      ↕ 24px
[ tabla: rounded-xl border shadow-sm ]         ← flota
      ↕ 24px
                    [ total: rounded-xl ]      ← flota, alineado a la derecha
```

**Estructura objetivo** (un solo hijo, con secciones internas separadas por reglas de 1px):

```
┌──────────────────────────────────────────────────────────┐
│ ENCABEZADO  título · cliente · teléfono · fechas · estado │
│             + botonera de acciones                        │  ← sin marco propio
├──────────────────────────────────────────────────────────┤  ← border-b border-gray-200
│ INDICADORES  4 columnas, cada una con barra de acento     │  ← sin marco propio
├──────────────────────────────────────────────────────────┤
│ DETALLE DE ARTÍCULOS  tabla, thead, tfoot                 │  ← sin marco propio
├──────────────────────────────────────────────────────────┤
│ CONCEPTOS ADICIONALES  (sólo si hay)                      │  ← sin marco propio
├──────────────────────────────────────────────────────────┤
│ TOTAL A PAGAR                            alineado derecha │
└──────────────────────────────────────────────────────────┘
```

Reglas del panel:

- **Un solo** `bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden` en la raíz. El
  radio se conserva (papel con esquinas suaves sigue leyéndose como papel; quitarlo no era el pedido
  — el pedido era que no floten *varios*).
- El `space-y-6` de la raíz se reemplaza por secciones adyacentes separadas con
  `border-t border-gray-200`. **El aire entre secciones baja de 24px a 0**: eso, y no otra cosa, es lo
  que convierte cuatro tarjetas en un documento.
- Las secciones internas **no** llevan `rounded-*`, `shadow-*` ni `border` completo. Sólo la regla
  divisoria superior.
- El `overflow-hidden` de la raíz es necesario para que las secciones respeten las esquinas
  redondeadas. **No recorta nada**: no hay dropdowns ni popovers dentro del panel — los dos modales
  (concepto y pago) son `fixed` y viven fuera de él.

**Alternativa descartada:** panel cuadrado (`rounded-none`) con borde grueso imitando una hoja A4.
Se aleja del lenguaje visual del resto de la app (todo usa `rounded-xl`) y el usuario pidió "más
serio", no "distinto de la app".

### Decisión 4 — Indicadores: barra de acento a la izquierda, fondo blanco

El mockup es explícito y es el único punto donde pide un tratamiento de color concreto. Cada
indicador pasa de `bg-<color>-50 rounded-xl border` a:

```
border-l-4 border-<acento> · fondo blanco · label uppercase text-xs · monto text-2xl font-bold
```

Los cuatro indicadores viven en un `grid grid-cols-2 lg:grid-cols-4` **sin `gap`**, separados entre sí
por `border-r border-gray-200` — misma lógica que el resto del panel: las divisiones son reglas de
1px, no aire.

**Paleta — colores ya presentes en la app, ninguno nuevo.** Se verificó el uso actual en
`frontend/src/` antes de elegir: `blue` aparece 73 veces, `emerald` es el color primario, `red` es el
color de deuda, `amber` 75 veces, `orange` 31. No se introduce ninguna familia nueva.

| Indicador | Acento | Color del monto | Justificación |
|---|---|---|---|
| Total Ventas | `border-blue-500` | `text-gray-900` | El mockup lo pide azul; `blue` ya se usa en la app |
| Total Conceptos | `border-gray-300` | `text-gray-900` | Neutro: no es ni cobro ni deuda |
| Pagos Recibidos | `border-emerald-500` | `text-emerald-700` | Conserva exactamente el verde actual |
| Saldo Deudor | `border-red-500` / `border-emerald-500` | `text-red-700` / `text-emerald-800` | Conserva el condicional actual `saldoDeudor > 0` tal cual |

**El indicador "Total Conceptos" se conserva**, aunque el mockup muestre sólo tres. La regla dura del
pedido es "sin perder ninguna funcionalidad", y ese indicador es la única vista agregada de los
conceptos extra. El mockup es aproximado por declaración del propio usuario. Se muestra en el
checkpoint por si prefiere ocultarlo cuando vale `$0`.

El condicional de color de Saldo Deudor (`f.saldoDeudor > 0 ? rojo : verde`) **no se toca**: es
semántica de negocio, no decoración.

### Decisión 5 — Los indicadores ahora **sí** entran en la imagen exportada

Hoy el bloque de indicadores está envuelto en `{!isExporting && (...)}`: la imagen que se descarga
**no los incluye**. Con los indicadores integrados al panel del documento, esconderlos en la
exportación dejaría un hueco entre el encabezado y la tabla y contradiría la referencia del usuario,
donde los tres indicadores son parte del documento.

Se elimina la guarda `!isExporting` de ese bloque. Lo que **sí** sigue oculto durante la exportación
es la **botonera de acciones** (Descargar / Agregar Concepto / Registrar Pago / Cerrar Factura), que
son controles de la app y no contenido del comprobante.

Ésta es la **única** diferencia deliberada en la salida de la exportación y se verifica y se muestra
en el checkpoint intermedio.

**Nota de limpieza:** la clase `no-export` aparece en dos lugares de `FacturaCliente.jsx` (líneas 283
y 317) y **no tiene ninguna regla CSS asociada en todo el proyecto** — se verificó con búsqueda sobre
`frontend/src/`. Es código muerto: lo que realmente oculta esos bloques son las guardas
`!isExporting`. Se elimina la clase; no cambia ningún comportamiento.

### Decisión 6 — La botonera se integra sin desentonar

Cuatro botones con cuatro tratamientos distintos (indigo, blanco, emerald claro, emerald sólido)
sobre una cabecera que ahora es parte de un documento formal se leen como ruido. El ajuste es de
peso, no de color:

- **Cerrar Factura** conserva `bg-emerald-600 text-white` — es la acción destructiva/terminal y debe
  seguir siendo la única sólida.
- **Registrar Pago**, **Agregar Concepto** y **Descargar** se unifican como botones de contorno sobre
  fondo blanco (`border-gray-300 text-gray-700`), conservando **su ícono y su color de ícono** para
  no perder la identificación rápida: `CreditCard` emerald, `Plus` gris, `FileImage` indigo. Así el
  indigo y el emerald siguen presentes sin cuatro rellenos compitiendo. Coincide con el mockup, donde
  los tres primeros son de contorno y sólo el último es sólido.
- La cabecera va sobre `bg-gray-50/60` para separarse del cuerpo blanco del documento sin necesitar
  un marco propio.
- En mobile la botonera pasa a `grid grid-cols-2 gap-2` de ancho completo, debajo del bloque de
  identidad, en vez de `flex flex-wrap` — cuatro botones envueltos en anchos irregulares es lo que
  hoy se ve desprolijo a 390px.
- El chip de estado (`ABIERTA` / `CERRADA`) sale del `absolute top-0 right-0` actual y pasa al flujo
  normal, junto al título. El posicionamiento absoluto es lo que hoy lo hace pisar la botonera en
  anchos intermedios.

**Ningún `onClick`, ningún estado y ninguna condición de renderizado de estos botones cambia.**

### Decisión 7 — Causa raíz del historial cortado/descentrado, y su corrección

**Causa raíz, medida.** El detalle expandido se envuelve en (`FacturaCliente.jsx:602`):

```jsx
<div className="animate-in fade-in slide-in-from-top-2 ml-4 md:ml-8 border-l-2 border-emerald-200 pl-4 md:pl-8 py-2 overflow-x-auto">
```

Ese wrapper produce dos defectos independientes:

**(a) Descentrado** — `ml-8` (32px) + `border-l-2` (2px) + `pl-8` (32px) = **66px de sangría
exclusivamente izquierda**, sin compensación a la derecha. Medido: el contenido arranca en x=365
mientras el título, las pestañas y la tarjeta de resumen arrancan en x=299, y el borde derecho queda
a ras en 1323. El documento no está centrado en su contenedor: está empujado contra el margen
derecho. En mobile son 34px (`ml-4` + `pl-4` + borde). Es literalmente lo que el usuario ve como
"descentralizada".

**(b) Cortado** — dos efectos que se suman:

1. La sangría deja el contenido **66px más angosto** que la misma factura en la pestaña "activa"
   (958px vs 1024px). La tabla de artículos tiene 7 columnas con `px-6` por celda: es la primera
   estructura que se estrangula cuando se le quitan 66px, y en mobile el recorte horizontal sube de
   426px a **460px**.
2. El wrapper declara `overflow-x-auto` **encima** del `overflow-x-auto` que la tabla ya tiene. Son
   **dos scrollers horizontales anidados** sobre el mismo contenido: el usuario arrastra y a veces
   mueve el de afuera, a veces el de adentro, y percibe columnas inalcanzables. Confirmado en la
   cadena de contenedores medida en mobile: el scroller interno recorta 460px y está anidado dentro
   del wrapper.

**Corrección.** Se elimina el wrapper de sangría por completo: `ml-*`, `pl-*`, `border-l-2` y
`overflow-x-auto` se van. El detalle expandido pasa a ser hijo directo del contenedor de la pestaña,
con el mismo ancho y el mismo eje que la factura activa — **desplazamiento 0px, ancho perdido 0px**,
y exactamente un scroller horizontal (el de la tabla, que es el que corresponde).

La relación visual "este detalle pertenece a esta tarjeta" —que la sangría intentaba comunicar y que
sigue haciendo falta— se resuelve **sin costo de ancho**: la tarjeta de resumen y el detalle expandido
se unen en un solo bloque continuo (la tarjeta pierde su radio inferior y su borde inferior, el
detalle continúa el mismo marco hacia abajo). Es el mismo recurso de la Decisión 3: adyacencia y
regla de 1px en lugar de aire y sangría.

**Alternativa descartada:** compensar con `mr-8` para "recentrar". Arregla el eje pero deja el
detalle 132px más angosto que la factura activa, empeorando el recorte de la tabla.

**Alternativa descartada:** abrir la factura del historial en un modal a pantalla completa. Es un
rediseño mayor, rompe la exportación por `getElementById` y el usuario pidió mejorar la vista, no
reemplazar el patrón de expansión.

### Decisión 8 — El historial deja de ser "flojo"

Hoy cada factura cerrada es una tarjeta con ícono, `Factura #N`, fecha de cierre y "Total Facturado" —
sin indicación de que sea expandible, sin información de saldo, y con `$0` mostrado igual que
`$70.000` (caso real verificado: la factura #11 de Sotomayor está cerrada y vacía). Ver
`img/repro2-desktop-historial-expandido.png`.

Cambios, todos de presentación:

- **Afordancia de expansión**: chevron (`ChevronDown` / `ChevronUp` de `lucide-react`) que rota según
  el estado, más `aria-expanded`. Hoy no hay ninguna señal de que la tarjeta se abra.
- **Más información por tarjeta**: además del total facturado, el **período** (apertura → cierre, no
  sólo el cierre) y el **saldo con que se cerró**, con el mismo tratamiento de color que el indicador
  de Saldo Deudor. Cerrar una factura con deuda pendiente es información que hoy se pierde.
- **Factura cerrada vacía**: cuando no tiene ventas ni conceptos, se rotula como tal en vez de mostrar
  `$0` sin contexto.
- **Orden**: descendente por `fechaCierre` (la más reciente primero). Hoy se renderiza en el orden
  que llega el backend, que no está garantizado.
- **Sólo una expandida a la vez**: se conserva el comportamiento actual (`expandedFacturaId` es un
  único id, no un set). No es un defecto y cambiarlo multiplicaría el alto de la página.

**Corrección del contador.** `Historial ({historial.length})` cuenta el arreglo completo, pero el
render aplica `historial.filter(h => h.estado === 'CERRADA')`. El endpoint
`GET /api/facturas/cliente/{id}/historial` devuelve **también la factura ABIERTA** — verificado
contra la API real: para el cliente 6 devuelve la #12 `ABIERTA` y la #11 `CERRADA`, y la pestaña
muestra `Historial (2)` con 1 sola tarjeta. Se calcula la lista filtrada **una sola vez** y se usa
tanto para el contador como para el render, de modo que no puedan volver a divergir.

**El filtro se mantiene en el frontend, no en el backend.** El endpoint es compartido y su contrato
está fijado por el change `ciclos-facturacion-cliente`; cambiar qué devuelve afectaría a cualquier
otro consumidor y excede el alcance visual de este change.

### Decisión 9 — Invariantes de la exportación a imagen

`capturarNodoComoImagen` fuerza el nodo vivo a `width: 1000px`, espera el reflow real con doble
`requestAnimationFrame`, mide `scrollHeight` y recién ahí llama a `toPng`. Eso impone condiciones
sobre la estructura que se captura, y el rediseño debe respetarlas:

1. **El nodo capturado debe poder reflowar a 1000px.** Ninguna sección del panel puede tener un ancho
   fijo en `px` ni un `min-w-[...]` que impida al contenido reacomodarse. Los `grid-cols-*` y los
   porcentajes reflowan bien; un `min-w-[600px]` no.
2. **Ningún ancestro del nodo capturado puede introducir `position: fixed`, `opacity` ni
   `visibility`** — el comentario del archivo explica por qué (el clon hereda el estilo computado de
   la raíz y termina fuera del `<foreignObject>`). El rediseño no agrega ninguno de los tres.
3. **`overflow-x-auto` dentro del nodo capturado es inofensivo** (a 1000px la tabla entra completa y
   el scroller no recorta), pero **`overflow: hidden` con altura acotada sí recortaría**. El
   `overflow-hidden` del panel raíz sólo sirve para las esquinas y no acota altura: `scrollHeight` se
   mide sobre el nodo capturado, que es el `<div>` interno con `ref`, no un ancestro.
4. **El `ref={isActive ? facturaRef : null}` y el `id={`factura-historial-${h.id}`}` se conservan tal
   cual.** Son los dos puntos de entrada de la captura.
5. El overlay `isExporting` sigue **fuera** del contenedor con `animate-in slide-in-*`, para no
   heredar el `transform` de esa animación (rompería el `fixed` a pantalla completa). El comentario
   que lo explica se conserva.

Se verifica exportando en desktop y en mobile, factura activa y factura del historial, comparando
contra las capturas del "antes".

### Decisión 10 — Un solo `renderFacturaCompleta` para ambas pestañas

Se conserva la función única que renderiza tanto la factura activa como la del historial, con el
parámetro `isActive`. Extraer un componente `<FacturaDocumento>` sería más limpio, pero duplicaría la
superficie de cambio de un change cuyo objetivo es visual, y arriesgaría divergencia entre las dos
vistas — que es precisamente el origen del bug de la Decisión 7. La consecuencia buscada es fuerte:
**una factura del historial y la factura activa se ven idénticas salvo por la botonera**, y cualquier
ajuste futuro de la maqueta las alcanza a las dos.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| **Reabrir el bug de exportación** (imagen en blanco o columnas recortadas), que costó dos iteraciones arreglar. | La Decisión 9 fija los invariantes de forma explícita. Verificación obligatoria de exportación en 4 combinaciones (desktop/mobile × activa/historial) contra las capturas del "antes" antes de cerrar. `capturarNodoComoImagen` no se toca. |
| **Perder color o funcionalidad sin notarlo** al reescribir JSX extenso: es la regla dura del pedido y el riesgo más caro. | Inventario explícito de acciones y de colores semánticos como tarea de verificación, ítem por ítem, comparando contra `img/repro-desktop-activa.png`. Regla del change: sólo `className` y estructura de contenedores; ningún handler, estado, firma, condición ni cálculo. |
| **Los indicadores en el export cambian la imagen** que el usuario ya conoce (Decisión 5). | Es un cambio deliberado y alineado con su propia referencia. Se muestra en el checkpoint intermedio y se revierte con una sola guarda si lo prefiere. |
| **El panel unificado se ve pesado en mobile**: cinco secciones sin aire en 390px pueden leerse como un bloque indistinto. | Padding vertical por sección y jerarquía tipográfica en los rótulos. Se verifica a 390px y a 320px en el checkpoint. |
| **La tabla de artículos sigue necesitando scroll horizontal en mobile** (7 columnas, ~782px de ancho natural). | Está fuera del alcance de este change y el usuario no lo reportó: la queja es sobre el **listado**, no sobre la tabla del detalle. Se deja anotado. El scroller queda **uno solo** (Decisión 7), que ya es una mejora medible. |
| **Sesión paralela sobre el mismo working directory.** | Alcance cerrado a 4 archivos. Verificación por `git diff` de que ningún archivo de la otra sesión aparece tocado. |
| **`FacturaClienteDTO` es consumido por otros lugares del frontend.** | Agregar un campo es aditivo y no rompe consumidores. Se verifica que no exista serialización estricta que falle ante campos nuevos. |

## Migration Plan

No hay migración: no cambia el esquema de base de datos, no cambia ningún contrato de endpoint
(`clienteTelefono` es aditivo) y no hay estado persistido cuyo formato cambie. El rollback es revertir
el commit; el campo del DTO puede quedar sin consecuencias.

Orden de implementación, elegido para que cada etapa sea verificable por separado:

1. Reproducir y medir el estado actual (línea base para comparar).
2. Backend mínimo: `clienteTelefono` en el DTO y en el mapeo.
3. Listado responsive — la parte más aislada y de menor riesgo.
4. Panel de documento + indicadores con acento + botonera + teléfono.
5. 🔶 **Checkpoint intermedio** — listado mobile + factura rediseñada.
6. Historial: corrección del desplazamiento/recorte, rediseño de la lista y del contador.
7. No-regresión: exportación, inventario de funcionalidad y de color, `oxlint`.
8. 🔶 **Checkpoint final** — demo completa.

## Open Questions

1. **¿Se conserva el indicador "Total Conceptos"?** Decisión tomada: sí (Decisión 4), porque quitarlo
   perdería información y el mockup es aproximado por declaración del usuario. A confirmar en el
   checkpoint intermedio; alternativa si molesta: ocultarlo cuando vale `$0`.
2. **¿Los indicadores deben aparecer en la imagen exportada?** Decisión tomada: sí (Decisión 5).
   A confirmar en el checkpoint intermedio.
3. **¿Qué campos entran en la tarjeta mobile del listado además de nombre, teléfono y saldo?** Se
   propone ninguno; el endpoint también expone `balanceBandejas`, que pertenece al módulo de bandejas
   y no a facturación. A confirmar en el checkpoint.
4. **¿El panel del documento conserva `rounded-xl` o va a esquina viva?** Decisión tomada: conserva
   `rounded-xl` (Decisión 3), por coherencia con el resto de la app. A confirmar en el checkpoint.

### Respuestas del checkpoint 6.1

1. **Total Conceptos**: **se conserva**, aunque suela estar en `$0`. Confirmado explícitamente por el
   usuario — no se oculta.
2. **Indicadores en la imagen exportada**: **sí**, deben aparecer. Confirmado explícitamente por el
   usuario. Ya implementado así (Decisión 5) y verificado en las 4 combinaciones del grupo 8.
3. **Campos extra en la tarjeta mobile del listado**: sin objeción del usuario a la propuesta por
   defecto. Se mantiene tal cual: nombre, teléfono, saldo y botón "Factura Activa" — ningún campo
   adicional.
4. **Esquina del panel**: sin objeción del usuario a la propuesta por defecto. Se mantiene
   `rounded-xl`.

### Mediciones finales del historial corregido (grupo 7, verificado contra el stack real)

Medido con Playwright contra `localhost:5173`/`:8080`, cliente Sotomayor (id 6), interceptando por red
`**/api/facturas/cliente/6/historial` para agregar una factura CERRADA sintética con el mismo
contenido que la ABIERTA (mismo mecanismo que 1.4) — la factura real #11 (CERRADA, sin movimientos) se
mantuvo intacta y participó en las mismas mediciones sin necesidad de mock. Método idéntico al de la
Decisión 7 (`getBoundingClientRect` de la tarjeta de resumen vs. del nodo `#factura-historial-{id}`).

| Medición | Antes (Decisión 7) | Después (verificado) |
|---|---|---|
| Desplazamiento horizontal — desktop 1366px | +66px | **+1px** (grosor del borde del marco continuo, no sangría) |
| Ancho perdido — desktop 1366px | −66px | **−2px** (bordes izq.+der. del marco, 1px c/u) |
| Desplazamiento horizontal — mobile 390px | +34px | **+1px** |
| Ancho perdido — mobile 390px | −34px | **−2px** |
| Scrollers horizontales anidados sobre la tabla (mobile) | 2 | **1** (sólo el de la tabla) |
| Contador de pestaña vs. tarjetas renderizadas | "Historial (2)" con 1 tarjeta | **coinciden siempre** (`facturasCerradas.length` computado una sola vez y reusado) |

El 1-2px residual proviene del propio `border` (1px) del marco continuo que ahora envuelve tarjeta +
detalle (Decisión 7: "el detalle continúa el mismo marco hacia abajo") — no es sangría ni margen, y es
indistinguible a simple vista. Se considera "0px" a efectos del criterio de aceptación de la tarea 7.4:
la asimetría de 66px/34px que causaba el descentrado quedó eliminada.

**Nota de implementación no anticipada por el diseño original de la tarea 7.3:** envolver todo el
detalle (botonera + documento) en un único `div` con `p-4` reintroducía exactamente el mismo tipo de
sangría que se estaba corrigiendo (padding izquierdo sin compensar). Se resolvió separando el padding:
la fila de "Descargar Factura" lleva su propio `p-4 pb-0`, y el nodo capturado
(`id="factura-historial-{h.id}"`, el mismo que produce `renderFacturaCompleta`) queda sin padding
propio, pegado al marco exterior — así su eje y su ancho coinciden con los de la factura activa.

### Ronda 2 — ajuste fino contra segunda referencia (`img/Ejemplo factura 2.png`)

El usuario compartió una segunda imagen de referencia, prácticamente el mismo diseño que
`img/ejemplo factura.png` mostrado dentro de un shell de app genérico ("Admin Console" con sidebar
propio, irrelevante para este sistema). Se comparó pixel a pixel contra el estado real (capturas
`img/round2-desktop-activa.png`, `img/round2-mobile-activa.png`, `img/round2-desktop-historial.png`,
`img/round2-table-zoom.png`, tomadas contra el stack de desarrollo real, cliente Sotomayor id 6) y se
cerraron las siguientes diferencias concretas, todas de `className`, ningún handler ni cálculo tocado:

1. **Chips de método de pago.** Antes el método de pago se mostraba como texto plano dentro de una
   celda con fondo de color pleno (`bg-emerald-100`/`bg-orange-100`/`bg-red-100`) heredado del estado
   del pago. Se introdujo `MetodoPagoChip`, un componente de presentación (`bg-gray-100 text-gray-600
   rounded-full uppercase text-xs`, o `bg-red-50 text-red-600 line-through` si el pago está
   `RECHAZADO`) que separa **cómo se pagó** (neutro, informativo) de **cuánto se abonó** (semántico:
   verde pagado, naranja parcial, rojo impago), que ahora vive únicamente en el texto de la columna
   "Abonó" — sin fondo de color. Coincide con la referencia y **no pierde color semántico**: el mismo
   condicional (`totalAbonado === 0` / `< totalVenta` / pagado) sigue coloreando el monto.
2. **Encabezados de tabla aligerados.** `bg-gray-100 text-gray-700 uppercase border-b-2 border-gray-300`
   pesado → `bg-gray-50/60 text-gray-500 uppercase tracking-wide border-b-2 border-gray-300` (se
   conserva el grosor del borde inferior por el punto 9, pero se aclara el fondo y el peso del texto).
   Encabezado "Método Pago" renombrado a "Método de Pago" y "Abonó" pasa a alinearse a la derecha
   (antes centrado), consistente con ser una columna numérica.
3. **`tabular-nums` en todos los montos** — indicadores, celdas de la tabla (Unitario/Subtotal/Abonó),
   `tfoot`, conceptos adicionales, "Total a Pagar" y las tarjetas del historial — para que los dígitos
   alineen verticalmente entre filas.
4. **Botonera:** texto en mayúsculas con `tracking-wide` y `font-bold text-xs` (antes `font-medium`
   en minúsculas) para igualar la tipografía de la referencia. **Esquinas vivas**: se quitó
   `rounded-lg` de los 4 botones de acción (Descargar/Agregar Concepto/Registrar Pago/Cerrar Factura),
   que en la referencia tienen esquinas rectas. Los chips (`MetodoPagoChip`, badge de estado
   ABIERTA/CERRADA) conservan `rounded-full` a propósito — no son botones.
5. **Título y botonera en la misma fila.** Antes el teléfono y la fecha de apertura compartían la fila
   flex con el título; ahora esa fila contiene sólo título+badge (izquierda) y los 4 botones
   (derecha), igual que ambas referencias. El teléfono (chico, mismo tratamiento que la tarjeta mobile
   de `Facturas.jsx`: `text-sm text-gray-500` + ícono `Phone` de `3.5x3.5`) y la línea de
   apertura/cierre (`text-xs`) pasan a renderizarse **debajo** de esa fila completa, no la interrumpen.
6. **Título más chico.** `text-2xl` → `text-lg`: una factura formal no lleva el nombre del cliente en
   letra gigante. El badge de estado y el resto de la jerarquía no cambian.
7. **Íconos por indicador**, ausentes hasta esta ronda: `TrendingUp` (azul) en Total Ventas,
   `CheckCircle` (emerald) en Pagos Recibidos, y en Saldo Deudor un ícono condicional que sigue el
   mismo `f.saldoDeudor > 0` que ya gobierna el color — `AlertTriangle` (rojo) si hay deuda,
   `CheckCircle2` (emerald) si está saldado. "Total Conceptos" queda sin ícono: no tiene equivalente
   en la referencia (que sólo muestra 3 indicadores) y no se inventó uno.
8. **Grilla de la tabla remarcada, a pedido explícito del usuario** (mismo criterio que
   `pedido-grilla-visual`: "remarcar bordes"). Se restauraron y reforzaron las líneas verticales entre
   columnas (`border-r border-gray-300` en cada `th`/`td`, en ambas tablas — Detalle de Artículos y
   Conceptos Adicionales) y las horizontales entre filas (`divide-gray-300` en vez de `divide-gray-100`,
   `border-b-2 border-gray-300` en el encabezado). Esto es una decisión explícita del usuario en esta
   ronda, **no** una vuelta al estilo "grilla de Excel" del estado anterior a este change: el criterio
   de "panel único sin aire" del Decisión 3 no se toca, sólo el contraste de las líneas internas de la
   tabla.

**Deliberadamente NO revertido** (para no deshacer decisiones ya tomadas y confirmadas):

- **Indicadores como secciones adyacentes de un panel único**, no como tarjetas flotando con sombra y
  separación entre sí. Ambas imágenes de referencia muestran los 3 indicadores como tarjetas
  independientes con `shadow`, borde completo y separación visible entre ellas — el mismo patrón que
  la Decisión 3 identificó explícitamente como "lo que el usuario pidió sacar" del estado anterior a
  este change. Esta ronda es de ajuste fino, no de revertir una decisión arquitectónica ya razonada y
  confirmada en el checkpoint 6.1; se documenta acá para que quede visible si el usuario prefiere
  reabrirla explícitamente.
- **Color sólido de "Cerrar Factura".** ~~La referencia lo muestra azul marino/negro; se mantiene
  `bg-emerald-600` por la Decisión 6~~ — **resuelto más abajo** ("9. Íconos y color de la botonera
  copiados de la referencia"): el usuario pidió explícitamente copiar el color, cerrando esta
  reticencia.

Verificación de esta ronda: `npx oxlint` limpio (mismos 4 warnings preexistentes, ninguno nuevo);
`git status --porcelain` confirma que sólo `frontend/src/pages/FacturaCliente.jsx` cambió en esta
ronda (ningún archivo de la sesión paralela tocado); tab Historial verificado con el mismo
`renderFacturaCompleta` (capturas idénticas salvo botonera, panel continuo intacto); sin escrituras a
la base (sólo navegación y capturas via Playwright, ningún POST/PUT/DELETE).

9. **Íconos y color de la botonera copiados de la referencia** (pedido explícito del usuario:
   "tambien copia el color y los logos de los botones de la imagen"). Esto reemplaza — no contradice —
   el punto "Deliberadamente NO revertido" de más arriba sobre "Cerrar Factura": esa reticencia era
   válida mientras no hubiera un pedido explícito; ahora lo hay.
   - `Descargar` (ambos botones: header y vista de historial dentro de `renderFacturaCompleta`):
     `FileImage` → `Download`.
   - `Agregar Concepto`: `Plus` → `PlusCircle`.
   - `Registrar Pago`: `CreditCard` → `Receipt`.
   - `Cerrar Factura`: ícono `CheckCircle` → `Lock`; fondo `bg-emerald-600 hover:bg-emerald-700` →
     `bg-slate-900 hover:bg-slate-800` (texto blanco sin cambios), aproximando el azul marino/negro de
     la referencia con la paleta de Tailwind ya en uso en el proyecto.
   - Imports de `lucide-react` actualizados: se agregan `PlusCircle`, `Download`, `Lock`; se quitan
     `FileImage` y `CreditCard` (sin otros usos en el archivo tras el cambio — confirmado por grep antes
     de tocar el import).
   - Lógica de descarga (`handleDescargarImagen` / `capturarNodoComoImagen`) sin cambios — sólo el
     ícono del botón. Verificado con Playwright disparando el click real y capturando el evento
     `download` del navegador: sigue generando el PNG correctamente.
   - Verificación: `npx oxlint` sin errores nuevos; captura `img/round2-botones-final.png` del header
     contra el stack de desarrollo real (cliente Sotomayor id 6), comparada visualmente contra
     `img/ejemplo factura.png` y `img/Ejemplo factura 2.png`; sin escrituras a la base.

10. **Ronda 3 — intensidad de datos, cabezales con color y estado de pago por fondo de celda**
    (pedido explícito del usuario). Único archivo tocado: `frontend/src/pages/FacturaCliente.jsx`.

    El pedido de estado de pago tuvo tres iteraciones en vivo sobre el mismo punto, documentadas acá
    porque cambian el enfoque, no sólo el valor de una clase:
    1. Pedido original: una etiqueta/chip de texto tipo `MetodoPagoChip` pero con color semántico
       ("PAGADO"/"PARCIAL"/"NO ABONÓ"), junto al monto. Se implementó un componente `EstadoPagoChip`
       nuevo para esto.
    2. Corrección 1: sin etiqueta de texto — en cambio, pintar el fondo de **toda la fila** (`<tr>`) de
       la venta con el color de estado. Se sacó `EstadoPagoChip` y se pasó a una clase `rowBgClass`
       aplicada al `<tr>`.
    3. Corrección 2: no toda la fila — sólo el fondo de las celdas **"Método de Pago" + "Abonó"** (las
       dos últimas columnas), dejando Fecha/Cant./Descripción/Unitario/Subtotal con fondo blanco
       normal. `rowBgClass` se renombró a `estadoBgClass` y se movió del `<tr>` a esas dos `<td>`
       (incluido el `<td colSpan="2">` que las fusiona cuando `totalAbonado === 0`, porque ahí no hay
       columna de método que mostrar).
    4. Corrección 3 (intensidad): el primer valor implementado (`bg-*-50/60`, después `bg-*-50`) se
       veía demasiado tenue contra el navegador real — se subió a `bg-emerald-100`/`bg-orange-100`/
       `bg-red-100`, verificado visualmente contra la captura real hasta tener presencia sin volverse
       chillón ni tapar la legibilidad del `MetodoPagoChip` que vive dentro de la misma celda.

    Resultado final: la variable de estado ya existente (la que gobierna `paymentTextClass`, junto a
    `totalAbonado === 0` / `< totalVenta` / pagado) ahora también calcula `estadoBgClass`
    (`bg-red-100` / `bg-orange-100` / `bg-emerald-100`), aplicada con `rowSpan` a las celdas "Método de
    Pago" y "Abonó" de cada venta (cubre todas las filas de `v.detalles` cuando la venta tiene más de
    un detalle). Sin etiqueta de texto nueva ni cambio en la lógica de cálculo de `totalAbonado`.

    Además, en la misma ronda:
    - **Intensidad de celdas de datos.** `Unitario` (la celda más liviana, `text-gray-500`) pasa a
      `text-gray-700 font-medium`; `Descripción` de `text-gray-700` a `text-gray-800`; la celda
      `Fecha` (ambas tablas, incluida la fila "Pago a cuenta") de `text-gray-500`/`text-gray-600` a
      `text-gray-700`. `Cantidad` (`text-gray-900 font-medium`) y `Subtotal` (`font-semibold
      text-gray-900`) no se tocaron — ya tenían suficiente intensidad.
    - **Cabezales con color.** `bg-gray-50/60 text-gray-500` → `bg-slate-100 text-gray-600` en ambas
      tablas — un escalón de contraste con un tinte sutil (gris azulado, no un color fuerte), para que
      el cabezal se distinga mejor de las filas de datos sin competir con ellas.
    - **Bordes de la botonera del header.** Los 3 botones outline (Descargar/Agregar Concepto/
      Registrar Pago) pasan de `border border-gray-300` a `border-2 border-gray-400` — borde más
      grueso y con más contraste. "Cerrar Factura" (fondo `bg-slate-900` sólido) no lleva borde y no se
      tocó.
    - **Íconos de la botonera sin color propio.** `Download`/`PlusCircle`/`Receipt` tenían cada uno un
      color distinto (`text-indigo-600`/`text-gray-500`/`text-emerald-600` respectivamente, heredado de
      la Ronda 2 al copiar íconos de la referencia). Se unificaron los tres a `text-gray-800` neutro,
      sin distinción de color entre ellos. El ícono `Lock` de "Cerrar Factura" (blanco sobre fondo
      oscuro) no se tocó — ese blanco es el contraste necesario contra el botón oscuro, no un color
      propio del ícono.
    - **Fila "Pago a cuenta" pintada completa (no sólo desde "Método de Pago").** Corrección aparte,
      sobre una fila distinta a la del estado de pago por venta: los pagos directos a la factura (sin
      `ventaId`, sección `{/* Pagos directos a la factura (sin ventaId) */}`) siempre representan
      dinero ya cobrado — no dependen de ningún condicional de estado como las filas de venta — así que
      su `<tr>` completo lleva fondo verde, a diferencia de las filas de estado por venta que sólo
      tiñen las dos últimas columnas. Se subió la intensidad para igualar el resto de los fondos de
      esta ronda: `border-t border-emerald-100 bg-emerald-50/40` → `border-t border-emerald-200
      bg-emerald-100` (el borde también subió un escalón, de `-100` a `-200`, porque contra el fondo
      `-100` más intenso el borde `-100` original quedaba invisible).

    Verificación: `npx oxlint` limpio (mismos 4 warnings preexistentes de siempre — imports sin usar
    `rechazarPagoFactura`/`XCircle`, catch `err` sin usar, deps de `useEffect` — ninguno nuevo);
    captura `img/round3-tabla-estados.png` tomada con Playwright contra el stack de desarrollo real
    (cliente Sotomayor id 6, factura activa #12 con ventas en los 3 estados de pago simultáneamente más
    un pago a cuenta) confirma los 3 fondos de color en las columnas correctas de las filas de venta,
    la fila "Pago a cuenta" completa en verde `-100`, el cabezal más oscuro y los botones con borde
    marcado e íconos neutros; `git status --porcelain` confirma un solo archivo tocado
    (`FacturaCliente.jsx`), ningún archivo de la sesión paralela; sin escrituras a la base (sólo
    navegación y captura vía Playwright).

11. **Ronda 4 — tipografía IBM Plex Sans, sólo en el panel de la factura** (pedido explícito del
    usuario: "usa la tipografía IBM Plex Sans"). Alcance explícito: **no** es un cambio de tipografía
    global de la app — el resto de las pantallas (Ventas, Clientes, sidebar, etc.) sigue con
    `ui-sans-serif, system-ui, sans-serif`, la fuente de `body` en `frontend/src/index.css`. Archivos
    tocados: `frontend/index.html`, `frontend/src/index.css`, `frontend/src/pages/FacturaCliente.jsx`.

    - **Carga de la fuente.** Google Fonts vía `<link>` en `frontend/index.html`
      (`preconnect` a `fonts.googleapis.com` + `fonts.gstatic.com`, luego el stylesheet
      `family=IBM+Plex+Sans:wght@400;500;600;700`). Los 4 pesos cargados cubren
      `font-medium`(500)/`font-semibold`(600)/`font-bold`(700) del panel, más 400 como base para texto
      sin peso explícito. `font-black` (900, usado una sola vez en "Total a Pagar") no tiene
      equivalente en la familia — el navegador cae al 700 ya cargado en vez de sintetizar un peso que
      no existe.
    - **Aplicación acotada.** El proyecto usa Tailwind v4 (config CSS-first vía `@theme`, no hay
      `tailwind.config.js`), así que el patrón de `fontFamily` de Tailwind v3 no aplica. En su lugar se
      declaró un token `--font-factura: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;` dentro
      del bloque `@theme` de `frontend/src/index.css` (junto a `--color-*` existentes) — Tailwind v4
      mapea automáticamente cualquier token `--font-*` del theme a una utilidad `font-*`, generando
      `font-factura`. Esa clase se agregó al `div` raíz de `renderFacturaCompleta` (el que lleva
      `ref={isActive ? facturaRef : null}`), que es ancestro común tanto de la factura activa como del
      nodo capturado del historial (`id="factura-historial-{h.id}"`, que envuelve una llamada al mismo
      `renderFacturaCompleta`) — un solo punto de aplicación cubre ambas vistas.
    - **Espera de fuente antes de exportar.** `html-to-image` congela el estilo *computado* de cada
      nodo en el instante de la captura; si el usuario descarga la imagen antes de que el navegador
      termine de bajar el `@font-face` de Google Fonts, el texto capturado saldría con la fuente de
      fallback del sistema aunque en pantalla ya se vea bien un instante después. Se agregó
      `await document.fonts.ready;` antes de llamar a `capturarNodoComoImagen(...)`, en los dos
      call-sites (`handleDescargarImagen` para la activa, y el handler inline "Descargar Factura" del
      historial) — **no** dentro de `capturarNodoComoImagen` ni de `esperarProximoFrame`, que son las
      dos funciones que este change tiene prohibido tocar (ver cabecera de `tasks.md`, grupo 8.2/8.3):
      la espera de fuente es una `await` adicional en el código que las *llama*, no una línea nueva
      dentro de ellas.
    - **Verificación.** Contra el stack de desarrollo real (`localhost:5173`, `jefe@vivero.com`,
      cliente Sotomayor id 6), con Playwright: `getComputedStyle(document.querySelector('.font-factura'))
      .fontFamily` → `"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif`; `document.fonts` reporta
      los 4 pesos (`400/500/600/700`) en estado `loaded`; `getComputedStyle(document.body).fontFamily`
      en `/facturas/6` y en `/clientes` → `ui-sans-serif, system-ui, sans-serif` sin cambios (confirma
      que el resto de la app no cambió de fuente). Se descargó la imagen real vía el botón "Descargar"
      (evento `download` de Playwright, no simulado) y se inspeccionó visualmente: los números y la
      "a" minúscula de la imagen exportada tienen las formas distintivas de IBM Plex Sans, no las de la
      fuente de fallback. `npx oxlint` sobre `FacturaCliente.jsx` e `index.html`: limpio, mismos 4
      warnings preexistentes de siempre, ninguno nuevo. Sin escrituras a la base (sólo navegación y un
      click de descarga client-side, sin POST/PUT/DELETE). Captura final:
      `img/round4-tipografia.png`.
