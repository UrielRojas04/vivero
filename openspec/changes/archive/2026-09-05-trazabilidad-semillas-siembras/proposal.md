## Why

Hoy "Ingresos de Semillas" (RegistroSemilla) y "Siembras" (Siembra) son dos pantallas totalmente aisladas: el código de lote se tipea a mano en ambos lados sin ninguna validación cruzada, no hay forma de saber qué semillas ya se sembraron y cuáles siguen pendientes, y Sergio (Jefe) no tiene ninguna forma de anticipar qué hay que sembrar en las próximas dos semanas cuando un cliente trae semilla para sembrar en una fecha futura (la próxima semana, el próximo mes, en 3 meses). El propio modelo de `RegistroSemilla` ya dejó previsto este vínculo (comentario en el código: *"si en el futuro se necesita trazar 'de este sobre salió esta siembra', se agrega una FK opcional Siembra.registroSemillaId"*).

## What Changes

- `Siembra` gana una FK opcional a `RegistroSemilla` (sólo aplica a origen `SOBRE`; `SUELTO` no tiene registro de origen).
- El formulario de Siembra, con origen `SOBRE`, reemplaza el input de texto libre de código de lote por un buscador/selector sobre los `RegistroSemilla` existentes (por lote, cliente o quién trajo la semilla). Al elegir uno, autocompleta el código de lote.
- Cuando el `RegistroSemilla` vinculado tiene `unidadCantidad` en `SEMILLAS` o `SOBRES` (no `GRAMOS` — fuera de alcance por ahora, ver Impact), el sistema calcula un valor por defecto y **editable** de "Cantidad Inicial (Bandejas)" para la siembra, dividiendo la cantidad de semillas del registro por las celdas de la `VariedadBandeja` elegida. Queda editable porque en la práctica se pierden semillas o se ponen varias por celda, así que el cálculo es una sugerencia, no una restricción.
- `RegistroSemilla` gana un campo `estado` (`SIN_SEMBRAR` por defecto, `SEMBRADAS`, `CONSUMIDA`):
  - Pasa a `SEMBRADAS` automáticamente en cuanto se vincula a una siembra (no espera a que la siembra termine de crecer, que puede tardar meses).
  - Un registro en estado `SEMBRADAS` sigue disponible para vincularse a otra siembra (por ejemplo si se reparte en tandas).
  - `CONSUMIDA` es manual: un botón "Consumir" en la pantalla de Ingresos de Semillas, que Sergio aprieta cuando decide que no queda más semilla utilizable de ese registro. Una vez `CONSUMIDA`, el registro deja de aparecer como opción para vincular en siembras nuevas.
- `RegistroSemilla` gana un campo opcional `fechaSiembraProgramada` (distinto de `fechaRecepcion`): la fecha en la que ese lote de semilla debe sembrarse, que puede ser muy posterior a cuando el cliente la trajo.
- La pantalla de Ingresos de Semillas suma dos filtros junto a la barra de búsqueda: "Quincena actual" y "Próxima quincena", calculados automáticamente en base a la fecha de hoy (no hace falta tocar el backend: la lista ya se trae completa y se filtra en el cliente).

## Capabilities

### New Capabilities
- `trazabilidad-semillas-siembras`: vínculo opcional entre un `RegistroSemilla` y una o más `Siembra`, el ciclo de estados del registro (`SIN_SEMBRAR` → `SEMBRADAS` → `CONSUMIDA`), la fecha de siembra programada y los filtros de quincena en Ingresos de Semillas.

### Modified Capabilities
- `gestion-siembras`: el formulario de siembra con origen `SOBRE` cambia el input de código de lote (texto libre) por un buscador de `RegistroSemilla`, y agrega el cálculo por defecto (editable) de bandejas en base a la conversión semillas → bandejas.

## Impact

- **Backend**: `Siembra` (nueva columna `registro_semilla_id`, FK opcional), `RegistroSemilla` (nuevas columnas `estado` y `fecha_siembra_programada`), `SiembraServiceImpl`/`RegistroSemillaServiceImpl` (lógica de vínculo y transición de estado), nuevo endpoint para "consumir" un registro.
- **Frontend**: `SiembraForm.jsx` (selector de registro + autocálculo editable de bandejas), `RegistroSemillaForm.jsx` (nuevo campo de fecha programada), `RegistroSemillas.jsx` (filtros de quincena + botón Consumir + badge de estado).
- **Fuera de alcance (por decisión explícita del dueño, se puede retomar después)**: conversión de `GRAMOS` a cantidad de semillas (no existe campo de "peso por semilla" en el modelo; los registros en gramos no ofrecen el autocálculo de bandejas y siguen cargándose 100% manual, igual que hoy).
- **Dependencia**: se apoya en el modelo de `RegistroSemilla` introducido por el change `registro-semillas-clientes`, que a la fecha está en progreso (46/47 tareas) y todavía no fue archivado — sus specs no existen aún en `openspec/specs/`, así que esta propuesta no lo lista como "Modified Capability" formal; conviene archivarlo antes o en paralelo.
