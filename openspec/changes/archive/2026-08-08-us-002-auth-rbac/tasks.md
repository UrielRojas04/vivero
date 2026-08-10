## 1. Entidades de Seguridad (JPA)

- [x] 1.1 Crear entidad `Rol` (`id`, `nombre`, `Set<Permiso> permisos`). Configurar `@ManyToMany` con `Permiso`.
- [x] 1.2 Crear entidad `Permiso` (`id`, `nombre`).
- [x] 1.3 Modificar `Usuario` para agregar `Set<Rol> roles` con `@ManyToMany` a `Rol`.
- [x] 1.4 Actualizar `Usuario.getAuthorities()` para retornar los nombres de los permisos en lugar de una lista vacía.

## 2. Repositorios y DB

- [x] 2.1 Crear `RolRepository` y `PermisoRepository`.
- [x] 2.2 Modificar `UsuarioRepository.findByUsername()` con la query `@Query("SELECT u FROM Usuario u JOIN FETCH u.roles r JOIN FETCH r.permisos WHERE u.username = :username")` para solucionar el N+1.
- [x] 2.3 Crear `DataInitializer` implementando `CommandLineRunner` para poblar la BD con 2 roles (JEFE, EMPLEADO_VIVERO) y 1 usuario por defecto si la base está vacía.

## 3. Limpieza y Verificación

- [x] 3.1 Eliminar importaciones no usadas o código viejo en `CustomUserDetailsService` si aplica.
- [x] 3.2 Verificar compilación con `./mvnw clean compile`.
