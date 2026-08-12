## Context

El sistema ya soporta un soft-delete a nivel de base de datos para la entidad `Gasto` gracias a la migración reciente. Sin embargo, no existe un endpoint en el backend ni un botón en la interfaz de usuario para disparar esta acción. Por otro lado, el saldo de los clientes (`CuentaCorrienteDinero.balancePesos`) se actualiza automáticamente con las ventas, pero el usuario requiere una forma de registrar pagos o deudas adicionales de forma manual.

## Goals / Non-Goals

**Goals:**
- Implementar un endpoint `DELETE /api/gastos/{id}` para borrar (lógicamente) un gasto.
- Añadir un botón "Eliminar" en la tabla de gastos en el frontend (sección Finanzas).
- Implementar un endpoint `POST /api/clientes/{id}/saldo/ajuste` que reciba un monto (positivo o negativo) para sumar o restar al saldo actual.
- Añadir un modal/botón en la vista del Cliente para realizar estos ajustes manuales de saldo.

**Non-Goals:**
- Implementar un libro mayor (ledger) inmutable completo para la cuenta corriente de dinero. Los ajustes simplemente actualizarán el balance actual.
- Auditoría compleja de quién eliminó el gasto (se usará el mecanismo estándar de soft-delete).

## Decisions

- **Eliminación de Gastos**: Dado que `@SQLDelete` ya está configurado en `Gasto`, el endpoint solo necesita llamar a `gastoRepository.deleteById(id)`. No es necesario implementar lógica de soft delete manual, Hibernate lo interceptará.
- **Ajuste de Saldo**: Se opta por un endpoint de "ajuste" (delta) en lugar de un `PUT` con el saldo absoluto. Esto previene condiciones de carrera si dos personas modifican el saldo al mismo tiempo. El endpoint recibirá un objeto con `{ "monto": BigDecimal, "motivo": String (opcional) }`, y sumará/restará dicho monto a `CuentaCorrienteDinero.balancePesos`.

## Risks / Trade-offs

- **Risk**: Al no tener un registro (log) de ajustes de saldo de forma nativa, si el usuario se equivoca, no habrá un historial fácil de auditar. 
  - **Mitigation**: El sistema es utilizado por pocas personas (entorno de confianza). En un futuro iteración se podría agregar una tabla `MovimientoCuentaCorriente`. Por ahora, la simplicidad de actualizar el balance directamente favorece la velocidad de entrega.
