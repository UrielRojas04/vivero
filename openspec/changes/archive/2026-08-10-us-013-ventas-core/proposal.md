## Why

El negocio necesita poder registrar las ventas realizadas a clientes y descontar el stock de los productos vendidos de manera automática. Este es el core transaccional del sistema y el paso fundamental para empezar a operar, permitiendo luego escalar a manejo de deudas (cuentas corrientes) y remitos físicos.

## What Changes

- Se crean las entidades base del flujo de caja y stock: `Venta`, `VentaDetalle` y `MovimientoStock`.
- Se implementan los endpoints backend para registrar ventas y consultar el historial.
- Se implementan los endpoints para asentar los movimientos de stock (tanto por venta como ajustes manuales).
- Se crea la pantalla de "Nueva Venta" (Punto de Venta) en el frontend.
- Se actualiza el stock real de un Producto cada vez que se emite una venta.

## Capabilities

### New Capabilities
- `ventas-core`: Gestión integral del ciclo de vida de una venta (cabecera, detalle) y su impacto básico en el stock del catálogo.
- `movimientos-stock`: Registro inmutable de ingresos y egresos de stock de los productos para tener trazabilidad.

### Modified Capabilities
- `catalogo-productos`: El stock pasará a ser afectado por el sistema de movimientos (flujo de salida).

## Impact

- Afecta al modelo de datos (nuevas tablas transaccionales).
- Afecta la entidad `Producto` y el modo en que se consulta su disponibilidad real (concurrencia de stock).
- Se expone una nueva API REST de ventas.
- UI nueva para los cajeros/vendedores.
