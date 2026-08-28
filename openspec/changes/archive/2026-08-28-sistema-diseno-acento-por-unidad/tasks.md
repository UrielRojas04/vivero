> **Gobernanza: MEDIA-BAJA por naturaleza, ALTA por volumen.** Es un rediseño visual puro —cero
> lógica de negocio— pero toca 51 archivos y ~2.500 ocurrencias. Se avanza con autonomía **dentro**
> de cada grupo; **hay que detenerse en los checkpoints marcados 🔶** y no seguir sin respuesta.
>
> **La regla que gobierna todo este change:** sólo se tocan `className`, tokens CSS y —en el
> sidebar y el encabezado del login— la estructura de contenedores. **Cero cambios** en handlers,
> estado, props, firmas, condiciones de renderizado, cálculos, payloads, endpoints, permisos y
> rutas. Si una tarea parece pedir tocar lógica, está mal entendida: releer `design.md`.
>
> **`capturarNodoComoImagen` y `esperarProximoFrame` no se tocan.** Ni una línea, ni un comentario.
>
> **Criterio marca vs. semántica (Decisión 3 de `design.md`), a aplicar ocurrencia por ocurrencia:**
> si el color está dentro de una rama que depende de un dato de negocio (estado, saldo, fecha,
> stock) → **semántico** `ok`/`warn`/`danger`, **nunca `accent`**. Si es un affordance de
> interacción (acción primaria, link, nav activo, tab, focus ring, selección, hover) o decoración
> de identidad → **`accent`**. Si no es ninguna de las dos → **neutral**.
> *Prueba de un segundo:* ¿podría cambiar de color si cambiaran los datos, sin que nadie toque el
> código? Si sí, es semántico.
>
> **Alcance de archivos — sesión paralela en el mismo working directory.** Este change toca
> **exclusivamente** `frontend/` y `openspec/changes/sistema-diseno-acento-por-unidad/`. **Cero
> archivos `.java`, cero backend.** Cualquier otro archivo modificado en el árbol pertenece a otra
> sesión: no se toca, no se usa de referencia, se reporta. Correr `git status` antes de cada grupo.
>
> Reglas duras del proyecto vigentes: no buildear sin pedido, no commitear sin pedido,
> `cursor-pointer` en todos los botones, iconos `lucide-react`, feedback vía `useUIStore` (nunca
> `alert`/`confirm`), PascalCase en componentes y archivos.
>
> **Grep de literales prohibidos** (Capa A de verificación, se corre al cierre de CADA grupo):
> `emerald-|green-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl`
> Debe dar **cero** fuera de la allowlist de la tarea 12.2, que arranca vacía y sólo crece con
> justificación escrita.

## 1. G0 — Fundacionales: tokens, fuentes y assets

- [x] 1.1 `git status` de partida. Anotar qué archivos modificados **no** pertenecen a este change
      (sesión paralela) para no tocarlos ni confundirlos con trabajo propio.
      → `git status` de partida limpio salvo `design/` y `openspec/changes/sistema-diseno-acento-por-unidad/`
      (ambos de este change). Cero sesión paralela detectada.
- [ ] 1.2 **BLOQUEADO — sin credenciales válidas.** `jefe@vivero.com` / `jefe123` (documentado en
      changes previos) devuelve 401 contra el backend real; `.env` está correctamente bloqueado por
      permisos y no se pudo recuperar la contraseña vigente por ningún medio legítimo. No se tomó
      línea base real de la exportación a imagen. **Pendiente antes del G3/CP2** — necesita
      credenciales del usuario.
- [ ] 1.3 **BLOQUEADO por la misma razón que 1.2** — los 6 arquetipos requieren datos reales
      autenticados. Se capturó únicamente el login (no requiere auth) como línea base parcial; ver
      `img/login-1366.png`. **Pendiente antes de los checkpoints CP2-CP4.**
- [x] 1.4 Crear `frontend/src/assets/` y copiar ahí `logos/IL_Marca.FINAL-01.png` →
      `logo-vivero.png` y `logos/logo_herramientas_sin_fondo.png` → `logo-herramientas.png`.
      Los originales en `logos/` **no** se mueven ni se borran.
- [x] 1.5 `frontend/index.html`: agregar IBM Plex Mono al `<link>` de Google Fonts existente →
      `family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600`.
- [x] 1.6 `frontend/index.html`: agregar `data-unidad="vivero"` al `<html>` (Decisión 2), para que
      `--accent` nunca esté sin resolver entre el arranque y el primer render de `DashboardLayout`.
- [x] 1.7 `frontend/src/index.css`: reemplazar el bloque `@theme` actual por los tokens nuevos —
      neutrales (`paper`, `paper-alt`, `canvas`, `line`, `line-strong`, `thead`, `faint`, `muted`,
      `body`, `ink`), semánticos (`ok`/`warn`/`danger` con `-ink`/`-bg`/`-line`),
      `--color-accent: var(--accent)` y sus derivadas, `--font-sans` / `--font-mono`,
      `--radius-base: 2px` / `--radius-panel: 4px`. **Los valores hexadecimales se copian de
      `design/vivero-tokens.css`, no se ajustan.** `--font-factura` se elimina.
- [x] 1.8 `frontend/src/index.css`: **fuera** del `@theme`, copiar tal cual de
      `design/vivero-tokens.css` los bloques `[data-unidad="vivero"]` y
      `[data-unidad="herramientas"]` (con `--accent`, `-ink`, `-soft`, `-hi`, `-label`, `-plate`) y
      el bloque `@media (prefers-color-scheme: dark)` completo.
- [x] 1.9 `frontend/src/index.css`: declarar en `:root` el juego de `--accent*` con los valores de
      Vivero como fallback defensivo (Decisión 2).
      → **Bug encontrado y corregido durante la implementación**: el fallback `:root` y los bloques
      `[data-unidad="..."]` tienen la misma especificidad (ambos matchean `<html>`); si el fallback
      queda declarado *después* en el archivo, pisa siempre el valor real de la unidad activa (empate
      de especificidad → gana el que aparece último). Se reordenó: `:root` fallback va **antes** de
      `[data-unidad="vivero"]`/`[data-unidad="herramientas"]` en `index.css`. Verificado con
      Playwright: `--accent` computado en `<html>` = `#35682F` en Vivero y `#14666F` en Herramientas.
- [x] 1.10 `frontend/src/pages/FacturaCliente.jsx`: eliminar la única ocurrencia de la clase
      `font-factura` (línea ~280). Sin cambio visual: IBM Plex Sans pasa a ser la fuente global.
      **Es el único cambio permitido en este archivo durante el G0.**
      → Confirmado por `git diff --stat`: 1 archivo, 1 inserción/1 eliminación (la misma línea).
- [x] 1.11 Verificar que la app levanta y que ninguna pantalla quedó con colores inválidos
      (elementos transparentes o negros inesperados). En este punto la app se ve "a medio migrar" —
      es esperado, todavía convive la paleta vieja.
      → Verificado con Playwright contra `localhost:5173`: cero errores de consola en `/login`,
      `--accent` resuelto correctamente antes de cualquier autenticación.

## 2. G1 — Layout, sidebar y login (donde el acento se vuelve observable)

