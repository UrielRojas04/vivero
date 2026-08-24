# estados-pago Specification

## Purpose
TBD - created by archiving change estado-pago-cheques. Update Purpose after archive.
## Requirements
### Requirement: Rechazo de Pagos
The system SHALL allow users to mark an existing payment (specifically CHEQUE) as RECHAZADO.

#### Scenario: Rechazar un cheque exitosamente
- **WHEN** the user selects to reject a CHEQUE payment
- **THEN** the system updates the payment state to RECHAZADO

#### Scenario: Visualización de pago rechazado
- **WHEN** a payment has the state RECHAZADO
- **THEN** it is displayed in the invoice UI as "CHEQUE(RECHAZADO)" with a distinct visual indicator

