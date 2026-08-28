## 0. Deuda previa de specs (bloqueante para el archive, no para el código)

> El archivado de `sistema-diseno-acento-por-unidad` (commit `b889152`) no sincronizó sus delta specs.
> `openspec/specs/sistema-diseno-visual/` no existe, así que el delta de este change no tendría
> contra qué aplicarse al archivar. Se resuelve acá, antes de tocar código, para no descubrirlo al final.

- [x] 0.1 Materializar `openspec/specs/sistema-diseno-visual/spec.md` a partir del delta archivado en `openspec/changes/archive/2026-08-28-sistema-diseno-acento-por-unidad/specs/sistema-diseno-visual/spec.md`, convirtiendo el encabezado `## ADDED Requirements` en la estructura de spec principal (`## Purpose` + `## Requirements`)
- [x] 0.2 Verificar que el encabezado `### Requirement: Adaptación automática a esquema de color oscuro` de la spec recién creada coincide **exactamente** con el del delta de este change (`specs/sistema-diseno-visual/spec.md`), para que el `MODIFIED` matchee al archivar
- [x] 0.3 Aplicar a `openspec/specs/frontend-core/spec.md` el delta archivado del mismo change: el requisito «Diseño y UI» todavía describe un diseño «moderno (ej. glassmorphism)» que el rediseño ya reemplazó

## 1. Estado y persistencia de la preferencia

> Supersedido por la "Revisión post-implementación" de `design.md`: el usuario pidió sacar la
> persistencia y el tercer estado "sistema". Las tareas 1.1–1.3 describen la versión anterior
> (persistida, tres estados) y quedan tachadas como referencia histórica, no como pendientes.

- [x] ~~1.1 Crear `frontend/src/store/useThemeStore.js` con Zustand + `persist` + `createJSONStorage(() => localStorage)`: estado `preferencia` (`'sistema' | 'claro' | 'oscuro'`, inicial `'sistema'`) y acción `setPreferencia`~~
- [x] ~~1.2 Fijar el nombre de la clave de persistencia (ej. `theme-storage`) y documentarlo en un comentario que nombre explícitamente a `frontend/index.html` como el otro consumidor de esa clave (contrato de la Decisión 5)~~
- [x] ~~1.3 Verificar en el navegador que elegir una preferencia escribe la clave en `localStorage` con la forma `{"state":{"preferencia":"…"},"version":0}`, y anotar la forma real observada (es lo que el script inline debe parsear) — sin navegador disponible en esta tarea, se verificó leyendo el código fuente de `zustand/esm/middleware.mjs` (`setItem` en línea ~358-363: `storage.setItem(options.name, { state: options.partialize({ ...get() }), version: options.version })`, con `version` por defecto `0` en línea 334). `partialize` por defecto es la identidad, así que `state` incluye todos los campos del store; `JSON.stringify` descarta las claves de tipo función automáticamente (no serializables), por lo que `setPreferencia` nunca aparece en el JSON persistido. Forma real confirmada: `{"state":{"preferencia":"sistema"},"version":0}` (o `"claro"`/`"oscuro"` según la elección)~~

### 1-bis. Revisión post-implementación — estado en memoria, sin persistencia

- [x] 1-bis.1 Reescribir `frontend/src/store/useThemeStore.js` como store Zustand plano (sin `persist` ni `createJSONStorage`): estado `tema` (`'claro' | 'oscuro'`), inicializado una única vez al cargar el módulo con `window.matchMedia('(prefers-color-scheme: dark)').matches`, y acción única `toggleTema`
- [x] 1-bis.2 Confirmar que no queda ninguna referencia a `persist`, `createJSONStorage` ni `localStorage` en `useThemeStore.js`

## 2. Proyección del tema al DOM

> 2.1 y 2.3 se mantienen vigentes (el hook sigue montado en `App.jsx` por el mismo motivo). 2.2 y
> 2.4 quedan tachadas: ya no hay preferencia `sistema` reactiva que escuchar en vivo, sólo un
> valor concreto que se proyecta al cambiar.

