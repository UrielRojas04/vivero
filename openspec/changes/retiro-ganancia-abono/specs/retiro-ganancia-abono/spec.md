## ADDED Requirements

### Requirement: Registro de Retiros de Ganancia Personal

El sistema SHALL permitir que el jefe o el colega de Abono registren que retiraron un monto de su propia ganancia ya generada, para uso personal. El registro SHALL guardar el monto, la fecha, una observación opcional y de qué cuenta operativa (`JEFE`/`COLEGA`) fue el retiro.

La cuenta del retiro MUST NOT ser elegida por quien lo registra: SHALL derivarse de la cuenta operativa activa de la sesión, con el mismo criterio que ya usa el registro de rendiciones (ningún tercer usuario cae en una cuenta por defecto).

Esta funcionalidad SHALL ser exclusiva de la unidad de negocio Abono.

#### Scenario: El jefe registra un retiro

- **WHEN** el jefe registra un retiro de ganancia por un monto positivo
- **THEN** el sistema persiste el retiro asociado a la cuenta `JEFE`, con su fecha y observación

#### Scenario: El colega registra un retiro

- **WHEN** el colega registra un retiro de ganancia por un monto positivo
- **THEN** el sistema persiste el retiro asociado a la cuenta `COLEGA`, con su fecha y observación

#### Scenario: Rechazo de monto no positivo

- **WHEN** se intenta registrar un retiro de ganancia de monto cero o negativo
- **THEN** el sistema rechaza la operación con un error de validación

#### Scenario: Rechazo sin cuenta operativa resuelta

- **WHEN** un usuario autenticado sin cuenta operativa resuelta (ni jefe ni colega) intenta registrar un retiro
- **THEN** el sistema rechaza la operación en vez de atribuirlo a una cuenta por defecto

### Requirement: Retiro de Ganancia Es un Concepto Independiente de las Rendiciones

El registro de retiros de ganancia SHALL ser independiente de las rendiciones del colega (entrega de dinero operativo entre jefe y colega). Ninguna de las dos funcionalidades SHALL modificar el comportamiento ni los datos de la otra.

#### Scenario: Registrar un retiro no afecta las rendiciones

- **WHEN** se registra un retiro de ganancia
- **THEN** el historial y el saldo de rendiciones del colega permanecen exactamente iguales a como estaban antes

#### Scenario: Registrar una rendición no afecta los retiros de ganancia

- **WHEN** se registra una rendición del colega al jefe (o viceversa)
- **THEN** el historial y la ganancia disponible de retiros permanecen exactamente iguales a como estaban antes

### Requirement: Ganancia Disponible Acumulada por Persona

El sistema SHALL calcular, para cada cuenta operativa (`JEFE` y `COLEGA`), una ganancia disponible acumulada desde el inicio de la operación del negocio (no acotada a un período elegido por el usuario), igual a la ganancia teórica acumulada que le corresponde según el reparto configurado, menos la suma de todos los retiros de ganancia ya registrados por esa cuenta.

La ganancia teórica acumulada SHALL calcularse con el mismo criterio de reparto que ya usa la liquidación por período (ingresos por cobros, menos gastos de insumos y gastos manuales de Abono, repartidos según el porcentaje de reparto configurado y el modo de reparto vigente).

#### Scenario: Ganancia disponible sin retiros previos

- **WHEN** una cuenta operativa nunca registró un retiro de ganancia
- **THEN** su ganancia disponible acumulada es igual a su ganancia teórica acumulada completa

#### Scenario: Ganancia disponible tras uno o más retiros

- **WHEN** una cuenta operativa ya registró uno o más retiros de ganancia
- **THEN** su ganancia disponible acumulada es su ganancia teórica acumulada menos la suma de esos retiros

#### Scenario: Los gastos manuales de Finanzas restan de la ganancia acumulada

- **WHEN** existen gastos manuales cargados desde Finanzas para la unidad Abono, además de gastos de insumos
- **THEN** ambos se descuentan de la ganancia neta acumulada usada para calcular la ganancia teórica de cada cuenta

#### Scenario: Los retiros del jefe no afectan la ganancia disponible del colega

- **WHEN** el jefe registra un retiro de ganancia
- **THEN** la ganancia disponible acumulada del colega no cambia

#### Scenario: Los retiros del colega no afectan la ganancia disponible del jefe

- **WHEN** el colega registra un retiro de ganancia
- **THEN** la ganancia disponible acumulada del jefe no cambia

### Requirement: El Sobre-Retiro Está Permitido

El sistema MUST NOT bloquear el registro de un retiro de ganancia cuyo monto supere la ganancia disponible acumulada de esa cuenta en ese momento. La ganancia disponible acumulada SHALL poder quedar en un valor negativo tras un sobre-retiro, y ese valor negativo SHALL reflejarse en los cálculos siguientes.

#### Scenario: Retiro mayor a la ganancia disponible

- **WHEN** una cuenta operativa registra un retiro de ganancia por un monto mayor a su ganancia disponible acumulada
- **THEN** el sistema acepta el retiro sin error y la ganancia disponible de esa cuenta queda en un valor negativo

#### Scenario: Ganancia disponible negativa se descuenta de retiros futuros

- **WHEN** una cuenta operativa tiene ganancia disponible negativa y luego el negocio genera más ganancia
- **THEN** la nueva ganancia disponible acumulada refleja la ganancia teórica actualizada menos el total histórico de retiros, incluido el sobre-retiro previo

### Requirement: Historial de Retiros No Se Particiona por Cuenta

El historial de retiros de ganancia SHALL mostrar los retiros de ambas cuentas operativas juntos, sin importar cuál sea la cuenta activa de quien lo consulta, indicando en cada fila de qué cuenta fue cada retiro.

#### Scenario: El jefe ve también los retiros del colega

- **WHEN** el jefe consulta el historial de retiros de ganancia y existen retiros hechos por el colega
- **THEN** el listado incluye los retiros del colega además de los del jefe

#### Scenario: El colega ve también los retiros del jefe

- **WHEN** el colega consulta el historial de retiros de ganancia y existen retiros hechos por el jefe
- **THEN** el listado incluye los retiros del jefe además de los del colega

#### Scenario: El historial se devuelve paginado

- **WHEN** se consulta el historial de retiros de ganancia
- **THEN** la respuesta contiene una página de resultados, sin exponer un listado sin límite de cantidad

### Requirement: Acceso Restringido al Permiso Financiero

El registro y la consulta de retiros de ganancia, así como la consulta de la ganancia disponible acumulada, SHALL exigir el permiso `LEER_FINANZAS`. El sistema MUST NOT crear un permiso nuevo para esta funcionalidad.

#### Scenario: Usuario con el permiso financiero puede registrar y consultar

- **WHEN** un usuario con el permiso `LEER_FINANZAS` registra un retiro de ganancia o consulta el historial o la ganancia disponible
- **THEN** el sistema completa la operación

#### Scenario: Usuario sin el permiso financiero no puede registrar ni consultar

- **WHEN** un usuario autenticado sin el permiso `LEER_FINANZAS` intenta registrar un retiro de ganancia, consultar el historial o consultar la ganancia disponible
- **THEN** el sistema rechaza la petición
