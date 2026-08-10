## MODIFIED Requirements

### Requirement: Entidades de Cuentas Corrientes
El sistema MUST definir las entidades para el manejo de saldos de clientes (dinero y bandejas). Estas entidades MUST estar asociadas 1:1 de forma global a cada `Cliente`. El balance físico (`CuentaCorrienteBandejas.balanceBandejas`) SHALL ser derivado automáticamente a partir de los registros de `HistorialBandejas`.

#### Scenario: Relación 1:1 con el Cliente
- **WHEN** el backend inicializa y mapea el modelo de datos
- **THEN** un `Cliente` está vinculado de manera LAZY a una `CuentaCorrienteDinero` y a una `CuentaCorrienteBandejas`.

#### Scenario: Actualización de balance de bandejas
- **WHEN** se asienta una ENTREGA o DEVOLUCION en `HistorialBandejas`
- **THEN** la `CuentaCorrienteBandejas` se actualiza de forma atómica sumando o restando la cantidad al balance total.
