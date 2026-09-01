## ADDED Requirements

### Requirement: Stock de Abono Desagregado por Ubicación
El sistema SHALL mantener el stock de bolsas de abono desagregado por ubicación física, en una estructura propia de la unidad Abono formada por la combinación producto + ubicación + cantidad, con dos ubicaciones fijas: `INVERNADERO` y `DEPOSITO_COLEGA`. La cantidad de una combinación producto+ubicación MUST NOT ser negativa. Esta estructura MUST ser independiente de `Producto.stock`, `MovimientoStock` y `CapaCostoStock`, que MUST permanecer sin modificaciones de esquema ni de comportamiento para las unidades Vivero y Herramientas.

#### Scenario: Unicidad de producto por ubicación
- **WHEN** se consulta el stock de una categoría en una ubicación
- **THEN** existe a lo sumo un registro para esa combinación producto+ubicación

#### Scenario: El stock general no se ve afectado
- **WHEN** se registran producciones, traslados y ventas en la unidad Abono
- **THEN** el stock y los movimientos de los productos de Vivero y Herramientas quedan exactamente como estaban

#### Scenario: Rechazo de cantidad negativa
- **WHEN** una operación dejaría la cantidad de una combinación producto+ubicación por debajo de cero
- **THEN** el sistema rechaza la operación completa y no persiste ningún cambio parcial

### Requirement: Registro de Producción Diaria
El sistema SHALL permitir registrar la producción diaria de bolsas indicando categoría, cantidad y fecha, sumando esa cantidad al stock de la ubicación `INVERNADERO`. El registro MUST NOT descontar insumos ni consumir receta alguna: es un conteo manual de lo fabricado.

#### Scenario: Alta de producción
- **WHEN** el usuario registra 50 bolsas de "Categoría 2" producidas hoy
- **THEN** el stock de "Categoría 2" en `INVERNADERO` aumenta en 50 y queda asentado un movimiento de tipo producción con fecha, categoría, cantidad y usuario

#### Scenario: Producción sin consumo de insumos
- **WHEN** se registra una producción de bolsas
- **THEN** ningún insumo ve modificado su stock ni su costo

#### Scenario: Rechazo de cantidad no positiva
- **WHEN** el usuario intenta registrar una producción con cantidad cero o negativa
- **THEN** el sistema rechaza la operación con un error de validación

### Requirement: Traslado entre Ubicaciones
El sistema SHALL permitir registrar el traslado de N bolsas de una categoría desde `INVERNADERO` hacia `DEPOSITO_COLEGA`, restando de la ubicación origen y sumando a la ubicación destino en una única transacción atómica, y dejando asentado el movimiento con fecha, categoría, cantidad, cuenta responsable y usuario que lo registró.

#### Scenario: Traslado exitoso
- **WHEN** hay 50 bolsas de "Categoría 2" en `INVERNADERO` y se trasladan 15 al `DEPOSITO_COLEGA`
- **THEN** `INVERNADERO` queda con 35, `DEPOSITO_COLEGA` queda con 15 y se asienta un movimiento de traslado por 15

#### Scenario: Traslado sin stock suficiente
- **WHEN** hay 10 bolsas de "Categoría 2" en `INVERNADERO` y se intentan trasladar 15
- **THEN** el sistema rechaza el traslado con un error explícito y ninguna de las dos ubicaciones cambia

#### Scenario: Atomicidad del traslado
- **WHEN** un traslado falla al aplicar el lado del destino
- **THEN** el descuento del origen también se revierte y el stock total de la categoría se conserva

### Requirement: Vista Consolidada de Stock por Ubicación
El sistema SHALL exponer una vista que muestre, para cada categoría de bolsa, la cantidad disponible en `INVERNADERO`, la cantidad en `DEPOSITO_COLEGA` y el total, entregada mediante DTO y nunca como entidad JPA.

#### Scenario: Consulta del stock consolidado
- **WHEN** un usuario con la unidad activa "Abono" consulta la vista de stock
- **THEN** el sistema devuelve una fila por categoría con las cantidades por ubicación y su total

#### Scenario: Categoría sin stock en una ubicación
- **WHEN** una categoría no tiene ningún registro en `DEPOSITO_COLEGA`
- **THEN** la vista informa 0 para esa ubicación en lugar de omitir la categoría

### Requirement: Descuento de Stock en la Venta de Abono
El sistema SHALL descontar el stock de las ventas de la unidad Abono de la ubicación que corresponde a la cuenta activa de la petición: `JEFE` descuenta de `INVERNADERO` y `COLEGA` descuenta de `DEPOSITO_COLEGA`. La venta SHALL validar la disponibilidad en esa ubicación específica antes de confirmarse. Las ventas de las unidades Vivero y Herramientas MUST seguir descontando de `Producto.stock` exactamente como antes del change.

#### Scenario: Venta del colega descuenta de su depósito
- **WHEN** se registra una venta de 5 bolsas de "Categoría 1" con la cuenta activa "Colega"
- **THEN** el stock de "Categoría 1" en `DEPOSITO_COLEGA` baja en 5 y el de `INVERNADERO` queda sin cambios

#### Scenario: Venta del jefe descuenta del invernadero
- **WHEN** se registra una venta de 5 bolsas de "Categoría 1" con la cuenta activa "Jefe"
- **THEN** el stock de "Categoría 1" en `INVERNADERO` baja en 5 y el de `DEPOSITO_COLEGA` queda sin cambios

#### Scenario: Venta sin stock en la ubicación de la cuenta
- **WHEN** el colega intenta vender 5 bolsas y su depósito sólo tiene 2, aunque el invernadero tenga 100
- **THEN** el sistema rechaza la venta con un error explícito y no descuenta de ninguna ubicación

#### Scenario: Venta de otra unidad sin cambios
- **WHEN** se registra una venta en la unidad "Vivero" o "Herramientas"
- **THEN** el descuento de stock ocurre sobre `Producto.stock` y se registra un `MovimientoStock`, igual que antes del change, sin tocar las tablas de stock de Abono

### Requirement: Bitácora de Movimientos de Stock de Abono
El sistema SHALL mantener una bitácora inmutable de los movimientos de stock de la unidad Abono — producción, traslado y venta — registrando categoría, ubicación afectada, cantidad, tipo, cuenta responsable, usuario y fecha. Los registros de la bitácora MUST NOT editarse ni borrarse desde la interfaz.

#### Scenario: Traza de una producción
- **WHEN** se registra una producción diaria
- **THEN** la bitácora suma un movimiento de tipo producción sobre `INVERNADERO` con su cantidad, usuario y fecha

#### Scenario: Traza de una venta
- **WHEN** se confirma una venta de Abono
- **THEN** la bitácora suma un movimiento de tipo venta sobre la ubicación de la cuenta activa, referenciando la venta que lo originó

#### Scenario: Bitácora no editable
- **WHEN** un usuario consulta la bitácora de movimientos de Abono
- **THEN** los movimientos se muestran en modo lectura y no existe operación de edición ni borrado
