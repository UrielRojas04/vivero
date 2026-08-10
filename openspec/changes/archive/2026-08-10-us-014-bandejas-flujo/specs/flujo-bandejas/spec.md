## ADDED Requirements

### Requirement: Registro de Historial de Bandejas
El sistema SHALL permitir asentar movimientos físicos de bandejas (entregas y devoluciones) vinculados a un cliente.

#### Scenario: Devolución independiente
- **WHEN** el usuario registra una devolución de bandejas a un cliente
- **THEN** el sistema asienta un registro de `DEVOLUCION` en el historial con la cantidad especificada.

### Requirement: Auditoría de movimientos
Cada movimiento en el historial de bandejas SHALL registrar la fecha, cantidad, tipo (ENTREGA/DEVOLUCION) y el usuario que realizó la operación.

#### Scenario: Trazabilidad
- **WHEN** se consulta el historial de bandejas de un cliente
- **THEN** el sistema devuelve una lista ordenada cronológicamente de los movimientos, permitiendo al encargado auditar la deuda.
