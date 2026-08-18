## Context

La entidad `Siembra` tiene hoy un único campo de fecha, `fechaEstimada` (`LocalDate`), que representa la **fecha estimada de entrega**: el día en que se calcula que las bandejas van a estar listas. Se calcula en el frontend, dentro de `seleccionarPlanta` de `SiembraForm.jsx`, tomando la tabla de días de crecimiento por mes de la `VariedadPlanta` y sumándolos a una fecha base. No existe ningún campo que registre cuándo se sembró efectivamente.

Este change agrega ese concepto. Es una incorporación limpia: no hay renombre, no hay reinterpretación de un campo existente y no hay riesgo de corromper el significado de las filas históricas. Se diferencia en esto del change inmediatamente anterior, `siembras-origen-lote`, donde el problema central era desambiguar un campo sobrecargado; ese patrón y sus precauciones de migración **no se trasladan acá**.

El requerimiento operativo es que una siembra puede haberse ejecutado en un solo día o repartida a lo largo de varios, cuando el volumen de bandejas no permite terminarla en una jornada. En los dos casos se trata de **una sola siembra**: un número de siembra, un dueño, un código de lote. Lo que varía es la extensión temporal del trabajo físico.

Restricciones técnicas relevantes del proyecto, verificadas sobre el código y la base:

- `spring.jpa.hibernate.ddl-auto=update`. Hibernate **sí agrega columnas nuevas** automáticamente; lo que nunca hace es renombrar ni eliminar.
- La tabla `siembras` tiene **7 filas** al momento de escribir este documento, y todas sus columnas no clave son nullables. Ninguna proviene de `DataInitializer`: son datos de uso real.
- El backend **no usa Bean Validation en ningún punto** de `com.vivero.gestion`. La validación de negocio vive en la capa de servicio y se expresa con `RuntimeException` y mensaje en español.
- El mapeo DTO/entidad de siembras es **manual en tres puntos** de `SiembraServiceImpl`: `crearSiembra`, `actualizarSiembra` y `mapToDTO`. Cada campo nuevo hay que sumarlo a mano en los tres.
- `SiembraServiceImpl` ya tiene el método privado `validarYNormalizarOrigen(SiembraDTO dto)`, invocado al inicio de `crearSiembra` y `actualizarSiembra`. Es el precedente directo para dónde y cómo colgar la validación nueva.
- `SiembraForm.jsx` ya implementa un toggle de dos botones (origen `Sobre` / `Suelto`) con el estilo visual del proyecto. Es el patrón a replicar, no a inventar.
- Hay una **divergencia preexistente entre la spec y la implementación**: el escenario "Creación exitosa" de `gestion-siembras` dice que la fecha estimada de entrega se calcula sumando los días de crecimiento **a la `fechaSiembra`**, pero `seleccionarPlanta` la calcula sobre `new Date()`, es decir el día actual. Hasta ahora esa divergencia era invisible porque no existía ninguna fecha de siembra que la contradijera. Al introducirla, se vuelve visible y contradictoria.

## Goals / Non-Goals

**Goals:**

- Registrar cuándo se sembró efectivamente, como dato explícito y separado de la fecha estimada de entrega.
- Soportar las dos modalidades reales de la operación —un día o un rango de días— con una única estructura de datos, sin ramas condicionales regadas por el sistema.
- Validar en el servidor que la fecha de siembra esté presente y que el rango sea coherente.
- Mostrar la fecha de siembra en el listado de forma compacta y legible, distinguiendo visualmente día único de rango.
- Mantener funcionando las 7 siembras ya cargadas, que no tienen ni pueden tener este dato.
- Cerrar la divergencia entre la spec y la implementación en el cálculo de la fecha estimada de entrega.

**Non-Goals:**

