## Context

El vivero presta un servicio a pedido: un cliente **trae** su propio sobre de semillas al invernadero para que el vivero se las germine. El vivero no compra esa semilla — sólo la recibe. Hoy la constancia de esa entrega es una libreta cuadriculada con estas columnas:

| Fecha | Lote | Nombre | Semilla | Firma | Stock |

Filas reales transcriptas del papel:

```
16/07 | 40055       | Gustavo Aleo      | 2 super red 10gr c/u
16/07 | 18KR        | Gustavo Aleo      | 3 Globe Master 10gr c/u
25/07 | 178537      | Gustavo Aleo      | 9 Kimba F1
24/07 | 126898      | Ismael            | 3 berenjena aragon
27/07 | PL154303    | Claudio Cardon    | Pimiento camino Real x 1.000 sem.
27/09 | 187613      | Claudio Cardon    | Darkibor x 2.500 sem.
27/09 | FP12.5H526  | José Flores       | 3 sobres de Tomate Regina x1250
  —   | K60236      | Eduardo Vargas    | 4 Pimiento CLXP479 1.000 semillas
17/08 | 043         | Rolando Vidaurre  | 7 sobres de Tomate Juliet x1.000 = 7.000 sem. ($12.500 c/6)
```

Lo que el papel enseña, y que condiciona todo el diseño:

1. **El lote es un código externo**, impreso por el semillero en el sobre. Formato totalmente irregular: `40055`, `18KR`, `PL154303`, `FP12.5H526`, `043`. No lo genera el sistema y se repite entre filas.
2. **La semilla no es un catálogo**: `Kimba F1`, `Darkibor`, `CLXP479`, `Globe Master` son variedades comerciales de semillero, no nombres genéricos de planta.
3. **La cantidad se anota en tres unidades distintas** según lo que diga el sobre: gramos (`10gr`), semillas (`1.000 sem.`) o sobres (`7 sobres x1.000`). A veces con un precio anotado al margen, que claramente no es el foco del registro.
4. **"Firma"** es la firma física del empleado del vivero que recibió, no la del cliente.
5. **La fecha a veces falta** (fila de Eduardo Vargas) y nunca lleva año.

**Estado actual del sistema.** Ya existe `Siembra` (`models/Siembra.java`, pantalla `/siembras`) con campos `codigoLote`, `dueno`, `numeroSiembra`, `variedadPlanta`, `variedadBandeja`, `estado`, y un ciclo de vida `EN_PROCESO → FINALIZADA → EN_STOCK` que **crea productos y movimientos de stock**. Ya existe `Cliente` con `nombreRazonSocial` y `telefono`. Ya existe `ComprobanteVentaModal.jsx`, del change archivado `remitos-pdf`, que resuelve el problema de "generar un comprobante y mandárselo al cliente por WhatsApp" con `jspdf` + `html-to-image`.

**Restricciones del proyecto** (reglas duras, `CLAUDE.md`): DTOs obligatorios en endpoints, cadena Controller → Service → Repository, `@Transactional` en servicios, borrado lógico (`data-persistence-soft-delete`), componentes React en PascalCase, `cursor-pointer` en botones, feedback vía `useUIStore`, tests sin mocks de DB.

## Goals / Non-Goals

**Goals:**

- Reemplazar la libreta por una pantalla que se pueda cargar **parado en el mostrador, en menos de 30 segundos**, sin obligar al jefe a dar de alta catálogos previos.
- Conservar la información del papel sin perder fidelidad, incluyendo la irregularidad de las cantidades.
- Dejar constancia de **quién** del vivero recibió el sobre (equivalente digital de la columna "Firma").
- Emitir una boletita imprimible/enviable que el cliente se lleve como comprobante de que dejó su semilla.
- Reutilizar el mecanismo de comprobante ya probado en producción, no inventar uno nuevo.

**Non-Goals:**

- **No** se sigue el destino de la semilla dentro del vivero (no crea `Siembra`, no crea `Producto`, no mueve stock, no tiene estados). Es un libro de entradas, no un circuito de producción.
- **No** se cobra ni se factura nada. El precio que a veces aparece al margen del papel se guarda como texto en observaciones, no como importe operable.
- **No** se replica la columna "Stock" del papel: es una anotación manual ambigua que el jefe no supo explicar como dato operativo; si más adelante se necesita, se agrega como campo propio.
- **No** hay app de firma digital ni captura de firma manuscrita.
- **No** se toca el modelo RBAC ni se agregan permisos nuevos.

