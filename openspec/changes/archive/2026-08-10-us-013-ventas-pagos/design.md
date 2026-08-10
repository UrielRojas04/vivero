## Context

Actualmente `Venta` se registra como una transacción atómica que descuenta stock, pero asume tácitamente que el pago fue por el total exacto. Necesitamos soportar descuentos comerciales, pagos parciales y medios de pago variados.

## Goals / Non-Goals

**Goals:**
- Soportar múltiples `Pago` por cada `Venta` (ej. paga mitad efectivo, mitad transferencia).
- Calcular y aplicar descuentos (en pesos o porcentaje) sobre el subtotal.
- Conectar el saldo resultante (deuda o excedente) a la `CuentaCorrienteDinero` del cliente de forma automática.

**Non-Goals:**
- No se implementará la pantalla completa de Gestión de Cuentas Corrientes en este change (se hará en una iteración posterior si no está hecha). Solo se impactarán los saldos.
- No se implementará facturación AFIP / fiscal.

## Decisions

1. **Entidad Pago:**
   - Será un `@Entity` relacionado `@ManyToOne` a `Venta`.
   - Campos: `monto`, `metodoPago` (Enum: EFECTIVO, TRANSFERENCIA, CHEQUE), `fecha`.

2. **Cálculo de Deuda y Saldo en VentaService:**
   - La API de creación de venta recibirá la lista de detalles, el descuento (monto fijo), y la lista de pagos iniciales.
   - `subtotal` = SUM(precioUnitario * cantidad).
   - `totalFinal` = subtotal - descuento.
   - `totalPagado` = SUM(pagos.monto).
   - `diferencia` = totalPagado - totalFinal.
   - Si `diferencia < 0`: Se asienta una deuda de `abs(diferencia)` en la `CuentaCorrienteDinero` del cliente (disminuye saldo).
   - Si `diferencia > 0`: Se asienta un saldo a favor de `diferencia` (aumenta saldo).

3. **Modificación de Frontend (`NuevaVenta.jsx`):**
   - Antes de confirmar, en lugar de llamar directamente a la API, se abre un modal de "Liquidación".
   - El modal permite ingresar Descuento y agregar líneas de Pago.

## Risks / Trade-offs

- **Risk**: Complejidad transaccional. Si la actualización de la cuenta corriente falla, la venta no debe registrarse.
  - **Mitigation**: Mantener todo dentro del mismo `@Transactional` en `VentaServiceImpl`.

- **Risk**: Clientes sin Cuenta Corriente inicializada.
  - **Mitigation**: El servicio debe asegurar que si el cliente no tiene la entidad `CuentaCorrienteDinero` creada, la cree on-the-fly con saldo 0 antes de aplicar la diferencia.
