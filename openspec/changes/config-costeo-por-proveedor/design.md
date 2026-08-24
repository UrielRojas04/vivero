> ### ⚠️ Gobernanza: **MEDIA-ALTA** — toca la fórmula de costo **y** migra datos de productos existentes
>
> Dos motivos acumulados, no uno:
>
> 1. **Vuelve a tocar la cadena de costeo.** Agrega un paso de conversión de moneda **antes** del costo base. El resultado se congela en `MovimientoStock.costoUnitario` y, vía la `@Formula` `Producto.costoUnitarioHistorico`, es el costo de referencia del producto. Una cotización aplicada a una línea que estaba en pesos no rompe ninguna pantalla ni tira ninguna excepción: **multiplica el costo por 1.460 en silencio**, y el movimiento es inmutable por diseño.
> 2. **Migra datos reales.** Reasigna la referencia de catálogo de **8 productos vivos** de `Marca` a `Proveedor` y crea 3 proveedores nuevos. Un producto que quede sin proveedor, o apuntando al proveedor equivocado, arrastra defaults equivocados a su próxima compra.
>
> **El grupo 6 (paso de moneda en `CostoCalculator`) y el grupo 9 (migración `Marca`→`Proveedor`) requieren checkpoint explícito del usuario ANTES de escribir el código, no después.** Se le muestra la fórmula exacta resultante con números sobre los productos reales de la línea de base del grupo 1, y la tabla de migración producto por producto (son 8, caben en una pantalla). No alcanza con aprobar al pasar.
>
> **Contrato de no-regresión de todo el change:** un producto de Herramientas en **pesos** tiene que dar **el mismo centavo** que hoy con la cadena nueva. El paso de moneda con cotización 1 es la identidad; si algún producto se corre un centavo, se detiene y se revisa — no se avanza con una diferencia "chica".
>
> ### ✅ Las 11 Open Questions de este change están **RESUELTAS**
>
> Igual que `costeo-flexible-por-producto`, este change llega a `apply` con sus preguntas cerradas (sección *Open Questions — resueltas*). **Cuatro las decidió el usuario explícitamente** —OQ1 (unificar `Marca` con `Proveedor`), OQ2 (la cotización se carga en cada pedido), OQ3 (los defaults del proveedor se copian una sola vez) y OQ10 (esconder la pestaña "Marcas" sin borrar el código)—; **las siete restantes** (OQ4, OQ5, OQ6, OQ7, OQ8, OQ9, OQ11) quedaron por la recomendación documentada, sin objeción. Los specs de este change ya estaban escritos contra esas recomendaciones y **quedaron alineados con las 11 resoluciones**: no hace falta re-sincronizarlos.
>
> **Ninguna tarea de `tasks.md` debe volver a plantear estas preguntas como abiertas.**

## Context

### El pedido, en palabras del usuario

> "Viendo esas tablas ahora podemos deducir que cada proveedor tiene sus descuentos y sus impuestos; por ejemplo shimura es el único que a veces se maneja en dólares, los demás no. Además shimura es el único que maneja el IVA aparte ya que a veces es 21 a veces 10.5, los demás proveedores ya tienen el IVA incluido en su precio. Además ingco tiene más de un descuento y demás. En conclusión, ahora es mucho más fácil porque ya sabemos que las marcas y los proveedores son lo mismo y que cada proveedor tiene sus reglas las cuales podemos configurar de una vez (con la posibilidad de editarlas luego pero a lo que me refiero es a que esas configuraciones van a ser sus valores por defecto). Quiero que dentro de configuración del negocio Herramientas ahora se pueda crear proveedores con sus características: si tiene IVA aparte o incluido en el precio, si maneja sus precios en dólares, cuál es la cotización, cuál es el IVA, cuántos descuentos tiene, cuáles son, el costo de envío. Ya teniendo los proveedores cargados y configurados solo nos queda elegir el proveedor al hacer el pedido y esas configuraciones van a aparecer por defecto con la posibilidad de modificarlas obviamente. Luego de verificar que hayan llegado los ítems del pedido y al pasarlos a productos estos ya van a tener su 'marca' que en realidad va a ser su proveedor, también los filtros de búsqueda en la sección productos ahora van a ser los proveedores."

### La evidencia: su planilla real, leída y verificada al centavo

Tres capturas de Google Sheets (`img/shimura.png`, `img/ingco.png`, `img/extrapower.png`) del archivo *"lista 2026 ok"*. Las pestañas del archivo son `shimura · TOTAL · INGCO · EXTRA POWER · DUROLL · pedido · scala`. **Una pestaña por proveedor**, y cada pestaña con columnas distintas. Esto no es una interpretación: es la estructura literal de su fuente de verdad.

**Shimura** — columnas `precio | dolar | IVA | envio | precio costo`:

| Fila | artículo | precio | dolar | IVA | envio | precio costo | verificación |
|---|---|---|---|---|---|---|---|
| 2 | destornillador phillips | 1972 | 1 | 1 | 1 | 1972 | `1972 × 1 × 1 × 1` ✅ |
| 6 | taladro de banco SHIMURA 13mm | **66,24** | **1460** | 1 | 1,05 | 101.545,92 | `66,24 × 1460 × 1 × 1,05 = 101.545,92` ✅ |
| 7 | escalera shimura aluminio 4.70m | 121.677,19 | 1 | **1,21** | 1,05 | 154.590,87 | `121677,19 × 1,21 × 1,05` ✅ |
| 12 | aparejo electrico 250kg ISSEI | 128.115 | 1 | **1,105** | 1 | 141.567,08 | `128115 × 1,105` ✅ |

Tres hechos que la fila 6 prueba sola: **(a)** la conversión de moneda es el **primer** factor de la cadena, antes de IVA y envío; **(b)** `dolar` no es un flag proveedor-wide — es 1 en 23 de 24 filas y 1460 en una; **(c)** ese ítem puntual tiene precio de lista **66,24**, un número que sólo tiene sentido como **dólares**, no como pesos. Y las filas 7 y 12 prueban que el **IVA de Shimura varía por producto** (1 / 1,21 / 1,105), no es un valor único del proveedor.

**Ingco** — columnas `precio | iva | des1 | des2 | flete | costo`:

| Fila | artículo | precio | iva | des1 | des2 | flete | costo | verificación |
|---|---|---|---|---|---|---|---|---|
| 6 | cutter 18mmx100mm | 3.415,41 | 1 | 0,7 | 0,79 | 1,05 | 1.983,16 | `3415,41 × 0,7 × 0,79 × 1,05 = 1.983,16` ✅ |
| 16 | *(fila naranja: **"nuevo cargamento"**, repite los encabezados)* | | | | | | | |
| 17 | juego de torres 2t | 77.195,81 | 1 | **0,65** | 0,79 | 1,05 | 41.622,05 | des1 cambió de 0,7 a 0,65 |
| 29 | alicate punta larga 6en1 | 24.580,4 | 1 | **0,6** | 0,79 | 1,05 | 12.233,67 | des1 distinto **dentro del mismo cargamento** |

Dos hechos: **(a)** `iva = 1` siempre → Ingco factura con IVA incluido, exactamente lo que dijo el usuario; **(b)** los descuentos **cambian entre compras** (fila 16, "nuevo cargamento": 0,7 → 0,65) **y también entre productos de la misma compra** (fila 29: 0,6). El segundo hallazgo es nuevo y no estaba en el briefing.

**Extra Power** — columnas `precio | desc | envio | precio costo`:

| Fila | artículo | precio | desc | envio | precio costo | verificación |
|---|---|---|---|---|---|---|
| 3 | cinta enmascarar 12mm | 1.221,45 | **0,874** | 1,05 | 1.120,92 | `1221,45 × 0,874 × 1,05 = 1.120,92` ✅ |
| 17 | aceitera metalica | 6.000,00 | **0,8075** | 1,05 | 5.087,25 | `6000 × 0,8075 × 1,05 = 5.087,25` ✅ |

