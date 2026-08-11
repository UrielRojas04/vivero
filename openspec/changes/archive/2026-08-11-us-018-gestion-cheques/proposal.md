## Why

El negocio recibe cheques frecuentemente (como comprobante o medio de pago de clientes) y actualmente los registra a mano en un cuaderno de papel con datos como fecha, cliente, banco, monto, número de serie y si fue entregado a un tercero (proveedor). Digitalizar esta gestión permite integrarla al flujo de cobros de ventas y llevar un control estructurado y seguro (trazabilidad).

## What Changes

- Nueva entidad de dominio `Cheque` para almacenar los datos detallados de los cheques.
- Endpoints CRUD para gestión de cheques independientes.
- Integración con el modal de `NuevaVenta` para permitir registrar los datos del cheque si el método de pago seleccionado es CHEQUE.
- Nueva sección "Gestión de Cheques" en el frontend protegida por rol.

## Capabilities

### New Capabilities
- `gestion-cheques`: CRUD y visualización del listado de cheques, con tracking de estados (en cartera, entregado) y datos específicos (banco, serie, fecha de cobro).

### Modified Capabilities
- `ventas-pagos`: Se amplía el flujo de pago con cheque para solicitar opcionalmente los datos del mismo al momento de cerrar una venta.

## Impact

- **Backend**: Nueva tabla `cheques`, Entity `Cheque`, Controller y Services nuevos; alteración en `VentaController` para aceptar cheques.
- **Frontend**: Nueva pantalla `/cheques`, actualización del componente `ModalPago` en ventas.
