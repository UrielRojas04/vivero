## Why

Actualmente los días de crecimiento de una VariedadPlanta son un valor fijo. Sin embargo, en la realidad el tiempo que tarda en crecer una planta varía según la estación o el mes del año debido al clima. Poder configurar los días de crecimiento para cada mes del año permitirá que el sistema calcule la fecha estimada de entrega de una siembra con mucha mayor precisión.

## What Changes

- Modificación de la entidad `VariedadPlanta` para almacenar los días de crecimiento por cada uno de los 12 meses (enero a diciembre).
- Actualización de los DTOs y Servicios en el backend (Spring Boot) para mapear esta nueva estructura de datos.
- Modificación del componente `VariedadPlantaForm` (React) para ofrecer una interfaz amigable, bonita y profesional donde el usuario pueda cargar los días por mes.
- Actualización del componente `SiembraForm` y la lógica de cálculo para que, al seleccionar una planta, busque los días de crecimiento del mes actual (o el mes seleccionado para la siembra) y calcule la fecha estimada.

## Capabilities

### New Capabilities

### Modified Capabilities
- `variedades-plantas`: Se modifican los requerimientos de registro y edición para incluir la configuración mensual de los días de crecimiento en lugar de un único valor.
- `gestion-siembras`: Se modifica el cálculo de la fecha estimada de entrega al registrar una siembra, el cual ahora es dinámico y depende del mes actual.

## Impact

- **Base de datos / Backend**: Cambio de esquema en la tabla `variedad_planta` (reemplazar columna `dias_crecimiento` por 12 columnas correspondientes a los meses o estructura equivalente JSON).
- **Frontend**: Componentes `VariedadPlantaForm`, `SiembraForm`, y la visualización en la tabla de `VariedadesPlantas` (posiblemente mostrar un promedio o un tooltip con todos los meses).
