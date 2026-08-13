## ADDED Requirements

### Requirement: Historial Inmutable de Movimientos de Stock
The system SHALL log any stock change (in, out, sale, adjustment) into `MovimientoStock`, persisting the unit cost calculation (base + shipping - discount) frozen at the exact time of the operation.

#### Scenario: Ingreso de Mercadería
- **WHEN** a user registers an inbound shipment of items
- **THEN** the system creates a `MovimientoStock` of type `INGRESO`, increasing the product's stock and saving the exact unit cost calculated using current global settings, which will not change retrospectively.

### Requirement: Valoración de Inventario por Costos Históricos
The UI for Finance/Inventory Costs SHALL query the recent `MovimientoStock` to display the actual historical acquisition costs (like average cost or last known inbound cost) rather than computing them dynamically based on today's settings.

#### Scenario: Visualización de Costos Financieros
- **WHEN** a user views the "Costos de Inventario" in the Finanzas tab
- **THEN** the system displays the actual frozen costs recorded from historical stock acquisitions, ensuring financial accuracy.
