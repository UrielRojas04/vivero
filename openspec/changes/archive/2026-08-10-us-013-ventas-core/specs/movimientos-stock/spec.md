## ADDED Requirements

### Requirement: Movimientos inmutables de stock
El sistema SHALL generar un registro de MovimientoStock automático tras cada venta.

#### Scenario: Venta generada
- **WHEN** se registra una venta nueva
- **THEN** el sistema genera en la misma transacción un MovimientoStock de tipo OUT y motivo "Venta" por cada ítem vendido.
