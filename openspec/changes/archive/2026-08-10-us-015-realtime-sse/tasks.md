## 1. Backend: SSE Events API

- [x] 1.1 Crear clase `StockUpdateEvent` (con `productoId`, `nuevoStock`) para estandarizar el payload.
- [x] 1.2 Crear `SseService` (anotado con `@Service`) para manejar concurrencia de clientes conectados (usar `CopyOnWriteArrayList` o `ConcurrentHashMap` de emisores) y proveer método `emitStockUpdate(...)`.
- [x] 1.3 Crear `SseController` con endpoint `GET /api/events/stock` que inicialice, configure callbacks (timeout, completion) y retorne el `SseEmitter`.
- [x] 1.4 Modificar `JwtFilter.java` (o el entrypoint de Spring Security) para leer el token del request param `?token=` en rutas `/api/events/**`.

## 2. Backend: Emisión de eventos

- [x] 2.1 Modificar `VentaServiceImpl` (o el servicio correspondiente de afectación de stock) inyectando el `SseService`.
- [x] 2.2 Despachar `emitStockUpdate(...)` cada vez que se modifique y consolide el `stockActual` de los productos durante el registro de una venta.

## 3. Frontend: Conexión y Estado

- [x] 3.1 Agregar a `useProductosStore` (o el store relevante) la función para pisar el stock actual localmente: `updateProductoStock(productoId, nuevoStock)`.
- [x] 3.2 Implementar en el frontend un custom hook (`useStockEvents.js`) que inicialice un `EventSource` conectándose a `/api/events/stock?token=<token>`, y escuche el evento 'message'.
- [x] 3.3 Integrar el hook de SSE en el layout global (ej. `DashboardLayout.jsx`) para que escuche en background.
- [x] 3.4 Validar que al recibir un evento SSE, el frontend llame a `updateProductoStock` y se refresque la UI (especialmente la de `NuevaVenta.jsx`).
