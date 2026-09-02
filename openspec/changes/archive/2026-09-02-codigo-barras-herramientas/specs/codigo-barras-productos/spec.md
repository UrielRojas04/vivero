## ADDED Requirements

### Requirement: Código de Barras del Producto
El sistema SHALL permitir almacenar en cada producto un código de barras de fábrica opcional (`codigoBarra`), de hasta 64 caracteres. El campo SHALL ser nullable: un producto sin código de barras es válido y es el estado por defecto de todo producto existente.

#### Scenario: Producto guardado con código de barras
- **WHEN** se crea o actualiza un producto informando un `codigoBarra` no vacío
- **THEN** el sistema persiste el código asociado a ese producto y lo devuelve en el `ProductoDTO` de la respuesta

#### Scenario: Producto guardado sin código de barras
- **WHEN** se crea o actualiza un producto sin informar `codigoBarra` (campo ausente o `null`)
- **THEN** el sistema guarda el producto con `codigoBarra` en `null` sin producir ningún error

#### Scenario: Código de barras vacío se normaliza a null
- **WHEN** se envía un `codigoBarra` que consiste solamente en espacios en blanco o en una cadena vacía
- **THEN** el sistema persiste `null` en lugar de la cadena vacía

#### Scenario: Código de barras se guarda sin espacios sobrantes
- **WHEN** se envía un `codigoBarra` con espacios al inicio o al final
- **THEN** el sistema persiste el código sin esos espacios

### Requirement: Unicidad del Código de Barras
El sistema SHALL rechazar el guardado de un producto cuyo `codigoBarra` ya esté asignado a otro producto no eliminado de la misma unidad de negocio. El mensaje de error SHALL nombrar al producto que ya tiene ese código. La restricción SHALL aplicarse únicamente a códigos no nulos.

#### Scenario: Código ya asignado a otro producto
- **WHEN** un usuario intenta guardar un producto con un `codigoBarra` que ya pertenece a otro producto no eliminado de la misma unidad de negocio
- **THEN** el sistema rechaza la operación con un error que incluye el nombre del producto en conflicto, y no persiste ningún cambio

#### Scenario: Reguardado del mismo producto con su propio código
- **WHEN** un usuario edita un producto que ya tiene un `codigoBarra` asignado y lo guarda sin cambiar ese código
- **THEN** el sistema guarda el producto normalmente, sin considerarlo un conflicto consigo mismo

#### Scenario: Varios productos sin código de barras
- **WHEN** existen múltiples productos con `codigoBarra` en `null` en la misma unidad de negocio
- **THEN** el sistema los acepta a todos, porque la restricción de unicidad no aplica a valores nulos

#### Scenario: Código liberado por un producto eliminado
- **WHEN** un producto con un `codigoBarra` determinado fue eliminado (soft delete, `deleted = true`) y se crea un producto nuevo con ese mismo código
- **THEN** el sistema acepta la operación, porque la unicidad sólo considera productos no eliminados

#### Scenario: Mismo código en distinta unidad de negocio
- **WHEN** un producto de una unidad de negocio tiene un `codigoBarra` y se guarda un producto de otra unidad de negocio con ese mismo código
- **THEN** el sistema acepta la operación, porque la unicidad se evalúa dentro de la unidad de negocio

### Requirement: Consulta de Producto por Código de Barras
El sistema SHALL exponer un endpoint `GET /api/productos/codigo-barra/{codigo}` que devuelve el `ProductoDTO` del producto no eliminado de la unidad de negocio activa cuyo `codigoBarra` coincide exactamente con el código recibido. El endpoint SHALL requerir la autoridad `LEER_STOCK` o `ESCRIBIR_PRODUCCION`, las mismas que gobiernan la lectura del catálogo.

#### Scenario: Código encontrado
- **WHEN** un usuario autorizado consulta el endpoint con un código asignado a un producto de su unidad de negocio activa
- **THEN** el sistema responde 200 con el `ProductoDTO` completo de ese producto

#### Scenario: Código no encontrado
- **WHEN** un usuario autorizado consulta el endpoint con un código que ningún producto de su unidad de negocio activa tiene asignado
- **THEN** el sistema responde 404 sin cuerpo de producto

#### Scenario: Código de otra unidad de negocio
- **WHEN** un usuario consulta un código que está asignado a un producto de una unidad de negocio distinta de la activa
- **THEN** el sistema responde 404, porque la búsqueda está acotada a la unidad de negocio activa

#### Scenario: Usuario sin permiso de lectura de stock
- **WHEN** un usuario sin `LEER_STOCK` ni `ESCRIBIR_PRODUCCION` consulta el endpoint
- **THEN** el sistema responde 403 y no revela información del producto

#### Scenario: La respuesta nunca expone la entidad JPA
- **WHEN** el endpoint devuelve un producto encontrado
- **THEN** el cuerpo de la respuesta es un `ProductoDTO`, nunca la entidad `Producto`

### Requirement: Alcance del Código de Barras a la Unidad Herramientas
El sistema SHALL exponer la carga y la búsqueda por código de barras únicamente en la unidad de negocio Herramientas. En Vivero y en Abono la interfaz SHALL omitir tanto el campo de código de barras como los controles de escaneo.

#### Scenario: Unidad Herramientas activa
- **WHEN** la unidad de negocio activa es Herramientas
- **THEN** la interfaz muestra el campo de código de barras en el formulario de producto y el control de búsqueda por escaneo en el catálogo

#### Scenario: Unidad Vivero o Abono activa
- **WHEN** la unidad de negocio activa es Vivero o Abono
- **THEN** la interfaz no muestra el campo de código de barras ni ningún control de escaneo
