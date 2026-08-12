## Context

Actualmente `VariedadPlanta` almacena los días de crecimiento como un único valor estático `Integer diasCrecimiento`. Para reflejar el comportamiento real estacional de los viveros, se requiere que cada planta defina la cantidad de días que tarda en crecer dependiendo del mes en el que se realice la siembra.

## Goals / Non-Goals

**Goals:**
- Reemplazar la propiedad estática de días por una configuración de 12 meses.
- Actualizar el Backend para persistir y exponer esta nueva estructura.
- Desarrollar una UI limpia e intuitiva (grilla de meses) en el formulario de Variedad de Planta.
- Integrar la lógica para que el modal de Nueva Siembra calcule la fecha estimada basada en el mes actual.

**Non-Goals:**
- Modelar crecimiento por quincena, semana o estación genérica. Será estrictamente por mes del año (Enero a Diciembre).
- Actualizar retrospectivamente siembras pasadas. Las siembras ya creadas mantienen su fecha estimada original.

## Decisions

- **Modelo de Datos (JPA/PostgreSQL)**: Se optará por la simplicidad y robustez: se reemplazarán el campo `diasCrecimiento` por 12 campos en la tabla `variedad_planta` (`dias_enero`, `dias_febrero`, ..., `dias_diciembre`). Esto evita la sobrecarga de una tabla relacional extra o la complejidad de consultas JSONB para un caso tan estático y acotado.
- **DTO y API**: El `VariedadPlantaDTO` encapsulará estos 12 campos dentro de un sub-objeto o directamente como campos. Para simplificar el mapeo en React, lo mapearemos como `diasPorMes` con claves numéricas o por nombre (ej: `{ 1: 30, 2: 32, ... }` o `{ enero: 30, febrero: 32 }`). Usaremos un objeto `{ enero: Integer, febrero: Integer ... }`.
- **Cálculo de Siembra**: `SiembraForm.jsx` usará el mes de la `fechaSiembra` (usualmente hoy) para buscar en el objeto de la planta cuántos días sumar para calcular la `fechaEstimada`.

## Risks / Trade-offs

- **Migración**: El campo `dias_crecimiento` será removido, lo que implica pérdida de ese dato para registros existentes a menos que se haga una migración SQL (como estamos en fase de desarrollo con `ddl-auto=update`, probablemente solo debamos re-sembrar los datos iniciales o permitir nulos temporalmente).
- **Sobrecarga de Formulario**: Pedir 12 campos al crear una planta puede ser tedioso. **Mitigación**: Implementar una acción "Aplicar a todos" o inicializar todos los meses con el mismo valor ingresado en Enero, permitiendo al usuario ajustar solo los que difieren.
