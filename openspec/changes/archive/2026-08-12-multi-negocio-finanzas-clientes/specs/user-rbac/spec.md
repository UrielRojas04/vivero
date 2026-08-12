## MODIFIED Requirements

### Requirement: Authorization Model is Independent of Business Units (us-012-flat-rbac)
The system SHALL evaluate user permissions globally (via Roles), but the system SHALL ALSO evaluate the user's access to a specific `UnidadNegocio`. A user can only act within a `UnidadNegocio` if they are explicitly linked to it via the many-to-many relationship `usuario_unidad_negocio`.

#### Scenario: User performs action in any business unit
- **WHEN** a user attempts an action (e.g. creating a product) within a specific `UnidadNegocio`
- **THEN** the system checks if the user's role contains the required permission (e.g. `ESCRIBIR_STOCK`), AND checks if the user has access to that `UnidadNegocio`.

## ADDED Requirements

### Requirement: Login Response Context
El sistema SHALL devolver en el response del login (junto con el token y permisos) la lista de `UnidadNegocio` a las que el usuario tiene acceso, para poblar el selector del frontend.

#### Scenario: Login Exitoso con Múltiples Negocios
- **WHEN** un usuario hace login exitoso
- **THEN** la UI recibe el JWT y un array `negociosDisponibles` (ej. Vivero y Herramientas), y redirige al Dashboard.
