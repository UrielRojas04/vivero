## Why

El jefe del vivero necesita saber exactamente cuántas semillas corresponden a cuántas bandejas (y viceversa) basándose en la cantidad de celdas que tiene el tipo de bandeja. Esto es importante para planificar las siembras, tener un control preciso del stock de semillas consumido, y estimar la producción final. Un conversor rápido a la mano facilita el trabajo diario sin depender de cálculos mentales o calculadoras externas.

## What Changes

- Se agregará un "mini conversor" interactivo en la vista de siembras. Este widget permitirá ingresar la cantidad de semillas o la cantidad de bandejas, seleccionar el tipo de bandeja (cantidad de celdas), y mostrará el equivalente automáticamente.
- Al registrar un lote de siembra o producto nuevo que involucre bandejas, se integrará la lógica de conversión para que el usuario pueda ver la correspondencia entre semillas y bandejas de manera nativa y transparente.
- Diseño de la interfaz simple, profesional y accesible ("a mano").

## Capabilities

### New Capabilities
- `conversor-semillas`: Conversor en tiempo real de semillas a bandejas (y viceversa) basado en la cantidad de celdas por bandeja.

### Modified Capabilities
- `gestion-siembras`: Se modifica la interfaz de registro de siembras para incorporar la información de la conversión semillas/bandejas al momento de cargar un lote.

## Impact

- Frontend: Modificaciones en las pantallas de Siembras (React) para incrustar el mini conversor y actualizar el formulario de registro.
- No hay impacto fuerte en la base de datos a menos que se desee persistir específicamente la cantidad de semillas en la tabla de siembras (si actualmente solo guarda bandejas).
