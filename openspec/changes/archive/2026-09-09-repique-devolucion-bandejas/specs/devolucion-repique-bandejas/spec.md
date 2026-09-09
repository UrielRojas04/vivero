## ADDED Requirements

### Requirement: Registro de devolución de bandejas llenas
El sistema MUST permitir al usuario registrar la devolución de bandejas llenas (repique/sobrante) por parte de un cliente.

#### Scenario: Cliente devuelve bandejas sobrantes
- **WHEN** el usuario ingresa el cliente, el producto devuelto, la cantidad, el monto a acreditar y confirma la operación
- **THEN** el sistema registra la devolución, incrementa el stock físico del producto, y genera un crédito a favor en la cuenta corriente del cliente
