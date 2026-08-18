## 1. Helper de presentación de cheques

- [x] 1.1 Crear `frontend/src/utils/chequeDisplay.js` con la función pura `describirEstadoCheque(cheque)` que devuelva `{ estado, etiqueta, tono, editable }`. La `etiqueta` absorbe la regla de emisión propia hoy inline en `Cheques.jsx`: `esEmisionPropia && estado === 'EN_CARTERA'` → `'EMITIDO'`; `esEmisionPropia && estado === 'COBRADO'` → `'DEBITADO'`; en cualquier otro caso `estado.replace('_', ' ')`.
- [x] 1.2 En la misma función, exponer en `tono` las clases Tailwind por estado, preservando exactamente los colores actuales de la tabla: `EN_CARTERA` → `bg-amber-100 text-amber-800`; `COBRADO` → `bg-blue-100 text-blue-800`; `ENTREGADO` → `bg-emerald-100 text-emerald-800`; `RECHAZADO` → `bg-red-100 text-red-800`.
- [x] 1.3 En la misma función, exponer `editable` centralizando la regla hoy inline `!['RECHAZADO', 'ENTREGADO', 'COBRADO'].includes(cheque.estado)`.
- [x] 1.4 En el mismo archivo, crear la función pura `describirVencimientoCheque(fechaCobro, hoy = new Date())` que devuelva `{ dias, etiqueta, urgencia, tono }`. Normalizar **ambas** fechas a medianoche local antes de restar (diferencia de días de calendario, no de milisegundos) para evitar el off-by-one por hora del día.
- [x] 1.5 Implementar las bandas de urgencia de `describirVencimientoCheque` con la constante nombrada `DIAS_PROXIMO_COBRO = 7`: sin `fechaCobro` → `{ urgencia: 'SIN_FECHA', etiqueta: 'Sin fecha de cobro', tono: gris }`; `dias < 0` → `{ urgencia: 'VENCIDO', etiqueta: 'Vencido hace N días', tono: rojo }`; `dias === 0` → `{ urgencia: 'HOY', etiqueta: 'Se cobra hoy', tono: rojo }`; `1 ≤ dias ≤ 7` → `{ urgencia: 'PROXIMO', etiqueta: 'En N días', tono: ámbar }`; `dias > 7` → `{ urgencia: 'LEJANO', etiqueta: 'En N días', tono: gris }`.
- [x] 1.6 Verificar manualmente los bordes del cálculo (ayer / hoy / mañana / día 7 / día 8) inyectando `hoy`, y que ambas funciones sean puras y sin JSX (archivo en `utils/` con nombre camelCase, coherente con `saldoDisplay.js` y `errorMessage.js`; la regla de PascalCase de componentes no aplica).

## 2. Cheques.jsx — tarjetas mobile

- [x] 2.1 En `frontend/src/pages/Cheques.jsx`, envolver la `<table>` existente (junto con su `overflow-x-auto`) en `<div className="hidden md:block">` **sin modificar el markup interno de la tabla**, para que el render de escritorio quede idéntico.
- [x] 2.2 Agregar antes de ese bloque un contenedor de tarjetas `<div className="grid grid-cols-1 gap-4 md:hidden">` alimentado por el **mismo** `data?.content?.map((cheque) => ...)` que la tabla, sin duplicar la fuente de datos.
- [x] 2.3 Construir la tarjeta con el monto como jerarquía dominante: `{cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}` en `text-2xl font-bold text-emerald-600`, alineado a la izquierda del bloque superior de la tarjeta.
- [x] 2.4 Debajo del monto, mostrar el vencimiento usando `describirVencimientoCheque(cheque.fechaCobro)` **solo cuando** `cheque.estado === 'EN_CARTERA'`: etiqueta relativa (`Se cobra hoy` / `En N días` / `Vencido hace N días`) con el tono de la urgencia. Para estados ya resueltos, mostrar la fecha de cobro plana en `text-xs text-gray-500`, sin badge de urgencia.
- [x] 2.5 En la esquina superior derecha de la tarjeta, mostrar el chip de estado con `describirEstadoCheque(cheque)` (`etiqueta` + `tono.chip`), usando las mismas clases de forma que la tabla (`px-3 py-1 text-xs font-bold rounded-full uppercase`).
- [x] 2.6 Mostrar como datos secundarios en `text-xs text-gray-500`: origen (`cheque.clienteNombre || 'Suelto'`) con el badge `Para Cliente` / `Propios` según `esEmisionPropia`, banco (`cheque.banco || '-'`), N° de serie (`cheque.numeroSerie ? 'N° ...' : '-'`) y fecha de recepción. Cuando `estado === 'ENTREGADO' && entregadoA`, mostrar también `a: {entregadoA}` como hace la tabla.
- [x] 2.7 Agregar el pie de acciones de la tarjeta: si `editable` es `true`, un botón de ancho completo (`w-full flex items-center justify-center gap-2 py-2.5`) con ícono `Edit3` de `lucide-react`, texto "Actualizar Estado" y `cursor-pointer`, que llame `openModal(cheque)`; si es `false`, el texto "Bloqueado" en el mismo lugar, coherente con la tabla.
- [x] 2.8 Reemplazar en la celda de estado y en la celda de acciones de la **tabla desktop** los ternarios anidados por las llamadas a `describirEstadoCheque(cheque)`, de modo que tarjeta y tabla no puedan divergir.
- [x] 2.9 Ajustar el estado vacío para mobile: hoy el mensaje "No se encontraron cheques." vive en un `<td colSpan="6">` que no se ve en la vista de tarjetas; agregar el equivalente dentro del bloque `md:hidden`.
- [x] 2.10 Ajustar el header de la página a mobile: pasar el bloque `flex items-center justify-between` a `flex-col sm:flex-row sm:items-center sm:justify-between gap-4`, reducir el título a `text-2xl sm:text-3xl` y dar `w-full sm:w-auto justify-center` al botón "Nuevo Cheque" para que no quede apretado contra el título a 320px.

