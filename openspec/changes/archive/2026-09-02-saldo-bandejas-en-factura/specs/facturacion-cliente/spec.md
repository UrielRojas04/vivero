## ADDED Requirements

### Requirement: Transporte del saldo de bandejas del cliente en el documento de factura

El `FacturaClienteDTO` SHALL incluir un campo `saldoBandejas` de tipo entero con el saldo vigente de bandejas del cliente titular de la factura, tomado de `CuentaCorrienteBandejas.balanceBandejas`. El campo SHALL ser de sólo lectura: ninguna operación sobre la factura —apertura, carga de conceptos, registro de pagos ni cierre— SHALL modificar el saldo de bandejas del cliente. El mapeo SHALL ser tolerante a la ausencia de cuenta corriente de bandejas, devolviendo cero en ese caso. El dato SHALL viajar en el DTO ya existente, sin endpoint adicional.

#### Scenario: Cliente con bandejas pendientes de devolución

- **WHEN** se consulta la factura de un cliente cuya cuenta corriente de bandejas registra un saldo distinto de cero
- **THEN** el `FacturaClienteDTO` devuelto incluye `saldoBandejas` con ese mismo valor

#### Scenario: Cliente sin cuenta corriente de bandejas

- **WHEN** se consulta la factura de un cliente que nunca tuvo movimientos de bandejas y por lo tanto no tiene cuenta corriente de bandejas asociada
- **THEN** el `FacturaClienteDTO` devuelve `saldoBandejas` en cero, sin fallar ni devolver un valor nulo

#### Scenario: El saldo de bandejas no se altera al operar sobre la factura

- **WHEN** se registra un pago, se agrega un concepto o se cierra la factura de un cliente con bandejas pendientes
- **THEN** el saldo de bandejas del cliente queda idéntico al que tenía antes de la operación, y el DTO devuelto por esa operación lo refleja sin cambios

#### Scenario: El campo se resuelve dentro de la transacción de lectura

- **WHEN** se construye el DTO de cualquier factura, incluidas todas las facturas devueltas por la consulta del historial
- **THEN** el saldo de bandejas se resuelve correctamente para cada una, sin error de inicialización de la relación perezosa entre el cliente y su cuenta corriente de bandejas

### Requirement: Presentación del saldo de bandejas en el documento de factura

El documento de factura del cliente SHALL mostrar el saldo de bandejas del cliente en su cabecera, junto a los datos identificatorios del cliente y no entre los totales en dinero, de modo que quede claro que es una deuda física independiente que no suma al total a pagar. El saldo SHALL presentarse como el número de bandejas acompañado de su unidad y rotulado como saldo de bandejas, empleando el mismo fraseo ya establecido para este dato en el listado de clientes. El color SHALL ser semántico y no de acento: tono de advertencia cuando el cliente tiene bandejas pendientes, y tono neutro cuando el saldo es cero o negativo. El total a pagar de la factura SHALL seguir expresándose exclusivamente en dinero, sin verse afectado por el saldo de bandejas.

#### Scenario: Cliente con bandejas pendientes en la unidad Vivero

- **WHEN** el usuario abre la factura activa de un cliente con bandejas pendientes teniendo Vivero como unidad de negocio activa
- **THEN** la cabecera del documento muestra el saldo de bandejas con el tono de advertencia, y el total a pagar sigue mostrando únicamente el importe en dinero

#### Scenario: Cliente sin bandejas pendientes en la unidad Vivero

- **WHEN** el usuario abre la factura activa de un cliente cuyo saldo de bandejas es cero teniendo Vivero como unidad de negocio activa
- **THEN** la cabecera muestra el saldo en cero con el tono neutro, sin usar el tono de advertencia

#### Scenario: El saldo de bandejas no se contabiliza como dinero

- **WHEN** se renderiza una factura de un cliente con bandejas pendientes
- **THEN** el total de ventas, el total de conceptos, el total de pagos, el saldo deudor y el total a pagar conservan exactamente el mismo valor que tendrían si el cliente no debiera ninguna bandeja

### Requirement: El saldo de bandejas se muestra únicamente en la unidad de negocio Vivero

El documento de factura SHALL mostrar el saldo de bandejas sólo cuando la unidad de negocio activa es Vivero, porque las bandejas no son un concepto de las unidades de Herramientas ni de Abono. El criterio SHALL expresarse como una habilitación explícita de Vivero y no como una exclusión de las demás unidades, de modo que una unidad de negocio que se cree en el futuro no herede la presentación del dato sin una decisión explícita. Fuera de Vivero, el documento SHALL renderizarse exactamente como antes de este cambio.

#### Scenario: Unidad de negocio Herramientas

- **WHEN** el usuario abre la factura de un cliente teniendo Herramientas como unidad de negocio activa
- **THEN** el documento no muestra ninguna referencia al saldo de bandejas, ni siquiera en cero

#### Scenario: Unidad de negocio Abono

- **WHEN** el usuario abre la factura de un cliente teniendo Abono como unidad de negocio activa
- **THEN** el documento no muestra ninguna referencia al saldo de bandejas

#### Scenario: Unidad de negocio creada con posterioridad a este cambio

- **WHEN** el usuario abre la factura de un cliente teniendo como unidad activa una unidad de negocio distinta de Vivero, Herramientas y Abono
- **THEN** el documento no muestra el saldo de bandejas, por resolverse el criterio como habilitación explícita de Vivero

### Requirement: El saldo de bandejas se muestra sólo sobre la factura vigente

El saldo de bandejas es un saldo actual del cliente y no una fotografía del momento en que se cerró una factura. El documento SHALL mostrarlo únicamente al renderizar la factura activa del cliente, y SHALL NOT mostrarlo al renderizar las facturas cerradas del historial, para no atribuir a una factura pasada un saldo que corresponde al presente.

#### Scenario: Factura cerrada del historial

- **WHEN** el usuario despliega una factura cerrada desde la pestaña de historial, estando en la unidad Vivero
- **THEN** esa factura se muestra sin el saldo de bandejas, aunque el cliente tenga bandejas pendientes hoy

#### Scenario: Factura activa y factura cerrada en la misma sesión

- **WHEN** el usuario consulta la factura activa de un cliente con bandejas pendientes y luego despliega una de sus facturas cerradas
- **THEN** el saldo de bandejas aparece únicamente en la factura activa

### Requirement: El saldo de bandejas viaja en la imagen exportada del documento

El saldo de bandejas SHALL formar parte del contenido que se rasteriza al exportar el documento como imagen, con la misma legibilidad que tiene en pantalla, porque esa imagen es el artefacto que se le envía al cliente para reclamarle la devolución. La exportación SHALL seguir funcionando exactamente igual que antes de este cambio: no se altera el procedimiento de captura ni el comportamiento de los indicadores de resumen, que continúan ocultándose durante la exportación.

#### Scenario: Exportación de la factura de un cliente con bandejas pendientes

- **WHEN** el usuario exporta como imagen la factura activa de un cliente con bandejas pendientes, en la unidad Vivero
- **THEN** la imagen resultante incluye el saldo de bandejas con sus tokens de tema claro, igual que el resto del documento exportado

#### Scenario: La fila de indicadores de resumen conserva su comportamiento

- **WHEN** se exporta como imagen cualquier factura
- **THEN** los indicadores de resumen de importes siguen sin aparecer en la imagen, tal como ocurría antes de este cambio, y el saldo de bandejas sí aparece por estar en la cabecera del documento
