## Why

Al registrar una siembra, el sistema hoy exige un único campo libre `numeroLote` que se usa indistintamente para dos conceptos que en la operación real del vivero son distintos: el código de lote impreso por el proveedor en el sobre de semillas, y el número de siembra interno que el vivero asigna y escribe en todas las bandejas de esa siembra para saber a qué cliente y a qué sobre pertenecen. Además, no toda siembra proviene de un sobre: cuando se siembra con semilla suelta sacada de una bolsa no existe código de lote alguno, pero el operario igual necesita registrar el número de siembra. Con un solo campo obligatorio y sin distinción de origen, el dato queda ambiguo y la trazabilidad entre bandeja, sobre y cliente no se puede reconstruir.

## What Changes

- Se incorpora al registro de siembra la selección del **origen de la semilla**, con dos valores excluyentes: `SOBRE` (semilla comercial en sobre, que trae código de lote impreso) y `SUELTO` (semilla tomada de una bolsa, sin código de lote).
- Se incorpora el campo **número de siembra**, obligatorio siempre, cualquiera sea el origen. Es el identificador interno que el vivero asigna a la siembra y replica en todas sus bandejas para vincularlas con su cliente y con su sobre de procedencia.
- El campo de **código de lote** pasa a ser **condicional**: obligatorio cuando el origen es `SOBRE`, y ausente (vacío) cuando el origen es `SUELTO`.
- **BREAKING** (interno, sin consumidores externos): se renombra el campo `numeroLote` a `codigoLote` en entidad, DTO y frontend, para eliminar la ambigüedad con el nuevo `numeroSiembra`. La decisión y su costo de migración quedan documentados en `design.md` y requieren confirmación del usuario antes de ejecutarse.
- Se establece explícitamente que **el código de lote NO es único**: varias siembras distintas pueden compartir el mismo código de lote cuando de un mismo sobre salen siembras para clientes diferentes, y cada una lleva su propio número de siembra.
- El formulario de siembra (`SiembraForm.jsx`) suma un selector visual de dos botones para el origen, muestra u oculta el campo de código de lote según la selección, y valida el número de siembra como obligatorio.

## Capabilities

### New Capabilities

Ninguna. El registro de siembras ya está cubierto por la capacidad existente `gestion-siembras`.

### Modified Capabilities

- `gestion-siembras`: el requisito "Registro de Siembras" cambia su contrato de datos. Se agregan el origen de la semilla y el número de siembra como datos del registro, y el código de lote pasa de obligatorio incondicional a obligatorio sólo cuando el origen es `SOBRE`. Se agrega además el requisito de trazabilidad que fija la no unicidad del código de lote entre siembras.

## Impact

**Backend**

- `backend/src/main/java/com/vivero/gestion/models/TipoOrigenSiembra.java` (nuevo enum `SOBRE`, `SUELTO`).
- `backend/src/main/java/com/vivero/gestion/models/Siembra.java`: nuevos campos `tipoOrigen` y `numeroSiembra`; renombre de `numeroLote` a `codigoLote`.
- `backend/src/main/java/com/vivero/gestion/dto/SiembraDTO.java`: mismos tres cambios de campos.
- `backend/src/main/java/com/vivero/gestion/services/impl/SiembraServiceImpl.java`: mapeo manual en `crearSiembra`, `actualizarSiembra` y `mapToDTO`, más la validación de negocio del origen.

**Frontend**

- `frontend/src/components/SiembraForm.jsx`: selector de origen, campo condicional de código de lote, campo de número de siembra.
- `frontend/src/pages/Siembras.jsx`, `frontend/src/layouts/DashboardLayout.jsx`, `frontend/src/components/FinalizarSiembraModal.jsx`, `frontend/src/components/PaseStockModal.jsx`: consumen `numeroLote` para mostrarlo en listados, alertas y modales; deben adaptarse al renombre y contemplar el caso sin código de lote.

**Base de datos**

- Tabla `siembras`. El proyecto usa `spring.jpa.hibernate.ddl-auto=update`, que agrega columnas nuevas pero nunca renombra ni elimina las existentes. El renombre exige un `ALTER TABLE ... RENAME COLUMN` manual previo al arranque, y las filas ya existentes requieren backfill de `tipo_origen`. Detalle y riesgo en `design.md`.

**Sin impacto**

- Contratos HTTP de `SiembraController`: no cambian rutas ni verbos, sólo la forma del `SiembraDTO`.
- No hay consumidores externos del API ni datos semilla de `Siembra` en `DataInitializer`.
