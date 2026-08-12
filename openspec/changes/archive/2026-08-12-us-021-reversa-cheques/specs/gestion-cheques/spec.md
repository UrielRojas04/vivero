## ADDED Requirements

### Requirement: Bloqueo de estado post-rechazo
The system SHALL prevent state transitions originating from the `RECHAZADO` state.

#### Scenario: User views a rejected cheque
- **WHEN** a cheque is in the `RECHAZADO` state
- **THEN** the system MUST disable or hide the state transition actions in the user interface.