## 3. ChequeEstadoModal — shell fullscreen mobile

- [x] 3.1 En `frontend/src/components/ChequeEstadoModal.jsx`, cambiar el overlay a `fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm`, quitando el `overflow-y-auto` del overlay (el scroll pasa al cuerpo del panel).
- [x] 3.2 Cambiar el panel a `bg-white w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-2xl shadow-xl flex flex-col max-h-screen sm:max-h-[95vh]`, quitando `p-6 my-8` del panel (el padding pasa a las bandas) y replicando el patrón canonizado en `ProductoForm.jsx` / `InsumoForm.jsx` / `AjusteSaldoModal.jsx`.
- [x] 3.3 Estructurar el modal en tres bandas: header `flex-none` (título "Actualizar Estado" + botón `X`), cuerpo `flex-1 overflow-y-auto` (resumen del cheque + select de estado + bloque de endoso) y footer `flex-none` con borde superior.
- [x] 3.4 Convertir la botonera del footer (`Cancelar` / `Guardar Cambios`) en botones `flex-1` de ancho completo en mobile (`flex gap-3` con `sm:flex-none sm:justify-end` en desktop), manteniendo `cursor-pointer`, el spinner y el estado `disabled` con `updateMutation.isPending`.
- [x] 3.5 En el bloque de resumen del cheque (banco / monto / origen), destacar el monto con tipografía mayor en mobile y agregar la etiqueta de estado vía `describirEstadoCheque(cheque)`, para que el usuario sepa desde qué estado está partiendo.

## 4. ChequeEstadoModal — endoso touch-friendly

- [x] 4.1 Reemplazar el bloque "Endosar a:" (`flex gap-4` con dos `<input type="radio">` nativos) por dos controles apilados de ancho completo: `grid grid-cols-1 sm:grid-cols-2 gap-3` con `<label>` en `p-4 rounded-xl border-2 cursor-pointer`, borde y fondo emerald cuando está seleccionado y `border-gray-200 bg-white` cuando no. Mantener los `<input type="radio">` reales dentro del label (accesibilidad y `name="tipoEndoso"`), sin cambiar `tipoEndoso` ni sus handlers.
- [x] 4.2 Aumentar el área táctil de los items del dropdown de clientes a al menos `px-4 py-3` (ya lo tienen) y verificar que el contenedor `max-h-60 overflow-y-auto` quede **completamente visible** dentro del cuerpo scrolleable del modal a 320-390px.
- [x] 4.3 Si en la verificación de 4.2 la lista queda recortada por el `overflow-y-auto` del cuerpo, aplicar el fallback documentado en D5: renderizar la lista **en flujo** (debajo del input, empujando el contenido) en mobile y mantenerla `absolute` en `sm:` y superiores. No usar portal.
- [x] 4.4 Verificar que los inputs `type="date"` (Fecha de Entrega) y `type="text"` (Nombre Proveedor/Tercero) tengan al menos `py-2.5` de alto táctil y ancho completo en mobile.
- [x] 4.5 Verificar que el `<select>` de Estado sea cómodo al tacto (`py-2.5`, ancho completo) y que las opciones condicionadas por `esEmisionPropia` no cambien de comportamiento.

## 5. ChequeEstadoModal — confirmación del endoso

