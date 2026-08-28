## Context

El rediseño **ya está diseñado**. La especificación cerrada vive en `design/`:

| Archivo | Qué aporta |
|---|---|
| `design/implementacion.md` | Guía paso a paso en 5 secciones (tokens, fuentes, `data-unidad`, tabla de reemplazo de clases, sidebar) |
| `design/vivero-tokens.css` | Los valores exactos: neutrales, semánticos, acentos por unidad, dark mode |
| `design/UI mockups request/Sistema-Vivero-Redisenio.dc.html` | Mockups HTML de referencia visual |

Este `design.md` **no rediseña nada**. Su único trabajo es resolver los tres problemas que la especificación externa no podía resolver porque no conoce el código: **(a)** cómo ejecutar un barrido de 51 archivos sin que se degrade a mitad de camino, **(b)** cómo distinguir, ocurrencia por ocurrencia, el verde de marca del verde de estado — distinción que hoy no existe en el código y que un find-replace destruiría, y **(c)** cómo verificar el resultado sin abrir 51 capturas a mano.

**Estado actual del código relevante:**

- `frontend/src/index.css` tiene un `@theme` propio con paleta emerald y `--font-factura`.
- `frontend/index.html` ya carga IBM Plex Sans (lo trajo `facturacion-rediseno-visual`); falta IBM Plex Mono.
- `frontend/src/layouts/DashboardLayout.jsx` ya deriva `activeBusinessId` / `isHerramientas` desde `unidadNegocioActiva` (`store/useAuthStore.js`). El interruptor de unidad ya existe; lo único que falta es proyectarlo al DOM.
- `frontend/src/utils/{chequeDisplay,saldoDisplay,bandejasDisplay}.js` — **verificado leyéndolos**: son 100 % semánticos. No contienen ni un solo uso de marca/interacción. Cada color ahí está dentro de una rama que depende de un estado de negocio.
- `frontend/src/assets/` **no existe**; hay que crearlo.
- `FacturaCliente.jsx` exporta a PNG con `toPng` de `html-to-image` a través de `capturarNodoComoImagen` / `esperarProximoFrame` — lógica delicada, ya corregida dos veces.

**Precedentes en este mismo repo**: `pedido-grilla-visual` y `facturacion-rediseno-visual` establecieron el patrón de checkpoints con capturas reales contra el stack Docker. Este change lo hereda y lo escala.

## Goals / Non-Goals

**Goals:**

- Trasladar `design/vivero-tokens.css` a `frontend/src/index.css` **sin reinterpretarlo**: los valores hexadecimales se copian, no se ajustan.
- Que el acento cambie de unidad con **un solo interruptor** (`data-unidad` en `<html>`), sin componentes duplicados, sin props de tema, sin `if (isHerramientas)` repartido por el árbol.
- Introducir en el código una distinción que hoy no existe: **color de marca** (`accent`, cambia por unidad) vs. **color semántico** (`ok`/`warn`/`danger`, idéntico en ambas unidades), con un criterio operativo que no admita duda al aplicarlo.
- Terminar el barrido con **cero** literales de la paleta vieja en los 51 archivos, verificable mecánicamente y no "a ojo".
- Que el login deje de vestirse de Vivero.

**Non-Goals:**

- **Cualquier** cambio de lógica: handlers, estado, props, firmas, condiciones de renderizado, cálculos, payloads, endpoints, permisos, rutas. Si una tarea parece pedir eso, está mal entendida.
- Backend, base de datos, DTOs. Cero archivos `.java` en este change.
- Rediseñar la disposición de las pantallas. Cambian color, tipografía, espaciado, radios, bordes y jerarquía — **no** se mueven columnas, no se reordenan campos, no se agregan ni sacan secciones. La única excepción autorizada es el sidebar (sección 5 de la guía) y el encabezado del login.
- Un toggle manual de tema claro/oscuro. El dark mode entra sólo por `prefers-color-scheme`, tal como lo trae la spec.
- Tocar `capturarNodoComoImagen` o `esperarProximoFrame`. Ni una línea, ni un comentario.

## Decisions

### Decisión 1 — El acento se resuelve por atributo en `<html>`, no por props ni por clases condicionales

`--color-accent` se declara en el `@theme` de forma **indirecta**: `--color-accent: var(--accent)`. El valor concreto lo fijan los bloques `[data-unidad="vivero"]` y `[data-unidad="herramientas"]`, copiados literalmente de `vivero-tokens.css`. `DashboardLayout` proyecta la unidad activa al DOM con un `useEffect`:

