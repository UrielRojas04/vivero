## MODIFIED Requirements

### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto definiendo su costo catálogo, porcentaje de descuento del proveedor, y un porcentaje de ganancia deseada. El sistema MUST calcular automáticamente el precio de venta final a partir del costo real de adquisición y el margen de ganancia, manteniendo guardado este precio final en el catálogo.

#### Scenario: Registro exitoso con cálculo automático de precio
- **WHEN** un usuario con permisos envía una solicitud para crear/editar un producto, definiendo `costoProducto = 1000`, un porcentaje de ganancia del `50%`, y la unidad de negocio tiene un costo de envío del `10%`
- **THEN** el sistema calcula el precio de venta (ej. `$1650`) aplicando el margen de ganancia sobre el costo real (Base + Envío - Descuento) y persiste el producto junto con la columna `porcentajeGanancia`.

## ADDED Requirements

### Requirement: Definición de Margen de Ganancia
El frontend SHALL permitir al usuario ingresar el margen de ganancia esperado (%) en el formulario de Producto, pre-calculando e informando visualmente en tiempo real el precio de venta que resultará antes de enviar el formulario.

#### Scenario: Visualización interactiva de rentabilidad
- **WHEN** el usuario ingresa un costo de catálogo y tipea un margen de "40" en el campo `% Ganancia`
- **THEN** el formulario actualiza instantáneamente el valor del "Precio Final" para reflejar la fórmula, o ajusta el porcentaje si el usuario decide sobrescribir manualmente el Precio Final.