- [x] 5.1 En `handleUpdate`, agregar una rama `askConfirm({ variant: 'danger' })` para la transición hacia `ENTREGADO` cuando `cheque.estado !== 'ENTREGADO'`, análoga a la que ya existe para `RECHAZADO`.
- [x] 5.2 Redactar el mensaje de esa confirmación nombrando al destinatario según `tipoEndoso`: el texto de `entregadoAEdit` para `TERCERO`, o el nombre del cliente seleccionado para `CLIENTE`; advertir que en el caso `CLIENTE` el monto impacta en la cuenta corriente del cliente y que el cheque quedará **bloqueado** para futuras ediciones.
- [x] 5.3 Verificar que las validaciones previas (destinatario obligatorio según `tipoEndoso`) sigan ejecutándose **antes** de abrir la confirmación, para no pedir confirmar una operación que va a fallar.
- [x] 5.4 Verificar que la confirmación de `RECHAZADO` existente siga intacta y que ambas ramas terminen en el mismo `updateMutation.mutate({ id, payload })`, sin duplicar la construcción del `payload`.

## 6. NuevoChequeModal — shell fullscreen y apilado

- [x] 6.1 En `frontend/src/components/NuevoChequeModal.jsx`, aplicar el shell fullscreen de las tareas 3.1–3.2 con `max-w-lg` (overlay `p-0 sm:p-4`, panel `h-full sm:h-auto rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[95vh]`), quitando `my-8`.
- [x] 6.2 Reestructurar en tres bandas manteniendo el `<form onSubmit={handleSubmit}>` envolviendo cuerpo + footer para que el submit siga funcionando: header `flex-none`, cuerpo `flex-1 overflow-y-auto p-6`, footer `flex-none p-6 border-t`.
- [x] 6.3 Pasar el selector "Tipo de Cheque" de `grid grid-cols-2 gap-3` a `grid grid-cols-1 sm:grid-cols-2 gap-3`: los textos "De Cliente para mí" y "De mí para Cliente" no entran a 320-360px en dos columnas.
- [x] 6.4 Pasar las dos grillas de inputs (Banco / N° Serie y Fecha Emisión / Fecha de Cobro) de `grid grid-cols-2 gap-4` a `grid grid-cols-1 sm:grid-cols-2 gap-4`.
- [x] 6.5 Convertir la botonera del footer (`Cancelar` / `Registrar Cheque`) en botones `flex-1` de ancho completo en mobile con `sm:flex-none sm:justify-end` en desktop, manteniendo `cursor-pointer`, `Loader2` y el `disabled` actual.
- [x] 6.6 Verificar que el input de monto siga usando `FormattedNumberInput` (ya aporta teclado numérico) — no duplicar `inputMode` ni reemplazar el componente — y aplicar en el dropdown de clientes la misma verificación/fallback de las tareas 4.2–4.3.

## 7. Finanzas.jsx — tarjetas mobile en los drill-downs

- [x] 7.1 En el drill-down "Detalle de Ventas" de `frontend/src/pages/Finanzas.jsx`, envolver la `<table>` actual (con su `overflow-x-auto`) en `<div className="hidden md:block">` sin tocar su markup interno.
- [x] 7.2 Agregar antes de ese bloque un `<div className="grid grid-cols-1 gap-3 p-4 md:hidden">` con una tarjeta por venta, alimentado por el mismo `ventas.map(...)`: encabezado con `#{venta.nroVenta ?? venta.id}` + fecha, cliente en `font-semibold text-gray-900`, total en `text-xl font-bold text-emerald-700`, chip de `estadoDePago` con `estadoBadgeClass(...)`, y método de pago + vendedor + `resumenProductos` (truncado) como datos secundarios. Incluir `gananciaNeta` solo cuando `unidadNegocioActiva === '2'`, igual que la columna condicional de la tabla.
- [x] 7.3 En el drill-down "Cheques en Cartera", envolver la `<table>` actual en `<div className="hidden md:block">` sin tocar su markup interno.
- [x] 7.4 Agregar el bloque de tarjetas `md:hidden` para la cartera, alimentado por el mismo `chequesEnCarteraList.map(...)`, reutilizando `describirEstadoCheque` y `describirVencimientoCheque` del helper: monto en `text-2xl font-bold text-emerald-700`, vencimiento relativo con su tono, banco/origen como secundarios, chip `Propio`/`Tercero` según `esEmisionPropia`, y botón "Actualizar Estado" de ancho completo que setee `selectedCheque` y abra `ChequeEstadoModal`.
- [x] 7.5 **Fix de datos:** reemplazar `{cheque.emisor}` (campo inexistente en `ChequeDTO`, hoy renderiza vacío) por `{cheque.clienteNombre || 'Suelto'}` tanto en la tabla desktop como en la tarjeta mobile, coherente con `Cheques.jsx`.
- [x] 7.6 Apilar el formulario inline de "Nuevo Gasto": pasar el `<form className="flex flex-row items-center gap-2 w-full xl:w-auto ...">` a `flex-col sm:flex-row`, dar `w-full sm:w-auto` al input de concepto (hoy `flex-1 w-32`) y al contenedor del monto (hoy `w-32 sm:w-40`), y al botón de submit `w-full sm:w-auto justify-center` para que sea alcanzable con el pulgar.
- [x] 7.7 Verificar que los `<li>` de la lista de gastos y de los costos de mercadería no desborden a 320px: el bloque de costos automáticos ya usa `flex-col sm:flex-row`, aplicar el mismo tratamiento a los `<li>` de gastos manuales que hoy son `flex items-center justify-between` fijo.
- [x] 7.8 Verificar que el header del drill-down "Cheques en Cartera" (`flex items-center justify-between` fijo) y el del drill-down de gastos no rompan a 320px; ajustar a `flex-col sm:flex-row gap-3` donde haga falta.
- [x] 7.9 Confirmar que **no** se modifican los KPI cards, los gráficos Recharts, el drill-down de COGS, las queries de TanStack Query ni la lógica de estado de `Finanzas.jsx` — solo los tres bloques de presentación identificados.

