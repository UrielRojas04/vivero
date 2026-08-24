## Context
Actualmente la entidad `Pago` solo guarda monto, método y fecha. Todos los pagos se suman asumiendo que son dinero efectivo y definitivo. Cuando un cheque rebota, no hay un mecanismo para marcarlo como inválido sin borrar el registro. 

## Goals / Non-Goals

**Goals:**
- Permitir rechazar un cheque que rebotó.
- Mantener el registro histórico del pago rechazado.
- Reflejar la deuda original tras rechazar el pago.
- Mostrar visualmente el estado "Rechazado" en la interfaz.

**Non-Goals:**
- No se implementará un historial de estados complejo (por ahora es binario: Acreditado / Rechazado).
- No se automatizará el rechazo mediante integración bancaria.

## Decisions

1. **Estado en Base de Datos**: Se agrega una columna `estado` a `Pago` usando un Enum (`ACREDITADO`, `RECHAZADO`). El valor por defecto es `ACREDITADO`. Esto aprovecha `ddl-auto=update` para crear la columna y manejará registros antiguos con `null` si mapeamos correctamente en el backend.
2. **Cálculo de Deuda**: El método `getSaldoDeudor()` en el backend se actualizará para filtrar los pagos que no estén en estado `ACREDITADO`.
3. **UI Independiente**: En la vista de "Abonó", si la venta tiene múltiples pagos, se listarán verticalmente o separados, permitiendo agregar un botón `(X)` específico al lado de los pagos `CHEQUE` para rechazarlos.

## Risks / Trade-offs

- **Riesgo**: Registros antiguos en la base de datos tendrán `estado = null`.
- **Mitigación**: Trataremos `null` como `ACREDITADO` en el DTO/backend o haremos que JPA asigne un default. En el DTO, `estado == null ? "ACREDITADO" : estado.name()`.