```js
useEffect(() => {
  document.documentElement.dataset.unidad = isHerramientas ? 'herramientas' : 'vivero';
}, [isHerramientas]);
```

A partir de ahí, **cada** `bg-accent` / `text-accent` / `border-accent` / `ring-accent` del árbol retiñe solo al cambiar de unidad.

*Alternativas descartadas:* (a) pasar un objeto de tema por props o contexto — obliga a tocar la firma de decenas de componentes, exactamente lo que el alcance prohíbe; (b) clases condicionales `isHerramientas ? 'bg-teal-700' : 'bg-emerald-600'` — duplica la decisión en cada punto de uso y garantiza que se desincronicen; (c) dos builds — absurdo para un usuario que alterna de unidad dentro de la misma sesión.

### Decisión 2 — `--accent` nunca puede quedar indefinido: fallback en `:root` + atributo inicial en el HTML

`vivero-tokens.css` define `--accent` **sólo** dentro de `[data-unidad="..."]`. Entre el arranque de la app y el primer render de `DashboardLayout` no hay atributo, y todo el árbol pre-autenticado (login, pantallas de error, `ToastContainer` montado fuera del layout) quedaría con `var(--accent)` sin resolver — es decir, color inválido.

Se cierra por los dos lados:

1. `frontend/index.html` arranca con `<html lang="es" data-unidad="vivero">`. Nunca hay una ventana sin atributo.
2. `index.css` declara igualmente el juego de `--accent*` en `:root` con los valores de Vivero, como red de seguridad si alguien borra el atributo.

Es redundante a propósito: un color inválido no falla ruidosamente, se ve como un elemento transparente y puede pasar semanas sin que nadie lo note.

### Decisión 3 — Criterio operativo marca vs. semántica (la regla que gobierna el barrido)

Esta es **la** decisión de este change. Se aplica ocurrencia por ocurrencia, en este orden, y la primera que da positivo gana:

> **P1 — ¿El color está dentro de una rama que depende de un dato de negocio?**
> (un `estado`, un saldo, una fecha de vencimiento, un stock, un booleano del dominio — en un ternario, un `switch`, un mapa de tonos, o una expresión `saldo > 0 ? ... : ...`)
> → **SEMÁNTICO**. Verde → `ok`, ámbar/naranja → `warn`, rojo → `danger`. **Nunca `accent`.**
>
> **P2 — ¿Es un affordance de interacción?**
> (botón de acción primaria, link, ítem de nav activo, tab activa, focus ring, checkbox/radio marcado, fila resaltada por selección o hover, spinner de carga)
> → **ACENTO**. `bg-accent`, `text-accent`, `bg-accent-soft`, `focus:ring-accent`, `border-accent`.
>
> **P3 — ¿Es decoración de identidad, sin condición de negocio detrás?**
> (barra lateral del sidebar, placa de unidad, encabezado de marca)
> → **ACENTO**.
>
> **P4 — Ninguna de las anteriores**
> → **NEUTRAL**. `paper` / `canvas` / `line` / `line-strong` / `thead` / `ink` / `body` / `muted` / `faint`.

**Prueba de un segundo, si hay duda en P1:** *¿este elemento podría cambiar de color si cambiaran los datos, sin que nadie toque el código?* Si sí, es semántico.

**Casos trampa, ya resueltos y no renegociables:**

| Caso | Va a | Por qué |
|---|---|---|
| Botón "Guardar" / "Registrar pago" / "Cobrar" verde | `accent` | Es una acción. Su color es constante; no depende de datos. |
| Chip "PAGADO" verde | `ok` | Depende de `estado`. |
| Botón "Eliminar" rojo | `danger` | Acción destructiva: el rojo es semántico de riesgo, no de marca. **Nunca `accent`.** |
| Monto "saldo a favor" en verde (`saldoDisplay`) | `ok` | Depende del signo del balance. |
| Fila de tabla resaltada al pasar el mouse | `accent-soft` | Interacción (P2). |
| Fila de tabla resaltada porque el stock está bajo | `warn-bg` | Depende de datos (P1). |
| Ícono de éxito del toast (`ToastContainer`) | `ok` | El toast de error va a `danger`: el color codifica el tipo de mensaje. |
| Ícono de hoja / logo | `accent` (o el asset) | Identidad (P3). |
| Texto de ayuda gris bajo un input | `text-muted` | Neutral (P4). |

