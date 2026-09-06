## MODIFIED Requirements

### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente existente O los datos de un cliente casual (solo para la unidad de negocio Herramientas), un array de detalles (productos vendidos), un porcentaje de descuento opcional, un array de pagos, y de manera opcional una cantidad de bandejas entregadas.

Cuando la venta se registra contra un cliente casual, el sistema SHALL además admitir de manera opcional un documento puntual para esa venta, expresado como un tipo de documento (DNI o CUIL) junto con su valor, y SHALL persistirlo en la venta sin crear ningún `Cliente`.

La respuesta de una venta SHALL exponer el DNI y el CUIL del comprador como dos campos independientes, resueltos de forma uniforme cualquiera sea el origen del dato: tomados del `Cliente` vinculado cuando la venta tiene uno, o derivados del documento puntual de la venta cuando es casual. Un consumidor de la API SHALL NOT necesitar distinguir entre ambos casos para leer el documento.

#### Scenario: Venta exitosa con cliente existente
- **WHEN** el payload es válido, contiene al menos un producto, tiene un `clienteId` válido y cero o más pagos y bandejas
- **THEN** el sistema guarda la venta (`Venta`), calcula el `subtotal` y `totalFinal` (aplicando el descuento), copia el precio del producto al momento exacto en `precioUnitarioHistorico` (`VentaDetalle`), asienta los `Pago` enviados, registra la entrega en `HistorialBandejas` (si aplica), y devuelve 201 Created.

#### Scenario: Venta exitosa con cliente casual
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y en lugar de `clienteId` contiene un objeto `clienteAdHoc` con bandera `casual: true`, nombre y teléfono
- **THEN** el sistema guarda la venta (`Venta`) SIN asociar un `Cliente` de la base de datos (clave foránea nula), pero almacenando el nombre y teléfono del cliente ad-hoc en los datos de la Venta para uso en comprobantes, y devuelve 201 Created.

#### Scenario: Venta exitosa con creación de cliente express
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y contiene un objeto `clienteAdHoc` con bandera `casual: false`, nombre y teléfono
- **THEN** el sistema primero crea un registro `Cliente` en la base de datos para la unidad de negocio Herramientas, luego guarda la venta (`Venta`) vinculada a este nuevo cliente, y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin clienteId Y sin clienteAdHoc, o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.

#### Scenario: Documento del comprador en una venta con cliente vinculado
- **WHEN** se consulta una venta asociada a un `Cliente` que tiene cargado un DNI, un CUIL, o ambos
- **THEN** la respuesta expone esos valores en los campos de DNI y CUIL de la venta

#### Scenario: Documento del comprador en una venta casual
- **WHEN** se consulta una venta sin `Cliente` vinculado que se registró con un documento puntual
- **THEN** la respuesta expone ese valor en el campo que corresponde al tipo de documento con el que fue cargado, y deja nulo el otro

#### Scenario: Venta sin ningún documento
- **WHEN** se consulta una venta cuyo cliente no tiene documentos cargados, o que es casual y se registró sin documento puntual
- **THEN** la respuesta devuelve nulos ambos campos de documento y la venta se procesa con normalidad

## ADDED Requirements

### Requirement: Alta de cliente al vuelo desde el buscador de Nueva Venta
El sistema SHALL permitir, en la pantalla de Nueva Venta y en las tres unidades de negocio, dar de alta un cliente desde el propio buscador de clientes cuando el texto tipeado no coincide con ningún cliente existente, sin abandonar la venta en curso ni perder el carrito ya cargado.

El alta SHALL ocurrir en el momento contra el endpoint de creación de clientes, de manera que el cliente exista con identidad propia antes de confirmar la venta, y el cliente recién creado SHALL quedar seleccionado como cliente de la venta en curso. La venta resultante SHALL enviarse como cualquier otra venta a cliente de agenda, referenciando al cliente por su identificador.

El formulario de alta al vuelo SHALL pedir únicamente el nombre —tomado del texto ya tipeado— y ofrecer como opcionales el teléfono y un documento, este último mediante la elección de un tipo (DNI o CUIL) y su valor. Ninguno de los campos opcionales SHALL ser requerido para completar el alta.

Si el alta falla, el sistema SHALL informar el error, SHALL NOT dejar seleccionado ningún cliente y SHALL conservar intacto el carrito de la venta en curso.

#### Scenario: Alta al vuelo desde el buscador de agenda
- **WHEN** el vendedor escribe en el buscador de cliente de Nueva Venta un nombre que no coincide con ningún cliente y confirma la creación
- **THEN** el sistema crea el cliente, lo deja seleccionado como cliente de la venta en curso y muestra confirmación del alta

#### Scenario: Alta al vuelo con teléfono y documento
- **WHEN** el vendedor, en el formulario de alta al vuelo, además del nombre completa el teléfono y elige DNI o CUIL cargando su valor
- **THEN** el cliente queda creado con el teléfono y el documento indicados en el campo que corresponde al tipo elegido

#### Scenario: Alta al vuelo solo con nombre
- **WHEN** el vendedor confirma el alta al vuelo sin completar teléfono ni documento
- **THEN** el sistema crea el cliente solo con el nombre y lo selecciona, sin exigir los datos opcionales

#### Scenario: Confirmación de la venta tras el alta al vuelo
- **WHEN** el vendedor confirma la venta usando un cliente que acaba de crear al vuelo
- **THEN** el sistema envía la venta referenciando al cliente por su identificador, sin datos de cliente ad-hoc, y la venta queda vinculada a ese cliente

#### Scenario: El carrito sobrevive a un alta fallida
- **WHEN** el alta al vuelo falla por un error del servidor mientras hay productos cargados en el carrito
- **THEN** el sistema muestra el error, la venta permanece sin cliente seleccionado y los productos del carrito siguen cargados

#### Scenario: Disponibilidad en las tres unidades de negocio
- **WHEN** el vendedor usa el buscador de cliente de Nueva Venta en Vivero, en Herramientas o en Abono
- **THEN** la opción de crear el cliente al vuelo está disponible en las tres, con el mismo comportamiento