- No se modela la siembra por jornada como entidad propia. No se necesita saber cuántas bandejas se sembraron cada día: el usuario pidió el período, no el detalle diario.
- No se agrega paginación a `obtenerTodas()`. Deuda preexistente, ajena a este change.
- No se introduce Bean Validation. Se sigue el patrón vigente.
- No se agrega filtro ni ordenamiento por fecha de siembra en el listado. Es una extensión natural pero no fue pedida.
- No se toca el cálculo de progreso ni las alertas de entrega, que siguen dependiendo de `fechaEstimada`.
- No se hace backfill de las filas históricas. Nadie puede decir retroactivamente en qué día se sembraron.

## Decisions

### Decisión 1: dos columnas `LocalDate` nullables, `fechaSiembraInicio` y `fechaSiembraFin`

La fecha de siembra se modela con dos campos `LocalDate` en `Siembra` y en `SiembraDTO`:

```java
private LocalDate fechaSiembraInicio;
private LocalDate fechaSiembraFin;
```

**Convención de día único: se guarda la misma fecha en los dos campos.** Una siembra del 12 de agosto persiste `fechaSiembraInicio = 2026-08-12` y `fechaSiembraFin = 2026-08-12`. Una siembra del 12 al 15 persiste `2026-08-12` y `2026-08-15`.

La alternativa era dejar `fechaSiembraFin` en `null` para el día único. Se descarta porque obliga a todo consumidor —la vista, un futuro reporte, cualquier cálculo de duración— a tratar el `null` como caso especial antes de poder operar. Con la convención elegida, la duración en días es siempre `fechaSiembraFin - fechaSiembraInicio + 1`, y "¿es un rango?" es siempre `!fechaSiembraFin.equals(fechaSiembraInicio)`, sin ramas nulas. El costo es un campo aparentemente redundante en la mitad de los casos, que es un precio bajo frente a la uniformidad que compra.

Esta convención se sostiene en el servidor, no sólo en el formulario: si el DTO llega con `fechaSiembraFin` nula y `fechaSiembraInicio` cargada, el servicio la normaliza igualándola a la de inicio antes de persistir. Así el invariante vale aunque el request venga de otro lado.

Alternativas descartadas:

- **Un `boolean esRango` más una segunda fecha condicional.** Agrega un tercer campo que sólo repite información ya deducible comparando las dos fechas, y crea la posibilidad de estados inconsistentes (`esRango = true` con las dos fechas iguales, o `esRango = false` con fechas distintas). Comparar dos fechas no necesita un flag que lo anuncie.
- **Una sola `LocalDate fechaSiembra` más una `LocalDate fechaSiembraFin` opcional.** Es la misma forma de datos que la elegida pero con un nombre que miente en el caso del rango: `fechaSiembra` no es "la" fecha de siembra sino la primera de varias. El par inicio/fin nombra correctamente ambos casos.
- **Un campo de texto libre con el período.** Imposible de ordenar, filtrar o calcular. Se descarta sin más.

### Decisión 2: nombres `fechaSiembraInicio` / `fechaSiembraFin`

Se mantiene el vocabulario en español del resto de la entidad (`fechaEstimada`, `codigoLote`, `numeroSiembra`, `tipoOrigen`, `dueno`). El prefijo `fechaSiembra` deja claro de qué fecha se habla, frente a la `fechaEstimada` que ya existe y significa otra cosa. Los sufijos `Inicio` y `Fin` son los que Hibernate traducirá a `fecha_siembra_inicio` y `fecha_siembra_fin`, columnas que se leen solas.

Se descarta `fechaSiembraDesde` / `fechaSiembraHasta`: son las etiquetas correctas para los inputs del formulario cuando el usuario está eligiendo un rango, pero como nombres de campo sugieren un filtro de búsqueda más que un dato del registro.

### Decisión 3: obligatoria en el servicio, nullable en la base (requiere confirmación del usuario)

**Recomendación: exigir la fecha de siembra en toda siembra creada o editada de aquí en adelante, dejando las columnas nullables en la base.**

