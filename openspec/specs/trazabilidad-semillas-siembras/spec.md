## Requirements

### Requirement: Vínculo entre Registro de Semilla y Siembra
El sistema SHALL permitir que una `Siembra` de origen `SOBRE` referencie opcionalmente al `RegistroSemilla` del que provino la semilla. Un mismo `RegistroSemilla` SHALL poder vincularse a más de una `Siembra` (por ejemplo, cuando el lote se reparte en varias tandas). El vínculo SHALL ser opcional: una siembra sin registro vinculado SHALL seguir funcionando exactamente igual que antes de este change.

#### Scenario: Un mismo registro vinculado a varias siembras
- **WHEN** el usuario vincula el mismo `RegistroSemilla` a dos siembras distintas, en momentos diferentes
- **THEN** el sistema acepta ambos vínculos sin error
- **AND** ambas siembras conservan su propia referencia al mismo registro

### Requirement: Estado del Registro de Semilla
El sistema SHALL mantener en cada `RegistroSemilla` un estado con tres valores posibles: `SIN_SEMBRAR` (valor por defecto al crear el registro), `SEMBRADAS` y `CONSUMIDA`. El sistema SHALL cambiar el estado a `SEMBRADAS` automáticamente en el momento en que el registro se vincula por primera vez a una `Siembra`, sin esperar a que esa siembra finalice ni pase a stock. Un registro en estado `SEMBRADAS` SHALL seguir estando disponible para vincularse a siembras adicionales. El cambio a `CONSUMIDA` SHALL ser una acción manual del usuario, e SHALL ser una transición terminal: el sistema SHALL NOT ofrecer una forma de revertir un registro `CONSUMIDA` a un estado anterior desde la interfaz.

#### Scenario: Vinculación cambia el estado a SEMBRADAS
- **WHEN** el usuario registra una siembra con origen `SOBRE` vinculada a un `RegistroSemilla` que estaba en estado `SIN_SEMBRAR`
- **THEN** el sistema cambia el estado de ese registro a `SEMBRADAS`
- **AND** el cambio de estado ocurre en el momento de guardar la siembra, no cuando la siembra finaliza o pasa a stock

#### Scenario: Un registro SEMBRADAS sigue disponible para vincular
- **WHEN** el usuario busca registros de semilla para vincular a una nueva siembra
- **THEN** el buscador incluye los registros en estado `SIN_SEMBRAR` y `SEMBRADAS`
- **AND** el buscador SHALL NOT incluir los registros en estado `CONSUMIDA`

#### Scenario: Marcar un registro como consumido
- **WHEN** el usuario aprieta el botón "Consumir" sobre un registro de semilla en estado `SIN_SEMBRAR` o `SEMBRADAS`
- **THEN** el sistema cambia el estado del registro a `CONSUMIDA`
- **AND** el registro deja de aparecer como opción en el buscador de vinculación de nuevas siembras
- **AND** el registro sigue visible en el listado general de Ingresos de Semillas, con su estado indicado

### Requirement: Fecha de Siembra Programada del Registro de Semilla
El sistema SHALL permitir registrar opcionalmente, en cada `RegistroSemilla`, una fecha de siembra programada, distinta e independiente de la fecha de recepción. Esta fecha SHALL representar cuándo corresponde sembrar ese lote de semilla, que puede ser muy posterior a la fecha en que el cliente la trajo.

#### Scenario: Registro de una fecha de siembra futura
- **WHEN** el usuario da de alta un registro de semilla e ingresa una fecha de siembra programada posterior a la fecha de recepción
- **THEN** el sistema persiste ambas fechas de forma independiente
- **AND** el listado de Ingresos de Semillas muestra la fecha de siembra programada cuando está cargada

#### Scenario: Registro sin fecha de siembra programada
- **WHEN** el usuario da de alta un registro de semilla sin completar la fecha de siembra programada
- **THEN** el sistema acepta el registro igualmente, dejando esa fecha nula
- **AND** ese registro no aparece en ninguno de los filtros de quincena

### Requirement: Filtros de Quincena en Ingresos de Semillas
El sistema SHALL ofrecer, junto a la barra de búsqueda del listado de Ingresos de Semillas, dos filtros: "Quincena actual" y "Próxima quincena". Cada quincena SHALL calcularse a partir de la fecha del día en que se consulta el listado (días 1 a 15 y 16 a fin de mes de cada mes), sin requerir selección manual de mes ni año. Al activar un filtro, el sistema SHALL mostrar únicamente los registros cuya fecha de siembra programada caiga dentro del rango de esa quincena y cuyo estado no sea `CONSUMIDA` (un registro `SEMBRADAS` sigue siendo relevante para el filtro, ya que puede volver a vincularse a otra siembra).

#### Scenario: Filtrar por la quincena actual
- **WHEN** el usuario aprieta el filtro "Quincena actual" el día 20 de un mes
- **THEN** el sistema muestra únicamente los registros con fecha de siembra programada entre el día 16 y el último día de ese mes

#### Scenario: Filtrar por la próxima quincena cruzando de mes
- **WHEN** el usuario aprieta el filtro "Próxima quincena" el día 28 de un mes
- **THEN** el sistema muestra únicamente los registros con fecha de siembra programada entre el día 1 y el día 15 del mes siguiente

#### Scenario: Combinar el filtro de quincena con la búsqueda por texto
- **WHEN** el usuario activa el filtro "Quincena actual" y además escribe un término en la barra de búsqueda
- **THEN** el sistema muestra sólo los registros que cumplen ambas condiciones a la vez

#### Scenario: Los registros consumidos no aparecen en los filtros de quincena
- **WHEN** un registro de semilla en estado `CONSUMIDA` tiene una fecha de siembra programada dentro de la quincena actual
- **THEN** el filtro "Quincena actual" no lo incluye
- **AND** un registro en estado `SEMBRADAS` con fecha dentro del mismo rango sí se sigue mostrando