## Decisions

### Decisión 1 — `RegistroSemilla` es una entidad nueva e independiente, NO una variante de `Siembra`

**Elegido:** entidad nueva `RegistroSemilla`, tabla `registros_semillas`, sin relación con `Siembra`.

`Siembra` es tentadora porque ya tiene `codigoLote` (documentado en el propio modelo como "código de lote impreso por el proveedor en el sobre de semillas") y `dueno`. Pero `Siembra` modela la **producción**: exige `numeroSiembra`, `variedadBandeja`, `fechaSiembraInicio/Fin`, tiene un `EstadoSiembra` y su `finalizarSiembra()` / `pasarAStock()` **crean `Producto` y `MovimientoStock`**. Meter ahí la recepción de un sobre obligaría a inventar valores para campos que en el mostrador nadie tiene, o a agregar un `tipoOrigen` extra que dejaría media entidad nula y contaminaría todas las consultas y alertas de siembra (`obtenerAlertas()` filtra por `fechaEstimada` y estado — un registro de recepción aparecería como alerta de producción).

*Alternativas descartadas:*
- **Extender `Siembra` con un tipo/discriminador**: acopla un libro de entradas al circuito de stock; cualquier bug en el registro de semillas pasa a poder tocar stock. Viola el aislamiento que justifica la gobernanza LOW de este change.
- **Crear la `Siembra` automáticamente al registrar el sobre**: el usuario fue explícito en que sólo quiere constancia de entrada. Automatizar la siembra inventa un dato de producción que nadie cargó.

*Puerta abierta:* si en el futuro el vivero quiere trazar "de este sobre salió esta siembra", se agrega una FK **opcional** `Siembra.registroSemillaId` sin tocar nada de lo que se construye acá.

### Decisión 2 — El cliente es un vínculo **opcional** a `Cliente` + un nombre snapshot obligatorio

**Elegido:**
- `cliente` → `@ManyToOne` **nullable** a `Cliente`.
- `nombreQuienTrajo` → `String` **obligatorio**, siempre persistido.
- `telefonoContacto` → `String` nullable, snapshot del teléfono.

En la UI: un buscador de clientes existentes; al elegir uno, se autocompletan `nombreQuienTrajo` y `telefonoContacto` desde `Cliente`. Si la persona no está en el sistema, se escribe el nombre suelto (y opcionalmente un teléfono) y `cliente` queda en `null`.

*Por qué las tres cosas juntas:*
- **Vínculo real** → habilita la boletita por WhatsApp reutilizando el teléfono ya cargado, que es la razón de ser del comprobante. Un nombre suelto no sirve para enviar nada.
- **Nombre obligatorio siempre** → el papel muestra que el registro es de personas, no todas clientes con cuenta: alguien que sólo trae semillas puede no comprarle nunca nada al vivero. Exigir que sea `Cliente` obligaría a dar de alta gente en el ABM de clientes para poder anotar un sobre — fricción justo en el momento del mostrador, que es lo que este change viene a eliminar.
- **Snapshot del nombre y teléfono** → `Cliente` tiene borrado lógico (`@SQLDelete` + `@SQLRestriction`); si el cliente se borra, el `@ManyToOne` deja de resolver y el registro histórico quedaría anónimo. El snapshot preserva la constancia, que es el único valor del registro. Es el mismo criterio que ya usa el sistema con `precioUnitarioHistorico` en `VentaDetalle`.

*Alternativas descartadas:* **sólo texto libre** (fiel al papel pero pierde el teléfono, y entonces la boletita hay que mandarla a mano); **sólo FK obligatoria** (fricción de alta y rompe con la realidad del papel).

### Decisión 3 — La semilla es **texto libre**, no un catálogo

**Elegido:** `descripcionSemilla` → `String` obligatorio, texto libre.

El cliente puede traer literalmente cualquier cosa. `Kimba F1`, `Darkibor`, `CLXP479`, `Globe Master`, `Pimiento camino Real` son códigos y marcas de semillero, no entradas del catálogo `VariedadPlanta` (que existe para calcular **días de crecimiento por mes** de lo que el vivero siembra por su cuenta — ver `VariedadPlanta.java`: doce campos `diasEnero…diasDiciembre`). Forzar el vínculo obligaría a crear una `VariedadPlanta` inútil, sin días de crecimiento cargados, por cada semilla externa que entre — y ensuciaría el selector de `SiembraForm`, que es donde ese catálogo sí se usa.

