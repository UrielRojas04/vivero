## Why

Actualmente el sistema asume que todos los pagos ingresados están acreditados. En la vida real, los pagos con cheque pueden rebotar. Sin manejo de estados de pago, la única forma de corregir un cheque rechazado es borrar el pago, lo que destruye el historial financiero. Este cambio permite mantener la trazabilidad de los pagos rechazados y reflejarlos correctamente en la deuda del cliente.

## What Changes

- Se agregará un estado a los pagos (`ACREDITADO`, `RECHAZADO`).
- Se creará un endpoint para rechazar pagos.
- La interfaz de usuario permitirá rechazar un pago con método `CHEQUE`.
- Los cálculos de totales y saldo deudor ignorarán los pagos rechazados, volviendo a sumar deuda.
- El detalle visual mostrará los pagos rechazados como `CHEQUE(RECHAZADO)`.

## Capabilities

### New Capabilities
- `estados-pago`: Funcionalidad para gestionar el ciclo de vida o estado de un pago, permitiendo rechazar pagos ingresados.

### Modified Capabilities
- `facturacion-cliente`: Se modifican las reglas de suma del saldo deudor y visualización de pagos para descontar los pagos rechazados.

## Impact

- Entidad `Pago` y su tabla en la base de datos (nueva columna `estado`).
- DTOs de respuesta (`PagoResponseDTO`).
- Lógica de cálculo en `FacturaClienteServiceImpl`.
- Frontend UI en `FacturaCliente.jsx` (cálculo de totales, listado de métodos de pago, botón para rechazar).
