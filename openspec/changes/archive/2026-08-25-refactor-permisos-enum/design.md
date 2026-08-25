## Context
Históricamente el sistema utilizaba un DataInitializer para insertar entidades `Permiso` en la base de datos al arrancar el servidor. Esto acopla la existencia de datos estructurales a un runner de inicialización que no es apto para entornos productivos.

## Goals / Non-Goals

**Goals:**
- Desacoplar los permisos de la base de datos convirtiéndolos en un `Enum` nativo de Java (`PermisoEnum`).
- Adaptar la entidad `Rol` para que utilice una `@ElementCollection` basada en strings (el nombre del enum) en lugar de una relación `@ManyToMany` con entidades de permisos.
- Mantener retrocompatibilidad con el frontend a través de los DTOs existentes (el frontend seguirá recibiendo `{ id: 1, nombre: 'LEER_STOCK' }` mapeado a partir del Enum, aunque el `id` ahora será el `ordinal()` o un identificador estático).

**Non-Goals:**
- Modificar el sistema de Roles. Los Roles seguirán siendo entidades en la base de datos.
- Modificar el código de Frontend.

## Decisions
- **`PermisoEnum`**: Se creará un enum conteniendo todos los permisos del sistema (ej. `LEER_STOCK`, `ESCRIBIR_STOCK`, `ADMIN_DB`, etc.).
- **Persistencia en Rol**: Se usará `@ElementCollection(fetch = FetchType.EAGER)` y `@Enumerated(EnumType.STRING)` en la entidad `Rol`. Al usar `EnumType.STRING`, los valores se guardan legibles en la base de datos y resisten reordenamientos del Enum.
- **DTO Backward Compatibility**: Para no romper el frontend, el endpoint `/api/roles/permisos` devolverá los enums mapeados a un objeto `PermisoDTO(Long id, String nombre)`. El `id` será el `ordinal()` del enum y será casteado de Long a Integer según corresponda. Al guardar un rol, se buscarán los enums por su `ordinal()`.

## Risks / Trade-offs
- [Trade-off] Usar el `ordinal()` como ID hacia el frontend significa que no podemos reordenar el enum, sólo agregar valores al final (o reasignar IDs explícitos en el enum). → Mitigación: Agregaremos un atributo `id` explícito en el enum (ej. `LEER_STOCK(1L)`) para asegurar que el ID siempre sea estable sin depender del ordinal.
- [Risk] Error en la migración de la DB (hibernate ddl-auto = update) debido a la eliminación de la tabla `permiso` y el cambio en `rol_permiso`. → Mitigación: El backend usará `ddl-auto: update`, Hibernate creará la tabla nueva `@ElementCollection` (probablemente `rol_permisos`). La tabla pivot antigua quedará huérfana pero no romperá el arranque.

## Migration Plan
1. Crear `PermisoEnum` con IDs estables.
2. Modificar `Rol.java`.
3. Eliminar `Permiso.java` y `PermisoRepository`.
4. Refactorizar `RolService` y `DataInitializer`.
