## ADDED Requirements

### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente y un array de detalles (productos vendidos).

#### Scenario: Venta exitosa
- **WHEN** el payload es válido y contiene al menos un producto
- **THEN** el sistema guarda la venta (`Venta`), copia el precio del producto al momento exacto en `precioUnitarioHistorico` (`VentaDetalle`) y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin cliente o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.