Cada tarea de barrido de este change lleva anotadas **cuáles** de sus ocurrencias son semánticas. Esa anotación es la unidad de revisión del diff: si un archivo terminó con cero clasificaciones semánticas y sabemos que muestra estados, se revisó mal.

### Decisión 4 — El azul informativo se colapsa a neutral (y se pregunta en el CP2)

`chequeDisplay.js` usa azul para dos cosas que **no** son ni éxito, ni advertencia, ni peligro: el estado `COBRADO` y la etiqueta de dirección "Emitido a cliente". La paleta de la spec define deliberadamente sólo tres tonos semánticos: no hay `info`.

**Decisión:** el azul informativo pasa a **neutral de token** — chip `bg-thead text-body border border-line`, texto `text-muted`. El color queda reservado para los estados que piden atención (en cartera → `warn`, rechazado → `danger`, entregado → `ok`), y el estado "ya resuelto, no hacés nada" se ve tranquilo. Es coherente con el carácter austero del sistema de diseño.

*Alternativa descartada por ahora:* agregar un cuarto par `--color-info` derivado. Se descarta porque inventa vocabulario fuera de la spec entregada, y este change **ejecuta**, no diseña.

**Se registra como Open Question y se pregunta explícitamente en el CP2**, porque hay una pérdida real: `COBRADO` deja de tener color propio. Si el usuario dice que en el mostrador necesita distinguir un cobrado de un golpe de vista, se agrega `--color-info` en ese momento — es un cambio de dos líneas en `index.css` más el mapa de tonos.

### Decisión 5 — Estrategia de ejecución: 9 grupos, ordenados por dependencia y luego por apalancamiento

El volumen (51 archivos, ~2.500 ocurrencias) es el riesgo principal del change. El orden no es arbitrario:

| # | Grupo | Archivos | Por qué en esta posición |
|---|---|---|---|
| **G0** | Fundacionales | `index.css`, `index.html`, `frontend/src/assets/` (2 logos) | Nada compila visualmente bien sin los tokens. Es la precondición de todo. |
| **G1** | Layout, sidebar y login | `DashboardLayout.jsx`, `Login.jsx` | Es donde el acento por unidad se vuelve **observable**. Si acá falla, falla todo; hay que saberlo antes de tocar 49 archivos más. **🔶 CP1** |
| **G2** | Helpers semánticos | `chequeDisplay.js`, `saldoDisplay.js`, `bandejasDisplay.js` | 14 ocurrencias que alimentan chips en ~6 páginas. Máximo apalancamiento por línea tocada, y fija el vocabulario semántico antes de que las páginas lo consuman. |
| **G3** | Finanzas y facturación | `FacturaCliente`, `Facturas`, `CuentaCorrienteCliente`, `Finanzas`, `Cheques`, `ChequeEstadoModal`, `NuevoChequeModal`, `AjusteSaldoModal` | La zona con mayor densidad semántica (pagado/parcial/deuda/vencido) — es acá donde la Decisión 3 se pone a prueba de verdad. Además tiene precedente visual (`facturacion-rediseno-visual`) y contiene la exportación a imagen. **🔶 CP2** |
| **G4** | Ventas y pedidos | `NuevaVenta`, `HistorialVentas`, `VentasLayout`, `ComprobanteVentaModal`, `Pedidos`, `PedidoNuevo`, `RecepcionPedidoModal`, `components/pedidos/*` (4) | Arquetipo distinto: flujo multi-paso con grilla editable. **🔶 CP3** |
| **G5** | Catálogos y stock | `Productos`, `ProductoForm`, `Insumos`, `InsumoForm`, `Proveedores`, `ProveedorForm`, `Clientes`, `ClienteForm`, `PaseStockModal`, `ConversorBandejas` | Arquetipo listado + formulario en modal, muy repetitivo: una vez resuelto `ProductoForm`, los demás son mecánicos. |
| **G6** | Vivero operativo | `Siembras`, `SiembraForm`, `FinalizarSiembraModal`, `VariedadesPlantas`, `VariedadPlantaForm`, `VariedadesBandejas`, `VariedadBandejaForm`, `DevolucionBandejas`, `DevolucionBandejasModal`, `HistorialBandejasModal` | Módulo funcionalmente aislado; se puede barrer de corrido. **🔶 CP4** (cubre G5 + G6) |
| **G7** | Admin, config y chrome global | `Dashboard`, `Configuracion`, `ConfiguracionMarcas`, `ConfiguracionHerramientas`, `UsuariosAdmin`, `ConfirmDialog`, `PermissionDeniedModal`, `ToastContainer` | El chrome global (diálogos, toasts) se deja para el final a propósito: se ve en todas las pantallas, así que conviene tocarlo cuando el vocabulario ya está estabilizado. |
| **G8** | Cierre | — | Barrido de residuos por grep + demo completa. **🔶 CP FINAL** |

