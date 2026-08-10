## ADDED Requirements

### Requirement: Afectación de Stock Actual
El sistema SHALL actualizar el campo `stockActual` del producto de manera transaccional al realizar una venta.

#### Scenario: Venta confirmada
- **WHEN** se descuentan 5 unidades de un producto en una venta
- **THEN** el `stockActual` del producto disminuye en 5 de forma atómica junto a la creación del MovimientoStock.
