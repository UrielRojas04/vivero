## 1. Database & Entities Refactor

- [x] 1.1 Eliminar la entidad `UsuarioUnidadRol` y su repositorio `UsuarioUnidadRolRepository`.
- [x] 1.2 Agregar un `@ManyToMany` en `Usuario.java` para asociarlo directamente a una colección de `Rol` (tabla `usuario_rol`).
- [x] 1.3 Modificar `Usuario.getAuthorities()` para que construya los `GrantedAuthority` iterando sobre sus roles y permisos, usando `permiso.getNombre()` directamente sin prefijos de unidad de negocio.
- [x] 1.4 Refactorizar `DataInitializer.java` para crear los roles directamente, asignarlos al usuario Jefe (sin usar `UsuarioUnidadRol`) y guardar.

## 2. API & Security Layer

- [x] 2.1 Actualizar las anotaciones `@PreAuthorize` en `UsuarioController` y `RolController` para usar `hasAnyAuthority('ADMIN_DB')` en lugar de requerir múltiples variantes como `VIVERO_ADMIN_DB`.
- [x] 2.2 Reemplazar el uso de `UsuarioUnidadRol` en los endpoints de `UsuarioController` (ej. crear usuario) para que reciba IDs de `Rol` e inyecte los roles directamente al `Usuario`.

## 3. Frontend Panel Updates

- [x] 3.1 Actualizar `UsuariosAdmin.jsx` (y el modal `UsuarioModal.jsx` si existe/aplica) para eliminar la selección de "Unidad de Negocio" cuando se asocian roles.
- [x] 3.2 El formulario de creación/edición de Usuarios debe permitir seleccionar una lista de Roles directamente.
- [x] 3.3 Validar que el login sigue devolviendo el JWT correctamente y que el panel de administración sigue mostrando a los usuarios con sus roles simplificados.

## 4. Testing & Verification

- [x] 4.1 Reconstruir el backend con Docker (`docker compose up --build backend`) para que se apliquen los cambios de base de datos (ddl-auto update).
- [x] 4.2 Probar el login con `jefe@vivero.com` y verificar el token JWT y los accesos a los endpoints protegidos.
