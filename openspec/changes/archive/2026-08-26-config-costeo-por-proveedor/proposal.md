## Why

En el negocio **Herramientas** cada proveedor tiene su propio conjunto de reglas de costeo, y hoy el sistema no las conoce: el jefe las tiene en la cabeza y las vuelve a tipear producto por producto, compra por compra. En sus palabras:

> "Viendo esas tablas ahora podemos deducir que cada proveedor tiene sus descuentos y sus impuestos; por ejemplo shimura es el único que a veces se maneja en dólares, los demás no. Además shimura es el único que maneja el IVA aparte ya que a veces es 21 a veces 10.5, los demás proveedores ya tienen el IVA incluido en su precio. Además ingco tiene más de un descuento y demás. En conclusión, ahora es mucho más fácil porque ya sabemos que las marcas y los proveedores son lo mismo y que cada proveedor tiene sus reglas las cuales podemos configurar de una vez."

La evidencia no es una hipótesis: es **su planilla real de Google Sheets** (`img/shimura.png`, `img/ingco.png`, `img/extrapower.png`), y sus pestañas se llaman literalmente `shimura`, `INGCO`, `EXTRA POWER`, `DUROLL`, `scala`. Una pestaña por proveedor, y cada pestaña con **columnas distintas** porque cada proveedor cotiza distinto:

| Proveedor | Columnas de su pestaña | Fórmula verificada al centavo contra la planilla |
|---|---|---|
| **Shimura** | `precio · dolar · IVA · envio · precio costo` | `costo = precio × dolar × IVA × envio` — fila 6: `66,24 × 1460 × 1 × 1,05 = 101.545,92` ✅ |
| **Ingco** | `precio · iva · des1 · des2 · flete · costo` | `costo = precio × 1 × des1 × des2 × flete` — fila 6: `3415,41 × 0,7 × 0,79 × 1,05 = 1.983,16` ✅ |
| **Extra Power** | `precio · desc · envio · precio costo` | `costo = precio × desc × envio` — fila 3: `1.221,45 × 0,874 × 1,05 = 1.120,92` ✅ |

Cuatro huecos concretos contra el modelo actual:

1. **El proveedor no tiene ninguna configuración de costeo.** `Proveedor` (que nació en `herramientas-pedidos-proveedores`) es un ABM de tres campos: `nombre`, `telefono`, `contacto`. No sabe si maneja IVA aparte, si cotiza en dólares, qué descuentos hace ni cuánto cobra de flete. Todo eso se vuelve a tipear en cada producto y en cada pedido.
2. **"Marca" y "Proveedor" son dos entidades para la misma cosa.** En la base real de Herramientas hay 4 marcas —`INGCO`, `EXTRA POWER`, `DUROLL`, `SHIMURA`— y esas son exactamente las pestañas de su planilla. `SHIMURA` existe hoy **dos veces**: como `Marca id=4` y como `Proveedor id=4`. El jefe tiene que mantener dos catálogos paralelos que significan lo mismo.
3. **No existe el concepto de moneda ni de cotización.** Es 100% nuevo: no hay ni un campo de dólar en todo el modelo. Hoy, para cargar el taladro Shimura de USD 66,24, el jefe multiplica a mano por la cotización del día y carga el resultado como si fuera un precio en pesos — y esa conversión queda perdida.
4. **Un producto creado desde un pedido nace huérfano de proveedor.** Verificado en base: de los 10 productos de Herramientas, los **2** sin marca (`Masa`, `prueba de pedido`) son exactamente los que nacieron por el flujo de "producto pendiente" de un pedido. El pedido **sabe** de qué proveedor vino y no se lo pasa al producto.

Por qué ahora: `costeo-flexible-por-producto` acaba de construir el motor —lista libre de descuentos en cascada, IVA y envío por producto con fallback a la unidad, y un `CostoCalculator` único. Lo que falta es que **alguien cargue esos valores sin tipearlos de memoria**. Este change no reemplaza ese motor: le pone adelante la capa que el jefe describió, la que hace que elegir un proveedor complete solo lo que hoy completa a mano.

## What Changes

