## Purpose
Esta especificación define el comportamiento del registro de productos y actualización de stock dentro del catálogo.
## Requirements
### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto definiendo su costo catálogo, porcentaje de descuento del proveedor, y un porcentaje de ganancia deseada. El sistema MUST calcular automáticamente el precio de venta final a partir del costo real de adquisición y el margen de ganancia, manteniendo guardado este precio final en el catálogo.

#### Scenario: Registro exitoso con cálculo automático de precio
- **WHEN** un usuario con permisos envía una solicitud para crear/editar un producto, definiendo `costoProducto = 1000`, un porcentaje de ganancia del `50%`, y la unidad de negocio tiene un costo de envío del `10%`
- **THEN** el sistema calcula el precio de venta (ej. `$1650`) aplicando el margen de ganancia sobre el costo real (Base + Envío - Descuento) y persiste el producto junto con la columna `porcentajeGanancia`.

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden

### Requirement: Definición de Margen de Ganancia
El frontend SHALL permitir al usuario ingresar el margen de ganancia esperado (%) en el formulario de Producto, pre-calculando e informando visualmente en tiempo real el precio de venta que resultará antes de enviar el formulario.

#### Scenario: Visualización interactiva de rentabilidad
- **WHEN** el usuario ingresa un costo de catálogo y tipea un margen de "40" en el campo `% Ganancia`
- **THEN** el formulario actualiza instantáneamente el valor del "Precio Final" para reflejar la fórmula, o ajusta el porcentaje si el usuario decide sobrescribir manualmente el Precio Final.

### Requirement: Afectación de Stock Actual
El sistema SHALL actualizar el campo `stockActual` del producto de manera transaccional al realizar una venta o ajuste, y emitir un evento SSE a los clientes conectados para notificar la nueva cantidad.

#### Scenario: Venta confirmada actualiza stock y notifica
- **WHEN** se descuentan 5 unidades de un producto en una venta
- **THEN** el `stockActual` del producto disminuye en 5 de forma atómica junto a la creación del MovimientoStock, y se despacha un evento SSE con el nuevo stock hacia el frontend.

### Requirement: Recepción de Stock
El sistema SHALL permitir ingresar stock a los productos del catálogo mediante diferentes mecanismos.

#### Scenario: Ingreso desde Siembra finalizada
- **WHEN** el usuario procesa la finalización de un lote de siembra
- **THEN** el stock del producto seleccionado se incrementa de acuerdo a la cantidad cosechada de la siembra
- **AND** se registra un movimiento de stock de tipo `INGRESO_SIEMBRA` con referencia al lote de la siembra