*Alternativa descartada:* **FK opcional a `VariedadPlanta` con fallback a texto**. Suena conservadora pero agrega un campo que en la práctica quedaría casi siempre nulo y un selector más en un formulario que queremos mínimo. Si algún día el 80% de las semillas recibidas resultan ser variedades del catálogo, se agrega entonces con datos reales sobre la mesa.

### Decisión 4 — Cantidad estructurada como `cantidad + unidad`, con `contenidoPorSobre` opcional

**Elegido:**

```
cantidad          BigDecimal   obligatorio   (BigDecimal, no Integer: "10gr" o "12.5gr" existen en el papel)
unidadCantidad    enum         obligatorio   SEMILLAS | SOBRES | GRAMOS
contenidoPorSobre Integer      opcional      sólo tiene sentido con unidad = SOBRES
observaciones     String       opcional      texto libre para todo lo demás
```

Mapeo contra las filas reales:

| Fila del papel | cantidad | unidad | contenidoPorSobre | observaciones |
|---|---|---|---|---|
| `2 super red 10gr c/u` | 2 | SOBRES | — | `10gr c/u` |
| `9 Kimba F1` | 9 | SOBRES | — | — |
| `Pimiento camino Real x 1.000 sem.` | 1000 | SEMILLAS | — | — |
| `3 sobres de Tomate Regina x1250` | 3 | SOBRES | 1250 | — |
| `7 sobres de Tomate Juliet x1.000 = 7.000 sem.` | 7 | SOBRES | 1000 | `$12.500 c/6` |

**Por qué no un solo campo de texto libre:** perdería toda posibilidad de sumar o buscar, y la boletita quedaría copiando una cadena que el cliente no puede verificar.

**Por qué no forzar todo a semillas:** de `10gr` no se puede derivar cantidad de semillas sin saber el peso de mil semillas de esa variedad, un dato que el vivero no tiene. Forzar la conversión inventaría números.

**Por qué `contenidoPorSobre` existe:** el papel lo anota (`x1.000`) y hasta computa el total a mano (`= 7.000 sem.`). Es un dato que el jefe ya lleva. Al ser opcional no agrega fricción, y cuando está cargado el sistema calcula y muestra el total en la boletita — `cantidad × contenidoPorSobre` —, ahorrándole la cuenta. **El total es derivado, no se persiste**: persistirlo abriría la puerta a que quede desincronizado de sus dos factores.

**`observaciones`** absorbe la irregularidad restante (`10gr c/u`, notas de precio) sin contaminar los campos estructurados. El precio va acá y **no** como campo de dinero: registrar importes convertiría este change en algo con implicancias financieras, elevando su nivel de gobernanza, y el usuario fue claro en que el foco es la constancia, no el cobro.

### Decisión 5 — `lote` es texto libre obligatorio, sin restricción de unicidad

**Elegido:** `lote` → `String` obligatorio, sin índice único, sin validación de formato.

Es el único identificador que trae el sobre y por eso se exige, pero su formato es del semillero: `40055`, `18KR`, `PL154303`, `FP12.5H526`, `043` — numérico, alfanumérico, con mayúsculas y minúsculas mezcladas, con puntos. Cualquier validación de formato rechazaría lotes válidos. Se preserva tal cual se escribe (incluidos los ceros a la izquierda de `043`, que es justamente por qué es `String` y no numérico).

La no-unicidad sigue el **precedente explícito** de `Siembra.codigoLote`, cuyo modelo documenta: *"NO lleva restricción de unicidad: varias siembras pueden compartir el mismo código de lote"*. Acá el motivo es aún más directo: el papel muestra al mismo cliente trayendo sobres distintos y el mismo lote puede repetirse entre entregas.

### Decisión 6 — La fecha de recepción es obligatoria y precargada en hoy; la "Firma" se resuelve con el usuario logueado

**Elegido:**
- `fechaRecepcion` → `LocalDate` obligatorio, el formulario lo precarga con la fecha de hoy (editable, para cargar un sobre recibido ayer).
- `usuarioRecibe` → `@ManyToOne Usuario`, tomado del `Authentication` en el controller, **nunca del request body**.
- `fechaRegistro` → `LocalDateTime` de auditoría, cuándo se cargó en el sistema.

