## MODIFIED Requirements

### Requirement: Afectación de Stock Actual
El sistema SHALL actualizar el campo `stockActual` del producto de manera transaccional al realizar una venta o ajuste, y emitir un evento SSE a los clientes conectados para notificar la nueva cantidad.

#### Scenario: Venta confirmada actualiza stock y notifica
- **WHEN** se descuentan 5 unidades de un producto en una venta
- **THEN** el `stockActual` del producto disminuye en 5 de forma atómica junto a la creación del MovimientoStock, y se despacha un evento SSE con el nuevo stock hacia el frontend.
