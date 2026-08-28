## Context

**Estado actual.** `frontend/src/index.css` (177 líneas) concentra toda la arquitectura de color. Los tokens claros viven en `@theme` (neutrales `paper`…`ink`, semánticos `ok`/`warn`/`danger`) y en `:root` + `[data-unidad="vivero"|"herramientas"]` (acentos `--accent`, `--accent-ink`, `--accent-soft`, `--accent-hi`, `--accent-label`, `--accent-plate`). Un bloque `@media (prefers-color-scheme: dark)` redefine neutrales, semánticos y acentos para modo oscuro. Al final del archivo, `.force-light-export` re-declara los valores claros sobre un subárbol concreto, para que la factura exportada a PNG salga siempre legible.

**El patrón que ya existe y que este change imita.** El acento por unidad de negocio se resuelve con un único interruptor en el DOM: `DashboardLayout.jsx` corre un `useEffect` que hace `document.documentElement.dataset.unidad = isHerramientas ? 'herramientas' : 'vivero'`, y la CSS lee ese atributo. Ningún componente recibe el tema por props ni contiene condicionales de color. `frontend/index.html` arranca con `data-unidad="vivero"` cableado en el `<html>` para que no haya un instante sin acento resuelto. Ese es exactamente el modelo a replicar para el tema.

**Restricciones.**
- Tailwind CSS v4 vía plugin de Vite; los tokens se consumen como clases (`bg-paper`, `text-accent-ink`), no como `var()` en los componentes.
- Zustand para estado global; `useCartStore` ya establece el precedente de `persist` + `createJSONStorage`.
- El login vive **fuera** de `DashboardLayout`, así que cualquier mecanismo montado sólo en el layout autenticado deja la pantalla de login sin cubrir.
- Reglas duras del proyecto: componentes en PascalCase, `cursor-pointer` en todo botón, íconos de `lucide-react`, feedback vía `useUIStore`.

**Historial relevante.** El modo oscuro ya produjo dos defectos reportados por el usuario: `--accent-ink` resolviendo a un tono oscuro sobre fondos oscuros (texto ilegible en cualquier chip o botón con `text-accent-ink`), y el «marco blanco» de la factura exportada. Ambos están corregidos, pero ilustran el modo de falla característico de esta área: **duplicar valores de token en varios bloques y que uno quede desactualizado.** Ese antecedente es el que gobierna la Decisión 1.

## Goals / Non-Goals

**Goals:**
- Que el usuario elija el esquema de color desde dentro de la aplicación, y que esa elección pese más que la preferencia del sistema operativo.
- Que quien no elija nada conserve exactamente el comportamiento de hoy (seguir al sistema, en vivo).
- Que la preferencia sobreviva al cierre del navegador y se aplique desde el primer pintado, sin parpadeo.
- Que los valores de cada token oscuro queden declarados **una sola vez** en `index.css`.
- Que la exportación de documentos a imagen siga saliendo en claro, ahora también cuando el usuario eligió oscuro dentro de la app.

**Non-Goals:**
- Guardar la preferencia en el backend o asociarla al usuario. Es por navegador/dispositivo, no por cuenta. Un mismo operario en el teléfono y en la PC de la oficina puede querer temas distintos, y eso es correcto, no un defecto.
- Temas adicionales más allá de claro y oscuro (alto contraste, sepia, tema por unidad de negocio).
- Cambiar los **valores** de cualquier token, claro u oscuro. Se mueven de bloque; no se retocan. Si aparece un problema de contraste, se corrige como defecto puntual y se anota, pero no es una licencia para re-paletizar.
- Control de tema en la pantalla de login.
- Animar o transicionar el cambio de tema.

## Decisions

### Decisión 1 — La resolución de «Sistema» se hace en JavaScript; la CSS conoce un solo interruptor

`data-theme` en `<html>` contiene **siempre un valor concreto**: `"light"` o `"dark"`. Nunca `"auto"`. La preferencia de tres estados vive en el store; quien la traduce a un valor concreto es JavaScript, combinando la preferencia guardada con `window.matchMedia('(prefers-color-scheme: dark)').matches`.

Consecuencia en `index.css`: el bloque `@media (prefers-color-scheme: dark) { … }` se convierte en `[data-theme="dark"] { … }`, con los mismos valores, movidos tal cual. La media query desaparece del archivo.

