## Context

El registro de siembras se apoya hoy en un único campo `numeroLote` (String, obligatorio, siempre visible) que atraviesa toda la pila: `Siembra`, `SiembraDTO`, el mapeo manual de `SiembraServiceImpl` y cinco archivos del frontend. Ese campo carga con dos significados operativos que en el vivero son cosas distintas:

- El **código de lote** que el proveedor imprime en el sobre de semillas. Identifica al sobre físico y es dato del proveedor, no del vivero.
- El **número de siembra** que el vivero asigna internamente y escribe en todas las bandejas que salieron de esa siembra. Sirve para saber a qué cliente pertenece cada bandeja y de qué sobre salió. El vivero además anota ese mismo número sobre el sobre, para cerrar el vínculo en las dos direcciones.

La operación real tiene dos orígenes de semilla. Cuando la siembra sale de un **sobre** comercial existen ambos datos. Cuando sale de semilla **suelta** tomada de una bolsa no hay sobre y por lo tanto no hay código de lote, pero el número de siembra sigue siendo necesario para saber de qué cliente es. Además, de un mismo sobre pueden salir varias siembras para clientes distintos: comparten el código de lote del sobre y se diferencian por su número de siembra.

Restricciones técnicas relevantes del proyecto, verificadas sobre el código:

- `spring.jpa.hibernate.ddl-auto=update`. Hibernate agrega columnas nuevas, pero nunca renombra ni elimina columnas existentes.
- El backend **no usa Bean Validation en ningún lado**: no hay una sola anotación `@NotNull`, `@NotBlank` ni `@Valid` en `com.vivero.gestion`. La validación vive en el frontend y, cuando hace falta regla de negocio, en la capa de servicio.
- El mapeo DTO/entidad de siembras es **manual y explícito**, en tres puntos de `SiembraServiceImpl`: `crearSiembra`, `actualizarSiembra` y `mapToDTO`. No hay mapper automático ni `BeanUtils.copyProperties`, así que cada campo nuevo debe agregarse a mano en los tres lugares.
- `DataInitializer` **no crea filas semilla de `Siembra`**. Las filas existentes en la tabla `siembras` provienen del uso real de la aplicación.
- `Siembra` ya persiste un enum (`EstadoSiembra`) con `@Enumerated(EnumType.STRING)`. Es el patrón establecido para enums en esta entidad.
- `SiembraService.obtenerTodas()` devuelve `List<SiembraDTO>` sin paginación. Es una deuda preexistente que este change no introduce ni resuelve.

## Goals / Non-Goals

**Goals:**

- Modelar el origen de la semilla como un dato explícito y excluyente (`SOBRE` / `SUELTO`) en el registro de siembra.
- Separar en dos campos distintos el código de lote del proveedor y el número de siembra interno del vivero, eliminando la ambigüedad actual.
- Hacer que el código de lote sea obligatorio sólo cuando el origen es `SOBRE`, y nulo cuando es `SUELTO`.
- Hacer que el número de siembra sea obligatorio en todos los casos.
- Dejar asentado por escrito, en el código y en la spec, que el código de lote no es único entre siembras.
- Mantener la coherencia de los datos ya cargados en la tabla `siembras`.

**Non-Goals:**

- No se modela el sobre como entidad propia. Un sobre no es una fila en la base; es un código de lote repetido entre varias siembras. Agrupar siembras por sobre es una consulta, no una relación.
- No se agrega paginación a `obtenerTodas()`. Es deuda preexistente y ajena a este change.
- No se introduce Bean Validation en el backend. Se sigue el patrón vigente del proyecto.
- No se toca el flujo de finalización ni el pase a stock más allá de adaptar las etiquetas que hoy leen `numeroLote`.
- No se agrega restricción de unicidad sobre el código de lote. Es explícitamente lo contrario de lo que necesita el negocio.

## Decisions

### Decisión 1: `tipoOrigen` como enum Java persistido con `@Enumerated(EnumType.STRING)`

Se crea `TipoOrigenSiembra { SOBRE, SUELTO }` en `com.vivero.gestion.models`, y `Siembra` lo persiste anotado con `@Enumerated(EnumType.STRING)`, igual que `EstadoSiembra`.

Alternativas descartadas:

- **Un `boolean esSobre`.** Más barato hoy, pero cierra la puerta a un tercer origen y produce un nombre de columna que no se lee solo. El dominio ya tiene el vocabulario "sobre" y "suelto"; conviene que el código lo hable.
- **`EnumType.ORDINAL`.** Guarda enteros y rompe silenciosamente si mañana se reordenan los valores del enum. El proyecto ya eligió `STRING` para `EstadoSiembra`; se respeta la convención.
- **Un `String` libre.** Reintroduce exactamente el problema que este change viene a corregir.

### Decisión 2: `numeroSiembra` es un campo nuevo, no un reciclaje de `numeroLote`

`numeroSiembra` (String) se agrega como campo nuevo, obligatorio en ambos orígenes. No se reutiliza `numeroLote` para este fin, porque los datos ya cargados en `numeroLote` son códigos de lote de sobre, no números de siembra. Reinterpretarlos como números de siembra corrompería el significado de las filas históricas.