El papel a veces no tiene fecha (fila de Eduardo Vargas), pero eso es un defecto del papel, no un requisito. Precargar hoy hace que el caso normal sea cero clics y elimina la fila sin fecha.

`usuarioRecibe` es el equivalente digital de la firma: identifica al empleado que recibió, con más garantía que una firma manuscrita porque viene del token, no de lo que alguien escriba. Sigue el patrón ya usado en `SiembraController.finalizarSiembra()`, que extrae el usuario de `Authentication`. **No** se pide firma del cliente: quien firma en el papel es el empleado del vivero, y el cliente se lleva la boletita como su copia.

### Decisión 7 — La boletita reutiliza el mecanismo de `ComprobanteVentaModal.jsx`, extrayendo los helpers a un módulo compartido

**Elegido:** nuevo `ComprobanteSemillaModal.jsx` que consume helpers extraídos a `frontend/src/utils/comprobanteExport.js`; `ComprobanteVentaModal.jsx` se migra a los mismos helpers en la misma task.

Helpers a extraer (lógica ya probada, hoy dentro de `ComprobanteVentaModal.jsx`):
- `normalizarTelefonoWhatsApp(tel)`
- `generarPngDeNodo(nodo)` — el clon fuera de pantalla con ancho mínimo 500px para que no se corte en mobile
- `abrirWhatsApp({ telefono, resumen, archivo })` — Web Share en táctil, copia del PNG al portapapeles + `web.whatsapp.com/send` en desktop, y la **referencia de ventana a nivel de módulo** para reutilizar la misma pestaña
- `esDispositivoTactil` / `soportaCompartirArchivos`

**Por qué extraer y no copiar.** La reutilización de la misma pestaña de WhatsApp depende de una variable **a nivel de módulo** (`ventanaWhatsAppAbierta`), documentada en el código como el único mecanismo fiable porque el nombre de ventana se pierde en el redirect cross-origin de WhatsApp. Si se duplica el módulo, cada modal tendría su propia variable y **abriría su propia pestaña** — se rompería exactamente la propiedad que ese código existe para garantizar. Acá la extracción no es higiene DRY, es corrección.

**Contenido de la boletita** (mismo layout que el remito: encabezado con acento, cuerpo, pie de acciones):

```
VIVERO ERP
COMPROBANTE DE RECEPCIÓN DE SEMILLAS          Nº <id>
                                              <fechaRecepcion>
─────────────────────────────────────────────────────
Entregado por: <nombreQuienTrajo>
Teléfono:      <telefonoContacto>          (si existe)
─────────────────────────────────────────────────────
Lote:          <lote>
Semilla:       <descripcionSemilla>
Cantidad:      <cantidad> <unidad>
               (× <contenidoPorSobre> = <total> semillas, si aplica)
Observaciones: <observaciones>             (si existe)
─────────────────────────────────────────────────────
Recibido por:  <usuarioRecibe.username>
─────────────────────────────────────────────────────
Este comprobante certifica la recepción de la semilla
detallada. No constituye comprobante de venta.
```

La leyenda final es deliberada: evita que un comprobante sin importes se confunda con un remito o una factura.

El bloque de preview lleva la clase **`force-light-export`**, igual que el remito: `cloneNode(true)` arrastra los tokens de `[data-theme="dark"]` y sin esa clase el PNG sale con texto claro sobre fondo blanco. Es una regresión ya sufrida y corregida dos veces en este repo (`FacturaCliente.jsx` y `ComprobanteVentaModal.jsx`); no repetirla.

*Alternativa descartada:* **generar el PDF en el backend**. Agregaría una dependencia (iText/OpenPDF), no daría el PNG que es lo que realmente se manda por WhatsApp, y descartaría un mecanismo ya probado en producción.

### Decisión 8 — Se reutilizan `LEER_SIEMBRAS` / `ESCRIBIR_SIEMBRAS`; **no** se crea permiso nuevo

**Elegido:** `@PreAuthorize("hasAuthority('LEER_SIEMBRAS')")` a nivel de clase en el controller, `ESCRIBIR_SIEMBRAS` en los métodos de escritura. Ruta protegida en `App.jsx` con `requiredPermission="LEER_SIEMBRAS"`.

