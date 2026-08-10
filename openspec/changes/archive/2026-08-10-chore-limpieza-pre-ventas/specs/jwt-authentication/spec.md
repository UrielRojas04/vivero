## MODIFIED Requirements

### Requirement: Emisión de Token JWT (Modificado)
El sistema SHALL configurar el token JWT usando secretos provistos por variables de entorno y no incluirá información de Unidad de Negocio (tenant).

#### Scenario: Login de usuario
- **WHEN** un usuario hace login indicando credenciales
- **THEN** el JWT generado debe ser firmado con el secreto provisto por el entorno y no debe contener referencias al `tenantId`.

## ADDED Requirements

### Requirement: Configuración Segura de JWT
El sistema SHALL cargar la clave secreta y la expiración del JWT desde el entorno de ejecución.

#### Scenario: Entorno de producción
- **WHEN** el backend se inicia
- **THEN** debe leer las variables `JWT_SECRET` y `JWT_EXPIRATION_MS` e ignorar cualquier valor quemado (hardcoded).
