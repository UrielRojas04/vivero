## Why

La implementación core de ventas (`us-013-ventas-core`) resuelve el descuento de stock físico, pero en el mundo real de un vivero las transacciones rara vez son al contado exacto. Los clientes pagan parcialmente, dejan señas, pagan con cheques a 30 días, o reciben descuentos manuales (ej. cliente mayorista). Es necesario expandir la venta para registrar sus pagos asociados y reflejar los saldos deudores o acreedores en la Cuenta Corriente de Dinero.

## What Changes

- Creación de la entidad `Pago` asociada a una `Venta`.
- Actualización de `Venta` para registrar `descuento`, `totalFinal` (subtotal - descuento) y estado de pago.
- Integración en la pantalla de Nueva Venta de opciones para aplicar descuentos y registrar pagos (efectivo, cheque, transferencia).
- Asentamiento automático de deudas (pago < total) o saldos a favor (pago > total) en la `CuentaCorrienteDinero` del cliente.

## Capabilities

### New Capabilities
- `ventas-pagos`: Lógica transaccional de pagos, métodos de pago, y aplicación de descuentos sobre el subtotal de la venta.

### Modified Capabilities
- `ventas-core`: Se extiende la entidad Venta para soportar totales dinámicos (descuentos) y estado de liquidación.
- `backend-cuentas-ctes`: Se modifica para escuchar o asentar automáticamente los movimientos de dinero generados por diferencias en el pago de una venta.
- `frontend-core`: (Opcional) UI para el selector de pagos y descuentos en el POS.

## Impact

- **Backend**: Models (`Venta`, `Pago`, `CuentaCorrienteDinero`), Repositories, y el `@Transactional` de `VentaService` crecerá en complejidad.
- **Frontend**: La pantalla `NuevaVenta.jsx` requiere refactorización para agregar el modal/sección de pago antes de confirmar.
- **BD**: Nuevas tablas o columnas (`pagos`, `venta.descuento`).
