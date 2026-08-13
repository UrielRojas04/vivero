## ADDED Requirements

### Requirement: Registro Inmutable de Ventas
The system SHALL register sales linking them to a `UnidadNegocio` and an optional `Cliente`, persisting the total cost and total price frozen at the exact moment of sale.

#### Scenario: Realización de Venta Exitosa
- **WHEN** a user finalizes a sale of multiple products
- **THEN** the system generates a `Venta` record and multiple `VentaDetalle` records containing the copied unit price, unit cost, and applied modifiers, preventing future global configuration changes from altering the historical profit calculation.

### Requirement: Impacto en Movimientos
The system SHALL automatically generate a `MovimientoStock` of type `VENTA` for each product sold to decrement inventory properly and record the cost of goods sold.

#### Scenario: Deducción Automática de Inventario
- **WHEN** a sale is finalized successfully
- **THEN** the system reduces the `stock` in `Producto` and logs the corresponding `MovimientoStock` with the frozen outbound cost.