Sin columna de IVA → IVA incluido. Y de nuevo: **el descuento varía por producto dentro del mismo proveedor** (0,874 para las filas 2-16, 0,8075 desde la 17). **Corrección del usuario (tarea 2.3 de `tasks.md`):** ninguno de esos dos números es una cascada de dos descuentos — son un único descuento real de **10%** con el 5% de envío mezclado adentro por error de la propia planilla del usuario (el envío ya tenía su propia columna aparte, `1,05`). Extra Power queda entonces con un solo descuento (10%), sin nada que desarmar (OQ9, resuelta: se desarman sólo los casos que realmente combinan dos descuentos, nunca mezclando envío dentro de un descuento).

**Y un detalle de notación que importa mucho para la UI:** en las tres pestañas los descuentos están escritos como **multiplicadores** (`0,7` = 30% de descuento; `0,874` = 12,6%), y los recargos también (`1,05` = 5% de envío; `1,21` = 21% de IVA). El sistema, en cambio, guarda y muestra **porcentajes** — y sigue haciéndolo (OQ8, resuelta: el porcentaje es canónico, con la equivalencia en multiplicador mostrada al lado del input). Ver Decisión 11.

### Estado real de la base de datos (`vivero-postgres`, 2026-08-20)

```
productos por unidad          Vivero: 5 productos,  0 con marca   ← Vivero NO usa Marca
                        Herramientas: 10 productos, 8 con marca

marcas (todas unidad 2)   INGCO (3 productos) · EXTRA POWER (4) · DUROLL (1) · SHIMURA (0)
proveedores activos       SHIMURA (id 4, unidad 2)   ← el único; los otros 3 son TEST-* deleted
                          (nota: proveedor id=1 tiene unidad_negocio_id NULL — dato sucio de una prueba)

unidades_negocio          Vivero:       envio 0.00 · iva NULL
                          Herramientas: envio 5.00 · iva 21.00   ← el IVA por defecto de la unidad

producto_descuentos       8 filas, todas nombre="Proveedor", una por producto con descuento
```

Productos de Herramientas, con su marca y su costeo actual (re-verificado en base el 2026-08-20, **después** del fix de IVA descrito abajo):

| id | nombre | marca | costo | desc. | iva propio | envío propio |
|---|---|---|---|---|---|---|
| 1 | Pala corazón | INGCO | 15.000,00 | 1,20 | **0,00** *(explícito)* | *(hereda)* |
| 2 | Pala ancha | INGCO | 22.233,00 | 0,80 | **0,00** *(explícito)* | *(hereda)* |
| 3 | Pala pocera | EXTRA POWER | 20.000,00 | 1,00 | **0,00** *(explícito)* | *(hereda)* |
| 4 | Cinta aisladora | INGCO | 2.000,00 | 0,80 | **0,00** *(explícito)* | *(hereda)* |
| 5 | Cinta métrica | DUROLL | 5.000,00 | 1,00 | **0,00** *(explícito)* | *(hereda)* |
| 6 | Pulverizador | EXTRA POWER | 10.000,00 | 1,00 | **0,00** *(explícito)* | *(hereda)* |
| 10 | Membrana | EXTRA POWER | 10.000,00 | 10,00 | **0,00** *(explícito)* | *(hereda)* |
| 12 | Destornillador | EXTRA POWER | 10.000,00 | 0,80 | **0,00** *(explícito)* | *(hereda)* |
| 19 | **Masa** | *(ninguna)* | *(null)* | 0,00 | *(hereda)* | *(hereda)* |
| 22 | **prueba de pedido** | *(ninguna)* | *(null)* | 0,00 | *(hereda)* | *(hereda)* |

Los dos únicos productos sin marca son exactamente los dos que nacieron por el flujo de "producto pendiente" de un pedido. **El pedido sabía de qué proveedor venían y no se lo pasó al producto** — ese es el hueco 4 del proposal, verificado.

### El fix del IVA al 21%: **ya ejecutado, fuera del alcance de este change**

`unidades_negocio.iva_porcentaje` de Herramientas está en **21.00**, y hasta el 2026-08-20 **ningún producto tenía IVA propio** → los 10 heredaban 21%. Eso es correcto para Shimura, pero para Ingco / Extra Power / Duroll —que facturan **con IVA incluido en el precio de lista**— significaba sumarles un 21% que ya estaba adentro del precio.

**El usuario lo autorizó y ya se corrigió en la base real, como arreglo de datos independiente de este change:** a los **8 productos** de esos tres proveedores se les escribió `iva_porcentaje = 0` **explícito** (verificado en base: ids 1, 2, 3, 4, 5, 6, 10 y 12 están en `0.00`; los ids 19 y 22, sin marca, siguen en `NULL`).

Esto **no es una tarea pendiente de este change** y no hay ningún grupo de `tasks.md` que lo aborde. Se documenta acá por dos motivos, ambos útiles para el diseño:

1. **Confirma que el patrón "flag + override explícito" de la Decisión 4 ya se usó y funciona.** El `0` explícito conviviendo con un default de unidad en 21 es exactamente lo que este change va a escribir automáticamente al copiar el perfil de un proveedor con IVA incluido; el precedente ya está en la base.
2. **Corre la línea de base del grupo 1.** Los `costo_unitario` de referencia del contrato de no-regresión son los **posteriores** al fix, no los anteriores. Hay que fotografiar la base **como está hoy**, no reconstruir la de antes.

### El motor que ya existe y que NO hay que reescribir

`costeo-flexible-por-producto` (implementado, pendiente de archivar) dejó:

- `services/CostoCalculator.java` — cadena `base → descuentos en cascada → IVA sobre el neto → envío en cadena sobre el neto+IVA → suma`, equivalente a `neto × (1+IVA%) × (1+envío%)` (corregido 2026-08-22 tras verificar contra la planilla real de Shimura — antes el envío se calculaba en paralelo sobre el mismo neto que el IVA, perdiendo el término cruzado), escala interna 6, redondeo único a 2 al final, y `resolverEfectivo(valorProducto, valorUnidad)` para el fallback de **dos** niveles.
- `frontend/src/utils/costeo.js` — la réplica en JS, misma firma y mismo orden.
- `ProductoDescuento` — lista libre de descuentos **estables** por producto (nombre + porcentaje + orden), en cascada.
- `Producto.ivaPorcentaje` / `Producto.costoEnvioPorcentaje` — nullable, donde `null` = "hereda de la unidad" y `0` = "no aplica". Esa distinción es un invariante y este change **no puede romperla**.
- `MovimientoStock.costoNeto` / `ivaPorcentaje` / `descuentoDetalle` — el desglose congelado.

Este change **suma un paso** a esa cadena y **una capa de origen** a esos valores. No reabre ninguna de sus 14 decisiones.

### Restricciones del proyecto que condicionan el diseño

- `ddl-auto=update`: Hibernate **crea** tablas y columnas nuevas pero **no altera** tipo ni precisión de columnas existentes. Cualquier diseño que necesite ensanchar una columna existente exige DDL manual — este diseño lo evita a propósito.
- Sin suite de tests automatizada. Toda verificación es manual sobre base real. Regla dura: si alguna vez se automatiza, base real o Testcontainers, **nunca** mocks de base de datos.
- DTOs siempre; Controller → Service → Repository; sin `findAll()` sin límite; feedback vía `useUIStore`.
- **`costeo-flexible-por-producto` ya está archivado** (`openspec/changes/archive/2026-08-20-costeo-flexible-por-producto/`) y `openspec/specs/costeo-productos/spec.md` existe. Los deltas de `costeo-productos` de este change ya tienen su spec base contra la cual aplicarse.

## Goals / Non-Goals

**Goals:**

