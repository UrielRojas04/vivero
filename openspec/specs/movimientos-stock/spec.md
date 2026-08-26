## MODIFIED Requirements

### Requirement: Historial Inmutable de Movimientos de Stock
The system SHALL log any stock change (in, out, sale, adjustment) into `MovimientoStock`, persisting the unit cost calculation frozen at the exact time of the operation, computed with the canonical cost formula defined by the `costeo-productos` capability.

The **base cost** used in that calculation SHALL depend on the origin of the movement:

- When the movement originates from confirming the arrival of a **supplier order**, the base cost SHALL be the unit cost agreed on that order's line item — the price the supplier actually charged for that purchase — and SHALL NOT be derived from the product's currently configured cost.
- For every other inbound movement, the base cost SHALL keep being derived from the product's currently configured cost, exactly as before.

In both cases the product's discounts, VAT percentage and shipping percentage SHALL be applied the same way, in the order the canonical formula prescribes.

Every inbound movement SHALL persist enough of the calculation to remain reconstructable after the product's configuration changes: the base cost, the **net amount after all discounts**, the **effective combined discount percentage**, a **readable snapshot of the individual discounts applied** (each one's name and percentage), the **VAT percentage**, the **shipping percentage** and the resulting **unit cost**.

The cost frozen on an **outbound** movement SHALL depend on whether the product's business unit has layer-based costing enabled:

- When layer-based costing is **enabled**, the outbound movement SHALL freeze the cost breakdown of the product's **reference layer** — the active layer with the highest unit cost, as defined by the `costeo-por-capas` capability — evaluated **before** the movement's quantities are deducted. It SHALL NOT derive that cost from the product's most recent inbound movement, and SHALL NOT derive it from the layer or layers whose remaining quantities the movement actually decrements.
- When layer-based costing is **disabled**, the outbound movement SHALL keep copying the cost breakdown of the product's most recent inbound movement, exactly as before.

A stock reduction SHALL produce **exactly one** outbound movement, for its full quantity, regardless of how many cost layers its units are deducted from. The system SHALL NOT split an outbound movement for cost accounting reasons.

A movement SHALL remain immutable once recorded: the system SHALL NOT rewrite the quantity, the cost breakdown or the timestamp of an already recorded movement. Introducing layer-based costing SHALL NOT change that: the remaining-units bookkeeping of a cost layer SHALL live outside the movement log, and consuming a layer SHALL NOT write on the movement that originated it.

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

#### Scenario: Egreso en una unidad con costeo por capas habilitado
- **WHEN** a stock reduction is registered for a product of a business unit with layer-based costing enabled, whose most expensive active layer holds a unit cost of `25987.50`
- **THEN** the resulting outbound movement freezes that layer's cost breakdown, even if a cheaper and older layer exists and even if the units are actually deducted from that cheaper layer

#### Scenario: Un egreso que abarca más de una capa sigue siendo un solo movimiento
- **WHEN** a stock reduction of `6` units is registered for a product whose oldest layer holds `5` remaining units at `22822.80` and whose next layer holds `2` at `15561.00`
- **THEN** the system records exactly one outbound movement of `6` units, frozen at a unit cost of `22822.80` — the highest among the active layers — and no movement is split per layer

#### Scenario: El costo del egreso se evalúa antes de descontar
- **WHEN** a stock reduction consumes every remaining unit of the product's reference layer
- **THEN** the movement freezes that reference layer's cost, and only subsequent movements reflect the lower reference cost that results

#### Scenario: El log de movimientos no se reescribe al consumir capas
- **WHEN** cost layers of a product are consumed by successive outbound movements
- **THEN** the inbound movements that originated those layers keep their quantity, cost breakdown and timestamp exactly as recorded, and no update is written on them

#### Scenario: Egreso en una unidad sin costeo por capas
- **WHEN** a stock reduction is registered for a product of a business unit with layer-based costing disabled
- **THEN** the resulting outbound movement copies the cost breakdown of the product's most recent inbound movement, exactly as before, and a single movement is recorded

### Requirement: Movimiento por Cambio en la Configuración de Costo
The system SHALL register a new stock movement when a product is edited and any component of its cost changes — its base cost, its list of discounts (an added, removed or modified discount), its own VAT percentage or its own shipping percentage — so that the change is recorded and the newly configured cost applies to the product's **next purchase**.

That movement SHALL carry the full frozen cost breakdown computed with the new configuration, exactly as any other movement does.

When such an edit does not move a single unit of stock, the resulting movement SHALL have a quantity of zero and, in a business unit with layer-based costing enabled, SHALL NOT create a cost layer and SHALL NOT alter the remaining quantity or the unit cost of any existing layer. As a direct consequence, the product's reference cost SHALL NOT change while it still has active layers: a cost configuration change SHALL NOT retroactively restate the cost of merchandise already purchased.

In a business unit with layer-based costing **disabled**, such a movement SHALL keep updating the product's historical unit cost exactly as before.

#### Scenario: Editar sólo el IVA de un producto genera movimiento
- **WHEN** a user edits a product changing only its own VAT percentage and saves
- **THEN** the system registers a new stock movement whose frozen unit cost reflects the new VAT percentage

#### Scenario: Agregar un descuento genera movimiento
- **WHEN** a user edits a product adding a second discount and saves
- **THEN** the system registers a new stock movement whose frozen unit cost reflects both discounts applied in cascade

#### Scenario: Modificar el porcentaje de un descuento existente genera movimiento
- **WHEN** a user edits a product changing the percentage of an existing discount without adding or removing any, and saves
- **THEN** the system registers a new stock movement whose frozen unit cost reflects the changed percentage

#### Scenario: Guardar sin cambios de costo no genera movimiento
- **WHEN** a user edits a product changing only its description and saves
- **THEN** no new stock movement is registered

#### Scenario: Un cambio de configuración no reescribe el costo del stock existente
- **WHEN** a product of a business unit with layer-based costing enabled has active layers whose highest unit cost is `25987.50` and a user edits its VAT percentage without changing its stock
- **THEN** the movement is registered with the new configuration, no layer is created or altered, and the product's reference cost remains `25987.50`

#### Scenario: El cambio de configuración sí afecta la próxima compra
- **WHEN** a product's VAT percentage is changed and afterwards a new inbound shipment of that product is registered
- **THEN** the layer created by that inbound shipment freezes a unit cost computed with the new VAT percentage

#### Scenario: En una unidad sin costeo por capas el costo histórico se sigue actualizando
- **WHEN** a user edits the cost configuration of a product of a business unit with layer-based costing disabled and saves
- **THEN** the product's historical unit cost is updated to reflect the new configuration, exactly as before
