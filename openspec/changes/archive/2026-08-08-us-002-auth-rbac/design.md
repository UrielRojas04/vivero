## Context

Tenemos un sistema de JWT funcional con una entidad `Usuario` hardcodeada / básica. El Vivero va a ser usado por Jefes y Empleados, por lo que necesitamos un sistema robusto de permisos (Role-Based Access Control).

## Goals / Non-Goals

**Goals:**
- Crear el esquema de base de datos para `usuarios`, `roles`, `permisos`, `usuario_rol` y `rol_permiso`.
- Mapear las autoridades de Spring Security usando los nombres de los permisos.
- Crear un script de inicialización (`data.sql` o vía Spring Boot `CommandLineRunner`) para poblar la DB con los roles base (JEFE, EMPLEADO).

**Non-Goals:**
- Implementar Multi-Tenancy (eso va en `us-003`).

## Decisions

- **Mapeo JPA**: Usaremos `@ManyToMany` con tabla intermedia (`@JoinTable`) para `Usuario` <-> `Rol` y `Rol` <-> `Permiso`.
- **Eager vs Lazy**: Fetch LAZY por defecto para colecciones (buena práctica). Sin embargo, como JWT necesita los roles en cada request, los inicializaremos explícitamente en el `UserDetailsService` (usando un JOIN FETCH).
- **Autoridades en Spring**: En vez de que las autoridades sean "ROLE_JEFE", mapearemos los permisos granulares (ej: `LEER_VENTAS`) como las `GrantedAuthority`. Esto da muchísima más flexibilidad (RBAC granular).

## Risks / Trade-offs

- **[Risk]** N+1 query problem al cargar al usuario por username en cada petición JWT.
  - **Mitigation**: El `UsuarioRepository.findByUsername` deberá usar una consulta JPQL con `JOIN FETCH u.roles r JOIN FETCH r.permisos` para cargar todo en 1 sola query.