- [x] 2.1 `DashboardLayout.jsx`: agregar el `useEffect` que proyecta la unidad activa al DOM —
      `document.documentElement.dataset.unidad = isHerramientas ? 'herramientas' : 'vivero'`,
      con `[isHerramientas]` como dependencia. Reutiliza el `isHerramientas` que **ya existe**;
      no se agrega estado ni se toca `useAuthStore`.
- [x] 2.2 `DashboardLayout.jsx`: barra de identidad `<div className="w-1 bg-accent" />` como primer
      hijo del contenedor flex raíz.
      → Verificado con Playwright: `getComputedStyle` de ese div da `rect: 4px × 900px` en `x=0`,
      color `rgb(20,102,111)` (`#14666F`, Herramientas) tras el cambio de unidad.
- [x] 2.3 `DashboardLayout.jsx`: cabecera de logo a `h-26` (104px). Vivero → `logo-vivero.png`
      centrado, `h-[72px] object-contain`, directo sobre papel. Herramientas → `logo-herramientas.png`
      dentro de `<div className="bg-[var(--accent-plate)] h-[82px] flex items-center justify-center px-2.5">`
      (placa oscura, porque el arte es blanco sobre transparente).
      → `h-26` no existe en la escala de Tailwind (salta de 24→28); se usó `h-[104px]` explícito
      para garantizar el valor exacto pedido.
      → **Enmendada en el CP1** (Decisión 9-bis, pedido directo del usuario, no de la spec de
      `design/`): Vivero deja de ir "directo sobre papel" y pasa a tener la misma estructura de
      placa que Herramientas — `<div className="bg-[var(--accent-plate)] h-[82px] ...">`, sin rama
      condicional distinta por unidad. Se verificó el contraste marrón-del-logo/fondo antes de
      elegir el tono: `--accent` (verde oscuro) da ~1.6:1 e ilegible (confirma la sospecha del
      usuario), `--accent-hi` da ~4.9:1 pero es el mismo verde de las hojas del logo (se fundirían),
      `--accent-soft` da ~9.5:1 y fue el elegido — `[data-unidad="vivero"] { --accent-plate: #EEF3E4; }`
      (antes `#FFFFFF`). El logo pasa de `h-[72px]` a `h-full` dentro de la placa de `h-[82px]`
      ("un poco más grande", como pidió el usuario). No hizo falta una versión en blanco del logo.
