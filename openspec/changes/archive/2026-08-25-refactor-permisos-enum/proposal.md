## Why
Actualmente el sistema utiliza una entidad JPA (`Permiso`) para almacenar los permisos en la base de datos, los cuales son inicializados desde el `DataInitializer.java`. Como identificó el equipo, depender de un `CommandLineRunner` para inicializar datos críticos (como permisos) es un antipatrón en la fase de producción. Si en algún momento el inicializador falla o se elimina, los entornos nuevos no contarán con los permisos necesarios para funcionar.

## What Changes
- Se eliminará la entidad `Permiso` y su repositorio.
- Los permisos se convertirán en un `Enum` de Java.
- La entidad `Rol` pasará a almacenar los permisos como una colección de elementos (`@ElementCollection` de enums).
- **BREAKING**: El endpoint que devuelve la lista de permisos disponibles (`/api/roles/permisos`) deberá devolver el listado derivado del Enum en lugar de hacer queries a la base de datos.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `user-rbac`: Se cambia el modelo subyacente de persistencia de permisos.

## Impact
- **Backend**: Eliminación de `Permiso.java`, `PermisoRepository.java`. Modificación de `Rol.java`, `RolService.java`, `DataInitializer.java` y `JwtFilter.java`.
- **Base de Datos**: Se elimina la tabla `permiso`. La tabla pivot `rol_permiso` se modifica para guardar el nombre del enum (`String`) en lugar de una FK a la tabla de permisos.
- **Frontend**: Ninguno (la API seguirá respondiendo el mismo formato de `PermisoDTO` generado a partir del Enum, por lo que el frontend no notará la diferencia).
