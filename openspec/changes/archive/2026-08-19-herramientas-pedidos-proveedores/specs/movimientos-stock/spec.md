## MODIFIED Requirements

### Requirement: Historial Inmutable de Movimientos de Stock
The system SHALL log any stock change (in, out, sale, adjustment) into `MovimientoStock`, persisting the unit cost calculation (base + shipping - discount) frozen at the exact time of the operation.

The **base cost** used in that calculation SHALL depend on the origin of the movement:

- When the movement originates from confirming the arrival of a **supplier order**, the base cost SHALL be the unit cost agreed on that order's line item — the price the supplier actually charged for that purchase — and SHALL NOT be derived from the product's currently configured cost.
- For every other inbound movement, the base cost SHALL keep being derived from the product's currently configured cost, exactly as before.

In both cases the discount and shipping percentages SHALL be applied the same way, and the resulting base cost, discount percentage, shipping percentage and final unit cost SHALL all be persisted on the movement.

#### Scenario: Ingreso de Mercadería
- **WHEN** a user registers an inbound shipment of items
- **THEN** the system creates a `MovimientoStock` of type `INGRESO`, increasing the product's stock and saving the exact unit cost calculated using current global settings, which will not change retrospectively.

#### Scenario: Ingreso originado en un pedido a proveedor
- **WHEN** the arrival of a supplier order is confirmed and a line item had an agreed unit cost different from the product's currently configured cost
- **THEN** the resulting `MovimientoStock` of type `INGRESO` freezes its unit cost from the agreed cost of that line item, with the same discount and shipping percentages applied, and the product's configured cost is left unchanged.

#### Scenario: Ingreso sin pedido asociado
- **WHEN** an inbound movement is registered without any supplier order behind it
- **THEN** the system computes and freezes the unit cost from the product's currently configured cost, with exactly the same result as before supplier orders existed.

#### Scenario: Costo histórico del producto tras recibir un pedido
- **WHEN** a supplier order is confirmed and generates an `INGRESO` for a product
- **THEN** the product's historical unit cost reflects the unit cost frozen on that movement, without any additional write on the product itself.
