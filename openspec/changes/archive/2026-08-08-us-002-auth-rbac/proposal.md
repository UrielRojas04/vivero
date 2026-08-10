## Why

El sistema necesita soportar múltiples niveles de acceso (ej: Jefe, Empleado Vivero, Empleado Sustratos). Ya tenemos la base de JWT, pero ahora necesitamos modelar las entidades de seguridad en la base de datos PostgreSQL para poder implementar Autorización Basada en Roles (RBAC) real y persistente.

## What Changes

- Creación de las entidades JPA: `Usuario`, `Rol`, y `Permiso`.
- Establecimiento de relaciones Many-To-Many (Usuario-Rol, Rol-Permiso).
- Creación de los repositorios JPA para estas entidades.
- Actualización de `CustomUserDetailsService` para mapear los roles y permisos de la base de datos a `GrantedAuthority` de Spring Security.
- Generación del script de inicialización (`data.sql` o migraciones) para crear un usuario Administrador por defecto.

## Capabilities

### New Capabilities
- `user-rbac`: Modelo de datos para autorización y roles de usuario.

### Modified Capabilities
- `jwt-authentication`: Modificado para incluir los roles/autoridades extraídos de la base de datos durante la autenticación.

## Impact

- Impacta la capa de persistencia (PostgreSQL). Hibernate generará las nuevas tablas relacionales.
- Habilita el uso de anotaciones como `@PreAuthorize("hasRole('ADMIN')")` en los endpoints futuros.
