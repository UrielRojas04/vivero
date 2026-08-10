## Context

Actualmente, la autorización en el sistema depende de una tabla puente `UsuarioUnidadRol` que enlaza a un `Usuario` con una `UnidadNegocio` y un `Rol`. Esto genera autoridades JWT atadas a la unidad de negocio (ej. `VIVERO_ADMIN_DB`). El cliente solicitó simplificar esto porque la separación rígida por unidad de negocio no refleja la realidad operativa, donde un empleado puede vender o administrar productos de distintas unidades simultáneamente, y el RBAC debería basarse exclusivamente en roles y permisos.

## Goals / Non-Goals

**Goals:**
- Simplificar el esquema de la base de datos eliminando `UsuarioUnidadRol`.
- Desvincular la seguridad (`@PreAuthorize`, authorities) del concepto de `UnidadNegocio`.
- Facilitar la gestión de roles en el frontend (Admin Panel) asignando roles directamente a usuarios.

**Non-Goals:**
- No se eliminará la entidad `UnidadNegocio` del sistema, ya que seguirá existiendo para categorizar `Productos` e `Insumos`.
- No se alterará el mecanismo base de autenticación por JWT ni el `CustomUserDetailsService` más allá de cómo recolecta las authorities.

## Decisions

- **Direct User-Role Association**: Se creará una relación ManyToMany directa entre `Usuario` y `Rol`, creando la tabla de unión `usuario_rol`. Esto elimina la complejidad de tener que mapear cada rol a una unidad de negocio específica para un usuario.
- **Authority Format**: `Usuario.getAuthorities()` ahora retornará el nombre puro del permiso (ej. `ADMIN_DB`), ya que no hay una unidad de negocio de la cual derivar un prefijo. Esto simplifica las anotaciones `@PreAuthorize("hasAnyAuthority('ADMIN_DB')")` a lo largo de todo el backend.
- **DataInitializer Pivot**: `DataInitializer` creará roles puros y los asignará directamente al `jefe@vivero.com`, prescindiendo completamente de los Sets de `UsuarioUnidadRol`.

## Risks / Trade-offs

- **Risk: Breaking Database Schema** → Al eliminar `UsuarioUnidadRol` y crear `usuario_rol`, se perderán las asignaciones de roles actuales (excepto si Hibernate o el desarrollador hace una migración manual). 
  - **Mitigation**: Dado que el sistema está en desarrollo temprano, confiaremos en `spring.jpa.hibernate.ddl-auto=update` para crear la nueva tabla, y `DataInitializer` se encargará de regenerar los roles del usuario jefe. Los empleados previamente creados deberán volver a recibir sus roles desde el panel.
- **Risk: Old JWT Tokens** → Los tokens emitidos antes del cambio tendrán authorities con formato viejo (ej. `VIVERO_ADMIN_DB`).
  - **Mitigation**: El backend verificará la BD para reconstruir el `SecurityContext` por request de todos modos, así que este impacto es mínimo o requerirá solo un re-login.