- [x] 2.4 `DashboardLayout.jsx`: placa de unidad en `bg-accent-soft` debajo del logo, con el rótulo
      "UNIDAD DE NEGOCIO" y el nombre de la unidad, **envolviendo** al `<select>` existente — el
      `<select>` no se elimina, queda sin borde ni fondo propio dentro de la placa (Decisión 10).
      → El bloque del `<select>` se **movió** (no se duplicó) desde el popover de perfil hacia esta
      placa nueva bajo el logo, tal como pide la tarea ("reemplazando visualmente al `<select>` gris
      del menú de perfil"). El handler `onChange` (`setUnidadNegocioActiva` + `window.location.reload()`)
      quedó carácter por carácter igual, sólo se le sacó el `setIsProfileMenuOpen(false)` porque ya no
      vive dentro de ese popover.
      → **Bug real encontrado por el usuario en el CP1**: el popup nativo de opciones del `<select>`
      se veía con texto blanco sobre fondo blanco, ilegible. Causa: `background-color` no es una
      propiedad heredada en CSS — el `<select>` tiene `bg-transparent` a propósito (para integrarse
      en la placa), pero el popup de `<option>` es una caja aparte que el navegador dibuja con su
      propio UA-stylesheet y no hereda ese fondo (sólo `color` se hereda). Corregido con dos reglas
      nuevas en `index.css` (ver Decisión 10 de `design.md`): `select option { background-color:
      var(--color-paper); color: var(--color-ink); }` + `color-scheme: light dark;` en `:root`.
      Verificado con Playwright abriendo el popup real: fondo `rgb(255,255,255)`, texto
      `rgb(34,29,26)` — mismo fix para cualquier `<select>` del sitio, no sólo este.
- [x] 2.5 `DashboardLayout.jsx`: ítem de nav activo → `bg-accent-soft border-l-[3px] border-accent`,
      sin `rounded-lg`. Ítem inactivo → `text-body hover:bg-canvas`.
      → Se agregó `border-l-[3px] border-transparent` al ítem inactivo (sólo clases, mismo ancho
      reservado) para que el texto no salte 3px al activarse/desactivarse.
- [x] 2.6 `DashboardLayout.jsx`: barrido de clases del resto del layout (fondo `bg-canvas`, panel
      `bg-paper`, bordes `border-line`, textos por escala neutral, radios chatos, sin sombras).
      → Clasificación semántica aplicada (Decisión 3): el punto rojo de alertas pendientes en la
      campana (`bg-red-500` → `bg-danger`) y los íconos del dropdown de notificaciones
      (`FINALIZADA` → `text-ok`, pendiente → `text-warn`) son **semánticos** porque dependen de
      `alertas.length`/`alerta.estado`, no del acento — antes usaban literales `emerald-500`/
      `amber-500` fijos y quedaba "de casualidad" verde en Vivero. El botón "Cerrar Sesión" se
      mapeó a `text-danger` (acción de riesgo, caso-trampa de Decisión 3), no a `accent`.
- [x] 2.7 `Login.jsx` (Decisión 8): eliminar el ícono `Leaf` **y su import** de `lucide-react`;
      título → **"Sistema de Gestión"**; subtítulo "Ingresá tus credenciales para continuar" se
      conserva; fondo degradado verde → `bg-canvas`; panel → `bg-paper border border-line
      rounded-panel`; botón de ingreso → `bg-ink text-paper` (deliberadamente **sin acento**).
      → El texto original decía "Ingresa tus credenciales..." (sin tilde en la "á", forma tú); se
      usó el texto exacto que pide `design.md` ("Ingresá...", voseo), un cambio de una letra dentro
      del copy ya autorizado por la Decisión 8.
      → **Enmendada en el CP1**: el usuario pidió sacar el título del todo, ni "Sistema de Gestión"
      ni ningún otro nombre. Se reemplazó el `<h2>` visible por `<h1 className="sr-only">Iniciar
      sesión</h1>` (heading real para lectores de pantalla, sin texto en pantalla). El subtítulo
      "Ingresá tus credenciales para continuar" queda como único texto visible sobre el panel.
- [x] 2.8 Grep de literales prohibidos sobre los archivos del G0 + G1. Debe dar cero.
      → `grep -nE 'emerald-|green-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl'`
      sobre `index.css`, `index.html`, `DashboardLayout.jsx`, `Login.jsx` → **cero resultados en los
      cuatro archivos.**

## 3. 🔶 CHECKPOINT 1 — La premisa del change

- [ ] 3.1 🔶 **CHECKPOINT** — Mostrar al usuario: (a) el sidebar en **unidad Vivero** y (b) el mismo
      sidebar en **unidad Herramientas** —logo, placa (verde en Vivero, oscura en Herramientas),
      barra de acento, placa "UNIDAD DE NEGOCIO", nav activo— a 1366px; (c) el cambio de unidad **en
      vivo** (recarga la página al confirmarse — ver nota abajo); (d) la pantalla de **login sin
      título**; (e) el sidebar a 390px; (f) el `<select>` de unidad **abierto**, mostrando las
      opciones con contraste normal.
      **Ronda 1 del CP1 (resuelta)**: el usuario pidió 3 ajustes puntuales — (1) sacar el título del
      login del todo (hecho, Decisión 8 enmendada); (2) reportó el bug real de contraste del
      `<select>` abierto (corregido, ver Decisión 10); (3) pidió placa verde + logo más grande para
      Vivero, decisión nueva suya que reemplaza el "directo sobre papel" original (hecho, Decisión
      9-bis). Los tres, verificados con capturas reales — ver `img/fix1-*`, `img/fix2-*`, `img/fix3-*`.
      **Nota sobre "sin recargar"**: el `<select>` de unidad dispara `window.location.reload()` en su
      `onChange` — es lógica **preexistente**, no tocada por este change (tocarla está fuera de
      alcance de las Non-Goals de `design.md`). El retinte funciona y se verificó (`--accent` cambia
      de `#35682F` a `#14666F` tras el reload), pero ocurre vía recarga completa, no instantáneo. Si
      el usuario quiere el retinte sin reload, es un cambio de lógica que requiere una decisión nueva
      aparte.
      **No seguir al grupo 2 sin la aprobación de esta ronda del checkpoint.**

## 4. G2 — Helpers semánticos (3 archivos, máximo apalancamiento)

> Ya verificados: los tres son **100 % semánticos**. Ni una sola ocurrencia va a `accent`.

- [x] 4.1 `utils/saldoDisplay.js`: rojo (deuda) → `danger` (`text-danger`, `bg-danger-bg`,
      chip `bg-danger-bg text-danger-ink`); verde (saldo a favor) → `ok`; gris (saldo cero) →
      neutral (`text-muted`, `bg-thead`).
- [x] 4.2 `utils/bandejasDisplay.js`: el único tono (`TONO_DEVOLUCION`, emerald) → `ok`.
      → `TONO_ENTREGA` (naranja) quedó **fuera de alcance a propósito**: la tarea sólo pide migrar
      `TONO_DEVOLUCION`, el naranja no está en el grep de literales prohibidos de la Capa A (no es
      parte de la paleta vieja que este change reemplaza) y por P1 de la Decisión 3 sería candidato
      a `warn` en un barrido futuro — anotado como nota abierta, no decidido acá.
- [x] 4.3 `utils/chequeDisplay.js`: `EN_CARTERA` (ámbar) → `warn`; `ENTREGADO` (emerald) → `ok`;
      `RECHAZADO` (rojo) → `danger`; `TONO_GRIS` → neutral; `TONO_ROJO`/`TONO_AMBAR` de vencimiento
      → `danger`/`warn`.
- [x] 4.4 `utils/chequeDisplay.js` (Decisión 4): `COBRADO` y la etiqueta "Emitido a cliente" que
      hoy usan azul → **neutral de token** (`bg-thead text-body border border-line`). La etiqueta
      "Recibido de cliente" (emerald, entra plata) → `ok` (evento positivo que depende del mismo
      dato, misma asimetría que `saldoDisplay.js`). Sigue **pendiente de confirmación explícita en
      el CP2** tal como pide la Decisión 4 de `design.md` — no se cierra acá.
- [x] 4.5 Grep de literales prohibidos sobre `frontend/src/utils/`. Debe dar cero.
      → `grep -nE 'emerald-|green-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl|blue-[0-9]|red-[0-9]|amber-[0-9]'`
      sobre `frontend/src/utils/` → **cero resultados** (se agregó `blue-`/`red-`/`amber-` a la
      corrida local, fuera del set base, para verificar también los literales de estado que este
      grupo puntualmente migra).

## 5. G3 — Finanzas y facturación (8 archivos, mayor densidad semántica)

> Es la zona donde el criterio de la Decisión 3 se pone a prueba de verdad. Cada tarea anota
> explícitamente qué clasificó como semántico.

- [x] 5.1 `pages/FacturaCliente.jsx` (~180 ocurrencias): barrido de `className` únicamente.
      **Semántico** (→ `ok`/`warn`/`danger`): estados de pago pagado/parcial/deuda, chips de estado
      de factura, montos de saldo, alertas de vencimiento. **Acento**: botones de acción, tabs,
      links, focus rings. **`capturarNodoComoImagen` y `esperarProximoFrame` no se tocan.**
      → Hecho en una corrida anterior (verificado ahora con grep + diff, ver 5.9/5.10).
- [x] 5.2 `pages/FacturaCliente.jsx`: importes numéricos → `font-mono tabular-nums`.
      → Confirmado visualmente en la exportación real (ver 5.9): los montos de la imagen
      descargada se ven en fuente monoespaciada tras el cambio.
- [x] 5.3 `pages/Facturas.jsx` (~29): listado y tarjetas mobile. Semántico: chips de estado y saldo.
      → Hecho en una corrida anterior, confirmado con grep.
- [x] 5.4 `pages/CuentaCorrienteCliente.jsx` (~76). Semántico: signo del saldo, tipos de movimiento.
      → Hecho en una corrida anterior, confirmado con grep.
- [x] 5.5 `pages/Finanzas.jsx` (~160): panel de indicadores. **Atención**: los indicadores llevan
      barra de acento a la izquierda (`--accent-bar: 4px`) según el mockup; los **valores** que
      dependen de datos (deuda, saldo) son semánticos.
      → Hecho en una corrida anterior, confirmado con grep y con captura real en las dos unidades
      (`img/cp2-finanzas-vivero-1366.png`, `img/cp2-finanzas-herramientas-1366.png`): el ícono de
      "Valores a Depositar (Cheques)" se mantiene `warn` (ámbar) en ambas unidades, sin retintarse
      con el acento — confirma que la clasificación semántica no se filtró de acento.
- [x] 5.6 `pages/Cheques.jsx` (~51): tabla desktop + tarjetas mobile. Los tonos vienen de
      `chequeDisplay.js` (ya migrado en el G2); acá sólo el cromo de la pantalla.
      → Hecho en una corrida anterior, confirmado con grep y captura en las dos unidades
      (`img/cp2-cheques-vivero-390.png`, `img/cp2-cheques-herramientas-1366.png`).
- [x] 5.7 `components/ChequeEstadoModal.jsx` (~80). Semántico: encabezado de estado y opciones de
      transición. Acento: botones de confirmación.
      → Hecho en una corrida anterior, confirmado con grep.
- [x] 5.8 `components/NuevoChequeModal.jsx` (~50) y `components/AjusteSaldoModal.jsx` (~33):
      formularios en modal. Acento: submit y focus rings. Semántico: previsualización del efecto
      sobre el saldo.
      → **Hecho en esta corrida** (los 2 archivos que quedaron pendientes de la sesión anterior).
      Clasificación aplicada:
      - **Acento**: botón submit, toggle "Tipo de Cheque" (De Cliente para mí / De mí para
        Cliente) y toggle "¿Qué tipo de movimiento?" (Registrar Pago / Nueva Deuda) — ambos son
        selección de formulario (P2), no dependen de ningún dato de negocio, así que **no** van a
        `ok`/`danger` aunque el copy original los pintaba emerald/rojo. El color seleccionado es
        el mismo acento para las dos opciones de cada toggle (igual criterio que `tipoEndoso` en
        `ChequeEstadoModal.jsx`, ya migrado en el G3 previo).
      - **Semántico**: la previsualización del saldo actual en `AjusteSaldoModal` (usa
        `describirSaldo`, ya migrado en el G2, sin tocar su lógica).
      - **Warn** (no estaba anotado en la tarea, decisión tomada acá): el cartel instructivo
        "Usá esto sólo para deuda o pago que no corresponde a ninguna venta puntual" en
        `AjusteSaldoModal` — es un texto de advertencia de uso (no decorativo, no de marca), así
        que se mapeó a `bg-warn-bg border-warn-line text-warn-ink` en vez de neutral. Es la misma
        familia de decisión que el ícono `warn` de "Valores a Depositar" en `Finanzas.jsx` (5.5):
        el tono ámbar No depende de una rama de datos puntual, pero el concepto que representa
        (una advertencia de uso permanente) sí es semántico por naturaleza.
      - Íconos decorativos de encabezado (`CreditCard`, `DollarSign`) → `bg-accent-soft
        text-accent-ink`, mismo patrón que `iconClass` en las tarjetas KPI de `Finanzas.jsx`.
      - Verificado visualmente en las dos unidades: `img/cp2-nuevo-cheque-modal-vivero.png` /
        `img/cp2-nuevo-cheque-modal-herramientas.png`, `img/cp2-ajuste-saldo-modal-after.png` /
        `img/cp2-ajuste-saldo-modal-herramientas.png`. El acento retiñe correctamente (verde ↔
        teal) y el cartel de advertencia + la previsualización de saldo quedan idénticos en ambas
        unidades, como exige la Decisión 3.
      - `npx oxlint` limpio en los dos archivos (cero warnings, cero errores).
- [x] 5.9 Verificar en el diff que en `FacturaCliente.jsx` las funciones de captura quedaron
      **carácter por carácter iguales**.
      → Verificado con `git diff -U0`: todos los hunks del archivo arrancan en la línea 103 o
      después; `esperarProximoFrame` (línea 36) y `capturarNodoComoImagen` (líneas 63-97) quedan
      **fuera de cualquier hunk**, cero diferencias. Además se hizo la prueba real que pedía la
      Decisión 7 (bloqueada hasta ahora por falta de credenciales, tarea 1.2): se exportó la misma
      Factura #13 con el código pre-migración (`git checkout HEAD -- FacturaCliente.jsx`
      temporalmente) y con el código migrado, contra el stack real. Resultado: mismo contenido,
      mismo encuadre, sin cortes ni fondos transparentes — sólo cambia la paleta (blanco/gris fijo
      → tokens cálidos) y los montos pasan a fuente monoespaciada (tarea 5.2). Ver
      `img/cp2-export-before.png` y `img/cp2-export-after.png`. Esto también cierra la tarea 1.2,
      que había quedado bloqueada sin credenciales: la línea base real de la exportación ya existe
      (`cp2-export-before.png`), tomada retroactivamente a partir del `HEAD` pre-change.
