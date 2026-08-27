## ADDED Requirements

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

## MODIFIED Requirements

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
