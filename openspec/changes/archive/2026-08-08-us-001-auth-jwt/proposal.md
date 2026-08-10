## Why

Se requiere implementar la capa base de seguridad para proteger los endpoints del backend. Al ser un sistema moderno construido con React, necesitamos una autenticación "stateless" (sin estado) basada en JSON Web Tokens (JWT) que permita escalar el sistema y prepararlo para la arquitectura multi-negocio (tenant).

## What Changes

- Configuración de **Spring Security** para operar de forma "Stateless" (sin manejo de sesiones HTTP).
- Creación de utilidades (`JwtUtils`) para la firma, emisión y validación de tokens JWT.
- Implementación de un filtro (`JwtFilter`) para interceptar peticiones y validar el token antes de acceder a rutas protegidas.
- (Aún no se implementa el RBAC granular, solo la emisión del token y seguridad base).

## Capabilities

### New Capabilities
- `jwt-authentication`: Emisión de tokens, validación criptográfica y configuración del SecurityFilterChain.

### Modified Capabilities
- Ninguna.

## Impact

- Todos los endpoints futuros estarán protegidos por defecto, requiriendo un header `Authorization: Bearer <token>`.
- Establece los cimientos (`SecurityConfig`, `JwtUtils`, `JwtFilter`) para que los siguientes cambios (RBAC y roles) puedan integrarse fácilmente.
