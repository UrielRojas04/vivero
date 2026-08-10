## MODIFIED Requirements

### Requirement: Validación de Token JWT
El sistema SHALL verificar la validez de un token JWT recibido en el header `Authorization` (formato `Bearer <token>`). Además, al establecer el contexto de seguridad, debe cargar los roles y permisos desde la base de datos de manera relacional.

#### Scenario: Token válido
- **WHEN** el sistema recibe un token firmado con la clave secreta correcta y que no ha expirado
- **THEN** el sistema extrae el nombre de usuario, busca al usuario en la base de datos, carga sus Roles y Permisos (GrantedAuthorities) y establece el contexto de seguridad con ellos

#### Scenario: Token expirado o alterado
- **WHEN** el sistema recibe un token expirado o modificado maliciosamente
- **THEN** el sistema rechaza la petición y no establece el contexto de seguridad