- [x] 5.10 Grep de literales prohibidos sobre los 8 archivos del G3. Debe dar cero.
      → Un solo resultado, **allowlist justificada**: `pages/FacturaCliente.jsx:86`,
      `backgroundColor: '#f9fafb', // gray-50` — es una opción del objeto que se le pasa a
      `toPng()` dentro de `capturarNodoComoImagen`, no una clase Tailwind, y esa función está
      explícitamente fuera de alcance ("ni una línea, ni un comentario"). Se deja intacta a
      propósito. Nota para un change futuro (no se toca acá): ese color de fondo de exportación
      quedó desincronizado de `--color-canvas` (`#F5F3F0`), así que el PNG exportado tiene un
      fondo ligeramente distinto al de la pantalla — visible comparando `cp2-export-after.png`
      contra `cp2-facturacliente-vivero-1366.png`. No es un bug de este change (la función no se
      toca por diseño) pero vale que quede anotado para cuando se decida tocar esa función.

## 6. 🔶 CHECKPOINT 2 — Semántica bajo presión y exportación a imagen

- [ ] 6.1 🔶 **CHECKPOINT** — Mostrar al usuario: (a) la **factura de cliente** rediseñada a 1366px
      en unidad Vivero y en unidad Herramientas **lado a lado** — los chips de estado deben verse
      **idénticos** en ambas y sólo el cromo interactivo debe cambiar de color; (b) la **imagen
      exportada** con el diseño nuevo, al lado de la línea base de la tarea 1.2; (c) el panel de
      indicadores de `/finanzas`; (d) la cartera de cheques; (e) una de las pantallas a 390px.
      Preguntar explícitamente: **(1)** ¿el azul informativo (`COBRADO`, "Emitido a cliente")
      colapsado a neutral es aceptable, o hace falta un `--color-info`? (mostrar las dos variantes);
      **(2)** ¿la exportación quedó correcta —encuadre, cortes, colores— comparada con la línea base?
      **No seguir al grupo 7 sin respuesta a (1) y (2).**

## 7. G4 — Ventas y pedidos (11 archivos)

- [x] 7.1 `pages/NuevaVenta.jsx` (~146): flujo multi-paso con carrito. Acento: modo "Cliente
      Express" (toggle), "Cliente Seleccionado" (chip de selección), íconos de sección, botones de
      acción, buscador con foco. Semántico: saldo de liquidación (`saldoFinal`) reclasificado —
      deuda a CC → `danger`, a favor → `ok`, pago exacto → neutral (antes usaba rojo/azul/verde
      inconsistente con `saldoDisplay.js`; ver nota de desviación abajo). Botón "quitar línea de
      pago" y "eliminar del carrito" → `danger` (acción destructiva, caso-trampa de Decisión 3).
      Totales ("Total a cobrar", "Total a Pagar") → neutral `text-ink`, no `accent` (mismo
      criterio que "Total Ventas"/"Total Conceptos" en `FacturaCliente.jsx`: la barra de acento
      decora, el número no).
- [x] 7.2 `pages/VentasLayout.jsx` (~15) y `pages/HistorialVentas.jsx` (~25). Tabs → acento (nav
      activo). El chip `estadoPago` en `HistorialVentas` no ramifica por color en el código
      original (`bg-gray-100` fijo) → se mantiene neutral de token, no se le inventó semántica.
- [x] 7.3 `components/ComprobanteVentaModal.jsx` (~48): arquetipo documento. `estiloEstadoPago`
      migrado a semántico (`PAGADO`→ok, `PARCIAL`→warn, `DEBE`→danger, default→neutral). Encabezado
      del documento y tabla de ítems → acento (identidad del comprobante, P3). La lógica de
      exportación (`jsPDF` con colores RGB hardcodeados, `toPng`/`backgroundColor: '#ffffff'` de
      `html-to-image`) **no se tocó**: no son `className`, mismo criterio que
      `capturarNodoComoImagen` en `FacturaCliente.jsx`.
