> **Gobernanza LOW.** Presentación pura en frontend: sin lógica de negocio, sin backend, sin permisos, sin cambios de contrato ni de props. Autonomía plena; alcanza con reportar lo hecho al cerrar.
>
> **Archivos que este change puede tocar:** únicamente `frontend/src/components/HistorialBandejasModal.jsx` y el nuevo `frontend/src/utils/bandejasDisplay.js`. Cualquier otro archivo modificado es una desviación del alcance y debe justificarse. En particular, **no tocar** `frontend/src/pages/DevolucionBandejas.jsx` (la está modificando el change activo `bandejas-acceso-limitado`).

## 1. Línea de base

- [x] 1.1 Leer `frontend/src/components/HistorialBandejasModal.jsx` completo y confirmar que el estado coincide con la tabla de relevamiento de `design.md`: panel en `max-w-2xl`, tabla en `overflow-x-auto` con `min-w-[560px]`, ternario de tipo `ENTREGA` naranja / resto esmeralda, ternario de detalle `ventaId`. Si algo difiere, detenerse y reportar antes de editar.
- [x] 1.2 Registrar el diff de referencia: `git diff --stat` antes de empezar, para poder demostrar al cierre que solo se tocaron los dos archivos del alcance.
- [x] 1.3 Leer `frontend/src/utils/chequeDisplay.js` y `frontend/src/utils/saldoDisplay.js` para copiar exactamente su estilo (export nombrado, JSDoc si lo tienen, forma del objeto `tono`). El helper nuevo debe parecer escrito por la misma mano.

## 2. Helper de presentación `utils/bandejasDisplay.js`

- [x] 2.1 Crear `frontend/src/utils/bandejasDisplay.js` (camelCase, **no** PascalCase: no es un componente).
- [x] 2.2 Implementar `describirTipoMovimiento(tipo)` devolviendo `{ etiqueta, tono: { chip, texto } }`. Para `'ENTREGA'`: `chip: 'bg-orange-50 text-orange-700'`, `texto: 'text-orange-700'`. Para cualquier otro valor (incluidos `null`/`undefined`): `chip: 'bg-emerald-50 text-emerald-700'`, `texto: 'text-emerald-700'`. `etiqueta` es el propio `tipo`, con fallback a cadena vacía si es nulo.
- [x] 2.3 Verificar por lectura que las dos cadenas de `chip` son **carácter por carácter** las mismas que hoy están inline en el `<td>` del componente. Es la garantía de cero regresión visual en escritorio.
- [x] 2.4 Implementar `describirDetalleMovimiento(mov)` devolviendo `{ etiqueta, esVenta }`: con `mov.ventaId` presente, `etiqueta` es `` `Venta #${mov.ventaId}` `` y `esVenta` es `true`; en caso contrario `etiqueta` es `'Devolución directa'` y `esVenta` es `false`.
- [x] 2.5 Verificar que ambas funciones son puras: sin imports de React, sin acceso a `Date.now()`, sin estado, sin efectos. Mismo input, mismo output.
- [x] 2.6 Verificar que ninguna de las dos accede a campos fuera de los ocho de `HistorialBandejasDTO` (`id`, `clienteId`, `clienteNombre`, `ventaId`, `cantidad`, `tipo`, `fecha`, `usuarioNombre`).

## 3. Ancho del modal en escritorio

- [x] 3.1 En `HistorialBandejasModal.jsx`, reemplazar `max-w-2xl` por `max-w-4xl` en la clase del panel (línea del `div` interno, junto a `w-full h-full sm:h-auto`).
- [x] 3.2 Verificar que **no** se tocó nada más de esa línea: `w-full`, `h-full`, `sm:h-auto`, `rounded-none`, `sm:rounded-2xl`, `overflow-hidden`, `shadow-xl`, `animate-fade-in-up`, `max-h-screen`, `sm:max-h-[90vh]` y `flex flex-col` quedan idénticos. El fullscreen mobile no debe alterarse.
- [x] 3.3 Verificar que el overlay (`p-0 sm:p-4`, `bg-black/50 backdrop-blur-sm`) queda sin cambios.

## 4. Tabla acotada a escritorio

- [x] 4.1 Envolver el bloque de la tabla en `<div className="hidden md:block">`, reemplazando al `<div className="overflow-x-auto">` actual (no anidar ambos: el `overflow-x-auto` se elimina).
- [x] 4.2 Eliminar `min-w-[560px]` de la clase de la `<table>`, dejando `w-full text-left border-collapse`.
- [x] 4.3 Verificar que el `<thead>` conserva `sticky top-0` y todas sus clases actuales, y que el cuerpo del modal sigue siendo el contenedor de scroll vertical (`overflow-y-auto flex-1`).
- [x] 4.4 Sustituir el ternario de color de tipo dentro del `<td>` por `describirTipoMovimiento(mov.tipo)`, usando `tono.chip` en el `<span>` y `etiqueta` como contenido.
- [x] 4.5 Sustituir el ternario de detalle dentro del `<td>` por `describirDetalleMovimiento(mov).etiqueta`.
- [x] 4.6 Verificar que ninguna otra parte de la tabla cambió: mismas 5 columnas en el mismo orden, mismos `p-4`, mismos alineados (`text-right` en Cantidad y Usuario, `text-center` en Detalle), mismo `hover:bg-gray-50/50`, misma `key={mov.id}`, misma llamada `toLocaleString('es-AR')` **sin opciones** en la celda de fecha.

## 5. Tarjetas en mobile

