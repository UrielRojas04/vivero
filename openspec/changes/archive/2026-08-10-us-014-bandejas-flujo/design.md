## Context

El vivero presta bandejas a los clientes como embalaje de las plantas. Esas bandejas representan valor económico y deben devolverse. Actualmente, el sistema tiene la entidad `CuentaCorrienteBandejas` asociada al `Cliente` pero no existe una lógica para alimentarla con entregas y devoluciones de manera rastreable y segura.

## Goals / Non-Goals

**Goals:**
- Permitir registrar cuántas bandejas se lleva el cliente durante una venta.
- Permitir registrar la devolución de bandejas por parte del cliente en cualquier momento.
- Mantener un balance actualizado en tiempo real (`balanceBandejas`).
- Generar un historial de movimientos (`HistorialBandejas`) para auditar "quién, cuándo y cuántas" bandejas se movieron y por qué concepto.

**Non-Goals:**
- No se manejará el cobro monetario automático de bandejas perdidas o no devueltas en esta iteración.
- No se manejarán distintos "tipos" de bandejas (ej. de siembra, de transporte, etc.). Todas las bandejas se cuentan como unidades iguales por ahora.

## Decisions

- **HistorialBandejas**: Se creará una nueva entidad vinculada al `Cliente`. Cada registro (tipo `ENTREGA` o `DEVOLUCION`) impactará de forma transaccional el `balanceBandejas` de la `CuentaCorrienteBandejas`.
- **Integración con Venta**: Al registrar una venta, si el payload indica una cantidad de bandejas entregadas `> 0`, el backend creará automáticamente un registro de `ENTREGA` en el historial y asociará el `ventaId` correspondiente para mantener trazabilidad directa entre la venta y la deuda adquirida.
- **Endpoint independiente para Devoluciones**: Se expondrá un nuevo endpoint `POST /api/clientes/{id}/bandejas/devolucion` para asentar cuando el cliente trae bandejas de vuelta, independientemente de una nueva venta.

## Risks / Trade-offs

- **Risk:** Un cliente puede devolver más bandejas de las que debe, provocando un balance "negativo" (saldo a favor de bandejas).
  - **Mitigation:** El modelo de base de datos actual (`integer` para `balance_bandejas`) soporta valores negativos. El frontend debe mostrar esto claramente (ej. "A favor: 5 bandejas").
- **Risk:** Errores de tipeo (registrar 100 en lugar de 10 bandejas) alteran gravemente la cuenta corriente.
  - **Mitigation:** No implementaremos "edición" del historial. Si hay un error, se debe cargar el movimiento inverso como ajuste.
