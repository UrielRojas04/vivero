## MODIFIED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema, incorporando retroalimentación visual sobre el equivalente en semillas en base a la cantidad y tipo de bandeja seleccionada. Además, el dueño del lote SHALL ser seleccionado desde una caja de búsqueda que incluya a los clientes registrados. El registro SHALL incluir el origen de la semilla, que puede ser `SOBRE` (semilla comercial que llega en un sobre con código de lote impreso por el proveedor) o `SUELTO` (semilla tomada de una bolsa, sin código de lote). El número de siembra SHALL ser obligatorio en ambos orígenes, y el código de lote SHALL ser obligatorio únicamente cuando el origen es `SOBRE`.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, buscando/seleccionando un dueño (cliente o usuario interno) desde el buscador, el origen de la semilla, el número de siembra y una `fechaSiembra`
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega obteniendo los días de crecimiento correspondientes al mes de la `fechaSiembra` y sumándolos a dicha fecha (pudiendo ser sobrescrita por el usuario)
- **AND** el formulario muestra de manera dinámica y en tiempo real el equivalente en semillas de las bandejas ingresadas, basándose en las celdas del tipo de bandeja
- **AND** el sistema registra la siembra con estado `EN_PROCESO` referenciando a la planta, bandeja y dueño correspondientes

#### Scenario: Registro con origen SOBRE
- **WHEN** el usuario selecciona el origen `SOBRE` en el formulario de siembra
- **THEN** el formulario muestra el campo de código de lote y lo marca como obligatorio
- **AND** el sistema rechaza el registro si el código de lote está vacío
- **AND** el sistema persiste la siembra con `tipoOrigen = SOBRE`, el código de lote ingresado y el número de siembra ingresado

#### Scenario: Registro con origen SUELTO
- **WHEN** el usuario selecciona el origen `SUELTO` en el formulario de siembra
- **THEN** el formulario oculta el campo de código de lote y descarta cualquier valor que se hubiera cargado previamente en él
- **AND** el sistema persiste la siembra con `tipoOrigen = SUELTO`, código de lote nulo y el número de siembra ingresado
- **AND** el sistema rechaza el registro si se envía un código de lote con contenido junto a un origen `SUELTO`

#### Scenario: Número de siembra obligatorio en cualquier origen
- **WHEN** el usuario intenta guardar una siembra sin número de siembra, con origen `SOBRE` o `SUELTO`
- **THEN** el sistema rechaza el registro e informa que el número de siembra es obligatorio

#### Scenario: Cambio de origen durante la edición
- **WHEN** el usuario edita una siembra existente con origen `SOBRE` y cambia el origen a `SUELTO`
- **THEN** el sistema limpia el código de lote de esa siembra y lo persiste como nulo
- **AND** el número de siembra se conserva sin cambios

## ADDED Requirements

### Requirement: Trazabilidad de Siembras por Sobre y Cliente
El sistema SHALL permitir que varias siembras distintas compartan el mismo código de lote, dado que de un mismo sobre de semillas pueden salir siembras para clientes diferentes. El número de siembra SHALL identificar a cada siembra por separado y es el valor que el vivero replica en todas las bandejas de esa siembra para vincularlas con su dueño y con su sobre de procedencia. El sistema SHALL NOT imponer una restricción de unicidad sobre el código de lote.

#### Scenario: Un sobre repartido entre varios clientes
- **WHEN** el usuario registra tres siembras con origen `SOBRE`, el mismo código de lote y tres dueños distintos, asignando a cada una un número de siembra diferente
- **THEN** el sistema persiste las tres siembras sin error de duplicación
- **AND** cada siembra conserva su propio número de siembra y su propio dueño

#### Scenario: Búsqueda por número de siembra
- **WHEN** el usuario busca en el listado de siembras usando un número de siembra
- **THEN** el sistema muestra las siembras cuyo número de siembra coincide con el término buscado

#### Scenario: Visualización del origen en el listado
- **WHEN** el usuario consulta el listado de siembras
- **THEN** cada siembra muestra su número de siembra y su origen
- **AND** las siembras con origen `SOBRE` muestran además su código de lote
- **AND** las siembras con origen `SUELTO` no muestran código de lote alguno