- [x] 2.1 Crear `frontend/src/hooks/useTheme.js` que lea `preferencia` del store, la resuelva contra `window.matchMedia('(prefers-color-scheme: dark)')` y escriba siempre un valor concreto en `document.documentElement.dataset.theme` (`'light'` o `'dark'`, nunca `'sistema'`)
- [x] ~~2.2 Suscribir el hook al evento `change` de `matchMedia` para que la preferencia `sistema` reaccione en vivo, y limpiar el listener al desmontar~~ — supersedida: sin estado "sistema" no hay nada que escuchar en vivo dentro del hook (la única consulta a `matchMedia` vive en la inicialización de `useThemeStore.js`)
- [x] 2.3 Montar `useTheme` en `frontend/src/App.jsx` (raíz común de login y dashboard), **no** en `DashboardLayout.jsx`, con un comentario que explique por qué: el login vive fuera del layout autenticado
- [ ] ~~2.4 Verificar en el inspector que `<html>` lleva `data-theme` junto al `data-unidad` ya existente, y que el valor cambia al alternar la preferencia~~ — reformulada, ver 2-bis.1

### 2-bis. Revisión post-implementación

- [x] 2-bis.1 Reescribir `frontend/src/hooks/useTheme.js` para que ya no resuelva tres estados ni se suscriba a `matchMedia`: sólo proyecta `tema` (leído de `useThemeStore`) a `document.documentElement.dataset.theme` en un `useEffect`
- [ ] 2-bis.2 Verificar en el inspector que `<html>` lleva `data-theme` junto al `data-unidad` ya existente, y que el valor cambia al hacer clic en el toggle — **pendiente, requiere navegador**, queda para verificación manual del usuario

## 3. Reestructuración de tokens en CSS

- [x] 3.1 En `frontend/src/index.css`, convertir el bloque `@media (prefers-color-scheme: dark) { ... }` en `[data-theme="dark"] { ... }`, moviendo los valores **literalmente** (neutrales, semánticos, y los dos bloques de acento por unidad)
- [x] 3.2 Ajustar los selectores de acento anidados: `[data-unidad="vivero"]` y `[data-unidad="herramientas"]` matchean el mismo `<html>` que `[data-theme]`, así que dentro del bloque oscuro deben combinarse en un solo selector (`[data-theme="dark"][data-unidad="vivero"]`), no anidarse como descendientes
- [x] 3.3 Verificar con `git diff` que ningún **valor** de token cambió respecto del archivo previo — sólo cambió el selector que los envuelve — confirmado: `git diff frontend/src/index.css` sólo muestra cambios de selector/comentarios, ningún hex de token se tocó
- [x] 3.4 Reemplazar el `color-scheme: light dark` fijo por declaraciones por tema: `[data-theme="light"] { color-scheme: light; }` y `[data-theme="dark"] { color-scheme: dark; }`, dejando el `light dark` en `:root` como red de seguridad para el instante previo al script
- [x] 3.5 Agregar `color-scheme: light` a `.force-light-export`, sin tocar ninguna de sus declaraciones de token existentes
- [x] 3.6 Actualizar el comentario que encabeza el bloque oscuro para que explique la activación por atributo y por qué ya no hay media query (referencia a la Decisión 1)
- [x] 3.7 Confirmar que `index.css` ya no contiene ninguna ocurrencia de `prefers-color-scheme` fuera del script inline — `grep -n prefers-color-scheme frontend/src/index.css` no devuelve resultados (se reformularon las dos menciones en prosa de comentarios que usaban el string literal, sin cambiar significado)

## 4. Script anti-parpadeo

> Supersedido en parte: sin `localStorage` que leer, el script se simplifica a una sola consulta
> `matchMedia`. 4.1 y 4.3 quedan tachadas por describir el mecanismo anterior; 4.2 se reformula
> (ya no hay "sistema" al cual caer, el catch cae directo a `'light'`).

