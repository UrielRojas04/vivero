## ADDED Requirements

### Requirement: Authorization Model is Independent of Business Units
The system SHALL evaluate user permissions globally without filtering or scoping by `UnidadNegocio`.

#### Scenario: User performs action in any business unit
- **WHEN** a user attempts an action (e.g. creating a product) anywhere in the application
- **THEN** the system only checks if the user's role contains the required permission (e.g. `ESCRIBIR_STOCK`), ignoring business units completely

### Requirement: User Role Assignment
The system SHALL allow assigning one or multiple roles to a user directly, without specifying a business unit context.

#### Scenario: Admin assigns role to a user
- **WHEN** an Admin submits the form to create or edit a user
- **THEN** they select the role(s) to assign, and the system saves the relationship directly between the user and the role(s)
