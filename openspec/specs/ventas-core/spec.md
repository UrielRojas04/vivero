## Purpose
Define core requirements for the sales process and inventory adjustments.

## Requirements

### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente existente O los datos de un cliente casual (solo para la unidad de negocio Herramientas), un array de detalles (productos vendidos), un porcentaje de descuento opcional, un array de pagos, y de manera opcional una cantidad de bandejas entregadas.

#### Scenario: Venta exitosa con cliente existente
- **WHEN** el payload es válido, contiene al menos un producto, tiene un `clienteId` válido y cero o más pagos y bandejas
- **THEN** el sistema guarda la venta (`Venta`), calcula el `subtotal` y `totalFinal` (aplicando el descuento), copia el precio del producto al momento exacto en `precioUnitarioHistorico` (`VentaDetalle`), asienta los `Pago` enviados, registra la entrega en `HistorialBandejas` (si aplica), y devuelve 201 Created.

#### Scenario: Venta exitosa con cliente casual
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y en lugar de `clienteId` contiene un objeto `clienteAdHoc` con bandera `casual: true`, nombre y teléfono
- **THEN** el sistema guarda la venta (`Venta`) SIN asociar un `Cliente` de la base de datos (clave foránea nula), pero almacenando el nombre y teléfono del cliente ad-hoc en los datos de la Venta para uso en comprobantes, y devuelve 201 Created.

#### Scenario: Venta exitosa con creación de cliente express
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y contiene un objeto `clienteAdHoc` con bandera `casual: false`, nombre y teléfono
- **THEN** el sistema primero crea un registro `Cliente` en la base de datos para la unidad de negocio Herramientas, luego guarda la venta (`Venta`) vinculada a este nuevo cliente, y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin clienteId Y sin clienteAdHoc, o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.

### Requirement: Persistencia del Carrito de Ventas en la UI
El sistema SHALL mantener el estado del carrito (cliente seleccionado, detalles, métodos de pago, notas, y descuento) persistente a través de la navegación entre distintas secciones de la aplicación mientras dure la sesión.

#### Scenario: Usuario cambia de sección sin perder el carrito
- **WHEN** el usuario agrega productos al carrito en la vista "Nueva Venta" y navega a la sección de "Insumos" y luego retorna a "Nueva Venta"
- **THEN** los datos previamente cargados (productos, cliente, etc.) se restauran automáticamente sin requerir interacción manual.

### Requirement: Registro Inmutable de Ventas
The system SHALL register sales linking them to a `UnidadNegocio` and an optional `Cliente`, persisting the total cost and total price frozen at the exact moment of sale.

Each sold product SHALL produce **exactly one** `VentaDetalle` line, regardless of how many cost layers its units are deducted from. The system SHALL NOT split a sale line —neither its quantity, nor its unit price, nor its subtotal— for cost accounting reasons, so that the document the customer sees keeps one row per product.

Each sale line SHALL freeze a **single unit cost** for its whole quantity. When the product's business unit has layer-based costing enabled, that unit cost SHALL be the product's **reference cost at the moment of the sale** — the highest unit cost among its active layers, as defined by the `costeo-por-capas` capability — and the line SHALL freeze the full cost breakdown of the layer that supplied that cost. The system SHALL NOT persist a weighted average of several layers, and SHALL NOT persist a per-layer breakdown on the sale line.

Values frozen on a `VentaDetalle` SHALL remain immutable: no later change to cost configuration, to cost layers, or to the costing mode of a business unit SHALL alter the historical profit of an already registered sale.

Sales registered before layer-based costing existed SHALL keep their frozen values untouched and SHALL NOT be recalculated.

#### Scenario: Realización de Venta Exitosa
- **WHEN** a user finalizes a sale of multiple products
- **THEN** the system generates a `Venta` record and one `VentaDetalle` record per sold product containing the copied unit price, unit cost, and applied modifiers, preventing future global configuration changes from altering the historical profit calculation.

#### Scenario: Venta cuyas unidades salen de dos capas
- **WHEN** a sale of `6` units of one product deducts `5` units from a layer at `22822.80` and `1` unit from a layer at `15561.00`
- **THEN** the sale contains exactly one `VentaDetalle` for that product with quantity `6` and a single frozen unit cost of `22822.80` — the highest among the active layers — with its subtotal still equal to the unit price times `6`

#### Scenario: El costo congelado no es el de la capa de la que salieron las unidades
- **WHEN** a sale of `1` unit deducts it from the oldest layer at `21780.00` while a more expensive active layer at `25987.50` remains
- **THEN** the `VentaDetalle` freezes a unit cost of `25987.50`

#### Scenario: El comprobante impreso conserva una fila por producto
- **WHEN** a customer's receipt is produced for a sale whose line drew units from two cost layers
- **THEN** the product appears in a single row with its full quantity, and never as two rows for the same product

#### Scenario: Ventas anteriores al costeo por capas
- **WHEN** layer-based costing is introduced and its cost layers are initialized
- **THEN** every previously registered `VentaDetalle` keeps its frozen unit price, unit cost and base cost exactly as recorded

#### Scenario: Una venta ya registrada no cambia de margen
- **WHEN** cost layers are consumed, a product's cost configuration is edited, or layer-based costing is disabled for a business unit, after a sale has been registered
- **THEN** the frozen values of that sale's details remain exactly as they were, and its historical profit is unchanged

### Requirement: Impacto en Movimientos
The system SHALL automatically generate stock movements of type `VENTA` for each product sold, to decrement inventory properly and record the cost of goods sold.

The system SHALL generate **exactly one** movement per sold product, for the full quantity of its sale line, regardless of whether the business unit has layer-based costing enabled and regardless of how many cost layers its units are deducted from.

When the product's business unit has layer-based costing **disabled**, that movement SHALL freeze the cost of the product's most recent inbound movement, exactly as before.

When the product's business unit has layer-based costing **enabled**, that movement SHALL freeze the product's reference cost at the moment of the sale — the highest unit cost among its active layers — and the quantities SHALL be deducted from the product's oldest active layers first, as defined by the `costeo-por-capas` capability.

The quantity of the movement generated for a sold product SHALL equal the quantity sold on its sale line, and its frozen unit cost SHALL equal the unit cost frozen on that line.

#### Scenario: Deducción Automática de Inventario
- **WHEN** a sale is finalized successfully
- **THEN** the system reduces the `stock` in `Producto` and logs the corresponding `MovimientoStock` con el costo de salida congelado.

#### Scenario: Venta cuyas unidades salen de una sola capa
- **WHEN** `3` units are sold of a product of a business unit with layer-based costing enabled whose only active layer holds `5` remaining units
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for `3` units, carrying that layer's frozen cost breakdown

#### Scenario: Venta cuyas unidades salen de dos capas
- **WHEN** `6` units are sold of a product of a business unit with layer-based costing enabled whose oldest layer holds `5` remaining units at `22822.80` and whose next layer holds `2` at `15561.00`
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for `6` units at a unit cost of `22822.80`, and the remaining quantities of both layers are decremented by `5` and `1` respectively

#### Scenario: Venta en una unidad sin costeo por capas
- **WHEN** a sale is finalized for a product of a business unit with layer-based costing disabled
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for the full quantity sold, copying the cost of the product's most recent inbound movement
