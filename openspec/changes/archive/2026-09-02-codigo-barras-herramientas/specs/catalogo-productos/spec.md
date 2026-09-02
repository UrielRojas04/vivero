## ADDED Requirements

### Requirement: Identificador Externo Opcional del Producto
El registro de producto SHALL aceptar, además de sus datos actuales, un identificador externo opcional (`codigoBarra`) correspondiente al código de barras de fábrica del producto. El campo SHALL ser aditivo: su ausencia no altera ningún comportamiento existente del alta, la edición ni el listado de productos.

#### Scenario: Alta de producto con identificador externo
- **WHEN** un usuario con `ESCRIBIR_STOCK` crea un producto informando `codigoBarra`
- **THEN** el sistema persiste el producto con ese identificador y lo devuelve en el `ProductoDTO`

#### Scenario: Alta de producto sin identificador externo
- **WHEN** un usuario crea un producto sin informar `codigoBarra`
- **THEN** el sistema guarda el producto igual que antes de este cambio, con el identificador en `null`

#### Scenario: Productos existentes no se ven afectados
- **WHEN** se consulta un producto creado antes de la incorporación del campo
- **THEN** el sistema lo devuelve con `codigoBarra` en `null` y con todos sus demás campos sin alteración

#### Scenario: El identificador viaja en el DTO, no en la entidad
- **WHEN** cualquier endpoint del catálogo devuelve un producto que tiene `codigoBarra`
- **THEN** el valor se expone a través de `ProductoDTO`, nunca serializando la entidad `Producto`

#### Scenario: Cambiar el identificador no altera el costeo
- **WHEN** un usuario edita únicamente el `codigoBarra` de un producto existente
- **THEN** el sistema guarda el cambio sin registrar un `MovimientoStock` nuevo y sin recalcular precio ni costo, porque el identificador no es un componente del costo
