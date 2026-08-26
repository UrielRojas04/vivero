## MODIFIED Requirements

### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente existente O los datos de un cliente casual (solo para la unidad de negocio Herramientas), un array de detalles (productos vendidos), un porcentaje de descuento opcional, un array de pagos, y de manera opcional una cantidad de bandejas entregadas.

#### Scenario: Venta exitosa con cliente existente
- **WHEN** el payload es válido, contiene al menos un producto, tiene un `clienteId` válido y cero o más pagos y bandejas
- **THEN** el sistema guarda la venta (`Venta`), calcula el `subtotal` y `totalFinal` (aplicando el descuento), asienta los `Pago` enviados, registra la entrega en `HistorialBandejas` (si aplica), y devuelve 201 Created.

#### Scenario: Venta exitosa con cliente casual
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y en lugar de `clienteId` contiene un objeto `clienteAdHoc` con bandera `casual: true`, nombre y teléfono
- **THEN** el sistema guarda la venta (`Venta`) SIN asociar un `Cliente` de la base de datos (clave foránea nula), pero almacenando el nombre y teléfono del cliente ad-hoc en los datos de la Venta para uso en comprobantes, y devuelve 201 Created.

#### Scenario: Venta exitosa con creación de cliente express
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y contiene un objeto `clienteAdHoc` con bandera `casual: false`, nombre y teléfono
- **THEN** el sistema primero crea un registro `Cliente` en la base de datos para la unidad de negocio Herramientas, luego guarda la venta (`Venta`) vinculada a este nuevo cliente, y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin clienteId Y sin clienteAdHoc, o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.
