## ADDED Requirements

### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto (planta) asociado a la Unidad de Negocio.

#### Scenario: Registro exitoso por usuario autorizado
- **WHEN** un usuario con permisos envía una solicitud para crear un producto
- **THEN** el sistema persiste el producto y devuelve el estado HTTP 201 Created

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden

### Requirement: Consulta de Catálogo
El sistema MUST permitir listar todos los productos registrados.

#### Scenario: Listado exitoso
- **WHEN** un usuario con permisos de lectura solicita el catálogo
- **THEN** el sistema devuelve una lista de productos paginada o completa con estado HTTP 200 OK
