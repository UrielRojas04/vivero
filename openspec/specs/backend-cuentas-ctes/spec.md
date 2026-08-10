# backend-cuentas-ctes Specification

## Purpose
TBD - created by archiving change us-010-cuentas-ctes. Update Purpose after archive.
## Requirements
### Requirement: Entidades de Cuentas Corrientes
El sistema MUST definir las entidades para el manejo de saldos de clientes (dinero y bandejas).
Estas entidades MUST estar asociadas 1:1 de forma global a cada `Cliente`.

#### Scenario: Relación 1:1 con el Cliente
- **WHEN** el backend inicializa y mapea el modelo de datos
- **THEN** un `Cliente` está vinculado de manera LAZY a una `CuentaCorrienteDinero` y a una `CuentaCorrienteBandejas`.

### Requirement: Exposición de saldos
El backend MUST retornar los saldos (dinero y bandejas) de los clientes cada vez que se listen.

#### Scenario: Saldos en el DTO de Cliente
- **WHEN** un cliente es retornado por el API (`GET /api/clientes` o `GET /api/clientes/{id}`)
- **THEN** el DTO incluye los campos `balancePesos` y `balanceBandejas` con los valores actuales.

