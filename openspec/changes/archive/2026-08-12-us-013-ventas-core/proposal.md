## Why

Actualmente, el costo del inventario se calcula dinámicamente (`costo_actual * stock`), lo que significa que si el costo de envío global o el descuento del proveedor cambian, la valoración de compras y ventas se ve alterada. Para tener una contabilidad real e inmutable, el costo de adquisición debe congelarse en un registro histórico al momento de ingresar el stock, y el costo de mercadería vendida debe congelarse al momento de la venta.

## What Changes

- Creación del modelo `MovimientoStock` para registrar el ingreso y egreso de productos, congelando el costo base, envío y descuento del proveedor en el momento exacto de la operación.
- Creación del modelo `Venta` y `VentaDetalle` para registrar las salidas por ventas, asociando el costo histórico unitario.
- Refactor de la UI de Finanzas para mostrar un historial de costos reales extraídos de los movimientos en lugar de calcularlos al vuelo.

## Capabilities

### New Capabilities
- `ventas-core`: Gestión de ventas, carrito, y registro de detalles inmutables de venta.
- `movimientos-stock`: Registro histórico y auditable de ingresos y egresos de mercadería con sus costos fijos asociados al momento de la operación.

### Modified Capabilities

## Impact

- **Backend**: Nuevas entidades JPA (`Venta`, `VentaDetalle`, `MovimientoStock`), Controllers y Services.
- **Frontend**: Nuevo panel de Ventas, nueva vista de historial de costos por producto en Finanzas.
- **Base de Datos**: Generación de nuevas tablas mediante Hibernate ddl-auto.