- [x] ~~4.1 Agregar en el `<head>` de `frontend/index.html`, inline y sin `defer`, un script que lea la clave de `localStorage`, resuelva la preferencia contra `matchMedia` y fije `document.documentElement.dataset.theme` antes del primer pintado~~
- [x] 4.2 Envolver el script en `try/catch` — reformulado: ya no cae a `'sistema'` (no existe ese estado), cae directo a `'light'` ante cualquier fallo de `matchMedia`
- [x] ~~4.3 Comentar el script nombrando explícitamente a `frontend/src/store/useThemeStore.js` como la otra mitad del contrato de la clave, y advertir que una desincronización reintroduce el parpadeo sin producir ningún error visible~~ — ya no hay contrato de clave que mantener sincronizado: script y store llegan al mismo valor por la misma consulta `matchMedia` independiente, no por lectura compartida de storage
- [ ] 4.4 Verificar sin parpadeo: recargar con caché deshabilitada y confirmar que no aparece ningún fotograma claro intermedio con el sistema operativo en oscuro — **pendiente, requiere navegador; queda para la verificación visual manual del usuario**
- [x] ~~4.5 Repetir la verificación de 4.4 con la preferencia en `sistema` y el sistema operativo en oscuro~~ — sin objeto, ya no existe la preferencia `sistema` como estado separado del arranque por `matchMedia`

### 4-bis. Revisión post-implementación

- [x] 4-bis.1 Reescribir el script inline de `frontend/index.html` para que ya no lea `localStorage`: sólo consulta `window.matchMedia('(prefers-color-scheme: dark)')` y fija `data-theme`, envuelto en `try/catch` con fallback a `'light'`

## 5. Control de tema en la interfaz

> 5.1 y 5.2 quedan tachadas: el usuario pidió sacar el popover ("NO quiero que sea un select").
> 5.3 sin objeto (no hay múltiples opciones que marcar). 5.4 a 5.7 se mantienen conceptualmente,
> ajustadas al toggle único en 5-bis.

- [x] ~~5.1 Crear `frontend/src/components/ThemeToggle.jsx` (PascalCase): botón con ícono del estado resuelto (`Sun`/`Moon` de `lucide-react`) que abre un popover con las tres opciones — Claro (`Sun`), Oscuro (`Moon`), Sistema (`Monitor`)~~
- [x] ~~5.2 Replicar el patrón de popover ya usado para las alertas en `DashboardLayout.jsx`: backdrop `fixed inset-0 z-40` que cierra al clic, panel absoluto con `bg-paper border border-line-strong rounded-panel`~~
- [x] ~~5.3 Marcar visualmente la opción activa y estilarla con tokens del sistema de diseño~~ — sin objeto, un solo botón no tiene "opción activa" que marcar
- [x] 5.4 Cumplir las reglas duras de UI: `cursor-pointer` en el botón, `focus:ring-2 focus:ring-accent`, ícono de `lucide-react` (conservado en la reescritura del componente)
- [x] 5.5 Mantener `<ThemeToggle />` montado en el mismo punto del `<header>` de `DashboardLayout.jsx` (izquierda de la campana) — no se movió el punto de montaje, sólo se reescribió el contenido del componente
- [x] 5.6 Verificar que el control sigue visible y funcional para cualquier usuario sin condicionar por permiso — `<ThemeToggle />` se sigue montando sin wrapper condicional, igual que antes de la revisión
- [ ] 5.7 Verificar que hacer clic en el toggle no recarga la página ni pierde el estado de la pantalla activa (probar con un formulario a medio completar) — **pendiente, requiere navegador**, queda para el usuario. Por diseño no debería perder estado: `toggleTema` sólo actualiza el store de Zustand, sin `window.location.reload()` ni navegación de por medio

### 5-bis. Revisión post-implementación — toggle único

- [x] 5-bis.1 Reescribir `frontend/src/components/ThemeToggle.jsx`: un único botón (sin popover, sin backdrop) cuyo `onClick` llama a `toggleTema()` directamente; ícono `Sun`/`Moon` de `lucide-react` según el tema actual
- [x] 5-bis.2 Confirmar que no queda ningún elemento de menú/popover (`isOpen`, backdrop `fixed inset-0`, panel `absolute`) en el componente

## 6. Verificación de contraste en modo oscuro

> Grupo deliberadamente extenso: hasta ahora el modo oscuro sólo lo veía quien tenía el dispositivo
> en oscuro, y así se colaron dos defectos reales (`--accent-ink` ilegible, marco blanco en la
> factura exportada). Con el control explícito, cualquier usuario puede activarlo en cualquier
> pantalla. Recorrer con el tema en **oscuro forzado desde el control**, en ambas unidades de negocio.

