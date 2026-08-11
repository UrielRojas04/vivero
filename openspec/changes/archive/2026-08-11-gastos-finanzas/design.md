## Context

El sistema Vivero actual cuenta con una sección de "Finanzas" (o "Caja") que solo visualiza las ganancias y movimientos asociados a ventas (ingresos). Para un flujo de caja (cashflow) realista, el cliente necesita incorporar el concepto de "Gasto" o egreso monetario de forma paralela. 

## Goals / Non-Goals

**Goals:**
- Crear el modelo y lógica de persistencia completa para la entidad `Gasto`.
- Proveer API endpoints paginados y ordenados de forma descendente para los gastos.
- Actualizar el dashboard/listado de Finanzas en el frontend para mostrar Gastos al lado de los Ingresos, también de forma descendente (los más recientes primero).

**Non-Goals:**
- No se creará una cuenta corriente para proveedores (los gastos son genéricos o "flat" por ahora).
- No se asociarán gastos a impuestos de manera compleja. El gasto es solo `(concepto, monto, fecha)`.

## Decisions

- **Entidad Gasto**: Se creará una nueva entidad `Gasto` independiente (no se fusionará con `MovimientoCaja` ni se hará polimorfismo si la actual no lo soporta, para mantener el diseño flat actual del proyecto). Campos: `id`, `concepto` (String), `monto` (BigDecimal), `fecha` (LocalDateTime).
- **Ordenamiento Paginado**: En el `GastoController` y en el controlador de finanzas (ventas/ingresos), se inyectará el `Sort.by(Sort.Direction.DESC, "id")` o `"fecha"` directamente en el `PageRequest` para garantizar que la UI siempre reciba los más nuevos primero sin esfuerzo extra.
- **Frontend Layout**: Se agregará una subsección en el Dashboard de Finanzas (`Finanzas.jsx`), diviendo el layout principal (ej. usando un grid de 2 columnas) para mostrar Ingresos a la izquierda y Gastos a la derecha.

## Risks / Trade-offs

- **Risk**: Desbalance temporal. Si el sistema un día muta a un Cashflow unificado, tener "Gasto" y "Venta" en tablas separadas obligará a hacer un `UNION` en la base de datos o juntar 2 llamadas en el backend.
- **Mitigation**: Dado el tamaño del ERP, hacer llamadas separadas al backend y renderizar dos listas independientes es aceptable y performante. Más adelante se puede crear un `CashflowService` agregador si hace falta.
