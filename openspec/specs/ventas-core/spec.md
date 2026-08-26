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

#### Scenario: Realización de Venta Exitosa
- **WHEN** a user finalizes a sale of multiple products
- **THEN** the system generates a `Venta` record and multiple `VentaDetalle` records containing the copied unit price, unit cost, and applied modifiers, preventing future global configuration changes from altering the historical profit calculation.

### Requirement: Impacto en Movimientos
The system SHALL automatically generate a `MovimientoStock` of type `VENTA` for each product sold to decrement inventory properly and record the cost of goods sold.

#### Scenario: Deducción Automática de Inventario
- **WHEN** a sale is finalized successfully
- **THEN** the system reduces the `stock` in `Producto` and logs the corresponding `MovimientoStock` con el costo de salida congelado.