`PermisoEnum` documenta que los IDs son estables y que agregar uno nuevo obliga a ponerlo al final para no romper el frontend. Un permiso nuevo cuesta ese riesgo y, en la práctica, **no aportaría control**: `DataInitializer` asigna `EnumSet.allOf(PermisoEnum.class)` al rol JEFE y lo mismo menos `ADMIN_DB` al rol COLEGA, así que un `LEER_SEMILLAS` nuevo quedaría otorgado a todos desde el arranque. Sería ceremonia sin efecto.

Funcionalmente, "semillas del invernadero" es el mismo dominio y el mismo grupo de usuarios que Siembras. El proyecto ya estableció (change archivado `refactor-permisos-enum`) el criterio de no inflar el enum sin necesidad real.

*Alternativa descartada:* `ESCRIBIR_STOCK` — semánticamente falso: este change no toca stock, y el permiso está pensado para otro grupo de usuarios.

**⚠️ Nota de revisión (2026-09-03, pedido explícito del dueño) — Decisión 8 REVERTIDA:** lo de arriba fue el razonamiento original y se deja tal cual para que quede constancia de por qué se eligió reutilizar los permisos en su momento. El dueño pidió volver atrás: quiere poder darle a una persona acceso a Registro de Semillas **sin** darle Siembras, y viceversa (por ejemplo, alguien de mostrador que sólo recibe sobres de clientes pero no debería poder tocar el circuito de producción de `Siembra`, que crea `Producto` y mueve stock). El argumento original de "no aportaría control porque JEFE y COLEGA tienen `allOf`" seguía siendo válido para esos dos usuarios, pero no contempló que el sistema fuera a crecer con roles más finos para otros empleados — que es exactamente lo que este pedido busca habilitar.

**Elegido ahora:** `PermisoEnum` gana `LEER_REGISTRO_SEMILLAS(19L)` y `ESCRIBIR_REGISTRO_SEMILLAS(20L)` (al final, sin reordenar ni reusar IDs, como exige el javadoc del enum). `RegistroSemillaController` pasa a exigirlos en vez de `LEER_SIEMBRAS`/`ESCRIBIR_SIEMBRAS`. `DataInitializer` no necesitó cambios: `EnumSet.allOf(PermisoEnum.class)` (JEFE) y `allOf` menos `ADMIN_DB` (COLEGA) recogen los permisos nuevos automáticamente. Ver grupo 10 de `tasks.md` para el detalle completo de la implementación, incluida la corrección de un bug de seguridad real encontrado de paso en `SiembraController` (ningún método de escritura exigía `ESCRIBIR_SIEMBRAS`).

### Decisión 9 — Vive en el grupo *Catálogo* del sidebar, gateado a `unidades: ['vivero']`

**Elegido:** item nuevo en `navGroups` → grupo `Catálogo`, justo debajo de `Siembras`:

```js
{ to: '/registro-semillas', label: 'Registro de Semillas', icon: PackagePlus,
  permission: 'LEER_SIEMBRAS', unidades: ['vivero'] }
```

`unidades: ['vivero']` es lo mismo que ya hace `Siembras`, y `DashboardLayout` tiene un guard que redirige a `/dashboard` si el usuario cambia de unidad estando parado en una sección de otra unidad — el gating se obtiene gratis con sólo declarar el item correctamente. Herramientas y Abono no reciben semillas de clientes.

*Sobre el ícono:* `PackagePlus` (`lucide-react`) ya está importado en `DashboardLayout.jsx`; `Sprout` está tomado por Siembras y reusarlo confundiría dos secciones vecinas.

*Alternativa descartada:* **subsección dentro de `/siembras`** (con tabs, como `VentasLayout`). Escondería la sección detrás de otra y refuerza justo la confusión que la Decisión 1 quiere evitar: recepción y producción son cosas distintas.

### Decisión 10 — Borrado lógico, listado sin paginación en la primera versión

`RegistroSemilla` lleva `deleted` + `@SQLDelete` + `@SQLRestriction`, como exige la spec `data-persistence-soft-delete` para toda entidad principal. Borrar una constancia de recepción y perderla del todo sería lo contrario del objetivo del change.

El listado usa `findAll()` ordenado por `fechaRecepcion DESC`. La regla dura pide paginación y prohíbe `findAll()` sin límite; se documenta la excepción con el volumen real: la libreta acumula del orden de decenas de filas por temporada, y `SiembraServiceImpl` ya hace exactamente esto para un volumen comparable. **Mitigación:** el repositorio expone `findAllByOrderByFechaRecepcionDesc(Pageable)` desde el día uno, de modo que activar paginación después sea sólo cambiar el llamado del servicio, sin tocar la firma del repositorio ni el contrato del endpoint. El filtro de búsqueda (nombre / lote / semilla) se resuelve en el cliente sobre la lista ya cargada, igual que `Siembras.jsx`.

