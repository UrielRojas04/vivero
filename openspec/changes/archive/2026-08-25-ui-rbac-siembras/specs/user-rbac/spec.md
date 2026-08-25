## ADDED Requirements

### Requirement: Permisos de Siembras en Gestión de Roles
El frontend SHALL mostrar una categoría dedicada a "Siembras" dentro de la grilla de selección de permisos al momento de crear o editar un Rol.

#### Scenario: Visualización y selección de permisos
- **WHEN** el administrador abre el modal para crear o editar un Rol
- **THEN** observa una sección titulada "Siembras"
- **THEN** puede marcar/desmarcar los permisos correspondientes (ej. `LEER_SIEMBRAS`, `ESCRIBIR_SIEMBRAS`, `ADMIN_SIEMBRAS`) y estos se incluyen correctamente en la solicitud enviada al backend.
