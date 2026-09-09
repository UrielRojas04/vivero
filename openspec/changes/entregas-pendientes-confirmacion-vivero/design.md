## Context

Hoy la única forma de que salga stock por una entrega a un cliente es `POST /api/ventas` (`VentaServiceImpl.crearVenta`), que en un solo acto: resuelve el precio de cada línea, descuenta stock, congela el costo, crea `Venta` + `VentaDetalle` + `Pago`, abre/usa la `FacturaCliente` ABIERTA del cliente, mueve la cuenta corriente y da de alta los cheques. No hay ningún camino que separe "la mercadería salió" de "la venta está cerrada a tal precio".

El dueño pide exactamente esa separación, sólo para Vivero: el empleado registra la salida (descuenta stock, captura la firma del cliente), y el dueño después le pone precio y la convierte en venta.

### Estado actual del código (auditado para este change)

**Stock y venta**

- `VentaServiceImpl.crearVenta()` (líneas 75-322) tiene dos ramas dentro del `for` sobre `request.getDetalles()`: la de **Abono** (descuenta de `StockAbono`) y la de **Vivero/Herramientas** (valida stock, `producto.setStock(...)`, `productoRepository.save`, `sseService.emitStockUpdate`, y `movimientoStockService.registrarMovimiento(..., TipoMovimientoStock.VENTA, usuario)`). El `MovimientoStock` devuelto es **la fuente del costo congelado** de la línea: `costoUnitarioHistorico`, `costoBaseHistorico`, `descuentoPorcentajeHistorico`, `envioPorcentajeHistorico` se copian de él.
- `resolverPrecioUnitario(detReq, producto)` (línea 549) es el **único** punto de resolución del precio efectivo, llamado por ambas ramas — construido por el change `precio-editable-confirmacion-venta`. `VentaDetalleRequestDTO` ya acepta `precioUnitario` opcional.
- Todo lo que viene después del `for` (subtotal, descuento global, `totalFinal`, pagos, cheques, cuenta corriente, factura, bandejas, `mapearAVentaResponseDTO`) es **común y no depende de cómo salió el stock**.

**`TipoMovimientoStock`** — valores actuales: `INGRESO, EGRESO, VENTA, MERMA, AJUSTE_INICIAL, DEVOLUCION_SOBRANTE`.

Barrido completo de usos (`grep -rn "TipoMovimientoStock\." backend/src`, 13 ocurrencias, verificado): **no existe ningún `switch` ni pattern-match sobre el enum en todo el backend**, y **el frontend no lo referencia en ningún archivo** (`grep` de `tipoMovimiento`/`AJUSTE_INICIAL`/`DEVOLUCION_SOBRANTE` en `frontend/src` → cero resultados). Los únicos usos son comparaciones puntuales:

| Lugar | Uso | Efecto de un valor nuevo |
|---|---|---|
| `MovimientoStockServiceImpl:121` | `tipo == INGRESO \|\| tipo == AJUSTE_INICIAL` → rama "entrante" (`aplicarDesglose`) | Un valor nuevo cae al `else` (rama de egreso: copia el desglose del último ingreso). Correcto para nosotros. |
| `MovimientoStockServiceImpl:140` y `:222` | `findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(id, [INGRESO, AJUSTE_INICIAL])` | Un valor nuevo **no** entra en esa lista → nunca se vuelve referencia de costo de egresos futuros. |
| `MovimientoStockServiceImpl:163` | `porCapas && (INGRESO \|\| AJUSTE_INICIAL)` → `crearCapa` | Un valor nuevo no crea capa. |
| `MovimientoStockServiceImpl:130` | `else if (porCapas)` → `registrarEgresoPorCapas` | ⚠️ Un valor nuevo **descontaría capas** si `porCapas` fuera true. Sólo Herramientas tiene el flag; este change es Vivero-only y lo guardea explícitamente (Decisión 9). |
| `DataInitializer`, `ProductoServiceImpl`, `PedidoServiceImpl`, `SiembraServiceImpl`, `DevolucionServiceImpl`, `VentaServiceImpl` | pasan un valor literal al registrar | Sin impacto. |

