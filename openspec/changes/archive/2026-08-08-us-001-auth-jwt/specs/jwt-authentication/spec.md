## ADDED Requirements

### Requirement: Emisión de Token JWT
El sistema SHALL proveer utilidades para generar un token JWT firmado criptográficamente, incluyendo información del usuario (claims) y un tiempo de expiración.

#### Scenario: Generación exitosa de token
- **WHEN** se invoca la utilidad de generación con un nombre de usuario válido
- **THEN** el sistema retorna un string JWT válido, firmado y con fecha de expiración

### Requirement: Validación de Token JWT
El sistema SHALL verificar la validez de un token JWT recibido en el header `Authorization` (formato `Bearer <token>`).

#### Scenario: Token válido
- **WHEN** el sistema recibe un token firmado con la clave secreta correcta y que no ha expirado
- **THEN** el sistema extrae el nombre de usuario y establece el contexto de seguridad

#### Scenario: Token expirado o alterado
- **WHEN** el sistema recibe un token expirado o modificado maliciosamente
- **THEN** el sistema rechaza la petición y no establece el contexto de seguridad

### Requirement: Intercepción de Peticiones Seguras
El sistema SHALL bloquear el acceso a recursos protegidos si no se provee un token válido.

#### Scenario: Acceso sin token
- **WHEN** un cliente intenta acceder a un endpoint protegido sin el header `Authorization`
- **THEN** el sistema responde con un error 401 Unauthorized
