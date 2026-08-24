## Context

### El pedido, en palabras del usuario

> "Cuando confirmo un pedido, el costo real queda en el movimiento, pero la ficha del producto en Productos sigue con el costo viejo. No hay ninguna señal. Tengo que acordarme de ir a mirar producto por producto. Quiero una franja adentro de Productos que me liste sólo los que quedaron desalineados, con el costo viejo y el nuevo al lado, y el precio viejo y el que me quedaría. Y dos botones: actualizar, o descartar. Descartar no es 'nunca más' — si después me llega otra compra a otro precio, quiero que vuelva a aparecer."

### Por qué existe la desalineación (y por qué está bien que exista)

`herramientas-pedidos-proveedores` (archivado 2026-08-19) tomó la **Decisión 6: la confirmación de recepción no pisa `Producto.costoProducto`**. La razón sigue vigente y no se reabre acá: `costoProducto` alimenta `calcularPrecioSiAplica()`, que **pisa `Producto.precio`** cuando `porcentajeGanancia > 0`. Si confirmar un pedido escribiera el costo, confirmar la llegada de mercadería movería en silencio el precio de venta al público de todo lo recibido, en medio de una operación cuyo propósito declarado es "que los productos pasen a stock".

Ese diseño es correcto. Lo que faltó es **el paso siguiente**: la decisión comercial explícita de actualizar el precio existe hoy sólo como "el jefe se acuerda y entra a Productos". Este change convierte ese "se acuerda" en una lista visible de un click. **No cambia la política — la completa.**

### Qué NO está roto (verificado en código, importante para calibrar el alcance)

`VentaServiceImpl:118` hace `detalle.setCostoUnitarioHistorico(mov.getCostoUnitario())` — el costo de la venta sale del **último movimiento de stock**, nunca de `Producto.costoProducto`. `Finanzas.jsx:472/476` muestra ese mismo valor congelado por línea de venta. Es decir: **el margen que reporta el sistema ya usa el costo real**. La desalineación no produce ni un peso de error contable. Lo que produce es (a) una ficha que miente sobre el costo cuando el jefe la mira, y (b) un **precio de venta** que se quedó calculado sobre un costo viejo. Este change es de **higiene de catálogo y de precio de lista**, no de corrección contable — y `tasks.md` no debe tratarlo como si lo fuera.

### El modelo real de costeo que hay que leer antes de diseñar la query

Tres changes construyeron el estado actual, y la query de detección depende de entender **qué campo significa qué**:

| Campo | Qué es | Escala |
|---|---|---|
| `productos.costo_producto` | El costo **base de catálogo** que el usuario tipeó en la ficha, ANTES de descuentos, IVA y envío. Nullable. | `numeric(10,2)` |
| `movimientos_stock.costo_base` | El costo **base congelado** de ese movimiento — misma naturaleza que el anterior (antes de descuentos/IVA/envío), ya convertido a pesos si la línea era en USD. Default `0.00`. | `numeric(12,2)` |
| `movimientos_stock.costo_unitario` | El costo **final** de ese movimiento, después de la cascada de descuentos, el IVA y el envío. Es lo que lee la venta. | `numeric(12,2)` |
| `productos.precio` | Precio de venta al público. Lo pisa `calcularPrecioSiAplica()` si `porcentajeGanancia > 0` **y** `costoProducto > 0`. | `numeric(10,2)` |
| `Producto.costoUnitarioHistorico` | `@Formula` de sólo lectura: el `costo_unitario` del último `INGRESO`/`AJUSTE_INICIAL`. | — |

**La comparación correcta es `costo_producto` ↔ `costo_base`**, no `costo_producto` ↔ `costo_unitario`: son los dos el mismo tipo de número (la base antes de la cadena). Comparar contra `costo_unitario` daría una diferencia en el 100% de los productos —todos tienen IVA o envío— y el panel sería ruido puro. Confirmado contra la base: los 11 productos de Herramientas tienen hoy `costo_producto == costo_base` exacto, y **ninguno** tiene `costo_producto == costo_unitario`.

### Cómo se genera un movimiento con `costo_base` distinto del de la ficha

Dos caminos reales, y el criterio de detección **no distingue entre ellos** (pedido explícito del usuario):

1. **Recepción de pedido** — `PedidoServiceImpl.confirmarRecepcion()` llama `registrarMovimiento(producto, recibida, INGRESO, usuario, detalle.getCostoUnitarioPactado(), detalle.getMonedaLinea(), pedido.getCotizacionDolar())`. El `costoBaseExplicito` es el costo pactado de **esa línea**, que puede ser cualquier cosa distinta de la ficha. **Y no toca `costoProducto` ni `precio`** (Decisión 6). Este es el generador principal.
2. **Edición del producto** — `ProductoServiceImpl.actualizarProducto()` registra un movimiento cuando cambia stock, costo, descuentos, IVA propio o envío propio. Ese movimiento sale con `costoBase = producto.getCostoProducto()`, o sea que **inmediatamente después de editar, ficha y movimiento coinciden**. Por eso una edición manual "resuelve" la diferencia sola — y por eso la línea de base está hoy en cero.

Los movimientos de `EGRESO`/`VENTA` **copian** el desglose del último ingreso (`MovimientoStockServiceImpl`, rama `else`) y por eso quedan fuera del criterio: incluirlos no cambiaría el número, pero enturbiaría la definición de "el último ingreso real".

### Estado real de la base (`vivero-postgres` / `vivero_db`, 2026-08-21)

- **11** productos en Herramientas, **0** con diferencia hoy, **0** con `moneda_costo = 'USD'`.
- **0** movimientos con `fecha IS NULL` (relevante para el desempate del ordenamiento).
- La historia del producto `id=31` (ver `proposal.md`) es la prueba documentada de que la diferencia existió, duró 3 horas y se resolvió a mano.

### Restricciones del proyecto que condicionan el diseño

- **Regla dura 5** — DTOs siempre; nunca la entidad JPA en el endpoint.
- **Regla dura 6** — `Controller → Service → Repository`; el controller nunca llama al repositorio; sin `findAll()` sin límite.
- **Regla dura 7** — componentes en PascalCase, `cursor-pointer` en botones, `lucide-react`, feedback por `useUIStore` (nunca `alert`/`confirm`).
- **Regla dura 1** — no buildear sin pedido explícito. **Regla dura 2** — no commitear sin pedido explícito.
- `ddl-auto=update` crea columnas nuevas al arrancar; no se escriben `ALTER TABLE` a mano.

## Goals / Non-Goals

**Goals:**

- Que la desalineación entre la ficha y el último ingreso **se vea sola**, sin que el usuario tenga que acordarse de buscarla.
- Que el criterio de detección sea **enumerable y explicable**: el usuario tiene que poder mirar la lista y entender por qué está cada fila, y por qué no está cada producto que falta.
- Que "Actualizar" pase **exactamente por el mismo camino** que una edición manual en `ProductoForm.jsx` — mismo servicio, misma validación, mismo `MovimientoStock` resultante. Sin ruta paralela de escritura.
- Que el click no sea a ciegas: el precio resultante se ve **antes** de apretar.
- Que "Descartar" silencie **el ingreso ya revisado**, nunca los que lleguen después.
- Que el panel sea invisible e inocuo para Vivero.

**Non-Goals:**

- **No** se modifica `CostoCalculator` en ninguna línea. Contrato de no-regresión del change.
- **No** se reabre la Decisión 6 de `herramientas-pedidos-proveedores`: confirmar un pedido **sigue sin** actualizar `costoProducto`/`precio` por sí solo.
- **No** se toca la `@Formula` `Producto.costoUnitarioHistorico` (ver R2).
- **No** hay acción masiva ("actualizar todos"). El usuario pidió una decisión por producto, y una acción que mueve precios de venta en lote es una categoría de riesgo distinta.
- **No** se recalculan movimientos ya registrados ni ventas ya hechas.
- **No** se copian al producto los descuentos/IVA/envío congelados del movimiento (ver Decisión 6).
- **No** se agrega notificación, badge en el menú, email ni evento SSE. El panel se ve al entrar a Productos.

## Decisions

### Decisión 1 — El criterio es `costo_producto ≠ costo_base` del último `INGRESO`/`AJUSTE_INICIAL`, comparado en SQL

La consulta canónica, verificada contra la base real:

```sql
SELECT p.id, p.nombre, p.costo_producto, p.precio, p.porcentaje_ganancia, p.moneda_costo,
       pr.nombre AS proveedor_nombre,
       m.id AS movimiento_id, m.costo_base, m.costo_unitario,
       m.moneda_origen, m.cotizacion_aplicada, m.tipo_movimiento, m.fecha
FROM productos p
LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
JOIN LATERAL (
    SELECT ms.id, ms.costo_base, ms.costo_unitario, ms.moneda_origen,
           ms.cotizacion_aplicada, ms.tipo_movimiento, ms.fecha
    FROM movimientos_stock ms
    WHERE ms.producto_id = p.id
      AND ms.deleted = false
      AND ms.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL')
    ORDER BY ms.fecha DESC, ms.id DESC
    LIMIT 1
) m ON true
WHERE p.deleted = false
  AND p.unidad_negocio_id = :unidadId
  AND COALESCE(p.costo_producto, 0) <> COALESCE(m.costo_base, 0)
  AND (COALESCE(p.costo_producto, 0) > 0 OR COALESCE(m.costo_base, 0) > 0)
  AND (p.movimiento_revision_descartado_id IS NULL
       OR p.movimiento_revision_descartado_id <> m.id)
ORDER BY m.fecha DESC, p.nombre
LIMIT :limite
```

El último `AND` es el filtro del descarte (Decisión 11): oculta el producto **sólo** mientras el último ingreso siga siendo el que el usuario ya revisó.

Cuatro cosas deliberadas:

**(a) `JOIN LATERAL`, no subconsulta escalar correlacionada.** El panel necesita **cinco** columnas del mismo movimiento (`id`, `costo_base`, `moneda_origen`, `cotizacion_aplicada`, `fecha`). Con el patrón de subconsulta escalar que ya usan `sumarCostoInventario` y `findResumenPorProveedor` harían falta cinco subconsultas correlacionadas idénticas —cinco veces el mismo scan, y con riesgo real de que dos de ellas resuelvan a movimientos **distintos** ante un empate de `fecha`—. `LATERAL` garantiza que las cinco columnas vienen de **la misma fila**. Es PostgreSQL puro; el proyecto es PostgreSQL-only y ya usa `nativeQuery = true` en ese repositorio. `DISTINCT ON` sería equivalente y también válido; se elige `LATERAL` por ser más legible correlacionado a `p`.

**(b) `ORDER BY ms.fecha DESC, ms.id DESC` — el desempate es obligatorio.** `ProductoServiceImpl.crearProducto()` y `confirmarRecepcion()` generan movimientos dentro de la misma transacción, con `LocalDateTime.now()` resuelto con milisegundos: los movimientos 123 y 124 del producto 31 quedaron a **6 ms**. Sin desempate por `id`, "el último ingreso" es no determinístico. `findResumenPorProveedor` ya usa este mismo desempate; se copia tal cual. Ver R2 por la inconsistencia con la `@Formula`.

**(c) La comparación se hace en SQL, con `<>` sobre `numeric`.** `numeric` compara **por valor**, así que `15000.00 <> 15000.000` es falso. Hacerlo en Java con `BigDecimal.equals()` sería un bug silencioso (sensible a la escala); si algún día se re-verifica en Java, tiene que ser con `compareTo`, igual que el helper `bigDecimalChanged()` que ya existe en `ProductoServiceImpl`. **Sin tolerancia ni epsilon**: las dos columnas son `numeric(_,2)` producidas por el mismo redondeo `HALF_UP` de `CostoCalculator`; una diferencia de un centavo es una diferencia real y tiene que aparecer.

**(d) Los dos guardas de nulos/ceros.** `COALESCE(...) <> COALESCE(...)` hace que un producto con `costo_producto` NULL y un ingreso con costo real **sí aparezca** — es el caso más fuerte de "ficha desactualizada" (típicamente un producto nacido del flujo de "producto pendiente"). La segunda condición evita el falso positivo simétrico: si los dos lados son NULL o `0.00` (movimientos viejos con el default de la columna) no hay nada que revisar y la fila no se muestra. Y el `JOIN LATERAL` (no `LEFT JOIN`) excluye por construcción a los productos **sin ningún ingreso**: no hay contra qué comparar.

*Alternativa descartada:* comparar contra `costo_unitario` en vez de `costo_base`. Daría 11 filas de 11 en la base real —todos los productos tienen IVA o envío— y el panel dejaría de significar algo.

### Decisión 2 — El panel vive **dentro** de la sección Productos, no en el menú

Pedido explícito del usuario. Concretamente: una franja colapsable arriba de la grilla de `pages/Productos.jsx`, en un componente propio (regla dura 7: PascalCase), **renderizada sólo cuando `unidadNegocioActiva === '2'` y hay al menos una fila**. Cuando no hay diferencias, el panel **no ocupa espacio** — no se muestra un "todo al día" permanente que el usuario aprenda a ignorar. Dado que la línea de base arranca en 0 filas, ese estado vacío es **el estado normal del día 1**, no un caso de borde.

*Alternativa descartada:* una sección propia del menú lateral. El usuario la rechazó explícitamente: la revisión de costos es parte de mirar el catálogo, no un lugar aparte al que hay que ir.

### Decisión 3 — El backend calcula el precio resultante; el frontend no lo replica

Cada fila trae **`precioResultante`** ya calculado por el backend, con el mismo `CostoCalculator` y la misma aritmética de margen que `ProductoServiceImpl.calcularPrecioSiAplica()`: `costoFinal = CostoCalculator.calcular(costoBaseNuevo, descuentosDelProducto, ivaEfectivo, envioEfectivo).getCostoUnitario()`, y después `precio = costoFinal + costoFinal × porcentajeGanancia / 100`.

Existe `frontend/src/utils/costeo.js`, la réplica en JS que usa `ProductoForm.jsx` para el desglose en vivo. **No se usa acá.** El panel no es un formulario: no hay nada que el usuario tipee y que tenga que verse recalcular mientras tipea. Replicar el cálculo en el frontend sólo agregaría una quinta copia de la fórmula y una forma nueva de que el número previsualizado no coincida con el que el backend termina escribiendo. El requisito duro es que **el `precioResultante` que se muestra sea exactamente el que queda persistido después de apretar "Actualizar"** — y la única forma de garantizarlo es que salga del mismo código.

Consecuencia de borde, documentada a propósito: si `porcentajeGanancia` es null o `0`, o si el costo nuevo es `0`, `calcularPrecioSiAplica()` **no pisa el precio** (tiene ese guard desde la tanda de fixes del 2026-08-20). En ese caso `precioResultante` **es igual** al precio actual, y la fila tiene que mostrarlo así — no inventar un precio que no va a quedar.

Como el backend ya tiene que calcular el **costo unitario final** para llegar al `precioResultante`, ese valor se expone también en el DTO y la fila lo muestra como **línea secundaria** (`costo unitario actual → costo unitario resultante`), debajo del contraste de bases (resolución de la OQ2). Sale gratis y es la explicación de por qué el precio nuevo es el que es. Es puramente presentacional: si en la revisión se ve recargado, se recorta sin afectar a nada más.

### Decisión 4 — Productos en USD: se comparan en la moneda de la ficha, o no se comparan

`Producto.costoProducto` de un producto con `monedaCosto = USD` está expresado **en dólares** (el precio de lista del proveedor). `MovimientoStock.costoBase` está **siempre en pesos**: `CostoCalculator` lo devuelve ya convertido (`getCostoBaseConvertido()`, paso 0 de `config-costeo-por-proveedor`). Compararlos crudos es comparar `66.24` contra `96710.40`.

El daño no es sólo un falso positivo cosmético: si "Actualizar" escribiera `96710.40` en el `costoProducto` de un producto marcado como USD, el sistema volvería a multiplicarlo por la cotización en el siguiente cálculo. **Sería un error de dinero de tres órdenes de magnitud.** Regla:

- `monedaCosto` del producto es `ARS` (o null) → se compara `costo_producto` contra `costo_base` directo. **Es el 100% de los casos vivos hoy** (11 de 11).
- `monedaCosto = USD` **y** el movimiento tiene `moneda_origen = 'USD'` y `cotizacion_aplicada > 0` → el valor comparable es `costo_base / cotizacion_aplicada`, y es **ese** el valor que escribe "Actualizar". La fila muestra explícitamente la cotización usada, para que el usuario vea de dónde salió el número.
- `monedaCosto = USD` **y** el movimiento no registró conversión (`moneda_origen IS NULL`) → **los importes no son comparables** y el producto **queda fuera del panel**. Nunca se muestra una diferencia inventada ni se ofrece un botón que escribiría un número en la moneda equivocada. La tarea 3.6 deja este caso registrado en el log del servidor para que sea diagnosticable en vez de invisible.

*Alternativa descartada:* mostrar todo en pesos y escribir en pesos. Rompe la semántica de `monedaCosto` y produce exactamente el bug de la doble conversión.

### Decisión 5 — "Actualizar" reusa `PUT /api/productos/{id}`; no hay endpoint de escritura nuevo

El usuario pidió "mismo servicio/validación por detrás, no un endpoint paralelo". La forma más literal de cumplirlo: el frontend **ya tiene el objeto producto completo** en el estado de `Productos.jsx` (viene de `GET /api/productos`, que mapea cada campo). "Actualizar" toma ese objeto, reemplaza **sólo `costoProducto`** y hace el mismo `PUT /api/productos/{id}` que hace `ProductoForm.jsx` al guardar. El backend recalcula `precio` solo, dentro de `actualizarProducto()`.

De ahí salen gratis: la validación de `validarProducto()`, el `@PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")`, el registro del `MovimientoStock` de ajuste, el evento SSE de stock y el recálculo de precio. **Cero código de escritura nuevo, cero riesgo de que las dos rutas se desincronicen.**

El riesgo real de este atajo es el round-trip del DTO: `actualizarProducto()` pisa `ivaPorcentaje` y `costoEnvioPorcentaje` con lo que venga en el payload **incluido null**, a propósito. Si el objeto que manda el panel perdiera un campo, lo borraría. Por eso `tasks.md` incluye una verificación explícita (tarea 5.8): tomar un producto real, pasarlo por "Actualizar", y **diffear todas sus columnas** — sólo `costo_producto` y `precio` pueden haber cambiado.

*Alternativa descartada:* un `POST /api/productos/{id}/revision-costos/aplicar` en el backend. Es más "prolijo" a nivel API, pero obliga a reconstruir el `ProductoDTO` server-side y crea una segunda ruta de escritura de costo que hay que mantener alineada con la primera. Es exactamente lo que el usuario pidió evitar.

*Nota de alcance:* este es el único punto donde el change escribe. Si en la revisión se prefiere el endpoint dedicado, es un cambio acotado a `tasks.md` grupo 5 y no afecta a ningún otro grupo — pero la verificación 5.8 sigue siendo obligatoria en cualquiera de las dos formas.

### Decisión 6 — "Actualizar" copia **sólo** el costo base; nunca el desglose congelado

El movimiento tiene congelados también `descuento_porcentaje`, `iva_porcentaje`, `envio_porcentaje` y `descuento_detalle`. Es tentador copiarlos todos ("que la ficha quede igual a la compra"). **No.**

Los descuentos del producto son, por diseño, **condiciones estables** (Decisión 1 de `costeo-flexible-por-producto`). Los pactados en una línea de pedido son de **esa compra**: un descuento por volumen que se consiguió una vez, un IVA distinto negociado para ese lote. Copiarlos a la ficha convertiría una condición puntual en la condición permanente del producto, en silencio y de un click. El usuario pidió copiar **el costo**; el resto se edita a propósito desde `ProductoForm.jsx`, que es donde vive esa decisión.

Consecuencia visible y esperada: si el pedido pactó descuentos distintos de los de la ficha, después de "Actualizar" el `costo_base` coincide pero el `costo_unitario` del movimiento nuevo **no** será igual al del ingreso del pedido. Eso no es un bug: es la ficha aplicando sus propias condiciones estables sobre el costo nuevo. Es también el motivo de R1.

### Decisión 7 — "Actualizar" y "Descartar" son de un click, sin modal de confirmación

El usuario pidió "un click cada una". Se respeta, y se compensa con transparencia en vez de fricción:

- El `precioResultante` **está en la fila**, antes de apretar. La decisión se toma mirando el número, no en un modal que repite lo que ya estaba a la vista.
- Después de aplicar, un `pushToast('success', ...)` de `useUIStore` que dice **qué producto** y **de cuánto a cuánto** quedó el precio — no un "guardado" genérico.
- La acción es reversible por el camino normal (editar el producto), y no destruye nada: el histórico de movimientos es inmutable y las ventas ya hechas no se tocan.

Nada de `alert`/`confirm` nativos (regla dura 7). El `askConfirm` de `useUIStore` **se usa igual** ante el 403: si el usuario no tiene `ESCRIBIR_STOCK`, el `PUT` falla y se llama `denyAccess(...)`, el mismo patrón que ya usan `handleCreateOrUpdate` y `handleDelete` en `Productos.jsx`. No se ocultan los botones preventivamente: se sigue el patrón vigente de la página.

### Decisión 8 — El panel es sólo `LEER_STOCK`; la acción es `ESCRIBIR_STOCK`

El endpoint de lectura va con `@PreAuthorize("hasAuthority('LEER_STOCK')")`, igual que `GET /api/productos`. El `PUT` que hace "Actualizar" ya exige `ESCRIBIR_STOCK`. No se crean permisos nuevos: el panel no es una capacidad nueva del negocio, es otra vista del catálogo que el usuario ya puede leer y editar.

### Decisión 9 — Filtrado por unidad de negocio con el mecanismo vigente, sin excepción nueva

Backend: `UnidadNegocioContextHolder.getUnidadNegocioId()`, exactamente como `obtenerTodosLosProductos()`. Frontend: `unidadNegocioActiva === '2'` desde `useAuthStore`, exactamente como los tabs de proveedor y las columnas de costo de `Productos.jsx`. **No se agrega ningún chequeo nuevo de "es Herramientas" en el backend**: si algún día Vivero cargara costos, el panel funcionaría solo. El gate visual de Herramientas vive en el frontend, que es donde ya vive el resto del gate de la sección.

### Decisión 10 — El endpoint devuelve una lista acotada, ordenada por ingreso más reciente

`LIMIT` explícito en la query (regla dura 6: nada sin límite). Con 11 productos en Herramientas el límite no se roza ni de lejos; existe para que el panel no pueda degradarse si el catálogo crece. Orden: **el ingreso más reciente primero** — lo que acaba de llegar es lo que el jefe tiene fresco y lo que más probablemente quiera resolver. `nombre` como desempate para que el orden sea estable entre recargas.

**No se pagina.** Si alguna vez la lista supera el límite, es señal de un problema de proceso (dejaron de revisarse los costos durante meses), no de un problema de UI — y la franja debe decirlo explícitamente ("se muestran los N más recientes") en vez de fingir que ésa es toda la lista.

### Decisión 11 — "Descartar" persiste el `id` del movimiento ya revisado

**Decidida explícitamente por el usuario** (resolución de la OQ1, opción C), sobre las alternativas de no persistir nada o de persistir el par de costos. Mecanismo:

- Una sola columna nullable nueva: **`productos.movimiento_revision_descartado_id BIGINT`**, creada por `ddl-auto=update`. Sin FK declarada y sin valor por defecto: es un marcador de revisión, no una relación del dominio, y `null` significa "nunca se descartó nada".
- "Descartar" guarda ahí el `id` del `INGRESO`/`AJUSTE_INICIAL` que el usuario acaba de mirar — el mismo `m.id` que el panel le mostró en esa fila. Semántica literal: **"ya revisé este ingreso"**.
- La query de la Decisión 1 suma el `AND (p.movimiento_revision_descartado_id IS NULL OR p.movimiento_revision_descartado_id <> m.id)`. No hay ninguna otra lógica.

Por qué este mecanismo y no otro:

- **Un ingreso nuevo trae un `id` nuevo → la fila vuelve sola**, sin ninguna rutina de reapertura, sin comparar importes y sin ventana de tiempo. Es exactamente el requisito que fijó el usuario ("si después me llega otra compra, quiero que vuelva a aparecer").
- **Se auto-limpia.** Cuando el producto se edita —por el panel o a mano en `ProductoForm.jsx`— se genera un movimiento nuevo, el `id` guardado deja de ser el del último ingreso y el marcador queda **inerte**. No hace falta borrarlo ni mantener ninguna limpieza programada.
- **Superficie mínima:** una columna, un `AND`, un endpoint de escritura chico. La opción del par de costos (`costo_ficha_descartado` + `costo_base_descartado`) pedía dos columnas y una condición compuesta para el mismo resultado.
- **Reversible sin costo:** la columna es nullable y nada más la lee; quitar el change la deja huérfana e inofensiva.

**Consecuencia aceptada, decidida a sabiendas:** si llega un ingreso **nuevo al mismo costo que ya se había descartado**, la fila **reaparece**. El marcador identifica el ingreso revisado, no el importe. El usuario lo eligió así: llegó mercadería nueva, es razonable que el sistema vuelva a preguntar.

Descartar **no modifica ningún dato de negocio del producto**: ni el costo, ni el precio, ni los descuentos, ni el stock. Lo único que escribe es el marcador. Esa es la garantía que verifica la tarea 6.6.

## Risks / Trade-offs

**R1 — "Actualizar" mueve el costo con el que se van a registrar las ventas FUTURAS.** El `PUT` genera un `AJUSTE_INICIAL` nuevo que pasa a ser "el último ingreso", y por lo tanto cambia `Producto.costoUnitarioHistorico`, que es lo que `VentaServiceImpl:118` congela en cada venta nueva. Y como ese movimiento se calcula con **los descuentos/IVA/envío de la ficha** (Decisión 6), no con los del pedido, el costo final puede moverse bastante: el caso real del producto 31 pasó de `costo_unitario = 121855.10` (ingreso del pedido, con la conversión USD) a `101545.92` (ajuste manual) — **un 17% de diferencia**. → *Mitigación:* (a) es **exactamente** lo que ya pasa hoy cuando el jefe edita el producto a mano, este change no introduce el comportamiento, sólo lo hace de un click; (b) las ventas **ya registradas** no se ven afectadas — cada `VentaDetalle` congeló su propio costo al vender; (c) el checkpoint del grupo 4 muestra este caso concreto con números antes de cablear la acción; (d) la tarea 5.7 verifica el efecto sobre `costoUnitarioHistorico` en un producto real y lo deja registrado.

**R2 — La `@Formula` `costoUnitarioHistorico` y la query del panel pueden elegir movimientos distintos ante un empate exacto de `fecha`.** La `@Formula` de `Producto.java` ordena por `ORDER BY m.fecha DESC LIMIT 1`, **sin desempate por `id`**; el panel usa `fecha DESC, id DESC` (Decisión 1b). Con dos movimientos en el mismo instante exacto, el panel podría mostrar el `costo_base` de uno y `costoUnitarioHistorico` reflejar el otro. → *Mitigación:* no se toca la `@Formula` — es lectura financiera viva (Finanzas, ventas) y cambiarla está fuera del alcance declarado de un change de higiene de catálogo. En la base real **no hay ningún empate exacto** (los movimientos 123/124 del producto 31 difieren en 6 ms) y **0 movimientos con `fecha IS NULL`**. La tarea 1.5 verifica que sigue sin haberlos y, si aparecieran, el hallazgo se levanta como candidato a *chore* propio en `openspec/roadmap.md` (tarea 9.6) — no se arregla al pasar dentro de este change.

**R3 — El round-trip del DTO puede borrar campos del producto.** `actualizarProducto()` pisa `ivaPorcentaje`/`costoEnvioPorcentaje` con lo que venga, **incluido null**, y `reemplazarDescuentos()` **borra y reinserta** toda la lista de descuentos. Un payload incompleto vacía datos reales. → *Mitigación:* el payload se construye a partir del objeto que ya devolvió `GET /api/productos` (que mapea todos los campos, incluida la lista de descuentos), reemplazando **un solo** campo. Verificación obligatoria 5.8: diff columna por columna, incluida la tabla `producto_descuentos`.

**R4 — La lista arranca vacía y no hay datos para probar.** Los 11 productos coinciden hoy. → *Mitigación:* el grupo 1 de `tasks.md` **fabrica** el caso por el flujo real (confirmar un pedido a un costo distinto del de la ficha), que es reproducible, realista y deja rastro auditable. No se editan filas de la base a mano para simular la condición.

**R5 — Falsos positivos por movimientos viejos con `costo_base = 0.00`.** La columna tiene default `0.00`; un movimiento anterior a `costeo-flexible-por-producto` podría no tener base real. → *Mitigación:* el guard `(costo_producto > 0 OR costo_base > 0)` de la Decisión 1d, más la tarea 1.4 que cuenta cuántos movimientos de Herramientas tienen `costo_base = 0` antes de escribir la query.

**R6 — Colisión de specs con `config-costeo-por-proveedor`, todavía sin archivar.** Los dos changes tienen deltas sobre `frontend-productos`. → *Mitigación:* el delta de este change **sólo agrega** requisitos con nombres nuevos; el del otro renombra `Filtrado por Marca en Herramientas`. Se aplican en cualquier orden. La tarea 1.1 lo verifica antes de escribir nada.

**R7 — El panel se vuelve ruido si "Descartar" no persiste nada.** Si cada visita a Productos vuelve a mostrar las mismas diferencias ya descartadas, el usuario aprende a ignorar la franja y el change pierde su propósito. → *Mitigación:* resuelto por la **Decisión 11** (OQ1, decidida por el usuario): el descarte persiste el `id` del ingreso revisado, así que la fila queda oculta hasta que llegue un ingreso **nuevo**. La tarea 6.5 verifica las dos mitades del requisito: sigue oculta al recargar, y vuelve a aparecer tras confirmar un pedido nuevo.

**R8 — El marcador de descarte puede quedar apuntando a un movimiento borrado.** `MovimientoStock` tiene borrado lógico (`deleted`). Si el movimiento descartado se marca como borrado, la query pasa a elegir el ingreso anterior, cuyo `id` no coincide con el marcador, y la fila **reaparece**. → *Mitigación:* ninguna necesaria — ése es el comportamiento correcto (cambió cuál es "el último ingreso", hay algo nuevo que revisar). Se documenta acá para que no se interprete como un bug ni se agregue una FK con `ON DELETE` que complique el modelo. La columna deliberadamente **no** declara FK (Decisión 11).

## Migration Plan

- **Sin migración de datos.** Ninguna fila existente se modifica al desplegar.
- **Una** columna nullable nueva: `productos.movimiento_revision_descartado_id BIGINT` (Decisión 11), creada por `ddl-auto=update` al arrancar el backend — sin `ALTER TABLE` a mano, mismo criterio que los dos changes anteriores. Sin backfill: `null` en las 16 filas existentes significa "nunca se descartó nada", que es exactamente el estado de partida correcto.
- **Rollback:** quitar el componente del render de `Productos.jsx` deja el sistema exactamente como está hoy. El endpoint de lectura no tiene efectos. La columna del descarte queda huérfana y nullable — inofensiva, y sin FK que arrastre nada.
- **Orden de despliegue:** irrelevante. El frontend degrada solo (panel oculto) si el endpoint todavía no existe.


## Open Questions — resueltas

Las 4 preguntas que abrió este diseño están **cerradas**. Se deja el registro de qué se preguntó, qué se recomendaba y qué se decidió, para que la implementación no las reabra ni las trate como abiertas. **La OQ1 —la única genuinamente abierta— la decidió el usuario explícitamente**; las otras tres quedaron por la recomendación documentada, sin objeción, mismo criterio que el resto de los changes de este repo.

**OQ1 — ¿"Descartar" persiste algo, y qué exactamente?**
*Contexto:* el requisito de comportamiento ya estaba fijado por el usuario y nunca estuvo en discusión —descartar silencia **esta** diferencia, y un ingreso **nuevo** la reabre—. Lo que faltaba era el mecanismo. Se le presentaron tres opciones: **(A)** no persistir nada, sólo estado de React; **(B)** persistir el par de costos descartado en dos columnas; **(C)** persistir el `id` del movimiento ya revisado en una sola columna nullable.
*Recomendación original:* **opción C.**
✅ **RESUELTA — decidida por el usuario: OPCIÓN C, persistir el `id` del movimiento revisado.** Una sola columna nullable `productos.movimiento_revision_descartado_id`, creada por `ddl-auto=update`. "Descartar" guarda ahí el `id` del `INGRESO`/`AJUSTE_INICIAL` que el usuario acaba de mirar, y la query suma `AND (p.movimiento_revision_descartado_id IS NULL OR p.movimiento_revision_descartado_id <> m.id)`. Ver **Decisión 11**.
Consecuencias que el usuario aceptó a sabiendas al elegirla:
- si llega un ingreso **nuevo al mismo costo ya descartado**, la fila **vuelve a aparecer** (el marcador identifica el ingreso, no el importe). La opción B la habría mantenido oculta; se descartó a propósito: llegó mercadería nueva, es razonable que el sistema vuelva a preguntar;
- el marcador **se auto-limpia**: al editar el producto se genera un movimiento nuevo, el `id` guardado deja de ser el del último ingreso y el marcador queda inerte. No hay rutina de limpieza.
Las opciones A y B quedan **descartadas**: ninguna tarea debe implementar el descarte como estado local de React ni como par de columnas de costo.

**OQ2 — ¿La fila debería mostrar también el costo unitario final, no sólo el costo base?**
*Contexto:* el usuario pidió "costo de la ficha vs. costo del último ingreso", que son las dos **bases** (Decisión 1). Pero el número que mueve el margen es el costo **final**, y por la Decisión 6 el final resultante puede no coincidir con el del ingreso del pedido — el caso del producto 31 se movió un 17%.
*Recomendación original:* **sí, como línea secundaria** de la fila, debajo del contraste de bases.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. La fila muestra `costo unitario actual → costo unitario resultante` en tipografía más chica, debajo del contraste de bases (Decisión 3). Sale gratis —el backend ya calcula ese valor para obtener `precioResultante`— y es la explicación de por qué el precio nuevo es el que es. Es puramente presentacional: si en la revisión se ve recargado se recorta, y no afecta a ninguna otra tarea.

**OQ3 — ¿Se arregla el desempate faltante de la `@Formula` `costoUnitarioHistorico` (R2)?**
*Contexto:* la `@Formula` de `Producto.java` ordena por `fecha DESC` **sin** `id DESC`, frente al `fecha DESC, id DESC` que usan `findResumenPorProveedor` y la query de este panel (Decisión 1b).
*Recomendación original:* **no, en este change.**
✅ **RESUELTA por la recomendación**, sin objeción del usuario. La inconsistencia es real pero hoy **inofensiva** (0 empates exactos de `fecha` y 0 `fecha` nulas en la base, verificado el 2026-08-21), y esa `@Formula` es lectura financiera viva —la leen Finanzas y cada venta—: tocarla convertiría un change de higiene de catálogo (gobernanza MEDIA) en uno que mueve números de dinero (MEDIA-ALTA). Se anota como candidato a *chore* propio en `openspec/roadmap.md` (tarea 9.6) y se deja documentado en el comentario de la query del panel por qué ahí el desempate sí está (tarea 3.2). **Ninguna tarea de este change puede modificar esa `@Formula`** — sigue siendo un Non-Goal explícito.

**OQ4 — ¿Qué pasa si el usuario tiene `LEER_STOCK` pero no `ESCRIBIR_STOCK`?**
*Contexto:* el caso existe — verificado en la base el 2026-08-21, el rol **`EMPLEADO VIVERO`** tiene `LEER_STOCK` y no `ESCRIBIR_STOCK` (los otros seis roles tienen los dos). Es un rol de Vivero, así que en la práctica no vería el panel de todos modos (es Herramientas-only, Decisión 9), pero no es hipotético.
*Recomendación original:* que **vea el panel y los botones**, y que al apretar reciba el 403 manejado con `denyAccess(...)` de `useUIStore`.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. Es exactamente el patrón que ya usan `handleCreateOrUpdate` y `handleDelete` en `Productos.jsx` para Editar y Eliminar. **No se ocultan los botones preventivamente**: introducir un gating distinto del que la página ya tiene, para un rol que además no llega a ver la sección, sería incoherencia sin beneficio. Ver Decisión 7 y tarea 8.8.
