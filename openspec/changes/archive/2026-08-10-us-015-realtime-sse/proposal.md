## Why

Cuando hay múltiples vendedores (o dispositivos) registrando ventas al mismo tiempo en el vivero, el stock físico de los productos cambia sin que los demás dispositivos se enteren hasta que recarguen la página. Esto puede ocasionar ventas accidentales de plantas o insumos que ya se quedaron sin stock. Implementar Server-Sent Events (SSE) soluciona esto empujando las actualizaciones de stock en tiempo real hacia todos los clientes conectados.

## What Changes

- Creación de un endpoint SSE en el backend (`/api/events/stock` o similar) que envíe notificaciones en vivo.
- Modificación del backend (específicamente al registrar ventas o alterar productos/insumos) para emitir un evento con el nuevo stock cada vez que se reduce o altera físicamente.
- Conexión del frontend al canal SSE mediante la API del navegador `EventSource`.
- Actualización automática del estado global de Zustand para reflejar la nueva cantidad disponible en los catálogos y, sobre todo, en la pantalla de "Nueva Venta" al instante.

## Capabilities

### New Capabilities
- `realtime-events`: Capacidad de suscribirse a un canal de Server-Sent Events para recibir notificaciones del servidor en tiempo real.

### Modified Capabilities
- `catalogo-productos`: Se modifica para que sus cambios impacten en el emisor de SSE.

## Impact

- **Backend**: Requiere el uso de `SseEmitter` de Spring MVC. Se deberá gestionar un registro en memoria de los clientes conectados.
- **Frontend**: Requiere abrir y mantener la conexión SSE a nivel global (por ejemplo en el componente principal o en Zustand), manejando reconexiones automáticas si se pierde internet en el móvil.
- **Seguridad**: El endpoint SSE debe estar protegido con JWT, lo cual a veces requiere pasar el token por query param si `EventSource` no soporta Auth headers nativamente, o usar librerías de SSE custom.