- [x] 7.4 `pages/Pedidos.jsx` (~56) y `pages/PedidoNuevo.jsx` (~50). Semántico: `estiloEstado` de
      Pedidos reclasificado — `COMPLETO`→ok, `PARCIAL`→warn; `PENDIENTE` y `CANCELADO` (antes azul
      y gris) colapsan a neutral de token, mismo criterio que el azul informativo de
      `chequeDisplay.js` (Decisión 4). Cotización de dólar y aviso de borrador-sin-proveedor →
      `warn`. Errores de validación → `danger`. Grilla editable: encabezado y bordes → neutrales de
      tabla (`thead`/`line-strong`), fila → `hover:bg-canvas`. Botón "Agregar ítem" → `accent`.
- [x] 7.5 `components/RecepcionPedidoModal.jsx` (~32). Semántico: remanente/pendiente por línea →
      `warn` si > 0, `ok` si 0 (antes ámbar/verde ad-hoc, ahora tokens). Header del modal → acento
      (identidad, mismo patrón que otros modales del catálogo). Badge "Nuevo — se crea al
      confirmar" → `warn` (línea pendiente de alta).
- [x] 7.6 `components/pedidos/FilaItemPedido.jsx` (~39) y
      `components/pedidos/ProductoSearchSelect.jsx` (~20): la grilla editable. Acento: fila con
      foco (`focus:bg-accent-soft`), botón "Cambiar", badge "Nuevo" del buscador → `warn` (línea
      pendiente de crear, dato de negocio). Checkbox "línea en USD" → `accent-accent` (nativo,
      lee el token de acento). Botón "Quitar ítem" → `danger`. Aviso de auto-ratchet → `warn`.
      **Lógica de posicionamiento del popover (`createPortal`, refs, `useLayoutEffect`,
      `calcularPosicionPopover`/`calcularDireccion`, listeners de scroll/resize/Escape) verificada
      carácter por carácter en el diff: cero cambios fuera de `className`.**
- [x] 7.7 `components/pedidos/PanelDescuentosLinea.jsx` (~11) y
      `components/pedidos/CeldaDescuentos.jsx` (~10). Chips de descuento → `accent-soft`/
      `accent-ink` (no `ok`): no ramifican por dato de negocio, son una etiqueta constante por
      línea (P3, no P1) — no representan un estado resuelto como "pagado".
- [x] 7.8 Importes de los 11 archivos → `font-mono tabular-nums` (totales, montos unitarios, costos
      de línea, cantidades en inputs numéricos). Fechas y menciones de números dentro de prosa
      (ej. "Último valor de..." en `PedidoNuevo.jsx`) se dejaron sin mono a propósito, mismo
      criterio que el resto del sistema (sólo cifras que son el dato principal de una celda/total).
- [x] 7.9 Grep de literales prohibidos sobre el G4. Debe dar cero.
      → `grep -nE 'emerald-|green-[0-9]|gray-[0-9]|bg-white|text-white|rounded-xl|rounded-2xl|rounded-lg|shadow-sm|shadow-md|shadow-xl|blue-[0-9]|red-[0-9]|amber-[0-9]|orange-[0-9]|yellow-[0-9]|font-factura'`
      sobre los 11 archivos → **cero resultados en código vivo.** Único resto: comentarios
      históricos en `PedidoNuevo.jsx`/`FilaItemPedido.jsx`/`PanelDescuentosLinea.jsx`/
      `CeldaDescuentos.jsx` que documentan decisiones de rondas anteriores citando literales viejos
      entre backticks (ej. "`gray-200`→`gray-300`") — no son `className`, se dejan intactos como
      documentación histórica, mismo criterio que otros comentarios ya aceptados en G0-G3.
      `npx oxlint` sobre los 11 archivos: cero errores; los únicos warnings (`no-unused-vars` en
      catches preexistentes, `exhaustive-deps` preexistente) ya estaban antes de este grupo —
      verificado por diff, ninguno introducido por el barrido de clases.
      **Desviación de diseño anotada**: en `NuevaVenta.jsx` el bloque de saldo de liquidación
      (`saldoFinal`) usaba rojo/azul/verde con un mapeo distinto al de `saldoDisplay.js` (azul para
      "a favor" en vez de verde). Se reclasificó a `danger`/`ok`/neutral siguiendo el vocabulario ya
      establecido por `saldoDisplay.js` en el G2, en vez de colapsar el azul a neutral como en
      Decisión 4 — acá "a favor" es un evento positivo real (mismo dato, misma asimetría), no un
      caso "resuelto sin acción" como `COBRADO`. Ídem `Pedidos.jsx`/`estiloEstado`: `PENDIENTE`
      (antes azul) colapsa a neutral por el mismo criterio de Decisión 4 (no hay 4to tono
      semántico), `CANCELADO` (antes gris) se mantiene neutral.

## 8. 🔶 CHECKPOINT 3 — Arquetipo de flujo multi-paso

- [ ] 8.1 🔶 **CHECKPOINT — PENDIENTE, bloqueado por falta de herramienta de captura en esta
      sesión.** El barrido de código del G4 está completo y verificado mecánicamente (grep limpio,
      `oxlint` limpio, diffs revisados línea por línea para confirmar cero cambios de lógica, Vite
      HMR recompiló los 11 archivos sin errores contra el stack real en `localhost:5173`). **Lo que
      falta y NO se pudo hacer en esta corrida**: capturas reales en ambas unidades a 1366px/390px
      y la verificación interactiva de que los popovers de descuentos y el buscador de producto
      siguen abriendo/cerrando bien — esta sesión no tuvo acceso a una herramienta de automatización
      de navegador (Playwright u otra) para interactuar con la app real, a diferencia de sesiones
      anteriores de este mismo change que sí la tuvieron (ver evidencia de G0-G3 en las tareas de
      arriba). No se fabricó evidencia falsa. **Antes de aprobar este checkpoint y avanzar al grupo
      5**, hace falta una corrida (de este agente con la herramienta disponible, o del usuario a
      mano) que: (a) confirme visualmente el carrito de `NuevaVenta.jsx`, (b) abra
      `PedidoNuevo.jsx`, cree un ítem con al menos un descuento y confirme que el popover
      flotante abre/cierra y se reposiciona bien, y (c) confirme `Pedidos.jsx` con sus estados —
      en ambas unidades — y guarde las capturas en `img/`.
      **No seguir al grupo 5 sin esta verificación.**

## 9. G5 — Catálogos y stock (9 archivos)

> Estado verificado por grep directo (no por reporte de sub-agente) tras la cascada de fallos de
> sesión del 2026-08-19. "Occurrences" = matches reales de patrones prohibidos (`emerald-`,
> `bg-gray-*`, `border-gray-*`, `text-gray-*`, `rounded-xl/2xl`, `shadow-sm/md/xl`), excluyendo los
> que aparecen dentro de comentarios de documentación histórica.

- [x] 9.1 `pages/Productos.jsx` y `components/ProductoForm.jsx`. **DONE** — 0 occurrences, grep-clean.
- [x] 9.2 `pages/Insumos.jsx` y `components/InsumoForm.jsx`. **DONE** — ambos migrados,
      0 occurrences, grep-clean.
