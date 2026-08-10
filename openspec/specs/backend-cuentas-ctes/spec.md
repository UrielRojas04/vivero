# backend-cuentas-ctes Specification

## Purpose
TBD - created by archiving change us-010-cuentas-ctes. Update Purpose after archive.
## Requirements
### Requirement: Entidades de Cuentas Corrientes
El sistema MUST definir las entidades para el manejo de saldos de clientes (dinero y bandejas). Estas entidades MUST estar asociadas 1:1 de forma global a cada `Cliente`. El balance físico (`CuentaCorrienteBandejas.balanceBandejas`) SHALL ser derivado automáticamente a partir de los registros de `HistorialBandejas`.

#### Scenario: Relación 1:1 con el Cliente
- **WHEN** el backend inicializa y mapea el modelo de datos
- **THEN** un `Cliente` está vinculado de manera LAZY a una `CuentaCorrienteDinero` y a una `CuentaCorrienteBandejas`.

#### Scenario: Actualización de balance de bandejas
- **WHEN** se asienta una ENTREGA o DEVOLUCION en `HistorialBandejas`
- **THEN** la `CuentaCorrienteBandejas` se actualiza de forma atómica sumando o restando la cantidad al balance total.

### Requirement: Exposición de saldos
El backend MUST retornar los saldos (dinero y bandejas) de los clientes cada vez que se listen.

#### Scenario: Saldos en el DTO de Cliente
- **WHEN** un cliente es retornado por el API (`GET /api/clientes` o `GET /api/clientes/{id}`)
- **THEN** el DTO incluye los campos `balancePesos` y `balanceBandejas` con los valores actuales.

### Requirement: Impacto de ventas en Cuenta Corriente de Dinero
El sistema SHALL actualizar el saldo de la `CuentaCorrienteDinero` del cliente de forma automática cuando se procesa una venta cuyo `totalPagado` (suma de pagos) difiere del `totalFinal` de la venta.

#### Scenario: Venta genera deuda
- **WHEN** la suma de los pagos ingresados es menor al totalFinal de la venta
- **THEN** el sistema asienta una deuda por la diferencia exacta en la Cuenta Corriente del cliente.

#### Scenario: Venta genera saldo a favor
- **WHEN** la suma de los pagos ingresados es mayor al totalFinal de la venta
- **THEN** el sistema asienta el excedente como saldo a favor en la Cuenta Corriente del cliente.
