## MODIFIED Requirements

### Requirement: Emisión de Token JWT (Modificado)
El sistema SHALL configurar el token JWT usando secretos provistos por variables de entorno y no incluirá información de Unidad de Negocio (tenant) dentro del payload del token, ya que el contexto de negocio será administrado de forma independiente por request HTTP mediante headers.

#### Scenario: Login de usuario
- **WHEN** un usuario hace login indicando credenciales
- **THEN** el JWT generado debe ser firmado con el secreto provisto por el entorno y no debe contener referencias al `tenantId` (para permitir cambio de negocio sin re-autenticar).
