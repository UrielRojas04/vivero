## ADDED Requirements

### Requirement: Saldo en Caja del Colega
El sistema SHALL calcular el dinero que el colega debería tener en su poder en un momento dado, como: el total cobrado por sus ventas al contado, más los pagos recibidos de sus propios clientes a cuenta de ventas a crédito, menos las entregas de dinero ya rendidas al jefe. El cálculo SHALL considerar únicamente operaciones atribuidas a la cuenta `COLEGA` y SHALL exponerse mediante DTO. Esta relación financiera MUST ser independiente de `CuentaCorrienteDinero`, que sigue modelando exclusivamente la deuda de los clientes.

#### Scenario: Saldo tras una venta al contado
- **WHEN** el colega registra una venta al contado por $10.000 y no rindió nada
- **THEN** el saldo en caja del colega es $10.000

#### Scenario: Venta a crédito sin cobro
- **WHEN** el colega registra una venta a crédito por $10.000 sin recibir pago
- **THEN** el saldo en caja del colega no aumenta, y la deuda queda en la cuenta corriente del cliente

#### Scenario: Cobro posterior de una venta a crédito
- **WHEN** un cliente del colega paga $4.000 a cuenta de una venta a crédito previa
- **THEN** el saldo en caja del colega aumenta en $4.000

#### Scenario: Saldo tras una rendición
- **WHEN** el colega tiene $10.000 en caja y entrega $6.000 al jefe
- **THEN** el saldo en caja del colega pasa a $4.000

#### Scenario: Las ventas del jefe no afectan la caja del colega
- **WHEN** el jefe registra ventas con la cuenta activa "Jefe"
- **THEN** el saldo en caja del colega no cambia

#### Scenario: Saldo inicial sin operaciones
- **WHEN** no hay ninguna venta ni rendición atribuida al colega
- **THEN** el saldo en caja del colega es cero y la vista no muestra error

### Requirement: Registro de Rendiciones de Dinero
El sistema SHALL permitir al jefe registrar que el colega le entregó un monto de dinero, indicando monto, fecha y una observación opcional, descontando ese monto del saldo en caja del colega. Cada rendición SHALL quedar asentada como un movimiento consultable en un historial y MUST NOT modificar ninguna venta ni cuenta corriente de cliente.

#### Scenario: Alta de rendición
- **WHEN** el jefe registra una rendición de $6.000 con fecha de hoy
- **THEN** el sistema persiste el movimiento, lo suma al historial y el saldo en caja del colega baja $6.000

#### Scenario: Rechazo de monto no positivo
- **WHEN** el jefe intenta registrar una rendición de $0 o un monto negativo
- **THEN** el sistema rechaza la operación con un error de validación

#### Scenario: Las cuentas corrientes de clientes no se tocan
- **WHEN** se registra una rendición
- **THEN** ninguna venta cambia su estado de pago y ninguna cuenta corriente de cliente cambia su balance

#### Scenario: Historial de rendiciones
- **WHEN** el jefe consulta el historial de rendiciones
- **THEN** el sistema devuelve la lista paginada de rendiciones con monto, fecha y observación, ordenada por fecha descendente y expuesta mediante DTO

### Requirement: Dashboard de Liquidación
El sistema SHALL proveer una vista de liquidación que cruce, para un período seleccionable: las ventas totales atribuidas a cada cuenta, el dinero físico que tiene cada parte considerando lo ya rendido, y la compensación teórica entre las partes según el `porcentajeRepartoColega` configurado en la unidad. La vista SHALL ser puramente informativa: MUST NOT crear ventas, pagos, rendiciones ni movimientos de ningún tipo.

#### Scenario: Liquidación de un período
- **WHEN** el jefe consulta la liquidación para un rango de fechas
- **THEN** el sistema devuelve las ventas totales por cuenta, el dinero en poder de cada parte y la compensación teórica calculada con el porcentaje configurado

#### Scenario: Porcentaje de reparto sin configurar
- **WHEN** el `porcentajeRepartoColega` de la unidad es 0.00
- **THEN** la vista muestra ventas y caja igualmente, y señala que el porcentaje de reparto todavía no fue configurado en lugar de mostrar un cálculo engañoso

#### Scenario: La vista no mueve dinero
- **WHEN** el jefe abre y consulta la vista de liquidación varias veces
- **THEN** no se crea ni modifica ninguna venta, pago, rendición ni movimiento de stock

#### Scenario: Período sin operaciones
- **WHEN** el rango consultado no tiene ventas ni rendiciones
- **THEN** el sistema devuelve la liquidación con todos los totales en cero, sin errores

#### Scenario: Acceso restringido
- **WHEN** un usuario sin el permiso requerido para datos financieros consulta la liquidación
- **THEN** el sistema rechaza la solicitud con 403 Forbidden y no expone ningún dato