**Cinco checkpoints** (CP1..CP4 intermedios + CP FINAL). Ninguno agrupa más de ~14 archivos. El primero llega después de 5 archivos, a propósito: es el que valida la premisa entera del change.

### Decisión 6 — Verificación en tres capas, no 51 capturas

Abrir 51 capturas es inviable y además no detecta lo que más importa (una ocurrencia sin migrar en una rama que no se renderizó). Se verifica así:

**Capa A — mecánica, exhaustiva, sobre los 51 archivos.** Un grep de literales prohibidos que debe dar **cero** resultados fuera de una allowlist documentada:

```
emerald-|green-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl
```

Cubre el 100 % de los archivos sin abrir ninguno, y es la única forma honesta de afirmar "no quedó nada". La allowlist arranca vacía; cada excepción se agrega **con su justificación escrita** (por ejemplo `text-white` sobre `bg-accent` en un botón primario, o `shadow-md` en un popover, ambos autorizados por la spec). Se corre al cierre de cada grupo, no sólo al final.

**Capa B — visual, por arquetipo, no por archivo.** Las 51 pantallas son 6 arquetipos:

1. Listado con tabla + filtros
2. Formulario dentro de modal
3. Documento / comprobante
4. Panel de indicadores
5. Flujo multi-paso con grilla editable
6. Configuración con tabs

En cada checkpoint se captura **el arquetipo representativo del grupo**, a 1366px en **ambas unidades** (Vivero y Herramientas, para probar el acento) y **una** captura a 390px para confirmar que el responsive no se rompió. Eso son 3 capturas por checkpoint, no 14.

**Capa C — de criterio, dirigida.** En cada grupo se lista qué ocurrencias se clasificaron como semánticas. Esa lista se revisa contra el diff. Detecta el error que ni el grep ni la captura ven: un chip que quedó verde pero por la razón equivocada (`accent` en vez de `ok`) — invisible en Vivero, y evidente recién cuando alguien cambia a Herramientas y el chip "PAGADO" se vuelve turquesa.

**Las capturas se toman contra el stack Docker levantado** (servicio `frontend`, Vite en :5173), igual que en `pedido-grilla-visual` y `facturacion-rediseno-visual`.

### Decisión 7 — La exportación a imagen se blinda con línea base antes de tocar nada

`FacturaCliente.jsx` exporta con `toPng` de `html-to-image`, que **clona el nodo e inlinea estilos computados**. Los `var()` ya vienen resueltos a valores concretos en `getComputedStyle`, así que en principio los tokens sobreviven al clonado. "En principio" no alcanza para código que ya se rompió dos veces.

Protocolo:

1. **Antes** de tocar `FacturaCliente.jsx` (tarea del G0, con el código todavía viejo), exportar una factura y guardar el PNG como línea base.
2. Barrer el archivo tocando **sólo** `className`. `capturarNodoComoImagen` y `esperarProximoFrame`: intactas, verificado carácter por carácter en el diff.
3. Re-exportar la misma factura y comparar contra la línea base: mismo encuadre, mismo contenido, mismos cortes, colores nuevos. Sin `var()` sin resolver, sin fondos transparentes.
4. Si algún token no sobrevive al clonado, la mitigación es fijar los valores concretos en el `style` inline del nodo raíz que se exporta — **sin** tocar la función de captura.

Es parte obligatoria del CP2.

### Decisión 8 — El login no lleva ningún nombre de sistema (enmendada en el CP1)

`Login.jsx` hoy: ícono `Leaf` de lucide-react en `text-emerald-600`, título "Vivero ERP", fondo `bg-gradient-to-br from-green-50 to-emerald-100`. Todo eso es identidad de Vivero, en la única pantalla donde la unidad **todavía no se conoce**.

