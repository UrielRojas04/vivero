## Why
Actualmente el modal de creación y edición de roles no incluye la sección de permisos correspondientes al módulo de Siembras. Es necesario agregar estos permisos (`LEER_SIEMBRAS`, `ESCRIBIR_SIEMBRAS`, etc.) a la interfaz para que los administradores puedan delegar correctamente el acceso al módulo de Siembras.

## What Changes
- Se agregará una nueva categoría/sección "Siembras" en el listado de permisos del modal de gestión de roles.
- Se incluirán los permisos específicos (ej. `LEER_SIEMBRAS`, `ESCRIBIR_SIEMBRAS`, `ADMIN_SIEMBRAS`) dentro de la nueva categoría para permitir su selección.
- Se mapearán correctamente estos permisos hacia el backend en el payload de creación/edición del rol.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `user-rbac`: Se actualiza la interfaz de gestión de roles para incluir permisos de Siembras en la grilla de selección.

## Impact
- **Frontend**: `frontend/src/pages/Configuracion.jsx` (o donde viva el modal `RolModal`), componentes de gestión de RBAC.
- **Backend**: Solo si los permisos no existen aún en los enums o base de datos.
