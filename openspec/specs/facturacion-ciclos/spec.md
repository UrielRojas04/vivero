# facturacion-ciclos Specification

## Purpose
TBD - created by archiving change ciclos-facturacion-cliente. Update Purpose after archive.
## Requirements
### Requirement: Apertura y Asignación Automática
El sistema MUST asignar las ventas de la unidad de negocio Vivero (ID 1) a una Factura abierta del cliente. Si no existe, MUST crearla automáticamente.

#### Scenario: Cliente sin factura abierta realiza una compra
- **WHEN** se confirma una nueva Venta para un cliente en la unidad Vivero y el cliente no tiene una Factura en estado ABIERTA
- **THEN** el sistema crea una nueva Factura en estado ABIERTA y le asocia la Venta generada

#### Scenario: Cliente con factura abierta realiza una compra
- **WHEN** se confirma una nueva Venta y el cliente ya tiene una Factura ABIERTA
- **THEN** el sistema asocia la nueva Venta a la Factura ABIERTA existente sin crear una nueva

### Requirement: Ingreso de conceptos libres
El sistema MUST permitir cargar conceptos libres en dinero (fletes, recargos) directamente sobre la factura abierta.

#### Scenario: Carga de flete a la factura
- **WHEN** el usuario ingresa un concepto libre por $5000 con descripción "Flete" en la factura abierta
- **THEN** la factura aumenta su total adeudado en $5000 sin generar ningún movimiento de stock

### Requirement: Cierre de factura
El sistema MUST permitir cerrar una factura abierta, congelando su estado y previniendo nuevas modificaciones.

#### Scenario: Cierre manual por el usuario
- **WHEN** el usuario hace clic en "Cerrar Factura"
- **THEN** la factura pasa a estado CERRADA y no acepta más ventas ni conceptos. La próxima venta creará una factura nueva.