- **Ícono**: se elimina el `Leaf` y su import. Sin ícono, sin logo de ninguna unidad.
- **Título visible**: **ninguno**. La propuesta original de este `design.md` proponía "Sistema de Gestión"; en la revisión del CP1 el usuario pidió sacarlo del todo — nada de "Sistema de Gestión" ni ningún otro nombre, visible o no. Queda un `<h1 className="sr-only">Iniciar sesión</h1>` fuera de pantalla, sólo para que la página tenga un heading real de cara a lectores de pantalla (accesibilidad), sin texto visible.
- **Subtítulo**: se conserva "Ingresá tus credenciales para continuar", ahora como el único texto visible sobre el panel.
- **Fondo**: el degradado verde se va. Queda `bg-canvas` con el panel en `bg-paper` + `border-line` + `rounded-panel`.
- **Botón de ingreso**: `bg-ink text-paper` — deliberadamente **sin acento**. Refuerza el mensaje: acá todavía no hay unidad. (El fallback de la Decisión 2 existe igual, como red de seguridad, no porque el login lo use.)

Es la única decisión de contenido/copy del change, y quedó enmendada una vez en el CP1 (de "con nombre genérico" a "sin nombre"). No queda abierta: el usuario fue explícito.

### Decisión 9 — Los logos se copian a `frontend/src/assets/` y se importan por módulo

`logos/` está fuera de `frontend/`, así que Vite no lo sirve. Se crea `frontend/src/assets/` y se copian ahí los dos PNG con nombres normalizados: `logo-vivero.png` (de `IL_Marca.FINAL-01.png`) y `logo-herramientas.png` (de `logo_herramientas_sin_fondo.png`).

Se importan como módulo (`import logoVivero from '../assets/logo-vivero.png'`) y no desde `public/`, para que Vite les ponga hash de contenido y los versione con el build. Los originales quedan donde están: `logos/` sigue siendo el archivo maestro.

Tratamiento por unidad, según la spec original:

- ~~**Vivero**: logo directo sobre papel (`--accent-plate: #FFFFFF`), centrado, `h-[72px] object-contain`, sin placa.~~ — **reemplazado por la Decisión 9-bis.**
- **Herramientas**: arte blanco sobre transparente, así que necesita placa oscura — `<div className="bg-[var(--accent-plate)] h-[82px] flex items-center justify-center px-2.5">` con `--accent-plate: #123238`.

Ambos dentro de una cabecera de `h-[104px]` (`h-26` no existe en la escala de Tailwind — salta de `h-24`/96px a `h-28`/112px — así que se usa el valor arbitrario exacto).

### Decisión 9-bis — Vivero también lleva placa de color (pedido del usuario en el CP1, reemplaza el punto "Vivero" de la Decisión 9)

En la revisión del CP1 el usuario pidió, directamente y por fuera de la spec de `design/`: el logo de Vivero un poco más grande, y con su propia placa de fondo **verde** — mismo tratamiento que Herramientas (una placa, no "directo sobre papel"), en vez de una placa oscura.

**Verificación de contraste antes de elegir el tono** (el logo `IL_Marca.FINAL-01.png` tiene texto "INVERNADERO LOPEZ" en marrón oscuro `#4A3B32` y hojas en verde brillante, el mismo tono que `--accent-hi`):

| Candidato | Fórmula WCAG (marrón `#4A3B32` vs. fondo) | Resultado |
|---|---|---|
| `--accent` Vivero (`#35682F`, verde oscuro) | ≈ **1.6:1** | **Descartado.** Ambos colores caen en el mismo rango de luminancia oscura — el texto prácticamente desaparece contra la placa. Confirma la sospecha del usuario. |
| `--accent-hi` Vivero (`#8CBF3F`) | ≈ **4.9:1** (pasa AA de texto normal) | Descartado por otra razón: es el **mismo verde de las hojas del logo** (`--brand-green` en `vivero-tokens.css`) — las hojas se fundirían con el fondo y desaparecerían visualmente aunque el texto se leyera bien. |
| **`--accent-soft` Vivero (`#EEF3E4`)** | ≈ **9.5:1** | **Elegido.** Verde muy suave (casi papel con un tinte), el texto marrón queda nítido y las hojas (más saturadas que el fondo) se distinguen con claridad. Es, además, el mismo token ya usado en la placa "UNIDAD DE NEGOCIO" — coherente con el resto del sidebar. |