`MovimientoStockRepository` tiene sólo dos métodos, ninguno filtra por tipo salvo el `In(...)` de arriba. `MovimientoStockController` lista todos los movimientos de la unidad sin filtrar por tipo (y, dicho sea de paso, llama al repositorio directo — violación preexistente de la regla dura #6 que **este change no toca ni empeora**).

**Costos en Finanzas**: `FinanzasServiceImpl` calcula el COGS con `VentaDetalleRepository.sumarCostoMercaderiaVendida` (`SUM(vd.cantidad * vd.costoUnitarioHistorico)`), es decir **desde `VentaDetalle`, no desde `MovimientoStock`**. Consecuencia directa y deseada: una entrega pendiente no aporta ni ingreso ni costo a Finanzas hasta que se confirma. No hay asimetría contable.

**Permisos** — cableado real end-to-end verificado (no supuesto):

1. `PermisoEnum` (IDs estables, "agregar nuevos siempre al final", máximo actual `LEER_CONFIGURACION(21L)`).
2. `Rol.permisos` es un `@ElementCollection` de `Set<PermisoEnum>` con `@Enumerated(EnumType.STRING)` sobre la tabla `rol_permisos` → **un valor nuevo no requiere DDL ni seed de tabla**. El comentario del `DataInitializer` lo dice explícitamente: *"1. Permisos ahora viven como PermisoEnum — no requieren tabla ni seeding."*
3. `RolServiceImpl.getAllPermisos()` hace `Arrays.stream(PermisoEnum.values())` → el endpoint `GET /api/roles/permisos` que alimenta el modal de roles **expone los permisos nuevos automáticamente**, sin tocar nada.
4. `DataInitializer`: `permisosJefe = EnumSet.allOf(PermisoEnum.class)` (JEFE recibe cualquier permiso nuevo solo); `permisosColega = allOf` menos `ADMIN_DB` y `LEER_CONFIGURACION` (**acá sí hay que decidir explícitamente**, ver Decisión 8).
5. Frontend `pages/UsuariosAdmin.jsx`: `PERMISO_UNIDAD_MAP` (permiso → unidades donde se puede tildar en la pestaña "Avanzado") y `SECTIONS` (casilla por sección en la pestaña "Por Secciones"). Un permiso ausente de `PERMISO_UNIDAD_MAP` **no se ve nunca** en el modal de roles (`permisosVisiblesAvanzado` filtra por ese mapa). Este es el paso que se olvida y deja el permiso inasignable.
6. `layouts/DashboardLayout.jsx` `navGroups` (`permission` + `unidades`) y `App.jsx` (`<ProtectedRoute requiredPermission=... />`).

**Gating Vivero-only**: el mecanismo establecido es `navGroups[].items[].unidades: ['vivero']` + el `useEffect` guard de `DashboardLayout.jsx` (~línea 127) que compara `location.pathname.startsWith(item.to)` contra la unidad activa y redirige a `/dashboard` si ninguna entrada de esa ruta admite la unidad. Es lo que ya usan Siembras, Registro de Semillas y Devoluciones (`/bandejas`). El Dashboard, además, gatea tarjetas con `unidadNegocioActiva === '1'` (`BandejasDisponiblesList`).

**Firma / archivos**: barrido de `@Lob`, `byte[]`, `MultipartFile` y `columnDefinition` con tipos binarios en `backend/src/main/java` → **no existe ningún patrón de subida ni de almacenamiento de archivos/blobs en el repo** (los `columnDefinition` que aparecen son todos `boolean default false` / `varchar(...) default ...`). Confirmado: no hay infraestructura previa que reutilizar ni que contradecir.

**Antecedente de seguridad a no repetir**: `DevolucionController` se implementó sin ningún `@PreAuthorize` en su endpoint de escritura y se detectó tarde. Todo endpoint de este change nace con su `@PreAuthorize` y con su test de permiso (patrón `HistorialCobrosAbonoControllerPermisoTest` / `RendicionColegaControllerPermisoTest`).

**Restricciones del proyecto** (`CLAUDE.md`, reglas duras): DTOs siempre (nunca entidades JPA en endpoints); `Controller → Service → Repository → Model`; listados paginados; tests contra Postgres real (`localhost:5433`, sin mocks de DB); componentes React PascalCase, `cursor-pointer` en botones, iconos `lucide-react`, feedback vía `useUIStore().pushToast` (nunca `alert`/`confirm`). Strict TDD Mode activo para el apply.

## Goals / Non-Goals

**Goals:**

- Que un empleado de Vivero registre que un cliente se llevó productos, descontando stock al instante, **sin fijar precio y sin crear ninguna `Venta`**.
- Capturar la firma del cliente en pantalla al momento de la entrega, sin agregar ninguna dependencia npm ni infraestructura de archivos.
- Que la entrega quede visible para el dueño en su Dashboard, con la firma consultable como constancia.
- Que el dueño, al confirmar, asigne precio por línea y **recién ahí** se cree la `Venta` real, con su pago, su factura y su reflejo en cuenta corriente — reutilizando el camino de venta existente, sin duplicar la fórmula de precio/subtotal ni volver a descontar stock.
- Que el dueño pueda rechazar una entrega, con una consecuencia de stock definida, trazable y automática.
- Permisos propios y acotados, verificados en el backend en cada endpoint desde el día uno.
- Exclusivo de Vivero, con el mismo mecanismo de gating que ya usan Siembras / Registro de Semillas / Devoluciones.

**Non-Goals:**

- Herramientas y Abono. Ni menú, ni ruta, ni endpoint utilizable desde esas unidades.
- Modificar `Venta` / `VentaDetalle` (modelo ni columnas). La entrega pendiente es una entidad **previa y separada**.
- Modificar el mecanismo de `precio-editable-confirmacion-venta`. Se reutiliza tal cual (`VentaDetalleRequestDTO.precioUnitario` + `resolverPrecioUnitario`).
- Lógica de pago nueva. Confirmar una entrega usa el mismo bloque de pagos/cheques/cuenta corriente que ya corre hoy al cerrar una venta.
- Edición de una entrega ya registrada (cambiar productos o cantidades). Se confirma o se rechaza; corregir una carga errónea es rechazar y volver a registrar.
- Cliente casual / ad-hoc en una entrega pendiente (ver Decisión 7).
- Firma con validez legal, sello de tiempo criptográfico o certificado digital. Es una constancia operativa, no una firma electrónica avanzada.

## Decisions

### Decisión 1 — Dos valores nuevos en `TipoMovimientoStock`: `ENTREGA_PENDIENTE` y `REVERSA_ENTREGA_PENDIENTE`

El descuento de stock al registrar la entrega se registra como un `MovimientoStock` con tipo **`ENTREGA_PENDIENTE`**; la reposición al rechazar, como uno con tipo **`REVERSA_ENTREGA_PENDIENTE`**. Ambos se crean con el mismo `movimientoStockService.registrarMovimiento(producto, cantidad, tipo, usuario)` que ya usa todo el sistema.

*Por qué el enum y no una mutación directa de `Producto.stock`*: el historial de movimientos es el único registro de por qué el stock de un producto cambió, y ya lo consume `GET /api/movimientos-stock`. Una salida de mercadería que mueve `Producto.stock` sin dejar movimiento es exactamente el "ajuste manual invisible" que el proposal pide eliminar: el stock bajaría y el historial no lo explicaría. Además, el `MovimientoStock` de la entrega es lo que **congela el costo** de esa mercadería en el momento en que físicamente salió, y ese costo es el que después necesita el `VentaDetalle` (ver Decisión 3).

*Por qué dos valores y no reutilizar los existentes*:
- `VENTA` mentiría: no hay venta todavía, y ese es el punto entero del change.
- `EGRESO` / `MERMA` son ajustes de catálogo y pérdidas, no salidas hacia un cliente identificado; mezclarlas haría irrecuperable la traza.
- Para la reposición del rechazo, `INGRESO` sería un **defecto real, no una preferencia de estilo**: `MovimientoStockServiceImpl:140` usa `findFirstByProductoIdAndTipoMovimientoIn([INGRESO, AJUSTE_INICIAL])` como **referencia de costo de todos los egresos futuros** de ese producto. Un `INGRESO` generado por un rechazo pasaría a ser "el último ingreso" y fijaría el costo base de todas las ventas siguientes de ese producto. `DEVOLUCION_SOBRANTE` tampoco sirve: hoy significa otra cosa (`DevolucionServiceImpl` crea un producto nuevo "… DEVUELTO" con dueño anterior).
- `REVERSA_ENTREGA_PENDIENTE` cae en el `else` de `registrarMovimiento` (copia el desglose del último ingreso, igual que un egreso) y **no** entra en la lista de referencia de costo ni crea capa. El signo lo pone el llamador: `cantidad` se persiste siempre positiva (igual que en `VENTA`) y quien suma o resta a `Producto.stock` es el servicio, como en todo el resto del código base.

*Verificación de compatibilidad*: no hay ningún `switch` sobre `TipoMovimientoStock` en el backend ni ninguna referencia en el frontend (auditoría en Context). **Ningún consumidor existente requiere cambios por agregar estos dos valores.** La única rama sensible (`registrarEgresoPorCapas`, alcanzable sólo con `costeoPorCapasHabilitado`) queda cubierta por el guard de unidad de la Decisión 9 y por un test explícito.

### Decisión 2 — Al rechazar, el stock se repone automáticamente

Rechazar una entrega `PENDIENTE` repone el stock de cada línea (`producto.setStock(stock + cantidad)` + `MovimientoStock` de tipo `REVERSA_ENTREGA_PENDIENTE` + `sseService.emitStockUpdate`), en la misma transacción, y marca la entrega `RECHAZADA` con su `motivoRechazo`.

*Por qué automático y no un ajuste manual aparte*: el sistema fue quien descontó ese stock, con un movimiento propio y trazable. Si el rechazo no lo repone, el conteo del sistema queda por debajo del físico sin ninguna causa visible, y el dueño tiene que acordarse de compensar a mano — que es el problema que el change vino a resolver, reintroducido por la puerta de atrás. Un rechazo es, por definición, "esta salida no ocurrió como se cargó".

*Por qué no hace falta validar stock al reponer*: reponer sólo suma. No puede fallar por insuficiencia.

*Caso "el cliente no vino / se llevó menos"*: se rechaza entera y se vuelve a registrar la entrega correcta. No hay rechazo parcial (Non-Goal: edición de entregas).

*Alternativa descartada — dejar el stock descontado y que el dueño ajuste*: obliga a un `EGRESO`/`AJUSTE` manual sin vínculo con la entrega, no queda trazado a qué rechazo correspondió, y depende de que un humano no se olvide.

### Decisión 3 — El costo congelado sale del `MovimientoStock` de la entrega, no de uno nuevo al confirmar

`EntregaPendienteDetalle` guarda una FK al `MovimientoStock` creado al registrar la entrega. Al confirmar, el `VentaDetalle` copia `costoUnitarioHistorico`, `costoBaseHistorico`, `descuentoPorcentajeHistorico` y `envioPorcentajeHistorico` **de ese movimiento**, no de uno nuevo.

*Por qué*: es contablemente lo correcto — el costo de la mercadería es el que tenía cuando salió del depósito, no el que tiene el catálogo días después, cuando el dueño se acuerda de ponerle precio. Y es lo que hace posible confirmar sin volver a tocar stock: la única razón por la que `crearVenta` necesita el `MovimientoStock` es el costo, y acá ese movimiento ya existe.

### Decisión 4 — La confirmación reutiliza `crearVenta` vía un parámetro de "stock ya descontado", sin duplicar nada

`VentaServiceImpl.crearVenta(request, username)` se refactoriza a un delegado:

```java
@Override @Transactional
public VentaResponseDTO crearVenta(VentaRequestDTO request, String username) {
    return crearVentaInterna(request, username, null);   // comportamiento idéntico al de hoy
}

@Override @Transactional
public VentaResponseDTO crearVentaConStockYaDescontado(
        VentaRequestDTO request, String username, List<MovimientoStock> movimientosPorLinea) { ... }
```

`movimientosPorLinea` es **índice-alineado** con `request.getDetalles()` (misma longitud, misma posición). Dentro del `for`, la rama Vivero/Herramientas queda:

```java
MovimientoStock mov;
if (movimientosPorLinea == null) {
    // ... bloque de SIEMPRE, sin tocar una línea: validar cantidad, validar stock,
    //     producto.setStock(...), save, emitStockUpdate, registrarMovimiento(..., VENTA, ...)
} else {
    mov = movimientosPorLinea.get(i);   // el stock ya salió al registrar la entrega
}
```

Todo lo demás — `resolverPrecioUnitario`, `subtotalLine`, `subtotal`, `descuento`, `totalFinal`, pagos, cheques, cuenta corriente, `FacturaCliente`, bandejas, `mapearAVentaResponseDTO` — queda **exactamente igual y compartido**. Con `movimientosPorLinea == null` el método hace, línea por línea, lo mismo que hoy: contrato de no-regresión verificado por los tests de venta existentes, que deben seguir pasando sin modificarse.

*Por qué esta forma y no otras*:
- **Método bespoke en `EntregaPendienteServiceImpl`**: obligaría a re-escribir ~150 líneas (precio, subtotal, descuento global, pagos, cheques, cuenta corriente, factura). Es precisamente la duplicación de la fórmula de precio/subtotal que el proposal prohíbe, y garantiza que las dos copias diverjan en el primer arreglo que se haga en una sola.
- **Un `boolean descontarStock`**: un flag booleano no alcanza — cuando el stock ya salió hace falta *de dónde* sacar el costo congelado (Decisión 3), y eso es un dato, no un sí/no. Pasar la lista de movimientos resuelve las dos cosas a la vez y hace imposible pedir "no descuentes" sin decir con qué costo.
- **Reponer stock al rechazar… perdón, al confirmar, para después volver a descontarlo con `crearVenta` normal**: generaría dos movimientos falsos por línea, ensuciaría el historial, y podría fallar si el stock quedó en cero mientras tanto — una venta ya entregada no puede rechazarse por falta de stock.
- **Un `Map<productoId, MovimientoStock>`**: se rompe si la misma entrega tiene el mismo producto en dos líneas. La lista índice-alineada no.

`crearVentaConStockYaDescontado` se declara en la interfaz `VentaService` (es una llamada servicio→servicio, no un endpoint: pasar `MovimientoStock` ahí no viola la regla de DTOs, que aplica a lo que sale por HTTP). Valida que `movimientosPorLinea.size() == request.getDetalles().size()` y que ninguno sea `null`; y **rechaza la unidad Abono** (la rama de `StockAbono` no participa de este flujo — ver Decisión 9).

### Decisión 5 — La firma se guarda como data-URL PNG en una columna `TEXT` de `entregas_pendientes`

Campo `firmaBase64`, `@Column(name = "firma_base64", columnDefinition = "TEXT", nullable = false)`, con el string completo que devuelve `canvas.toDataURL('image/png')` (`data:image/png;base64,iVBORw0...`).

*Por qué la data-URL entera y no sólo el base64 pelado*: el frontend la consume con `<img src={firma} />` sin ninguna transformación, y el prefijo documenta el tipo MIME real de lo guardado.

*Validación en el backend* (no sólo en el navegador): debe empezar con `data:image/png;base64,`, no estar en blanco, y no superar **512 KB de longitud de string** (≈ 384 KB de imagen; una firma real de un canvas de 600×200 pesa 5-20 KB, así que el tope es holgadísimo y sólo frena abuso o un envío accidental de una foto). Fuera de rango → `IllegalArgumentException` → 400.

*Por qué obligatoria*: la firma **es** la constancia de que el cliente se llevó la mercadería sin comprobante de venta. Una entrega sin firma es el papelito que el change vino a reemplazar. Relajarlo después es cambiar `nullable` y un `if`.

*Por qué `TEXT` en la misma tabla y no una tabla aparte ni un archivo en disco*: no existe ninguna infraestructura de archivos en el repo (auditado), y agregarla (volumen Docker, ruta configurable, backup, borrado huérfano, servido autenticado) es infraestructura nueva para guardar ~15 KB por entrega. Una tabla 1:1 aparte sólo existiría para evitar traer la columna en los listados, y eso ya está resuelto sin tabla nueva por la Decisión 6.

*Riesgo de peso en las queries*: mitigado por la Decisión 6 — **ningún listado selecciona la columna**.

### Decisión 6 — La firma nunca viaja en un listado: endpoint dedicado `GET /{id}/firma`

`EntregaPendienteResumenDTO` (el que devuelven los listados paginados) **no tiene** campo de firma, y su query es una proyección JPQL que no selecciona `firma_base64`. La firma se pide explícitamente, de a una, con `GET /api/entregas-pendientes/{id}/firma`.

*Por qué*: una página de 20 entregas con la firma embebida serían ~400 KB de base64 por request, para una imagen que el dueño mira una vez cuando abre el detalle. Es además la razón por la que no hace falta `@Basic(fetch = LAZY)` (que en JPA requiere bytecode enhancement y es notoriamente poco confiable): si la query no la selecciona, no se trae.

### Decisión 7 — Una entrega pendiente exige un `Cliente` real de la agenda; no admite cliente casual

`clienteId` es obligatorio. No se acepta el `ClienteAdHocDTO` casual que sí admite una venta normal.

*Por qué*: una entrega pendiente es crédito otorgado — mercadería que salió sin cobrar, que se va a cobrar después contra la factura y la cuenta corriente del cliente. Un cliente casual no tiene ni factura abierta ni cuenta corriente (`crearVenta` lo trata explícitamente aparte: *"Para cliente casual, no hay cuenta corriente"*), así que una entrega pendiente a nombre de un casual sería mercadería entregada a nadie. Si el cliente no está en la agenda, se lo da de alta primero — el alta al vuelo desde el buscador ya existe (`clienteCreadoAlVuelo` en `NuevaVenta.jsx`, change `clientes-dni-cuil`) y se reutiliza tal cual.

### Decisión 8 — Permisos: `LEER_ENTREGAS(22L)` y `ESCRIBIR_ENTREGAS(23L)`, con `LEER_ENTREGAS` como permiso del dueño

Semántica explícita, porque no es la obvia a primera vista:

| Permiso | ID | Significa | Quién |
|---|---|---|---|
| `LEER_ENTREGAS` | 22 | **Supervisar** entregas: ver todas las de la unidad, ver la firma, **confirmar** y **rechazar** | El dueño |
| `ESCRIBIR_ENTREGAS` | 23 | **Registrar** una entrega y ver las propias | El empleado |

Gates por endpoint:

| Endpoint | `@PreAuthorize` |
|---|---|
| `POST /api/entregas-pendientes` | `hasAuthority('ESCRIBIR_ENTREGAS')` |
| `GET /api/entregas-pendientes/mias` | `hasAuthority('ESCRIBIR_ENTREGAS')` |
| `GET /api/entregas-pendientes` | `hasAuthority('LEER_ENTREGAS')` |
| `GET /api/entregas-pendientes/{id}` | `hasAuthority('LEER_ENTREGAS')` |
| `GET /api/entregas-pendientes/{id}/firma` | `hasAuthority('LEER_ENTREGAS')` |
| `POST /api/entregas-pendientes/{id}/confirmar` | `hasAuthority('LEER_ENTREGAS') and hasAuthority('ESCRIBIR_VENTAS')` |
| `POST /api/entregas-pendientes/{id}/rechazar` | `hasAuthority('LEER_ENTREGAS')` |

*Por qué `LEER_ENTREGAS` (un nombre de lectura) gatea dos escrituras*: el proposal fija estos dos nombres, y con dos permisos el único corte que separa "el empleado registra" de "el dueño resuelve" es este. El precedente del repo es idéntico: `LEER_FINANZAS` es el permiso de administrador de la unidad, no una simple lectura. Se documenta acá para que no se lea como un descuido.

*Por qué confirmar exige además `ESCRIBIR_VENTAS`*: confirmar **crea una `Venta`**. Quien no puede crear ventas por la puerta de adelante no debe poder crearlas por esta. Es honesto respecto de lo que la operación hace, y es defensa en profundidad si algún día `LEER_ENTREGAS` se reparte más ampliamente.

*Cableado end-to-end* (los cinco pasos del patrón real verificado en Context, ninguno inventado):
1. `PermisoEnum`: agregar `LEER_ENTREGAS(22L)` y `ESCRIBIR_ENTREGAS(23L)` **al final**, sin reordenar nada.
2. Tabla `rol_permisos`: nada que hacer (`@ElementCollection` + `EnumType.STRING`).
3. `GET /api/roles/permisos`: nada que hacer (`getAllPermisos()` enumera `PermisoEnum.values()`).
4. `DataInitializer`: JEFE los recibe solo (`EnumSet.allOf`). A `permisosColega` se les **quita ambos**, con el mismo criterio y el mismo estilo de comentario que `LEER_CONFIGURACION`: COLEGA es un rol exclusivo de Abono y este change es Vivero-only; un permiso que no puede ejercer en su unidad no debe figurar en su rol.
5. `frontend/src/pages/UsuariosAdmin.jsx`: agregar `LEER_ENTREGAS: ['vivero']` y `ESCRIBIR_ENTREGAS: ['vivero']` a `PERMISO_UNIDAD_MAP` — **sin este paso el permiso existe pero es inasignable desde el modal de roles** — y una entrada en `SECTIONS`: `{ id: 'entregas', name: 'Entregas', permNames: ['ESCRIBIR_ENTREGAS'], unidades: ['vivero'] }`. La casilla por secciones reparte **sólo** `ESCRIBIR_ENTREGAS`: es la sección que se le da a un empleado. `LEER_ENTREGAS` queda tildable únicamente a mano desde "Avanzado", igual de deliberado que la ausencia de Finanzas/Cheques en `SECTIONS`.

### Decisión 9 — Vivero-only verificado en el backend, no sólo escondido en el menú

Además del gating de UI, `EntregaPendienteServiceImpl` empieza **cada** método público con un guard que lee `UnidadNegocioContextHolder.getUnidadNegocioId()`, resuelve la `UnidadNegocio` y exige que su `nombre` sea `"Vivero"`; si no, lanza (→ 403/400). Toda entrega se persiste con su `unidadNegocio` y **todas** las queries filtran por ella.

*Por qué no alcanza el menú*: ocultar un ítem de navegación no cierra un endpoint. Un usuario de Herramientas con `ESCRIBIR_ENTREGAS` (asignable por error) podría llamar la API directo. Es también lo que mantiene fuera de alcance la rama `registrarEgresoPorCapas` de `MovimientoStockServiceImpl` (sólo activa con `costeoPorCapasHabilitado`, hoy exclusivo de Herramientas): con el guard, un movimiento `ENTREGA_PENDIENTE` nunca puede llegar a esa rama.

*UI*: ítem en `navGroups` con `unidades: ['vivero']` (queda cubierto por el `useEffect` guard existente de `DashboardLayout.jsx`), ruta en `App.jsx` con `<ProtectedRoute requiredPermission="ESCRIBIR_ENTREGAS" />`, y la tarjeta del Dashboard bajo `unidadNegocioActiva === '1' && hasPermission('LEER_ENTREGAS')` — mismo patrón exacto que `BandejasDisponiblesList`.

### Decisión 10 — El empleado ve sus propias entregas pero no puede cancelarlas

Con `ESCRIBIR_ENTREGAS`, el empleado accede a `GET /api/entregas-pendientes/mias`: **sólo las registradas por él**, en la unidad Vivero, paginadas, en cualquier estado (para que vea cuáles ya se confirmaron o rechazaron). **No** puede confirmar, rechazar ni borrar ninguna.

*Por qué ve las propias*: sin eso, el empleado registra a ciegas y no tiene forma de saber si cargó dos veces la misma entrega — lo que produce exactamente la carga duplicada que después hay que rechazar.

*Por qué no puede cancelar*: (a) cancelar repondría stock, y la reposición de stock es justamente la potestad de control que el dueño pidió reservarse; (b) una ventana de cancelación "dentro de los N minutos" agrega una segunda ruta que toca stock más una regla dependiente del reloj, superficie nueva para equivocarse en un caso raro que el rechazo del dueño ya cubre en minutos; (c) la firma es una constancia: que quien la capturó pueda hacerla desaparecer le saca valor probatorio. Una carga errónea se resuelve avisando al dueño, que rechaza — que es el flujo que el change ya define.

*Reversible*: si el dueño después pide el auto-borrado, es un endpoint más sobre el mismo modelo, sin cambios de datos.

### Decisión 11 — La `Venta` que nace de una confirmación lleva la fecha y el usuario de la confirmación

`Venta.fecha = ahora (momento de confirmar)` y `Venta.usuario = el usuario que confirma` (el dueño). La fecha de la entrega física y el empleado que la registró viven en `EntregaPendiente.fecha` / `EntregaPendiente.usuarioRegistro`, y la entrega queda vinculada a la venta (`EntregaPendiente.venta`), así que la traza completa está disponible desde ambos lados.

*Por qué*: sale de la premisa central del change — **la venta no existe hasta que se confirma**. Fecharla el día de la entrega crearía una venta retroactiva en un período de Finanzas posiblemente ya revisado. Y quien decide el precio y cierra la operación es el dueño; atribuirle la venta al empleado, cuyo permiso explícitamente **no** incluye fijar precios, sería atribuirle un acto que no puede realizar.

*Consecuencia asumida*: en el reporte de ventas por usuario, una venta nacida de una entrega figura a nombre del dueño. Es correcto respecto de lo que el reporte mide (quién cerró la venta), y el dato del empleado no se pierde. Si algún día se quiere un "ventas atendidas por empleado", el dato ya está persistido; es un reporte, no un cambio de modelo.

### Decisión 12 — Modelo de datos

```
EntregaPendiente                      tabla: entregas_pendientes
  id                    Long, PK
  cliente               @ManyToOne  → clientes        (NOT NULL, Decisión 7)
  usuarioRegistro       @ManyToOne  → usuarios        (NOT NULL, el empleado)
  unidadNegocio         @ManyToOne  → unidades_negocio (NOT NULL, siempre Vivero)
  fecha                 LocalDateTime (NOT NULL, zona America/Argentina/Buenos_Aires)
  estado                @Enumerated(STRING) EstadoEntregaPendiente (NOT NULL, default PENDIENTE)
  firmaBase64           TEXT (NOT NULL, Decisión 5)
  observacion           String(500), nullable
  venta                 @ManyToOne → ventas, nullable  (sólo si CONFIRMADA)
  usuarioResolucion     @ManyToOne → usuarios, nullable (quien confirmó/rechazó)
  fechaResolucion       LocalDateTime, nullable
  motivoRechazo         String(500), nullable (sólo si RECHAZADA)
  detalles              @OneToMany(cascade = ALL, orphanRemoval = true)
  deleted               boolean default false  (+ @SQLDelete/@SQLRestriction, patrón del repo)

EntregaPendienteDetalle               tabla: entrega_pendiente_detalles
  id                    Long, PK
  entrega               @ManyToOne → entregas_pendientes (NOT NULL)
  producto              @ManyToOne → productos (NOT NULL)
  cantidad              Integer (NOT NULL, > 0)
  movimientoStock       @ManyToOne → movimientos_stock (NOT NULL, Decisión 3)
  deleted               boolean default false

enum EstadoEntregaPendiente { PENDIENTE, CONFIRMADA, RECHAZADA }
```

**Sin precio ni subtotal en el detalle, a propósito**: el precio no existe hasta la confirmación, y cuando existe vive en `VentaDetalle.precioUnitarioHistorico`. Una columna de precio en la entrega sería un segundo lugar donde vive el mismo dato, con dos formas de quedar desincronizado.

**Sin migración de datos**: son tablas nuevas, creadas por `ddl-auto=update` (config actual verificada). Nada preexistente cambia de forma.

**Transiciones de estado**: `PENDIENTE → CONFIRMADA` y `PENDIENTE → RECHAZADA`, y nada más. Confirmar o rechazar algo que no está `PENDIENTE` lanza (→ 409), lo que hace idempotente-seguro el doble click y el doble tab abiertos sobre la misma entrega.

### Decisión 13 — Contrato HTTP

```
POST /api/entregas-pendientes                     → 201 EntregaPendienteResponseDTO
  { clienteId, observacion?, firmaBase64,
    detalles: [ { productoId, cantidad } ] }

GET  /api/entregas-pendientes?estado=&page=0&size=20   → 200 Page<EntregaPendienteResumenDTO>
GET  /api/entregas-pendientes/mias?page=0&size=20      → 200 Page<EntregaPendienteResumenDTO>
GET  /api/entregas-pendientes/{id}                     → 200 EntregaPendienteResponseDTO  (con detalles, sin firma)
GET  /api/entregas-pendientes/{id}/firma               → 200 { firmaBase64 }
POST /api/entregas-pendientes/{id}/confirmar           → 201 VentaResponseDTO
  { porcentajeDescuento?, lineas: [ { detalleId, precioUnitario } ], pagos: [ PagoRequestDTO ] }
POST /api/entregas-pendientes/{id}/rechazar            → 200 EntregaPendienteResponseDTO
  { motivo? }
```

Los listados son **siempre `Page<...>`** (regla dura de paginación), con el mismo estilo `@RequestParam(defaultValue = "0"/"20")` de `HistorialCobrosAbonoController`. La tarjeta del Dashboard pide `size` chico y linkea al listado completo.

`confirmar` identifica cada línea por **`detalleId`** (no por `productoId`): una entrega puede repetir el mismo producto en dos líneas y el precio de cada una debe poder ser distinto. Se valida que llegue exactamente un precio por cada detalle de la entrega, ni de más ni de menos; falta o sobra → 400. `precioUnitario` sigue las mismas reglas que ya rigen para una venta (`resolverPrecioUnitario`: negativo → 400; `0` válido; normalizado a 2 decimales) **por reutilización del mismo código, no por una copia de la regla**.

El controller no toca ningún repositorio: `Controller → EntregaPendienteService → repositorios` (regla dura #6), y `EntregaPendienteServiceImpl` llama a `VentaService` y `MovimientoStockService` como servicios, no a sus repos.

### Decisión 14 — Frontend: `<canvas>` propio, cero dependencias nuevas

Componente `FirmaCanvas.jsx`: un `<canvas>` de 600×200 CSS-escalado a `devicePixelRatio`, con handlers de **Pointer Events** (`onPointerDown/Move/Up/Leave` — una sola familia de eventos cubre dedo, lápiz y mouse; no hace falta duplicar handlers de touch y de mouse), `touch-action: none` para que el gesto de firmar no scrollee la página en el celular, botón "Borrar" y expone la data-URL vía `toDataURL('image/png')`. Trazo con `lineCap/lineJoin: 'round'` y color tomado del token de tinta del sistema de diseño.

*Por qué sin librería*: `signature_pad` y similares resuelven interpolación de Bézier y presión — un lujo para una constancia operativa. Son ~15 KB más de bundle, una dependencia más que auditar y actualizar, y el proposal ya afirma que un `<canvas>` estándar alcanza. `package.json` no tiene hoy ninguna librería de firma ni de canvas (verificado).

*Fondo*: se pinta blanco explícitamente antes de firmar. Un canvas transparente exportado a PNG se ve como una firma invisible sobre fondo oscuro en el tema oscuro del sistema.

**Confirmación (dueño)**: `ConfirmarEntregaModal.jsx` reutiliza `FormattedNumberInput` y **el mismo layout de línea editable del modal "Liquidar Venta"** de `NuevaVenta.jsx` (nombre, cantidad, input de precio por unidad, subtotal de línea, recálculo en vivo del total). No hay carrito: las líneas vienen fijas de la entrega, no se agregan ni se quitan, y no hay `precioLista` que restaurar salvo como referencia (`producto.precio` actual, informativo). No se toca `useCartStore` ni `NuevaVenta.jsx`.

**Pantalla del empleado**: una sola ruta `/entregas` (`Entregas.jsx`) con el formulario de registro (buscador de cliente y de producto reutilizados de `NuevaVenta.jsx`, incluida el alta de cliente al vuelo) más una lista "Mis entregas". Ruta única para que el `useEffect` guard de `DashboardLayout.jsx`, que matchea por `startsWith(item.to)`, cubra la sección entera con una sola entrada en `navGroups`.

## Risks / Trade-offs

- **[Un valor nuevo de `TipoMovimientoStock` rompe un consumidor no auditado]** → Auditado exhaustivamente (13 usos en backend, 0 en frontend, ningún `switch`, tabla completa en Context). Además, la tarea 2.1 incluye un test explícito de que un movimiento `ENTREGA_PENDIENTE`/`REVERSA_ENTREGA_PENDIENTE` **no** se convierte en referencia de costo de egresos posteriores y **no** crea capa.

- **[Confirmar rompe `crearVenta` para las ventas normales]** → El riesgo real de la Decisión 4. Mitigado por: (a) la firma pública `crearVenta(request, username)` no cambia; (b) `crearVentaInterna(..., null)` es el camino de siempre sin una línea distinta; (c) la red de seguridad TDD (tarea 1.1) captura el conteo de la suite completa **antes** de tocar `VentaServiceImpl`, y los tests existentes de venta (`PrecioAjustadoVentaTest`, `VentaDocumentoCasualTest`, `VentaServiceListarVentasAbonoTest`, `VentaServiceObtenerPorIdTest`, `FinanzasBaselineTest`) deben seguir verdes **sin modificarse**. Modificar un test de venta existente para que pase es señal de regresión, no de un test desactualizado.

- **[Mercadería afuera que nadie confirma nunca]** → Stock descontado, sin venta, sin deuda en cuenta corriente: mercadería invisible para Finanzas por tiempo indefinido. Mitigación en esta versión: la tarjeta del Dashboard es el recordatorio permanente, y ordena por fecha ascendente (la más vieja primero, que es la que más urge). **No** se implementan alertas por antigüedad ni un tope de entregas abiertas por cliente — se anotan como candidatos si el dueño ve que pasa en la práctica.

- **[La firma no tiene validez legal]** → Es un trazo capturado en un canvas, sin certificado ni sello de tiempo confiable: prueba operativa interna ("el cliente estuvo y firmó"), no prueba judicial. Declarado como Non-Goal para que nadie lo asuma al revés.

- **[Firmas inflando la tabla]** → ~15 KB por entrega; 1.000 entregas ≈ 15 MB, irrelevante para Postgres. El tope de 512 KB por firma acota el peor caso y ningún listado selecciona la columna (Decisión 6).

- **[El precio se fija con el catálogo de otra fecha]** → El dueño puede confirmar días después, con el precio de lista ya cambiado. Es deliberado: **él** fija el precio línea por línea, el catálogo sólo sugiere. El costo, en cambio, sí queda congelado al momento de la salida (Decisión 3), así que el margen que informa Finanzas es el real de esa mercadería.

- **[`LEER_ENTREGAS` habilita dos escrituras pese al nombre]** → Documentado en la Decisión 8 con su tabla de gates, con el precedente de `LEER_FINANZAS`, y cubierto por tests de permiso por endpoint (403 sin el permiso / 2xx con él).

- **[La entrega queda huérfana si la venta falla a mitad de la confirmación]** → Todo el flujo de confirmación corre bajo un único `@Transactional` en `EntregaPendienteServiceImpl`; si `crearVenta…` lanza (stock de Abono, precio negativo, cliente inexistente), la transacción revierte y la entrega sigue `PENDIENTE`, reintentable. La entrega **nunca** queda `CONFIRMADA` sin `venta`.

## Migration Plan

- **Schema**: dos tablas nuevas (`entregas_pendientes`, `entrega_pendiente_detalles`) creadas por `ddl-auto=update`. Dos valores nuevos en la columna `varchar(50)` `tipo_movimiento` (mapeo `EnumType.STRING`, sin constraint de enum en la base). Dos filas más posibles en `rol_permisos` (`@ElementCollection` de strings). **Cero migración de datos, cero cambios sobre tablas existentes.**
- **Datos históricos**: intactos. Ninguna venta, movimiento de stock ni rol preexistente se lee ni se reescribe.
- **Orden de despliegue**: backend primero (los endpoints nuevos no molestan a nadie hasta que exista quien los llame); frontend después. Ningún contrato existente cambia de forma.
- **Otorgamiento de permisos**: al reiniciar, JEFE recibe los dos permisos nuevos automáticamente (`EnumSet.allOf`). Los roles de empleado existentes **no** cambian: el dueño tilda "Entregas" en el modal de roles a quien corresponda. Nadie gana acceso sin una acción explícita.
- **Rollback**: revertir el código alcanza. Las entregas ya `CONFIRMADA` dejan `Venta`s normales, indistinguibles de cualquier otra y perfectamente válidas sin este módulo. Las que queden `PENDIENTE` en el momento del rollback tienen su stock ya descontado y su `MovimientoStock` visible en el historial — se resuelven a mano, como cualquier salida de mercadería, y las tablas quedan en la base sin molestar.

## Open Questions

Ninguna bloqueante. Las cinco que el proposal dejó abiertas quedan resueltas acá: mecanismo de stock (D1), stock al rechazar (D2), almacenamiento de la firma (D5 + D6), camino de conversión a venta (D3 + D4) y visibilidad/cancelación por parte del empleado (D10).

Para más adelante, fuera del alcance de este change: alerta por entregas pendientes con demasiada antigüedad; tope de entregas abiertas por cliente; rechazo parcial de una entrega; reporte de "ventas atendidas por empleado" derivado de `EntregaPendiente.usuarioRegistro`; y extender el mecanismo a Herramientas o Abono, que exigiría antes resolver `registrarEgresoPorCapas` para los tipos nuevos y la rama de `StockAbono`.
