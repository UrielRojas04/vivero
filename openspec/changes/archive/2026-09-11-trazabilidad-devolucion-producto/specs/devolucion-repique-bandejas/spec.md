## MODIFIED Requirements

### Requirement: Registro de devolución de bandejas llenas
El sistema MUST permitir al usuario registrar la devolución de bandejas llenas (repique/sobrante) por parte de un cliente. La operación MUST dejar rastro itemizado de los dos movimientos que produce: el crédito en dinero MUST quedar asentado como un `Pago` de la factura del cliente, y la bandeja repuesta MUST quedar asentada como un movimiento de tipo `DEVOLUCION` en el historial de bandejas. La operación MUST NOT limitarse a modificar los saldos acumulados (`CuentaCorrienteDinero.balancePesos`, `CuentaCorrienteBandejas.balanceBandejas`) sin dejar esos registros.

#### Scenario: Cliente devuelve bandejas sobrantes
- **WHEN** el usuario ingresa el cliente, el producto devuelto, la cantidad, el monto a acreditar y confirma la operación
- **THEN** el sistema registra la devolución, incrementa el stock físico del producto, y genera un crédito a favor en la cuenta corriente del cliente

#### Scenario: La devolución deja rastro además de mover los saldos
- **WHEN** se registra una devolución de producto sobrante con cantidad y monto a acreditar
- **THEN** además de mover los saldos, el sistema crea un `Pago` asociado a la factura del cliente y un movimiento `DEVOLUCION` en el historial de bandejas, dentro de la misma transacción

#### Scenario: Los saldos acumulados no cambian su valor final
- **WHEN** se registra una devolución de producto sobrante después de este cambio
- **THEN** los valores finales de `CuentaCorrienteDinero.balancePesos` y `CuentaCorrienteBandejas.balanceBandejas` son exactamente los mismos que producía la operación antes del cambio, porque se agregaron registros de trazabilidad y no se modificó el cálculo de los saldos

#### Scenario: Falla al escribir el rastro
- **WHEN** la creación del `Pago` o del movimiento de historial de bandejas falla
- **THEN** la operación completa se revierte —producto de devolución, movimiento de stock, saldos y registros— y no queda un saldo movido sin su rastro correspondiente

## ADDED Requirements

### Requirement: Registro del crédito de la devolución como pago de la factura
Al registrar una devolución de producto sobrante con un monto a acreditar mayor que cero, el sistema SHALL crear un `Pago` asociado a la factura en estado `ABIERTA` del cliente en la unidad de negocio activa, con el monto acreditado, la fecha de la operación y un `metodoPago` que lo identifique como devolución y no como un cobro en efectivo, cheque ni transferencia. El sistema SHALL seguir actualizando el `balancePesos` de la cuenta corriente del cliente como lo hacía antes: el `Pago` se agrega al registro existente, no lo reemplaza.

#### Scenario: Devolución con monto a acreditar
- **WHEN** se registra una devolución de producto sobrante con un monto a acreditar mayor que cero
- **THEN** queda creado un `Pago` por ese monto, ligado a la factura `ABIERTA` del cliente, con un método que lo identifica como devolución
- **THEN** el `balancePesos` de la cuenta corriente del cliente aumenta en ese mismo monto, igual que antes del cambio

#### Scenario: Devolución sin monto a acreditar
- **WHEN** se registra una devolución de producto sobrante con el monto a acreditar nulo o en cero
- **THEN** el sistema no crea ningún `Pago`, para no ensuciar la factura con un movimiento de importe cero, y tampoco modifica el `balancePesos`

#### Scenario: El pago de la devolución no se imputa a una cuenta de Abono
- **WHEN** se crea el `Pago` de una devolución de producto sobrante
- **THEN** el pago queda sin cuenta de Abono asignada, de modo que no se computa como ingreso en los totales de rendición del colega ni del jefe

### Requirement: Apertura automática de factura al registrar una devolución
Si al registrar una devolución de producto sobrante el cliente no tiene una factura en estado `ABIERTA` en la unidad de negocio activa, el sistema SHALL abrir una automáticamente —con el mismo criterio con el que ya se abre una factura al registrar una venta— y asociarle el `Pago` de la devolución. El sistema SHALL NOT rechazar la devolución por ausencia de factura abierta, y SHALL NOT crear una segunda factura abierta cuando el cliente ya tiene una.

#### Scenario: Cliente con factura abierta
- **WHEN** se registra una devolución de un cliente que ya tiene una factura `ABIERTA` en la unidad de negocio activa
- **THEN** el `Pago` se asocia a esa factura existente y no se crea ninguna factura nueva

#### Scenario: Cliente sin factura abierta
- **WHEN** se registra una devolución de un cliente que no tiene ninguna factura `ABIERTA` en la unidad de negocio activa
- **THEN** el sistema abre una factura nueva en estado `ABIERTA` con su fecha de apertura, le asocia el `Pago` de la devolución, y la operación se completa con éxito

#### Scenario: Sin unidad de negocio activa
- **WHEN** se intenta registrar una devolución de producto sobrante sin una unidad de negocio activa en el contexto de la petición
- **THEN** el sistema rechaza la operación antes de modificar ningún saldo, en lugar de acreditar el monto sin poder dejar el rastro en ninguna factura

### Requirement: Registro de la bandeja repuesta en el historial de bandejas
Al registrar una devolución de producto sobrante con una cantidad mayor que cero, el sistema SHALL asentar un movimiento en el historial de bandejas del cliente con tipo `DEVOLUCION`, la cantidad devuelta, la fecha de la operación y el usuario que la realizó — el mismo registro que ya genera la devolución de bandejas sueltas. El movimiento SHALL quedar sin venta asociada, por no provenir de una venta puntual. El sistema SHALL seguir descontando la cantidad del `balanceBandejas` del cliente como lo hacía antes.

#### Scenario: La bandeja devuelta aparece en el historial
- **WHEN** se registra una devolución de producto sobrante de una cantidad mayor que cero
- **THEN** al consultar el historial de bandejas del cliente aparece un movimiento de tipo `DEVOLUCION` por esa cantidad, con su fecha y el usuario que registró la operación
- **THEN** el `balanceBandejas` del cliente disminuye en esa misma cantidad, igual que antes del cambio

#### Scenario: El movimiento no queda ligado a una venta
- **WHEN** se consulta el movimiento de historial generado por una devolución de producto sobrante
- **THEN** el movimiento no tiene venta asociada, con el mismo criterio que la devolución de bandejas sueltas

#### Scenario: La devolución de bandejas sueltas no cambia
- **WHEN** se registra una devolución de bandejas sueltas, sin producto
- **THEN** el comportamiento es exactamente el mismo que antes de este cambio: un movimiento `DEVOLUCION` en el historial y el descuento del balance, sin ningún efecto sobre la factura del cliente
