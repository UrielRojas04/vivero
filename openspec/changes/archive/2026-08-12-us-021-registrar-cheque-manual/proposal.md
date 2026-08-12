## Why

Actualmente los cheques solo se pueden registrar como parte del flujo de liquidación de una venta. Existe la necesidad operativa de registrar cheques manualmente de forma independiente (por ejemplo: cobros de saldos adeudados, pagos anticipados, o cheques de saldo inicial) desde la sección de Cheques para mantener la cartera sincronizada con la realidad.

## What Changes

- Se agregará un botón "Nuevo Cheque" en la vista de Cheques (`Cheques.jsx`).
- Se creará un modal (`NuevoChequeModal.jsx`) para ingresar los datos obligatorios y opcionales: Cliente, Banco, N° de Serie, Fecha Emisión/Recepción, Fecha Cobro y Monto.
- Se implementará/expondrá el endpoint `POST /api/cheques` en el backend para recibir el payload y persistir el cheque (estado inicial `EN_CARTERA`).
- Al registrar el cheque manualmente asociado a un cliente, el monto de dicho cheque impactará a favor en el saldo (balanceDinero) del cliente, como un pago adelantado o saldo a favor.

## Capabilities

### New Capabilities
- No se introducen nuevas capabilities, es una extensión de gestión de cheques.

### Modified Capabilities
- `gestion-cheques`: Permite el alta manual de cheques directamente en la cartera, afectando la cuenta corriente del cliente si corresponde, independientemente del flujo de ventas.

## Impact

- **Frontend**: Nuevo componente modal para registro, actualización de tabla y query invalidation en `Cheques.jsx`.
- **Backend**: Se agrega o adapta endpoint en `ChequeController` y servicio para manejar el alta y actualizar saldo del cliente.
- **Modelo de datos**: Ningún cambio estructural (la tabla `cheques` ya soporta `venta_id` nulo).
