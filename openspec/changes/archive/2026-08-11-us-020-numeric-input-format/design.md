## Context

Actualmente en el sistema, la entrada de montos monetarios o números grandes (precio de productos, saldo, gastos) se realiza mediante inputs de tipo numérico o texto básicos. Los usuarios tienen dificultad para saber si escribieron "600000" o "6000000" porque el número no se separa con puntos de miles al vuelo.

## Goals / Non-Goals

**Goals:**
- Formatear automáticamente en tiempo real los inputs numéricos (agregar separadores de miles y coma decimal según el locale `es-AR`).
- Mantener la integridad de los datos enviando a la API y almacenando internamente números decimales crudos sin formato (`float` o `BigDecimal`).
- Aplicar esto en los modales de gastos, ajustes de cuenta corriente, pagos y formularios de catálogo de productos.

**Non-Goals:**
- No se migrará a una librería pesada de formularios si se puede resolver con un hook o componente de máscara de entrada sencillo.
- No se formatearán los IDs ni los inputs numéricos pequeños (como cantidades de stock menores a mil).

## Decisions

- **Implementación de un componente `CurrencyInput` (o similar):** Se creará un componente reutilizable envolviendo el `<input>` estándar.
- **Manejo del valor (Value vs Display):** El componente mantendrá internamente un estado del valor formateado (String, ej. "6.000.000") para mostrar al usuario, y llamará a `onChange` entregando el valor numérico (Number, ej. 6000000) o un evento modificado.
- **Uso de react-number-format:** Si no se desea introducir nuevas librerías, se desarrollará un formateador simple usando expresiones regulares o `Intl.NumberFormat` dentro del evento `onChange`. Dado que es React puro, un componente propio controlado es suficiente.

## Risks / Trade-offs

- **Risk:** Conflicto de cursor al editar en medio del número formateado.
  **Mitigation:** El uso de una máscara rudimentaria puede causar saltos de cursor. Se implementará de forma que limpie todo formato en el des-foco, o se actualizará cuidadosamente el input en tiempo real asegurando que el input mantenga el foco o delegándolo al final de la edición (`onBlur`). Otra opción popular y robusta es solo mostrar el formato visualmente pero cuando el input está enfocado mostrar el número puro.
  **Decision final:** Para máxima compatibilidad, mostraremos el número formateado con `Intl.NumberFormat('es-AR')` usando puntos y comas. Al hacer foco, se mantendrá formateado controlando la cadena pura de números introducida.
