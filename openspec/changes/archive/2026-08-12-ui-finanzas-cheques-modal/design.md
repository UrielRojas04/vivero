## Context

En el dashboard de Finanzas (`Finanzas.jsx`), se muestra una tarjeta resumen "Valores a Depositar (Cheques)" que totaliza el monto de todos los cheques en cartera. Actualmente, los usuarios no tienen forma de ver qué cheques componen ese total sin tener que abandonar la página y navegar al módulo de Cheques, perdiendo contexto.

## Goals / Non-Goals

**Goals:**
- Permitir hacer click en la tarjeta "Valores a Depositar (Cheques)" para abrir la sección de detalle en el área principal, ocultando los gráficos (comportamiento "drill-down" similar a Ventas y Gastos).
- Mostrar una tabla o listado claro de los cheques que están en estado `EN_CARTERA` y que componen ese total.

**Non-Goals:**
- No se editarán estados de cheques desde este modal. Es de solo lectura.
- No se crearán nuevos endpoints en el backend; se reutilizará la lógica del store o la consulta paginada actual.

## Decisions

- **UI del Detalle**: Se integrará en línea en `Finanzas.jsx` usando un bloque similar a `showVentas` y `showGastos`, controlado por un estado `showCheques`.
- **Filtros**: Dado que `Finanzas.jsx` no tiene en su estado todos los cheques, se hará una request on-demand (usando `react-query`) filtrando por estado `EN_CARTERA`.

## Risks / Trade-offs

- **Risk**: El endpoint actual de cheques no soporte filtrado por estado y traiga demasiada info. → **Mitigación**: Si el volumen es bajo, filtrar en frontend. Idealmente, asegurar que el backend devuelva solo los pendientes, pero para un Vivero Pyme, un fetch simple alcanza.
