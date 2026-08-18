## 1. Helper de presentación del saldo

- [x] 1.1 Crear `frontend/src/utils/saldoDisplay.js` con la función pura `describirSaldo(balance)` que devuelva `{ estado, etiqueta, monto, tono }`: `balance < 0` → `{ estado: 'DEUDA', etiqueta: 'Debe' }`, `balance > 0` → `{ estado: 'A_FAVOR', etiqueta: 'A favor' }`, `balance === 0 / null / undefined` → `{ estado: 'NEUTRO', etiqueta: 'Sin saldo' }`. `monto` es `Math.abs(balance || 0)` formateado con `toLocaleString('es-AR')`.
- [x] 1.2 En el mismo helper, exponer en `tono` las clases Tailwind por estado: DEUDA → texto `text-red-600` / chip `bg-red-50 text-red-700`; A_FAVOR → texto `text-emerald-600` / chip `bg-emerald-50 text-emerald-700`; NEUTRO → texto `text-gray-500` / chip `bg-gray-100 text-gray-600`.

## 2. Listado de Clientes — tarjeta mobile

- [x] 2.1 En `frontend/src/pages/Clientes.jsx`, importar `describirSaldo` y reemplazar el chip `text-xs` de saldo de la tarjeta mobile por un bloque destacado: monto en `text-2xl font-bold` con el color del estado + etiqueta (`Debe` / `A favor` / `Sin saldo`) en `text-xs uppercase tracking-wide` encima del monto.
- [x] 2.2 Reacomodar la cabecera de la tarjeta para que nombre y saldo sean la jerarquía dominante: nombre en `font-bold text-gray-900` y teléfono degradado a `text-xs text-gray-400`; el bloque de saldo alineado a la derecha (`flex-col items-end`) sin que se corte a 320px de ancho.
- [x] 2.3 Mantener el chip de bandejas (`balanceBandejas`) como dato secundario, con menor peso visual que el saldo en dinero, y conservar la condición `unidadNegocioActiva !== '2'`.
- [x] 2.4 Verificar que los botones de la tarjeta (`Editar`, `Saldo`, `Eliminar` y la fila de bandejas) mantengan `flex-1`, `cursor-pointer` e íconos de `lucide-react`, y que el alto de toque sea de al menos `py-2.5` en la fila principal.

## 3. Listado de Clientes — tabla desktop

- [x] 3.1 En la celda `Saldo Dinero` de la tabla (`hidden md:block`), usar `describirSaldo` para el chip: mismo criterio de color y corrección del caso `balanceDinero === 0`, que hoy se pinta en verde como si fuera saldo a favor.
- [x] 3.2 Mostrar la etiqueta de estado también en desktop (ej. `$ 15.000 · Debe`) o como `title`/texto secundario, de modo que tabla y tarjeta comuniquen el mismo estado para el mismo valor.
- [x] 3.3 Verificar que el breakpoint del listado siga siendo `md:hidden` / `hidden md:block` (768px, coherente con los escenarios del spec) — no migrar a `sm:`.
- [x] 3.4 Verificar que `handleConfirmDelete` con `askConfirm({ title, message, variant: 'danger', confirmLabel, onConfirm })` siga siendo el único camino de borrado en ambas vistas; no debe existir ningún `onClick` que llame `handleDelete` directo.

## 4. AjusteSaldoModal — shell fullscreen mobile

- [x] 4.1 En `frontend/src/components/AjusteSaldoModal.jsx`, cambiar el overlay a `fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm`.
- [x] 4.2 Cambiar el panel a `w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[95vh]`, replicando el patrón ya canonizado en `ProductoForm.jsx` / `InsumoForm.jsx`.
- [x] 4.3 Estructurar el modal en tres bandas: header `flex-none`, cuerpo del formulario `flex-1 overflow-y-auto` y footer `flex-none` con borde superior; el `<form>` debe envolver cuerpo + footer para que el submit siga funcionando.
- [x] 4.4 Convertir la botonera del footer (`Cancelar` / `Guardar Pago|Deuda`) en botones `flex-1` de ancho completo en mobile (`flex gap-3` con `sm:justify-end sm:flex-none` en desktop), manteniendo `cursor-pointer` y el estado `disabled` actual con `Loader2`.

## 5. AjusteSaldoModal — bloque de saldo actual

- [x] 5.1 Reemplazar el panel "Saldo Actual" por la versión con `describirSaldo`: etiqueta de estado (`Debe` / `A favor` / `Sin saldo`) + monto en `text-3xl font-bold` con el color vivo del estado, eliminando el texto suelto "El cliente tiene deuda.".
- [x] 5.2 Corregir el caso `balanceDinero === 0`, que hoy cae en la rama `text-emerald-600`, para que use el tono neutro.
- [x] 5.3 Revisar la grilla de selección de movimiento (`Registrar Pago` / `Nueva Deuda`): pasar a `grid-cols-1 sm:grid-cols-2` **solo si** en un viewport de 320px el texto de los botones se corta o desborda; en caso contrario dejar `grid-cols-2` y aumentar el área táctil a `p-4`.
- [x] 5.4 Confirmar que el input de monto sigue usando `FormattedNumberInput` (ya aporta `type="number" inputMode="numeric"`) — no duplicar atributos ni reemplazar el componente.

## 6. Modales de cuenta corriente de bandejas

- [x] 6.1 En `frontend/src/components/DevolucionBandejasModal.jsx`, aplicar el mismo shell fullscreen mobile de las tareas 4.1–4.2 (`p-0 sm:p-4`, `rounded-none sm:rounded-2xl`, `h-full sm:h-auto`, `max-h-screen sm:max-h-[95vh]`, `flex flex-col`).
- [x] 6.2 En ese mismo modal, pasar el footer de `justify-end` a botones `flex-1` de ancho completo en mobile, manteniendo el spinner de carga y `cursor-pointer`.
- [x] 6.3 En `frontend/src/components/HistorialBandejasModal.jsx`, aplicar el shell fullscreen mobile conservando el header `flex-none` y el cuerpo `flex-1 overflow-y-auto` que ya existen; en desktop mantener `max-w-2xl` y `sm:max-h-[90vh]`.
- [x] 6.4 Revisar que el listado de movimientos del historial no desborde horizontalmente a 320px: apilar fecha / tipo / cantidad en mobile o permitir scroll horizontal contenido, sin romper la vista de escritorio.

## 7. Verificación

- [x] 7.1 Verificar en un viewport de 320–390px (DevTools o dispositivo real vía IP de LAN): listado de clientes, apertura de los tres modales, ajuste de saldo, devolución de bandejas y confirmación de borrado.
- [x] 7.2 Verificar que en ≥768px el render de `Clientes.jsx` y de los tres modales sea visualmente equivalente al actual (todos los cambios de shell deben ser aditivos con prefijo `sm:`).
- [x] 7.3 Verificar que no queden usos de `alert`/`confirm` nativos ni llamadas directas a `handleDelete` en los archivos tocados, y que todo feedback siga pasando por `useUIStore` (`pushToast` / `askConfirm`).
- [x] 7.4 Confirmar que no se modificó `ClienteForm.jsx` ni ningún archivo de backend en este change.