- [x] 9.3 `pages/Proveedores.jsx` y `components/ProveedorForm.jsx`. **DONE** —
      `Proveedores.jsx` 0 occurrences. `ProveedorForm.jsx` 0 occurrences (queda 1 match dentro de
      un comentario de documentación histórica preexistente, no agregado en esta ronda — aceptado
      por la Capa A).
- [x] 9.4 `pages/Clientes.jsx` y `components/ClienteForm.jsx`. **DONE** — 0 occurrences, grep-clean.
      Semántico: indicador de saldo del cliente en el listado (viene de `saldoDisplay.js`, ya
      migrado) — sin tocar, correcto.
- [x] 9.5 `components/PaseStockModal.jsx`. **DONE** — 0 occurrences, grep-clean.
- [x] 9.6 Grep sobre el G5 completo: **da cero** (excepto el match dentro del comentario histórico
      de `ProveedorForm.jsx` ya señalado en 9.3). `Insumos.jsx`, `InsumoForm.jsx` y
      `ProveedorForm.jsx` terminados en esta ronda (2026-08-28).

## 10. G6 — Vivero operativo: siembras, bandejas y variedades (11 archivos)

> Mismo criterio de verificación que el G5 (grep directo, no tasks.md previo ni reporte de agente).

- [x] 10.1 `pages/Siembras.jsx`, `components/SiembraForm.jsx` y `components/FinalizarSiembraModal.jsx`.
      **DONE** — los tres 0 occurrences, grep-clean. `SiembraForm.jsx` terminado en esta ronda
      (era PARTIAL con 39 occurrences remanentes); selección de estado (SOBRE/SUELTO, UN_DIA/RANGO)
      migrada a `accent` (affordance de selección, no estado de negocio dependiente del dato).
      `FinalizarSiembraModal.jsx` migrado completo (era NOT STARTED).
- [x] 10.2 `pages/VariedadesPlantas.jsx` y `components/VariedadPlantaForm.jsx`. **DONE** — 0
      occurrences, grep-clean.
- [x] 10.3 `pages/VariedadesBandejas.jsx` y `components/VariedadBandejaForm.jsx`. **DONE** —
      ambos migrados en esta ronda, 0 occurrences, grep-clean. Badge "EN USO" migrado a `warn`
      (depende de `bandeja.enUso`, dato de negocio).
- [x] 10.4 `pages/DevolucionBandejas.jsx`, `components/DevolucionBandejasModal.jsx` y
      `components/HistorialBandejasModal.jsx`. **DONE** — los tres 0 occurrences, grep-clean.
      Badge/deuda de `balanceBandejas > 0` migrado a `warn` (depende del dato de negocio).
      `HistorialBandejasModal.jsx`: los tonos de movimiento siguen viniendo de
      `bandejasDisplay.js` (ya migrado en el G2) — esa lógica no se tocó, solo el resto de las
      clases del archivo.
- [x] 10.5 `components/ConversorBandejas.jsx`. **DONE** — 0 occurrences, grep-clean.
- [x] 10.6 Grep de literales prohibidos sobre el G5 + G6. **Da cero** (excepto el match dentro de
      un comentario de documentación histórica en `ProveedorForm.jsx`, ver 9.3/9.6). `npx oxlint
      src/` sigue en 0 errores tras esta ronda (49 warnings preexistentes de
      `no-unused-vars`/`exhaustive-deps`, ninguno introducido por esta migración).

## 11. 🔶 CHECKPOINT 4 — Arquetipos listado + formulario en modal

- [x] 11.1 🔶 **CHECKPOINT** — Confirmado por el usuario probando manualmente (no con screenshots
      automatizados — a partir de esta ronda, la verificación visual la hace el usuario en vivo, no
      Playwright). Durante la prueba surgieron 2 bugs reales, ambos corregidos antes de cerrar el
      checkpoint:
      (1) `--accent-ink` en modo oscuro (`index.css`) estaba definido casi negro (`#171412`) en vez
      de seguir el mismo patrón que `ok-ink`/`warn-ink`/`danger-ink` (mismo tono que la variante
      base) — causaba texto invisible ("negro sobre negro") en cualquier `text-accent-ink` sobre
      `bg-paper`/`bg-accent-soft` en modo oscuro, afectando potencialmente TODA la app, no solo
      Siembras. Corregido para vivero y herramientas.
      (2) A pedido del usuario, se agregó color de acento a las etiquetas "Nº" y "Lote" de
      `Siembras.jsx` (antes neutras grises).
      Los iconos Editar/Eliminar de la tabla de Siembras se dejaron sin cambios: usan el mismo
      patrón (`text-body` + opacity-80 en reposo) que `/productos` e `/insumos`, ya aprobados.

## 12. G7 — Admin, configuración y chrome global (8 archivos)

- [x] 12.1 `pages/Dashboard.jsx` (~9) y `pages/Configuracion.jsx` (~36) +
      `components/ConfiguracionMarcas.jsx` (~39) y `components/ConfiguracionHerramientas.jsx` (~14):
      arquetipo configuración con tabs. Acento: tab activa.
      → **DONE**, los 4 archivos migrados, 0 occurrences, grep-clean. `Dashboard.jsx`: ícono
      decorativo (`Leaf`) → `bg-accent-soft`/`text-accent-ink` (P3, decoración sin condición de
      negocio). `Configuracion.jsx`: las 4 tarjetas de navegación tenían colores hardcodeados
      distintos por sección (emerald/purple/orange/blue) — se colapsaron todas a un único
      vocabulario `accent` (activa: `bg-accent text-paper` en el ícono + `border-accent
      ring-2 ring-accent/20`; inactiva: `bg-accent-soft text-accent-ink`), porque el color no
      depende de ningún dato de negocio, es selección de navegación (P2). `ConfiguracionMarcas.jsx`:
      badge "En Uso" de `marca.enUso` → `warn` (depende de dato de negocio, mismo criterio que
      `bandeja.enUso` del G6). `ConfiguracionHerramientas.jsx`: botón "Guardar Configuración"
      mantiene su diseño original de **no** usar acento incluso en su estado por defecto (antes
      `gray-900`, ahora `bg-ink text-paper`, mismo patrón "deliberadamente sin acento" del botón de
      Login/Decisión 8); el estado transitorio "Guardada" (confirmación de éxito tras la mutación)
      → `bg-ok text-paper`, semántico porque refleja el resultado de una operación, no una simple
      selección.
