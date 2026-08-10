## ADDED Requirements

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
The system SHALL evaluate user permissions globally without filtering or scoping by `UnidadNegocio`.

#### Scenario: User performs action in any business unit
- **WHEN** a user attempts an action (e.g. creating a product) anywhere in the application
- **THEN** the system only checks if the user's role contains the required permission (e.g. `ESCRIBIR_STOCK`), ignoring business units completely

### Requirement: User Role Assignment (us-012-flat-rbac)
The system SHALL allow assigning one or multiple roles to a user directly, without specifying a business unit context.

#### Scenario: Admin assigns role to a user
- **WHEN** an Admin submits the form to create or edit a user
- **THEN** they select the role(s) to assign, and the system saves the relationship directly between the user and the role(s)
