## MODIFIED Requirements

### Requirement: Emisión de Token JWT (Modificado)
El sistema SHALL incluir el ID de la Unidad de Negocio (tenant) seleccionada al momento del login dentro de los claims del JWT.

#### Scenario: Selección de negocio al login
- **WHEN** un usuario hace login indicando credenciales Y la unidad de negocio a la que desea entrar
- **THEN** el JWT generado debe contener `tenantId` en su payload, y las autoridades incluidas deben ser únicamente las que correspondan a ese tenant.
