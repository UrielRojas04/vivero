# cheques-reversa Specification

## Purpose
TBD - created by archiving change us-021-reversa-cheques. Update Purpose after archive.
## Requirements
### Requirement: Reversa automática de cuenta corriente por cheque rechazado
The system SHALL revert the account balance modification that was applied when a cheque was created, if its state is changed to RECHAZADO.

#### Scenario: Cheque de tercero es rechazado
- **WHEN** user changes the state of a third-party cheque (`esEmisionPropia = false`) to `RECHAZADO`
- **THEN** the system MUST increase the debt (or reduce the favorable balance) of the associated client by the cheque's amount.

#### Scenario: Cheque propio es rechazado
- **WHEN** user changes the state of an own-issued cheque (`esEmisionPropia = true`) to `RECHAZADO`
- **THEN** the system MUST decrease the debt (or increase the favorable balance) of the associated client by the cheque's amount.