- [ ] 6.1 Login (fuera del layout autenticado — verificar que igual toma el tema resuelto por `matchMedia` al cargar, vía `App.jsx`; revisión post-implementación: ya no hay "tema guardado" que tomar, sólo el arranque en memoria)
- [ ] 6.2 Dashboard y barra superior, incluido el popover de alertas y el propio `ThemeToggle`
- [ ] 6.3 Sidebar completo: logo por unidad, placa de unidad de negocio, ítem de navegación activo, popover de perfil
- [ ] 6.4 Pantallas de listado con tablas y chips de estado: Facturas, Cheques, Finanzas, HistorialVentas — confirmar que `ok`/`warn`/`danger` se distinguen entre sí y del fondo
- [ ] 6.5 Formularios y modales: NuevaVenta, ClienteForm, ChequeEstadoModal, ConfirmDialog, PermissionDeniedModal
- [ ] 6.6 Desplegables nativos `<select>`: confirmar que el popup de `<option>` se pinta en oscuro y es legible (verifica la Decisión 7 y no rompe el fix de contraste ya presente en `index.css`)
- [ ] 6.7 Toasts de `useUIStore` en sus cuatro variantes
- [ ] 6.8 Repetir el recorrido en la unidad Herramientas y confirmar que el acento turquesa oscuro se distingue del verde de Vivero
- [ ] 6.9 Anotar cada defecto de contraste encontrado; corregirlo como ajuste puntual de token y documentar el porqué en el comentario correspondiente de `index.css` — no re-paletizar

## 7. Regresión de la exportación de factura

- [ ] 7.1 Con la app en **oscuro elegido desde el toggle** y el sistema operativo en claro, exportar una factura de cliente y confirmar que el PNG sale íntegramente claro, sin marco ni zonas oscuras
- [ ] 7.2 Con la app recién cargada (sin tocar el toggle) y el dispositivo en oscuro, repetir la exportación y confirmar el mismo resultado (es el escenario del bug original ya corregido — verificar que no reaparece; reformulado tras la revisión post-implementación, ya no existe la preferencia `sistema` como estado separado)
- [ ] 7.3 Exportar desde la unidad Herramientas en tema oscuro y confirmar que el documento usa el acento **claro** de Herramientas
- [ ] 7.4 Confirmar que no se modificó ninguna línea de `capturarNodoComoImagen` ni de `esperarProximoFrame` en `FacturaCliente.jsx`
- [x] 7.5 (Revisión post-implementación, bug reportado por el usuario) Agregar la clase `force-light-export` al `<div ref={previewRef}>` de `frontend/src/components/ComprobanteVentaModal.jsx` (mismo patrón que 7.1–7.4, mismo bug del "marco blanco" que ya afectaba a `FacturaCliente.jsx`, nunca corregido acá). No se tocó `generarPngDePreview` ni el resto de la lógica de captura/compartir
- [ ] 7.6 Con la app en oscuro, descargar un remito desde el historial de ventas en ambas unidades de negocio (Vivero y Herramientas) y confirmar que el PNG sale íntegramente claro y legible (números y texto se distinguen, sin encabezado oscuro con texto verde ni píldora de estado ilegible) — **pendiente, requiere navegador**, queda para verificación manual del usuario, incluyendo el flujo mobile (Web Share)

## 8. Cierre

- [ ] 8.1 Recorrer los escenarios de `specs/tema-claro-oscuro/spec.md` uno por uno y confirmar que cada uno se cumple
- [ ] 8.2 Verificar los tres escenarios de `specs/sistema-diseno-visual/spec.md`, en particular el de «los valores oscuros están declarados una sola vez»
- [ ] 8.3 Confirmar que no se tocó backend, base de datos, DTOs, permisos ni rutas
- [x] ~~8.4 Verificar la persistencia extremo a extremo: elegir oscuro, cerrar sesión, cerrar el navegador, reabrir, y confirmar que el login aparece en oscuro~~ — supersedida: la revisión post-implementación sacó la persistencia a propósito; ver 8.5
- [ ] 8.5 (Revisión post-implementación) Verificar la ausencia de persistencia: elegir oscuro, recargar la pestaña (F5), y confirmar que el tema vuelve a resolverse por `matchMedia` (no queda "pegado" en oscuro si el sistema operativo está en claro) — **pendiente, requiere navegador**, queda para el usuario