## Risks / Trade-offs

- **Extraer helpers de `ComprobanteVentaModal.jsx` rompe el remito de venta** (el único punto MEDIO de gobernanza del change) → La extracción va en su propia task, aislada, con criterio de aceptación explícito: el remito de venta debe seguir descargando PDF, descargando/compartiendo PNG y abriendo WhatsApp **reutilizando la misma pestaña** exactamente como antes. Se mueve el código tal cual, sin refactor de comportamiento. Si la verificación falla, se revierte sólo esa task y el modal de semillas duplica los helpers como plan B degradado (a costa de perder la pestaña compartida).
- **Duplicación de datos con `Siembra`**: el mismo sobre podría cargarse como `RegistroSemilla` y como `Siembra` sin que el sistema relacione ambos → Aceptado a conciencia: son dos hechos distintos (recepción vs. producción) y el usuario sólo pidió el primero. La FK opcional de la Decisión 1 queda como salida si la trazabilidad se vuelve necesaria.
- **El texto libre en `descripcionSemilla` impide agregar/reportar** ("¿cuánto tomate recibí esta temporada?") → Aceptado: el objetivo es constancia, no analítica. Si aparece la necesidad, se normaliza después con los datos reales ya cargados, que es mejor base para diseñar el catálogo que adivinarlo ahora.
- **La boletita se envía por WhatsApp Web y depende de una sesión abierta y del bloqueo de pop-ups** → Limitación heredada del mecanismo del remito, ya conocida y aceptada por el usuario. Los botones de PDF y PNG funcionan sin ninguna dependencia externa y cubren el caso de fallo.
- **El snapshot de nombre/teléfono se desactualiza** si el cliente cambia de teléfono después del registro → Es intencional: un comprobante histórico debe reflejar los datos al momento de la entrega. Para reenviar la boletita a un teléfono nuevo, se edita el registro.
- **`contenidoPorSobre` cargado con `unidad ≠ SOBRES`** produciría un total sin sentido → El servicio lo normaliza a `null` cuando la unidad no es `SOBRES`, mismo patrón que `validarYNormalizarOrigen()` en `SiembraServiceImpl`, que fuerza `codigoLote = null` cuando el origen es `SUELTO`.

## Migration Plan

No hay migración de datos: es una entidad nueva. La tabla `registros_semillas` la crea Hibernate por `ddl-auto`, igual que el resto del esquema.

**Actualizado 2026-09-03 (ver nota de revisión de la Decisión 8):** `PermisoEnum` sí cambia — se agregan `LEER_REGISTRO_SEMILLAS`/`ESCRIBIR_REGISTRO_SEMILLAS` al final (IDs 19/20), sin reordenar los existentes. `DataInitializer` sigue sin cambios: `EnumSet.allOf(PermisoEnum.class)` (JEFE) y `allOf` menos `ADMIN_DB` (COLEGA) ya cubren los permisos nuevos, así que ningún despliegue existente necesita re-seed ni intervención manual — al reiniciar el backend, JEFE y COLEGA quedan con los permisos nuevos automáticamente.

**Rollback:** revertir el commit. La tabla queda huérfana pero vacía de dependencias — ninguna entidad existente la referencia, por diseño (Decisión 1).

**Carga histórica del papel:** fuera de alcance. El registro arranca vacío y se carga hacia adelante; las filas viejas de la libreta pueden cargarse a mano si el jefe quiere, ya que `fechaRecepcion` es editable.

## Open Questions

- La columna **"Stock"** del papel quedó sin modelar (Non-Goal). Si al usar la pantalla el jefe la pide, hay que averiguar primero qué anota ahí antes de agregar un campo.
- **Reimpresión de la boletita**: se resuelve reabriendo el modal desde el listado, sin numeración de copias. Si hace falta distinguir original de duplicado, se agrega después.
- **`unidadNegocio`**: la entidad no lo lleva, siguiendo el precedente de `Siembra` (que tampoco lo tiene) y confiando en el gating del menú. Si el sistema migra a filtrado por unidad a nivel de query, `RegistroSemilla` deberá sumarse junto con `Siembra`, no antes.