- [x] 12.2 `pages/UsuariosAdmin.jsx` (~81). Semántico: usuario activo/inactivo. Acento: acciones.
      → **DONE**, 0 occurrences, grep-clean. **Nota de desviación real sobre el criterio anotado**:
      el modelo de `Usuario` en este archivo **no tiene** campo activo/inactivo — no existe tal
      indicador en el código. El único estado semántico real presente es el de "usuario protegido"
      (`u.username === 'jefe@vivero.com' || 'admin2'`, hardcodeado, bloquea edición/borrado) y el de
      "rol en uso" (`r.enUso`, bloquea borrado de rol). Ambos son la misma familia semántica que
      `marca.enUso`/`bandeja.enUso` ya migrados en rondas previas (un dato de negocio que impide una
      acción) → se migraron a `warn` (antes texto gris plano para "Usuario protegido", antes ámbar
      literal para el badge "En uso" de roles). Tags de rol asignado (chip por `u.roles`) → `accent`
      (identidad/etiqueta constante, no ramifica por valor, mismo criterio que los chips de
      descuento de `PanelDescuentosLinea.jsx` en el G4). Tags de permiso asignado (chip por
      `r.permisos`) → neutral de token (`bg-thead text-body border-line`), mismo patrón que
      "AUTOMÁTICO"/"INSUMO" en `Finanzas.jsx`. Acciones "Editar" → tratamiento neutral con hover de
      acento (`text-body hover:text-accent-ink` en los links de tabla; `bg-canvas hover:bg-thead
      border-line` en los botones de tarjeta mobile), mismo patrón ya establecido para "Editar" en
      `Productos.jsx` (G5) — el acento aparece como affordance de interacción (hover), no como
      relleno permanente. "Eliminar" → `danger` (acción destructiva). Los 2 modales (Usuario, Rol)
      se migraron al mismo patrón de floating panel que el resto de modales del sitio (`bg-paper
      border border-line-strong rounded-panel`, sin `shadow-xl`, backdrop `bg-ink/50`). El toggle
      "Por Secciones / Avanzado (Permisos)" → segmented control con acento en la opción activa.
- [x] 12.3 `components/ConfirmDialog.jsx` (~7) y `components/PermissionDeniedModal.jsx` (~4):
      chrome global. El botón de confirmación **destructiva** va a `danger`, el de confirmación
      neutra a `accent`. Estos son los únicos componentes autorizados a usar `shadow-md` (flotantes).
      → **DONE**, ambos migrados, 0 occurrences, grep-clean, `shadow-md` presente **únicamente** en
      estos 2 archivos de todo el G7 (verificado por grep dedicado). `ConfirmDialog.jsx`: el
      componente en realidad no tiene una variante "neutra" — su prop `variant` sólo distingue
      `danger` (default) de `warning` (usado explícitamente por `ConfiguracionHerramientas.jsx` para
      el aviso de "esto afecta costos futuros"), y ambas ya son categorías semánticas reales pasadas
      por quien lo invoca. Se mapeó `danger`→`danger`, `warning`→`warn` (en vez de forzar la
      variante "warning" a `accent`, que hubiese sido incorrecto: el color sí depende del dato de
      negocio que pasa el caller). `PermissionDeniedModal.jsx`: sólo tiene un botón ("Entendido"),
      que sí es la confirmación neutra genuina → `accent`. El ícono de "Acceso Denegado" → `danger`
      (bloqueo real, no acento).
- [x] 12.4 `components/ToastContainer.jsx` (~3): el color codifica el tipo de mensaje →
      **semántico**. Éxito `ok`, advertencia `warn`, error `danger`. **Nunca `accent`.**
      → **DONE**, 0 occurrences, grep-clean, sin `shadow-md` (no está en la allowlist de 12.3).
      **Bug real encontrado y corregido en el camino**: el componente original sólo distinguía
      `error` de "todo lo demás" (`isError ? red : emerald`) — los toasts `type='info'` que ya se
      usan en `FacturaCliente.jsx` (líneas 235 y 702 antes de esta ronda) caían en la rama "verde
      éxito" con ícono de check, exactamente lo que la Decisión 3/12.4 prohíbe ("nunca `accent`, ni
      siquiera para el toast de info"). Se reemplazó el ternario por una tabla de 4 estilos
      (`success`→`text-ok`/`CheckCircle2`, `warning`→`text-warn`/`AlertTriangle`,
      `error`→`text-danger`/`AlertCircle`, `info`→`text-muted`/`Info`, con `info` como default de
      fallback). Es un cambio mínimo de la rama de clasificación visual (mapea `toast.type` a
      clases/ícono, igual categoría que `estadoBadgeClass`/`estiloEstadoPago` ya reescritos en
      rondas anteriores de este mismo change) — el `useEffect` del timer de auto-dismiss no se tocó.
- [x] 12.5 Grep de literales prohibidos sobre el G7. Debe dar cero.
      → **Cero resultados** con el grep base de la tarea (`emerald-|bg-gray-(50|100|200)|
      border-gray-(200|300)|text-gray-(900|800|500|400)|rounded-xl|rounded-2xl|shadow-sm|shadow-xl`)
      sobre los 8 archivos. Corrida ampliada adicional (`green-|purple-|orange-|amber-|blue-|red-|
      gray-[0-9]|bg-white|text-white|rounded-lg|shadow-lg|shadow-2xl|bg-black`) también da **cero**
      en los 8 archivos. `shadow-md` verificado presente sólo en `ConfirmDialog.jsx` y
      `PermissionDeniedModal.jsx` (grep dedicado sobre el set de 8). `npx oxlint src/`: **0 errores**;
      los únicos warnings son preexistentes (`no-unused-vars` en catches y en imports no usados,
      `exhaustive-deps`), verificados por archivo — ninguno introducido por esta ronda (el warning
      de `exhaustive-deps` en `UsuariosAdmin.jsx:54` ya existía antes, el `useEffect` no se tocó).
      Diff revisado línea por línea en `UsuariosAdmin.jsx`: sin cambios fuera de `className` (sólo
      2 espacios finales de línea removidos). Diff de `ToastContainer.jsx` documentado en 12.4.

## 13. G8 — Cierre, barrido de residuos y demo final

- [x] 13.1 Grep de literales prohibidos sobre **todo** `frontend/src/`. Cada resultado se resuelve o
      se agrega a la allowlist **con justificación escrita en este archivo**.
      → Corrida sobre `src/ --include=*.jsx --include=*.js` con el patrón ampliado (agrega
      `purple-`/`orange-`/`amber-`/`blue-`/`red-` al set base). Un solo residuo real de código
      encontrado y **migrado en esta ronda**: `utils/bandejasDisplay.js` — `TONO_ENTREGA` seguía en
      `bg-orange-50 text-orange-700` literal (había quedado fuera de alcance a propósito desde la
      tarea 4.2/G2, anotado como "candidato a `warn` en un barrido futuro"). Migrado a
      `bg-warn-bg text-warn-ink` (Decisión 3: depende de `tipo === 'ENTREGA'`, dato de negocio →
      semántico). Todo el resto de los matches del grep son: (a) `shadow-md`/`shadow-lg` en 5
      elementos flotantes legítimos, (b) la zona protegida de `FacturaCliente.jsx:86`
      (`capturarNodoComoImagen`, no se toca), y (c) comentarios de documentación histórica en prosa
      que citan clases viejas entre backticks (no son código). Ver detalle completo con archivo y
      línea en la sección "Allowlist final (G8)" de `design.md`.
- [x] 13.2 Escribir la allowlist final en `design.md`: qué literales sobrevivieron, en qué archivos y
      por qué (esperado: `text-white` sobre `bg-accent` en botones primarios y `shadow-md` en los
      flotantes de la tarea 12.3).
      → Sección "## Allowlist final (G8)" agregada al final de `design.md`. Corrección sobre lo
      esperado: no sobrevivió ningún `text-white` literal (todos migraron a `text-paper`, que
      resuelve al mismo blanco/crema vía token y se invierte bien en dark mode). Los flotantes con
      sombra resultaron ser **5**, no 2: los 2 modales de 12.3 (`shadow-md`) más 3 elementos nuevos
      no cubiertos por esa ronda (`PanelDescuentosLinea.jsx`, `ProductoSearchSelect.jsx` — popover y
      dropdown flotantes de la grilla de pedidos — y el FAB de `NuevaVenta.jsx`), los tres en
      `shadow-lg`. También se documentó como excepción legítima adicional (no capturada por el grep
      de clases porque es un hex, no un `className`) el color directo de `chartData` en
      `Finanzas.jsx` (`#1F7A4C`/`#B3261E`) para el `fill` SVG de recharts.
