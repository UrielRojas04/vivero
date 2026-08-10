## Context

El sistema tiene implementado un modelo RBAC multi-tenant (`UsuarioUnidadRol`). Las autoridades generadas incluyen el contexto de la unidad (Ej: `VIVERO_VENTAS`). Actualmente, la asignación de roles a empleados se hace directamente en la base de datos (seeder). Para dar autonomía al Jefe, se requiere un panel de administración en la UI que consuma un nuevo conjunto de APIs REST para gestionar usuarios y sus roles por unidad.

## Goals / Non-Goals

**Goals:**
- Proveer endpoints CRUD seguros para `Usuario` y `Rol`, y lectura de `Permiso`.
- Permitir la asignación dinámica de roles a un usuario en una o más unidades de negocio, y la asignación de permisos a roles.
- Crear una interfaz administrativa en el frontend para gestionar estos accesos de forma visual e intuitiva mediante pestañas (Usuarios y Roles).
- El rol especial "JEFE" queda bloqueado (no puede editarse ni asignarse) por cuestiones de integridad.

**Non-Goals:**
- **NO** se implementará la creación de nuevos `Permiso` en tiempo de ejecución. Los permisos (ej: `VENDER`, `EDITAR_STOCK`) son estáticos a nivel código/seeder, ya que los programadores desarrollan features amarradas a ellos.
- **NO** se implementará recuperación de contraseña por email ni 2FA.

## Decisions

1. **DTOs de Transferencia (Evitar exposición de secretos)**:
   - `UsuarioResponseDTO`: Solo contendrá `id`, `username` y `List<UsuarioUnidadRolDTO>`. Nunca incluirá `password`.
   - `UsuarioRequestDTO`: Contendrá `username`, opcionalmente `password` (obligatorio solo en creación), y la lista completa deseada de asignaciones de roles.

2. **Manejo de Asignaciones (UsuarioUnidadRol)**:
   - Al actualizar un usuario (`PUT /api/usuarios/{id}`), el backend recibirá la lista total de roles que debería tener en las distintas unidades.
   - El `UsuarioService` realizará una actualización declarativa: limpiará (`orphanRemoval = true`) las asignaciones existentes de ese usuario y guardará las nuevas. Esto evita lógica compleja de merge (adds/removes parciales) ya que la colección suele ser muy pequeña (1 a 3 items por usuario).

2. **Manejo de Roles y Permisos (Rol y Permiso)**:
   - Se agrega un DTO `RolRequestDTO` que contiene el `nombre` y una lista de `permisoIds`.
   - Se usarán métodos CRUD en `RolController` y `RolService`.
   - Al igual que con los roles del usuario, al actualizar un rol se limpia su colección de permisos y se insertan los nuevos (`orphanRemoval = false` porque Permiso es independiente, pero se borran las asociaciones de la tabla intermedia).
   - El rol "JEFE" será excluido en todos los listados de GET `/api/roles` y validado en backend para que no se pueda mutar.

3. **Frontend UI**:
   - `/admin/usuarios` pasará a ser una pantalla con dos grandes pestañas: "Usuarios" y "Roles".
   - "Roles": muestra tabla de roles, modal para crear/editar nombre y checkboxes para los Permisos disponibles.

## Risks / Trade-offs

- **[Riesgo] Actualización declarativa de roles borra colecciones enteras**: Recrear los registros de `UsuarioUnidadRol` en cada update puede causar churn en IDs de base de datos.
  - **Mitigación**: Dado el muy bajo volumen de transacciones en la gestión de usuarios, el impacto en performance es nulo. A cambio, el código del backend se mantiene extremadamente simple y libre de bugs de sincronización de listas.
- **[Riesgo] Seguridad de Endpoints**: Cualquier usuario podría intentar llamar a `/api/usuarios`.
  - **Mitigación**: Añadir reglas estrictas de `@PreAuthorize("hasAuthority('GLOBAL_ADMIN')")` o la convención que usemos para el super usuario.
