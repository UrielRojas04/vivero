## MODIFIED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema, incorporando retroalimentación visual sobre el equivalente en semillas en base a la cantidad y tipo de bandeja seleccionada. Además, el dueño del lote SHALL ser seleccionado desde una caja de búsqueda que incluya a los clientes registrados. El registro SHALL incluir el origen de la semilla, que puede ser `SOBRE` (semilla comercial que llega en un sobre con código de lote impreso por el proveedor) o `SUELTO` (semilla tomada de una bolsa, sin código de lote). El número de siembra SHALL ser obligatorio en ambos orígenes, y el código de lote SHALL ser obligatorio únicamente cuando el origen es `SOBRE`. El registro SHALL incluir además la fecha de siembra, entendida como el día o el período en que la semilla fue efectivamente colocada en las bandejas, y SHALL ser obligatoria en toda siembra creada o editada. Cuando el origen es `SOBRE`, el sistema SHALL permitir opcionalmente vincular la siembra a un registro de ingreso de semilla (`RegistroSemilla`) existente, buscándolo por lote, cliente o quién lo trajo, en lugar de tipear el código de lote a mano.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, buscando/seleccionando un dueño (cliente o usuario interno) desde el buscador, el origen de la semilla, el número de siembra y la fecha de siembra
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega obteniendo los días de crecimiento correspondientes al mes de la fecha de fin de siembra y sumándolos a dicha fecha (pudiendo ser sobrescrita por el usuario)
- **AND** el formulario muestra de manera dinámica y en tiempo real el equivalente en semillas de las bandejas ingresadas, basándose en las celdas del tipo de bandeja
- **AND** el sistema registra la siembra con estado `EN_PROCESO` referenciando a la planta, bandeja y dueño correspondientes

#### Scenario: Registro con origen SOBRE
- **WHEN** el usuario selecciona el origen `SOBRE` en el formulario de siembra
- **THEN** el formulario muestra un buscador de registros de ingreso de semilla (por lote, cliente o quién lo trajo), además del campo de código de lote, y marca el código de lote como obligatorio
- **AND** el buscador sólo ofrece registros de semilla cuyo estado no sea `CONSUMIDA`
- **AND** el sistema rechaza el registro si el código de lote está vacío
- **AND** el sistema persiste la siembra con `tipoOrigen = SOBRE`, el código de lote ingresado, el número de siembra ingresado y, si se seleccionó uno, el registro de semilla vinculado

#### Scenario: Selección de un registro de semilla autocompleta el código de lote y sugiere la cantidad de bandejas
- **WHEN** el usuario, con origen `SOBRE`, elige un registro de ingreso de semilla del buscador
- **THEN** el formulario autocompleta el campo de código de lote con el lote de ese registro
- **AND**, si el registro tiene su cantidad expresada en `SEMILLAS` o `SOBRES` y ya hay una `VariedadBandeja` seleccionada, el formulario propone como cantidad inicial (bandejas) el resultado de dividir la cantidad de semillas del registro por las celdas de esa bandeja, redondeando hacia abajo
- **AND** el valor propuesto de cantidad inicial queda en un campo editable: el usuario puede sobrescribirlo libremente, y el sistema no vuelve a pisar un valor que el usuario ya editó a mano en la misma sesión
- **AND** si el registro tiene su cantidad expresada en `GRAMOS`, el sistema no propone ningún valor de cantidad inicial y el campo queda para completar a mano, igual que si no se hubiera vinculado ningún registro

#### Scenario: Registro con origen SUELTO
- **WHEN** el usuario selecciona el origen `SUELTO` en el formulario de siembra
- **THEN** el formulario oculta el campo de código de lote y el buscador de registro de semilla, y descarta cualquier valor que se hubiera cargado previamente en ellos
- **AND** el sistema persiste la siembra con `tipoOrigen = SUELTO`, código de lote nulo, registro de semilla vinculado nulo y el número de siembra ingresado
- **AND** el sistema rechaza el registro si se envía un código de lote con contenido junto a un origen `SUELTO`

#### Scenario: Número de siembra obligatorio en cualquier origen
- **WHEN** el usuario intenta guardar una siembra sin número de siembra, con origen `SOBRE` o `SUELTO`
- **THEN** el sistema rechaza el registro e informa que el número de siembra es obligatorio

#### Scenario: Fecha de siembra obligatoria
- **WHEN** el usuario intenta guardar una siembra, nueva o editada, sin fecha de siembra de inicio
- **THEN** el sistema rechaza la operación e informa que la fecha de siembra es obligatoria

#### Scenario: Cambio de origen durante la edición
- **WHEN** el usuario edita una siembra existente con origen `SOBRE` y cambia el origen a `SUELTO`
- **THEN** el sistema limpia el código de lote y el registro de semilla vinculado de esa siembra, y los persiste como nulos
- **AND** el número de siembra se conserva sin cambios
