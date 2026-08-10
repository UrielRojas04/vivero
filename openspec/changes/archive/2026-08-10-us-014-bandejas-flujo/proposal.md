## Why

El sistema necesita realizar el seguimiento de las bandejas físicas entregadas a los clientes y sus posteriores devoluciones. Las bandejas representan un activo importante del vivero y es crítico contabilizar su deuda en la cuenta corriente de bandejas del cliente para evitar pérdidas económicas.

## What Changes

- Creación de un flujo para registrar entregas de bandejas (al momento de la venta o por separado).
- Creación de un flujo para registrar devoluciones de bandejas por parte del cliente.
- Actualización automática del `balanceBandejas` en `CuentaCorrienteBandejas` basado en estas operaciones.
- Creación de la entidad `HistorialBandejas` para auditar todos los movimientos físicos (ENTREGA, DEVOLUCION).

## Capabilities

### New Capabilities
- `flujo-bandejas`: Gestión del ciclo de vida de bandejas físicas (entregas y devoluciones), impactando en la cuenta corriente de bandejas del cliente y manteniendo un historial auditable.

### Modified Capabilities
- `backend-cuentas-ctes`: Modificación para soportar el impacto de la lógica de bandejas en `CuentaCorrienteBandejas`.
- `ventas-core`: Modificación para permitir opcionalmente indicar la cantidad de bandejas entregadas durante una Venta y generar el registro en el historial.

## Impact

- **Backend**: Nueva entidad `HistorialBandejas`, nuevos endpoints en `BandejasController`, modificaciones en `VentaServiceImpl` para soportar entregas de bandejas en la venta.
- **Frontend**: Nuevo flujo o modal para devoluciones en la vista de cliente, y un campo en `NuevaVenta.jsx` para "Bandejas entregadas".
- **Database**: Tabla `historial_bandejas` y relaciones con `Venta` y `Cliente`.
