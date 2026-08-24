> ⚠️ **El nombre interno de este change sigue siendo `costeo-fifo-herramientas` por continuidad con el resto de esta sesión, pero el algoritmo final NO es FIFO — es "máximo entre las capas activas".** El directorio no se renombra por practicidad. La capability nueva sí se llama `costeo-por-capas`, y el flag técnico `costeoPorCapasHabilitado`. Si en algún artefacto aparece la palabra "FIFO" refiriéndose al costo, es un residuo y hay que corregirlo. FIFO sobrevive **sólo** como orden de descuento de cantidades (qué capa pierde unidades), nunca como fuente del costo.
>
> 🔁 **Corrección post-checkpoint del 2026-08-21.** Este documento fue reescrito. El diseño original era FIFO puro; el usuario aclaró el requisito real durante el checkpoint del grupo 3, después de ver un ejemplo concreto. El registro completo del cambio está en el encabezado de `design.md`. **El checkpoint sigue abierto: la tarea 3.7 no está marcada y no se escribió ni una línea de código.**

## Why

El jefe lo dijo así:

> "El jefe quiere que si el costo de los productos del pedido aumenta entonces se actualice pero si el costo bajó y ellos anteriormente se habían stockeado más caro entonces que mantenga el costo del más caro osea del stock anterior."

Y cuando se le preguntó por el caso concreto —*comprás a $100, después comprás a $150, la de $100 sigue en el depósito, ¿qué costo se muestra?*— lo precisó todavía más:

> "El jefe quiere que en la ficha siempre se muestre el costo más alto, ya sea nuevo o el viejo."

Confirmó además que eso vale **también para el costo real que se usa al calcular la ganancia de cada venta**, no sólo para el número que se ve en la ficha del producto.

Traducido a una regla implementable: **el costo de referencia de un producto tiene que ser el más alto entre los que efectivamente pagó por la mercadería que todavía tiene en el depósito** — sin importar el orden en que la compró ni cuál va a vender primero. Y cuando la compra más cara se agote del todo, el número tiene que **recalcularse sobre lo que quede**, no quedarse pegado a un costo que ya no corresponde a ninguna unidad en stock.

Hoy el sistema hace casi lo contrario, y no es una hipótesis: **es lo que muestra la base real de Herramientas ahora mismo** (`vivero-postgres` / `vivero_db`, verificada el 2026-08-21).

`Producto.costoUnitarioHistorico` es una `@Formula` de Hibernate que devuelve el `costo_unitario` del **último** `MovimientoStock` de tipo `INGRESO`/`AJUSTE_INICIAL` por fecha. "El último", no "el que corresponde a la mercadería que tengo". Los casos más claros, sobre productos reales:

| Producto | Stock hoy | Costo de referencia **hoy** | Lo que realmente tiene en el depósito | Costo bajo la **regla nueva** |
|---|---|---|---|---|
| `id=1` **Pala corazón** | 6 u. | **$15.561,00** | 5 u. a $22.822,80 (mov. 67) + 1 u. a $15.561,00 (mov. 104) | **$22.822,80** (+46,7%) |
| `id=3` **Pala pocera** | 6 u. | **$20.790,00** | 1 u. a $21.780,00 (mov. 5) + 5 u. a $25.987,50 (mov. 66) | **$25.987,50** (+25,0%) |
| `id=31` **Taladro SHIMURA** | 1 u. | **$101.545,92** | 1 u. a $121.855,10 (mov. 124) | **$121.855,10** (+20,0%) |
| `id=5` **Cinta métrica** | 4 u. | **$5.197,50** | 2 u. a $5.940,00 (mov. 9) + 2 u. a $5.250,00 (mov. 92) | **$5.940,00** (+14,3%) |

El caso de `Pala corazón` es literalmente el que describió el jefe: compró caro el 19/08, compró barato el 20/08, y el sistema **se olvidó de las 5 unidades caras** que todavía están sin vender.

El caso de `Pala pocera` es el que separa la regla que pidió de FIFO, y es el que hay que mostrarle: tiene **dos capas activas a la vez** —1 unidad vieja a $21.780,00 sin vender y 5 unidades nuevas a $25.987,50—. **FIFO puro mostraría $21.780,00** (la más vieja, +4,8%). **La regla que pidió muestra $25.987,50** (la más cara, +25,0%). Es la diferencia concreta entre lo que se había aprobado en un primer momento y lo que efectivamente quiere.

### Los costos fantasma

`Pala pocera` arrastra además un segundo defecto que aparece en la misma consulta: su costo de referencia de hoy, **$20.790,00**, es un valor que **ninguna unidad en stock costó jamás**. Sale del movimiento 97, un `AJUSTE_INICIAL` de **cantidad 0** — uno de los que el sistema registra cuando se edita la configuración de costo de un producto sin mover una sola unidad.

**Verificado el 2026-08-21: hay 5 costos fantasma, no 2** (la versión anterior de este documento decía dos; era incorrecto).

| id | Producto | Reporta hoy | Movimiento qty 0 | Lo que costaron de verdad las unidades en stock |
|---|---|---|---|---|
| 2 | Pala ancha | $23.157,89 | mov. 96 | 2 u. a $22.055,14 |
| 3 | Pala pocera | $20.790,00 | mov. 97 | 1 u. a $21.780,00 + 5 u. a $25.987,50 |
| 4 | Cinta aisladora | $2.083,20 | mov. 98 | 5 u. a $2.281,60 |
| 5 | Cinta métrica | $5.197,50 | mov. 103 | 2 u. a $5.940,00 + 2 u. a $5.250,00 |
| 31 | Taladro SHIMURA | $101.545,92 | mov. 138 | 1 u. a $121.855,10 |

En Herramientas hay **34 movimientos de cantidad 0 sobre 42 `AJUSTE_INICIAL`**: la mayoría del "historial de ingresos" no es mercadería, es tipeo, y hoy cualquiera de esos tipeos puede pisar el costo de referencia de mercadería real. **8 de los 11 productos vivos** toman hoy su costo de uno de ellos.

> ⚠️ **Nota de línea de base (2026-08-21).** La primera medición de este change se tomó con la base **contaminada por 2 movimientos de prueba** fabricados para `revision-costos-productos` (tareas 1.6/1.7 de *ese* change): `mov_id=141` (`INGRESO` de 10 u. a `id=5 Cinta métrica`) y `mov_id=142` (`INGRESO` de 2 u. a `id=1 Pala corazón`). Se revirtieron y **todos los números de este documento, de `design.md` y de `tasks.md` fueron re-medidos contra la base ya limpia**. Los valores obsoletos (56 unidades en stock, 18 capas, `id=5` en $6.444,90, `id=1` con 8 u.) no deben usarse.

**Por qué ahora:** los tres changes de costeo de esta serie —`costeo-flexible-por-producto` (archivado), `herramientas-pedidos-proveedores` (archivado) y `config-costeo-por-proveedor` (implementado, sin archivar)— ya construyeron el motor que calcula **cuánto sale una compra**. Lo que falta no es la fórmula: es **la memoria**. El sistema sabe calcular el costo de cada compra y lo congela perfecto en su `MovimientoStock`, pero después sólo se acuerda del último. Este change le agrega la memoria de qué mercadería sigue estando y qué le costó.

## What Changes

- **El costo de referencia de un producto de Herramientas pasa a ser el MÁXIMO entre sus capas de costo activas.** Cada ingreso de mercadería con unidades deja una **capa de costo** propia: su cantidad original, su cantidad restante y el costo congelado de esa compra. El costo de referencia es el mayor `costoUnitario` entre las capas que todavía tienen unidades. No depende del orden de compra. Una compra nueva más cara lo eleva **de inmediato**; una compra vieja más cara lo sostiene **mientras le quede una unidad**; y cuando la más cara se agota **del todo**, se recalcula sobre lo que quede.

- **Ese mismo número es el costo real de cada venta.** No sólo el que se ve en la ficha: es el que se congela en el `VentaDetalle` y el que alimenta el margen y el COGS de Finanzas. **Toda una venta usa un único costo**, cualquiera sea de qué capa(s) se descuenten físicamente sus unidades.

- **El descuento de CANTIDADES sigue el orden más viejo primero**, mismo criterio de siempre. Es lo único que sobrevive de FIFO, y gobierna únicamente qué capa pierde unidades — **no** de dónde sale el costo. Las dos cosas son independientes y así queda escrito en el diseño.

- **BREAKING (de comportamiento, no de API): el costo de referencia de 6 de los 11 productos de Herramientas cambia de valor el día que este change se activa.** No es un efecto secundario: es el objetivo. Ningún endpoint cambia de forma ni de contrato; lo que cambia es **el número que devuelven**.

- **BREAKING: un cambio de configuración de costo deja de mover el costo de la mercadería ya stockeada.** Hoy, editar el IVA / los descuentos / el costo de catálogo de un producto genera un movimiento de cantidad 0 que **reescribe el costo de referencia** de unidades ya compradas y pagadas a otro precio — el mecanismo que produce los 5 costos fantasma. Bajo capas, esos movimientos se siguen registrando exactamente igual (la traza no se toca) pero **no crean capa y no alteran ninguna capa existente**: cambian el costo de la **próxima** compra, que es lo único que un cambio de configuración puede cambiar de verdad.

- **⚠️ La regla es conservadora a propósito y puede sobrestimar el costo real de lo que se vende primero.** Cuando un producto tiene capas de costos distintos, cada unidad vendida se carga al costo más caro, incluidas las que salieron de la capa barata. Cuantificado sobre la base real: si hoy se vendiera todo el stock de Herramientas, el COGS reportado sería **$3.025.585,50** contra un costo de adquisición real de **$3.012.736,20** — **+$12.849,30 (+0,43%)**. Bajo FIFO la diferencia sería cero. **El usuario tiene que aceptar esta consecuencia explícitamente antes de que se escriba código** (tarea 3.8): no se da por sentada.

- **Las capas son una entidad nueva, `CapaCostoStock`, ligada al movimiento de ingreso que las originó** (Decisión 1, decidida por el usuario y **no afectada** por la corrección del algoritmo). Lleva la FK a ese `MovimientoStock` —donde el desglose completo de la compra ya vive congelado, sin duplicarse— más `cantidadOriginal`, `cantidadRestante` (**su único campo mutable**) y `costoUnitario` como único dato denormalizado. **`MovimientoStock` no cambia de naturaleza: sigue siendo un log estrictamente inmutable, sin un solo `UPDATE`.**

- **Un egreso genera UN SOLO `MovimientoStock`, como hoy.** Con la cantidad total y con el costo (y el desglose completo) de la **capa de referencia** — la activa más cara —, evaluada **antes** de descontar las cantidades. No se parte el egreso por capa, no se promedia nada, y `VentaDetalle` **no gana ninguna columna**. Es una simplificación deliberada respecto del diseño anterior, no una omisión (el registro completo está en la sección *Lo que esta corrección simplifica* de `design.md`).

- **Se migra el stock existente de Herramientas creando sus capas reales por replay del historial.** Verificado sobre la base real: **el libro de movimientos reconcilia exactamente con el stock actual en los 11 productos vivos**, el saldo corrido nunca se va a negativo y no hay dos movimientos con la misma `fecha` dentro de un producto. Las capas reales **se reconstruyen**, no se aproximan (Decisión 3). La capa de apertura plana queda **sólo como fallback por producto**, informado por nombre. La ejecución conserva **checkpoint propio y bloqueante** antes de tocar la base real.

- **La `@Formula` "último movimiento" pasa a ser `COALESCE(MAX(costo de las capas activas), la expresión de hoy sin tocar un carácter)`.** Sin reintroducir el N+1 del listado de productos que ya se resolvió con `@BatchSize` (Decisión 5).

- **Alcance: sólo Herramientas.** Vivero no crea capas, no consulta capas y no ejecuta una sola línea de código nueva — no por una rama `if (esHerramientas)`, sino por construcción (Decisión 7, flag `costeoPorCapasHabilitado`).

- **Fuera de alcance, explícito:** no se implementa FIFO; no se toca la fórmula del `CostoCalculator` **en ninguna línea**; no se reabre ninguna de las 14 decisiones de `costeo-flexible-por-producto` ni las 11 de `config-costeo-por-proveedor`; no se recalcula ni se modifica **ninguna venta ya hecha**; no se cambia el precio de venta ni `costoProducto` de ningún producto; no se implementa LIFO, costo promedio ponderado móvil ni ningún otro método de valuación; no se agrega valuación de inventario contable ni informe de existencias valorizadas (sería un change aparte, y ver el Riesgo R3 sobre por qué este dato **no** sirve para eso); no se toca Vivero, ventas de Vivero, cheques, cuentas corrientes, bandejas ni siembras; no se archiva ni se modifica `config-costeo-por-proveedor` (91/99) ni `revision-costos-productos` (20/61).

> ✅ **Estado de las decisiones (2026-08-21).** La **Decisión 1** (modelo de datos de las capas) fue decidida por el usuario y **no cambió**: entidad nueva `CapaCostoStock` ligada al movimiento de ingreso. La **Decisión 2 fue corregida post-checkpoint**: pasa de "FIFO puro + registro del costo mixto" a **"el costo de referencia es el máximo entre las capas activas"**, y se le agregó la **Decisión 2b** (el consumo de cantidades sigue el orden más viejo primero, pero el costo no depende de eso). Las Decisiones 3 a 7 quedaron por la recomendación documentada, sin objeción. **Ninguna decisión de diseño sigue abierta**; el detalle completo está en la sección *Open Questions — resueltas* de `design.md`. Lo que **sí** sigue pendiente y es bloqueante son las **tres aprobaciones del usuario**: el checkpoint de mecánica corregido (3.7), la aceptación explícita de la consecuencia conservadora (3.8) y la aprobación del replay en seco (7.7).

## Capabilities

### New Capabilities

- `costeo-por-capas`: la capacidad de **recordar, por producto, qué mercadería sigue en stock y cuánto costó cada tanda**, y de derivar de ahí un costo de referencia. Cubre qué es una capa de costo y cuándo nace; qué operaciones la descuentan y en qué orden; **cómo se determina el costo de referencia de un producto en cualquier momento (el máximo entre las capas activas)**; qué costo se congela en un egreso; qué pasa cuando no queda ninguna capa activa y cuando un producto nunca tuvo capas; qué efecto tiene —y cuál explícitamente no tiene— un cambio de configuración de costo sobre las capas ya existentes; y cómo se inicializan las capas de la mercadería que ya estaba en el depósito. Hoy no existe ninguna spec sobre esto: `costeo-productos` define **cómo se calcula** el costo de una compra, y `movimientos-stock` define **qué se congela** en cada movimiento — ninguna de las dos dice **de qué mercadería sale el costo de una salida**.

  > La capability se llamaba `costeo-fifo` en la versión anterior de este documento. Se renombró el 2026-08-21 junto con la corrección del algoritmo: el nombre `costeo-fifo` describía algo que el change ya no hace, y es un nombre que queda **permanente** en `openspec/specs/` al archivar.

### Modified Capabilities

- `movimientos-stock`: cambia el requisito que hoy define de dónde toma su costo un movimiento de egreso. La spec actual dice, para todo egreso, que se copia el desglose del último ingreso; bajo capas ese requisito pasa a ser el desglose de la **capa de referencia** (la activa más cara), evaluada **antes** de descontar cantidades. Se refuerza además, explícitamente, que **un egreso produce un solo movimiento** cualquiera sea el número de capas de las que se descuentan sus unidades. Se modifica también la parte del requisito "Movimiento por Cambio en la Configuración de Costo" que hoy garantiza que ese movimiento **actualiza el costo histórico del producto**: bajo capas deja de hacerlo para el stock existente.
- `costeo-productos`: se agrega el requisito que define **qué es el costo de referencia de un producto** bajo capas y cómo se resuelve. La fórmula de cálculo (los cinco requisitos existentes sobre componentes, orden, redondeo, definición única y defaults de la unidad) **no se toca en ningún punto**: se sigue aplicando idéntica para calcular el costo de cada capa nueva.
- `ventas-core`: **la correspondencia uno-a-uno entre línea de venta, detalle persistido y movimiento de stock se mantiene y se refuerza explícitamente en la spec** — deja de ser un supuesto implícito y pasa a ser un requisito escrito, para que ninguna implementación futura la erosione. Lo que se modifica es de dónde sale el costo unitario congelado en esa única línea: el costo de referencia del producto al momento de la venta.

## Impact

**Nivel de gobernanza: CRÍTICA.** Es el nivel más alto de todo el proyecto, un escalón por encima de los tres changes de costeo anteriores (`costeo-flexible-por-producto` y `config-costeo-por-proveedor`, MEDIA-ALTA; `revision-costos-productos`, MEDIA). La razón: aquéllos definían **cómo se calcula el costo de una compra**, un número que el usuario puede verificar contra la factura del proveedor. Éste redefine **de qué mercadería sale el costo de cada venta futura de Herramientas**, que es el denominador del margen de todo el negocio, y lo hace sobre un dato —qué unidades siguen en el depósito— que el usuario **no tiene forma de auditar a mano**.

Consecuencias concretas de esa clasificación, todas reflejadas en `tasks.md`:

1. **Checkpoint bloqueante antes de tocar `MovimientoStockServiceImpl` o el modelo de capas** (grupo 3), con la mecánica exacta —qué capa da el costo, qué capa pierde unidades, qué costo queda— corrida y mostrada **sobre los productos reales de la línea de base**, no sobre ejemplos inventados. ✅ **Cerrada el 2026-08-21** (tareas 3.7 y 3.8, el usuario confirmó ambas explícitamente).
2. **Checkpoint bloqueante y separado para la ejecución de la migración** (grupo 7), antes de escribir una sola fila en la base real. Es la parte irreversible. ✅ **Cerrada el 2026-08-21 — resuelta de forma distinta a la prevista**: el usuario no aprobó una tabla de replay, decidió **borrar** el historial de prueba de Herramientas (21 productos y todo lo conectado a ellos) en vez de migrarlo. `capas_costo_stock` arranca vacía. Ver el detalle completo en la tarea 7.7 de `tasks.md`.
3. **La Decisión 1 no se implementó por recomendación** (grupo 2): se le presentó al usuario con sus trade-offs y la decidió explícitamente el **2026-08-21**. **Puerta cerrada.** La **Decisión 2** también se decidió ese día, pero **fue corregida el mismo día** por aclaración del usuario durante el checkpoint del grupo 3: el requisito real no era FIFO.

**Código afectado (backend):**

- `models/MovimientoStock.java` — **queda intacto** (Decisión 1): no gana `cantidadRestante` ni ninguna columna mutable, y sigue siendo un log append-only sin `UPDATE`. Se le suma una entidad hermana.
- `models/CapaCostoStock.java` *(nuevo)* — `producto`, `movimiento` (FK al `MovimientoStock` de ingreso que la originó), `unidadNegocio`, `cantidadOriginal`, `cantidadRestante` (único campo mutable), `costoUnitario` (única denormalización) y `fecha`. **Sin duplicar el desglose de costo del movimiento.**
- `repositories/CapaCostoStockRepository.java` *(nuevo)* — capas activas de un producto ordenadas `(fecha ASC, id ASC)` para el descuento de cantidades, la **capa de referencia** (activa de mayor `costoUnitario`, desempate por `fecha ASC, id ASC`), y existencia de capas por producto (idempotencia de la migración). Sin `findAll()` sin límite.
- `models/UnidadNegocio.java` — gana `costeoPorCapasHabilitado` (boolean, default `false`; `true` sólo para Herramientas). Decisión 7.
- `services/impl/MovimientoStockServiceImpl.java` — **el archivo más sensible del change**, y el **único** con lógica nueva de peso. Su rama de egresos (líneas 67-85: buscar el último ingreso y copiar su desglose) es lo que se reemplaza por "capa de referencia". Su rama de ingresos (líneas 59-66) suma la creación de la capa. **La firma pública no cambia**: sigue devolviendo un `MovimientoStock`.
- `models/Producto.java` — la `@Formula` `costoUnitarioHistorico` (línea 100) deja de ser "último movimiento" y pasa a `COALESCE(MAX(capas activas), la de hoy)`. Decisión 5.
- `services/impl/ProductoServiceImpl.java` — línea 131 (alta: `AJUSTE_INICIAL` con el stock inicial) y línea 218 (edición: `INGRESO`/`EGRESO`/`AJUSTE_INICIAL` según el signo del delta, **incluido el `AJUSTE_INICIAL` de cantidad 0** que hoy pisa el costo de referencia y bajo capas dejará de hacerlo). **Sin cambios de código previstos**: el comportamiento nuevo viene de `MovimientoStockServiceImpl`.
- `services/impl/PedidoServiceImpl.java` — línea 318. **Cero cambios** (Decisión 6): su `git diff` tiene que quedar vacío.
- `repositories/MovimientoStockRepository.java` — `findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc` deja de ser la consulta que resuelve el costo de un egreso **en Herramientas**, pero **sigue siendo la que lo resuelve en Vivero** y en cualquier producto sin capas activas. No se borra.
- `config/DataInitializer.java` — línea 146, el `AJUSTE_INICIAL` de siembra.
- `services/CostoCalculator.java` — **no se modifica.**

**Archivos que el diseño anterior (FIFO) tocaba y este ya NO toca** — todos por la simplificación de la Decisión 2 corregida:

- `models/VentaDetalle.java` — **sin columnas nuevas**. `costoTotalHistorico` y `costoDetalleHistorico` **desaparecen del diseño**: con un único costo por línea, `cantidad × costoUnitarioHistorico` **es** el total exacto.
- `services/impl/VentaServiceImpl.java` — **sin cambios**. `detalle.setCostoUnitarioHistorico(mov.getCostoUnitario())` ya hace lo correcto: el movimiento trae el costo de la capa de referencia.
- `repositories/VentaDetalleRepository.java` — `sumarCostoMercaderiaVendida` **no se toca**: sigue siendo `SUM(cantidad * costoUnitarioHistorico)`.
- `services/impl/FinanzasServiceImpl.java` — **sin cambios**. `listarDetalleCogs()` sigue devolviendo una fila por `VentaDetalle`, y no hay campo nuevo que exponer.

**Frontend afectado:** ninguno con cambios previstos. `pages/Productos.jsx` muestra el costo nuevo sin tocar una línea (viene del mismo campo del DTO) y `pages/Finanzas.jsx` tampoco cambia (no hay campo nuevo). `utils/costeo.js` no se toca (es el espejo de `CostoCalculator`). El grupo 11 de `tasks.md` es **verificación, no implementación**: si algún archivo de frontend necesita cambiar, es señal de que el backend rompió un contrato.

**Base de datos:** la tabla nueva `capas_costo_stock` con **dos** índices —`(producto_id, cantidad_restante, costo_unitario)` para la `@Formula` del costo de referencia y `(producto_id, cantidad_restante, fecha, id)` para el descuento de cantidades— y la columna `unidades_negocio.costeo_por_capas_habilitado` (default `false`). **`venta_detalles` no cambia.** Con `ddl-auto=update` el esquema se crea solo. **El poblado de las capas no se ejecutó**: el checkpoint del grupo 7 se resolvió borrando el historial de prueba de Herramientas en vez de migrarlo (ver más abajo), así que `capas_costo_stock` arranca **completamente vacía** — las capas se crean orgánicamente a partir de acá, con cada pedido y cada venta real.

**Línea de base real, verificada (`vivero-postgres` / `vivero_db`, 2026-08-21 — base limpia):**

| Dato | Valor verificado |
|---|---|
| Productos vivos de **Herramientas** (`unidad_negocio_id=2`) | **11** |
| Productos de **Vivero** (fuera de alcance) | 5 |
| Unidades totales en stock en Herramientas | **44** |
| Movimientos de Herramientas: `INGRESO` | **17 filas / 51 u.** |
| Movimientos de Herramientas: `AJUSTE_INICIAL` | 42 filas / 30 u. — **34 de ellas con `cantidad = 0`** |
| Movimientos de Herramientas: `VENTA` | 10 filas / 14 u. |
| Movimientos de Herramientas: `EGRESO` | 2 filas / 2 u. |
| Ingresos **con unidades** (= capas reconstruibles del historial) | **15**, repartidos en los 11 productos (máx. **3** en un mismo producto, `id=1`) |
| Capas que quedan **activas** tras el replay | **13** (`id=6` queda sin ninguna: stock 0) |
| Productos con **más de una capa activa** | **3** (`id=1`, `id=3`, `id=5`) — los únicos donde el máximo puede diferir de la capa más vieja |
| Costos fantasma visibles hoy | **5** (`id=2`, `id=3`, `id=4`, `id=5`, `id=31`) |
| Productos cuyo costo de hoy sale de un movimiento de cantidad 0 | **8** de 11 |
| ¿El libro reconcilia con el stock actual? | **Sí, exactamente, en los 11 productos** |
| ¿El saldo corrido se va a negativo en algún punto? | **No, en ningún producto** — el replay es viable |
| Movimientos con `fecha` duplicada dentro de un producto | **0** |
| Movimientos soft-deleted en Herramientas | **0** |
| Ingresos con unidades y `costo_base` en `NULL` | **2** (anteriores a `costeo-flexible-por-producto`; ambos **sí** tienen `costo_unitario`) |

> 🔁 **Esta línea de base ya no existe (2026-08-21, más tarde el mismo día).** La tabla de arriba documenta el estado real que se usó para diseñar y calibrar el algoritmo (grupos 1 a 3 de `tasks.md`), pero en el checkpoint del grupo 7 el usuario decidió **borrar** estos 11 productos —junto con 10 productos de prueba adicionales encontrados en el reconocimiento, sus movimientos, pedidos, ventas y todo lo conectado a ellas— en vez de migrarlos hacia `capas_costo_stock`. Hoy `unidad_negocio_id=2` tiene **0** productos y `capas_costo_stock` está **vacía**. Ver la evidencia completa del borrado en la tarea 7.7 de `tasks.md`. La tabla se conserva sin editar porque documenta correctamente el estado en el que se tomaron las decisiones de diseño (Decisiones 1 y 2, checkpoint del grupo 3) — no describe el estado actual de la base.

**Changes relacionados:**

- **`revision-costos-productos` (20/61, en pausa — no se toca en este change).** Su premisa central es comparar `productos.costo_producto` contra el `costo_base` **del último movimiento de ingreso**. Bajo capas, "el último ingreso" deja de ser la referencia de nada. El panel seguiría *funcionando* pero **estaría comparando contra el número equivocado**, y su caso testigo documentado (`id=31`, el taladro Shimura) ya no sería el criterio correcto. Cuando este change exista, ese panel necesita **rediseño de su criterio de detección** —probablemente comparar contra **el máximo de las capas activas**—, no un ajuste. No es una tarea de este change y no se modifica ni un archivo suyo.
- **`config-costeo-por-proveedor` (91/99, sin archivar).** Este change **no depende** de que se cierre y **no toca** ninguno de sus archivos. Sí hereda su modelo (`Proveedor` con perfil de costeo, `MonedaCosto`, `cotizacionAplicada` congelada en el movimiento): cada capa nueva arrastra ese desglose completo por la FK al movimiento, moneda y cotización incluidas.
- La inconsistencia conocida del `ORDER BY m.fecha DESC` **sin desempate por `id`** (documentada en `revision-costos-productos`) sigue siendo relevante, aunque **menos crítica que bajo FIFO**: acá el orden gobierna el descuento de cantidades y el desempate entre dos capas del **mismo** costo, no la fuente del costo. Se resuelve igual en este change: todo orden de capas es `(fecha ASC, id ASC)`, sin excepción (Decisión 2b / Riesgo R10).
