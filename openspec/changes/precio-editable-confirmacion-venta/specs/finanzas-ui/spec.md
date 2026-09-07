## ADDED Requirements

### Requirement: Los importes de Finanzas reflejan lo efectivamente cobrado
Todos los importes de venta que informa la sección Finanzas SHALL derivarse de los valores congelados en la propia venta y en sus líneas al momento de registrarla — el precio por unidad histórico, el subtotal de cada línea y el total final de la venta — y SHALL NOT recalcularse a partir del precio de lista vigente del producto (`Producto.precio`).

Esto SHALL aplicar en particular a: el total de ventas del resumen del período, la ganancia neta y el margen derivados de él, el total final de cada venta del listado, la ganancia neta por venta, y el detalle de costo de mercadería vendida.

En consecuencia, cuando una venta se registró con un precio por unidad ajustado (menor o mayor al de lista), Finanzas SHALL informar el importe efectivamente cobrado en esa venta, y un cambio posterior del precio de lista del producto SHALL NOT alterar los importes que Finanzas informa para ventas ya registradas.

El costo de mercadería vendida SHALL seguir calculándose sobre el costo unitario histórico de cada línea y SHALL NOT verse afectado por un ajuste del precio de venta.

#### Scenario: El resumen del período incluye el importe ajustado
- **WHEN** se consulta el resumen de rentabilidad de un período que contiene una venta registrada con un precio por unidad menor al de lista
- **THEN** el total de ventas del resumen incluye el importe efectivamente cobrado en esa venta, no el que hubiera resultado del precio de lista, y la ganancia neta y el margen se calculan sobre ese total

#### Scenario: El listado de ventas muestra el total cobrado
- **WHEN** se consulta el listado de ventas del período y una de ellas tiene líneas con precio ajustado
- **THEN** el total final que muestra esa venta es el importe efectivamente cobrado, y su ganancia neta se calcula como la diferencia entre el precio por unidad histórico y el costo unitario histórico de cada línea por su cantidad

#### Scenario: Cambiar el precio de lista no altera Finanzas hacia atrás
- **WHEN** se modifica el precio de lista de un producto en el catálogo después de haber registrado ventas de ese producto
- **THEN** los importes que Finanzas informa para esas ventas anteriores permanecen idénticos, tanto en el resumen del período como en el listado de ventas y en el detalle de costo de mercadería vendida

#### Scenario: El costo de mercadería vendida no cambia por un ajuste de precio
- **WHEN** se registra una venta con un precio por unidad ajustado en una unidad de negocio con modelo de costo de mercadería vendida
- **THEN** el costo de mercadería vendida del período se calcula sobre el costo unitario histórico de la línea y es el mismo que si la venta se hubiera registrado al precio de lista, mientras que la ganancia neta sí refleja el ajuste