- Que el jefe cargue **una vez** las reglas de cada proveedor —IVA aparte o incluido, moneda, descuentos, envío— y que a partir de ahí elegir el proveedor complete solo lo que hoy tipea de memoria en cada producto y en cada pedido.
- Que "marca" y "proveedor" dejen de ser dos catálogos paralelos que significan lo mismo, sin que ningún producto existente quede huérfano ni cambie de costo.
- Que un precio de lista en dólares se pueda cargar **como dólares**, con su cotización explícita, en vez de que el jefe multiplique a mano y pierda el dato.
- Que la cotización aplicada quede **congelada** en el movimiento, para que un ingreso viejo siga siendo reconstruible aunque el dólar de hoy sea otro.
- Que un producto creado al confirmar la recepción de un pedido nazca con su proveedor ya puesto.
- Que un valor por defecto del proveedor sea siempre **una sugerencia editable**, nunca una regla que gobierne en vivo el costo de sus productos.
- Que ningún producto en pesos cambie de costo ni un centavo por el solo hecho de aplicar este change.

**Non-Goals:**

- **No** se importa ningún catálogo de proveedor por Excel/CSV. Sigue descartado en el Backlog del roadmap, y este change no lo acerca ni lo aleja.
- **No** se reescribe la cadena de costeo existente. Se le antepone un paso; los pasos 1-5 quedan literalmente iguales.
- **No** se reabre ninguna de las 14 decisiones de `costeo-flexible-por-producto`. En particular la **Decisión 14** sigue vigente: no hay descuentos a nivel de cabecera de `Pedido`, y el descuento por pagar en efectivo se sigue resolviendo ajustando el `costoUnitarioPactado` de la línea.
- **No** se recalculan los `MovimientoStock` ya registrados. Son inmutables por diseño; sus columnas nuevas de moneda quedan nulas, que es la lectura correcta ("esto se congeló cuando no existía la moneda").
- **No** se convierte a `Marca` en un concepto separado y paralelo al proveedor "por si acaso". Se unifica (OQ1, resuelta por el usuario); no se deja media unificación. Tampoco **se borra** `Marca`, su ABM ni sus endpoints: quedan congelados como red de rollback (OQ10).
- **No** se construye ningún dashboard, reporte ni análisis de compras por proveedor. Este change genera los datos; leerlos es de `us-017-finanzas-ui`.
- **No** se agrega ninguna moneda que no sea el dólar estadounidense, ni ninguna integración con una fuente de cotización externa (API del BCRA, dólar blue, etc.). La cotización la tipea el usuario.
- **No** se toca ventas, cheques, cuentas corrientes, bandejas, siembras ni remitos.
- **No** se toca el negocio **Vivero**: 0 productos con marca, 0 proveedores, no ve el panel de costos ni la sección Pedidos.

## Decisions

> Las 11 Open Questions de este diseño están **cerradas** (ver *Open Questions — resueltas* al final). Cada decisión indica de qué pregunta salió y en qué términos quedó. Ninguna de ellas debe volver a tratarse como abierta durante la implementación.

### Decisión 1 — El proveedor es un **perfil de costeo por defecto**, no una regla

*(OQ1, OQ3, OQ4 y OQ11 — resueltas. Confirmada.)*

`Proveedor` suma los campos que el usuario enumeró. **Los cinco son valores por defecto, sugeridos y copiables; ninguno es una referencia viva.** Ningún cálculo de costo los consulta jamás en tiempo de ejecución: el `CostoCalculator` no conoce la entidad `Proveedor`.

| Campo | Tipo | Significado | Rol |
|---|---|---|---|
| `ivaIncluidoEnPrecio` | `boolean`, default `true` | `true` = el precio de lista ya trae el IVA (Ingco, Extra Power, Duroll). `false` = el IVA va aparte (Shimura). | **Gobierna la UI:** decide si el formulario pregunta el % de IVA o escribe `0` explícito y lo explica (Decisión 4). |
| `ivaPorDefectoPorcentaje` | `BigDecimal(5,2)` nullable | Sólo relevante si `ivaIncluidoEnPrecio = false`. El IVA más frecuente de ese proveedor (Shimura: `21.00`). | **Comodidad de tipeo.** No gobierna nada: la evidencia muestra 21 y 10,5 conviviendo en la misma pestaña. |
| `manejaDolares` | `boolean`, default `false` | `true` = este proveedor cotiza **algunos** de sus productos en USD (Shimura). | **Gobierna la UI:** decide si aparece el selector de moneda. No implica que todos sus productos estén en USD. |
| `costoEnvioPorDefectoPorcentaje` | `BigDecimal(5,2)` nullable | El flete habitual, **siempre como porcentaje** (todos: `5.00`). Nunca un monto fijo por pedido (OQ11). | Valor sugerido, copiable. |
| `descuentosPorDefecto` | `@OneToMany ProveedorDescuento` | Lista libre con nombre + porcentaje + orden, **calcada de `ProductoDescuento`**. | Valores sugeridos, copiables. |

Y un sexto campo, de naturaleza distinta y explícitamente **no** un default aplicable (Decisión 5):

| Campo | Tipo | Significado | Rol |
|---|---|---|---|
| `ultimaCotizacionConocida` + `fechaUltimaCotizacion` | `BigDecimal(12,4)` + fecha, ambos nullable | La última cotización que el usuario tipeó en un pedido a ese proveedor, con la fecha en que la tipeó. | **Sólo ayuda de tipeo.** Se muestra prellenada **con su antigüedad a la vista** y el usuario la confirma o la reemplaza en cada pedido. **Nunca se aplica sola a ninguna operación.** |

`ProveedorDescuento` es estructuralmente idéntica a `ProductoDescuento` (`nombre` obligatorio, `porcentaje >= 0`, `orden` sólo presentacional, cascada conmutativa). **No se reusa la misma tabla con un discriminador**: son dos dueños distintos con ciclos de vida distintos, y una tabla polimórfica acá compraría cero y costaría claridad en cada query.

Los descuentos del perfil se cargan **desarmados y con nombre** cuando realmente son más de un descuento y el jefe recuerda de qué se componen (OQ9) — el caso de Ingco (dos descuentos reales en cascada) es el ejemplo genuino. El de Extra Power **no** es un caso de esto: su `0,874`/`0,8075` resultó ser un solo descuento (10%) con el envío mezclado adentro por error de la planilla, no dos descuentos a desglosar (corregido en la tarea 2.3 de `tasks.md`). Donde sí hay una cascada real pero no se recuerda la descomposición, una sola fila con el porcentaje equivalente da el mismo número y sólo se pierde la etiqueta.

**La palabra clave del pedido del usuario es "por defecto"**, y la dijo él mismo entre paréntesis: *"con la posibilidad de editarlas luego pero a lo que me refiero es a que esas configuraciones van a ser sus valores por defecto"*. El diseño lo toma literal: nada de lo que hay en el proveedor gobierna en vivo el costo de nada. Se **copia una sola vez** cuando corresponde (Decisión 3) y a partir de ahí el destino es dueño de su valor.

*Alternativa descartada:* meter la configuración en `UnidadNegocio` con un `Map` por proveedor. Es la misma información con un modelo peor y sin ABM.

### Decisión 2 — `Marca` y `Proveedor` se unifican: `Producto.marcaId` pasa a `Producto.proveedorId`

*(OQ1 — **resuelta por el usuario: SÍ, unificar.** Es **la** decisión estructural del change.)*

`Producto` suma `@ManyToOne Proveedor proveedor` (`proveedor_id`, nullable) y **su vínculo de catálogo en Herramientas pasa a ser ése**: `marcaId`/`marcaNombre` salen del `ProductoDTO` y del formulario, reemplazados por `proveedorId`/`proveedorNombre`. `Producto.marca` **deja de leerse y de escribirse** en Herramientas, pero la columna `productos.marca_id` y la entidad `Marca` **no se borran**: quedan congeladas con su valor original como red de rollback, exactamente el mismo criterio que la Decisión 8 de `costeo-flexible-por-producto` aplicó a `descuento_proveedor`.

**Criterio de migración: resolución por nombre normalizado, dentro de la misma unidad de negocio.** Idempotente, al arrancar (`DataInitializer`, que ya funciona así):

