# facturacion-cliente Specification

## Purpose
TBD - created by archiving change estado-pago-cheques. Update Purpose after archive.
## Requirements
### Requirement: Filtrado de pagos rechazados
The system SHALL exclude payments with state RECHAZADO from all "Total Abonado" and "Saldo Deudor" calculations.

#### Scenario: Factura con pago rechazado
- **WHEN** calculating the total amount paid (Total Abonado) for a sale or the overall invoice
- **THEN** any payment marked as RECHAZADO must not be summed, and the unpaid balance (Saldo Deudor) must reflect the remaining debt.


### Requirement: Diseño Responsivo en Detalle de Factura
The system SHALL display the client invoice detail interface correctly on mobile screens, adapting tables with internal scroll and rearranging summary cards into vertical stacks or grids.

#### Scenario: Mobile viewport viewing
- **WHEN** the user views the invoice detail page on a screen width smaller than 768px
- **THEN** the summary cards stack vertically or in a 2-column grid, and the tables (sales, payments, concepts) become horizontally scrollable without breaking the parent container's layout.