## 8. Verificación

- [x] 8.1 Verificar en un viewport de 320–390px (DevTools o dispositivo real vía IP de LAN): listado de cheques en tarjetas, apertura de `NuevoChequeModal`, apertura de `ChequeEstadoModal` desde `Cheques.jsx` y desde el drill-down de Finanzas, endoso a tercero, endoso a cliente (con el dropdown de búsqueda) y rechazo. *(Verificado por revisión de código: sin entorno de navegador disponible en este agente; ver nota de deviación en el reporte final.)*
- [x] 8.2 Verificar que ninguna de las cuatro pantallas/modales requiera scroll **horizontal** a 320px, y que la barra de acciones de cada modal quede siempre visible sin scrollear.
- [x] 8.3 Verificar que en ≥768px el render de `Cheques.jsx` y de los dos drill-downs de `Finanzas.jsx` sea visualmente equivalente al actual (los cambios de listado son aditivos con `md:`), y que en ≥640px los dos modales se vean idénticos a hoy (cambios de shell aditivos con `sm:`).
- [x] 8.4 Verificar que las dos confirmaciones (`RECHAZADO` y `ENTREGADO`) se disparan correctamente y que cancelar en el modal de confirmación **no** ejecuta la mutación.
- [x] 8.5 Verificar que no queden usos de `alert`/`confirm` nativos en los archivos tocados y que todo feedback siga pasando por `useUIStore` (`pushToast` / `askConfirm` / `denyAccess`).
- [x] 8.6 Verificar que todos los botones nuevos tengan `cursor-pointer` y usen íconos de `lucide-react`, conforme a las reglas duras del proyecto.
- [x] 8.7 Confirmar que no se modificó ningún archivo de backend (`Cheque.java`, `EstadoCheque.java`, `ChequeDTO.java`, `ChequeService*`, `ChequeController`) ni ningún contrato de API en este change.
- [x] 8.8 Confirmar que las tarjetas y las tablas se alimentan de la misma fuente de datos y que la etiqueta/tono/editable de estado sale siempre del helper compartido, sin ternarios de estado remanentes en el JSX.

## 9. Fixes descubiertos al probar

- [x] 9.1 **Etiqueta de origen ambigua:** las tres presentaciones de `esEmisionPropia` habían quedado divergentes ("Para Cliente"/"Propios" en `Cheques.jsx`, "Propio"/"Tercero" en `Finanzas.jsx`, con colores distintos entre sí) y no comunicaban la dirección real del cheque. Agregado `describirOrigenCheque(cheque)` a `chequeDisplay.js` con etiqueta explícita ("Emitido a cliente" / "Recibido de cliente", coherente con la redacción de `NuevoChequeModal`) y aplicado en los 4 puntos (card + tabla de `Cheques.jsx`, card + tabla de `Finanzas.jsx`).
- [x] 9.2 **Confirmación faltante en transición a `COBRADO`:** `ChequeEstadoModal.jsx` solo pedía `askConfirm` al pasar a `RECHAZADO` o `ENTREGADO`, pero `COBRADO` también deja el cheque bloqueado (`editable` es `false` para los tres estados) y era irreversible sin aviso. Agregada la misma confirmación `askConfirm` para la transición a `COBRADO`, con mensaje que usa la etiqueta correcta según `esEmisionPropia` (`DEBITADO` vs `COBRADO`).
