## ADDED Requirements

### Requirement: Emisión de eventos SSE
El sistema SHALL exponer un endpoint `/api/events/stock` protegido por JWT que permite a los clientes suscribirse usando SSE (Server-Sent Events).

#### Scenario: Suscripción exitosa
- **WHEN** un cliente envía una solicitud GET con un token JWT válido (ya sea por Header o por parámetro URL `token`)
- **THEN** el sistema mantiene la conexión abierta y retorna un `text/event-stream`.

#### Scenario: Autorización rechazada
- **WHEN** un cliente envía una solicitud GET sin un token JWT válido
- **THEN** el sistema rechaza la conexión con HTTP 403 Forbidden.

#### Scenario: Despacho de actualizaciones
- **WHEN** el backend emite un evento interno de actualización de stock
- **THEN** el sistema propaga este evento en formato JSON a todos los `SseEmitter` activos suscritos al canal.