Es exactamente el mismo compromiso que se adoptó para `numeroSiembra` en el change anterior, y por las mismas dos razones:

1. Las 7 filas existentes no tienen el dato y no hay forma honesta de inventárselo. El día en que se sembró cada una de ellas no está registrado en ninguna parte del sistema.
2. Con `ddl-auto=update`, agregar una columna `NOT NULL` sin default a una tabla con filas existentes hace fallar el arranque de Hibernate.

En consecuencia: la base acepta nulos, y `SiembraServiceImpl` rechaza toda alta o edición sin `fechaSiembraInicio`. Las siembras históricas conservan el nulo hasta que alguien las edite, momento en el cual el servicio exigirá completar el dato. La interfaz debe tolerar la ausencia mostrando un guion.

La alternativa —dejarla opcional también en el servicio— evita fricción al editar registros viejos, pero admite que se sigan cargando siembras sin fecha, que es precisamente el vacío que este change viene a cerrar. Se descarta como recomendación.

**Esta decisión queda expuesta para confirmación del usuario** (ver Open Questions). El change es de gobernanza MEDIA: modifica el modelo de dominio y afecta datos ya persistidos, así que la obligatoriedad se plantea en vez de decidirse en silencio.

### Decisión 4: validación y normalización en la capa de servicio

Se agrega a `SiembraServiceImpl` un método privado `validarYNormalizarFechaSiembra(SiembraDTO dto)`, invocado desde `crearSiembra` y `actualizarSiembra` inmediatamente después de `validarYNormalizarOrigen(dto)`. Reglas, en orden:

1. `fechaSiembraInicio` nula → rechazo con `"La fecha de siembra es obligatoria"`.
2. `fechaSiembraFin` nula → se normaliza a `fechaSiembraInicio` (caso día único).
3. `fechaSiembraFin` anterior a `fechaSiembraInicio` → rechazo con `"La fecha de fin de siembra no puede ser anterior a la de inicio"`.

Se usa `RuntimeException` con mensaje en español, igual que el resto de la clase. No se introduce Bean Validation: el proyecto no la usa en ninguna entidad, y la regla 3 es una comparación entre dos campos que ninguna anotación de campo puede expresar de todos modos.

Se mantiene el método separado de `validarYNormalizarOrigen` en lugar de ampliarlo, porque son dos reglas de negocio independientes y mezclarlas produciría un método que hace dos cosas sin relación entre sí.

No se valida que la fecha de siembra no sea futura. Ver Open Questions.

### Decisión 5: toggle de dos botones "Un día" / "Rango de días" en el formulario

`SiembraForm.jsx` incorpora, sobre el bloque de fechas, un par de botones `type="button"` en un `grid grid-cols-1 sm:grid-cols-2 gap-3`, con el activo marcado por `border-emerald-500 bg-emerald-50 text-emerald-700 font-bold` y el inactivo por `border-gray-200 bg-white text-gray-600 hover:bg-gray-50`, todos con `rounded-xl transition-all cursor-pointer`. Es el mismo componente visual que el toggle de origen `Sobre` / `Suelto` que ya vive unas líneas más arriba en este mismo formulario, y que el toggle "Tipo de Cheque" de `NuevoChequeModal.jsx`.

Comportamiento:

- **"Un día"** muestra un único input `type="date"` con la etiqueta `Fecha de Siembra *`. Al submit, su valor se escribe en `fechaSiembraInicio` y en `fechaSiembraFin`.
- **"Rango de días"** muestra dos inputs `type="date"` con las etiquetas `Sembrado Desde *` y `Sembrado Hasta *`, ligados respectivamente a `fechaSiembraInicio` y `fechaSiembraFin`.

El estado de modalidad vive **sólo en el formulario** (`useState`), no en el DTO ni en la base: al abrir el formulario en modo edición se deriva comparando las dos fechas persistidas (iguales o fin nula → "Un día"; distintas → "Rango de días"). Esto es consistente con la Decisión 1: la modalidad es una lectura de los datos, no un dato en sí.