1. Por cada `Marca` viva de Herramientas, buscar un `Proveedor` vivo de la misma unidad cuyo nombre coincida **normalizado** — `trim()` + mayúsculas, comparación exacta sobre ese resultado. Sin *fuzzy matching*, sin coincidencias parciales: o el nombre es el mismo o no lo es. Con 4 marcas y 4 nombres, cualquier heurística más blanda agrega riesgo sin agregar cobertura.
2. Si existe → **se reusa** (caso `SHIMURA`, id 4). Si no existe → se **crea** un `Proveedor` con ese nombre y **con perfil de costeo neutro**: IVA incluido, sin IVA por defecto, sin dólares, sin descuentos, sin envío propio, sin cotización conocida. Un perfil neutro no aporta nada a nadie, así que crear el proveedor **no cambia ningún costo**.
3. Por cada producto con `marca_id` no nulo y `proveedor_id` nulo → `proveedor_id` = el proveedor resuelto para su marca. Es la única columna que la migración escribe.
4. **Los productos sin marca quedan sin proveedor.** No se inventa ninguno, no se les asigna un proveedor "por defecto" ni uno inferido del pedido que los creó. Son exactamente dos —`id=19 Masa` e `id=22 prueba de pedido`, los dos nacidos del flujo de "producto pendiente"— y **el usuario se los asigna a mano después**, desde el formulario de producto, cuando quiera. Quedan fuera de todos los tabs de proveedor y visibles bajo "Todos", igual que hoy están fuera de todos los tabs de marca. El flujo nuevo (Decisión 8) hace que ningún producto futuro nazca así.

Aplicado a la base real, la migración completa cabe en esta tabla:

| Marca | ¿Existe proveedor con ese nombre? | Acción | Productos reasignados |
|---|---|---|---|
| `SHIMURA` | **Sí** (id 4) | reusar | — (0 productos) |
| `INGCO` | No | **crear proveedor** | 1 Pala corazón, 2 Pala ancha, 4 Cinta aisladora |
| `EXTRA POWER` | No | **crear proveedor** | 3 Pala pocera, 6 Pulverizador, 10 Membrana, 12 Destornillador |
| `DUROLL` | No | **crear proveedor** | 5 Cinta métrica |
| — | — | sin cambios | 19 Masa, 22 prueba de pedido (quedan sin proveedor) |

**3 proveedores creados, 8 productos reasignados, 0 productos huérfanos nuevos, 0 cambios de costo.** La migración no toca ni `costoProducto`, ni `descuentos`, ni `ivaPorcentaje`, ni `costoEnvioPorcentaje`, ni `precio`: sólo la referencia de catálogo. El costo de los 10 productos queda **idéntico al centavo**, por construcción.

**Por qué unificar y no coexistir.** El usuario lo dijo sin ambigüedad ("ya sabemos que las marcas y los proveedores son lo mismo") y su planilla lo confirma: las pestañas son `shimura / INGCO / EXTRA POWER / DUROLL / scala`. Mantener las dos entidades significaría que cada producto nuevo pide dos veces el mismo dato y que el filtro de la pantalla de Stock tenga dos ejes que dicen lo mismo. Y el riesgo que normalmente haría dudar —una migración masiva— acá está **medido**: son 8 filas y 4 nombres, enumerables en una pantalla.

**Qué pasa con Vivero:** nada. Tiene 0 productos con marca. La migración no encuentra ninguna marca de la unidad 1 y no hace nada. `Marca` sigue existiendo y su ABM sigue respondiendo; simplemente ningún producto la usa. **La pestaña "Marcas" de Configuración se esconde y el código no se toca** (OQ10, resuelta junto con OQ1): esconder es un `if` de una línea y evita que el jefe cargue una marca que después no aparece en ningún lado; dejar el componente, el controller y los endpoints en el repo es la red de rollback de esta decisión. Borrarlos de verdad es un `chore` posterior, cuando la unificación lleve un tiempo funcionando.

*Alternativa descartada:* agregar `proveedorId` **además** de `marcaId` sin fusionar (opción (b) del briefing). Evita la migración, pero deja al usuario manteniendo dos catálogos que él mismo dice que son el mismo, y obliga a decidir cuál de los dos manda en el filtro — que es el problema que este change viene a cerrar. *Alternativa también descartada:* renombrar la tabla `marcas` a `proveedores` y fusionar filas. Requiere DDL manual (que `ddl-auto=update` no hace), rompe la FK de `pedidos.proveedor_id` y no tiene rollback limpio.

### Decisión 3 — Los defaults del proveedor se **copian** (snapshot), no se heredan en vivo

*(OQ3 — **resuelta por el usuario: se copian una sola vez.** Es la decisión que más protege el sistema de un error silencioso.)*

El fallback de IVA y envío sigue teniendo **exactamente dos niveles**, los que ya dejó `costeo-flexible-por-producto`: `producto → unidad de negocio`. **El proveedor NO es un tercer nivel de fallback en vivo.** Lo que hace el proveedor es **prellenar, una sola vez, en el momento en que se establece la relación**:

- Al crear un producto y elegirle proveedor → el formulario **copia** los descuentos, el IVA, el envío y la moneda del proveedor a los campos del producto, visiblemente, y el usuario los edita ahí mismo antes de guardar.
- Al armar un pedido y elegir proveedor → se copian a las líneas del pedido como valores pactados propuestos, modificables línea por línea.
- Al confirmar la recepción y crear un producto pendiente → se copian **de la línea del pedido** al producto nuevo (no del proveedor: la línea ya los tiene congelados, ver Decisión 8).

Después de la copia, **el proveedor no tiene ninguna influencia** sobre ese producto ni sobre esa línea. Cambiar la configuración de INGCO mañana **no mueve el costo, el precio ni la configuración de ningún producto ya cargado**, y tampoco el de ninguna línea de pedido ya registrada. El único camino para propagar un cambio de perfil es la acción explícita con vista previa de la Decisión 6.

**Consecuencia de implementación, que hay que respetar literalmente:** el `CostoCalculator` (de los dos lados) **no recibe ni consulta el proveedor**. Si en algún momento necesita mirarlo para resolver un IVA o un envío, la decisión se rompió.

**Por qué snapshot y no herencia viva — la evidencia es concluyente.** Dentro del mismo proveedor, los valores **difieren por producto**:

- Extra Power: `0,874` en las filas 2-16 y `0,8075` desde la 17.
- Ingco: `0,65` en el "nuevo cargamento" y `0,6` en la fila 29 del mismo bloque.
- Shimura: IVA `1`, `1,21` y `1,105` en la misma pestaña.

Si el proveedor fuera un nivel de fallback vivo, la mayoría de los productos tendría que **pisar** el valor heredado igual, y el nivel extra no ahorraría nada. Peor: editar el descuento de INGCO reprecificaría en silencio la próxima compra de sus 3 productos sin ninguna señal, que es exactamente el modo de falla que la Decisión 9 de `costeo-flexible-por-producto` fue escrita para prevenir (y por eso `actualizarProducto()` genera un movimiento cuando cambia el IVA o el envío de un producto: para que el cambio quede registrado).

**Beneficio adicional, nada menor:** con snapshot, la migración de la Decisión 2 **no cambia ningún costo**. Con herencia viva, el momento en que un producto queda enganchado a un proveedor sería el momento en que su IVA/envío efectivo podría cambiar solo.

*Alternativa descartada:* fallback de tres niveles `producto → proveedor → unidad`. Más "elegante" y menos redundante en la base, pero contradice la evidencia (los productos deviaN de su proveedor casi siempre) y convierte una pantalla de configuración en un botón de reprecificación masiva silenciosa. *Mitigación del único costo real del snapshot* (que actualizar un default no propaga): la acción explícita de re-aplicar de la Decisión 6.

### Decisión 4 — El tratamiento del IVA del proveedor se materializa como un **`0` explícito**, nunca como `null`

*(OQ4 — resuelta por la recomendación: **flag y número con roles distintos**. Es el error silencioso más caro del change y merece una decisión propia.)*

`Producto.ivaPorcentaje` ya tiene una semántica establecida e inviolable: `null` = "hereda el default de la unidad", `0` = "no aplica". Y el default de la unidad Herramientas **vale 21.00** (verificado en base).

