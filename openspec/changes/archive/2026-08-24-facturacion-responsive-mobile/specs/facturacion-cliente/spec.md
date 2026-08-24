## ADDED Requirements

### Requirement: Diseño Responsivo en Detalle de Factura
The system SHALL display the client invoice detail interface correctly on mobile screens, adapting tables with internal scroll and rearranging summary cards into vertical stacks or grids.

#### Scenario: Mobile viewport viewing
- **WHEN** the user views the invoice detail page on a screen width smaller than 768px
- **THEN** the summary cards stack vertically or in a 2-column grid, and the tables (sales, payments, concepts) become horizontally scrollable without breaking the parent container's layout.
