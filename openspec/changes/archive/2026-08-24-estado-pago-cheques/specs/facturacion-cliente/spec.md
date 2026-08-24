## ADDED Requirements

### Requirement: Filtrado de pagos rechazados
The system SHALL exclude payments with state RECHAZADO from all "Total Abonado" and "Saldo Deudor" calculations.

#### Scenario: Factura con pago rechazado
- **WHEN** calculating the total amount paid (Total Abonado) for a sale or the overall invoice
- **THEN** any payment marked as RECHAZADO must not be summed, and the unpaid balance (Saldo Deudor) must reflect the remaining debt.