**Por qué, y las alternativas descartadas.** Lo natural sería dejar que la CSS resuelva las dos vías de activación. Pero eso obliga a que los valores oscuros aparezcan **dos veces**:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* 20 tokens */ } }
:root[data-theme="dark"]            { /* los mismos 20 tokens, otra vez */ }
```

Con `.force-light-export` y el juego claro base, eso deja cuatro copias del mismo vocabulario de tokens en un archivo donde **ya hubo un bug real por desincronización de un token oscuro** (`--accent-ink`). Es precisamente el modo de falla que hay que evitar, y CSS no ofrece forma de compartir un bloque de custom properties entre un `@media` y un selector de atributo sin preprocesador.

Se consideró también `light-dark()` con `color-scheme` como interruptor, que sería la solución más elegante y DRY: una sola declaración por token, y `.force-light-export` se resolvería con un `color-scheme: light`. Se descarta por dos razones. Primero, obliga a reescribir cada declaración de token del archivo —incluidos los claros, que hoy funcionan— y este change no tiene por qué tocar los valores claros. Segundo, deja el comportamiento del tema atado al soporte de una función CSS relativamente nueva en los navegadores de los dispositivos del vivero, que no controlamos. Mover un bloque de lugar es una operación mucho más barata de verificar y de revertir.

El costo de esta decisión es que el tema deja de funcionar sin JavaScript. Es un SPA de React: sin JavaScript no hay nada que pintar, así que el costo es nominal.

### Decisión 2 — Tres estados, con `sistema` por defecto

La preferencia es `'sistema' | 'claro' | 'oscuro'`, con `'sistema'` como valor inicial.

Dos estados (sólo claro/oscuro) obligarían a elegir un default fijo y **eliminarían** el comportamiento actual: un usuario que hoy tiene el sistema en oscuro y está conforme se encontraría de golpe con la app en claro, y sin forma de volver a «que siga a mi teléfono». Eso convierte una feature aditiva en una regresión. Con `sistema` por defecto, la instalación existente no percibe ningún cambio hasta que alguien toca el control deliberadamente.

`sistema` es **reactivo, no una foto**: mientras esté activo, el hook escucha el evento `change` de `matchMedia` y re-proyecta el atributo. Un teléfono que pasa a oscuro por horario automático arrastra a la app en el momento, igual que hoy. Al elegir `claro` u `oscuro` el listener deja de tener efecto sobre el resultado.

### Decisión 3 — El control va en la barra superior, como popover de tres opciones

Un botón en el `<header>` de `DashboardLayout.jsx`, inmediatamente a la izquierda de la campana de notificaciones. El ícono refleja el estado **resuelto** (`Sun` / `Moon` de `lucide-react`). Al hacer clic abre un popover con las tres opciones —Claro (`Sun`), Oscuro (`Moon`), Sistema (`Monitor`)— y una marca de selección sobre la activa.

**Por qué ahí.** Se evaluaron tres ubicaciones:

- *Junto al selector de unidad de negocio en el sidebar.* Es el análogo arquitectónico más directo, pero esa placa está envuelta en `user?.username === 'jefe@vivero.com' && …`: **sólo el jefe la ve**. Poner ahí el tema lo escondería de todos los demás usuarios, que son justamente los operarios con el problema de luz ambiente.
- *En el popover de perfil («Opciones», junto a Configuración y Cerrar Sesión).* Es el hogar semántico natural de una preferencia de usuario y está disponible para todos los roles, pero queda a dos clics y sin ninguna señal visible de que exista.
- *Barra superior.* Visible para todos los roles en todas las pantallas autenticadas, a un clic, y el `<header>` hoy sólo contiene la campana, así que hay lugar de sobra.

Un botón que **cicla** entre los tres estados con cada clic se descarta: con tres estados el usuario no puede predecir dónde va a caer, y no hay forma de mostrar cuál está activo sin abrirlo. El popover se elige además porque replica un patrón que ya existe en el mismo archivo —el de alertas, con su backdrop `fixed inset-0 z-40` y su panel absoluto— con lo cual no introduce vocabulario de interacción nuevo.

La lógica se extrae a `ThemeToggle.jsx` en vez de escribirse dentro de `DashboardLayout.jsx`: ese archivo ya tiene 368 líneas y tres popovers, y el control de tema es autocontenido.

### Decisión 4 — `useThemeStore` con `persist` sobre `localStorage`, y un hook que lo proyecta al DOM

Store nuevo, no una extensión de `useUIStore`. `useUIStore` maneja feedback efímero (toasts, diálogos) y no persiste nada; mezclarle una preferencia duradera confundiría dos ciclos de vida distintos. El store nuevo expone `preferencia` y `setPreferencia`, nada más.

Almacenamiento: `localStorage`, no `sessionStorage`. `useCartStore` usa `sessionStorage` porque un carrito a medio armar es deliberadamente efímero; una preferencia de tema tiene que sobrevivir al cierre del navegador.

La proyección al DOM va en un hook aparte, `useTheme`, montado en **`App.jsx`** y no en `DashboardLayout.jsx`. `DashboardLayout` es donde vive el `useEffect` de `data-unidad`, pero sólo envuelve las rutas autenticadas: montar ahí el tema dejaría la pantalla de login fuera. `App.jsx` es la raíz común de login y dashboard.

El hook hace dos cosas: proyecta `data-theme` (y `color-scheme` implícito vía CSS) cada vez que cambia la preferencia, y mantiene la suscripción a `matchMedia` para el caso `sistema`.

### Decisión 5 — Script inline anti-parpadeo en el `<head>`, con el acoplamiento documentado

`frontend/index.html` suma un `<script>` inline en el `<head>`, antes de cualquier render, que lee la preferencia de `localStorage`, la resuelve contra `matchMedia` y fija `data-theme` en `document.documentElement`.

Sin él, el `<html>` arranca sin `data-theme`, la CSS no matchea `[data-theme="dark"]` y el navegador pinta el primer frame en claro; el tema oscuro recién aparece cuando React monta y corre el efecto. El resultado es un flash blanco en cada carga — muy visible, justamente, para el usuario que eligió oscuro. El script debe ser **inline y sin `defer`**: un archivo externo se descarga en paralelo al pintado y no garantiza llegar a tiempo.

Es el mismo criterio con el que `index.html` ya trae `data-unidad="vivero"` cableado en el `<html>`, sólo que aquí el valor no puede ser constante porque depende de `localStorage`.

**El acoplamiento y su mitigación.** El script corre antes de que Zustand exista, así que lee `localStorage` a mano y depende del nombre de la clave y de la forma del JSON que escribe `persist` (`{"state":{"preferencia":"…"},"version":0}`). Si eso cambia de un lado y no del otro, vuelve el parpadeo **sin romper nada más**: la app se ve bien apenas monta React, así que la falla es silenciosa y no la detecta ningún error en consola. Se mitiga con un comentario recíproco explícito en ambos archivos (`index.html` y `useThemeStore.js`) nombrando al otro, y con el script escrito defensivamente en un `try/catch` que cae a `sistema` ante cualquier problema de parseo o de acceso a `localStorage` (modo privado, storage deshabilitado).

### Decisión 6 — `.force-light-export` no se toca; su prioridad se apoya en la herencia, no en la especificidad

`.force-light-export` sigue ganando frente a `[data-theme="dark"]` **sin ninguna modificación**, y conviene dejar asentado por qué, porque el motivo no es el que parece.

La especificidad no interviene: `[data-theme="dark"]` matchea el `<html>` y `.force-light-export` matchea un `<div>` anidado — son elementos distintos, y la especificidad sólo desempata reglas que compiten por el mismo elemento. Lo que decide es la **herencia de custom properties**: un valor declarado en un ancestro más cercano gana sobre el heredado de uno más lejano. El `<div>` de la factura re-declara los tokens sobre sí mismo, así que su subárbol los ve a ellos, venga lo que venga del `<html>`.

Se le agrega una sola línea, `color-scheme: light`, coherente con la Decisión 7: si el nodo exportado se pinta en claro, los controles nativos que contenga también deben pintarse en claro.

Esto pasa de ser un detalle de implementación a un **invariante verificado**: la factura exportada en claro con la app en oscuro es un caso de prueba explícito en `tasks.md`, no un efecto colateral que se asume.

### Decisión 7 — `color-scheme` sigue al tema elegido, no al del sistema

Hoy `:root` declara `color-scheme: light dark`, que le dice al navegador «soporto ambos, elegí según el sistema». Con un control propio eso deja de ser correcto: un usuario con Windows en oscuro que elige Claro en la app vería el popup de `<option>` y las scrollbars en oscuro sobre una interfaz clara.

Pasa a declararse en función del atributo: `[data-theme="light"] { color-scheme: light; }` y `[data-theme="dark"] { color-scheme: dark; }`. El `light dark` de `:root` queda como red de seguridad para el instante previo a que el script fije el atributo.

Esto importa concretamente: `index.css` ya arrastra un fix de contraste para `select option` originado en este mismo terreno, y hay `<select>` en el selector de unidad de negocio y en la mayoría de los formularios.

## Risks / Trade-offs

**[Superficie de modo oscuro realmente expuesta, que se multiplica de golpe]** → Es el riesgo dominante y el que justifica el grueso del esfuerzo de verificación. Hasta hoy el modo oscuro sólo lo veía quien tenía el dispositivo en oscuro; los dos defectos de contraste conocidos (`--accent-ink`, marco de la factura) aparecieron por accidente, tarde, y en manos del usuario. Con un control explícito, cualquiera puede activarlo en cualquier pantalla. La mitigación es un recorrido de verificación pantalla por pantalla en oscuro, en ambas unidades de negocio, listado como grupo propio de tareas — no como un «probar que ande» al final.

**[El script inline y el store se desincronizan y vuelve el parpadeo, en silencio]** → Comentarios recíprocos en `index.html` y `useThemeStore.js`, script defensivo con `try/catch` y caída a `sistema`, y una verificación explícita de recarga en oscuro dentro de las tareas.

**[Mover el bloque oscuro de `@media` a `[data-theme]` pierde o altera un token]** → El bloque se mueve **literalmente**, sin editar valores; se verifica comparando contra el archivo previo en git. La lista de tokens oscuros es cerrada y está enteramente contenida en un bloque contiguo del archivo, lo que hace el diff fácil de auditar.

**[Regresión en `.force-light-export` y vuelta del bug del marco blanco]** → Caso de prueba explícito: app puesta en **oscuro desde el control**, exportar factura, verificar que el PNG sale íntegramente claro. Nótese que este escenario es nuevo: antes sólo podía reproducirse con el dispositivo en oscuro.

**[Dependencia de JavaScript para el tema]** → Aceptado sin mitigación. Es un SPA de React; sin JavaScript no hay aplicación.

**[Preferencia por dispositivo y no por cuenta]** → Decisión, no defecto (ver Non-Goals). Si más adelante se pide sincronizarla por usuario, el store es el único punto a tocar: la proyección al DOM y toda la CSS quedan igual.

## Migration Plan

No hay migración de datos ni cambios de esquema. El despliegue es un build de frontend.

La preferencia inicial de todo usuario existente es `sistema`, que reproduce el comportamiento actual, así que el despliegue es visualmente neutro hasta que alguien usa el control. Un `localStorage` sin la clave se lee como `sistema`.

**Rollback**: revertir el commit. Los usuarios que hayan guardado una preferencia quedan con una clave huérfana en `localStorage` que nadie lee, sin efecto alguno.

## Open Questions

- La etiqueta exacta de las opciones queda en «Claro / Oscuro / Sistema». «Sistema» es la convención más difundida en español, aunque «Automático» describe mejor lo que hace. Ajustable en el checkpoint de apply, sin impacto técnico.
- El control se propone sólo en la barra superior. Si en el uso real resulta poco descubrible, agregarlo también al popover de perfil es aditivo y no cambia ninguna de las decisiones de arriba.

> Nota: las dos preguntas de arriba quedaron sin objeto tras la revisión post-implementación —
> ya no hay tres opciones que etiquetar ni menú que abrir, sólo un botón de toggle.

## Revisión post-implementación

El usuario probó la primera implementación (popover con Claro/Oscuro/Sistema, preferencia
persistida en `localStorage`) y pidió simplificarla, cita textual: *"NO quiero que sea un select
sino un switch que directamente cambie de modo entre oscuro y claro, sin sistema. Además no
debería guardar."*

Esto **reemplaza** las Decisiones 2 y 4 originales (tres estados con `sistema` por defecto;
`persist` sobre `localStorage`), y ajusta la Decisión 3 (popover) y la Decisión 5 (script
anti-parpadeo dependiente de `localStorage`). El resto de las decisiones (1, 6, 7) no cambian: la
CSS sigue conociendo un solo interruptor concreto en `data-theme`, `.force-light-export` sigue sin
tocarse, y `color-scheme` sigue el atributo.

**Por qué el usuario tiene razón y no es sólo preferencia estética.** Con dos estados no hace
falta un menú: un botón que alterna es la interacción mínima y más predecible posible — un clic,
un resultado, sin tener que abrir nada para ver ni elegir. Y sin "sistema" como opción explícita,
la persistencia deja de tener un rol claro: el sistema operativo YA es la fuente de verdad por
defecto (arranque vía `matchMedia`, igual que el comportamiento pasivo original, previo a este
change); guardar una elección manual sólo le da al usuario algo que recordar o desconfigurar, sin
beneficio real para el caso de uso (terminales compartidas de vivero/herramientas, no una cuenta
personal por dispositivo).

**Qué cambia en concreto:**

- **Estado**: `useThemeStore` pasa de `preferencia: 'sistema' | 'claro' | 'oscuro'` (con
  `persist` + `createJSONStorage(localStorage)`) a `tema: 'claro' | 'oscuro'`, store Zustand
  plano sin middleware. Se inicializa una única vez al cargar el módulo consultando
  `window.matchMedia('(prefers-color-scheme: dark)').matches`. Acción única: `toggleTema`.
- **Hook**: `useTheme` deja de resolver tres estados y de suscribirse a `matchMedia` en vivo
  (ya no hay "sistema" reactivo que seguir); se reduce a un `useEffect` que proyecta `tema` a
  `document.documentElement.dataset.theme`.
- **Componente**: `ThemeToggle.jsx` deja de ser un botón-que-abre-popover con tres opciones y
  pasa a ser un botón único cuyo `onClick` llama a `toggleTema()` directamente. Sin backdrop,
  sin panel, sin marca de selección.
- **`index.html`**: el script anti-parpadeo deja de leer `localStorage` (ya no hay nada que leer
  ahí) y de parsear la forma que escribía `persist`. Se reduce a la misma consulta `matchMedia`
  que ahora también hace `useThemeStore` al inicializarse — dejan de estar acopladas por un
  contrato de clave/forma de JSON: cada uno llega al mismo valor por el mismo cálculo
  independiente, no por sincronización manual entre dos archivos.
- **Alcance de "no guardar"**: es en memoria por sesión de pestaña. Recargar la página vuelve a
  ejecutar la inicialización del store, así que el tema vuelve a arrancar siguiendo el sistema
  operativo — no hay ningún estado que sobreviva a un F5, ni por diseño ni por accidente.

**Qué NO cambió**: la mecánica CSS (`[data-theme="dark"]`/`[data-theme="light"]`), la ubicación
del control en la barra superior (Decisión 3, salvo por dejar de ser popover), y el hecho de que
`data-theme` en `<html>` sigue siendo siempre un valor concreto, nunca un tercer valor.

### Extensión de `.force-light-export` a `ComprobanteVentaModal.jsx`

Bug reportado por el usuario, cita textual: *"Al descargar un remito desde el historial de ventas
no me gusta el resultado tanto en herramientas como en vivero, los numeros y palabras no se
distinguen bien y la combinacion entre negro, blanco y verde no me gusta, tambien en celular.
Prefiero que siempre se descargen en el formato blanco sin importar si estamos en el modo
oscuro."*

Es el mismo bug de fondo que la Decisión 6 ya documentó y corrigió para `FacturaCliente.jsx` (el
"marco blanco"), pero en un componente distinto que nunca recibió el fix: `generarPngDePreview()`
en `ComprobanteVentaModal.jsx` ya fuerza `backgroundColor: '#ffffff'` en `toPng()`, pero el nodo
clonado (`previewRef`) heredaba los tokens de `[data-theme="dark"]` cuando la app estaba en modo
oscuro — texto claro sobre fondo blanco, encabezado de tabla y píldora de estado con colores de
la paleta oscura, todo ilegible.

La corrección es idéntica en forma a la Decisión 6: se agrega la clase `.force-light-export`
(ya existente en `index.css`, sin modificarla) al `<div ref={previewRef}>`. Como
`cloneNode(true)` copia el `className` tal cual, la clase viaja con el clon sin tocar
`generarPngDePreview`, que sigue siendo lógica de captura no tocada — mismo criterio que ya regía
para `capturarNodoComoImagen` de `FacturaCliente.jsx`.
