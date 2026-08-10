## Why

El modelo de control de acceso actual divide la autorización basándose en `UnidadNegocio` (Vivero, Herramientas, Sustratos). Sin embargo, la operación real del sistema requerirá que las páginas consoliden productos y acciones de distintas áreas de negocio (por ejemplo, vender una planta y una herramienta en la misma sección). Por lo tanto, aislar el acceso estrictamente por unidad de negocio no es escalable ni práctico. Es necesario pivotar hacia un modelo "Flat RBAC" (Control de Acceso Basado en Roles puro), donde los roles tienen permisos directos que aplican a las tareas del usuario de forma global, independientemente de la procedencia del producto.

## What Changes

- **BREAKING**: Eliminar la entidad puente `UsuarioUnidadRol` y reemplazarla por una asociación directa entre `Usuario` y `Rol` (`usuario_rol`).
- Eliminar la dependencia de `UnidadNegocio` en el sistema de seguridad y en los JWT claims.
- Actualizar el método `getAuthorities()` en `Usuario.java` para que retorne los nombres de los permisos puros (ej: `ADMIN_DB`) sin el prefijo de unidad de negocio.
- Refactorizar `DataInitializer` para poblar el modelo simplificado de roles y permisos, eliminando los mapas por unidad de negocio.
- Adaptar las validaciones `@PreAuthorize` en todos los controladores (como `UsuarioController` y `RolController`) para chequear el permiso plano (`hasAnyAuthority('ADMIN_DB')`).
- Actualizar el frontend (`UsuariosAdmin.jsx` y endpoints relacionados) para que el modal de asignación de roles a usuarios asocie directamente roles en vez de pedir Unidad de Negocio.

## Capabilities

### New Capabilities
- `flat-rbac`: Nuevo sistema de autorización y roles desacoplado de las unidades de negocio lógicas.

### Modified Capabilities
- N/A

## Impact

- **Backend / Seguridad**: Cambia el corazón del RBAC y la generación del token JWT. Todos los controladores con anotaciones `@PreAuthorize` deben actualizarse.
- **Backend / Modelos**: Modificación profunda del modelo de datos (`Usuario`, `Rol`, eliminación de `UsuarioUnidadRol`). Esto requerirá migración (hiberante ddl-auto update).
- **Frontend / Panel Admin**: El formulario de asociación de roles a empleados dejará de requerir "Unidad de Negocio".