- **El `Proveedor` pasa a tener un perfil de costeo configurable**, cargado una vez en la configuración de Herramientas: si el IVA viene **aparte o ya incluido en el precio de lista**, cuál es su IVA más frecuente, si cotiza **en dólares**, qué **descuentos** hace (con nombre, varios, en cascada — el mismo modelo que ya usa el producto) y cuál es su **porcentaje de envío/flete**. Son **valores por defecto que se copian una sola vez**, no reglas vivas: se ofrecen precargados, se pueden pisar siempre, y **modificar el perfil de un proveedor no reprecifica ningún producto ya cargado**. El fallback de costeo sigue teniendo dos niveles —producto → unidad de negocio—; el proveedor **no** es un tercer nivel.
- **Se unifica "marca" con "proveedor" en Herramientas.** `Producto.marcaId` pasa a `Producto.proveedorId`. Es una **migración de datos real** sobre productos existentes, resuelta por nombre normalizado y con línea de base ya medida (ver Impact). Los 2 productos que hoy no tienen marca **quedan sin proveedor** y el usuario se los asigna a mano después. El negocio **Vivero** no se ve afectado en absoluto: tiene 0 productos con marca. La pestaña "Marcas" de Configuración **se esconde**, pero el componente, el controller y los endpoints **quedan en el repo** como red de rollback.
- **Se introduce la moneda y la cotización.** Una línea de compra puede estar expresada en dólares; la conversión a pesos es el **paso 0** de la cadena de costeo, antes de descuentos, IVA y envío — confirmado al centavo contra la fila 6 de la planilla de Shimura. La cadena existente no se toca: con una línea en pesos, la fórmula colapsa **exactamente** en la de hoy. **La moneda es un dato estable del producto; la cotización NO.** La cotización se tipea o se confirma en **cada pedido**: el proveedor guarda como mucho la última usada con su fecha, como ayuda de tipeo prellenada, y **nunca se aplica sola a ninguna operación**. Si falta la cotización y hay líneas en dólares, la confirmación de recepción **falla**.
- **Elegir el proveedor al armar un pedido precarga sus valores por defecto** en las líneas del pedido —descuentos, IVA, envío, moneda— con la posibilidad de modificarlos ítem por ítem, que es literalmente lo que el jefe pidió.
- **Un producto creado desde la recepción de un pedido nace con su proveedor ya asignado**, tomado del pedido, en vez de nacer huérfano como hoy.
- **El filtro de la sección Productos pasa de "marca" a "proveedor"**, reemplazando el actual (no coexistiendo con él).
- **Fuera de alcance, explícito:** no se importa ningún catálogo de proveedor por Excel (sigue descartado en el Backlog del roadmap); no se reescribe el `CostoCalculator` más allá de agregarle el paso de conversión de moneda; no se reabre ninguna de las 14 decisiones de `costeo-flexible-por-producto`; no se modelan descuentos a nivel de cabecera de `Pedido` (Decisión 14 de ese change, descartada explícitamente por el usuario); no se cambia la unidad canónica de los porcentajes (se siguen guardando como porcentaje, no como multiplicador); no se modela ningún flete fijo por pedido prorrateado (sería un change aparte); no se recalculan retroactivamente los `MovimientoStock` ya registrados; no se borra `Marca` ni sus endpoints; no se toca ventas, cheques, cuentas corrientes, bandejas ni siembras.
- **Ya resuelto por separado, NO es parte de este change:** el arreglo de datos del IVA al 21%. La unidad Herramientas tiene `iva_porcentaje = 21.00` por defecto y los 8 productos de Ingco / Extra Power / Duroll —que ya traen el IVA incluido en el precio— lo estaban heredando de más. **El usuario lo autorizó y ya se ejecutó en la base real:** esos 8 productos tienen hoy `iva_porcentaje = 0` explícito (verificado en base el 2026-08-20). **No queda ninguna tarea pendiente sobre esto** y `tasks.md` no tiene ningún grupo que lo aborde; se menciona sólo porque (a) confirma que el patrón "flag + `0` explícito" que este change automatiza ya funciona en producción, y (b) la línea de base del grupo 1 hay que sacarla sobre la base **como está hoy**, ya corregida.

> ✅ **Las 11 Open Questions de este change están RESUELTAS.** Cuatro las decidió el usuario explícitamente —unificar `Marca` con `Proveedor`; la cotización se carga en cada pedido y el proveedor sólo sugiere la última usada; los defaults del proveedor se copian una sola vez y no se heredan en vivo; y la pestaña "Marcas" se esconde sin borrar el código— y las siete restantes quedaron por la recomendación documentada, sin objeción. `design.md` registra las 11 en la sección *Open Questions — resueltas*, y los specs de este change están alineados con ellas. **El change está listo para implementar; ninguna tarea debe replantearlas como abiertas.**

## Capabilities

### New Capabilities

- `configuracion-proveedores`: el proveedor como **perfil de costeo configurable** de la unidad de negocio Herramientas — qué campos lo componen (tratamiento del IVA, moneda, lista de descuentos por defecto, envío), qué significa que sean "valores por defecto", cómo se propagan a productos y pedidos y qué pasa cuando cambian. Hoy no existe ninguna spec de esto: `gestion-proveedores` cubre sólo el ABM de nombre/teléfono/contacto.
- `moneda-cotizacion`: el concepto de **precio de lista en una moneda distinta del peso y su cotización** — dónde entra en la cadena de costeo, de quién es el dato (del producto, del pedido o del proveedor), qué se congela en el histórico y qué pasa con un producto en dólares cuando no hay cotización informada. Es 100% nuevo en el sistema.

### Modified Capabilities

- `costeo-productos`: la cadena canónica de costo suma un **paso 0 de conversión de moneda** antes del costo base, y el proveedor aparece como origen de los valores por defecto que hoy sólo pueden venir escritos a mano en el producto. La cadena existente (descuentos en cascada → IVA y envío en cadena sobre el neto, corregido 2026-08-22 tras verificar contra Shimura — ver spec de `costeo-productos`) **no cambia por este change**.
- `catalogo-productos`: el producto de Herramientas deja de vincularse a una `Marca` y pasa a vincularse a su `Proveedor`, y suma la moneda de su precio de lista.
- `frontend-productos`: el filtro por marca de la sección Stock pasa a ser un filtro por proveedor, y el formulario de producto muestra el proveedor en lugar de la marca.
- `gestion-proveedores`: el ABM de proveedores deja de ser tres campos y pasa a incluir el perfil de costeo; la pantalla vive dentro de la configuración del negocio Herramientas.
- `pedidos-proveedores`: elegir el proveedor precarga sus valores por defecto en las líneas del pedido, y la creación diferida de producto al confirmar la recepción pasa a asignarle el proveedor del pedido.
- `gestion-marcas`: la marca deja de ser el vínculo de catálogo de los productos de Herramientas y su sección de configuración deja de ofrecerse, **sin que se borren la entidad, el ABM ni los endpoints** — quedan como red de rollback de la unificación.

## Impact

**Nivel de gobernanza: MEDIA-ALTA.** Mismo criterio que `herramientas-pedidos-proveedores` y `costeo-flexible-por-producto`, por **dos** motivos acumulados:

1. **Vuelve a tocar la fórmula de costeo.** Agrega el paso de conversión de moneda al `CostoCalculator`, cuyo resultado se congela en `MovimientoStock.costoUnitario` y, vía la `@Formula` `Producto.costoUnitarioHistorico`, es el costo de referencia del producto. Una cotización mal ubicada en la cadena, o aplicada a una línea que estaba en pesos, no rompe ninguna pantalla ni tira ninguna excepción: multiplica el costo por 1.460 en silencio y el movimiento es inmutable.
2. **Hace una migración de datos real sobre productos existentes.** Reasigna la referencia de catálogo de 8 productos vivos de `Marca` a `Proveedor`.

**Cualquier grupo de tareas que reescriba el `CostoCalculator` o migre la referencia `Marca`→`Proveedor` de productos existentes requiere checkpoint explícito del usuario ANTES de escribir código**, mostrando la fórmula resultante y la tabla de migración con números concretos sobre los productos reales de la línea de base. No alcanza con aprobar al pasar.

**Línea de base real, ya medida contra la base de datos (`vivero-postgres`, 2026-08-20)** — esto acota el riesgo de la migración a algo enumerable:

| Dato | Valor verificado |
|---|---|
| Productos de **Vivero** | 5, de los cuales **0 tienen marca** → Vivero **no usa `Marca` en absoluto** |
| Productos de **Herramientas** | 10, de los cuales **8 tienen marca** y 2 no |
| Marcas de Herramientas | `INGCO` (3 productos), `EXTRA POWER` (4), `DUROLL` (1), `SHIMURA` (0) |
| Proveedores activos | **1**: `SHIMURA` (id 4). Otros 3 son `TEST-*` dados de baja |
| Coincidencia por nombre `Marca` ↔ `Proveedor` | Sólo `SHIMURA`. `INGCO`, `EXTRA POWER` y `DUROLL` hay que **crearlos** como proveedores |
| Productos sin marca en Herramientas | `id=19 Masa`, `id=22 prueba de pedido` — ambos nacidos del flujo de "producto pendiente" de un pedido |
| `UnidadNegocio` Herramientas | `costo_envio_porcentaje = 5.00`, `iva_porcentaje = **21.00**` |
| `producto_descuentos` | 8 filas, todas `nombre = "Proveedor"`, una por producto con descuento (migradas por `costeo-flexible-por-producto`) |
| `iva_porcentaje` de los productos | Los **8 productos con marca** tienen `0.00` **explícito** (arreglo de datos ya ejecutado, ajeno a este change); los 2 sin marca siguen en `NULL` |

**La migración toca exactamente 8 filas de `productos` y crea 3 filas de `proveedores`.** Es completamente enumerable y reversible.

**Backend — código existente que se toca**

- `models/Proveedor.java`: los campos del perfil de costeo y la relación con su lista de descuentos por defecto.
- `models/Producto.java`: la referencia a `Proveedor` y la moneda de su precio de lista.
- `models/Pedido.java` / `models/PedidoDetalle.java`: la cotización de la compra y los valores efectivamente pactados por línea.
- `models/MovimientoStock.java`: columnas nuevas para congelar la moneda y la cotización aplicadas.
- `services/CostoCalculator.java`: **el corazón del change.** Suma el paso 0 de conversión. Su contrato actual (5 valores de desglose) se amplía, no se rompe.
- `frontend/src/utils/costeo.js`: la réplica en JS del mismo paso, para que el formulario siga coincidiendo al centavo con lo que persiste el backend.
- `services/impl/ProveedorServiceImpl.java` + `dto/ProveedorDTO.java`: hoy tienen 3 campos; pasan a mapear el perfil completo.
- `services/impl/PedidoServiceImpl.java`: `confirmarRecepcion()` pasa a asignarle el proveedor del pedido al producto que crea (hoy lo crea sin proveedor ni marca), y `crear()`/`actualizar()` a persistir lo pactado por línea.
- `services/impl/ProductoServiceImpl.java`, `dto/ProductoDTO.java`, `repositories/ProductoRepository.java`: `marcaId`/`marcaNombre` → `proveedorId`/`proveedorNombre`.

**Backend — código que queda pero deja de usarse en Herramientas**

- `models/Marca.java`, `MarcaController`, `MarcaService(Impl)`, `MarcaRepository`, `MarcaDTO`: **no se borran ni se modifican** — red de rollback de la unificación (OQ1 + OQ10, resueltas). Los endpoints `/api/marcas` siguen respondiendo. La columna `productos.marca_id` tampoco se dropea y conserva su valor original.

**Frontend**

- `components/ProveedorForm.jsx`: hoy 3 inputs; pasa a ser el formulario del perfil de costeo completo.
- `pages/Proveedores.jsx` y `pages/Configuracion.jsx`: el ABM de proveedores pasa a vivir dentro de la configuración de Herramientas (pedido textual del usuario).
- `pages/Productos.jsx`: los tabs de filtro (líneas 93-105 y 155-180, hoy derivados client-side de `p.marcaNombre`) pasan a derivarse de `p.proveedorNombre`.
- `components/ProductoForm.jsx`: el `<select>` de marca pasa a ser de proveedor; se suma la moneda del precio de lista y el botón de "traer los valores del proveedor".
- `components/PedidoForm.jsx`: al elegir proveedor se precargan sus defaults; se suma la cotización cuando hay líneas en dólares.
- `components/ConfiguracionMarcas.jsx`: **no se modifica.** Sólo deja de renderizarse su pestaña desde `Configuracion.jsx` (OQ10, resuelta: esconder, no borrar).

**Base de datos**

- Columnas nuevas en `proveedores`, `productos`, `pedidos`, `pedido_detalles` y `movimientos_stock`, más una tabla de descuentos por defecto del proveedor. `ddl-auto=update` las crea al arrancar, **sin `ALTER TABLE` manual** — mismo criterio de diseño que el change anterior.
- **Sí hay migración de datos**: 8 productos cambian de referencia de catálogo y se crean 3 proveedores. Tiene tareas de verificación propias.

**Sin impacto**

- El negocio **Vivero**: 0 productos con marca, 0 proveedores, no ve el panel de costos ni la sección Pedidos. Sus 5 productos calculan exactamente el mismo costo que hoy.
- Ventas, cheques, cuentas corrientes, bandejas, siembras y remitos quedan funcionalmente intactos.

**Dependencia de orden — ya satisfecha**

`costeo-flexible-por-producto` está **implementado y archivado** en `openspec/changes/archive/2026-08-20-costeo-flexible-por-producto/`, y `openspec/specs/costeo-productos/spec.md` existe. Los deltas de `costeo-productos` de este change ya encuentran su spec base. La tarea 1.1 se reduce a confirmarlo.
