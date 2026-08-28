## Why

El change `sistema-diseno-acento-por-unidad` dejó la aplicación con modo oscuro **pasivo**: un bloque `@media (prefers-color-scheme: dark)` en `frontend/src/index.css` redefine los tokens neutrales, semánticos y de acento, pero no existe ningún control en la interfaz. La app sigue ciegamente el esquema de color del sistema operativo y el usuario no tiene forma de decidir.

Eso es un problema real de uso, no una preferencia estética: el operario trabaja en un vivero, donde la luz ambiente cambia mucho a lo largo del día y entre el galpón y la oficina. Su teléfono o su Windows pueden estar en oscuro por un horario automático que no tiene nada que ver con las condiciones en las que está mirando el ERP. Hoy la única forma de cambiar el tema de la aplicación es salir de la aplicación y cambiar la configuración del sistema operativo entero.

Este change le da a la aplicación un control propio de tema, sin quitarle a quien lo prefiera el comportamiento actual de seguir al sistema.

## What Changes

- **Nueva preferencia de tema con tres estados**: `Claro`, `Oscuro` y `Sistema`. `Sistema` es el valor por defecto y reproduce exactamente el comportamiento de hoy, de modo que ningún usuario existente percibe un cambio hasta que elige explícitamente otra cosa.
- **Nuevo control en la barra superior** (`DashboardLayout.jsx`): un botón con ícono a la izquierda de la campana de notificaciones que abre un popover con las tres opciones y marca la activa. Reutiliza el patrón de popover que ya existe en esa misma barra para las alertas.
- **Nuevo store `useThemeStore`** (`frontend/src/store/useThemeStore.js`) con el middleware `persist` de Zustand sobre `localStorage`, para que la preferencia sobreviva al cierre del navegador.
- **El tema se proyecta al DOM como `data-theme` en `<html>`**, siguiendo el mismo patrón arquitectónico que ya usa `data-unidad` para el acento por unidad de negocio: un único atributo en el elemento raíz retiñe todo el árbol, sin props de tema ni condicionales de color en los componentes.
- **Reestructuración del bloque de modo oscuro en `frontend/src/index.css`**: el `@media (prefers-color-scheme: dark)` se reemplaza por un bloque `[data-theme="dark"]`. La resolución de `Sistema` → claro/oscuro pasa a hacerse en JavaScript, que escribe siempre un valor concreto en el atributo. Esto deja **una sola** declaración de los valores oscuros en todo el archivo, en vez de una por cada vía de activación.
- **`color-scheme` pasa a seguir el tema elegido** (`light` / `dark` según `data-theme`, en vez del `light dark` fijo de hoy), para que los controles nativos del navegador —el popup de `<option>`, las scrollbars— acompañen la elección del usuario y no la del sistema operativo.
- **Script anti-parpadeo en `frontend/index.html`**: un bloque inline en el `<head>` fija `data-theme` antes del primer pintado, para que la aplicación no aparezca un instante en claro antes de que React monte y aplique la preferencia guardada.
- **El control aparece sólo en las pantallas autenticadas.** El tema guardado igual se aplica al login (lo resuelve el script inline + la CSS), pero el login no lleva el control: es una pantalla deliberadamente sin cromo, ya desmarcada en el change anterior.
- **NO cambia**: backend, base de datos, endpoints, DTOs, permisos RBAC, rutas, ni ninguna regla de negocio. Tampoco cambian los **valores** de los tokens claros ni oscuros — se mueven de bloque, no se retocan.
- **`.force-light-export` no se toca y debe seguir ganando siempre.** La exportación de la factura a imagen (`FacturaCliente.jsx`) fuerza tokens claros sobre el nodo que captura, para que el PNG sea legible sin importar el tema. Ese comportamiento pasa a ser un invariante explícito: debe valer también cuando el usuario eligió oscuro **dentro** de la aplicación, no sólo cuando lo tenía oscuro el sistema.