Al pasar de "Rango de días" a "Un día", el formulario iguala `fechaSiembraFin` a `fechaSiembraInicio` en el estado, para que un valor de fin cargado y luego oculto no viaje en el submit contradiciendo la modalidad elegida.

La validación cliente de que "Hasta" no sea anterior a "Desde" se hace con el atributo `min` del input de fin, atado a `formData.fechaSiembraInicio`. Es feedback nativo e inmediato, sin lógica adicional. El servidor la revalida igual (Decisión 4), porque el `min` del navegador no es una garantía.

Alternativas descartadas: un `<select>` de dos opciones (esconde una decisión binaria que conviene ver de un vistazo, y el formulario ya tiene varios selects) y un checkbox "es un rango" (el repo no usa checkboxes en formularios; además el toggle nombra las dos opciones en vez de dejar una implícita).

### Decisión 6: la fecha estimada de entrega pasa a calcularse desde la fecha de siembra (requiere confirmación del usuario)

**Recomendación: sí, recalcular.**

Hoy `seleccionarPlanta` calcula `fechaEstimada` como `hoy + díasDeCrecimiento(mes de hoy)`. La spec vigente de `gestion-siembras` ya dice otra cosa: que se calcula sumando los días de crecimiento **del mes de la fecha de siembra** a la fecha de siembra. Esa divergencia era inofensiva mientras no existiera una fecha de siembra; deja de serlo ahora. Si el operario registra el lunes una siembra que hizo el jueves pasado, el sistema le va a proponer una fecha de entrega cuatro días tarde y sin explicación visible.

Se propone entonces:

- Extraer el cálculo a una función que reciba la fecha base explícitamente (la firma de `obtenerDiasCrecimiento(planta, date)` ya la acepta; hoy simplemente nadie le pasa el segundo argumento).
- Usar como fecha base **`fechaSiembraFin`**, es decir el último día en que se sembró. La siembra se entrega como un lote único, y el lote está listo cuando lo están las bandejas sembradas al final. Tomar `fechaSiembraInicio` daría una estimación optimista que ninguna bandeja del final cumpliría.
- Recalcular no sólo al elegir la variedad, sino también al cambiar cualquiera de las dos fechas de siembra, siempre que haya una variedad seleccionada.
- Conservar la posibilidad de que el usuario sobrescriba manualmente el valor propuesto, que es el comportamiento actual y lo que la spec describe.

Alternativa considerada: **dejar el cálculo como está**, sobre el día actual. Cuesta cero y mantiene el change acotado estrictamente a lo pedido. Se descarta como recomendación porque deja conviviendo en el mismo formulario una fecha de siembra explícita y un cálculo que la ignora, que es una inconsistencia que alguien va a reportar como bug la primera semana. Aun así, es separable: este cálculo vive en su propio grupo de tareas y puede omitirse sin afectar al resto del change.

**Esta decisión queda expuesta para confirmación del usuario** (ver Open Questions), por modificar un comportamiento existente que el usuario no pidió tocar.

### Decisión 7: dónde se muestra la fecha de siembra

Se evaluaron los cinco lugares del frontend que hoy consumen datos de `Siembra`:

| Pantalla | ¿Muestra la fecha de siembra? | Motivo |
|---|---|---|
| `Siembras.jsx` — tarjeta mobile (bloque expandido) | **Sí** | Es la vista principal del módulo. La tarjeta colapsada ya está ajustada para mostrar sólo los identificadores; la fecha va en el bloque expandido, junto a dueño y cantidad, que es donde vive el detalle. |
| `Siembras.jsx` — fila de tabla desktop | **Sí** | Misma razón. Va como línea secundaria en la celda "Variedad / Identificación", debajo de la línea de origen y bandeja, en `text-xs text-gray-500`, sin agregar una columna nueva a una tabla que ya tiene seis. |
| `FinalizarSiembraModal.jsx` | **No** | Su leyenda existe para confirmar *cuál* siembra se está finalizando; para eso ya están el número de siembra y el código de lote. La fecha en que se sembró no cambia ninguna de las decisiones que se toman en ese modal (qué producto y qué cantidad). |
| `PaseStockModal.jsx` | **No** | Mismo criterio. La línea de resumen identifica la siembra; el dato relevante para el pase a stock es la cantidad lograda, no cuándo se sembró. |
| `DashboardLayout.jsx` — alertas de entrega | **No** | La alerta es sobre la fecha estimada de **entrega**, que es lo que la vuelve urgente. Sumarle la fecha de siembra alarga una notificación que debe leerse de un vistazo, sin aportar a la acción que dispara. |

**Formato de presentación.** Se muestra `Sembrado: 12/08/2026` cuando inicio y fin coinciden, y `Sembrado: 12/08 - 15/08/2026` cuando difieren. Cuando ambas fechas son nulas (siembras históricas), la línea no se renderiza en absoluto, en vez de mostrar un "Sembrado: -" que sólo agrega ruido. El formateo se hace con `toLocaleDateString('es-AR')`, igual que el resto de las fechas del listado.

Este formateo aparece en dos lugares (tarjeta mobile y fila desktop), así que se extrae a una función auxiliar dentro de `Siembras.jsx`, al lado de `formatOrigen`, que ya resuelve un caso análogo con el mismo criterio.

### Decisión 8: sin restricciones adicionales sobre el rango

No se impone un límite máximo de días entre inicio y fin, ni se prohíben fechas futuras, ni se valida contra `fechaEstimada`. La única regla es que el fin no sea anterior al inicio. Cualquier restricción más fuerte sería una suposición sobre la operación del vivero que el usuario no expresó, y que en el peor caso le impediría registrar un caso real. Las restricciones se agregan cuando se conoce la regla, no por precaución.

## Risks / Trade-offs

- **Las 7 siembras históricas quedan sin fecha de siembra, y el servicio se la va a exigir a quien las edite.** Alguien que entre a corregir la cantidad de una siembra vieja se va a encontrar con que no puede guardar sin completar una fecha que no conoce. → Es el mismo compromiso ya aceptado para `numeroSiembra` en el change anterior, y el volumen es chico (7 filas). El formulario debe dejar claro que el campo es obligatorio con el asterisco habitual, para que el rechazo no llegue por sorpresa desde el servidor.
- **El campo duplicado en el caso de día único puede leerse como redundancia y "corregirse" mal después.** Alguien podría decidir más adelante que `fechaSiembraFin` debería ser nula cuando coincide con el inicio, rompiendo el invariante. → Queda escrito como requisito en la spec de `gestion-siembras` y documentado en el comentario del método de normalización en el servicio, no sólo en este documento.
- **Cambiar el cálculo de `fechaEstimada` (Decisión 6) altera un comportamiento que el usuario no pidió tocar.** Una siembra registrada con fecha retroactiva ahora propondrá una fecha de entrega distinta a la que proponía antes. → La decisión está expuesta como pregunta abierta y aislada en su propio grupo de tareas, de modo que pueda descartarse sin tocar nada más. El valor propuesto sigue siendo sobrescribible a mano.
- **La modalidad "Un día" / "Rango" se deriva de los datos y no se persiste.** Si en el futuro se necesitara distinguir "sembrado en un día" de "sembrado en un rango que casualmente duró un día", no se podría. → Es una distinción sin diferencia operativa: en ambos casos se sembró en un solo día. Si alguna vez importara, se agrega el campo entonces.
- **`ddl-auto=update` agrega las columnas al arrancar, sin que nadie ejecute nada.** El riesgo no es de pérdida de datos sino de suposición: alguien puede dar por hecho que hace falta un ALTER TABLE manual, como en el change anterior, y complicar un despliegue que no lo necesita. → El plan de migración lo aclara explícitamente y ofrece el SQL sólo como verificación opcional.

