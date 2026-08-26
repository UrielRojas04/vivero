## MODIFIED Requirements

### Requirement: Registro de proveedores
El sistema SHALL permitir dar de alta, consultar, editar y dar de baja proveedores. Un proveedor SHALL tener un nombre obligatorio, opcionalmente un teléfono y un nombre de persona de contacto, y un **perfil de costeo** con sus condiciones comerciales habituales. La baja SHALL ser lógica: un proveedor dado de baja SHALL dejar de aparecer en los listados y en los selectores, sin borrarse físicamente, de modo que los pedidos históricos que lo referencian sigan siendo consultables.

El sistema SHALL rechazar el alta de un proveedor cuyo nombre coincida, ignorando mayúsculas y espacios sobrantes, con el de otro proveedor vivo de la misma unidad de negocio, para evitar dos fichas del mismo proveedor con configuraciones distintas.

Un proveedor SHALL poder tener productos del catálogo asociados. La baja lógica de un proveedor SHALL NOT desvincular ni modificar los productos que lo referencian.

#### Scenario: Alta de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos da de alta un proveedor con nombre "Shimura" y teléfono
- **THEN** el sistema lo persiste asociado a la unidad de negocio activa, con perfil de costeo neutro, y lo devuelve con su identificador asignado

#### Scenario: Alta sin nombre
- **WHEN** un usuario intenta dar de alta un proveedor sin nombre o con el nombre vacío
- **THEN** el sistema rechaza la operación y no persiste ningún proveedor

#### Scenario: Alta con nombre duplicado
- **WHEN** un usuario intenta dar de alta un proveedor llamado `"ingco"` en una unidad de negocio donde ya existe un proveedor vivo llamado `"INGCO"`
- **THEN** el sistema rechaza la operación y no persiste ningún proveedor

#### Scenario: Edición de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos modifica el teléfono, el contacto o el perfil de costeo de un proveedor existente
- **THEN** el sistema persiste los datos nuevos y conserva el mismo identificador

#### Scenario: Baja lógica de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos da de baja un proveedor
- **THEN** el proveedor deja de aparecer en el listado de proveedores, y los pedidos existentes que lo referencian siguen mostrando su nombre al consultarse

#### Scenario: Baja de un proveedor con productos asociados
- **WHEN** un usuario da de baja un proveedor que tiene productos del catálogo asociados
- **THEN** los productos conservan su vínculo con ese proveedor y sus valores de costeo sin ningún cambio, y siguen figurando en el catálogo

## ADDED Requirements

### Requirement: Consulta del Perfil de Costeo del Proveedor
El sistema SHALL devolver el perfil de costeo completo del proveedor —tratamiento del IVA, IVA por defecto, si cotiza en moneda extranjera, la lista de descuentos por defecto con su nombre y su porcentaje, y el envío por defecto— en las operaciones de consulta individual y de listado de proveedores, de modo que las pantallas que precargan valores por defecto no requieran una consulta adicional por proveedor.

El sistema SHALL devolver esa información mediante objetos de transferencia, y SHALL NOT exponer las entidades de persistencia directamente.

#### Scenario: Listado con perfil de costeo
- **WHEN** un usuario habilitado solicita el listado de proveedores de la unidad de negocio activa
- **THEN** cada proveedor del listado incluye su perfil de costeo completo, sin requerir una consulta adicional para obtenerlo

#### Scenario: Consulta individual
- **WHEN** un usuario habilitado consulta un proveedor por su identificador
- **THEN** el sistema devuelve sus datos de contacto y su perfil de costeo completo

### Requirement: Productos Asociados a un Proveedor
El sistema SHALL permitir consultar los productos del catálogo asociados a un proveedor de la unidad de negocio activa, con la información de costo necesaria para evaluar el efecto de reaplicar el perfil de costeo del proveedor.

#### Scenario: Consulta de los productos de un proveedor
- **WHEN** un usuario habilitado consulta los productos asociados a un proveedor que tiene tres productos
- **THEN** el sistema devuelve esos tres productos con su costo actual, y ninguno de otro proveedor ni de otra unidad de negocio

#### Scenario: Proveedor sin productos
- **WHEN** un usuario habilitado consulta los productos asociados a un proveedor recién creado
- **THEN** el sistema devuelve una lista vacía
