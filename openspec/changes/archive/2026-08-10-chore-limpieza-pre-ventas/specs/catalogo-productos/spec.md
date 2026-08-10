## MODIFIED Requirements

### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto (planta). Ya no está asociado a una Unidad de Negocio.

#### Scenario: Registro exitoso por usuario autorizado
- **WHEN** un usuario con permisos envía una solicitud para crear un producto
- **THEN** el sistema persiste el producto de forma global (sin tenant) y devuelve el estado HTTP 201 Created

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden
