> ⚠️ **Addendum (2026-08-22, sin tocar tasks.md ni el estado 20/61 de este change): el criterio de detección de este panel quedó desactualizado por `costeo-fifo-herramientas` (implementado, pendiente de archivar) y necesita rediseño antes del próximo `apply`.** Ese change reescribió la `@Formula` de `Producto.costoUnitarioHistorico` (ver línea 70 más abajo, "no se toca en ninguna línea" — sigue siendo cierto en el sentido de que este change no la tocó, pero `costeo-fifo-herramientas` sí, en su propio alcance): ahora, para un producto de una unidad con `costeoPorCapasHabilitado=true`, el costo de referencia es el **máximo entre las capas activas** (`CapaCostoStock` con `cantidadRestante > 0`), no "el costo del último `INGRESO`/`AJUSTE_INICIAL`". Mientras el flag esté en `false` (estado actual de las dos unidades) el criterio de este change sigue siendo válido al pie de la letra, porque la `@Formula` cae exactamente al mismo `COALESCE` de siempre. Pero el día que Herramientas active el flag, la comparación de la línea 19 (`productos.costo_producto` contra "el `costo_base` del último movimiento real de tipo `INGRESO`/`AJUSTE_INICIAL`") deja de coincidir con lo que la ficha del producto realmente muestra: dos capas activas a costos distintos pueden hacer que el costo de referencia visible sea el de una capa que **no** es el último ingreso cronológico (Riesgo R6 de `costeo-fifo-herramientas`). El rediseño probable —no decidido todavía, requiere pasar por el usuario— es comparar `productos.costo_producto` contra **el máximo de las capas activas** cuando el flag esté habilitado, en vez de (o además de) contra el último ingreso. Anotado acá, no en `tasks.md`, para no alterar el 20/61 ya aprobado.

## Why

Cuando llega mercadería —por un pedido a proveedor confirmado o por una edición de stock a mano— el costo real de esa compra queda congelado en el último `MovimientoStock` (`costoBase`/`costoUnitario`). Pero **`Producto.costoProducto` y `Producto.precio` nunca se actualizan solos**: es la Decisión 6 de `herramientas-pedidos-proveedores` (archivado el 2026-08-19, nunca reabierta), y es correcta —confirmar la llegada de un pedido no debe poder mover el precio de venta al público sin que el usuario lo decida a propósito—. El efecto colateral es que la ficha del producto en la sección Productos **puede quedar desactualizada sin que nada lo avise**: el jefe tiene que acordarse de entrar a Productos, abrir producto por producto y comparar a ojo.

**Esto NO es un problema de exactitud financiera, y el change no lo trata como tal.** Verificado en el código: `VentaServiceImpl` (línea 118, `detalle.setCostoUnitarioHistorico(mov.getCostoUnitario())`) copia el costo del **último movimiento de stock** al vender, y nunca lee `Producto.costoProducto`. El margen que muestra Finanzas ya sale del costo real. Lo que falta es **higiene de catálogo**: que la ficha que el jefe mira y el precio que le cobra al cliente estén al día con lo que realmente pagó, sin tener que buscarlo a mano.

Que el problema es real está documentado en la propia base de datos (`vivero-postgres`, consultada el 2026-08-21). El producto `id=31` (`taladro de banco SHIMURA 13mm 350w`) tiene esta historia:

| mov. id | tipo | `costo_base` | `moneda_origen` | `cotizacion_aplicada` | fecha |
|---|---|---|---|---|---|
| 123 | `AJUSTE_INICIAL` (alta desde el pedido) | `66.24` | — | — | 2026-08-20 20:09:20.402 |
| 124 | `INGRESO` (recepción del pedido 21) | `96710.40` | `USD` | `1460.0000` | 2026-08-20 20:09:20.408 |
| 138 | `AJUSTE_INICIAL` (**el jefe entró a Productos y lo corrigió a mano**) | `96710.40` | — | — | 2026-08-20 23:09:56 |

Entre las 20:09 y las 23:09 ese producto tuvo la ficha en `66.24` y el último ingreso real en `96710.40`. **Nada lo señalaba.** Se arregló porque el jefe se acordó de ir a mirar. Ese trabajo manual es exactamente lo que este change elimina.

## What Changes

- **Un panel de revisión de costos dentro de la sección Productos** (no una sección nueva del menú — pedido explícito del usuario), que lista **sólo** los productos de Herramientas donde `productos.costo_producto` difiere del `costo_base` del último movimiento real de tipo `INGRESO`/`AJUSTE_INICIAL`. El criterio es **la comparación de los números**, no el origen del movimiento: da igual si vino de un pedido confirmado o de una edición manual de stock.
- **Cada fila muestra el contraste completo**: nombre del producto, proveedor (si tiene), fecha del último ingreso, **costo de la ficha vs. costo del último ingreso**, y **precio actual vs. precio que resultaría** de recalcular con el `% de ganancia` ya cargado en el producto — el mismo cálculo que ya hace `ProductoServiceImpl.calcularPrecioSiAplica()` sobre `CostoCalculator`. Como línea secundaria, la fila muestra además el **costo unitario final** (actual → resultante), que es lo que explica por qué el precio nuevo es el que es (resolución de la OQ2). El click no es a ciegas: el número que va a quedar se ve antes de apretar.
- **Dos acciones por fila, de un click:**
  - **"Actualizar"** — aplica `costoProducto = costo_base del último ingreso` y deja que el backend recalcule `precio` con la fórmula estándar. **No se agrega ningún endpoint de escritura nuevo**: se reusa el `PUT /api/productos/{id}` que ya usa el formulario de producto, con el mismo servicio, la misma validación y el mismo registro de `MovimientoStock` (ver Decisión 5).
  - **"Descartar"** — saca la fila de la lista sin tocar ni el costo, ni el precio, ni ningún otro dato de negocio del producto. El usuario decidió a propósito no actualizar esta vez.
- **"Descartar" no es un "resuelto" permanente, y el mecanismo ya está decidido.** El descarte **persiste el `id` del movimiento de ingreso que el usuario acaba de revisar**, en una sola columna nullable nueva (`productos.movimiento_revision_descartado_id`), y la consulta oculta el producto sólo mientras ése siga siendo su último ingreso. Semántica literal: *"ya revisé este ingreso"*. Cuando llega un ingreso **nuevo** —otra compra, a cualquier costo— su `id` es distinto y **la fila vuelve a aparecer sola**, sin ninguna lógica extra. El marcador además se auto-limpia: editar el producto genera un movimiento nuevo y lo deja inerte. Esto resuelve la **Open Question 1**, decidida explícitamente por el usuario (opción C); las opciones de no persistir nada o de persistir el par de costos quedaron **descartadas** (ver Decisión 11 de `design.md`).
- **Sólo Herramientas.** Vivero no tiene el concepto de costeo por proveedor: sus 5 productos no tienen costo cargado ni panel de costos en el formulario. El panel se filtra por la unidad de negocio activa, con el mismo mecanismo (`UnidadNegocioContextHolder` en el backend, `unidadNegocioActiva === '2'` en el frontend) que ya usan el filtro por proveedor y las columnas de costo de `Productos.jsx`.
- **Fuera de alcance, explícito:** no se toca la fórmula de costeo (`CostoCalculator` no se modifica **en ninguna línea**); no se cambia la Decisión 6 de `herramientas-pedidos-proveedores` (confirmar un pedido **sigue sin** pisar `costoProducto`/`precio` por sí solo — este panel es el paso manual explícito que el usuario dispara después); no se recalculan retroactivamente movimientos ya registrados; no se toca la `@Formula` `Producto.costoUnitarioHistorico` (ver Riesgo R2); no se agrega ninguna acción masiva del tipo "actualizar todos"; no se toca ventas, cheques, cuentas corrientes, pedidos, bandejas ni siembras.

## Capabilities

### New Capabilities

- `revision-costos-productos`: la capacidad de **detectar y resolver la desalineación entre el costo de la ficha del producto y el costo del último ingreso real**. Cubre el criterio exacto de detección (qué movimiento cuenta como "el último ingreso", cómo se comparan los importes, qué pasa con nulos, ceros y monedas distintas), qué información expone cada fila, qué hace exactamente cada una de las dos acciones y qué garantiza que "descartar" no oculte una diferencia futura. Hoy no existe ninguna spec sobre esto: `costeo-productos` define **cómo se calcula** un costo, no **cómo se detecta que la ficha quedó vieja**.

### Modified Capabilities

- `frontend-productos`: la sección Productos suma el panel de revisión de costos —dónde vive, cuándo se muestra, cuándo desaparece y cómo se comporta en Vivero—. Se agregan requisitos nuevos; **no se modifica ni se renombra ningún requisito existente**, para no chocar con los deltas todavía sin archivar de `config-costeo-por-proveedor` sobre esta misma capability (ver Impact).

## Impact

**Nivel de gobernanza: MEDIA.** Deliberadamente **un escalón por debajo** de `costeo-flexible-por-producto` y `config-costeo-por-proveedor` (ambos MEDIA-ALTA): este change **no toca la fórmula de cálculo en absoluto**. Sólo lee un valor ya calculado y congelado, y ofrece copiarlo a `costoProducto` por el mismo camino que hoy usa una edición manual en `ProductoForm.jsx`. No hay checkpoint obligatorio de fórmula.

**Sí hay un checkpoint liviano, y es antes de escribir código, no después:** el grupo 4 de `tasks.md` exige mostrarle al usuario el **criterio exacto de detección corriendo sobre los productos reales de la línea de base** (qué filas aparecen, cuáles no, y por qué), y confirmar que coincide con lo que él espera ver, antes de cablear la acción "Actualizar". Sigue siendo dinero y precio de venta al público: una fila de más que el usuario aprieta sin pensar le mueve un precio.

**Línea de base real, ya medida (`vivero-postgres`, `vivero_db`, 2026-08-21):**

| Dato | Valor verificado |
|---|---|
| Productos de **Herramientas** (`unidad_negocio_id=2`, no borrados) | **11** |
| Productos de **Vivero** | 5 |
| Productos de Herramientas con `moneda_costo = 'USD'` | **0** (los 11 están en `ARS`) |
| Productos de Herramientas **con diferencia hoy** entre `costo_producto` y `costo_base` del último ingreso | **0 — la lista arranca vacía** |
| Movimientos con `fecha IS NULL` | 0 |
| Tipos de movimiento en base | `AJUSTE_INICIAL` 45 · `INGRESO` 19 · `VENTA` 27 · `EGRESO` 2 |
| `UnidadNegocio` Herramientas | `iva_porcentaje = 21.00`, `costo_envio_porcentaje = 5.00` |

> ⚠️ **La lista arranca vacía, y eso es información, no un problema.** Los 11 productos coinciden hoy **al centavo** porque el jefe ya hizo a mano el trabajo que este panel automatiza (ver la historia del producto 31 en el *Why*). Consecuencia práctica para la implementación: **el estado vacío del panel no es un caso de borde, es el estado normal el día 1**, y hay que diseñarlo bien. Y las tareas de verificación no pueden apoyarse en datos que ya existan: hay que **fabricar** la diferencia (grupo 1 de `tasks.md`) confirmando un pedido a un costo distinto del de la ficha, que es justamente el flujo real que la genera.

**Backend — código que se toca**

- `repositories/ProductoRepository.java`: **una** query nativa nueva (patrón `LATERAL` / último movimiento por producto, hermano del que ya usan `sumarCostoInventario` y `findResumenPorProveedor`), con `LIMIT` explícito — regla dura 6, sin `findAll()` sin límite.
- `services/ProductoService.java` + `services/impl/ProductoServiceImpl.java`: un método de lectura nuevo que arma las filas del panel. **`calcularPrecioSiAplica()` y `actualizarProducto()` no se modifican**: se reusan tal cual.
- `dto/`: un DTO nuevo de sólo lectura para la fila del panel (regla dura 5 — nunca la entidad).
- `controllers/ProductoController.java`: **un** endpoint `GET` nuevo bajo `/api/productos`, con `@PreAuthorize("hasAuthority('LEER_STOCK')")`, igual que el resto del controller.
- **Ningún endpoint de escritura nuevo para "Actualizar"** (Decisión 5). **"Descartar" sí** agrega la única escritura nueva del change: un endpoint propio con `@PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")` que sella el `id` del ingreso revisado en `models/Producto.java`, con una columna nullable nueva (`movimiento_revision_descartado_id`, creada por `ddl-auto=update`, sin `ALTER TABLE` a mano — mismo criterio que los dos changes anteriores).

**Backend — código que se lee pero NO se modifica**

- `services/CostoCalculator.java`: **cero cambios.** Contrato de no-regresión del change.
- `models/MovimientoStock.java`, `services/impl/MovimientoStockServiceImpl.java`, `services/impl/PedidoServiceImpl.java`, `services/impl/VentaServiceImpl.java`.
- `models/Producto.java`: **el único cambio permitido es la columna nullable del marcador de descarte**. La `@Formula` `costoUnitarioHistorico` **no se toca en ninguna línea** (ver Riesgo R2 y la resolución de la OQ3 en `design.md`).

**Frontend**

- `pages/Productos.jsx`: el panel/franja, arriba de la grilla, visible sólo con `unidadNegocioActiva === '2'` y sólo cuando hay filas.
- `components/` : un componente nuevo en PascalCase para el panel (regla dura 7), con `cursor-pointer` en los dos botones, iconos de `lucide-react` y feedback vía `useUIStore` (`pushToast`/`denyAccess`) — nunca `alert`/`confirm`.
- `api/productos.api.js`: los métodos del endpoint nuevo. `ProductoForm.jsx` **no se toca**.

**Base de datos**

- Sin migración de datos y sin backfill. **Una** columna nullable nueva: `productos.movimiento_revision_descartado_id BIGINT`, sin FK declarada y sin valor por defecto (`null` = "nunca se descartó nada", que es el estado de partida correcto para las 16 filas existentes). La crea `ddl-auto=update` al arrancar el backend.

**Sin impacto**

- El negocio **Vivero**: el panel no se renderiza y el endpoint devuelve lista vacía para `unidad_negocio_id=1`.
- Ventas, cheques, cuentas corrientes, pedidos, bandejas, siembras y remitos: funcionalmente intactos. Las ventas ya registradas **no se tocan** — cada `VentaDetalle` congeló su propio `costoUnitarioHistorico` al momento de vender.

**Dependencias de orden — ninguna bloqueante**

Este change es **standalone**. `config-costeo-por-proveedor` está implementado (91/99 tareas) pero **todavía sin archivar**, y este change **no depende de que se archive**: el código que necesita leer (`Producto.proveedor`, `Producto.monedaCosto`, `MovimientoStock.monedaOrigen`/`cotizacionAplicada`) ya está en el repo y en la base. El único cuidado es de specs, y ya está tomado: el delta de `frontend-productos` de este change **sólo agrega** requisitos, mientras que el de `config-costeo-por-proveedor` renombra y modifica el requisito `Filtrado por Marca en Herramientas`. Los dos deltas se aplican en cualquier orden sin colisionar.