**Resultado**: `[data-unidad="vivero"] { --accent-plate: #EEF3E4; }` (antes `#FFFFFF`), y el fallback de `:root` (Decisión 2) se actualiza igual para no desincronizarse. `DashboardLayout.jsx` deja de tener una rama especial para Vivero "sin placa": las dos unidades ahora renderizan la **misma** estructura (`<div className="bg-[var(--accent-plate)] h-[82px] ...">`), sólo cambia el logo y el valor de `--accent-plate`. El logo pasa de `h-[72px]` (sin placa) a `h-full` dentro de la placa de `h-[82px]` — el "un poco más grande" pedido.

No hizo falta pedir una versión del logo en blanco: el candidato `--accent-soft` cerró el contraste sin forzar nada.

### Decisión 10 — El `<select>` de unidad sobrevive; sólo cambia su envoltorio

La spec pide una placa "UNIDAD DE NEGOCIO" en `bg-accent-soft` donde hoy hay un `<select>` gris. **El `<select>` no se elimina**: cambiar de unidad es una función real y este change tiene prohibido tocar funcionalidad. Lo que cambia es la presentación: la placa envuelve al control y le da el rótulo, y el `<select>` queda sin borde ni fondo propio dentro de ella. Si al aplicarlo el resultado se ve mal, se reporta en el CP1 — no se resuelve borrando el control.

**Bug encontrado por el usuario en el CP1 — popup de `<option>` con texto blanco sobre blanco, corregido.** El `<select>` quedó con `bg-transparent` para integrarse visualmente en la placa (arriba). Pero `background-color` **no es una propiedad heredada** en CSS: el popup nativo de `<option>` es una caja que el navegador dibuja aparte, con su propio UA-stylesheet, y no hereda el fondo del `<select>` que lo contiene — sólo `color` se hereda (por eso el texto salía correcto, pero el fondo quedaba a criterio del navegador, y en algunos casos resultaba blanco sobre blanco). Se corrige con dos reglas nuevas en `index.css`, ambas fuera de `@theme`:

```css
:root {
  /* ...tokens de fallback... */
  color-scheme: light dark; /* sincroniza el chrome nativo (popup de <select>, scrollbars)
                                con el @media (prefers-color-scheme: dark) existente */
}

select option {
  background-color: var(--color-paper);
  color: var(--color-ink);
}
```

Esto fija el contraste de **cualquier** `<select>` del sitio, no sólo el de unidad de negocio — es la corrección genérica y a nivel de token, coherente con el resto del sistema de diseño. Verificado con Playwright abriendo el popup real: fondo `rgb(255,255,255)` (`--color-paper`), texto `rgb(34,29,26)` (`--color-ink`), `color-scheme: light dark` aplicado.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| **El volumen degrada el criterio.** Para el archivo 40 la tentación de aplicar un `sed` y seguir es real; ahí es donde se rompe la semántica. | El grep de Capa A corre **al cierre de cada grupo**, no sólo al final. La lista de clasificaciones semánticas (Capa C) es obligatoria por grupo. Cinco checkpoints, ninguno con más de ~14 archivos. |
| **Un chip semántico clasificado como `accent`** queda invisible en Vivero (ambos son verdes) y sólo se descubre en Herramientas, donde el chip "PAGADO" aparece turquesa. | Toda captura de checkpoint se toma **en las dos unidades**. Es exactamente el defecto que esto caza. |
| **Los tokens no sobreviven al clonado de `html-to-image`** y la factura exportada sale con fondos transparentes. | Línea base **antes** de tocar nada (Decisión 7), comparación obligatoria en el CP2, mitigación con estilos inline en el nodo raíz sin tocar la función de captura. |
| **Regresión de contraste en dark mode.** Los bloques dark de la spec no se validaron contra estas pantallas reales; el par `--accent-ink: #171412` sobre `--accent: #A6D65B` es texto oscuro sobre acento claro, que invierte la relación del modo claro. | Una captura en dark en el CP FINAL. Si algún par falla, se corrige el token en `index.css` — nunca con un override por componente. |
| **La sesión paralela.** Puede haber otro agente escribiendo en este mismo working directory. | Este change toca **exclusivamente** `frontend/` (más `openspec/changes/sistema-diseno-acento-por-unidad/`). **Cero archivos `.java`.** Cualquier archivo backend modificado en el árbol pertenece a otra sesión: no se toca ni se usa de referencia. Antes de cada grupo, `git status`. |
| **`rounded-lg` en la lista de literales prohibidos** también matchea usos legítimos que la spec no menciona explícitamente. | La allowlist de la Capa A es explícita y justificada por escrito. Ante duda, el default es migrar a `rounded-base`; `rounded-full` se conserva **sólo** en chips de estado, tal como dice la spec. |
| **Sin tests automatizados de UI**, la única red es visual. | Aceptado: es la misma situación de `pedido-grilla-visual` y `facturacion-rediseno-visual`, y el riesgo funcional es bajo porque no se toca lógica. La Capa A compensa dando cobertura mecánica del 100 % de los archivos. |

