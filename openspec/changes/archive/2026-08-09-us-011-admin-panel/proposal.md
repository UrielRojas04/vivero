## Why

Actualmente el sistema cuenta con entidades de seguridad (`Usuario`, `Rol`, `Permiso`) y el login funciona basado en los datos sembrados en la base de datos (seeder). Sin embargo, no existe una forma para que el administrador (Jefe) gestione a los empleados, cambie contraseñas, o asigne qué permisos y roles tiene cada empleado en cada `UnidadNegocio`. Necesitamos un panel de administración para autogestionar el control de acceso (User Management System).

## What Changes

- Crear endpoints (Backend) para realizar CRUD de `Usuario`, CRUD de `Rol` y lectura de `Permiso`.
- Crear lógica para asignar un `Rol` a un `Usuario` dentro del contexto de una `UnidadNegocio`, y asignar `Permisos` a un `Rol`.
- Desarrollar la pantalla de Administración en el Frontend (protegida para administradores) con pestañas para gestionar Usuarios y Roles.
- Filtrar el rol "JEFE" para que no pueda ser asignado ni editado por nadie, dado que es único y preestablecido.

## Capabilities

### New Capabilities
- `backend-admin-panel`: Endpoints REST para la administración de usuarios, creación/edición de roles, y listado de permisos.
- `frontend-admin-panel`: Pantallas de UI (tabs) y modales de gestión para listar y editar usuarios y roles.

### Modified Capabilities
- `user-rbac`: Se formaliza que los roles y asignaciones ahora pueden mutar dinámicamente mediante la API.

## Impact

- Impacta a los administradores del sistema.
- Se agregarán nuevos Controllers y Services en el backend.
- Se agregará una nueva ruta `/admin/usuarios` en el frontend.
