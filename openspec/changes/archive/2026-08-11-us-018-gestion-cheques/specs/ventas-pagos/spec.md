## MODIFIED Requirements

### Requirement: Registro de Pagos
El sistema SHALL permitir asociar múltiples pagos a una Venta. Cada pago MUST indicar el monto, método de pago y fecha. Si el método de pago seleccionado es CHEQUE, el sistema SHALL permitir (pero no obligar) ingresar los metadatos del cheque (banco, número de serie, fecha de cobro) asociándolos automáticamente a la Venta y Cliente.

#### Scenario: Pago parcial en efectivo
- **WHEN** el usuario ingresa un pago en EFECTIVO menor al total de la venta
- **THEN** el sistema registra el Pago asociado a la Venta por ese monto.

#### Scenario: Pago con Cheque detallado
- **WHEN** el usuario selecciona CHEQUE como método de pago e ingresa datos como banco "Santander" y monto
- **THEN** el sistema registra el Pago asociado a la Venta y paralelamente persiste el objeto Cheque vinculado a esa Venta.