**Trade-off asumido**: la Capa B verifica por muestra, no exhaustivamente. Es posible que una pantalla del G5 o G6 quede con una imperfección visual que ninguna captura mostró. Se acepta conscientemente: el costo de 51 revisiones visuales no se justifica para un cambio sin riesgo funcional, y la Capa A garantiza que al menos no quedó nada **sin migrar**.

## Open Questions

1. ⚠️ **Azul informativo** (Decisión 4): ¿`COBRADO` y "Emitido a cliente" se quedan en neutral, o hace falta un `--color-info`? → **Sin respuesta explícita registrada.** El checkpoint 2 (`tasks.md` 6.1) nunca se marcó `[x]` ni tiene una nota de resolución — a diferencia del CP1 (3 rondas documentadas) y el CP4 (bugs encontrados y corregidos, documentados en 11.1), no hay evidencia en `tasks.md` de que esta pregunta se le haya mostrado al usuario ni de que haya respondido. Pese a eso, el trabajo **continuó** de G4 en adelante aplicando la colapsión a neutral como default operativo — y la reutilizó activamente en nuevas clasificaciones (`PENDIENTE`/`CANCELADO` en `Pedidos.jsx`, 7.9) sin que quedara registrada una objeción del usuario en ningún checkpoint posterior. Es un hueco de proceso real, no una decisión tomada: si hace falta un `--color-info` en el futuro, es una pregunta que sigue abierta y requiere volver a plantearla.
2. ~~**Copy del login** (Decisión 8): ¿"Sistema de Gestión" queda, o el usuario prefiere otro nombre?~~ → **Resuelta en el CP1**: ningún nombre, ni "Sistema de Gestión" ni otro. Ver Decisión 8 enmendada.
3. ~~**Placa de unidad** (Decisión 10): con el `<select>` adentro, ¿la placa se ve como pide el mockup o quedó forzada?~~ → **Resuelta en el CP1**, aunque no como pregunta de gusto sino como bug real: el `<select>` abierto mostraba texto blanco sobre fondo blanco (illegible). Corregido — ver la nota de contraste en la Decisión 10. La estructura de la placa en sí (rótulo + `<select>` envuelto) no recibió objeciones.
4. **Dark mode**: ¿se deja entrar por `prefers-color-scheme` (como trae la spec) o el usuario prefiere forzar modo claro hasta validarlo mejor? → **Parcialmente resuelta, sigue abierta para el CP FINAL (13.9).** En el CP4 (11.1) el usuario ya probó dark mode en vivo y encontró un bug real (`--accent-ink` casi negro sobre `--accent` en oscuro, texto invisible), corregido en `index.css` para vivero y herramientas — lo que confirma que el modo oscuro **entra** por `prefers-color-scheme` (no se forzó modo claro) y que el usuario lo está validando activamente. Lo que falta y sigue pendiente de la tarea 13.7 (no es tarea de este agente): la captura formal de un arquetipo de cada pantalla en dark mode como evidencia de cierre, y la confirmación explícita de que el resto de los pares `-ink`/base quedaron bien tras el fix puntual del CP4.
5. ~~**Logo de Vivero con placa verde** (Decisión 9-bis, nueva en el CP1): el usuario pidió el cambio directamente, no una alternativa a evaluar.~~ → **Resuelta en el CP1**: tamaño y tono confirmados por el usuario con capturas reales (`img/fix3-*`, ver Decisión 9-bis), sin objeciones posteriores en los checkpoints 2-4.

## Allowlist final (G8)

Resultado del grep de cierre (tasks.md 13.1) — patrón ampliado sobre `frontend/src/` completo:
`emerald-|green-[0-9]|purple-[0-9]|orange-[0-9]|amber-[0-9]|blue-[0-9]|red-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl`.

