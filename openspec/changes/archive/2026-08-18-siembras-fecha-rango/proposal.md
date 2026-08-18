## Why

Hoy el registro de siembra no guarda en ningún lado **cuándo se sembró**. La entidad `Siembra` tiene un único campo de fecha, `fechaEstimada`, que es la fecha estimada de entrega: se calcula hacia adelante a partir de la tabla de días de crecimiento por mes de la variedad, y no dice nada sobre el día en que efectivamente se puso la semilla en la bandeja. Ese dato falta por completo.

Además, en la operación real del vivero una misma siembra no siempre se hace en un solo día. Cuando el pedido involucra muchas bandejas, el trabajo se reparte a lo largo de varias jornadas: se siembra un lunes una parte, un martes otra, y todo eso constituye una única siembra con un único número de siembra y un único dueño. Registrar solamente un día obligaría al operario a elegir arbitrariamente uno de ellos y perder la información de que la siembra se extendió en el tiempo, que es justamente lo que determina cuán escalonada va a estar la entrega.

## What Changes

- Se incorpora al registro de siembra la **fecha de siembra**, entendida como el día o el período en que la semilla fue efectivamente colocada en las bandejas. Es un concepto nuevo: no reemplaza ni reinterpreta `fechaEstimada`, que sigue siendo la fecha estimada de entrega.
- La fecha de siembra admite **dos modalidades**: un único día, o un rango de días (desde / hasta). Ambas se persisten con la misma estructura de datos, de modo que el resto del sistema no necesita distinguir casos especiales para leerla.
- Se agregan los campos `fechaSiembraInicio` y `fechaSiembraFin` a la entidad, al DTO y al formulario. Una siembra de un solo día guarda **la misma fecha en los dos campos**; una siembra en rango guarda el primer y el último día.
- El servicio valida que la fecha de siembra esté presente en toda siembra creada o editada de aquí en adelante, y que la fecha de fin no sea anterior a la de inicio. Las siembras ya cargadas quedan sin fecha de siembra, porque ese dato no puede reconstruirse retroactivamente.
- El formulario de siembra (`SiembraForm.jsx`) suma un selector visual de dos botones, "Un día" / "Rango de días", que alterna entre un campo de fecha y dos (Desde / Hasta), replicando el patrón de toggle ya usado en el propio formulario para el origen de la semilla.
- El listado de siembras (`Siembras.jsx`) muestra la fecha de siembra como dato secundario, en formato compacto: un solo día cuando inicio y fin coinciden, un rango cuando difieren.
- La fecha estimada de entrega pasa a calcularse **a partir de la fecha de siembra** en lugar de a partir del día actual, alineando la implementación con lo que la spec de `gestion-siembras` ya describe hoy. Esta parte queda expuesta como decisión abierta en `design.md` por modificar un comportamiento existente.

## Capabilities

### New Capabilities

Ninguna. El registro de siembras ya está cubierto por la capacidad existente `gestion-siembras`.

### Modified Capabilities

- `gestion-siembras`: el requisito "Registro de Siembras" incorpora la fecha de siembra al contrato de datos del registro, con sus dos modalidades (día único y rango) y sus reglas de validación. Se agrega además un requisito nuevo que fija cómo se representa, se valida y se muestra el período de siembra, y cómo se deriva de él la fecha estimada de entrega.

## Impact

**Backend**

- `backend/src/main/java/com/vivero/gestion/models/Siembra.java`: nuevos campos `fechaSiembraInicio` y `fechaSiembraFin`, ambos `LocalDate` y nullables en base.
- `backend/src/main/java/com/vivero/gestion/dto/SiembraDTO.java`: los mismos dos campos.
- `backend/src/main/java/com/vivero/gestion/services/impl/SiembraServiceImpl.java`: nueva validación y normalización de la fecha de siembra, más el mapeo manual en los tres puntos habituales (`crearSiembra`, `actualizarSiembra`, `mapToDTO`).

**Frontend**

- `frontend/src/components/SiembraForm.jsx`: selector de modalidad, campos de fecha condicionales, validación de rango y recálculo de la fecha estimada.
- `frontend/src/pages/Siembras.jsx`: presentación de la fecha de siembra en la tarjeta mobile y en la fila de la tabla desktop.

**Base de datos**

- Tabla `siembras`, con 7 filas cargadas al momento de escribir esta propuesta. Se agregan dos columnas `date` nullables. A diferencia del change anterior (`siembras-origen-lote`), acá no hay renombre: `ddl-auto=update` agrega columnas nuevas por sí solo sin riesgo de pérdida de datos. Detalle en `design.md`.

**Sin impacto**

- `SiembraController`: no cambian rutas ni verbos, sólo la forma del `SiembraDTO`.
- `FinalizarSiembraModal.jsx`, `PaseStockModal.jsx` y `DashboardLayout.jsx`: se evalúan explícitamente en `design.md` y se dejan fuera de alcance, con su justificación.
- `DataInitializer` no crea filas semilla de `Siembra`, así que no requiere ajustes.