Por lo tanto, cuando el proveedor tiene `ivaIncluidoEnPrecio = true` (Ingco, Extra Power, Duroll), el producto debe quedar con **`ivaPorcentaje = 0`**, escrito explícitamente. Si quedara en `null`, heredaría el 21% de la unidad y se le sumaría un IVA que **ya estaba adentro del precio de lista**. Sobre la Pala corazón (base 15.000) eso son ~3.100 pesos de costo inventado, sin ningún error visible.

**Este patrón ya está probado en la base real.** El arreglo de datos del 2026-08-20 —autorizado por el usuario y ejecutado **fuera** de este change— escribió exactamente ese `0` explícito en los 8 productos de Ingco / Extra Power / Duroll, conviviendo con el `21.00` de la unidad. La regla que sigue no es una hipótesis: es la generalización automática de algo que ya funciona.

Regla, entonces:

| `ivaIncluidoEnPrecio` del proveedor | `Producto.ivaPorcentaje` que se copia |
|---|---|
| `true` (IVA ya en el precio) | **`0` explícito** |
| `false` (IVA aparte) | `ivaPorDefectoPorcentaje` del proveedor (Shimura: `21.00`), editable a `10.50` producto por producto |

Los dos campos existen, con **roles distintos y no intercambiables**:

- El **booleano `ivaIncluidoEnPrecio`** es el que realmente gana su lugar en el modelo: **decide si la UI pregunta** por el porcentaje de IVA o directamente lo pone en `0` y lo explica en una línea.
- El **porcentaje `ivaPorDefectoPorcentaje`** es sólo comodidad de tipeo —evita escribir "21" en la mayoría de los productos de Shimura— y **no gobierna nada**: no participa de ningún cálculo, no se consulta al costear y no pretende ser correcto siempre. La evidencia muestra 21 y 10,5 conviviendo en la misma pestaña, así que se documenta como sugerencia, no como verdad.

*Alternativa descartada:* no guardar un IVA numérico por defecto en el proveedor y pedirlo siempre a mano. Más honesto respecto de la variabilidad, pero le cuesta al usuario un tipeo en cada producto de Shimura para ahorrarse un dato que igual es editable.

### Decisión 5 — La moneda es del **producto**; la cotización es del **pedido**

*(OQ2 — **resuelta por el usuario: la cotización se carga en cada pedido; el proveedor sólo sugiere la última usada.** Segunda decisión estructural del change.)*

La columna `dolar` de la planilla de Shimura mezcla dos hechos con naturalezas opuestas, y el diseño los separa:

| Hecho | Naturaleza | Dónde vive |
|---|---|---|
| "Este artículo lo cotiza el proveedor en dólares" (el taladro vale **USD 66,24**, siempre) | **Estable**, propiedad del artículo | `Producto.monedaCosto` ∈ `{ARS, USD}`, default `ARS`. Ofrecida por la UI sólo si `Proveedor.manejaDolares`. |
| "El dólar del día en que se hizo esta compra fue **1460**" | **Volátil**, propiedad del momento | `Pedido.cotizacionDolar` (nullable), **tipeada o confirmada por el usuario en cada pedido**, sólo si alguna línea está en USD, y congelada por línea en `PedidoDetalle` y en `MovimientoStock`. |

Es decir: **la MONEDA es un dato estable** (si el producto/proveedor puede facturarse en USD) y se configura una vez; **la COTIZACIÓN específica NO se guarda como default fijo del proveedor** y cada pedido nuevo la vuelve a pedir.

**Por qué la cotización NO va como default estable del proveedor**, aunque el usuario la nombró en su enumeración inicial y después decidió lo contrario: porque una cotización guardada es correcta el día que se carga y falsa a la semana siguiente. Un default que nadie actualiza y que se aplica solo a un pedido de hoy convierte un dato viejo en un costo congelado e inmutable, multiplicado por ~1.500. **Es el error más caro que este change podría introducir** —silencioso, grande e irreversible— y no puede pasar. Es el mismo criterio con que `herramientas-pedidos-proveedores` decidió que el costo pactado se congela **por compra** y no se hereda del producto.

**Lo único que el proveedor guarda, y su alcance exacto:** `ultimaCotizacionConocida` + `fechaUltimaCotizacion`, escritas al confirmar un pedido que llevó cotización. El formulario de pedido las ofrece **prellenadas junto a su antigüedad** ("último valor cargado: 1.460 — hace 23 días"), como **ayuda de tipeo con la fecha a la vista**. Reglas duras sobre ese valor, las tres innegociables:

1. **No se aplica solo a ninguna operación.** Es texto en un input que el usuario ve, confirma o reemplaza; nunca un valor que el backend resuelva por su cuenta.
2. **No es fallback.** Si el campo del pedido quedó vacío y hay líneas en USD, la confirmación **falla** — no se recurre a la última conocida (ver abajo).
3. **Siempre se muestra con su antigüedad.** Una cotización sin fecha al lado es exactamente el dato que este diseño quiere evitar.

**Sin cotización no hay ingreso.** Si un pedido tiene al menos una línea en USD y no se informó cotización, la confirmación de recepción **falla con un error explícito**. No se asume 1, no se usa la última conocida, no se deja pasar. Un costo en dólares tratado como pesos es un error de tres órdenes de magnitud.

*Alternativa descartada por el propio usuario:* la cotización como campo del proveedor que se aplica solo (lectura literal de su enumeración inicial). Se le presentó y eligió lo contrario. *Alternativa descartada:* una tabla de cotizaciones históricas por fecha, con la del día resuelta automáticamente. Correcta y overkill: agrega un mantenimiento diario que nadie va a hacer, para un proveedor y unos pocos artículos.

### Decisión 6 — Re-aplicar los defaults del proveedor es una **acción explícita con vista previa**

*(OQ5 — resuelta por la recomendación: **sin cambios en el modelo de descuentos estables**, más este botón. Alcance opcional, se puede cortar sin afectar nada más.)*

Consecuencia del snapshot (Decisión 3): cuando Ingco cambia sus condiciones (0,70 → 0,65, la fila naranja "nuevo cargamento"), actualizar la configuración del proveedor **no** toca sus productos. Para que eso no se convierta en trabajo manual repetido, la pantalla del proveedor ofrece un botón **"Aplicar estos valores a los productos de este proveedor"** que:

1. Muestra **antes de tocar nada** la lista de productos afectados con su costo actual y su costo resultante, lado a lado.
2. Requiere confirmación explícita vía `useUIStore.askConfirm` (nunca `confirm` nativo).
3. Al confirmar, escribe los valores en cada producto **por el mismo camino que una edición manual**, de modo que se generen los `MovimientoStock` correspondientes (Decisión 9 de `costeo-flexible-por-producto`) y el cambio quede registrado.
4. Permite deseleccionar productos puntuales de la lista.

Nunca es automático y nunca es silencioso. Es exactamente lo contrario de la herencia viva: el mismo efecto, pero pedido, previsualizado y auditado.

**Este grupo es el candidato natural a recortar** si el change queda largo: sin él todo funciona, sólo que actualizar Ingco cuesta editar 3 productos a mano.

### Decisión 7 — La conversión de moneda es el **paso 0** de la cadena

*(OQ6 — resuelta por la recomendación, sin objeción. La evidencia numérica la dejaba poco discutible.)*

```
0. costoBaseARS   = monedaLinea == USD ? costoBaseUSD × cotización : costoBase     ← NUEVO
1. netoConDesc    = costoBaseARS × Π (1 − dᵢ/100)                                  (sin cambios)
2. montoIva       = netoConDesc × iva% / 100                                        (sin cambios)
3. montoEnvio     = netoConDesc × envio% / 100                                      (sin cambios)
4. costoUnitario  = netoConDesc + montoIva + montoEnvio                             (sin cambios)
```

Verificado contra la fila 6 de `shimura.png`: `66,24 × 1460 × 1(IVA) × 1,05(envío) = 101.545,92`, el número exacto de la celda. La conversión es el **primer** factor, antes de todo lo demás.

Es **compatible hacia atrás por construcción**, igual que lo fue el IVA en el change anterior: con `moneda = ARS` el paso 0 es la identidad y la expresión colapsa **exactamente** en la cadena de hoy. No hay que confiar en que los números coincidan — coinciden algebraicamente. La condición de aceptación es la misma: los productos de la línea de base tienen que dar el mismo centavo.

**Redondeo:** la conversión se hace **dentro** de la escala intermedia 6 del `CostoCalculator`, antes de cualquier redondeo. No se redondea el costo base convertido a 2 decimales y después se sigue: eso reintroduciría el arrastre que la Decisión 10 del change anterior eliminó.

**Qué se congela en `MovimientoStock`:** dos columnas nuevas nullable, `moneda_origen` (`varchar(3)`) y `cotizacion_aplicada` (`numeric(12,4)`). Los movimientos históricos quedan en `null`, que se lee como "esto se congeló cuando no existía la moneda". `costo_base` sigue guardando el **base en pesos ya convertido**, para que la fila siga siendo auto-consistente con `costo_neto` y `costo_unitario` sin ningún cambio de significado. Con `costo_base`, `moneda_origen` y `cotizacion_aplicada` se puede reconstruir el precio de lista original en USD.

### Decisión 8 — Los defaults se copian a la **línea del pedido**, y de ahí al producto

*(OQ3 y OQ5 — resueltas. Es el corolario de la Decisión 3 sobre el circuito de pedidos.)*

`PedidoDetalle` hoy congela `costoUnitarioPactado` por línea. Se le suman los componentes que hasta ahora sólo existían en el producto: la moneda de la línea, el IVA pactado, el envío pactado y el detalle textual de los descuentos pactados. Con eso, una línea de pedido queda **auto-contenida**: describe completamente cómo se llegó a su costo, sin depender de que el producto ni el proveedor sigan configurados igual mañana.

Al confirmar la recepción, un producto pendiente nace con **todo eso ya cargado**: proveedor (del pedido), moneda, IVA, envío y descuentos (de la línea). Es la diferencia concreta contra hoy, donde nace con nombre, costo y nada más — verificable en base: `Masa` y `prueba de pedido` no tienen ni marca ni costo de catálogo.

**Lo que NO cambia:** la Decisión 6 de `herramientas-pedidos-proveedores` sigue en pie — confirmar la recepción de un producto **que ya existe** no pisa su `costoProducto` ni su `precio`. Los defaults se copian sólo al producto que **nace** en esa confirmación. Y la Decisión 14 de `costeo-flexible-por-producto` también: no hay descuentos en la cabecera del pedido, y el descuento por efectivo se sigue reflejando ajustando el `costoUnitarioPactado` de la línea.

### Decisión 9 — El filtro de Stock **reemplaza** marca por proveedor

*(OQ7 — resuelta por la recomendación: **reemplaza, un solo filtro "Proveedor"**. Corolario directo de OQ1.)*

`Productos.jsx` deriva hoy sus tabs de filtro client-side, del campo `p.marcaNombre` de los productos ya cargados (líneas 93-105 para la lista de valores, 155-180 para los tabs, 239 y 339 para el badge de cada tarjeta). No hay nada en backend: ni un endpoint de filtrado ni un parámetro de query.

El cambio es sustituir `marcaNombre` por `proveedorNombre` en esos cinco puntos y cambiar las etiquetas ("Todas las Marcas" → "Todos los Proveedores"). **Un solo filtro, no dos.** Un producto sin proveedor (los 2 actuales) simplemente no aparece bajo ningún proveedor, exactamente como hoy no aparece bajo ninguna marca.

Es la parte de menor riesgo del change: sin backend, sin migración, reversible en un commit.

### Decisión 10 — El ABM de proveedores se muda a la configuración de Herramientas

*(Pedido textual del usuario: "quiero que **dentro de configuración del negocio Herramientas** ahora se pueda crear proveedores".)*

`Configuracion.jsx` ya es una pantalla de secciones (`herramientas` → `ConfiguracionHerramientas`, `marcas` → `ConfiguracionMarcas`). Se le suma una sección `proveedores`. La pantalla `Proveedores.jsx` y su ruta existente se conservan —el circuito de pedidos linkea a ella y sus permisos ya están definidos en `pedidos-proveedores`— pero el formulario pasa a ser el mismo componente en los dos lugares, para que no haya dos definiciones del perfil de costeo.

`ProveedorForm.jsx` crece de 3 inputs a un formulario con secciones: **Datos** (nombre, contacto, teléfono, como hoy) y **Costeo** (IVA, moneda, descuentos repetibles, envío). Convenciones del repo, sin excepción: `FormattedNumberInput` para los porcentajes, `cursor-pointer` en todos los botones, `Plus`/`Trash2` de `lucide-react` para las filas de descuento, feedback por `useUIStore`, y usable a 320px sin desborde horizontal.

En la misma pantalla de `Configuracion.jsx`, la sección **"Marcas" se esconde** (OQ10): un `if` que deja de renderizar la pestaña. `ConfiguracionMarcas.jsx`, `MarcaController`, `MarcaService(Impl)`, `MarcaRepository` y `MarcaDTO` **quedan en el repo sin modificarse**, y los endpoints `/api/marcas` siguen respondiendo. Es la red de rollback de la Decisión 2 y no se borra en este change.

### Decisión 11 — El **porcentaje** sigue siendo la unidad canónica; el multiplicador se muestra al lado

*(OQ8 — resuelta por la recomendación, sin objeción.)*

Toda la planilla del usuario usa **multiplicadores** (`0,7`, `0,65`, `0,874`, `0,8075`, y también `1,05` de envío y `1,21` de IVA). El sistema guarda y muestra **porcentajes** (`30`, `35`, `12,6`, `19,25`, `5`, `21`).

**El porcentaje se mantiene como unidad canónica** —es lo que ya guardan `ProductoDescuento`, `Producto.ivaPorcentaje`, `UnidadNegocio.costoEnvioPorcentaje` y la spec vigente de `costeo-productos`—, y **cambiarlo sería reabrir `costeo-flexible-por-producto`**, cosa que este change no hace. Nada en el modelo, en el DTO ni en el cálculo cambia de unidad.

Lo que se agrega es puramente presentacional: **la equivalencia en multiplicador mostrada en vivo al lado de cada input** de porcentaje de descuento, en el formulario de proveedor y en el de producto. Al tipear `12,6` aparece en gris `= × 0,874`. Costo: una línea de JSX. Beneficio: el jefe puede contrastar contra su planilla sin hacer cuentas, y equivocarse en esta conversión **no da error** —da un costo plausible y falso—, así que la ayuda visual es la única defensa disponible.

## Risks / Trade-offs

**[Una cotización aplicada a una línea en pesos]** → El riesgo número uno, y el más caro del proyecto hasta ahora: multiplica un costo por ~1.500 sin lanzar ninguna excepción, y lo congela en un movimiento inmutable. *Mitigación:* la conversión se aplica **sólo** cuando la línea está marcada explícitamente en USD (Decisión 5), nunca "si hay cotización cargada"; `ARS` es el default de `Producto.monedaCosto`; la verificación exige registrar un ingreso en pesos con una cotización cargada en el pedido y confirmar en base que `costo_unitario` **no se movió**; y `moneda_origen`/`cotizacion_aplicada` quedan congeladas en el movimiento para poder detectarlo después.

**[Un ingreso en USD sin cotización]** → Si se dejara pasar asumiendo 1, un artículo de USD 66,24 entraría al inventario costando 66 pesos. *Mitigación:* Decisión 5 — la confirmación de recepción **falla explícitamente**. No hay valor por defecto para este caso.

**[IVA duplicado en los proveedores con IVA incluido]** → El default de la unidad Herramientas está en `21.00`. Si al copiar los defaults de Ingco un producto **nuevo** quedara con `ivaPorcentaje = null` en vez de `0`, heredaría ese 21% que ya estaba adentro del precio de lista. (Los 8 productos **existentes** ya están corregidos con `0` explícito desde el arreglo de datos del 2026-08-20, que no forma parte de este change.) *Mitigación:* Decisión 4 lo prohíbe explícitamente; la verificación exige mirar en base que todo producto nuevo de un proveedor con IVA incluido tenga `iva_porcentaje = 0` y **no** `NULL`, y comparar su costo contra la línea de base.

**[Una cotización vieja aplicándose sola a un pedido de hoy]** → Explícitamente señalado por el usuario como el error más caro posible de este change. Si `ultimaCotizacionConocida` se comportara como un default que el backend resuelve por su cuenta, un pedido de hoy quedaría costeado con el dólar de hace meses, congelado e inmutable. *Mitigación:* Decisión 5 — la cotización se tipea o se confirma en **cada** pedido; el valor guardado es sólo un prellenado visible con su antigüedad al lado; y si el campo queda vacío con líneas en USD, la confirmación **falla** en vez de recurrir a la última conocida. La verificación exige probar exactamente ese caso: pedido en USD con el campo vacío → rechazo, sin stock movido y sin movimientos.

**[Productos huérfanos tras la migración]** → Un producto que quede sin proveedor pierde su clasificación y desaparece de todos los filtros. *Mitigación:* la migración es enumerable (8 productos, tabla de la Decisión 2) y la verificación es un `COUNT` exacto: 8 productos con `proveedor_id` no nulo, 2 sin — los mismos 2 que hoy no tienen marca. Cualquier otro número detiene el change.

**[Doble fuente de verdad `marca_id` / `proveedor_id`]** → Mientras las dos columnas existan, hay dos lugares donde puede vivir la clasificación de un producto, y pueden divergir. *Mitigación:* después de la migración, ninguna ruta de escritura de Herramientas toca `marca_id`; la verificación exige `grep` explícito de que `setMarca(` no aparece en ninguna ruta de alta/edición de producto de Herramientas. Es el mismo control que el change anterior aplicó a `getDescuentoProveedor()`.

**[La fórmula queda desincronizada entre backend y frontend]** → El paso 0 hay que escribirlo dos veces, en `CostoCalculator.java` y en `costeo.js`. Si divergen, el formulario muestra un costo y la base guarda otro. *Mitigación:* la spec de `costeo-productos` fija el ejemplo numérico exacto (`66,24 × 1460 × 1,05 = 101.545,92`) y la verificación exige cargar ese mismo producto en el formulario y en la base y comparar al centavo — no "mirar que se parezca".

**[El snapshot deja los productos desactualizados respecto de su proveedor]** → Cambiar los defaults de Ingco no toca sus 3 productos; hay que editarlos a mano. *Trade-off aceptado a cambio de que nada se reprecifique en silencio*, con la Decisión 6 como mitigación opcional. Es la contracara consciente de la Decisión 3.

**[El usuario piensa en multiplicadores y el sistema en porcentajes]** → Toda su planilla usa `0,7` / `0,874` / `1,05`; el sistema pide `30` / `12,6` / `5`. Cada carga es una conversión mental, y equivocarse no da error: da un costo plausible pero falso. *Mitigación:* Decisión 11 — el porcentaje sigue siendo canónico y la equivalencia en multiplicador se muestra en vivo al lado del input.

**[Alcance real del change]** → Toca 5 entidades, el calculador de costo de los dos lados, 6 pantallas y una migración de datos. Es el change más grande de la serie. *Mitigación:* `tasks.md` está ordenado para que los grupos de menor riesgo (perfil del proveedor, filtro) se puedan cerrar y verificar antes de tocar la fórmula y la migración, y la Decisión 6 está marcada como recortable.

**[Sin tests automatizados]** → El proyecto no tiene runner de frontend ni suite de backend. Toda la verificación es manual sobre base real. *Mitigación:* la línea de base del grupo 1 y las comparaciones al centavo son el sustituto. Si alguna vez se automatiza: base real o Testcontainers, **nunca** mocks de base de datos.

## Migration Plan

1. **`costeo-flexible-por-producto` ya está archivado** (`openspec/changes/archive/2026-08-20-costeo-flexible-por-producto/`) y `openspec/specs/costeo-productos/spec.md` existe. La precondición de orden está satisfecha; sólo hay que confirmarla (tarea 1.1).
2. **Antes de tocar nada, registrar la línea de base** (grupo 1): los 10 productos de Herramientas con su `costo_producto`, `marca_id`, `precio`, sus filas de `producto_descuentos`, su `iva_porcentaje`/`costo_envio_porcentaje` propios, y el `costo_unitario` del último `INGRESO`/`AJUSTE_INICIAL` de cada uno; más las 4 marcas, los proveedores vivos y la configuración de las dos unidades. **La foto se saca sobre la base como está hoy**, es decir con el `iva_porcentaje = 0` explícito que ya tienen los 8 productos de Ingco / Extra Power / Duroll. Sin esa foto no se puede demostrar que la migración no movió nada.
3. **Las 11 Open Questions ya están cerradas** (grupo 2, registrado con la decisión de cada una). Los specs quedaron alineados y no requieren re-sincronización.
4. Hibernate (`ddl-auto=update`) crea al arrancar las columnas nuevas de `proveedores`, `productos`, `pedidos`, `pedido_detalles` y `movimientos_stock`, más la tabla `proveedor_descuentos`. **Sin script de esquema manual** — el diseño evita a propósito cualquier cambio de tipo o precisión sobre columnas existentes.
5. Los proveedores nacen con el perfil **neutro** (IVA incluido, sin dólares, sin descuentos, sin envío propio). Con perfil neutro nada se copia a ningún lado y **el arranque no cambia ningún costo**. El jefe carga las reglas de cada proveedor cuando decide hacerlo, y eso es un acto explícito suyo, no un efecto del deploy.
6. **Migración `Marca` → `Proveedor`**, una sola vez e idempotente, según la tabla de la Decisión 2: 3 proveedores creados, 8 productos reasignados, 2 productos sin proveedor (los mismos 2 que hoy no tienen marca). Sólo se escribe `proveedor_id`; **ningún campo de costeo se toca**.
7. **Verificación inmediata post-migración:** recalcular el costo de los 10 productos y confirmar que dan **el mismo centavo** que la foto del paso 2. Si alguno se corre, se detiene y se revisa — no se avanza con una diferencia "chica".
8. Los `MovimientoStock` existentes **no se tocan**. `moneda_origen` y `cotizacion_aplicada` quedan en `null`.
9. **Rollback:** revertir el código. `productos.marca_id` sigue en la base con su valor original y sin haber sido modificada, así que el vínculo con `Marca` vuelve a funcionar tal cual y el filtro por marca también. Las columnas y tablas nuevas quedan sin uso; los 3 proveedores creados quedan como proveedores válidos sin productos (se pueden dar de baja lógica). El único efecto persistente serían los `MovimientoStock` generados mientras el change estuvo activo, que son movimientos legítimos con su costo correcto según la configuración vigente en ese momento.
10. El negocio **Vivero** no requiere ninguna acción: 0 productos con marca, 0 proveedores, no ve el panel de costos ni Pedidos.


## Open Questions — resueltas

Las 11 preguntas que abrió este diseño están **cerradas**. Se deja el registro de qué se preguntó, qué se recomendaba y qué se decidió, para que la implementación no las reabra ni las trate como abiertas. **Cuatro las decidió el usuario explícitamente** (OQ1, OQ2, OQ3 y OQ10); **las siete restantes** (OQ4, OQ5, OQ6, OQ7, OQ8, OQ9, OQ11) quedaron por la recomendación documentada, sin objeción.

**1. OQ1 — ¿Qué pasa con `Marca`? ¿Se unifica con `Proveedor`?** *(estructural — condiciona la migración)*
*Opciones presentadas:* (a) unificar — `Producto` pasa a referenciar `Proveedor`, `Marca` se congela sin borrarse; (b) coexistir — agregar `proveedorId` **además** de `marcaId`, sin migración; (c) alias/vista.
*Recomendación (Decisión 2):* (a) unificar.
✅ **RESUELTA — decidida por el usuario: SÍ, UNIFICAR.** `Producto.marcaId` pasa a `Producto.proveedorId`. La migración quedó medida contra la base real: se crean `INGCO`, `EXTRA POWER` y `DUROLL` como proveedores nuevos (`SHIMURA` ya existe, id=4, y se reusa), se reasignan los **8 productos** de Herramientas que hoy tienen marca cargada, y **2 quedan sin proveedor** (`id=19 Masa`, `id=22 prueba de pedido` — los nacidos del flujo de "producto pendiente" de pedidos, que tampoco tienen marca hoy). El usuario se los asigna a mano después; no se les inventa ninguno. **Vivero no se ve afectado** (0 productos con marca). `productos.marca_id` y la entidad `Marca` **no se borran**: quedan como red de rollback.