**Migrado en esta ronda (no es excepción, es un residuo real que se corrigió):** `utils/bandejasDisplay.js` — `TONO_ENTREGA` seguía en `bg-orange-50 text-orange-700` (literal Tailwind, no token). El naranja no pertenecía a la paleta vieja reemplazada por G0-G7 y por eso el grep base de la Capa A nunca lo capturó; quedó anotado como "candidato a `warn` en un barrido futuro" desde la tarea 4.2 (G2). Este es ese barrido futuro. Migrado a `bg-warn-bg text-warn-ink` (Decisión 3: depende de `tipo === 'ENTREGA'`, dato de negocio → semántico, nunca `accent`), mismo vocabulario que `EN_CARTERA`/`TONO_AMBAR` en `chequeDisplay.js`.

**Sombras — excepción legítima, sólo en elementos flotantes** (regla: ninguna sombra fuera de un elemento que realmente flota sobre el resto del contenido):
| Archivo | Clase | Por qué es legítima |
|---|---|---|
| `components/ConfirmDialog.jsx:42` | `shadow-md` | Modal de confirmación, autorizado explícitamente en la tarea 12.3. |
| `components/PermissionDeniedModal.jsx:25` | `shadow-md` | Modal de acceso denegado, autorizado explícitamente en la tarea 12.3. |
| `components/pedidos/PanelDescuentosLinea.jsx:31` | `shadow-lg` | Popover de descuentos, `position: fixed` sobre la grilla de `PedidoNuevo.jsx` (ver comentario en el propio archivo, ronda post-12.3). No estaba en la lista original de 12.3 porque ese popover no existía todavía en esa ronda, pero cumple el mismo criterio — un elemento que se superpone al resto del contenido necesita despegarse visualmente. |
| `components/pedidos/ProductoSearchSelect.jsx:216` | `shadow-lg` | Dropdown de resultados de búsqueda de producto, `position: absolute`, se superpone a las filas de abajo. Mismo criterio que el popover de descuentos. |
| `pages/NuevaVenta.jsx:592` | `shadow-lg` | FAB (Floating Action Button) del carrito en mobile, `position: fixed` (`lg:hidden fixed bottom-6 right-6 z-30`). Flota literalmente sobre el contenido de la página. |

Ningún otro archivo del árbol tiene `shadow-*` de ningún tipo (verificado con grep dedicado sobre `shadow(-[a-z0-9]+)?\b`, excluyendo la utilidad `transition-shadow` que no pinta sombra).

**Zona protegida explícita — no se toca, ni una línea, ni un comentario:**
| Archivo | Literal | Por qué |
|---|---|---|
| `pages/FacturaCliente.jsx:86` | `backgroundColor: '#f9fafb', // gray-50` | Opción del objeto que se le pasa a `toPng()` **dentro** de `capturarNodoComoImagen` — no es una clase Tailwind ni un `className`, y esa función está fuera de alcance por diseño explícito de este change (ver tasks.md, cabecera y 5.10). Queda desincronizada de `--color-canvas` a propósito; anotado como nota para un change futuro, no se corrige acá. |

**Hex directo fuera del sistema de tokens (no es un `className`, no lo captura el grep de Capa A, pero es la misma clase de excepción por naturaleza):**
| Archivo | Literal | Por qué |
|---|---|---|
| `pages/Finanzas.jsx:278-279` | `color: '#1F7A4C'` / `'#B3261E'` en `chartData` | Recharts pinta el gráfico de torta con el atributo SVG `fill`, que no resuelve `var()` de forma confiable entre navegadores — por eso se usan los valores concretos de `--color-ok`/`--color-danger` en vez de la paleta vieja (emerald/red) que reemplazaban. Documentado en un comentario en el propio archivo. |

**`text-white` sobre `bg-accent` (el caso que la tarea esperaba encontrar):** no sobrevivió ninguna ocurrencia literal de `text-white`. Todos los botones primarios sobre `bg-accent` migraron a `text-paper` (que resuelve al mismo blanco/crema vía token, con el beneficio de invertirse correctamente en dark mode) — el patrón "blanco sobre acento sólido" quedó implementado, pero con el token correcto en vez del literal Tailwind.

**Comentarios de documentación histórica (prosa que cita clases viejas entre backticks al narrar una decisión de una ronda anterior — no es código, no se toca):**
`components/pedidos/CeldaDescuentos.jsx:41`; `components/pedidos/FilaItemPedido.jsx:56,157,204,209,210,554,555`; `components/pedidos/PanelDescuentosLinea.jsx:24,27`; `components/ProveedorForm.jsx:7`; `pages/PedidoNuevo.jsx:861,877,878,879,880,882`. Mismo criterio ya aceptado en checkpoints anteriores (ver 9.3, 7.9, 12.5).