## Migration Plan

**No se requiere ninguna migración manual.** Ésta es la diferencia central con el change anterior y conviene dejarla escrita, porque la conclusión opuesta está documentada en `siembras-origen-lote` y podría copiarse por inercia.

Allá el `ALTER TABLE` era obligatorio porque había un **renombre** de columna: `ddl-auto=update` no renombra, habría creado `codigo_lote` vacía y dejado `numero_lote` huérfana con todos los datos adentro, sin emitir error. Acá no hay renombre ni cambio de tipo: sólo se **agregan dos columnas nullables nuevas**, `fecha_siembra_inicio` y `fecha_siembra_fin`, ambas `date`. Ése es precisamente el caso que `ddl-auto=update` maneja de forma segura y automática. Las 7 filas existentes quedan con `NULL` en las dos columnas, que es el resultado buscado.

Pasos de despliegue:

1. Desplegar el backend con los campos nuevos. Al arrancar, Hibernate agrega las dos columnas por su cuenta.
2. Verificar que aparecieron, con `\d siembras` sobre el contenedor `vivero-postgres` (usuario `admin`, base `vivero_db`). Deben figurar `fecha_siembra_inicio` y `fecha_siembra_fin`, ambas `date` y nullables.
3. Desplegar el frontend.

Si por algún motivo se prefiere crear las columnas antes del arranque —por ejemplo para desplegar frontend y backend en el mismo paso—, el SQL equivalente es:

```sql
ALTER TABLE siembras ADD COLUMN IF NOT EXISTS fecha_siembra_inicio DATE;
ALTER TABLE siembras ADD COLUMN IF NOT EXISTS fecha_siembra_fin DATE;
```

Es opcional y no cambia el resultado: si las columnas ya existen con el nombre y tipo esperados, Hibernate no tiene nada que agregar.

**Rollback:** revertir el código. Las dos columnas pueden quedarse en la tabla: el código anterior las ignora sin fallar, y conservan los datos ya cargados por si se reintenta. Si se quisieran eliminar, `ALTER TABLE siembras DROP COLUMN fecha_siembra_inicio, DROP COLUMN fecha_siembra_fin;` — con la advertencia de que eso sí destruye datos, y que no hace falta para volver atrás.

## Open Questions

1. **¿La fecha de siembra debe ser obligatoria para las siembras nuevas y editadas?** El diseño lo recomienda (Decisión 3) y el plan de tareas lo asume. La contrapartida es que editar cualquiera de las 7 siembras históricas va a exigir completar una fecha que nadie recuerda. La alternativa es dejarla opcional, a costa de permitir que se sigan cargando siembras sin el dato. Requiere respuesta antes de ejecutar el grupo de tareas del servicio.
2. **¿Se acepta cambiar el cálculo de la fecha estimada de entrega para que parta de la fecha de siembra?** El diseño lo recomienda (Decisión 6) porque alinea la implementación con la spec vigente y evita una inconsistencia visible en el formulario. Es la única parte del change que modifica comportamiento existente, y está aislada en su propio grupo de tareas para poder omitirse. Si se acepta, queda una sub-pregunta: se propone usar `fechaSiembraFin` como base, por ser el último día sembrado y por lo tanto el que gobierna cuándo está listo el lote completo.
3. **¿Hace falta poder filtrar u ordenar el listado por fecha de siembra?** La spec sólo exige mostrarla. Un filtro por período es una extensión natural una vez que el dato existe, pero queda fuera de alcance salvo pedido explícito.
4. **¿Debe impedirse registrar una fecha de siembra futura?** Este change no lo impide (Decisión 8). Podría tener sentido si la fecha describe siempre trabajo ya hecho, pero también podría estorbar si el vivero pre-registra siembras planificadas. Se deja abierto para no cerrar un caso de uso por suposición.