**2. OQ2 — ¿Dónde vive la cotización del dólar: en el proveedor o en el pedido?** *(estructural)*
*Recomendación (Decisión 5):* la moneda es del producto, la cotización es del pedido; el proveedor guarda como mucho la última conocida, con fecha, como ayuda de tipeo.
✅ **RESUELTA — decidida por el usuario: SE CARGA EN CADA PEDIDO; EL PROVEEDOR SÓLO SUGIERE LA ÚLTIMA USADA.** La **MONEDA** (si el producto/proveedor puede facturarse en USD) es un dato estable y se configura una vez. La **COTIZACIÓN específica NO se guarda como default fijo del proveedor**: el proveedor guarda como mucho la última cotización cargada con su fecha, como ayuda de tipeo, y **cada pedido nuevo la vuelve a pedir**. En palabras del usuario: *una cotización vieja aplicándose sola a un pedido de hoy sería el error más caro posible de este change — no puede pasar*. Si el campo queda vacío y hay líneas en USD, la confirmación de recepción **falla**; no se recurre a la última conocida ni se asume 1.

**3. OQ3 — ¿Los valores del proveedor se copian (snapshot) o se heredan en vivo?** *(estructural)*
*Recomendación (Decisión 3):* se copian; el fallback sigue siendo de dos niveles `producto → unidad`.
✅ **RESUELTA — decidida por el usuario: SE COPIAN UNA SOLA VEZ.** El fallback de costeo sigue siendo de **2 niveles** como en `costeo-flexible-por-producto`: `producto → unidad de negocio`. **El proveedor NO es una tercera capa de fallback en vivo** — sus valores son sólo el punto de partida sugerido al crear el producto (o al armar la línea de un pedido), **copiado y de ahí en más independiente**. **Cambiar la configuración de un proveedor después NO debe afectar productos ya creados.**

**4. OQ4 — El IVA por ítem de Shimura (21 vs 10,5): ¿el proveedor guarda un número o sólo el flag?**
*Recomendación (Decisión 4):* las dos cosas, con roles distintos.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. **Ambos, con roles distintos:** el **flag** `ivaIncluidoEnPrecio` decide si la UI **pregunta** el porcentaje de IVA o escribe `0` explícito; el **número** `ivaPorDefectoPorcentaje` es **sólo comodidad de tipeo y no gobierna nada** (no participa de ningún cálculo). Cuando el proveedor tiene el IVA incluido, el producto queda con `ivaPorcentaje = 0` **explícito**, nunca `null`.
*Nota:* el arreglo de datos que le puso `iva_porcentaje = 0` a los 8 productos existentes de Ingco / Extra Power / Duroll **ya se ejecutó en la base real, por separado y con autorización del usuario**. **No es parte del alcance de este change** y no tiene ninguna tarea asociada: se cita únicamente como precedente de que el patrón "flag + override explícito" funciona.

**5. OQ5 — ¿Cómo conviven los defaults del proveedor con la Decisión 14 del change anterior?**
*Recomendación (Decisión 6):* sin cambios en el modelo, más una acción explícita opcional.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. **Sin cambios en el modelo de descuentos estables**: la Decisión 14 de `costeo-flexible-por-producto` **no se reabre** (no hay descuentos en la cabecera del `Pedido`; el descuento por efectivo se sigue resolviendo ajustando el `costoUnitarioPactado` de la línea). Se agrega un botón **"reaplicar a sus productos" con vista previa**, explícito y confirmado, **opcional/recortable** si el usuario prefiere el change más corto (grupo 11 de `tasks.md`).

**6. OQ6 — ¿Dónde entra la cotización en la cadena de cálculo?**
*Recomendación (Decisión 7):* paso 0, antes de todo.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. `precio_lista_USD × cotización = costo_base_ARS`, y de ahí sigue la cadena existente sin ningún cambio. Confirmado al centavo contra la fila 6 de `shimura.png`: `66,24 × 1460 × 1 (IVA) × 1,05 (envío) = 101.545,92`. Compatible hacia atrás por construcción: con moneda `ARS` el paso 0 es la identidad.

**7. OQ7 — ¿El filtro de Productos reemplaza marca por proveedor, o coexisten?**
*Recomendación (Decisión 9):* reemplaza.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. **Reemplaza: un solo filtro "Proveedor".** No coexisten dos filtros equivalentes. Los productos sin proveedor no aparecen bajo ningún proveedor y sí bajo "Todos", exactamente como hoy con la marca.

**8. OQ8 — ¿Los descuentos se cargan como porcentaje (30%) o como multiplicador (0,70)?** *(surgió de leer la planilla)*
*Recomendación (Decisión 11):* porcentaje como unidad canónica, con la equivalencia mostrada al lado.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. **El porcentaje es la unidad canónica** —no se reabre `costeo-flexible-por-producto`, nada cambia de unidad en el modelo, el DTO ni el cálculo— **y la equivalencia en multiplicador se muestra al lado del input** (ej. al tipear `12,6` aparece `= × 0,874`). Es puramente presentacional.

**9. OQ9 — Los descuentos que aparecen ya colapsados en la planilla (ej. Extra Power `0,8075`/`0,874`): ¿se desarman?** *(surgió de leer la planilla)*
*Recomendación (Decisión 1):* desarmarlos donde el jefe recuerde la descomposición.
✅ **RESUELTA por la recomendación**, sin objeción del usuario — **y con una corrección de dato real** que llegó en la tarea 2.3 de `tasks.md`: el usuario confirmó que el `0,874`/`0,8075` de Extra Power **no son dos descuentos combinados**. Es un único descuento real de **10%** con el 5% de envío mezclado adentro por un error de la propia planilla (el envío ya tenía su columna propia, separada). Extra Power queda con **un solo descuento (10%)**, envío en su propio campo — nada que desarmar ahí. La regla general se mantiene para el caso genuino de dos descuentos reales combinados (ej. Ingco): se desarman **con nombre en el perfil del proveedor** cuando se recuerda la composición; si no se recuerda, se carga el porcentaje equivalente único. Lo que la implementación **nunca** debe hacer es tratar un número que mezcla envío como si fuera un segundo descuento — el envío tiene su propio campo, siempre, en cualquier proveedor.

**10. OQ10 — ¿Qué se hace con la sección "Marcas" de Configuración?** *(consecuencia de OQ1)*
*Recomendación (Decisión 10):* esconderla, dejando el código.
✅ **RESUELTA — confirmada por el usuario junto con OQ1: SE ESCONDE, NO SE BORRA.** La pestaña "Marcas" de `Configuracion.jsx` deja de renderizarse, y `ConfiguracionMarcas.jsx`, `MarcaController`, `MarcaService(Impl)`, `MarcaRepository`, `MarcaDTO` y los endpoints `/api/marcas` **quedan en el repo sin tocar**, como red de rollback. Borrarlos de verdad es un `chore` posterior, no de este change.

**11. OQ11 — El "costo de envío": ¿porcentaje o monto fijo del pedido?** *(surgió de leer la planilla)*
*Recomendación:* mantenerlo como porcentaje.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. **Porcentaje, igual que hoy** (`UnidadNegocio.costoEnvioPorcentaje`, `Producto.costoEnvioPorcentaje`), que es lo que muestran las tres pestañas de su planilla (`1,05`). **Un flete fijo por pedido prorrateado sería un change aparte** —el prorrateo depende de si se reparte por unidades, por peso o por importe— y puede anotarse como candidato en el Backlog del roadmap, nunca como extensión implícita de éste.
