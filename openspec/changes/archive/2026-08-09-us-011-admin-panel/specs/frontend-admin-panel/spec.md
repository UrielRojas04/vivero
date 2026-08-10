## ADDED Requirements

### Requirement: Panel de Administración de Usuarios
El frontend MUST incluir una pantalla en `/admin/usuarios` protegida para que solo administradores puedan verla y operar. Debe mostrar los empleados y permitir gestionar sus accesos.

#### Scenario: Visualización de listado
- **WHEN** un administrador entra a `/admin/usuarios`
- **THEN** se renderiza una tabla con la lista de usuarios y los roles que tienen asignados.

#### Scenario: Asignación de Roles por Unidad
- **WHEN** el administrador edita un usuario
- **THEN** se abre un modal que muestra un dropdown para elegir el rol del usuario en cada una de las Unidades de Negocio activas, y al guardar se envía un `PUT` consolidado con la asignación deseada.

### Requirement: Pestaña de Roles
El frontend MUST incluir una pestaña "Roles" dentro de `/admin/usuarios` para gestionar los roles del sistema.

#### Scenario: Visualización de Roles y Permisos
- **WHEN** el administrador navega a la pestaña de Roles
- **THEN** se renderiza una tabla con la lista de roles (excluyendo JEFE) y los permisos asociados a cada uno.

#### Scenario: Creación/Edición de Roles
- **WHEN** el administrador crea o edita un rol
- **THEN** se abre un modal con el nombre del rol y un grid de checkboxes para los Permisos disponibles. Al guardar, se consolida la lista de permisos y se envía a la API.
