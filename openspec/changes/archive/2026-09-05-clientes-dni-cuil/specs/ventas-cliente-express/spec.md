## MODIFIED Requirements

### Requirement: Ingreso manual de Cliente en Pantalla de Venta
El sistema SHALL permitir al usuario en la UI de "Nueva Venta" elegir entre seleccionar un cliente existente del listado, o ingresar los datos de un cliente manualmente de forma "express", exclusivamente cuando la unidad de negocio activa sea "Herramientas".

El formulario express SHALL ofrecer además, de manera opcional, la carga de un documento para esa venta puntual, mediante la elección de un tipo (DNI o CUIL) y su valor. El documento SHALL ser opcional: la venta express SHALL poder completarse sin él, tal como hasta ahora.

#### Scenario: Visualización del formulario express
- **WHEN** la unidad de negocio activa es "Herramientas"
- **THEN** la UI muestra una opción en la selección de clientes para "Ingresar datos manualmente" o "Cliente Express", solicitando Nombre y Teléfono, un selector opcional de tipo de documento (DNI o CUIL) con su valor, junto con un checkbox indicando si es un "Cliente casual".

#### Scenario: Ocultamiento en otras unidades de negocio
- **WHEN** la unidad de negocio activa es "Vivero" (o cualquier otra distinta a Herramientas)
- **THEN** la opción de ingresar un cliente manualmente de forma express no se muestra, permitiendo solo la selección de clientes existentes de la base de datos.

#### Scenario: Venta express sin documento
- **WHEN** el usuario completa una venta express sin elegir tipo de documento ni cargar un valor
- **THEN** la venta se registra normalmente y no queda ningún documento asociado a ella

### Requirement: Preparación del payload de Venta con Cliente Express
El frontend SHALL estructurar el payload de creación de venta para incluir los datos ad-hoc en lugar del ID de cliente cuando se utiliza la carga manual.

Cuando el usuario haya cargado un documento en el formulario express, el frontend SHALL incluirlo en los datos ad-hoc como el par tipo de documento y valor. Cuando no lo haya cargado, o cuando el valor esté vacío, el frontend SHALL omitir el par completo en lugar de enviar un tipo sin valor.

#### Scenario: Envío de payload con cliente casual
- **WHEN** el usuario completa una venta utilizando los datos express y marca "Cliente casual", y presiona "Guardar Venta"
- **THEN** el frontend envía en el POST de `/api/ventas` el campo `clienteId: null` (o lo omite) y adjunta un objeto `clienteAdHoc` con el nombre, teléfono y `casual: true`.

#### Scenario: Envío de payload con creación express de cliente
- **WHEN** el usuario completa una venta utilizando los datos express, NO marca "Cliente casual", y presiona "Guardar Venta"
- **THEN** el frontend envía en el POST de `/api/ventas` el objeto `clienteAdHoc` con el nombre, teléfono y `casual: false`.

#### Scenario: Envío de payload con documento puntual
- **WHEN** el usuario completa una venta express habiendo elegido un tipo de documento y cargado su valor
- **THEN** el frontend adjunta ese tipo y ese valor dentro del objeto `clienteAdHoc` del POST de `/api/ventas`

#### Scenario: Omisión del documento vacío en el payload
- **WHEN** el usuario elige un tipo de documento pero deja el valor vacío, o no elige ningún tipo
- **THEN** el frontend no envía tipo ni valor de documento en el objeto `clienteAdHoc`

## ADDED Requirements

### Requirement: Persistencia del documento puntual de una venta casual
El sistema SHALL persistir, en la venta y no en un `Cliente`, el documento cargado para una venta a cliente casual, siguiendo la misma convención con la que ya persiste el nombre y el teléfono casuales. El dato SHALL guardarse como un tipo de documento acotado a DNI o CUIL, más su valor, y SHALL quedar disponible para el comprobante de esa venta.

El sistema SHALL guardar el par de forma consistente: si el valor recibido está vacío o en blanco, SHALL guardar tanto el tipo como el valor en nulo, de modo que nunca quede registrado un tipo de documento sin su valor. El sistema SHALL NOT validar el formato del valor recibido ni exigir unicidad sobre él.

Cuando la venta express se registra con la opción de crear un cliente real (no casual), el documento cargado SHALL guardarse en la ficha de ese cliente en el campo que corresponda al tipo elegido, y no como documento casual de la venta.

#### Scenario: Venta casual con documento
- **WHEN** se registra una venta con datos ad-hoc marcados como casuales que incluyen un tipo de documento y su valor
- **THEN** la venta queda guardada sin `Cliente` vinculado y con el tipo y el valor del documento almacenados en la propia venta

#### Scenario: Documento con valor en blanco
- **WHEN** se registra una venta casual cuyos datos ad-hoc traen un tipo de documento pero un valor vacío o solo espacios
- **THEN** la venta se guarda con el tipo y el valor de documento nulos, sin rechazar la operación

#### Scenario: Venta express que crea un cliente real, con documento
- **WHEN** se registra una venta con datos ad-hoc marcados como NO casuales que incluyen un tipo de documento y su valor
- **THEN** el `Cliente` creado queda con ese valor en su campo de DNI o de CUIL según el tipo elegido, y la venta no guarda documento casual propio

#### Scenario: Tipo de documento no reconocido
- **WHEN** se registra una venta cuyos datos ad-hoc traen un tipo de documento distinto de DNI o CUIL
- **THEN** el sistema rechaza la solicitud con 400 Bad Request y no se registra la venta
