## ADDED Requirements

### Requirement: Section Rendering Based on Roles
The UI SHALL conditionally render main navigation sections (Admin, Productos, Insumos) based on the user's role permissions.

#### Scenario: User lacks permission to view products
- **WHEN** a user with the `LEER_INSUMOS` permission but without `LEER_PRODUCTOS` permission logs in
- **THEN** the navigation menu hides the "Productos" section, and they cannot access its route

#### Scenario: Admin views all sections
- **WHEN** a user with the `ADMIN_DB` permission logs in
- **THEN** the navigation menu shows all sections including "Admin"

### Requirement: Route Protection
The application SHALL protect specific UI routes from unauthorized access, redirecting users if they attempt to bypass the navigation menu via URL.

#### Scenario: Direct access to unauthorized route
- **WHEN** a user navigates directly to `/admin` via URL but does not have `ADMIN_DB`
- **THEN** they are redirected to a default authorized view or shown an "Access Denied" message