### Alcance y gobernanza

A diferencia del change anterior —que fue un rediseño visual puro y tenía prohibido tocar estado o handlers— **este change sí introduce estado, persistencia y componentes nuevos**. Aun así se mantiene en gobernanza **LOW**: es una preferencia de presentación por usuario, guardada sólo en el navegador. No toca datos de negocio, no toca autenticación ni permisos, no viaja al backend, y su peor falla posible es que la aplicación se vea en el tema equivocado.

## Capabilities

### New Capabilities
- `tema-claro-oscuro`: la selección manual de esquema de color dentro de la aplicación — los tres estados de la preferencia, su persistencia por navegador, su resolución a un tema concreto, la proyección al elemento raíz del documento y la ausencia de parpadeo en la carga inicial.

### Modified Capabilities
- `sistema-diseno-visual`: el requisito «Adaptación automática a esquema de color oscuro» afirma hoy, textualmente, que «no se provee un control manual de tema dentro de la aplicación». Este change lo revierte: el esquema oscuro pasa a activarse por el atributo `data-theme` del elemento raíz, y la preferencia del sistema operativo pasa a ser el valor por defecto de esa decisión en vez de su única fuente. Se suma además el invariante de que la exportación de documentos a imagen se renderiza siempre en claro, sea cual sea el tema activo.

> **Deuda previa a resolver en el archive de este change.** El archivado de `sistema-diseno-acento-por-unidad` (commit `b889152`) no sincronizó sus delta specs: `openspec/specs/sistema-diseno-visual/` no existe todavía, y el requisito «Diseño y UI» de `openspec/specs/frontend-core/spec.md` sigue describiendo un diseño «moderno (ej. glassmorphism)» ya superado. La spec principal de `sistema-diseno-visual` debe materializarse desde el delta archivado **antes** de aplicarle el delta de este change; está anotado como tarea 0 en `tasks.md`.

## Impact

**Frontend únicamente.**

Archivos modificados:
- `frontend/src/index.css` — el bloque `@media (prefers-color-scheme: dark)` pasa a `[data-theme="dark"]`; `color-scheme` pasa a depender del tema; `.force-light-export` suma `color-scheme: light`.
- `frontend/index.html` — script inline anti-parpadeo en el `<head>`.
- `frontend/src/App.jsx` — monta el hook que proyecta el tema al DOM, en la raíz, para que cubra también el login.
- `frontend/src/layouts/DashboardLayout.jsx` — el control de tema en la barra superior.

Archivos nuevos:
- `frontend/src/store/useThemeStore.js`
- `frontend/src/hooks/useTheme.js`
- `frontend/src/components/ThemeToggle.jsx`

**Sin impacto**: backend completo, base de datos, API, DTOs, permisos RBAC, rutas de React Router, y el resto de las páginas y componentes del frontend (heredan el tema por tokens, sin editarse).

**Riesgo principal — regresión de contraste en modo oscuro.** El change anterior ya produjo dos bugs reales de este tipo: `--accent-ink` quedaba casi negro sobre fondos oscuros, y la factura exportada salía con marco blanco alrededor de una tarjeta oscura. Hasta ahora el modo oscuro sólo se veía si el dispositivo del usuario estaba en oscuro, lo que hacía que esos defectos pasaran desapercibidos; con un control explícito **cualquier usuario puede activarlo en cualquier momento**, así que la superficie realmente expuesta al modo oscuro crece de golpe. La verificación visual pantalla por pantalla en oscuro es parte del trabajo de este change, no un extra.

**Riesgo secundario — acoplamiento entre el script inline y el store.** El script del `<head>` lee `localStorage` directamente, antes de que Zustand exista. La clave y la forma del JSON que escribe `persist` son un contrato entre los dos: si cambian de un lado y no del otro, vuelve el parpadeo sin romper nada más, con lo cual la falla es silenciosa. Queda documentado en ambos archivos.
