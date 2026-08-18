## MODIFIED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema, incorporando retroalimentación visual sobre el equivalente en semillas en base a la cantidad y tipo de bandeja seleccionada. Además, el dueño del lote SHALL ser seleccionado desde una caja de búsqueda que incluya a los clientes registrados. El registro SHALL incluir el origen de la semilla, que puede ser `SOBRE` (semilla comercial que llega en un sobre con código de lote impreso por el proveedor) o `SUELTO` (semilla tomada de una bolsa, sin código de lote). El número de siembra SHALL ser obligatorio en ambos orígenes, y el código de lote SHALL ser obligatorio únicamente cuando el origen es `SOBRE`. El registro SHALL incluir además la fecha de siembra, entendida como el día o el período en que la semilla fue efectivamente colocada en las bandejas, y SHALL ser obligatoria en toda siembra creada o editada.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, buscando/seleccionando un dueño (cliente o usuario interno) desde el buscador, el origen de la semilla, el número de siembra y la fecha de siembra
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega obteniendo los días de crecimiento correspondientes al mes de la fecha de fin de siembra y sumándolos a dicha fecha (pudiendo ser sobrescrita por el usuario)
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

#### Scenario: Fecha de siembra obligatoria
- **WHEN** el usuario intenta guardar una siembra, nueva o editada, sin fecha de siembra de inicio
- **THEN** el sistema rechaza la operación e informa que la fecha de siembra es obligatoria

#### Scenario: Cambio de origen durante la edición
- **WHEN** el usuario edita una siembra existente con origen `SOBRE` y cambia el origen a `SUELTO`
- **THEN** el sistema limpia el código de lote de esa siembra y lo persiste como nulo
- **AND** el número de siembra se conserva sin cambios

## ADDED Requirements

### Requirement: Período de Siembra
El sistema SHALL registrar la fecha en que la siembra fue efectivamente ejecutada mediante dos fechas, `fechaSiembraInicio` y `fechaSiembraFin`, admitiendo dos modalidades: un día único o un rango de días, dado que una siembra de muchas bandejas puede repartirse a lo largo de varias jornadas sin dejar de ser una única siembra. Cuando la siembra se realizó en un solo día, el sistema SHALL persistir la misma fecha en ambos campos. El sistema SHALL rechazar todo registro cuya fecha de fin sea anterior a su fecha de inicio. La fecha de siembra SHALL ser un dato distinto e independiente de la fecha estimada de entrega.

#### Scenario: Registro de una siembra realizada en un solo día
- **WHEN** el usuario selecciona la modalidad "Un día" e ingresa una única fecha de siembra
- **THEN** el formulario muestra un solo campo de fecha
- **AND** el sistema persiste esa misma fecha tanto en `fechaSiembraInicio` como en `fechaSiembraFin`

#### Scenario: Registro de una siembra realizada en varios días
- **WHEN** el usuario selecciona la modalidad "Rango de días" e ingresa una fecha de inicio y una fecha de fin distintas
- **THEN** el formulario muestra dos campos de fecha, "Sembrado Desde" y "Sembrado Hasta"
- **AND** el sistema persiste la primera fecha en `fechaSiembraInicio` y la segunda en `fechaSiembraFin`

#### Scenario: Normalización de la fecha de fin ausente
- **WHEN** el sistema recibe una siembra con `fechaSiembraInicio` cargada y `fechaSiembraFin` nula
- **THEN** el sistema iguala `fechaSiembraFin` a `fechaSiembraInicio` antes de persistir
- **AND** el registro queda guardado con ambas fechas iguales, equivalente a una siembra de un solo día

#### Scenario: Rango inválido
- **WHEN** el usuario intenta guardar una siembra cuya fecha de fin es anterior a su fecha de inicio
- **THEN** el sistema rechaza la operación e informa que la fecha de fin de siembra no puede ser anterior a la de inicio

#### Scenario: Cambio de modalidad durante la edición
- **WHEN** el usuario edita una siembra registrada como rango de días y cambia la modalidad a "Un día"
- **THEN** el formulario oculta el campo de fecha de fin e iguala su valor al de la fecha de inicio
- **AND** el sistema persiste ambas fechas iguales, descartando el valor de fin previamente cargado

#### Scenario: Derivación de la modalidad al abrir una siembra existente
- **WHEN** el usuario abre en edición una siembra ya registrada
- **THEN** el formulario preselecciona la modalidad "Un día" si ambas fechas coinciden o la fecha de fin es nula
- **AND** preselecciona la modalidad "Rango de días" si las fechas difieren

#### Scenario: Visualización del período de siembra en el listado
- **WHEN** el usuario consulta el listado de siembras
- **THEN** cada siembra cuyas fechas de inicio y fin coinciden muestra la fecha de siembra como un día único
- **AND** cada siembra cuyas fechas difieren muestra el período completo, de la fecha de inicio a la de fin
- **AND** las siembras registradas antes de la incorporación de este dato, sin fecha de siembra, no muestran línea alguna de fecha de siembra en lugar de mostrar un valor vacío

#### Scenario: Cálculo de la fecha estimada de entrega a partir del período de siembra
- **WHEN** el usuario selecciona una variedad de planta y define la fecha de siembra en el formulario
- **THEN** el sistema propone como fecha estimada de entrega la fecha de fin de siembra más los días de crecimiento correspondientes al mes de esa fecha
- **AND** el sistema recalcula la propuesta cada vez que el usuario modifica la variedad o cualquiera de las dos fechas de siembra
- **AND** el usuario puede sobrescribir manualmente la fecha estimada de entrega propuesta
