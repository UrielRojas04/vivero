## ADDED Requirements

### Requirement: Visibilidad de las devoluciones de producto en la factura del cliente
La factura de un cliente SHALL reflejar las devoluciones de producto sobrante como parte de su detalle de pagos. El `Pago` generado por una devolución SHALL computarse en `totalPagos` y, en consecuencia, reducir el `saldoDeudor` con el mismo criterio que cualquier otro pago acreditado (`saldoDeudor = totalVentas + totalConceptos − totalPagos`). El sistema SHALL NOT modificar el saldo de la cuenta corriente de un cliente por una devolución sin que ese movimiento sea visible en el detalle de la factura.

#### Scenario: La devolución aparece en el detalle de pagos
- **WHEN** un usuario abre la factura activa de un cliente que registró una devolución de producto sobrante
- **THEN** la devolución aparece como una línea en el detalle de pagos, con su fecha, su monto y su método identificándola como devolución

#### Scenario: La devolución reduce el saldo deudor de la factura
- **WHEN** se registra una devolución de producto sobrante por un monto determinado sobre la factura activa de un cliente
- **THEN** el `totalPagos` de la factura aumenta en ese monto y el `saldoDeudor` disminuye en ese mismo monto
- **THEN** ninguno de los demás totales de la factura (`totalVentas`, `totalConceptos`) se ve alterado por la devolución

#### Scenario: Método de pago no reconocido por la interfaz
- **WHEN** la factura renderiza un pago cuyo método es el de una devolución
- **THEN** el método se muestra tal como viene del backend, sin romper el renderizado ni requerir cambios en la interfaz

### Requirement: Descuento de las bandejas devueltas por producto en la deuda de bandejas de la factura
El cálculo de bandejas adeudadas de una factura SHALL contemplar las bandejas repuestas por devoluciones de producto sobrante, además de las repuestas por devoluciones de bandejas sueltas. Ambas SHALL alimentar el mismo historial de movimientos de bandejas del cliente, de modo que la factura las descuente por el mismo camino y sin distinguir su origen.

#### Scenario: Cliente que devuelve producto dentro del período de una factura
- **WHEN** un cliente registra una devolución de producto sobrante mientras tiene una factura activa
- **THEN** las bandejas de esa devolución se descuentan de las bandejas adeudadas de esa factura, igual que si hubiera devuelto bandejas sueltas

#### Scenario: Devolución fuera del período de la factura consultada
- **WHEN** la devolución de producto se registró fuera del rango de fechas de la factura que se está consultando
- **THEN** no se descuenta de esa factura, con el mismo criterio de rango que ya se aplica a las devoluciones de bandejas sueltas

#### Scenario: Devolución de más bandejas que las entregadas en la factura
- **WHEN** las bandejas devueltas dentro del período de una factura superan a las entregadas en esa misma factura
- **THEN** la deuda de bandejas de esa factura no baja de cero y el excedente se presenta por separado, sin que el origen de la devolución (producto o bandejas sueltas) cambie ese comportamiento
