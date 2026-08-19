## ADDED Requirements

### Requirement: Registro de proveedores
El sistema SHALL permitir dar de alta, consultar, editar y dar de baja proveedores. Un proveedor SHALL tener un nombre obligatorio, y opcionalmente un teléfono y un nombre de persona de contacto. La baja SHALL ser lógica: un proveedor dado de baja SHALL dejar de aparecer en los listados y en los selectores, sin borrarse físicamente, de modo que los pedidos históricos que lo referencian sigan siendo consultables.

#### Scenario: Alta de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos da de alta un proveedor con nombre "Shimura" y teléfono
- **THEN** el sistema lo persiste asociado a la unidad de negocio activa y lo devuelve con su identificador asignado

#### Scenario: Alta sin nombre
- **WHEN** un usuario intenta dar de alta un proveedor sin nombre o con el nombre vacío
- **THEN** el sistema rechaza la operación y no persiste ningún proveedor

#### Scenario: Edición de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos modifica el teléfono o el contacto de un proveedor existente
- **THEN** el sistema persiste los datos nuevos y conserva el mismo identificador

#### Scenario: Baja lógica de proveedor
- **WHEN** un usuario con permiso de escritura de pedidos da de baja un proveedor
- **THEN** el proveedor deja de aparecer en el listado de proveedores, y los pedidos existentes que lo referencian siguen mostrando su nombre al consultarse

### Requirement: Aislamiento de proveedores por unidad de negocio
El sistema SHALL asociar cada proveedor a la unidad de negocio activa en el momento del alta, y SHALL devolver en los listados únicamente los proveedores de la unidad de negocio activa de la petición. El acceso a un proveedor por identificador SHALL fallar cuando el proveedor no pertenece a la unidad de negocio activa.

#### Scenario: Alta con la unidad de negocio del contexto
- **WHEN** un usuario da de alta un proveedor con la unidad de negocio Herramientas activa
- **THEN** el proveedor queda asociado a la unidad de negocio Herramientas, sin que el cliente tenga que enviarla explícitamente

#### Scenario: Listado acotado a la unidad activa
- **WHEN** un usuario solicita el listado de proveedores con una unidad de negocio activa
- **THEN** el sistema devuelve únicamente los proveedores de esa unidad de negocio

#### Scenario: Acceso a un proveedor de otra unidad de negocio
- **WHEN** un usuario solicita, edita o da de baja un proveedor que pertenece a una unidad de negocio distinta de la activa
- **THEN** el sistema rechaza la operación y no devuelve los datos del proveedor

### Requirement: Autorización del ABM de proveedores
El sistema SHALL exigir el permiso `LEER_PEDIDOS` para consultar proveedores y el permiso `ESCRIBIR_PEDIDOS` para darlos de alta, editarlos o darlos de baja. Ningún otro permiso SHALL habilitar estas operaciones.

#### Scenario: Consulta sin permiso de lectura
- **WHEN** un usuario autenticado sin `LEER_PEDIDOS` solicita el listado de proveedores
- **THEN** el sistema responde 403 Forbidden

#### Scenario: Alta sin permiso de escritura
- **WHEN** un usuario autenticado con `LEER_PEDIDOS` pero sin `ESCRIBIR_PEDIDOS` intenta dar de alta un proveedor
- **THEN** el sistema responde 403 Forbidden y no persiste nada

#### Scenario: Permiso de stock no habilita proveedores
- **WHEN** un usuario cuyo rol tiene `LEER_STOCK` y `ESCRIBIR_STOCK` pero ninguno de los permisos de pedidos solicita el listado de proveedores
- **THEN** el sistema responde 403 Forbidden

### Requirement: Pantalla de administración de proveedores
El sistema SHALL ofrecer una pantalla propia para administrar proveedores, accesible mediante una ruta protegida por los permisos de pedidos, que permita listarlos, darlos de alta, editarlos y darlos de baja. El listado SHALL presentarse como tabla en pantallas de ancho `md` o mayor y como tarjetas apiladas en anchos menores. Toda confirmación de baja SHALL usar el mecanismo de diálogos de la aplicación, y SHALL NOT usar diálogos nativos del navegador.

#### Scenario: Listado en escritorio
- **WHEN** un usuario habilitado abre la pantalla de proveedores en una pantalla de ancho mayor o igual a `md`
- **THEN** los proveedores se muestran en una tabla con su nombre, contacto y teléfono

#### Scenario: Listado en mobile
- **WHEN** un usuario habilitado abre la pantalla de proveedores en una pantalla de ancho menor a `md`
- **THEN** los proveedores se muestran como tarjetas apiladas de ancho completo, sin desbordar horizontalmente

#### Scenario: Confirmación de baja
- **WHEN** el usuario pide dar de baja un proveedor desde la pantalla
- **THEN** el sistema le presenta una confirmación con el nombre del proveedor antes de ejecutar la baja
