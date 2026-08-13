## MODIFIED Requirements

### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente, un array de detalles (productos vendidos), un porcentaje de descuento opcional, un array de pagos, y de manera opcional una cantidad de bandejas entregadas. Adicionalmente, el sistema MUST asociar automáticamente al usuario que realiza la operación como el creador/vendedor de la venta.

#### Scenario: Venta exitosa
- **WHEN** el payload es válido y contiene al menos un producto y cero o más pagos y bandejas
- **THEN** el sistema guarda la venta (`Venta`), calcula el `subtotal` y `totalFinal` (aplicando el descuento), vincula al usuario autenticado (desde el contexto de seguridad) como `usuario`, copia el precio del producto al momento exacto en `precioUnitarioHistorico` (`VentaDetalle`), asienta los `Pago` enviados, registra la entrega en `HistorialBandejas` (si aplica), y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin cliente o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.
