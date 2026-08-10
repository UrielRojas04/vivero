## 1. Utilidades JWT

- [x] 1.1 Crear clase `JwtUtils` en el paquete `security`.
- [x] 1.2 Implementar método `generateToken(String username)` usando `io.jsonwebtoken.Jwts` (V0.12.5+) usando una SecretKey provista desde `application.properties`.
- [x] 1.3 Implementar método `extractUsername(String token)` para recuperar el usuario del token.
- [x] 1.4 Implementar método `validateToken(String token)` para asegurar que la firma sea válida y no haya expirado.

## 2. Mock de Usuario (Temporal)

- [x] 2.1 Crear la entidad mínima `Usuario` en `com.vivero.gestion.models` (con `id`, `username`, `password`) que implemente `UserDetails` de Spring Security.
- [x] 2.2 Crear `UsuarioRepository` básico extendiendo `JpaRepository`.
- [x] 2.3 Crear `CustomUserDetailsService` en el paquete `security` que implemente `UserDetailsService` cargando el usuario desde el repositorio.

## 3. Filtro de Seguridad

- [x] 3.1 Crear clase `JwtFilter` en `security` extendiendo `OncePerRequestFilter`.
- [x] 3.2 Implementar lógica para interceptar el header `Authorization`, extraer el token removiendo el prefijo "Bearer ".
- [x] 3.3 Validar el token usando `JwtUtils`. Si es válido, cargar el `UserDetails` y establecer el `UsernamePasswordAuthenticationToken` en el `SecurityContextHolder`.

## 4. Configuración de Spring Security

- [x] 4.1 Crear clase `SecurityConfig` anotada con `@Configuration` y `@EnableWebSecurity`.
- [x] 4.2 Definir el Bean `SecurityFilterChain` para proteger todas las rutas `/api/**` excepto `/api/auth/**` (que debe permitir acceso anónimo).
- [x] 4.3 Configurar `sessionManagement` de tipo `SessionCreationPolicy.STATELESS` y deshabilitar CSRF (común en APIs REST JWT).
- [x] 4.4 Agregar el `JwtFilter` antes del filtro estándar `UsernamePasswordAuthenticationFilter`.
- [x] 4.5 Exponer un Bean de `AuthenticationManager` y un `PasswordEncoder` (BCrypt).
