## Context

Actualmente el sistema no posee manejo de ventas ni transacciones de stock automatizadas; solo existen los ABM de catálogo. Este change (`us-013-ventas-core`) es el más importante para el flujo transaccional de la aplicación.

## Goals / Non-Goals

**Goals:**
- Registrar cabeceras y detalle de venta con cálculo preciso de subtotales.
- Descontar el stock automáticamente usando un nuevo registro de transacciones (MovimientoStock) garantizando trazabilidad.
- Proveer una interfaz rápida para cargar ventas (Punto de Venta) orientada al mostrador.

**Non-Goals:**
- No se implementarán los cobros parciales o flujos de caja detallados (cuenta corriente dinero) en esta etapa (eso irá en `us-013-ventas-pagos`).
- No se manejan remitos en PDF ni envíos por WhatsApp por ahora (`us-016-remitos-pdf`).

## Decisions

- **Estructura de Venta**: Se usarán DTOs compuestos para el request (cabecera + array de líneas de detalle) que el backend procesará en una única transacción JPA (`@Transactional`).
- **Precio Histórico**: En `VentaDetalle` guardaremos obligatoriamente el `precioUnitarioHistorico` copiándolo del Producto en el instante exacto de la venta (cumpliendo con la regla RN-04 documentada).
- **Control de Stock**: La afectación de stock generará siempre un registro inmutable en `MovimientoStock` con el tipo OUT y motivo "Venta", manteniendo la traza completa de qué venta originó qué descuento.

## Risks / Trade-offs

- **[Risk] Inconsistencia de Stock durante Ventas Simultáneas** → **Mitigation**: Dado que el entorno es un vivero con un uso concurrente bajo-medio, confiaremos en las transacciones estándar de JPA (`@Transactional`) que englobarán la Venta y los Movimientos de Stock para garantizar que un fallo deshaga ambas inserciones.
