## Why

El sistema necesita manejar múltiples "negocios" o sucursales físicas/lógicas de forma independiente (ej: Vivero vs Sustratos y Perlitas) pero dentro de un mismo sistema central. Un usuario (empleado) puede trabajar en un negocio (ej: Vivero) con el rol de EMPLEADO, pero no tener acceso (o tener otro rol) en el otro negocio. El Jefe tiene acceso a todos. Para esto, necesitamos implementar un concepto de Multi-Tenancy lógico a nivel de base de datos.

## What Changes

- Crear la entidad `UnidadNegocio` (id, nombre, etc).
- Modificar el modelo de permisos: La relación ya no es simplemente `Usuario` -> `Rol`. Ahora debe ser `Usuario` + `UnidadNegocio` -> `Rol`.
- Esto requiere refactorizar el esquema actual para introducir una entidad asociativa `UsuarioUnidadRol` (o similar) que mapee qué rol tiene un usuario en una unidad de negocio específica.
- Modificar el `JwtFilter` o la lógica de login para que, al iniciar sesión, el usuario seleccione a qué `UnidadNegocio` está ingresando, y el Token JWT generado incluya el ID del tenant y cargue solo las autoridades correspondientes a esa unidad.

## Capabilities

### New Capabilities
- `multi-tenancy`: Capacidad de separar la información y los accesos por unidad de negocio.

### Modified Capabilities
- `user-rbac`: Refactorización de la relación muchos a muchos para incluir la unidad de negocio como discriminador.
- `jwt-authentication`: Modificado para incluir el claim del `tenant_id` o `unidad_negocio_id` en el payload.

## Impact

- Impacto ALTO en la base de datos (migración de esquema, cambia la relación base de seguridad).
- Impacto ALTO en los endpoints futuros, ya que la mayoría deberá filtrar los datos por la `UnidadNegocio` actual obtenida del contexto de seguridad.
