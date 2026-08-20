## MODIFIED Requirements

### Requirement: Historial Inmutable de Movimientos de Stock
The system SHALL log any stock change (in, out, sale, adjustment) into `MovimientoStock`, persisting the unit cost calculation frozen at the exact time of the operation, computed with the canonical cost formula defined by the `costeo-productos` capability.

The **base cost** used in that calculation SHALL depend on the origin of the movement:

- When the movement originates from confirming the arrival of a **supplier order**, the base cost SHALL be the unit cost agreed on that order's line item — the price the supplier actually charged for that purchase — and SHALL NOT be derived from the product's currently configured cost.
- For every other inbound movement, the base cost SHALL keep being derived from the product's currently configured cost, exactly as before.

In both cases the product's discounts, VAT percentage and shipping percentage SHALL be applied the same way, in the order the canonical formula prescribes.

Every inbound movement SHALL persist enough of the calculation to remain reconstructable after the product's configuration changes: the base cost, the **net amount after all discounts**, the **effective combined discount percentage**, a **readable snapshot of the individual discounts applied** (each one's name and percentage), the **VAT percentage**, the **shipping percentage** and the resulting **unit cost**.

Movements recorded before these components existed SHALL be left untouched, with the components that did not exist at that time left unset.

#### Scenario: Ingreso de Mercadería
- **WHEN** a user registers an inbound shipment of items
- **THEN** the system creates a `MovimientoStock` of type `INGRESO`, increasing the product's stock and saving the exact unit cost calculated using the product's current cost configuration, which will not change retrospectively.

#### Scenario: Ingreso originado en un pedido a proveedor
- **WHEN** the arrival of a supplier order is confirmed and a line item had an agreed unit cost different from the product's currently configured cost
- **THEN** the resulting `MovimientoStock` of type `INGRESO` freezes its unit cost from the agreed cost of that line item, with the product's discounts, VAT and shipping applied on top of it, and the product's configured cost is left unchanged.

#### Scenario: Ingreso sin pedido asociado
- **WHEN** an inbound movement is registered without any supplier order behind it
- **THEN** the system computes and freezes the unit cost from the product's currently configured cost, with exactly the same result as before supplier orders existed.

#### Scenario: Desglose congelado de un ingreso con varios descuentos
- **WHEN** an inbound movement is registered for a product that has two discounts, a VAT percentage and a shipping percentage configured
- **THEN** the movement persists the base cost, the net after both discounts, the effective combined discount percentage, a readable snapshot naming both discounts with their percentages, the VAT percentage, the shipping percentage and the final unit cost

#### Scenario: El desglose sobrevive a un cambio posterior de configuración
- **WHEN** an inbound movement has been recorded and afterwards the product's discounts, VAT or shipping are changed
- **THEN** the values frozen on that movement remain exactly as they were recorded and still describe how its unit cost was obtained

#### Scenario: Movimientos anteriores a la incorporación del IVA
- **WHEN** the new cost components are introduced into the system
- **THEN** every previously recorded movement keeps its unit cost unchanged and leaves the new components unset, rather than being recalculated

#### Scenario: Costo histórico del producto tras recibir un pedido
- **WHEN** a supplier order is confirmed and generates an `INGRESO` for a product
- **THEN** the product's historical unit cost reflects the unit cost frozen on that movement, without any additional write on the product itself.

## ADDED Requirements

### Requirement: Movimiento por Cambio en la Configuración de Costo
The system SHALL register a new stock movement when a product is edited and any component of its cost changes — its base cost, its list of discounts (an added, removed or modified discount), its own VAT percentage or its own shipping percentage — so that the product's historical unit cost keeps reflecting its current cost configuration.

#### Scenario: Editar sólo el IVA de un producto genera movimiento
- **WHEN** a user edits a product changing only its own VAT percentage and saves
- **THEN** the system registers a new stock movement whose unit cost reflects the new VAT percentage, and the product's historical unit cost is updated accordingly

#### Scenario: Agregar un descuento genera movimiento
- **WHEN** a user edits a product adding a second discount and saves
- **THEN** the system registers a new stock movement whose unit cost reflects both discounts applied in cascade

#### Scenario: Modificar el porcentaje de un descuento existente genera movimiento
- **WHEN** a user edits a product changing the percentage of an existing discount without adding or removing any, and saves
- **THEN** the system registers a new stock movement whose unit cost reflects the changed percentage

#### Scenario: Guardar sin cambios de costo no genera movimiento
- **WHEN** a user edits a product changing only its description and saves
- **THEN** no new stock movement is registered
