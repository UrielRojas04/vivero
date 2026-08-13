## Context

Actualmente los productos (`Producto.java`) almacenan el `costo_producto`. La valoración de inventario multiplicaba este costo base actual (junto a variables dinámicas como porcentaje de envío y descuento de proveedor globales) por el stock actual.
Dado que la plataforma se usará para registrar ventas reales, calcular los costos de forma dinámica sobre configuraciones globales actuales impide conocer el costo histórico real en el que se incurrió al adquirir o vender un lote particular.
Para el change `us-013-ventas-core`, necesitamos estructuras de datos robustas (`MovimientoStock`, `Venta`, `VentaDetalle`) que congelen estos valores monetarios, permitiendo una contabilidad auditable e inmutable.

## Goals / Non-Goals

**Goals:**
- Crear el modelo de datos para `Venta` y `VentaDetalle` que almacene los costos y precios congelados al momento exacto de la venta.
- Crear el modelo `MovimientoStock` para registrar ingresos, mermas y ajustes de inventario con el costo unitario histórico congelado.
- Refactorizar la vista "Costos de Inventario" para que la UI muestre y entienda que los valores vienen de movimientos históricos (costo promedio o último costo de entrada) en lugar de un cálculo al vuelo.

**Non-Goals:**
- Implementar pagos, métodos de pago complejos, manejo de cuentas corrientes o cheques integrados a la venta (quedan para `us-013-ventas-pagos`).

## Decisions

- **Congelamiento de Costos**: Al crear una `VentaDetalle`, se copiará explícitamente el `costoUnitario`, `subtotal` y los descuentos/cargos calculados en la tabla para garantizar inmutabilidad frente a futuros aumentos.
- **Registro de Movimiento de Stock**: Cada vez que se cargue stock o se efectúe una venta, se guardará en `MovimientoStock` el `tipo_movimiento` (INGRESO, EGRESO, VENTA, MERMA), `cantidad` y `costo_unitario` total con envíos y descuentos aplicados en ese instante.
- **Estrategia de Inicialización**: Los productos actuales que ya tienen stock pero no tienen movimientos registrados recibirán un movimiento de `AJUSTE_INICIAL` usando el `costo_producto` y configuraciones actuales durante la migración o cuando se inicie la aplicación.

## Risks / Trade-offs

- **Migración de Datos**: El stock existente necesita movimientos para que la valoración histórica funcione. 
  - *Mitigación*: Se puede agregar lógica en el `DataInitializer` o crear un script Flyway/SQL (si hubiera) que inserte automáticamente un `MovimientoStock` de tipo inicial por cada producto con `stock > 0`.
