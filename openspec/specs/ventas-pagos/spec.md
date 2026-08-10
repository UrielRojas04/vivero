# ventas-pagos Specification

## Purpose
TBD - created by archiving change us-013-ventas-pagos.

## Requirements

### Requirement: Registro de Pagos
El sistema SHALL permitir asociar múltiples pagos a una Venta. Cada pago MUST indicar el monto, método de pago y fecha.

#### Scenario: Pago parcial en efectivo
- **WHEN** el usuario ingresa un pago en EFECTIVO menor al total de la venta
- **THEN** el sistema registra el Pago asociado a la Venta por ese monto.

### Requirement: Descuentos sobre Ventas
El sistema SHALL permitir registrar un porcentaje de descuento sobre el subtotal de la venta.

#### Scenario: Descuento aplicado
- **WHEN** se aplica un 10% de descuento a una venta de $5000
- **THEN** el sistema calcula el descuento exacto ($500) y el totalFinal se fija en $4500.
