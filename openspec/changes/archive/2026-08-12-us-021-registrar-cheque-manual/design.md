## Context

El registro de cheques estaba fuertemente acoplado a las ventas (`LiquidacionVenta`). Sin embargo, en la práctica comercial, los clientes pueden entregar cheques como pago a cuenta, cancelación de deuda de cuenta corriente, o simplemente como un ingreso inicial. Esto requiere poder cargar el cheque en el sistema desvinculado de una venta particular, pero vinculado al cliente.

## Goals / Non-Goals

**Goals:**
- Permitir la creación de un cheque desde la interfaz de usuario con `venta_id = null`.
- Impactar positivamente el `balanceDinero` del cliente si el cheque ingresado pertenece a un cliente específico.
- Validar y mantener la integridad de los datos del cheque (fechas, monto, número de serie, banco).

**Non-Goals:**
- No se modificará el flujo de liquidación de ventas existente.
- No se implementará en esta historia la reversión automática de saldos si el cheque rebota (se maneja manualmente vía Ajuste de Saldo por ahora).

## Decisions

1. **Endpoint `POST /api/cheques`**:
   Se implementará (o habilitará) un endpoint dedicado en `ChequeController`, recibiendo un payload con los datos del cheque y opcionalmente `clienteId`.
2. **Impacto en Cuenta Corriente**:
   El `ChequeServiceImpl.crearChequeManual` (o similar) se encargará de guardar la entidad y, transaccionalmente, actualizar el saldo del cliente sumándole el monto (similar a un `AjusteSaldo` tipo PAGO).
3. **UI `NuevoChequeModal`**:
   Se creará un modal llamado desde `Cheques.jsx`. Reutilizará el buscador/selector de clientes ya conocido y los inputs formateados para el monto (`FormattedNumberInput`).

## Risks / Trade-offs

- **Risk**: Anular o eliminar el cheque posteriormente no revierte automáticamente el saldo del cliente.
  - *Mitigation*: Queda fuera del alcance actual. Los usuarios deberán usar la opción "Ajustar Saldo" para registrar la deuda si el cheque rebota. Se agregará advertencia si es necesario en futuras iteraciones.
