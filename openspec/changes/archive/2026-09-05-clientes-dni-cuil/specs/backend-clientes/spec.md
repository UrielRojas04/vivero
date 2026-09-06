## MODIFIED Requirements

### Requirement: CRUD Global de Clientes
El sistema MUST proveer endpoints REST para crear, leer, actualizar y eliminar clientes. La entidad Cliente MUST ser global, es decir, no filtrada por la `UnidadNegocio` del usuario que realiza la petición. Además, todo nuevo cliente MUST inicializar sus Cuentas Corrientes con saldo 0.

La entidad Cliente MUST además admitir dos identificadores formales opcionales e independientes entre sí, `dni` y `cuil`, ambos representados como texto y ambos nulables. Un cliente MUST poder existir sin ninguno de los dos, con uno solo, o con los dos a la vez. El sistema MUST NOT exigir ni validar formato, longitud ni dígito verificador sobre esos valores, y MUST NOT imponer unicidad sobre ellos. El DTO de cliente MUST exponer ambos campos tanto en las respuestas de lectura como aceptarlos en los payloads de creación y actualización; el sistema MUST NOT devolver la entidad JPA directamente.

Un valor de documento recibido en blanco o compuesto solo por espacios MUST persistirse como nulo, de modo que la ausencia de dato se represente de una única manera.

El endpoint de creación MUST estar disponible además para los roles habilitados a registrar ventas, para permitir el alta de un cliente desde la pantalla de venta sin depender de otro rol.

#### Scenario: Listar clientes
- **WHEN** un usuario autenticado hace `GET /api/clientes`
- **THEN** el sistema devuelve una lista JSON con todos los clientes de la base de datos, incluyendo los saldos de sus cuentas corrientes a través del DTO, y el `dni` y `cuil` de cada cliente cuando estén cargados.

#### Scenario: Crear cliente
- **WHEN** un usuario autenticado envía un `POST /api/clientes` con un JSON válido
- **THEN** el sistema persiste el nuevo cliente e instancia automáticamente en 0 sus respectivas `CuentaCorrienteDinero` y `CuentaCorrienteBandejas`, devolviendo `201 Created` con los datos del cliente.

#### Scenario: Crear cliente con documento
- **WHEN** un usuario envía un `POST /api/clientes` con `nombreRazonSocial` y además un `dni`, un `cuil`, o ambos
- **THEN** el sistema persiste esos valores tal como fueron enviados y los devuelve en la respuesta junto con el resto de los datos del cliente

#### Scenario: Crear cliente sin ningún documento
- **WHEN** un usuario envía un `POST /api/clientes` sin `dni` ni `cuil`, o con esos campos vacíos
- **THEN** el sistema crea el cliente igualmente y ambos documentos quedan nulos, sin error de validación

#### Scenario: Alta de cliente desde un rol de ventas
- **WHEN** un usuario cuyo rol tiene permiso de escritura de ventas pero no permiso de escritura de clientes envía un `POST /api/clientes`
- **THEN** el sistema autoriza la operación y crea el cliente

#### Scenario: Actualizar cliente
- **WHEN** un usuario envía un `PUT /api/clientes/{id}`
- **THEN** el sistema actualiza los datos del cliente, incluidos `dni` y `cuil` si vienen en el payload, asegurando mantener la referencia a sus cuentas corrientes, y devuelve `200 OK`.

#### Scenario: Corregir el documento de un cliente ya existente
- **WHEN** un usuario envía un `PUT /api/clientes/{id}` cambiando el valor de `dni` o de `cuil`, o vaciándolo
- **THEN** el sistema persiste el nuevo valor, o lo deja nulo si se envió vacío, sin alterar los saldos de las cuentas corrientes del cliente

#### Scenario: Eliminar cliente (Temporal)
- **WHEN** un usuario envía un `DELETE /api/clientes/{id}`
- **THEN** el sistema borra físicamente al cliente de la base de datos junto con sus cuentas corrientes (Cascade Delete). *(Nota: este comportamiento cambiará en futuras features cuando se asocien ventas).*
