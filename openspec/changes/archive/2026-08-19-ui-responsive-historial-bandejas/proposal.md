## Why

El modal de Historial de Bandejas (`HistorialBandejasModal.jsx`) ya adoptó el shell fullscreen mobile de la Etapa 4, pero quedó con dos defectos de presentación que el usuario reporta desde el uso real:

1. **En escritorio se ve chico.** El panel está acotado a `max-w-2xl` (672px) para una tabla de 5 columnas que incluye fecha con hora completa, tipo, cantidad, detalle y usuario. El contenido queda comprimido y sobra espacio de pantalla sin usar.
2. **En celular obliga a scroll horizontal.** La tabla interna declara `min-w-[560px]` dentro de un `overflow-x-auto`: en un viewport de 320-390px el usuario tiene que arrastrar lateralmente para ver la columna de usuario. Es exactamente el anti-patrón que las etapas responsive anteriores (`ui-responsive-clientes`, `ui-responsive-finanzas`) ya eliminaron del resto de la app, y es el último listado tabular del módulo de bandejas que lo conserva.

El patrón de reemplazo ya está canonizado en el repo (tarjetas `md:hidden` + tabla `hidden md:block`). Este change lo aplica al único listado que quedó afuera y corrige el ancho de escritorio, sin tocar lógica de negocio ni backend.

## What Changes

- **Ancho del modal en escritorio**: el panel pasa de `max-w-2xl` a `max-w-4xl`, manteniendo intacto el comportamiento fullscreen en mobile (`w-full h-full` + `rounded-none`, con restauración por prefijo `sm:`).
- **Vista de tarjetas en mobile**: se agrega un listado de tarjetas apiladas (`grid grid-cols-1 gap-3 md:hidden`) que reemplaza a la tabla por debajo de 768px. Cada tarjeta prioriza **tipo de movimiento** y **cantidad** como datos de mayor jerarquía, y baja fecha, detalle (venta asociada o devolución directa) y usuario a datos secundarios.
- **Tabla acotada a escritorio**: la `<table>` actual se envuelve en `hidden md:block`; se elimina el `min-w-[560px]` y el `overflow-x-auto` que lo acompañaba, porque a >=768px las 5 columnas entran sin comprimirse en un panel de `max-w-4xl`.
- **Sin duplicación de fuente de verdad**: tarjetas y tabla se alimentan del mismo `historial.map`, y el mapeo `tipo -> etiqueta/color` (hoy un ternario inline `ENTREGA` naranja / resto esmeralda) se extrae a un helper puro compartido por ambas vistas, para no duplicarlo al crear la tarjeta.
- **Estados de carga y vacío**: se conservan tal cual (spinner centrado y mensaje "No hay movimientos registrados para este cliente"), ya son agnósticos al viewport.
- Sin cambios de contrato: `HistorialBandejasDTO` y el endpoint `GET /clientes/{id}/bandejas/historial` quedan intactos.

## Capabilities

### New Capabilities

Ninguna. Este change no introduce capacidades nuevas.

### Modified Capabilities

- `ui-responsive`: el requisito **Layout Responsive** hoy declara para mobile que "las tablas de datos (ej. catálogos) se vuelven scrollables horizontalmente" y menciona el modal de historial de bandejas solo en cuanto a su shell fullscreen. Se modifica para establecer que el historial de bandejas presenta tarjetas en mobile con la tabla oculta, y que en escritorio conserva la tabla completa con las tarjetas ocultas y un panel de mayor ancho. Se agrega además un requisito nuevo de jerarquía de contenido para la tarjeta de movimiento de bandejas, análogo al ya vigente para la cartera de cheques.

## Impact

**Código afectado (frontend, solo presentación):**

- `frontend/src/components/HistorialBandejasModal.jsx` — ancho del panel, bloque de tarjetas nuevo, tabla envuelta en `hidden md:block`.
- `frontend/src/utils/bandejasDisplay.js` (nuevo) — helper puro `describirTipoMovimiento(tipo)` y `describirDetalleMovimiento(mov)`, siguiendo la convención camelCase de `utils/` ya usada por `chequeDisplay.js` y `saldoDisplay.js`.

**No afectado:**

- Backend completo: `BandejasController`, `BandejasService`, `HistorialBandejasDTO` y el endpoint del historial no se tocan.
- `DevolucionBandejasModal.jsx`, `ConversorBandejas.jsx` y las páginas `Clientes.jsx` / `DevolucionBandejas.jsx` que montan el modal: la interfaz de props (`isOpen`, `onClose`, `cliente`) no cambia, por lo que ambos call sites siguen funcionando sin edición.
- Change activo `bandejas-acceso-limitado`: sus tasks pendientes son de permisos y ruteo, sin solapamiento de archivos con este change salvo `DevolucionBandejas.jsx`, que acá **no se edita**.

**Riesgo:** bajo. Todo el cambio es aditivo con prefijos de breakpoint; el render >=768px queda equivalente al actual salvo por el ancho mayor del panel. Gobernanza: **LOW** (presentación pura, sin lógica de negocio, sin backend, sin permisos).
