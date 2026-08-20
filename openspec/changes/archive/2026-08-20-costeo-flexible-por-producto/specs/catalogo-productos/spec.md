## MODIFIED Requirements

### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto definiendo su costo catálogo, **su lista de descuentos estables** (cada uno con nombre y porcentaje), **su porcentaje de IVA**, **su porcentaje de costo de envío**, su porcentaje de ganancia deseada, y de manera opcional vincularlo a una `Marca` (entidad relacional).

La lista de descuentos del producto MUST contener sólo descuentos que se apliquen en toda compra de ese producto. Los descuentos que varían de una compra a otra MUST NOT cargarse ahí: se reflejan en el costo pactado de la operación correspondiente.

El porcentaje de IVA y el porcentaje de costo de envío del producto MUST admitir quedar sin definir, en cuyo caso el sistema MUST usar el valor por defecto de la unidad de negocio del producto. Un valor de cero definido en el producto MUST tratarse como distinto de "sin definir".

El sistema MUST calcular automáticamente el precio de venta final aplicando el margen de ganancia sobre el costo de adquisición resultante de la fórmula canónica definida por la capacidad `costeo-productos`, manteniendo guardado este precio final en el catálogo. El sistema MUST NOT implementar esa fórmula por su cuenta: MUST obtener el costo de la única implementación existente.

#### Scenario: Registro exitoso con cálculo automático de precio y marca
- **WHEN** un usuario con permisos envía una solicitud para crear/editar un producto, definiendo `costoProducto = 1000`, un porcentaje de ganancia del `50%`, sin IVA propio ni envío propio, la unidad de negocio tiene un costo de envío por defecto del `10%` y un IVA por defecto del `0%`, y selecciona un `marcaId = 5`
- **THEN** el sistema persiste el producto asociado a la marca correspondiente, calcula el precio de venta aplicando el margen de ganancia sobre el costo de adquisición obtenido de la fórmula canónica y guarda el producto.

#### Scenario: Registro con varios descuentos e IVA propio
- **WHEN** un usuario con permisos crea un producto con `costoProducto = 10000`, dos descuentos estables (`Proveedor 10%` y `Volumen 5%`), IVA propio `21%` y sin envío propio, en una unidad de negocio con envío por defecto `5%`
- **THEN** el sistema persiste los dos descuentos asociados al producto, los aplica en cascada y calcula su precio de venta sobre un costo de adquisición de `10773.00`

#### Scenario: Producto sin IVA propio hereda el de la unidad de negocio
- **WHEN** un usuario crea un producto sin definir su porcentaje de IVA en una unidad de negocio cuyo IVA por defecto es `21%`
- **THEN** el costo de adquisición del producto se calcula aplicando `21%` de IVA

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden

### Requirement: Definición de Margen de Ganancia
El frontend SHALL permitir al usuario ingresar el margen de ganancia esperado (%) en el formulario de Producto, pre-calculando e informando visualmente en tiempo real el precio de venta que resultará antes de enviar el formulario. El costo sobre el que se pre-calcula SHALL obtenerse aplicando la misma fórmula canónica y el mismo orden de componentes que aplica el servidor, de modo que el valor mostrado antes de guardar coincida con el que el sistema persiste.

#### Scenario: Visualización interactiva de rentabilidad
- **WHEN** el usuario ingresa un costo de catálogo y tipea un margen de "40" en el campo `% Ganancia`
- **THEN** el formulario actualiza instantáneamente el valor del "Precio Final" para reflejar la fórmula, o ajusta el porcentaje si el usuario decide sobrescribir manualmente el Precio Final.

#### Scenario: El costo mostrado coincide con el costo persistido
- **WHEN** el usuario configura descuentos, IVA y envío en el formulario, observa el costo final informado y guarda el producto
- **THEN** el costo de adquisición que el sistema calcula al guardar coincide, al centavo, con el que el formulario había informado
