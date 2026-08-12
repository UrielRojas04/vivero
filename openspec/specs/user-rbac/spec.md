## Purpose
Definir el modelo de autorización basado en roles y permisos planos (RBAC) para usuarios, y las reglas de presentación y protección de rutas en la UI del frontend según los permisos del usuario autenticado.
## Requirements
### Requirement: Permisos de Insumos
El sistema MUST requerir permisos explícitos generados a partir de la Unidad de Negocio a la que pertenece el insumo para permitir su gestión.

#### Scenario: Autorización Dinámica de Escritura
- **WHEN** un usuario intenta modificar o crear un insumo asociado a la unidad de negocio "Herramientas"
- **THEN** el sistema verifica que el usuario en sesión contenga la autoridad dinámica `HERRAMIENTAS_ESCRIBIR_STOCK`

#### Scenario: Rechazo por Autoridad Inválida
- **WHEN** un usuario intenta modificar un insumo de "Sustratos y perlas" pero solo tiene permisos en "Vivero" y "Herramientas"
- **THEN** el sistema rechaza la petición HTTP con un estado 403 Forbidden

### Requirement: Autenticación de UI Global
El frontend MUST enviar las credenciales (username y password) al backend y, de ser exitoso, almacenar el JWT que contiene las autoridades unificadas. No debe requerirse la selección de Unidad de Negocio.

#### Scenario: Login Exitoso
- **WHEN** un usuario ingresa credenciales válidas en la UI y presiona Login
- **THEN** la UI recibe un JWT, lo guarda en el store global (Zustand), y redirige al Dashboard

#### Scenario: Login Fallido
- **WHEN** un usuario ingresa credenciales inválidas
- **THEN** la UI muestra un mensaje de error y no modifica la sesión global

### Requirement: Authorization Model is Independent of Business Units (us-012-flat-rbac)
The system SHALL evaluate user permissions globally (via Roles), but the system SHALL ALSO evaluate the user's access to a specific `UnidadNegocio`. A user can only act within a `UnidadNegocio` if they are explicitly linked to it via the many-to-many relationship `usuario_unidad_negocio`.

#### Scenario: User performs action in any business unit
- **WHEN** a user attempts an action (e.g. creating a product) within a specific `UnidadNegocio`
- **THEN** the system checks if the user's role contains the required permission (e.g. `ESCRIBIR_STOCK`), AND checks if the user has access to that `UnidadNegocio`.

### Requirement: User Role Assignment (us-012-flat-rbac)
The system SHALL allow assigning one or multiple roles to a user directly, without specifying a business unit context.

#### Scenario: Admin assigns role to a user
- **WHEN** an Admin submits the form to create or edit a user
- **THEN** they select the role(s) to assign, and the system saves the relationship directly between the user and the role(s)

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

### Requirement: Login Response Context
El sistema SHALL devolver en el response del login (junto con el token y permisos) la lista de `UnidadNegocio` a las que el usuario tiene acceso, para poblar el selector del frontend.

#### Scenario: Login Exitoso con Múltiples Negocios
- **WHEN** un usuario hace login exitoso
- **THEN** la UI recibe el JWT y un array `negociosDisponibles` (ej. Vivero y Herramientas), y redirige al Dashboard.