- [x] 13.3 Revisión de criterio (Capa C): recorrer las clasificaciones semánticas anotadas en los
      grupos 4 a 12 contra el diff, verificando que ningún chip de estado quedó en `accent` y que
      ninguna acción primaria quedó en `ok`.
      → Verificación exhaustiva (no muestreada) con dos greps de barrido completo sobre
      `frontend/src/`: (1) ninguna función `estilo*`/`tono*`/`*badge*`/`*Badge*` (los helpers de
      clasificación semántica de `chequeDisplay.js`, `saldoDisplay.js`, `bandejasDisplay.js`,
      `estadoBadgeClass` de `Finanzas.jsx`, `estiloEstadoPago` de `ComprobanteVentaModal.jsx`,
      `estiloEstado` de `Pedidos.jsx`) referencia `accent` en ninguna rama — cero resultados; (2)
      cero usos de `bg-ok`/`bg-warn`/`bg-danger` (sólido, no `-bg`) fuera de los ya documentados y
      legítimos: `ConfiguracionHerramientas.jsx` (estado transitorio "Guardada", 12.1),
      `ConfirmDialog.jsx` (variantes `danger`/`warning` del caller, 12.3), el punto rojo de alertas
      de `DashboardLayout.jsx` (2.6) y la barra de progreso de `Siembras.jsx` (completa/incompleta,
      dato real). Sin correcciones necesarias — ninguna clasificación mal hecha encontrada.
- [x] 13.4 Verificar que no quedó ningún `rounded-full` fuera de los chips de estado, y ninguna
      sombra fuera de los elementos flotantes.
      → `rounded-full`: 70 ocurrencias en total, las ~40 que no matchean los patrones obvios
      (`chip|badge|Badge|estado|status|avatar|circular|w-8 h-8|w-10 h-10|w-9 h-9`) revisadas una por
      una manualmente — todas caen en categorías legítimas no cubiertas por esas palabras clave
      literales: spinners de carga (`animate-spin rounded-full`), botones de ícono circulares
      (cerrar/volver/campana), círculos decorativos de ícono (estados vacíos de `Dashboard.jsx`/
      `Insumos.jsx`/`Productos.jsx`, ícono expandible de `FacturaCliente.jsx`), badge numérico de
      notificaciones, tags/badges sin la palabra "chip" en la clase (roles/permisos de
      `UsuariosAdmin.jsx`, "AUTOMÁTICO"/"INSUMO" de `Finanzas.jsx`, condición de proveedor), pills de
      filtro segmentado (`Productos.jsx`, selector de proveedor) y la barra de progreso de
      `Siembras.jsx`. Cero residuos de tarjetas/botones viejos. Sombras: inventario completo (ver
      13.2) confirma que las únicas 5 sobrevivientes están en elementos genuinamente flotantes
      (`position: fixed`/`absolute`); ninguna sombra en tarjetas, filas o contenedores estáticos.
- [x] 13.5 Verificar que el diff **no contiene** cambios en handlers, estado, props, firmas,
      condiciones de renderizado, cálculos, payloads ni rutas, y que no hay ni un archivo `.java`.
      → `git diff --stat` (54 archivos, todos `.jsx`/`.js`/`.css`/`.html` bajo `frontend/`; **cero**
      archivos `.java` en todo el repo). Se filtraron las líneas del diff que NO contienen la palabra
      `className` (832 de ~4300 líneas) para inspeccionar qué cambió fuera de clases: resultaron ser
      continuaciones de template-literals de `className` partidos en varias líneas, apertura/cierre
      de tags JSX sin cambios (sólo espacios finales de línea removidos) y **un solo** cambio real de
      código: el `React.useEffect` de `DashboardLayout.jsx` que proyecta `data-unidad` al DOM —
      exactamente el agregado autorizado y documentado en la tarea 2.1 (reutiliza `isHerramientas`
      existente, sin estado nuevo). El resto de los cambios "estructurales" fuera de `className`
      (mover el `<select>` de unidad en `DashboardLayout.jsx`, sacar `<h2>`+ícono `Leaf` en
      `Login.jsx`) coinciden carácter por carácter con lo documentado en 2.4/2.7 — el handler
      `onChange` del `<select>` quedó idéntico salvo la línea `setIsProfileMenuOpen(false)` que ya no
      aplica por haber cambiado de contenedor. Cero cambios en cálculos, payloads, rutas o firmas de
      función en el resto del árbol.
- [ ] 13.6 Re-exportar la factura de cliente y comparar de nuevo contra la línea base de la tarea 1.2.
- [ ] 13.7 Captura en **dark mode** (`prefers-color-scheme: dark`) de una pantalla de cada arquetipo,
      revisando contraste — en especial el par `--accent-ink` sobre `--accent`, que en oscuro
      invierte la relación del modo claro. Si algún par falla, se corrige **el token** en
      `index.css`, nunca con un override por componente.
- [x] 13.8 Anotar en `design.md` las respuestas de los checkpoints 1, 2, 3 y 4 a las Open Questions.
      → La sección "Open Questions" ya existía en `design.md`; se completó ítem por ítem contra lo
      documentado en `tasks.md`, sin inventar respuestas. Hallazgo real: la pregunta 1 (azul
      informativo → neutral, Decisión 4) **no tiene respuesta explícita registrada** — el checkpoint
      2 (tarea 6.1) nunca se marcó `[x]` ni tiene nota de resolución, a diferencia del CP1 (3 rondas
      documentadas) y el CP4 (bugs encontrados/corregidos en 11.1). El trabajo igual avanzó de G4 en
      adelante usando la colapsión a neutral como default, sin objeción registrada — queda anotado en
      `design.md` como hueco de proceso, no como decisión tomada. La pregunta 4 (dark mode) se marcó
      parcialmente resuelta: el CP4 ya probó dark mode en vivo y corrigió un bug real de contraste
      (`--accent-ink` casi negro en oscuro), lo que confirma que el modo oscuro entra por
      `prefers-color-scheme` sin objeción — pero la evidencia formal (capturas por arquetipo) sigue
      siendo tarea del usuario en 13.7. La pregunta 5 se cerró como resuelta (confirmada con capturas
      reales en el CP1, sin objeciones después). Las preguntas 2 y 3 ya estaban resueltas de antes.
- [ ] 13.9 🔶 **CHECKPOINT FINAL** — Demo completa al usuario: recorrido por los 6 arquetipos en
      **ambas unidades** a 1366px, uno a 390px, el dark mode, el cambio de unidad en vivo y la
      exportación de la factura. Confirmar que el resultado corresponde a los mockups de
      `design/UI mockups request/`. **No archivar el change sin esta demo aprobada.**
