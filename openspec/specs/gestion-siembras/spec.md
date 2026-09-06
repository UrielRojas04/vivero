## Purpose

Permitir que el sistema de siembras distinga claramente entre el código de lote del proveedor (cuando la semilla llega en sobre) y el número de siembra interno asignado por el vivero, facilitando la trazabilidad entre bandeja, sobre y cliente. Además, soportar el registro de siembras con origen en semilla suelta, sin código de lote, manteniendo un identificador único por siembra.
## Requirements
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

### Requirement: Finalización de Siembra (Ingreso a Stock)
El sistema SHALL permitir al usuario marcar una siembra como finalizada y transferir las plantas resultantes al stock de un producto.

#### Scenario: Transición a catálogo
- **WHEN** el usuario marca una siembra como "Lista para entregar"
- **THEN** el sistema solicita seleccionar un Producto existente del catálogo y confirmar la cantidad final lograda
- **AND** el sistema suma esa cantidad al stock del producto seleccionado
- **AND** la siembra cambia su estado a `FINALIZADA`

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

