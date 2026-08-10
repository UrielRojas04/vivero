## ADDED Requirements

### Requirement: CRUD Global de Clientes
El sistema MUST proveer endpoints REST para crear, leer, actualizar y eliminar clientes. La entidad Cliente MUST ser global, es decir, no filtrada por la `UnidadNegocio` del usuario que realiza la petición.

#### Scenario: Listar clientes
- **WHEN** un usuario autenticado hace `GET /api/clientes`
- **THEN** el sistema devuelve una lista JSON con todos los clientes de la base de datos (id, nombreRazonSocial, telefono).

#### Scenario: Crear cliente
- **WHEN** un usuario autenticado envía un `POST /api/clientes` con un JSON válido
- **THEN** el sistema persiste el nuevo cliente, sin asignarle un `unidad_id`, y devuelve `201 Created` con los datos del cliente.

#### Scenario: Actualizar cliente
- **WHEN** un usuario envía un `PUT /api/clientes/{id}`
- **THEN** el sistema actualiza los datos y devuelve `200 OK`.

#### Scenario: Eliminar cliente (Temporal)
- **WHEN** un usuario envía un `DELETE /api/clientes/{id}`
- **THEN** el sistema borra físicamente al cliente de la base de datos. *(Nota: este comportamiento cambiará en futuras features cuando se asocien ventas).*
