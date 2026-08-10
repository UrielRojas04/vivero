## ADDED Requirements

### Requirement: Impacto de ventas en Cuenta Corriente de Dinero
El sistema SHALL actualizar el saldo de la `CuentaCorrienteDinero` del cliente de forma automática cuando se procesa una venta cuyo `totalPagado` (suma de pagos) difiere del `totalFinal` de la venta.

#### Scenario: Venta genera deuda
- **WHEN** la suma de los pagos ingresados es menor al totalFinal de la venta
- **THEN** el sistema asienta una deuda por la diferencia exacta en la Cuenta Corriente del cliente.

#### Scenario: Venta genera saldo a favor
- **WHEN** la suma de los pagos ingresados es mayor al totalFinal de la venta
- **THEN** el sistema asienta el excedente como saldo a favor en la Cuenta Corriente del cliente.
