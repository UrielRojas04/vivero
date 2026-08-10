## Context

Acabamos de limpiar la base de código anterior y establecer una arquitectura limpia por capas (Layered Architecture). Antes de crear entidades de dominio, necesitamos asegurar la aplicación usando Spring Security 6+ de manera stateless, para preparar el terreno hacia una arquitectura multi-tenant (vivero/sustratos) donde el backend solo procesa tokens y no mantiene sesiones.

## Goals / Non-Goals

**Goals:**
- Configurar Spring Security 6 para rechazar cualquier petición sin autenticación por defecto (salvo rutas públicas como login).
- Implementar la firma y validación de JSON Web Tokens (JWT).
- Interceptar las peticiones HTTP y configurar el `SecurityContext` si el token es válido.

**Non-Goals:**
- Implementar Autorización basada en Roles (RBAC). (Será en `us-002`).
- Lógica de Multi-Tenancy (Unidades de Negocio). (Será en `us-003`).

## Decisions

- **Framework**: Usaremos Spring Security 6 (con la API fluida `SecurityFilterChain` moderna, sin extender `WebSecurityConfigurerAdapter` ya que está deprecado).
- **Session Management**: Configurado estrictamente como `STATELESS`. Spring no guardará la sesión del usuario en memoria.
- **Librería JWT**: Usaremos `io.jsonwebtoken:jjwt-api:0.12.5` (la versión más actual y segura).
- **Filtro de Seguridad**: Crearemos un `JwtFilter` que herede de `OncePerRequestFilter` para asegurar que solo se ejecute una vez por petición.

## Risks / Trade-offs

- **[Riesgo]** Claves secretas hardcodeadas en el código (vulnerabilidad de seguridad grave).
  - **[Mitigación]** Inyectaremos la clave secreta desde `application.properties` y en producción la pasaremos como variable de entorno (`JWT_SECRET`).
