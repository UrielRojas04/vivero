## Why

El jefe necesita poder cargar clientes rápidamente al momento de realizar una venta en el mostrador para emitir facturas, sin tener que navegar a la sección de clientes para crearlos. Muchos clientes de mostrador son "casuales" (no vuelven), por lo que no es deseable guardarlos en la base de datos de forma permanente, pero se requiere su Nombre y Teléfono para la factura. Esta funcionalidad solo aplica a la unidad de negocio "Herramientas".

## What Changes

- Se agregará un flujo de creación "express" de cliente en el proceso de venta de Herramientas.
- Se solicitarán únicamente Nombre y Teléfono.
- Se incluirá una opción (checkbox o toggle) para indicar si el cliente es "casual".
- Si es casual: los datos se usan para la factura de la venta, pero no se persiste un registro de cliente en la base de datos.
- Si NO es casual: se creará y guardará el cliente en la base de datos asociado a la unidad de negocio "Herramientas", y se usará en la venta.
- Esto solo afectará al flujo de ventas cuando el negocio activo sea "Herramientas".

## Capabilities

### New Capabilities
- `ventas-cliente-express`: Capacidad de cargar clientes de forma express y casual desde la UI de ventas.

### Modified Capabilities
- `ventas-core`: Se modificará el flujo de ventas para soportar clientes casuales en Herramientas.

## Impact

- **UI (Ventas):** Modificaciones en el selector de clientes durante una venta.
- **Backend (Ventas/Pedidos):** El servicio de ventas deberá soportar la recepción de un cliente "adhoc" sin ID o crear uno nuevo al vuelo antes de procesar la venta.
- **Modelo:** Posibles ajustes en cómo se guarda el destinatario de la venta si el cliente es casual (sin ID en tabla `clientes`).
