## Context

Actualmente, las terminales de venta (celulares o PCs) descargan el catálogo de productos y su stock al iniciar la app. Si un vendedor hace una venta, el stock baja en la base de datos, pero el resto de los dispositivos no se entera. Implementaremos Server-Sent Events (SSE) para empujar actualizaciones instantáneas de stock.

## Goals / Non-Goals

**Goals:**
- Implementar un canal unidireccional (SSE) desde el backend al frontend.
- Notificar cambios de stock de productos a todos los clientes conectados.
- Actualizar el estado global del frontend (Zustand) para reflejar los cambios en vivo en la pantalla de Nueva Venta.

**Non-Goals:**
- Implementar WebSockets (comunicación bidireccional), ya que los clientes solo necesitan "escuchar" actualizaciones, no enviar comandos por este canal (eso se hace vía REST).
- Sincronizar clientes u otros catálogos en tiempo real. Solo se enfocará en el stock de productos/insumos por ahora.

## Decisions

1. **SseEmitter de Spring Web**: Usaremos la clase nativa `SseEmitter` de Spring Boot para mantener conexiones asíncronas abiertas. Se creará un `@Service` concurrente que almacene los emitters activos.
2. **EventSource en Frontend**: Usaremos la API nativa `EventSource` de HTML5 en un hook de React (`useEffect` global) que escuche y despache acciones al store de Zustand (`useProductosStore`).
3. **Autenticación SSE**: Dado que `EventSource` no soporta inyectar headers (como `Authorization: Bearer`), pasaremos el JWT por query param (`/api/events/stock?token=...`). Modificaremos `JwtFilter.java` para que lea el token del parámetro de URL si el header no existe, manteniendo la seguridad intacta.

## Risks / Trade-offs

- **Risk:** Timeouts silenciosos o caída de conexión en dispositivos móviles.
  - **Mitigation:** `EventSource` maneja reconexión automática de manera nativa. Además, Spring puede configurar un ping de "keep-alive" o usar el timeout por defecto y limpiar emitters muertos cuando fallen al enviar.
- **Risk:** Bloqueo de hilos en backend.
  - **Mitigation:** Mantener los emisores en colecciones thread-safe (`CopyOnWriteArrayList` o `ConcurrentHashMap`) y limpiar los desconectados en los callbacks `onCompletion` y `onTimeout`.