### Decisión 3: renombrar `numeroLote` a `codigoLote` (requiere confirmación del usuario)

**Recomendación: renombrar.** Con `numeroSiembra` en escena, un campo llamado `numeroLote` que en realidad guarda el código del sobre es una trampa activa para quien lea el código después. `codigoLote` es además el término que usa el propio usuario para describirlo.

Alcance real del renombre, medido sobre el repo:

| Archivo | Ocurrencias |
|---|---|
| `backend/.../models/Siembra.java` | 1 (declaración del campo) |
| `backend/.../dto/SiembraDTO.java` | 1 (declaración del campo) |
| `backend/.../services/impl/SiembraServiceImpl.java` | 3 (`crearSiembra`, `actualizarSiembra`, `mapToDTO`) |
| `frontend/src/components/SiembraForm.jsx` | 4 |
| `frontend/src/pages/Siembras.jsx` | 3 |
| `frontend/src/layouts/DashboardLayout.jsx` | 1 |
| `frontend/src/components/FinalizarSiembraModal.jsx` | 1 |
| `frontend/src/components/PaseStockModal.jsx` | 1 |

Son quince ocurrencias en ocho archivos, todas mecánicas. Lo que no es mecánico es la base de datos: con `ddl-auto=update`, renombrar el campo Java hace que Hibernate **cree una columna nueva `codigo_lote` vacía y deje `numero_lote` intacta con todos los datos adentro**, huérfana e invisible para la aplicación. No falla, no avisa: los códigos de lote simplemente desaparecen de la interfaz. Por eso el renombre exige un `ALTER TABLE ... RENAME COLUMN` manual ejecutado **antes** de levantar el backend con el código nuevo.

Alternativa considerada: **conservar `numeroLote` y cambiar sólo la etiqueta visible**. Cuesta cero en migración y cero en archivos tocados. Se descarta como recomendación porque deja el nombre engañoso incrustado en la entidad, el DTO y el JSON del API justo cuando se suma un segundo campo casi homónimo, que es cuando más caro sale confundirlos. Sigue siendo una opción defendible si se prefiere no tocar la base.

**Esta decisión queda abierta a confirmación del usuario antes de ejecutar la tarea 1** (ver Open Questions). El change es de gobernanza MEDIA: modifica el modelo de dominio y datos ya persistidos, así que la decisión se expone en vez de tomarse en silencio.

### Decisión 4: validación en la capa de servicio, no con Bean Validation

La regla del origen se valida en `SiembraServiceImpl`, en un método privado invocado desde `crearSiembra` y `actualizarSiembra`:

- `tipoOrigen` nulo → rechazo.
- `numeroSiembra` nulo o en blanco → rechazo.
- `tipoOrigen == SOBRE` y `codigoLote` nulo o en blanco → rechazo.
- `tipoOrigen == SUELTO` → `codigoLote` se normaliza a `null` antes de persistir, sin importar lo que haya llegado en el DTO.

Alternativa descartada: **anotar el DTO con `@NotBlank` y el controller con `@Valid`.** Es lo que haría un proyecto Spring típico, pero este proyecto no usa Bean Validation en ninguna entidad. Introducirlo sólo aquí crearía dos estilos de validación conviviendo, y además la regla central es condicional entre dos campos, cosa que `@NotBlank` no expresa: necesitaría igual un validador a medida a nivel clase. La capa de servicio resuelve el caso completo con el patrón que el repo ya usa.

La normalización de `SUELTO` se hace en el servidor y no sólo en el formulario, para que el invariante valga aunque el request llegue desde otro lado.

### Decisión 5: columnas nuevas nullables en base, obligatoriedad aplicada en servicio

Ni `numero_siembra` ni `tipo_origen` se declaran `NOT NULL` en la base. Con `ddl-auto=update`, agregar una columna `NOT NULL` sin default a una tabla con filas existentes hace fallar el arranque de Hibernate. Las filas históricas no tienen número de siembra y no hay forma de inventárselo: ese dato está escrito en bandejas físicas, no en el sistema.

En consecuencia: la base acepta nulos, y la obligatoriedad se aplica en el servicio a toda siembra creada o editada desde ahora. Las filas viejas conservan `numeroSiembra` nulo hasta que alguien las edite, momento en el cual el servicio exigirá el dato. La interfaz debe tolerar un número de siembra ausente al mostrar registros históricos.

### Decisión 6: el escenario de "un sobre, tres clientes" no requiere cambio de modelo

Cada siembra ya es una fila independiente con su propio `dueno`. Tres siembras del mismo sobre para tres clientes son tres filas que comparten `codigoLote` y difieren en `numeroSiembra` y `dueno`. Funciona sin cambios estructurales.

El único requisito derivado es negativo y hay que sostenerlo activamente: **no agregar nunca `unique = true` ni un índice único sobre `codigo_lote`.** Es una restricción tentadora para quien vea un campo llamado "código" y asuma que identifica. Por eso queda escrita como requisito en la spec y como comentario en la entidad, no sólo en este documento.