- [x] 5.1 Agregar, antes del bloque de la tabla y dentro del mismo condicional de "hay movimientos", un contenedor `<div className="grid grid-cols-1 gap-3 p-4 md:hidden">` que itera el **mismo** `historial.map((mov) => ...)` que la tabla. El `p-4` es necesario porque el cuerpo del modal es `p-0`.
- [x] 5.2 Cada tarjeta: `<div key={mov.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">`.
- [x] 5.3 Banda 1 (`flex items-start justify-between gap-3`): a la izquierda el chip de tipo con las clases de `describirTipoMovimiento(mov.tipo).tono.chip` más `px-2.5 py-1 rounded-full text-xs font-medium`; a la derecha un bloque `text-right` con `mov.cantidad` en `text-2xl font-bold text-gray-900` y la palabra `bandejas` debajo en `text-xs text-gray-500`.
- [x] 5.4 Banda 2/3 (`mt-3 space-y-1 text-xs text-gray-500`): fecha en formato corto, luego `describirDetalleMovimiento(mov).etiqueta`, luego `por: {mov.usuarioNombre || '-'}`.
- [x] 5.5 Usar en la tarjeta `new Date(mov.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })`. Verificar que la celda equivalente de la **tabla** siguió con `toLocaleString('es-AR')` a secas (divergencia deliberada, D6 de `design.md`).
- [x] 5.6 Verificar que la tarjeta no accede a ningún campo con encadenamiento sin guarda y que no rompe con `usuarioNombre`, `tipo` o `ventaId` nulos.
- [x] 5.7 Verificar que ni el bloque de carga (spinner `p-12`) ni el de vacío (`p-12 text-center`) fueron modificados ni duplicados por breakpoint: son compartidos por ambas vistas.

## 6. Verificación por revisión de código

- [x] 6.1 Buscar `min-w-[560px]` en todo `frontend/src/components/HistorialBandejasModal.jsx`: debe haber **cero** ocurrencias.
- [x] 6.2 Buscar `overflow-x` en el mismo archivo: debe haber **cero** ocurrencias. Es la verificación literal del pedido del usuario ("en celular debo hacer scroll horizontal").
- [x] 6.3 Buscar `max-w-`: debe haber exactamente una ocurrencia, `max-w-4xl`.
- [x] 6.4 Confirmar que existe exactamente un `md:hidden` (bloque de tarjetas) y exactamente un `hidden md:block` (contenedor de tabla), y que no se coló ningún `sm:hidden` ni `lg:hidden` en el listado (D1: los listados conmutan en `md`).
- [x] 6.5 Confirmar que `bg-orange-50 text-orange-700` y `bg-emerald-50 text-emerald-700` ya **no** aparecen literalmente en el `.jsx`: ahora viven solo en el helper.
- [x] 6.6 Confirmar que `historial` se itera con el mismo `.map` en ambos bloques y que no se introdujo un segundo estado, un `useMemo` de filtrado ni ninguna fuente de datos paralela.
- [x] 6.7 Confirmar que la firma del componente sigue siendo `({ isOpen, onClose, cliente })` y que el `useEffect` de fetch, el `pushToast` del catch y el `if (!isOpen || !cliente) return null` quedaron intactos.
- [x] 6.8 Correr `git status` y confirmar que los únicos archivos modificados/creados son `HistorialBandejasModal.jsx` y `utils/bandejasDisplay.js`. En particular, `DevolucionBandejas.jsx` y `Clientes.jsx` deben aparecer sin cambios de este change.
- [x] 6.9 Recorrer los escenarios del requisito "Historial de Bandejas Priorizado en Mobile" en `specs/ui-responsive/spec.md` uno por uno y marcar cuál línea de código satisface cada `THEN`. Registrar cualquier escenario sin respaldo en el código antes de dar el change por terminado.

## 7. Verificación visual (posterior, requiere navegador)

- [x] 7.1 Abrir el historial desde `Clientes.jsx` en escritorio (>=1280px) y confirmar que el modal se ve más ancho que antes y que las 5 columnas respiran, sin scroll horizontal.
- [x] 7.2 Abrir el mismo historial en un viewport de 360-390px y confirmar que se ven tarjetas, que **no** hay scroll horizontal y que el scroll vertical funciona con el header fijo arriba.
- [x] 7.3 Verificar la franja 640-767px: el modal ya está centrado con bordes redondeados y **todavía muestra tarjetas**. Esto es lo esperado (D1 de `design.md`), no un defecto. Confirmar que se ve aceptable antes de descartar la Open Question 2.
- [x] 7.4 Abrir el historial desde `DevolucionBandejas.jsx` (el segundo call site) y confirmar que se comporta igual, sin haber tocado esa página.
- [x] 7.5 Confirmar con el usuario si `max-w-4xl` (896px) es el ancho que buscaba. Si le resulta excesivo, aplicar la Open Question 1 de `design.md` (bajar a `max-w-3xl`): es un cambio de un token en una línea.

> **Nota sobre verificación.** El proyecto no tiene runner de tests en el frontend, y en esta sesión no hay entorno de navegador disponible (misma situación que en el change `bandejas-acceso-limitado`). Por eso los grupos 1 a 6 están redactados para ser verificables **por revisión de código**: presencia o ausencia de clases concretas, pureza de las funciones del helper y equivalencia carácter por carácter de las cadenas de clases. El grupo 7 es verificación visual y queda como paso posterior explícito, a ejecutar cuando haya navegador. Si en el futuro se automatizan estas verificaciones, las funciones de `utils/bandejasDisplay.js` son puras y testeables sin DOM ni base de datos; los tests que toquen datos reales deben usar base real o Testcontainers, nunca mocks de base de datos.
