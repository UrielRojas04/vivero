## MODIFIED Requirements

### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto definiendo su costo catálogo, porcentaje de descuento del proveedor, porcentaje de ganancia deseada, y de manera opcional vincularlo a una `Marca` (entidad relacional). El sistema MUST calcular automáticamente el precio de venta final a partir del costo real de adquisición y el margen de ganancia, manteniendo guardado este precio final en el catálogo.

#### Scenario: Registro exitoso con cálculo automático de precio y marca
- **WHEN** un usuario con permisos envía una solicitud para crear/editar un producto, definiendo `costoProducto = 1000`, un porcentaje de ganancia del `50%`, la unidad de negocio tiene un costo de envío del `10%`, y selecciona un `marcaId = 5`
- **THEN** el sistema persiste el producto asociado a la marca correspondiente, calcula el precio de venta aplicando el margen de ganancia sobre el costo real (Base + Envío - Descuento) y guarda el producto.

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden
