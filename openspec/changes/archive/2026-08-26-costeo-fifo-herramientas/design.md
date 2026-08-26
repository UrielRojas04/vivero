> ## 🔁 CORRECCIÓN POST-CHECKPOINT — 2026-08-21
>
> **Este documento fue reescrito. El algoritmo cambió: ya no es FIFO.**
>
> El change se diseñó originalmente como **FIFO puro** (el costo de referencia sale de la compra más vieja que todavía tiene stock, sea más cara o más barata que las posteriores). El usuario lo aprobó así en un primer momento.
>
> Durante el checkpoint del grupo 3, al presentarle el caso concreto —*comprás a $100, después comprás a $150, la de $100 sigue en el depósito, ¿qué costo se muestra?*— **el usuario aclaró que el requisito real es otro**: el costo de referencia tiene que ser **siempre el más alto entre todas las capas que todavía tienen stock**, sin importar el orden de compra ni cuál se vende primero. En sus palabras: *"el jefe quiere que en la ficha siempre se muestre el costo más alto, ya sea nuevo o el viejo"*. Confirmó explícitamente que **eso aplica también al costo real usado en cada venta**, no sólo a la ficha del producto.
>
> **Diferencia concreta, con el mismo ejemplo:** comprás 1 a $100 (queda sin vender), después comprás 5 a $150. FIFO puro seguiría mostrando **$100** hasta agotar esa primera unidad. La regla nueva salta a **$150 de inmediato**. Y si algún día se agota del todo la capa de $150, el costo de referencia se recalcula sobre lo que quede — **nunca se queda pegado en un número viejo que ya no corresponde a ninguna unidad en stock**. Ése era el defecto del "número simple que nunca baja" que se descartó al principio de la conversación; la regla nueva no lo tiene, porque siempre mira lo que efectivamente queda.
>
> **Qué cambió en este documento:**
> - La **Decisión 2** dejó de ser *"cómo se registra un egreso de costo mixto"* y pasó a ser *"el costo de referencia es el máximo entre las capas activas"*. El problema del costo mixto **ya no existe**: bajo la regla nueva toda una venta usa **un único costo**.
> - Se agregó la **Decisión 2b**, que fija explícitamente que el **consumo de cantidades** sigue el orden **más viejo primero** —mismo criterio de siempre, sin motivo para cambiarlo— pero que **el costo ya no depende de eso**.
> - Desaparecen del diseño `VentaDetalle.costoTotalHistorico` y `VentaDetalle.costoDetalleHistorico`, y desaparece la generación de **varios `MovimientoStock` por egreso**. Ver *Lo que esta corrección simplifica*.
> - El flag pasó a llamarse **`costeoPorCapasHabilitado`** (antes `costeoFifoHabilitado`) y la capability nueva pasó a llamarse **`costeo-por-capas`** (antes `costeo-fifo`).
> - Todos los números de impacto se recalcularon y **se verificaron contra la base real** el 2026-08-21.
>
> **El nombre del directorio del change sigue siendo `costeo-fifo-herramientas`** por continuidad. No es FIFO. No renombrar a esta altura no vale la pena; confundirse sí.
>
> **El checkpoint del grupo 3 sigue ABIERTO.** El usuario confirmó que quiere que se rehaga el diseño, **no** aprobó todavía el checkpoint corregido. La tarea 3.7 sigue sin marcar.

## Context

### Lo que existe hoy

Tres changes de costeo construyeron, en orden, el motor que calcula **cuánto sale una compra**:

- **`costeo-flexible-por-producto`** (archivado 2026-08-20) — `CostoCalculator`, la implementación única de la fórmula: `base → descuentos en cascada → IVA sobre el neto → envío en cadena sobre el neto+IVA → suma`, equivalente a `neto × (1+IVA%) × (1+envío%)` (corregido 2026-08-22 tras verificar contra la planilla real de Shimura; la fórmula original sumaba IVA y envío en paralelo sobre el mismo neto). Y el congelado completo del desglose en cada `MovimientoStock` de ingreso (`costoBase`, `costoNeto`, `descuentoPorcentaje`, `descuentoDetalle`, `ivaPorcentaje`, `envioPorcentaje`, `costoUnitario`).
- **`herramientas-pedidos-proveedores`** (archivado 2026-08-19) — el `costoBaseExplicito`: confirmar la recepción de un pedido congela en el movimiento **el costo pactado de esa línea**, no el costo de catálogo del producto.
- **`config-costeo-por-proveedor`** (91/99, sin archivar) — el perfil de costeo del `Proveedor` y la conversión de moneda como paso 0, con `monedaOrigen` y `cotizacionAplicada` también congeladas en el movimiento.

El resultado es que **cada `MovimientoStock` de ingreso ya es un registro completo, exacto e inmutable de una compra**. La aritmética está resuelta y verificada al centavo contra las planillas reales del jefe.

### Lo que falta, y es lo único que falta

El sistema calcula perfecto el costo de **cada** compra, pero después sólo se acuerda de **una**: la última.

```java
// MovimientoStockServiceImpl.java, líneas 67-85 — la rama de egresos
MovimientoStock lastIngreso = movimientoStockRepository
    .findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(
        producto.getId(), List.of(INGRESO, AJUSTE_INICIAL));
mov.setCostoUnitario(lastIngreso.getCostoUnitario());   // ← copia el último, siempre
```

```java
// Producto.java, línea 100 — el costo de referencia de todo el sistema
@Formula("(SELECT COALESCE(m.costo_unitario, p.costo_producto, 0) FROM movimientos_stock m ... "
       + "WHERE m.producto_id = id AND m.tipo_movimiento IN ('INGRESO','AJUSTE_INICIAL') "
       + "ORDER BY m.fecha DESC LIMIT 1)")   // ← el último, otra vez
```

"El último" no es "el que corresponde a la mercadería que tengo en el estante", y **casi nunca lo es en esta base**. En Herramientas, **8 de los 11 productos vivos** tienen como costo de referencia el de un movimiento de **cantidad cero** (un cambio de configuración), y en **5 de ellos** ese número **no lo pagó jamás ninguna unidad en stock** (ver *La segunda cara del mismo problema*).

### La segunda cara del mismo problema: los costos fantasma

`ProductoServiceImpl.actualizarProducto()` (línea 206-219) registra un movimiento cada vez que **cambia la configuración de costo** de un producto, aunque no se mueva ni una unidad. Cuando el delta de stock es 0, el tipo es `AJUSTE_INICIAL` con `cantidad = 0`. En la base real de Herramientas hay **34 de esos movimientos sobre 42 `AJUSTE_INICIAL`**, y cualquiera de ellos, por ser "el último", **pisa el costo de referencia de mercadería ya comprada y pagada**.

**Verificado el 2026-08-21 contra `vivero-postgres` / `vivero_db`: hay 5 costos fantasma, no 2.** Un costo fantasma es un costo de referencia que **ninguna unidad efectivamente en stock costó nunca**:

| id | Producto | Reporta hoy | Movimiento que lo produce | Lo que costaron de verdad las unidades en stock |
|---|---|---|---|---|
| 2 | Pala ancha | $23.157,89 | mov. 96, `AJUSTE_INICIAL` qty 0 | 2 u. a $22.055,14 |
| 3 | Pala pocera | $20.790,00 | mov. 97, `AJUSTE_INICIAL` qty 0 | 1 u. a $21.780,00 + 5 u. a $25.987,50 |
| 4 | Cinta aisladora | $2.083,20 | mov. 98, `AJUSTE_INICIAL` qty 0 | 5 u. a $2.281,60 |
| 5 | Cinta métrica | $5.197,50 | mov. 103, `AJUSTE_INICIAL` qty 0 | 2 u. a $5.940,00 + 2 u. a $5.250,00 |
| 31 | Taladro SHIMURA | $101.545,92 | mov. 138, `AJUSTE_INICIAL` qty 0 | 1 u. a $121.855,10 |

Otros 3 productos (`id=6`, `id=10`, `id=12`) también toman su costo de un movimiento de cantidad cero, pero **el número coincide** con el de su capa real (o no tienen stock), así que el defecto no se manifiesta. Son fantasmas latentes, no visibles.

> ⚠️ La versión anterior de este documento decía *"hay dos costos fantasma"*. **Era incorrecto: son cinco.** Corregido con la verificación del 2026-08-21.

### Restricciones que este diseño no puede romper

1. **Las ventas ya hechas son intocables.** `VentaDetalle.costoUnitarioHistorico` / `costoBaseHistorico` / `precioUnitarioHistorico` / `descuentoPorcentajeHistorico` / `envioPorcentajeHistorico` son inmutables desde que se escriben. Ninguna venta existente puede cambiar de margen por este change.
2. **La fórmula no se toca.** `CostoCalculator` no se modifica en ninguna línea. Sigue calculando idéntico el costo de cada capa nueva.
3. **Vivero queda intacto.** No una rama de código que lo excluya: **intacto por construcción** (ver Decisión 7).
4. **Reglas duras del proyecto:** DTOs siempre (nunca entidades JPA en endpoints); `Controller → Service → Repository → Model`; sin `findAll()` sin límite; tests contra base real o Testcontainers, nunca mockeando la base.

### Línea de base real (`vivero-postgres` / `vivero_db`, re-verificada el 2026-08-21)

> ⚠️ **Corrección de línea de base del 2026-08-21.** La primera medición se tomó con la base contaminada por 2 movimientos de prueba fabricados para `revision-costos-productos` (tareas 1.6/1.7 de *ese* change): `mov_id=141` (`INGRESO` de 10 u. a `id=5 Cinta métrica`) y `mov_id=142` (`INGRESO` de 2 u. a `id=1 Pala corazón`). **Se revirtieron** y toda la línea de base se volvió a medir contra la base limpia. Los valores obsoletos (56 unidades, 18 capas, `id=5` en $6.444,90, `id=1` con 8 u.) no deben usarse.

| Dato | Valor (verificado 2026-08-21) |
|---|---|
| Productos vivos de Herramientas | 11 (**44 unidades** en stock) |
| Movimientos de Herramientas (incluidos productos borrados) | **71 filas** (`INGRESO` **17** / `AJUSTE_INICIAL` 42 / `VENTA` 10 / `EGRESO` 2 / `MERMA` 0) |
| `AJUSTE_INICIAL` con `cantidad = 0` | **34** |
| Ingresos **con unidades** (= capas reconstruibles) | **15** (`id=1`→3 · `id=3`→2 · `id=5`→2 · uno cada uno los 8 restantes) |
| Capas que quedan **activas** tras el replay | **13** (`id=6` queda sin ninguna: stock 0) |
| Productos con **más de una capa activa** | **3** (`id=1`, `id=3`, `id=5`) — son los únicos donde el máximo puede diferir de la capa más vieja |
| Costos fantasma visibles hoy | **5** (`id=2`, `id=3`, `id=4`, `id=5`, `id=31`) |
| ¿El libro reconcilia con el stock actual? | **Sí, exactamente, en los 11 productos** |
| ¿El saldo corrido se va a negativo en algún punto? | **No** — el replay es viable |
| `fecha` duplicadas dentro de un producto | **0** |
| Movimientos soft-deleted | **0** |
| Ingresos con unidades y `costo_base` en `NULL` | 2 (pre-`costeo-flexible`; ambos **sí** tienen `costo_unitario`) |
| Productos de Vivero | 5, todos con `costo_producto` en `NULL` y costo de referencia `0.00` o `NULL` |

## Goals / Non-Goals

**Goals:**

- Que el costo de referencia de un producto de Herramientas sea **el más alto entre los que efectivamente pagó por la mercadería que todavía tiene en el depósito**, y no el de la última compra ni el de un tipeo de configuración.
- Que ese mismo costo sea el que se usa para calcular **la ganancia real de cada venta**, no sólo el que se muestra en la ficha.
- Que ese costo **se recalcule** cuando la compra más cara se agota del todo, en vez de quedarse pegado a un número que ya no corresponde a ninguna unidad en stock.
- Que un **cambio de configuración de costo deje de reescribir el costo de mercadería ya comprada**, y afecte sólo a las compras futuras.
- Que el **desempate de orden** entre dos operaciones del mismo instante quede definido, en vez de depender del plan de ejecución de PostgreSQL.
- Que el stock que ya existe entre al modelo nuevo **con las capas reales**, no con una aproximación que congele el bug que el change vino a arreglar.
- Que **Vivero no ejecute una sola línea de código nueva** ni cambie un solo valor devuelto.
- Que la migración sea **verificable antes de escribirse** y reversible después.

**Non-Goals:**

- **No** se implementa FIFO. El costo **no** sale de la capa más vieja. (Sólo el **consumo de cantidades** sigue el orden más viejo primero — ver Decisión 2b.)
- **No** se modifica `CostoCalculator` en ninguna línea.
- **No** se recalcula, corrige ni toca ninguna venta ya registrada.
- **No** se implementa LIFO, costo promedio móvil, costo estándar ni ningún método de valuación alternativo, ni se deja un selector de método.
- **No** se agrega valuación de inventario contable ni informe de existencias valorizadas. Este change lo **habilita**, pero no lo construye.
- **No** se cambian `Producto.costoProducto` ni `Producto.precio` de ningún producto.
- **No** se toca Vivero, ni ventas de Vivero, cheques, cuentas corrientes, bandejas, siembras, insumos.
- **No** se archiva ni se modifica `config-costeo-por-proveedor` (91/99) ni `revision-costos-productos` (20/61).
- **No** se implementa el rediseño del panel de revisión de costos que este change vuelve necesario (ver Riesgo R6).

---

## Lo que esta corrección simplifica

La Decisión 2 original resolvía un problema que **la regla nueva hace desaparecer**: cómo registrar un egreso cuyo costo sale de más de una capa. Bajo "máximo activo", **una venta entera tiene un solo costo unitario**, cualquiera sea de qué capa(s) físicas se descuenten las unidades. No hay costo mixto, no hay promedio ponderado, no hay total exacto que difiera del promedio por el cambio.

Consecuencias directas, todas en la dirección de **menos código**:

| Pieza del diseño anterior (FIFO) | Estado bajo la regla nueva | Motivo |
|---|---|---|
| Varios `MovimientoStock` por egreso (uno por capa consumida) | **Eliminada** — un egreso = **un** movimiento | Ya no hay costos distintos que separar. La traza vuelve a la cardinalidad de hoy. |
| `MovimientoStockService` devolviendo una lista de movimientos | **Eliminada** — la firma actual **no cambia** | Consecuencia de lo anterior. Desaparece la tarea de adaptar llamadores. |
| `VentaDetalle.costoTotalHistorico` | **Eliminada** | Existía para evitar el arrastre de redondeo del promedio ponderado. Sin promedio, `cantidad × costoUnitarioHistorico` **es** el total exacto. |
| `VentaDetalle.costoDetalleHistorico` | **Eliminada** | Existía para explicar de qué capas salía un costo mixto. Ya no hay costo mixto. La traza de qué capa aportó el costo vive en el desglose congelado del `MovimientoStock` del egreso. |
| `sumarCostoMercaderiaVendida` reescrita a `SUM(costoTotalHistorico)` | **Eliminada** — la consulta **no se toca** | Sigue siendo `SUM(cantidad * costoUnitarioHistorico)`, exacta por construcción. |
| `FinanzasServiceImpl.listarDetalleCogs()` exponiendo el detalle de capas | **Eliminada** — el archivo **no se toca** | No hay campo nuevo que exponer. |
| `VentaServiceImpl` construyendo el detalle con 3 campos nuevos | **Eliminada** — el archivo **no se toca** | `detalle.setCostoUnitarioHistorico(mov.getCostoUnitario())` ya hace lo correcto: el movimiento trae el costo de la capa de referencia. |
| `pages/Finanzas.jsx` mostrando el detalle legible de capas | **Eliminada** — el archivo **no se toca** | No hay campo nuevo. |
| Tarea 9.3: `costoBaseHistorico` en `NULL` cuando la línea consumió varias capas | **Eliminada** | Siempre hay una capa de referencia única, con su desglose completo. Nunca hace falta `NULL`. |

**Esto no es una omisión: es una simplificación deliberada, y queda registrada como tal.** Si algún día vuelve a hacer falta saber de qué capas salieron las unidades de una venta concreta, el dato es reconstruible del historial de movimientos y de las capas; no se está perdiendo información que hoy exista.

**Lo que NO se simplifica y sigue siendo necesario:** las **capas** siguen haciendo falta enteras (Decisión 1). Sin saber cuánto queda de cada compra no hay forma de calcular el máximo activo ni de recalcularlo cuando una capa se agota. La migración por replay (Decisión 3) también sigue siendo necesaria de la misma forma, y por el mismo motivo.

---

## Decisions

> **Las siete Decisiones de este change están cerradas como diseño.** La **Decisión 1** fue decidida explícitamente por el usuario el 2026-08-21 y **no cambió**. La **Decisión 2 fue reemplazada** el 2026-08-21 por la aclaración del requisito real (ver el encabezado de este documento) y se le agregó la **Decisión 2b**. Las Decisiones 3 a 7 quedaron por la recomendación documentada, sin objeción, con los ajustes de nomenclatura que la corrección arrastra.
>
> Las opciones descartadas se conservan **como registro de qué se evaluó**, marcadas explícitamente como descartadas. **Ninguna de ellas es una alternativa viva**: la implementación no debe reabrirlas ni dejar ramas condicionales que las contemplen.

---

### ✅ Decisión 1 — Modelo de datos de las capas · DECIDIDA POR EL USUARIO (2026-08-21) · **sin cambios**

**La pregunta que se le hizo:** ¿una entidad nueva para las capas, o se le agrega `cantidadRestante` a `MovimientoStock`?

> ✅ **RESUELTA — ENTIDAD NUEVA, LIGADA AL MOVIMIENTO DE INGRESO.** Era la opción recomendada (Opción A). Se crea `CapaCostoStock` con **FK al `MovimientoStock` de origen** —sin duplicar sus 10 columnas de desglose, que se siguen por la FK— y con `costoUnitario` como **único dato denormalizado**, el que necesita la consulta caliente del costo de referencia. **`MovimientoStock` sigue siendo el historial estrictamente inmutable que siempre fue: nunca recibe un `UPDATE`.** La Opción B (agregarle `cantidadRestante` al movimiento) **queda descartada** y no debe reaparecer como rama condicional en ninguna tarea ni en ningún archivo.
>
> **Corolario que esta decisión resuelve de paso:** los **34 `AJUSTE_INICIAL` de cantidad 0** (el bug de los 5 costos fantasma) **no generan capa**, porque la regla queda expresada de una sola forma, sin discriminador semántico sobre una columna existente: **crea capa ⟺ el movimiento es entrante Y `cantidad > 0`**.
>
> **Esta decisión sobrevive intacta a la corrección del algoritmo**, y de hecho la corrección la refuerza: con "máximo activo" la tabla de capas se consulta por `MAX(costo_unitario)` en vez de por `ORDER BY fecha LIMIT 1`, pero es la misma tabla, con las mismas columnas.

#### Opción A — Entidad nueva `CapaCostoStock` · **la elegida**

```
capas_costo_stock
  id
  producto_id           → Producto
  movimiento_id         → MovimientoStock (el INGRESO que la originó)
  unidad_negocio_id     → UnidadNegocio
  cantidad_original     int
  cantidad_restante     int      ← lo único mutable
  costo_unitario        numeric(12,2)   ← copia congelada
  fecha                 timestamp       ← copia de la del movimiento (clave de orden de consumo y de desempate)
```

**A favor:**
- `MovimientoStock` **sigue siendo un log estrictamente inmutable**. La spec vigente llama a ese requisito, con esas palabras, *"Historial Inmutable de Movimientos de Stock"*.
- La tabla contiene **sólo capas reales**: 15 filas en la línea de base, contra 59 filas de movimientos entrantes de las cuales **34 son de cantidad 0**.
- El soft-delete de `MovimientoStock` (`@SQLDelete` + `@SQLRestriction`) no arrastra silenciosamente una capa.

**En contra:** una tabla más, con su entidad y su repositorio.

**👉 Cómo se neutraliza el "en contra":** la capa **no duplica el desglose**. Lleva la FK al movimiento que la originó —donde el desglose completo ya vive, congelado e inmutable— y **denormaliza un solo número**: `costoUnitario`. Ese número es el que necesita la consulta caliente del costo de referencia (`MAX(costo_unitario)` sobre las capas activas), y tenerlo en la propia fila la hace una lectura de una sola tabla, sin join. Se copia una vez y **no se actualiza nunca**. Quien necesite el desglose completo sigue el `movimiento_id` — y ése es exactamente el camino que usa el egreso para congelar el desglose de la capa de referencia (Decisión 2).

#### Opción B — `MovimientoStock` gana `cantidadRestante` · **DESCARTADA**

> ⛔ **Descartada por decisión del usuario (2026-08-21).** Se conserva sólo como registro. Ninguna tarea, ningún archivo y ninguna spec debe contemplarla, ni siquiera como rama condicional.

**En contra:**
- **Le cambia la naturaleza a la tabla:** de log append-only a tabla con estado mutable reescrito en cada venta.
- **Hace falta un discriminador igual:** habría que representar "esta fila no es una capa" con `cantidadRestante = NULL`, un cuarto uso semántico distinto de `NULL` en la misma tabla.
- **El soft-delete se vuelve peligroso:** borrar (soft) un ingreso borra silenciosamente una capa.

---

### ✅ Decisión 2 — El costo de referencia es el MÁXIMO entre las capas activas · **CORREGIDA POST-CHECKPOINT (2026-08-21)**

> 🔁 **Esta decisión reemplaza por completo a la Decisión 2 anterior**, que trataba *"cómo se representa un egreso que consume varias capas"*. Ese problema **ya no existe**. Ver el encabezado de este documento para el registro de por qué cambió.

**La regla, en una línea:**

> **El costo de referencia de un producto es el mayor `costoUnitario` entre todas sus capas con `cantidadRestante > 0`.**
> Ese mismo número es el que se congela en **todo** egreso del producto: la venta entera, la merma entera, el ajuste negativo entero.

Y sus tres corolarios, que son lo que hay que no perder de vista al implementar:

1. **No depende del orden.** Una compra nueva más cara eleva el costo de referencia **de inmediato**, aunque las compras anteriores más baratas todavía tengan stock. Una compra vieja más cara lo sostiene **mientras le quede una sola unidad**, aunque hayan entrado compras más baratas después.
2. **No se queda pegado.** Cuando la capa más cara se agota **del todo**, el costo se recalcula sobre lo que quede, y **baja** si nada alcanza el valor anterior. Nunca se conserva un número que ya no corresponde a ninguna unidad en stock. Ésta es la diferencia con el "número simple que nunca baja" que se descartó al principio de la conversación con el usuario.
3. **Es conservador a propósito.** Nunca es menor que el costo de ninguna unidad en stock, y por lo tanto **tiende a sobrestimar** el costo real de las unidades que efectivamente se están vendiendo primero. Es una consecuencia inseparable de lo que el usuario pidió y **tiene que aprobarla explícitamente** (tarea 3.8).

**La *capa de referencia*.** Para que la regla sea implementable sin ambigüedad hace falta un nombre para *la capa de la que sale el costo*:

> **Capa de referencia** = la capa activa con el mayor `costoUnitario`. En caso de empate de costo, **la más antigua** (`fecha ASC, id ASC`).

De ella sale el `costoUnitario` del egreso **y también su desglose completo** (costo base, neto, descuento efectivo, detalle legible, IVA, envío), que se copia siguiendo la FK al movimiento que la originó. Es exactamente el mismo mecanismo que hoy copia el desglose "del último ingreso", con otra fuente.

**Cuándo se evalúa el máximo: ANTES de descontar.** Es la única ambigüedad real del algoritmo y hay que fijarla:

- Un egreso que **agota la capa de referencia** se registra al costo que el producto tenía **cuando la operación empezó**, no al costo menor que queda después.
- Si se evaluara después, una venta que barre la mercadería cara reportaría el costo barato — exactamente lo contrario de lo que el usuario pidió.

**Qué NO se hace, explícitamente:**
- **No** se parte el egreso en varios movimientos.
- **No** se calcula ningún promedio ponderado.
- **No** se asigna a un egreso el costo de la capa de la que se descontaron sus unidades, cuando esa capa no es la de referencia.
- **No** se agregan columnas a `VentaDetalle`.

#### Alternativa descartada — FIFO puro (el diseño original de este change)

> ⛔ **Descartada por aclaración del usuario el 2026-08-21**, después de ver el ejemplo concreto de $100 vs $150. Se conserva como registro de lo que se había aprobado antes y de en qué se diferencia.

El costo de referencia sale de la **capa más antigua con unidades restantes**. Es el estándar contable, reconcilia perfecto (la suma de los COGS de todas las ventas iguala exactamente el costo de adquisición de la mercadería vendida) y no sobrestima nada.

**Por qué no es lo que el usuario quiere:** con FIFO, comprar más caro **no mueve la ficha** hasta que se agote lo viejo y barato. En la base real eso pasa en `id=3 Pala pocera`: FIFO mostraría **$21.780,00** (la unidad vieja) mientras hay 5 unidades compradas a **$25.987,50** en el estante. El jefe quiere ver $25.987,50.

#### Alternativa descartada — Número simple que nunca baja (el "máximo histórico")

> ⛔ **Descartada al principio de la conversación con el usuario**, antes de que existiera este documento. Se conserva porque la regla nueva se le parece y hay que poder explicar la diferencia.

Guardar un solo número por producto que sube cuando entra una compra más cara y nunca baja. **Defecto fatal:** queda inflado para siempre. El día que se vende la última unidad cara, el producto sigue reportando ese costo aunque en el depósito sólo quede mercadería barata.

**La regla elegida no tiene ese defecto**, porque no guarda un número: lo **deriva** de lo que efectivamente queda en stock, capa por capa. Por eso hacen falta las capas.

#### Alternativa descartada — Promedio ponderado móvil

> ⛔ **Descartada.** Es lo contrario de lo que el usuario pidió: promedia lo caro con lo barato y da un número menor que el costo más alto en stock. Además está fuera de alcance explícito (*Non-Goals*).

---

### ✅ Decisión 2b — El consumo de CANTIDADES sigue el orden más viejo primero · **NUEVA (2026-08-21)**

**La pregunta que la corrección abre:** si el costo ya no depende de qué capa se consume, ¿en qué orden se descuentan las unidades?

**Decisión: se mantiene el orden más viejo primero (`fecha ASC, id ASC`), sin cambios.**

- Es el criterio de siempre, ya diseñado, ya especificado, y el que usa el replay de la migración.
- Es el único que garantiza que ninguna capa quede "colgada" indefinidamente mientras se consumen otras.
- Refleja lo que pasa en el depósito real: la mercadería vieja se despacha primero.
- **No hay ningún motivo para cambiarlo sólo porque el costo dejó de depender de él.**

**Y queda escrito con estas palabras, porque es lo que se malinterpreta:**

> **El consumo de cantidades sigue el orden más viejo primero, mismo criterio de siempre, pero el COSTO usado ya no depende de qué capa se consumió: es el máximo entre todas las capas con `cantidadRestante > 0` en ese momento.**

**Ejemplo de la base real que lo hace evidente** — `id=3 Pala pocera`, capas activas `1 u. @ $21.780,00` (mov. 5, la más vieja) y `5 u. @ $25.987,50` (mov. 66):

- Se vende **1 unidad**.
- **Cantidad:** se descuenta de la capa de $21.780,00, que queda **agotada**.
- **Costo:** se congela **$25.987,50** — el máximo activo, que sale de la **otra** capa.
- **Después:** queda `5 u. @ $25.987,50`. El costo de referencia sigue siendo $25.987,50.

Las dos cosas son ciertas a la vez y no se contradicen: una gobierna el inventario, la otra gobierna el margen.

---

### ✅ Decisión 3 — Migración del stock existente · RESUELTA POR LA RECOMENDACIÓN · CHECKPOINT BLOQUEANTE PROPIO

**La pregunta:** el stock actual de Herramientas nació sin capas. ¿Cómo entra al modelo nuevo?

> **La corrección del algoritmo no cambia esta decisión.** Sigue haciendo falta reconstruir las capas reales, y por el mismo motivo: sin saber cuánto queda de cada compra no hay forma de calcular el máximo activo.

#### Opción A — Capa de apertura plana · **DESCARTADA como estrategia; sobrevive SÓLO como fallback por producto**

Una capa por producto: `cantidad = stock actual`, `costo = costoUnitarioHistorico actual`.

**Es simple, es una consulta, y produce el resultado equivocado.** Para `id=3 Pala pocera` crearía una capa de 6 unidades a **$20.790,00** — un costo fantasma que ninguna unidad pagó jamás, congelado para siempre sobre todo el stock actual. El día uno del change, el defecto que el change existe para arreglar seguiría ahí.

#### Opción B — Replay del libro real · **la elegida**

Verificado sobre la base real el 2026-08-21:

- El libro de movimientos **reconcilia exactamente con el stock actual en los 11 productos vivos**.
- El **saldo corrido nunca se va a negativo** en ningún punto de la historia de ningún producto.
- **No hay dos movimientos con la misma `fecha`** dentro de un mismo producto.
- **No hay movimientos soft-deleted.**

El algoritmo del replay:

```
para cada producto vivo de Herramientas:
    capas = []
    para cada movimiento, ordenado por (fecha ASC, id ASC):
        si es entrante (INGRESO / AJUSTE_INICIAL) y cantidad > 0:
            capas.push(nueva capa: cantidad, costoUnitario del movimiento, fecha, movimiento_id)
        si es entrante y cantidad == 0:
            ignorar            ← los 34 movimientos de cambio de configuración
        si es saliente (VENTA / EGRESO / MERMA):
            descontar cantidad de las capas más viejas hacia adelante   ← Decisión 2b
    verificar: Σ cantidad_restante == producto.stock
```

**El replay reconstruye CANTIDADES, no costos históricos.** No hay que recalcular qué costo debería haber registrado cada egreso viejo: esos costos ya están congelados en sus movimientos y en sus `VentaDetalle`, y **son intocables**. El replay sólo necesita saber cuánto queda de cada capa hoy.

**Resultado esperado (replay verificado a mano contra la base real, 2026-08-21):** ver la tabla completa en la tarea 3.1 de `tasks.md`.

**Defensa obligatoria:** el replay **no se aplica a ciegas**. Producto por producto, si `Σ cantidad_restante ≠ producto.stock`, ese producto **no se migra por replay**: cae a una capa de apertura plana y **queda reportado por nombre** en la salida de la migración. Hoy no hay ningún producto en esa situación, pero la migración tiene que ser correcta también el día que lo haya.

✅ **RESUELTA por la recomendación**, sin objeción del usuario.

> ⚠️ **Lo que seguía abierto acá no era la decisión de diseño, sino su ejecución: el checkpoint bloqueante propio (grupo 7 de `tasks.md`).** El plan era correr el replay primero **en seco** y no escribir nada en la base real hasta que el usuario mirara esa tabla y la aprobara.

> ### 🔁 RESOLUCIÓN REAL DEL CHECKPOINT (2026-08-21) — no se ejecutó el replay
>
> En el checkpoint del grupo 7, el usuario **no aprobó una tabla de replay**: decidió **no migrar el historial existente** de Herramientas y en cambio **borrar todos los datos de prueba** (los 21 productos vivos de `unidad_negocio_id=2` a esa fecha — los 11 de esta sección más 10 productos de prueba encontrados en el reconocimiento —, sus movimientos, pedidos, ventas y todo lo conectado a ellas: pagos, cheques, historial de bandejas). Los proveedores no se tocaron. El algoritmo del replay descripto arriba **sigue siendo la documentación correcta de cómo migrar un libro de movimientos existente** si algún día hace falta (por ejemplo, para otra unidad de negocio que adopte el costeo por capas más adelante con historial real que valga la pena preservar) — simplemente **no se ejecutó contra estos datos**, porque se decidió que no valía la pena migrarlos. Ver el detalle completo, con conteos de borrado y verificación, en la tarea 7.7 de `tasks.md`.
>
> **Estado final de este change respecto de la migración: `capas_costo_stock` arranca completamente vacía.** No hay historial de Herramientas que reconciliar, ni capas legacy, ni fallback por producto que ejecutar. Las capas se crean orgánicamente a partir de acá, con cada pedido y cada venta real que se registre desde ahora.

---

### ✅ Decisión 4 — Qué movimientos crean y qué movimientos consumen capas · RESUELTA POR LA RECOMENDACIÓN

`TipoMovimientoStock` tiene cinco valores. Verificado dónde se generan:

| Tipo | Quién lo genera | Baseline en Herramientas |
|---|---|---|
| `INGRESO` | `PedidoServiceImpl:318` (pedido confirmado, con `costoBaseExplicito`) · `ProductoServiceImpl:218` (delta de stock > 0) | 17 filas / 51 u. |
| `AJUSTE_INICIAL` | `ProductoServiceImpl:131` (alta) · `ProductoServiceImpl:218` (delta = 0) · `DataInitializer:146` (seed) | 42 filas / 30 u., **34 con cantidad 0** |
| `VENTA` | `VentaServiceImpl:110` | 10 filas / 14 u. |
| `EGRESO` | `ProductoServiceImpl:218` (delta de stock < 0) | 2 filas / 2 u. |
| `MERMA` | **nadie** — valor del enum sin productor en el código | 0 filas |

**La regla, sin excepciones por tipo:**

- **Crea capa** ⟺ el movimiento es entrante (`INGRESO` / `AJUSTE_INICIAL`) **y `cantidad > 0`**.
- **Descuenta capas y toma el costo del máximo activo** ⟺ el movimiento es saliente (`VENTA` / `EGRESO` / `MERMA`), siempre.
- **Ni crea ni descuenta** ⟺ el movimiento es entrante con `cantidad = 0` (los 34 cambios de configuración). Se sigue registrando **exactamente igual que hoy**, con su desglose completo congelado: la traza no se toca. Simplemente deja de ser una capa y **deja de pisar el costo de la mercadería ya comprada** — el arreglo de los 5 costos fantasma.

✅ **RESUELTA por la recomendación**, sin objeción del usuario. Que la condición sea sobre `cantidad > 0` y no sobre el tipo es lo que hace que la regla no tenga casos especiales. `MERMA` queda cubierta por definición aunque hoy nadie la genere.

**Corolario que hay que decirle al usuario en el checkpoint del grupo 3:** hoy, editar el IVA de un producto **cambia** su costo de referencia. Después de este change, **no lo cambia** mientras el producto tenga capas activas: sólo cambia el costo de la próxima compra.

---

### ✅ Decisión 5 — Cómo se resuelve el costo de referencia sin volver a romper el listado · RESUELTA POR LA RECOMENDACIÓN · **fórmula corregida**

**Primero, una aclaración necesaria sobre el N+1:** el N+1 que se resolvió con `@BatchSize(size = 25)` en `Producto.descuentos` era el de una **asociación `@OneToMany` cargada perezosamente**. Una `@Formula` es un problema distinto: Hibernate la **inlinea como subconsulta correlacionada en el mismo `SELECT`**. No hay N+1 posible.

#### Opción A — Repuntar la `@Formula` a la tabla de capas · **la elegida**

```sql
COALESCE(
  (SELECT MAX(c.costo_unitario) FROM capas_costo_stock c
    WHERE c.producto_id = id AND c.cantidad_restante > 0),
  <la expresión de hoy, sin tocar un carácter>
)
```

> 🔁 **Corregida el 2026-08-21.** La versión anterior era `SELECT c.costo_unitario ... ORDER BY c.fecha ASC, c.id ASC LIMIT 1` (la capa más vieja). Ahora es un `MAX`, que además es **más simple**: no necesita orden ni desempate, porque un máximo es un máximo.

- **Es estrictamente más barata que la de hoy**: agrega sobre `capas_costo_stock` (15 filas en la línea de base) en vez de ordenar `movimientos_stock` (71).
- El `COALESCE` con la expresión actual **es también la resolución de la Decisión 7** y la del stock cero: `id=6 Pulverizador` (stock 0, sin capas activas) sigue devolviendo $10.395,00 exactamente como hoy.
- **Índice:** `(producto_id, cantidad_restante, costo_unitario)`. Cambió respecto del diseño anterior —era `(producto_id, cantidad_restante, fecha, id)`— porque la consulta caliente ahora agrega por `costo_unitario` en vez de ordenar por `fecha`. **El orden `(fecha ASC, id ASC)` sigue siendo necesario** para el consumo de cantidades (Decisión 2b) y para el desempate de la capa de referencia, pero ésa es una consulta del servicio, no de la `@Formula`; el repositorio la resuelve con el índice `(producto_id, cantidad_restante, fecha, id)`. **Se declaran los dos índices.**
- **Prohibición explícita:** no mapear las capas como `@OneToMany` en `Producto`. *Eso* sí reintroduciría el N+1 que `@BatchSize` resolvió.

#### Opción B — Columna cacheada en `Producto`, recalculada en cada operación de capa · **DESCARTADA**

- Introduce un valor denormalizado que puede quedar desincronizado — y **el bug que este change vino a arreglar es exactamente un costo de referencia desincronizado de la realidad**.
- Obliga a un hook de recálculo en cada camino de escritura. Cada camino que se olvide es un producto con el costo mal, en silencio.
- **Se descarta**, salvo que la medición del grupo 10 muestre un problema real de latencia — con 11 productos y 13 capas activas, no lo va a mostrar.

✅ **RESUELTA por la recomendación**, sin objeción del usuario.

---

### ✅ Decisión 6 — Compatibilidad con `costoBaseExplicito` (pedidos a proveedor) · RESUELTA POR LA RECOMENDACIÓN

**Sí, y sin tocar `PedidoServiceImpl`.** Verificado en el código (`PedidoServiceImpl:318`):

```java
producto.setStock(stockActual + recibida);          // el stock lo mueve el llamador
productoRepository.save(producto);
movimientoStockService.registrarMovimiento(
    producto, recibida, INGRESO, usuario,
    detalle.getCostoUnitarioPactado(),              // ← costoBaseExplicito
    detalle.getMonedaLinea(), pedido.getCotizacionDolar());
```

1. **La creación de la capa vive dentro de `MovimientoStockServiceImpl`**, el único punto por donde pasan los cinco productores de movimientos. La capa nace del movimiento ya calculado, tomando su `costoUnitario` — que para un pedido confirmado **ya es el pactado**.
2. **El stock sigue siendo responsabilidad del llamador.** Crear o descontar una capa **nunca escribe `Producto.stock`**.
3. **Dos ingresos del mismo pedido a costos distintos generan dos capas distintas**, con el desempate por `id` resolviendo el empate de `fecha` (un `confirmarRecepcion()` con varias líneas las registra en el mismo instante — y ese caso **sí** produce empates, a diferencia de lo que hay en la base hoy).

**Nota bajo la regla nueva:** de esas dos capas, la que gobierna el costo de referencia es **la más cara**, no la primera procesada. El desempate por `id` sólo importa cuando las dos tienen **el mismo** costo.

✅ **RESUELTA por la recomendación**, sin objeción del usuario. **Cero cambios en `PedidoServiceImpl`**: `git diff` sobre ese archivo tiene que quedar vacío al cerrar el change.

---

### ✅ Decisión 7 — Cómo se garantiza que Vivero quede intacto · RESUELTA POR LA RECOMENDACIÓN · **flag renombrado**

#### Opción A — Guard por id (`if (unidadNegocioId == 2L)`) · **DESCARTADA**

Cablea el id `2` en la lógica de negocio y agrega una rama nueva que hay que replicar en cada punto que toque capas.

#### Opción B — Sin flag: las capas se crean para todos · **DESCARTADA**

Vivero cambiaría de comportamiento.

#### Opción C — Bandera de capacidad en `UnidadNegocio` + intactitud estructural en la lectura · **la elegida**

**En la escritura — una sola condición, en un solo lugar.** `UnidadNegocio` gana `costeoPorCapasHabilitado` (boolean, default `false`, `true` sólo para Herramientas). `MovimientoStockServiceImpl` la lee **una vez**:

```java
boolean porCapas = producto.getUnidadNegocio() != null
                && producto.getUnidadNegocio().isCosteoPorCapasHabilitado();
```

- `porCapas == false` → **el método hace exactamente lo que hace hoy**, línea por línea. Vivero no ejecuta una sola instrucción nueva.
- `porCapas == true` → rama de capas.

> 🔁 **Renombrado el 2026-08-21.** Se llamaba `costeoFifoHabilitado`. El algoritmo no es FIFO; dejar "fifo" en el nombre del flag perpetuaría exactamente la confusión que esta corrección vino a eliminar. **El nombre nuevo es `costeoPorCapasHabilitado` en todo el diseño, todas las specs y todas las tareas.** El directorio del change conserva su nombre viejo (`costeo-fifo-herramientas`) sólo por practicidad, y la capability nueva pasó a llamarse `costeo-por-capas`.

**En la lectura — ninguna condición, intactitud por construcción.** La `@Formula` de la Decisión 5 es:

```sql
COALESCE( MAX(costo unitario de las capas activas) , (la expresión de hoy, sin tocar) )
```

Un producto de Vivero **no tiene capas**, así que `MAX(...)` sobre el conjunto vacío devuelve `NULL` **siempre**, y la expresión se reduce a la de hoy. **Vivero devuelve el mismo valor que devuelve hoy, no porque lo verifiquemos: porque es literalmente la misma expresión SQL.** Incluidos los casos borde reales: `Repollo` (`id=13`) y la segunda `Lechuga morada` (`id=14`) devuelven **`NULL`** hoy —no `0`— y lo van a seguir devolviendo.

> ⚠️ **Detalle de implementación que hay que verificar y no asumir:** `MAX()` sobre un conjunto vacío devuelve `NULL` en PostgreSQL, que es lo que el `COALESCE` necesita. Confirmarlo con un producto sin capas antes de dar el grupo 8 por cerrado (tarea 8.3).

✅ **RESUELTA por la recomendación**, sin objeción del usuario.

---

## Risks / Trade-offs

**R1 — El costo de referencia de 6 de los 11 productos de Herramientas cambia de valor el día del deploy.** *(Riesgo del diseño original, sobre el historial existente. **Superado en la práctica el 2026-08-21**: el usuario decidió no migrar ese historial — lo borró en vez de traerlo a `capas_costo_stock` (ver Decisión 3 y tarea 7.7 de `tasks.md`). No hay ningún costo de referencia de Herramientas que "cambie de valor el día del deploy", porque no hay productos ni capas heredadas: el primer costo de referencia de cada producto de Herramientas va a salir de su primera capa real, creada después de este change.)* Texto original, conservado como referencia: no era un efecto secundario, era el objetivo. Para `id=1 Pala corazón` el salto habría sido de **+46,7%** y para `id=3 Pala pocera` de **+25,0%**.
→ **Mitigación (aplicada mientras el riesgo era real):** el checkpoint del grupo 3 le mostró al usuario la tabla completa (11 productos, valor viejo → valor nuevo → de qué capa sale, y **qué habría dado FIFO**) **antes** de escribir código. El checkpoint del grupo 7, que iba a mostrarle el resultado real del replay, terminó mostrándole en cambio la alternativa de borrar — y esa fue la que eligió.

**R2 — La regla es conservadora a propósito y sobrestima el COGS.** Es la consecuencia matemática inseparable de lo que el usuario pidió, y es la única que puede sorprenderlo después. Cuando un producto tiene capas activas de costos distintos, cada unidad vendida se carga al **más caro**, incluidas las que físicamente salieron de la capa barata. **Cuantificado sobre la base real (2026-08-21):** si hoy se vendiera todo el stock de Herramientas, el COGS reportado sería **$3.025.585,50** contra un costo de adquisición real de **$3.012.736,20** — una sobrestimación de **$12.849,30 (+0,43%)**, concentrada en los 3 productos con más de una capa activa (`id=1` $7.261,80 · `id=3` $4.207,50 · `id=5` $1.380,00).
→ **Mitigación:** **tarea explícita y bloqueante (3.8)**: el usuario tiene que confirmar que entiende y acepta esta consecuencia, con estos números en la mano. **No se da por sentado.** Bajo FIFO la sobrestimación sería cero — es exactamente lo que se está cambiando a cambio de "que la ficha muestre siempre el costo más alto".

**R3 — El total de COGS de la vida de un producto deja de reconciliar con su costo de adquisición.** Bajo FIFO, la suma de los costos cargados a todas las ventas de un producto iguala exactamente lo que se pagó por esa mercadería. Bajo "máximo activo" no: sobra. Es la misma cosa que R2 vista desde la contabilidad, y **inhabilita este dato como fuente para una valuación de inventario contable** (que de todos modos está fuera de alcance).
→ **Mitigación:** queda anotado acá y en el *Non-Goal* correspondiente. El dato para reconciliar sigue existiendo intacto: las capas guardan el costo real de cada compra, y el libro de movimientos nunca se modifica.

**R4 — Un cambio de configuración de costo deja de mover el costo de la mercadería stockeada.** Es correcto y es lo que pidió, pero hoy lo usa a diario: entra a Productos, corrige el IVA, y el costo se actualiza al instante. Después del change no se va a actualizar, y va a parecer que la edición "no hizo nada".
→ **Mitigación:** se le explica en el checkpoint del grupo 3 con los **5 costos fantasma** en la mano — son la evidencia de que ese mecanismo es el que está rompiendo los números hoy. Y se verifica que la edición **sí** siga cambiando el costo de la **próxima** compra y el precio de venta calculado.

**R5 — La migración es la parte irreversible.** Una vez escritas las capas iniciales, revertir significa borrarlas y volver a migrar. *(Riesgo materializado en otra forma el 2026-08-21: en vez de escribir capas iniciales irreversibles, se ejecutó el borrado — también irreversible — de los 21 productos de Herramientas y todo lo conectado a ellos, en una transacción `BEGIN`/`COMMIT` verificada paso a paso. Ver tarea 7.7 de `tasks.md` para la evidencia completa. El riesgo de "escribir capas iniciales incorrectas" queda evitado por completo: no se escribió ninguna.)*
→ **Mitigación (aplicada):** checkpoint bloqueante propio (grupo 7) — resuelto no aprobando una tabla de replay sino decidiendo no migrar; reconocimiento y verificación de conteos en cada paso del borrado; transacción explícita con `ROLLBACK` disponible ante cualquier error a mitad de camino. Rollback conceptual del mecanismo (si se hubiera migrado): `DELETE FROM capas_costo_stock` + `costeoPorCapasHabilitado = false` sigue siendo válido para el futuro, cuando se acumulen capas reales.

**R6 — `revision-costos-productos` (20/61, en pausa) queda con su premisa muerta.** Su criterio de detección compara `costo_producto` contra el `costo_base` **del último ingreso**. Bajo capas, "el último ingreso" deja de ser la referencia de nada. Su caso testigo documentado (`id=31`, el taladro Shimura) deja de ser el criterio correcto.
→ **Mitigación:** **no es una tarea de este change y no se toca ni un archivo suyo.** Queda anotado para que su próximo `apply` no arranque sobre una premisa muerta: su criterio necesita rediseño (probablemente pase a comparar contra **el máximo de las capas activas**), no un ajuste.

**R7 — `config-costeo-por-proveedor` está en 91/99, sin archivar.** Este change **no depende** de que se cierre y no toca ninguno de sus archivos, pero hereda su modelo.
→ **Mitigación:** la capa no duplica ninguno de esos campos (Decisión 1: FK al movimiento), así que **es inmune a cualquier cosa que ese change todavía cambie** sobre el desglose congelado.

**R8 — El desglose completo de las 2 capas legacy es parcial.** Los 2 ingresos con unidades anteriores a `costeo-flexible-por-producto` tienen `costo_base` en `NULL` (aunque sí tienen `costo_unitario`).
→ **Mitigación:** consistente con la Decisión 13 de aquel change — se dejan en `NULL`. **Consecuencia nueva bajo la regla corregida:** si una de esas capas resulta ser la **capa de referencia**, el egreso congelará su `costoUnitario` (presente y correcto) y un `costoBase` en `NULL`. Es aceptable y es exactamente lo que pasa hoy cuando el "último ingreso" es uno de esos dos movimientos. Verificar en el grupo 7 (tarea 7.6) cuáles son y si alguno es referencia hoy.

**R9 — Un stock corregido a mano por fuera del sistema desbalancearía las capas.**
→ **Mitigación:** hoy no hay ningún camino de ese tipo en el código, y la migración deja una verificación de consistencia reutilizable. **Fuera de alcance** agregar una tarea programada de auditoría.

**R10 — El empate de `fecha` sigue importando, pero menos.** Bajo FIFO el orden de las capas **era** la regla de costo. Bajo "máximo activo" el orden sólo gobierna el consumo de cantidades (Decisión 2b) y el desempate entre dos capas del **mismo** costo.
→ **Mitigación:** todo orden de capas sigue siendo `(fecha ASC, id ASC)`, sin excepción — en la consulta de consumo, en el desempate de la capa de referencia y en el replay de la migración. Se resuelve en este change, no se hereda.

## Migration Plan

> 🔁 **Plan original, no ejecutado tal cual — ver la resolución real más abajo.** Los pasos 1 a 7 describen el plan de migración por replay como se diseñó. En el checkpoint bloqueante (paso 3), el usuario **no aprobó una tabla de replay**: decidió no migrar y en cambio borrar el historial de Herramientas. El plan que sigue queda documentado porque describe correctamente el mecanismo — sigue siendo el camino a seguir si en el futuro hace falta migrar un libro de movimientos real hacia capas —, pero **no es lo que pasó en Herramientas el 2026-08-21**.

1. **Esquema** — `ddl-auto=update` crea `capas_costo_stock`, sus **dos** índices (`(producto_id, cantidad_restante, costo_unitario)` para la `@Formula` y `(producto_id, cantidad_restante, fecha, id)` para el consumo) y `unidades_negocio.costeo_por_capas_habilitado` (default `false`). **`venta_detalles` no cambia.** Nada cambia de comportamiento todavía: sin capas y con el flag en `false`, la `@Formula` nueva **es** la vieja.
2. **Replay en seco** — se corre la reconstrucción sobre los 11 productos **sin escribir nada**, y se imprime la tabla completa: capas resultantes por producto, `Σ cantidad_restante` vs `stock`, y costo de referencia nuevo (máximo activo) vs actual.
3. **🚦 CHECKPOINT BLOQUEANTE (grupo 7)** — el usuario mira esa tabla y la aprueba. Sin eso, no se sigue.
4. **Migración real** — idempotente, con fallback plano por producto y **reporte por nombre** de cualquier producto que no reconcilie.
5. **Verificación post-migración** — producto por producto: `Σ cantidad_restante == producto.stock`, y los 5 productos de Vivero devolviendo **exactamente** lo mismo que antes, `NULL` incluido.
6. **Activación** — `costeoPorCapasHabilitado = true` en Herramientas. Recién acá cambia el comportamiento.
7. **Rollback** — `costeoPorCapasHabilitado = false` (el sistema vuelve a la rama vieja al instante, sin deploy) y, si hace falta, `DELETE FROM capas_costo_stock`. Ningún dato histórico se pierde.

### Lo que pasó realmente (2026-08-21)

1. **Esquema** — sin cambios respecto del plan: se mantiene tal cual (fuera de alcance de la limpieza de datos).
2. **Reconocimiento, no replay** — en vez de reconstruir capas en memoria, se hizo un reconocimiento completo de todo lo que dependía de Herramientas: 21 productos vivos (los 11 originales + 10 de prueba encontrados en el camino), sus 71 movimientos, sus 18 pedidos (uno huérfano, sin `unidad_negocio_id`, detectado durante la ejecución), sus 9 ventas y todo lo conectado a ellas.
3. **🚦 CHECKPOINT (grupo 7) — resuelto por el usuario decidiendo borrar, no migrar.**
4. **Borrado real** — transacción `BEGIN`/`COMMIT` explícita, en orden de dependencias (hijos antes que padres), con verificación de conteos antes y después. Evidencia completa en la tarea 7.7 de `tasks.md`.
5. **Verificación post-borrado** — los 21 productos, sus movimientos, pedidos, ventas y satélites en **0**; proveedores de Herramientas (12) y Vivero (6 productos, 17 ventas) **sin cambios**.
6. **Activación** — sigue pendiente y sin cambios respecto del plan: `costeoPorCapasHabilitado = true` se activa cuando el grupo 8 en adelante lo requiera, sobre una `capas_costo_stock` que arranca **vacía**.
7. **Rollback** — no aplica sobre datos que no se migraron. Si se necesita revertir el *borrado*, la única vía es un backup de la base anterior a esta operación (no hay backup automático de este cambio; es responsabilidad de la infraestructura general del proyecto).

## Open Questions — resueltas

**1. OQ1 = Decisión 1 — ¿una entidad nueva para las capas, o `MovimientoStock` gana `cantidadRestante`?**
✅ **RESUELTA — decidida por el usuario (2026-08-21): ENTIDAD NUEVA, LIGADA AL MOVIMIENTO DE INGRESO.** Era la opción recomendada. `costoUnitario` como único dato denormalizado; `cantidadRestante` como único campo mutable; `MovimientoStock` intacto. La Opción B queda descartada. **Esta decisión no fue afectada por la corrección del algoritmo.**

**2. OQ2 = Decisión 2 — ¿cuál es el costo de referencia de un producto?**
🔁 **RE-RESUELTA — corregida por el usuario (2026-08-21), post-checkpoint: EL MÁXIMO ENTRE LAS CAPAS ACTIVAS.**
*Lo que se había resuelto antes:* FIFO puro (el costo sale de la capa más vieja con unidades), y en consecuencia el sub-problema del "egreso de costo mixto", resuelto con la opción híbrida (un `MovimientoStock` por capa consumida + un `VentaDetalle` con `costoTotalHistorico` y `costoDetalleHistorico`).
*Qué pasó:* al presentarle el caso concreto en el checkpoint del grupo 3 —comprar a $100, después a $150, con la de $100 todavía en el depósito— el usuario **aclaró que el requisito real es otro**: siempre el costo más alto entre las capas con stock, tanto en la ficha del producto **como en el costo real de cada venta**.
*Resolución nueva:* el costo de referencia es `MAX(costoUnitario)` sobre las capas con `cantidadRestante > 0`, evaluado **antes** de descontar. **Toda una venta usa un único costo.** El problema del costo mixto **desapareció**, y con él la opción híbrida, los dos campos nuevos de `VentaDetalle` y la partición del egreso en varios movimientos. **FIFO puro queda descartado** como algoritmo de costo, y sobrevive **sólo** como orden de consumo de cantidades (Decisión 2b).

**2b. OQ2b = Decisión 2b — ¿en qué orden se descuentan las cantidades, si el costo ya no depende de eso?**
✅ **RESUELTA (2026-08-21): más viejo primero, `(fecha ASC, id ASC)`, sin cambios.** Es el criterio de siempre, ya diseñado y ya especificado; refleja el depósito real; garantiza que ninguna capa quede colgada. **No hay motivo para cambiarlo sólo porque el costo dejó de depender de él.**

**3. OQ3 = Decisión 3 — ¿cómo entra el stock existente al modelo de capas?**
✅ **RESUELTA por la recomendación como diseño**, sin objeción del usuario: replay del libro real, con fallback plano **por producto** y reporte explícito de excepciones. **No afectada por la corrección del algoritmo.** 🔁 **Su ejecución tomó un camino distinto (2026-08-21):** en el checkpoint bloqueante (grupo 7), el usuario decidió **no ejecutar el replay** — el stock existente de Herramientas **no entró** al modelo de capas; se borró en su lugar. El mecanismo de replay documentado acá queda como diseño válido para una futura migración con historial real que valga la pena preservar, pero no se aplicó en este change. `capas_costo_stock` arranca vacía.

**4. OQ4 = Decisión 4 — ¿qué movimientos crean y qué movimientos consumen capas?**
✅ **RESUELTA por la recomendación**, sin objeción del usuario: **crea capa ⟺ entrante y `cantidad > 0`; descuenta ⟺ saliente**. `MERMA` cubierta por definición. El desempate es `(fecha ASC, id ASC)` en todos los puntos de orden.

**5. OQ5 = Decisión 5 — ¿el costo de referencia sigue siendo una `@Formula`?**
✅ **RESUELTA por la recomendación**, sin objeción del usuario: se mantiene la `@Formula`, repuntada a la tabla de capas. **Corregida el 2026-08-21:** la subconsulta pasa de `ORDER BY fecha ASC LIMIT 1` a `MAX(costo_unitario)`, y el índice de la consulta caliente pasa a `(producto_id, cantidad_restante, costo_unitario)`. **Sin columna cacheada y sin hook de invalidación.** **Prohibido mapear las capas como `@OneToMany` en `Producto`.**

**6. OQ6 = Decisión 6 — ¿`costoBaseExplicito` sigue funcionando bajo capas?**
✅ **RESUELTA por la recomendación**, sin objeción del usuario: sí, **sin tocar `PedidoServiceImpl`** (su `git diff` tiene que quedar vacío). Crear o descontar una capa **nunca escribe `Producto.stock`**.

**7. OQ7 = Decisión 7 — ¿cómo se garantiza que Vivero quede intacto?**
✅ **RESUELTA por la recomendación**, sin objeción del usuario: bandera de capacidad en `UnidadNegocio`, leída una sola vez y **jamás por id**; en la lectura, `COALESCE(MAX(capas activas), la expresión de hoy sin tocar un carácter)`. **Renombrada el 2026-08-21** de `costeoFifoHabilitado` a `costeoPorCapasHabilitado`.

**Anotada, fuera de alcance, sin comprometer nada:** una auditoría periódica de consistencia entre `Σ cantidad_restante` y `Producto.stock` (Riesgo R9).

## Historial de aprobaciones

| Fecha | Qué se aprobó | Estado |
|---|---|---|
| 2026-08-21 | **Decisión 1** (entidad nueva `CapaCostoStock`) — decidida por el usuario, opción recomendada | ✅ Cerrada, **no afectada** por la corrección |
| 2026-08-21 | **Decisión 2** en su forma original (FIFO puro + híbrida para el costo mixto) — decidida por el usuario | 🔁 **Revocada y reemplazada** el mismo día, ver la fila siguiente |
| 2026-08-21 | **Aclaración del requisito real** por el usuario, durante el checkpoint del grupo 3, tras el ejemplo de $100 vs $150: el costo de referencia es **el máximo entre las capas activas**, en la ficha **y** en el costo real de cada venta | ✅ Registrada. Motivó esta reescritura completa del diseño. |
| 2026-08-21 | Decisiones 3 a 7 por la recomendación documentada, sin objeción | ✅ Cerradas (D5 y D7 con ajustes que arrastra la corrección) |
| 2026-08-21 | **Tarea 3.7 — aprobación del checkpoint de mecánica corregido** | ✅ **Cerrada.** Presentada la tabla completa de los 11 productos con `id=3 Pala pocera` destacado; el usuario confirmó: "si". |
| 2026-08-21 | **Tarea 3.8 — aceptación explícita de que la regla es conservadora y sobrestima el COGS** | ✅ **Cerrada.** Presentada la sobrestimación cuantificada ($12.849,30 / +0,43%); el usuario confirmó: "si". |
| 2026-08-21 | **Tarea 7.7 — checkpoint del grupo 7** | ✅ **Cerrada, resuelta distinto de lo previsto.** El usuario no aprobó una tabla de replay: decidió **borrar** los 21 productos de Herramientas y todo lo conectado a ellos en vez de migrar el historial. Ver evidencia completa en `tasks.md`. `capas_costo_stock` arranca vacía. |

## Lo que sigue pendiente (y lo que no)

- **Ninguna decisión de diseño queda abierta.** Las ocho (siete más la 2b) están cerradas arriba.
- **Las tres aprobaciones del usuario están cerradas** (2026-08-21): el checkpoint de mecánica corregido (3.7), la aceptación explícita de la consecuencia conservadora (3.8) y el checkpoint del grupo 7 (7.7) — este último resuelto borrando el historial de Herramientas en vez de migrarlo.
- **El motor de costeo por capas está implementado y probado** (grupos 4, 5 y 6 de `tasks.md`: `CapaCostoStock`, `CosteoPorCapasCalculator` con 18/18 tests, integración en `MovimientoStockServiceImpl`). **La migración del historial existente no se ejecutó** — se decidió borrar los datos de prueba de Herramientas en su lugar (grupo 7). Queda pendiente el grupo 8 en adelante: reescribir la `@Formula` de costo de referencia, verificación contra la base real, y cierre.
