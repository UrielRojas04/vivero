## MODIFIED Requirements

### Requirement: Recepción de Stock
El sistema SHALL permitir ingresar stock a los productos del catálogo mediante diferentes mecanismos.

#### Scenario: Ingreso desde Siembra finalizada
- **WHEN** el usuario procesa la finalización de un lote de siembra
- **THEN** el stock del producto seleccionado se incrementa de acuerdo a la cantidad cosechada de la siembra
- **AND** se registra un movimiento de stock de tipo `INGRESO_SIEMBRA` con referencia al lote de la siembra
