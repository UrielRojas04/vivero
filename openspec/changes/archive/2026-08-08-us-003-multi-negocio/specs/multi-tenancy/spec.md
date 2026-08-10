## ADDED Requirements

### Requirement: Soporte para Múltiples Negocios (Tenants)
El sistema SHALL permitir la existencia de múltiples unidades de negocio independientes (ej. Vivero, Sustratos) registradas en la base de datos.

#### Scenario: Filtrado por negocio
- **WHEN** un usuario realiza una operación (lectura/escritura) que depende del negocio
- **THEN** el sistema debe asociar esa operación a la unidad de negocio actual obtenida del contexto de seguridad (JWT)
