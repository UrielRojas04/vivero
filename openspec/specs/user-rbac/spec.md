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
The application SHALL protect specific UI routes from unauthorized access, redirecting users if they attempt to bypass the navigation menu via URL. Las rutas de Facturación (`/facturas` y `/facturas/:clienteId`) SHALL exigir `LEER_FACTURACION`.

#### Scenario: Direct access to unauthorized route
- **WHEN** a user navigates directly to `/admin` via URL but does not have `ADMIN_DB`
- **THEN** they are redirected to a default authorized view or shown an "Access Denied" message

#### Scenario: Acceso directo a Facturación sin permiso
- **WHEN** un usuario con `ESCRIBIR_VENTAS` y `LEER_CLIENTES` pero sin `LEER_FACTURACION` navega directamente a `/facturas` o a `/facturas/5` por URL
- **THEN** es redirigido al dashboard y no ve el contenido de la sección

#### Scenario: Item de menú oculto sin permiso
- **WHEN** un usuario sin `LEER_FACTURACION` inicia sesión
- **THEN** el item "Facturación" no aparece en el grupo "Ventas" del sidebar, aunque el item "Ventas" sí siga visible si conserva `ESCRIBIR_VENTAS`

### Requirement: Login Response Context
El sistema SHALL devolver en el response del login (junto con el token y permisos) la lista de `UnidadNegocio` a las que el usuario tiene acceso, para poblar el selector del frontend.

#### Scenario: Login Exitoso con Múltiples Negocios
- **WHEN** un usuario hace login exitoso
- **THEN** la UI recibe el JWT y un array `negociosDisponibles` (ej. Vivero y Herramientas), y redirige al Dashboard.

### Requirement: Arquitectura de Persistencia de Permisos
El backend SHALL almacenar los permisos disponibles en memoria como constantes (Enums) y vincularlos a los roles utilizando colecciones de elementos nativos en lugar de entidades separadas.

#### Scenario: Suministro de permisos a la API
- **WHEN** un cliente hace un GET a `/api/roles/permisos`
- **THEN** el sistema devuelve una lista estandarizada de permisos desde el Enum de Java (ej. `[{id: 1, nombre: "LEER_STOCK"}, ...]`) sin consultar una tabla dedicada.

### Requirement: Permisos de Siembras en Gestión de Roles
El frontend SHALL mostrar una categoría dedicada a "Siembras" dentro de la grilla de selección de permisos al momento de crear o editar un Rol.

#### Scenario: Visualización y selección de permisos
- **WHEN** el administrador abre el modal para crear o editar un Rol
- **THEN** observa una sección titulada "Siembras"
- **THEN** puede marcar/desmarcar los permisos correspondientes (ej. `LEER_SIEMBRAS`, `ESCRIBIR_SIEMBRAS`, `ADMIN_SIEMBRAS`) y estos se incluyen correctamente en la solicitud enviada al backend.

### Requirement: Permiso Independiente de Facturación
El sistema SHALL exponer un permiso `LEER_FACTURACION` en `PermisoEnum`, con ID estable `17`, agregado al final del enum sin reordenar los IDs existentes. Este permiso SHALL ser la única llave que habilita la sección Facturación, de forma independiente de `ESCRIBIR_VENTAS`: un rol MUST poder tener `ESCRIBIR_VENTAS` sin `LEER_FACTURACION`, y viceversa.

#### Scenario: El permiso se sirve al frontend
- **WHEN** un cliente autorizado hace `GET /api/roles/permisos`
- **THEN** la respuesta incluye `{ id: 17, nombre: "LEER_FACTURACION" }` junto a los 16 permisos preexistentes, y ninguno de los 16 cambia de ID

#### Scenario: Rol de ventas sin acceso a facturación
- **WHEN** un administrador crea un rol con `ESCRIBIR_VENTAS`, `LEER_STOCK` y `LEER_CLIENTES` pero sin `LEER_FACTURACION`
- **THEN** el rol se guarda correctamente y sus usuarios pueden cargar ventas, pero no pueden acceder a la sección Facturación por ninguna vía (menú, URL directa o API)

#### Scenario: Rol de facturación sin permiso de cargar ventas
- **WHEN** un administrador crea un rol con `LEER_FACTURACION` y `LEER_CLIENTES` pero sin `ESCRIBIR_VENTAS`
- **THEN** el rol se guarda correctamente y sus usuarios pueden ver la sección Facturación y consultar facturas, sin poder cargar ventas nuevas

### Requirement: Sección Facturación en Gestión de Roles
El frontend SHALL mostrar una sección dedicada a "Facturación" dentro del modo "Por Secciones" del modal de crear/editar Rol, en **ambas** unidades de negocio (Vivero y Herramientas), sin filtro condicional por unidad. Al seleccionarla, SHALL incluir en la solicitud al backend los permisos `LEER_FACTURACION` y `LEER_CLIENTES`.

#### Scenario: Visualización en unidad Vivero
- **WHEN** el administrador con unidad activa Vivero abre el modal de Rol en modo "Por Secciones"
- **THEN** observa una sección titulada "Facturación" en la grilla, junto a las secciones existentes

#### Scenario: Visualización en unidad Herramientas
- **WHEN** el administrador con unidad activa Herramientas abre el modal de Rol en modo "Por Secciones"
- **THEN** también observa la sección "Facturación" — la sección no se oculta según la unidad de negocio activa

#### Scenario: Asignación por sección
- **WHEN** el administrador marca la sección "Facturación" y guarda el rol
- **THEN** el rol persistido contiene los permisos `LEER_FACTURACION` y `LEER_CLIENTES`

### Requirement: Siembra de Roles Limitada a JEFE
El inicializador de datos SHALL sembrar únicamente el rol `JEFE`, siempre con el conjunto completo de permisos del enum. El sistema MUST NOT sembrar ni actualizar automáticamente ningún otro rol; todo rol adicional se gestiona manualmente desde el panel de Usuarios (Admin).

#### Scenario: JEFE absorbe permisos nuevos automáticamente
- **WHEN** se agrega un valor nuevo a `PermisoEnum` y el backend arranca
- **THEN** el rol `JEFE` queda con ese permiso incluido, sin intervención manual, tanto si el rol se crea por primera vez como si ya existía

#### Scenario: Roles no sembrados sobreviven al arranque
- **WHEN** el backend arranca y ya existe en la base un rol creado manualmente (o creado por una versión anterior del seed, como `EMPLEADO_VIVERO`)
- **THEN** ese rol y sus asignaciones a usuarios permanecen intactos: el inicializador no los crea, no los actualiza y no los elimina