### Decisión 7: selector de origen con el patrón de dos botones ya usado en el repo

`SiembraForm.jsx` incorpora un par de botones `type="button"` en un `grid grid-cols-1 sm:grid-cols-2 gap-3`, con el botón activo marcado por `border-emerald-500 bg-emerald-50 text-emerald-700 font-bold` y el inactivo por `border-gray-200 bg-white text-gray-600 hover:bg-gray-50`, todos con `cursor-pointer`. Es exactamente el patrón del toggle "Tipo de Cheque" de `NuevoChequeModal.jsx` y del toggle de `AjusteSaldoModal.jsx`.

Alternativas descartadas: un `<select>` de dos opciones (esconde una decisión binaria que conviene ver de un vistazo, y el formulario ya tiene varios selects) y radios nativos (el repo no los usa en ningún formulario; romperían la coherencia visual).

El campo de código de lote se renderiza condicionalmente sólo con `SOBRE`. Al pasar a `SUELTO` el formulario limpia `codigoLote` en el estado, para que un valor tipeado y luego oculto no viaje en el submit. El campo de número de siembra se renderiza siempre, con `required`.

## Risks / Trade-offs

- **El renombre borra los códigos de lote de la vista si se omite el ALTER TABLE.** Hibernate crea `codigo_lote` vacía y abandona `numero_lote` sin emitir error. → El paso SQL es la tarea 1 del plan, bloqueante y previa a levantar el backend. La verificación posterior (contar filas con `codigo_lote` no nulo y comparar contra el conteo previo) es parte de la misma tarea.
- **Las siembras históricas quedan sin número de siembra.** Es un dato que sólo existe en las bandejas físicas. → Se acepta el nulo, la interfaz muestra un guion, y el servicio exige el dato la próxima vez que alguien edite ese registro.
- **El backfill de `tipo_origen` asume que todo lo cargado hasta hoy vino de un sobre.** Es la interpretación más razonable, ya que `numeroLote` era obligatorio y se llenaba con el código del sobre, pero puede haber filas donde el operario puso otra cosa. → Se hace un `UPDATE` explícito a `'SOBRE'` y se deja constancia; si el usuario detecta filas mal clasificadas, se corrigen editando esos registros puntuales.
- **Ocho archivos tocados por un cambio conceptualmente chico.** → Todas las ocurrencias están inventariadas en la tabla de la Decisión 3. La tarea de cierre incluye un grep de `numeroLote` sobre `backend/src` y `frontend/src` que debe volver sin resultados.
- **El invariante de no unicidad depende de que nadie lo rompa después.** Nada en el motor impide agregar un índice único más adelante. → Queda escrito como requisito en la spec de `gestion-siembras` y como comentario junto al campo en la entidad.

## Migration Plan

1. Sacar respaldo de la tabla `siembras` y anotar la cantidad de filas con `numero_lote` no nulo.
2. Con el backend detenido, ejecutar sobre la base:
   ```sql
   ALTER TABLE siembras RENAME COLUMN numero_lote TO codigo_lote;
   ALTER TABLE siembras ADD COLUMN IF NOT EXISTS numero_siembra VARCHAR(255);
   ALTER TABLE siembras ADD COLUMN IF NOT EXISTS tipo_origen VARCHAR(255);
   UPDATE siembras SET tipo_origen = 'SOBRE' WHERE tipo_origen IS NULL;
   ```
3. Desplegar el backend con los campos nuevos. `ddl-auto=update` no tendrá nada que agregar, porque las columnas ya existen con los nombres que espera el mapeo.
4. Verificar que la cantidad de filas con `codigo_lote` no nulo coincide con la anotada en el paso 1.
5. Desplegar el frontend.

**Rollback:** revertir el código y ejecutar `ALTER TABLE siembras RENAME COLUMN codigo_lote TO numero_lote;`. Las columnas `numero_siembra` y `tipo_origen` pueden quedarse: el código anterior las ignora sin fallar, y conservan los datos por si se reintenta.

Si el usuario opta por **no renombrar** (ver Open Questions), se omiten el paso del `RENAME` y su verificación, y el resto de la migración queda igual.

## Open Questions

1. **¿Se confirma el renombre de `numeroLote` a `codigoLote`?** El diseño lo recomienda y el plan de tareas lo asume. Optar por conservar el nombre elimina el paso SQL más delicado a cambio de dejar un nombre engañoso en el modelo y en el API. Requiere respuesta del usuario antes de ejecutar la tarea 1.
2. **¿El número de siembra debe validarse contra duplicados?** El usuario lo describe como el identificador que distingue siembras del mismo sobre, lo que sugiere que debería ser único, al menos dentro de un mismo código de lote. Pero no lo pidió y no se sabe si se reutiliza entre temporadas o entre clientes. Este change lo deja **sin restricción de unicidad**; si hace falta, se agrega en un change posterior con la regla precisa.
3. **¿El origen debe poder filtrarse en el listado de siembras?** La spec sólo exige mostrarlo. Un filtro por `SOBRE` / `SUELTO` es una extensión natural, fuera de alcance salvo pedido explícito.
