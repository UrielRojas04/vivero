## ADDED Requirements

### Requirement: Soporte para motivo de devolución en movimientos de stock
El sistema MUST registrar un movimiento de ingreso en el stock cuando se procesa una devolución de bandejas llenas.

#### Scenario: Registro de movimiento por devolución
- **WHEN** se efectúa una devolución de bandejas llenas
- **THEN** se crea un `MovimientoStock` de tipo INGRESO con el motivo `DEVOLUCION_SOBRANTE` (o similar) asociado al producto y cantidad correspondiente
