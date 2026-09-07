## Context

Los clientes ocasionalmente devuelvan bandejas llenas de plantines que les sobraron de una siembra o que deben ser repicados. Actualmente, el sistema permite devolver bandejas vacías (plásticos), pero no contempla la devolución de productos vivos. Esto requiere un proceso dual: reingresar el producto al inventario y compensar económicamente al cliente por la devolución (ya que previamente se le había cobrado).

## Goals / Non-Goals

**Goals:**
- Permitir la registración de devoluciones de bandejas llenas asociadas a un cliente y producto específico.
- Reingresar automáticamente las bandejas devueltas al `Stock Fisico`.
- Reflejar la compensación económica a favor del cliente, impactando su cuenta corriente (ya sea como ajuste o nota de crédito).

**Non-Goals:**
- No se manejará depreciación del producto devuelto (el valor de devolución será el mismo que el valor de venta, o un valor manual ingresado en el momento).
- No se vinculará obligatoriamente a una Venta específica (para evitar la complejidad de buscar ventas antiguas si el cliente compró en múltiples tandas). Se procesará como un crédito directo a la cuenta.

## Decisions

1. **Desacople de Ventas Anteriores**
   - *Decisión*: La devolución se registrará como un evento independiente asociado al cliente y al producto, sin obligar a vincularlo al ID de una `Venta` pasada.
   - *Razón*: Frecuentemente es difícil rastrear de qué ticket exacto proviene el sobrante cuando el cliente retira mercancía de forma continua.
   - *Alternativa*: Exigir vincular la devolución a un `VentaDetalle`. Descartado por fricción operativa.

2. **Impacto en Inventario (Movimientos de Stock)**
   - *Decisión*: Se agregará un nuevo tipo o motivo de `MovimientoStock`, por ejemplo `DEVOLUCION_SOBRANTE` o `REPIQUE`, de tipo `IN` (Ingreso).
   - *Razón*: Mantiene la trazabilidad separada de un ingreso normal por producción o compras.

3. **Impacto Financiero (Cuenta Corriente)**
   - *Decisión*: El módulo generará automáticamente un movimiento a favor del cliente en su `CuentaCorrienteDinero` (o un Recibo de tipo "Nota de Crédito interna") por el valor total de las bandejas devueltas.
   - *Razón*: Es la forma más limpia de "restar la ganancia" de la venta original, dejando el saldo a favor para futuras compras o para cancelar deuda existente.

## Risks / Trade-offs

- **[Risk]** Valorización de la devolución: Si el precio del producto cambió desde que el cliente lo compró, darle un crédito por el precio actual podría generar una pérdida para el vivero.
  - **Mitigation**: La interfaz de devolución deberá sugerir el precio actual del producto, pero permitirá editar el monto total a acreditar, dándole control al jefe para ajustar el valor si corresponde.
- **[Risk]** Abuso de devoluciones que inflen el stock virtual sin verificación física.
  - **Mitigation**: El permiso para realizar esta acción estará restringido a administradores o roles con capacidad de `ESCRIBIR_VENTAS` y `ESCRIBIR_STOCK`.
