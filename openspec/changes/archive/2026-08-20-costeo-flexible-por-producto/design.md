> ### ⚠️ Gobernanza: **MEDIA-ALTA** — Reescribe la fórmula de costo que alimenta stock, costo histórico y rentabilidad
>
> Este change **reescribe la fórmula de costeo** que se ejecuta en cada `INGRESO`/`AJUSTE_INICIAL` y cuyo resultado se congela en `MovimientoStock.costoUnitario`. A través de la `@Formula` `Producto.costoUnitarioHistorico` —que lee el `costo_unitario` del **último** ingreso— ese número es el costo de referencia del producto y el insumo del margen y la valuación de inventario. No toca autenticación, cheques ni cuentas corrientes, así que **no** es CRÍTICO como `cheques-rebote-endosado`; pero es exactamente el mismo nivel de riesgo silencioso que `herramientas-pedidos-proveedores`, y por eso hereda su criterio.
>
> **El grupo que reescribe la fórmula en `MovimientoStockServiceImpl` requiere checkpoint explícito del usuario ANTES de escribir el código, no después.** Se le muestra la fórmula exacta resultante, aplicada con números sobre productos reales de Herramientas, y se compara contra el costo que esos productos tienen hoy. No alcanza con aprobar al pasar.
>
> Motivo concreto y verificado: un componente de costo mal ubicado en la cadena no rompe ninguna pantalla ni tira ninguna excepción. Se convierte en el costo "verdadero" del producto en el siguiente ingreso y falsea toda la valuación, en silencio. Y como el movimiento es inmutable por diseño, no se puede recalcular después: cada compra que entre con la fórmula equivocada es un dato histórico perdido.
>
> **Las 7 Open Questions del final ya están resueltas** (ver la sección *Open Questions — resueltas*). Cuatro las decidió el usuario explícitamente —lista libre de descuentos, cascada, IVA como costo real, y el descuento por efectivo fuera del modelo de producto—, más una quinta decisión de alcance derivada de las anteriores; las tres restantes quedaron por la recomendación documentada. No queda nada pendiente de definir antes de implementar.

## Context

### El pedido, en palabras del usuario

> "Agregar la opción de poder agregar más descuentos porque a veces tenemos varios descuentos como por ejemplo nos hacen un descuento por pagar con efectivo. Además el IVA el cuál es diferente para cada producto además de que el costo de envío es diferente para cada producto."

Tres necesidades: descuentos apilables, IVA por producto, envío por producto.

**Precisión posterior del usuario, que acota la primera:** el descuento por pagar en efectivo —el ejemplo que dio— **varía compra a compra**, no es una condición fija de ese producto ni de ese proveedor. Por eso la lista de descuentos que este change agrega al producto queda reservada a los descuentos **estables** (un acuerdo permanente con el proveedor, un descuento por volumen pactado, un pronto pago fijo), y el descuento por efectivo se sigue resolviendo como hoy: ajustando a mano el `costoUnitarioPactado` de la línea del pedido. Ver Decisión 14.

### La fórmula actual, verificada en código

`backend/src/main/java/com/vivero/gestion/services/impl/MovimientoStockServiceImpl.java`, rama `INGRESO`/`AJUSTE_INICIAL`:

```java
costoBase      = costoBaseExplicito != null ? costoBaseExplicito : producto.getCostoProducto();
descuentoPerc  = producto.getDescuentoProveedor();                       // por producto
costoEnvioPerc = producto.getUnidadNegocio().getCostoEnvioPorcentaje();  // por unidad de negocio

descuentoMonto    = costoBase × descuentoPerc / 100      → round(2, HALF_UP)
costoConDescuento = costoBase − descuentoMonto
envioMonto        = costoConDescuento × costoEnvioPerc / 100 → round(2, HALF_UP)
costoUnitarioFinal = costoConDescuento + envioMonto
```

Es decir: **`costo = (base − descuento%) + envío%` sobre el resultado del descuento.** No hay IVA en ninguna parte. `costoBaseExplicito` es el aporte de `herramientas-pedidos-proveedores`: cuando el ingreso viene de confirmar un pedido, el base es el `costoUnitarioPactado` del ítem en vez del `costoProducto` del producto. Eso no se toca en este change.

Verificado contra los tres productos reales de Herramientas que sirvieron de línea de base al change anterior (envío de la unidad = 5.00%):

| Producto | costo base | desc. | cálculo | `costo_unitario` real |
|---|---|---|---|---|
| id=4 Cinta aisladora | 2000.00 | 0.80% | `(2000 − 16) × 1.05` | **2083.20** ✅ |
| id=5 Cinta métrica | 5000.00 | 1.00% | `(5000 − 50) × 1.05` | **5197.50** ✅ |
| id=12 Destornillador | 10000.00 | 0.80% | `(10000 − 80) × 1.05` | **10416.00** ✅ |

Esos tres números son el contrato de no-regresión de este change: con IVA en 0 y un solo descuento, la fórmula nueva **tiene que dar exactamente lo mismo, al centavo**.

### Hallazgo estructural: la fórmula está escrita cuatro veces

No dos. Cuatro copias de la misma aritmética, ninguna de las cuales sabe de las otras:

| # | Ubicación | Para qué |
|---|---|---|
| 1 | `MovimientoStockServiceImpl` líneas 60-63 | rama `INGRESO`/`AJUSTE_INICIAL` |
| 2 | `MovimientoStockServiceImpl` líneas 80-83 | fallback de la rama de egresos cuando no hay ingreso previo |
| 3 | `ProductoServiceImpl.calcularPrecioSiAplica()` líneas 201-204 | derivar el precio de venta desde el costo |
| 4 | `frontend/src/components/ProductoForm.jsx` `calcCostoFinal()` líneas 66-73, más el desglose en vivo de las líneas 116-124 | preview interactivo del costo y del precio |

Con dos componentes y un descuento único, mantener cuatro copias sincronizadas es tedioso pero factible. Con **cuatro componentes, N descuentos y un orden de aplicación que hay que respetar**, es una garantía de divergencia: el día que una de las cuatro copias quede atrás, el sistema mostrará en pantalla un costo distinto del que congela en la base, y nadie se va a enterar. Consolidarlas no es una mejora opcional de este change: es una precondición para que el resto sea seguro.

### Qué se congela hoy en el movimiento

`MovimientoStock` guarda `costo_base`, `descuento_porcentaje`, `envio_porcentaje` y `costo_unitario`. Con **un** descuento y sin IVA, esos cuatro escalares reconstruyen exactamente el cálculo. Con varios descuentos y con IVA, **ya no**: `descuento_porcentaje` no puede representar "10% de proveedor y 5% por volumen" sin perder el desglose, y el IVA no tiene dónde guardarse. Un ingreso viejo dejaría de ser auditable.

### La trampa de `actualizarProducto()`

`ProductoServiceImpl.actualizarProducto()` decide si genera un `MovimientoStock` con esta condición (líneas 118-120, 141):

```java
boolean stockChanged    = ...;
boolean costChanged     = dto.getCostoProducto()      != null && !dto.getCostoProducto().equals(...);
boolean discountChanged = dto.getDescuentoProveedor() != null && !dto.getDescuentoProveedor().equals(...);
if (stockChanged || costChanged || discountChanged) { registrarMovimiento(...); }
```

O sea: **hoy cambiar el descuento de un producto ya dispara un movimiento nuevo**, justamente para que `costoUnitarioHistorico` refleje el costo nuevo. Si se agregan IVA y envío propios y esa condición no se extiende, editar sólo el IVA de un producto no generaría ningún movimiento y el costo histórico quedaría con el valor viejo **sin ninguna señal**. Es exactamente el modo de falla silenciosa que la gobernanza de este change viene a cubrir.

### El envío por unidad de negocio hoy

`UnidadNegocio.costoEnvioPorcentaje` (`precision=5, scale=2`, default `ZERO`) es editable desde `frontend/src/components/ConfiguracionHerramientas.jsx`. En la base real: Vivero = `0.00`, Herramientas = `5.00`. No existe ningún campo de IVA en esa entidad ni en ninguna otra.

### Precedente del Backlog del roadmap

`openspec/roadmap.md`, sección Backlog, al descartar la importación de catálogos por Excel dejó registrado que los proveedores de Herramientas manejan *"descuentos, descuentos por método de pago, moneda (algunos en USD con tipo de cambio propio), IVA y costo de envío"*. Este change atiende la parte de ese problema que **no** depende de importar nada. Moneda y tipo de cambio quedan fuera y siguen en el Backlog.

### Restricciones del proyecto que condicionan el diseño

- `ddl-auto=update`: Hibernate **crea** tablas y columnas nuevas, pero **no altera** el tipo ni la precisión de columnas que ya existen. Cualquier diseño que dependa de ensanchar una columna existente exige DDL manual. Este diseño lo evita a propósito (Decisión 7).
- Sin suite de tests automatizada. Toda verificación es manual sobre base real. Regla dura: si alguna vez se automatiza, base real o Testcontainers, **nunca** mocks de base de datos.
- DTOs siempre; Controller → Service → Repository; sin `findAll()` sin límite; feedback vía `useUIStore`.

## Goals / Non-Goals

**Goals:**

- Que el jefe pueda cargar **todos los descuentos estables** que le hacen sobre un producto, con su nombre, en vez de tener que combinarlos a mano en un número que después nadie puede interpretar.
- Que el IVA sea un componente explícito del costo, distinto por producto, y que quede registrado en el histórico de cada ingreso.
- Que el envío pueda ser propio de cada producto, sin obligar a cargarlo en los cientos de productos que sí comparten el valor de la unidad de negocio.
- Que exista **una sola** definición de la fórmula por lado (backend y frontend), y que esa definición esté escrita en una spec, no sólo en el código.
- Que el orden de aplicación de los cuatro componentes sea una decisión explícita y documentada, con números de ejemplo, no un efecto del orden de las líneas.
- Que ningún producto existente cambie de costo ni de precio por el solo hecho de aplicar este change.
- Que un `MovimientoStock` viejo siga siendo reconstruible, y que uno nuevo sea reconstruible incluso si el producto cambia de configuración después.

**Non-Goals:**

- **No** se importa ningún catálogo de proveedor. Sigue descartado en el Backlog del roadmap.
- **No** se agrega moneda ni tipo de cambio, aunque figuraban en la misma anotación del Backlog. Es otro problema, con otro modelo.
- **No** se recalculan los `MovimientoStock` ya registrados. Son inmutables por diseño; sus componentes nuevos quedan nulos/cero, que es la lectura correcta.
- **No** se modelan descuentos a nivel de `Pedido` ni descuentos por forma de pago elegida en el momento de comprar. Quedó **explícitamente descartado del alcance de este change** por decisión del usuario, no diferido por falta de definición: el descuento por pagar en efectivo se sigue reflejando ajustando el `costoUnitarioPactado` de la línea del pedido, mecanismo que ya existe desde `herramientas-pedidos-proveedores` y que no requiere desarrollo nuevo. Ver Decisión 14.
- **No** se modelan en la lista de descuentos del producto los descuentos que varían compra a compra. La lista es para condiciones **estables**.
- **No** se reabre la Decisión 6 de `herramientas-pedidos-proveedores`: confirmar la recepción de un pedido sigue sin pisar `Producto.costoProducto` ni `Producto.precio`.
- **No** se toca la rama de egresos de `registrarMovimiento`, que copia el desglose del último ingreso en vez de recalcular. Ese comportamiento es correcto y se preserva (extendido a los campos nuevos).
- **No** se construye ningún reporte ni dashboard sobre estos datos. Este change los genera; leerlos es de `us-017-finanzas-ui`.
- **No** se toca el circuito de ventas, cheques, cuentas corrientes, bandejas ni siembras.

## Decisions

### Decisión 1 — Los descuentos estables son una lista con nombre, no N columnas fijas

**Decidido por el usuario (OQ1): lista libre con nombre.** No dos campos fijos.

Entidad hija **`ProductoDescuento`** (tabla `producto_descuentos`):

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `Long` | identity |
| `producto` | `@ManyToOne Producto` | dueño |
| `nombre` | `String(100)` | obligatorio — `Proveedor`, `Volumen`, `Pronto pago`, … |
| `porcentaje` | `BigDecimal(5,2)` | obligatorio, `>= 0` |
| `orden` | `Integer` | sólo para presentación estable (ver Decisión 2) |

En `Producto`: `@OneToMany(mappedBy="producto", cascade=ALL, orphanRemoval=true)`, el mismo molde que `Pedido.detalles`.

**Qué entra en esta lista y qué no.** Entran los descuentos **estables**: los que el proveedor aplica siempre a ese producto (acuerdo permanente, volumen pactado, pronto pago fijo). **No** entran los que varían compra a compra —el descuento por pagar en efectivo, entre ellos—, porque un porcentaje que cambia en cada compra modelado como atributo del producto significaría "a este producto siempre se lo compro así", y el segundo ingreso quedaría congelado con un descuento que no se aplicó. Ver Decisión 14.

**Por qué una lista y no dos columnas fijas.** El usuario confirmó que quiere poder cargar **varios** descuentos y ponerles nombre. Una segunda columna fija resuelve un caso y rompe el día que aparezca un tercero (volumen, temporada, pronto pago). Peor: obligaría a que el jefe volviera a combinar dos descuentos a mano dentro de un campo, que es exactamente el problema que este change viene a eliminar.

**Por qué el nombre es obligatorio.** El valor real para el jefe no es el número final: es poder mirar un producto y ver *"Proveedor 10%, Volumen 5%"*. Un descuento sin nombre es otra vez un número opaco. Es también lo que hace legible el desglose congelado en el movimiento (Decisión 7).

*Alternativa descartada:* un `@ElementCollection` de porcentajes sin nombre. Más liviano, pero pierde justamente lo que da valor. *Alternativa descartada:* dos columnas fijas (`descuentoProveedor` + `descuentoEfectivo`) — descartada por el usuario en OQ1, y además incompatible con la Decisión 14 (el descuento por efectivo no vive en el producto).

### Decisión 2 — Los descuentos se combinan **en cascada** (multiplicativos), no sumando los porcentajes

**Decidido por el usuario (OQ2): cascada.** Se le mostraron los dos números y eligió cascada: cada descuento se aplica sobre el resultado del anterior. Ejemplo que confirmó: $10.000 con 10% + 5% → $9.000 → **$8.550**.

```
netoConDescuentos = costoBase × (1 − d₁/100) × (1 − d₂/100) × … × (1 − dₙ/100)
```

Con 10% y 5% sobre 10.000: `10000 × 0.90 × 0.95 = 8550`. Sumando daría `10000 × 0.85 = 8500`. **Diferencia real: 50 pesos** sobre 10.000, o sea 0,5% del costo. Con 3 descuentos la brecha crece.

**Por qué cascada.** Es la convención comercial del rubro: un proveedor que ofrece "10 y 5" aplica el 5 sobre el neto ya descontado, no sobre la lista. Es también lo que hace la factura del proveedor, así que es el número que el jefe va a ver cuando compare el sistema contra el papel. Y tiene una propiedad práctica importante: **el producto de factores es conmutativo**, así que el resultado no depende del orden en que se carguen los descuentos. Eso hace que `orden` sea puramente presentacional y que reordenar la lista nunca cambie un costo.

*Alternativa descartada:* sumar los porcentajes (`10 + 5 = 15%`). Más intuitivo para explicar, pero da un número que el proveedor no factura. Se le presentó al usuario con ambos números (8.550 vs. 8.500) y **descartó la suma**. La implementación no debe dejar ninguna variante configurable: la cascada es la única fórmula.

### Decisión 3 — Orden de aplicación: base → descuentos → IVA y envío, **ambos sobre el neto con descuentos**

**Resuelta por la recomendación (OQ6), sin objeción del usuario.**

```
1. costoBase          = costoBaseExplícito ?? producto.costoProducto     (sin cambios)
2. netoConDescuentos  = costoBase × Π (1 − dᵢ/100)                        (Decisión 2)
3. montoIva           = netoConDescuentos × iva% / 100
4. montoEnvio         = netoConDescuentos × envio% / 100
5. costoUnitario      = netoConDescuentos + montoIva + montoEnvio
```

Tres razones, en orden de peso:

**(a) Es compatible hacia atrás por construcción.** Con `iva% = 0` y un solo descuento, el paso 3 aporta 0 y la expresión colapsa **exactamente** en la fórmula de hoy: `(base − desc%) + envío% sobre eso`. No hay que confiar en que los números coincidan: coinciden algebraicamente. Los tres productos reales de la tabla del Context lo verifican al centavo.

**(b) El IVA se calcula sobre el neto, como en cualquier factura.** Los descuentos comerciales se aplican antes del impuesto; el impuesto grava lo que efectivamente se paga por la mercadería. Aplicar IVA sobre el bruto y después descontar daría un IVA mayor al que el proveedor factura.

**(c) El envío no se infla al activar el IVA.** Si el envío se calculara sobre `neto + IVA`, el día que el jefe cargue 21% de IVA en un producto, su flete —que es un porcentaje del costo de la mercadería— subiría un 21% solo, sin que nadie haya tocado el flete. Calculando ambos sobre el mismo neto, cada porcentaje sigue significando lo que significaba.

Ejemplo completo, base 10.000, descuentos 10% (Proveedor) + 5% (Volumen), IVA 21%, envío 5%:

| Paso | Cálculo | Resultado |
|---|---|---|
| Costo base | — | 10.000,00 |
| Descuentos en cascada | `10000 × 0.90 × 0.95` | **8.550,00** |
| IVA 21% sobre el neto | `8550 × 0.21` | +1.795,50 |
| Envío 5% sobre el neto | `8550 × 0.05` | +427,50 |
| **Costo unitario final** | | **10.773,00** |

*Alternativa descartada:* envío antes del IVA y el IVA gravando también el flete (`(neto + envío) × (1 + iva)`). Es lo más parecido a una factura real (el flete también tributa), pero rompe la compatibilidad hacia atrás y hace que el porcentaje de envío deje de ser comparable con el que el jefe tiene cargado hoy.

### Decisión 4 — El IVA es **costo real** y se **suma** al costo

**Decidido por el usuario (OQ3): el negocio es MONOTRIBUTISTA.** El IVA que paga al comprar **no** es crédito fiscal recuperable: es plata que sale y no vuelve. Por lo tanto es costo real, se suma al `costoUnitario` y **no** queda como dato meramente informativo.

`costoUnitario` incluye el IVA. La consecuencia hay que decirla completa: como `calcularPrecioSiAplica()` aplica el `porcentajeGanancia` **sobre el costo final**, cargarle 21% de IVA a un producto le sube el precio de venta en la misma proporción. **Eso es correcto y deseado bajo monotributo**: el IVA de compra forma parte de lo que hay que recuperar en el precio de venta, porque no se descuenta contra nada.

Es coherente además con el estado del sistema: no hay libro de IVA, no hay declaración, no hay compensación entre IVA compras e IVA ventas, y bajo monotributo no tiene que haberlos.

*Alternativa descartada por el usuario:* modelar el IVA como informativo (se guarda, se muestra, no entra en el costo). Habría sido lo correcto para un **responsable inscripto**, donde el IVA de compra es crédito recuperable. No es el caso de este negocio. Queda anotado que, si la condición fiscal cambiara alguna vez, el modelo de datos no cambia: sólo el paso 3 de la Decisión 3 pasaría a aportar cero al costo.

### Decisión 5 — IVA y envío por producto, con **fallback** al valor de la unidad de negocio

**Resuelta por la recomendación (OQ4), sin objeción del usuario.**

En `Producto`, ambos campos son **nullable** y `null` significa *"usar el default de la unidad de negocio"*, no *"cero"*:

| Campo | Tipo | `null` significa |
|---|---|---|
| `Producto.ivaPorcentaje` | `BigDecimal(5,2)` nullable | usar `UnidadNegocio.ivaPorcentaje` |
| `Producto.costoEnvioPorcentaje` | `BigDecimal(5,2)` nullable | usar `UnidadNegocio.costoEnvioPorcentaje` |

En `UnidadNegocio` se agrega `ivaPorcentaje` (`BigDecimal(5,2)`, default `ZERO`), simétrico al `costoEnvioPorcentaje` que ya existe y editable desde el mismo `ConfiguracionHerramientas.jsx`.

**Por qué fallback y no reemplazo.** Tres razones concretas:

1. **Migración gratis.** Ningún producto existente tiene envío propio; todos quedan en `null` y siguen usando el 5.00% de Herramientas. El costo de todos los productos existentes queda **idéntico**, sin script de backfill y sin riesgo. Un reemplazo total obligaría a copiar el valor de la unidad a los cientos de productos, y cualquier producto que quedara afuera pasaría silenciosamente a envío 0.
2. **Carga operativa.** El jefe carga "21" una vez en la configuración de Herramientas en vez de en cada producto, y sólo toca los productos que son la excepción — que es literalmente lo que dijo: el IVA es distinto *para algunos* productos, no distinto para todos.
3. **El campo de la unidad no muere.** `ConfiguracionHerramientas.jsx` sigue siendo útil y su semántica pasa de "el envío" a "el envío por defecto", que es un cambio de etiqueta, no de mecanismo.

**Distinción crítica entre `null` y `0`:** son cosas distintas y el modelo tiene que poder expresarlas. `null` = "lo que diga la unidad de negocio"; `0` = "este producto no paga envío / no tiene IVA", aunque la unidad diga otra cosa. Es el mismo criterio que `PedidoDetalle.cantidadRecibida` en el change anterior, y por la misma razón: colapsar los dos casos en `0` haría imposible expresar la excepción. Consecuencia directa en la UI: el campo tiene que poder quedar **vacío** (mostrando el valor heredado como placeholder), y vaciarlo debe volver a `null`, no escribir `0`.

### Decisión 6 — Una sola implementación de la fórmula por lado

**Backend:** una clase de dominio sin estado, p. ej. `services/CostoCalculator.java` (o el nombre que se acuerde), con una entrada y una salida explícitas:

- entrada: `costoBase`, la lista de porcentajes de descuento, el IVA efectivo y el envío efectivo (ya resueltos por el fallback de la Decisión 5);
- salida: un objeto con `netoConDescuentos`, `montoIva`, `montoEnvio`, `descuentoEfectivoPorcentaje` y `costoUnitario`.

Los **tres** llamadores de backend pasan a usarla, sin excepción: las dos ramas de `MovimientoStockServiceImpl` y `ProductoServiceImpl.calcularPrecioSiAplica()`. Ninguno conserva aritmética propia. Es el mismo criterio de la Decisión 4 de `herramientas-pedidos-proveedores` ("una sola implementación de la fórmula, no dos"), llevado hasta el final.

Que devuelva el desglose y no sólo el total no es adorno: es lo que permite que el movimiento congele el detalle (Decisión 7) y que el formulario muestre el mismo desglose que la base va a guardar.

**Frontend:** un módulo utilitario equivalente, p. ej. `frontend/src/utils/costeo.js`, con la misma firma y el mismo orden de operaciones, consumido por `ProductoForm.jsx` (que hoy tiene su copia en `calcCostoFinal` y otra en el bloque de desglose en vivo). No se puede compartir código real entre Java y JS; lo que sí se puede es que haya **una** copia de cada lado y que las dos estén escritas contra la misma spec, con los mismos ejemplos numéricos verificables.

*Alternativa descartada:* dejar la fórmula duplicada y sincronizar a mano las cuatro copias. Es lo que hay hoy y ya cuesta; con cuatro componentes y N descuentos, la primera divergencia haría que la pantalla muestre un costo y la base guarde otro — el peor modo de falla posible para este dominio, porque el usuario confía en lo que ve.

### Decisión 7 — Qué se congela en `MovimientoStock`: el desglose completo, sin tabla hija

Columnas nuevas en `movimientos_stock`, todas nullable (los movimientos históricos quedan en `null`, que se lee como *"no había esto cuando se congeló"*):

| Columna | Tipo | Contenido |
|---|---|---|
| `costo_neto` | `numeric(12,2)` | el neto después de todos los descuentos — el número del paso 2 |
| `iva_porcentaje` | `numeric(5,2)` | el IVA efectivo aplicado |
| `descuento_detalle` | `varchar(500)` | snapshot legible, p. ej. `"Proveedor 10.00%; Volumen 5.00%"` |

Y se **reinterpreta** —sin cambiar el tipo— la columna existente `descuento_porcentaje`: pasa a guardar el **descuento efectivo total** (el porcentaje único equivalente a la cascada; para 10% + 5% en cascada, `14.50`). Con un solo descuento es exactamente el mismo valor de siempre, así que las filas históricas siguen significando lo mismo. Queda como dato de presentación.

`costo_base`, `envio_porcentaje` y `costo_unitario` no cambian de significado.

**Por qué `costo_neto` y no ensanchar `descuento_porcentaje`.** Guardar sólo el porcentaje efectivo obligaría a más decimales para que la reconstrucción cerrara al centavo (una cascada de tres descuentos da porcentajes como `17.065%`), y `ddl-auto=update` **no altera la precisión de una columna existente**: haría falta un `ALTER TABLE` manual. Guardando el neto en una columna nueva, la fila queda auto-consistente y exacta —`base` → `neto` → `+ IVA% + envío%` → `unitario`— sin ningún DDL manual y sin problema de precisión. Es la razón por la que este change conserva la propiedad del anterior: **Hibernate crea todo, no hay script de migración de esquema**.

**Por qué un snapshot de texto y no una tabla hija de descuentos del movimiento.** El único consumidor del desglose individual es una persona mirando el historial de un ingreso viejo. Una tabla `movimiento_descuentos` daría fidelidad total, pero agrega una escritura más dentro de la transacción atómica del ingreso, un `@OneToMany` más en la entidad más caliente del sistema, y N+1 en cualquier listado de movimientos — todo para un dato que nadie va a agregar ni filtrar. El texto es suficiente para el propósito real. *Alternativa también descartada:* una columna `jsonb`. Postgres la soporta, pero no hay ningún precedente de JSON en el modelo de este repo y no compra nada frente al texto plano para este uso.

### Decisión 8 — Migración del descuento existente: se convierte en el primer descuento, y la columna vieja se deja de leer

El `descuento_proveedor` de cada producto existente se convierte, una sola vez, en una fila de `producto_descuentos` con `nombre = "Proveedor"`, `porcentaje =` el valor actual y `orden = 0`. Después de eso, **la fórmula lee únicamente la colección**.

Reglas de la migración, todas necesarias para que sea segura:

- Es **idempotente**: si el producto ya tiene descuentos cargados, no hace nada. Corre al arrancar y puede correr muchas veces (el backend se reinicia; `DataInitializer` ya funciona así).
- Los productos con `descuento_proveedor` en `0` o `null` **no** generan una fila de descuento del 0%. Un descuento del 0% es ruido visual en la UI y no cambia ningún número.
- La columna `productos.descuento_proveedor` **no se dropea**. Queda en la base, congelada, como red de rollback. Pero deja de leerse en el cálculo.

**El riesgo número uno de este change es el doble conteo**: que la fórmula lea la colección *y además* siga leyendo `producto.getDescuentoProveedor()`, aplicando el mismo descuento dos veces. Sobre 10.000 con 10%, eso daría 8.100 en vez de 9.000 y nadie lo notaría hasta ver el margen. Por eso la verificación no es "que el código compile" sino **grep explícito de que `getDescuentoProveedor()` ya no aparece en ninguna ruta de cálculo**, más la comparación al centavo contra la línea de base de los tres productos reales.

*Alternativa descartada:* mantener `descuentoProveedor` como "el descuento principal" y usar la colección sólo para los adicionales. Evita la migración, pero deja dos fuentes de verdad para la misma cosa — exactamente el escenario que produce el doble conteo. Un modelo con dos lugares donde puede vivir un descuento es un modelo que se va a desincronizar.

### Decisión 9 — `actualizarProducto()` tiene que detectar los componentes nuevos

Como estableció el Context, la condición que hoy decide si se genera un `MovimientoStock` al editar un producto es `stockChanged || costChanged || discountChanged`. Se extiende para incluir: cambios en el **IVA propio**, cambios en el **envío propio**, y cambios en la **lista de descuentos** (alta, baja o modificación de cualquier fila, no sólo del primer porcentaje).

**Por qué importa tanto.** Sin esto, editar el IVA de un producto no genera movimiento; `costoUnitarioHistorico` sigue leyendo el ingreso anterior; la pantalla del formulario muestra el costo nuevo (porque lo calcula en vivo) y la base sigue guardando el viejo. El usuario ve un número y el sistema usa otro, sin ningún error. Es el mismo modo de falla que motiva la gobernanza del change, aplicado a la ruta de edición en vez de a la de ingreso.

Comparar la lista de descuentos requiere una comparación real de conjuntos (nombre + porcentaje), no una comparación de referencias ni de tamaño. Un cambio de `Volumen 5%` a `Volumen 7%` no cambia la cantidad de descuentos.

*Nota de alcance:* cambiar el **default de la unidad de negocio** (el IVA o el envío de Herramientas) sigue **sin** generar movimientos, igual que hoy. Ver el Riesgo correspondiente: es un comportamiento preexistente que este change no empeora pero tampoco resuelve.

### Decisión 10 — Redondeo: escala interna alta, redondeo único al final

Hoy cada monto intermedio se redondea a 2 decimales con `HALF_UP`. Con dos pasos el arrastre es despreciable; con una cascada de N descuentos más IVA más envío, redondear en cada paso acumula error de forma sistemática (siempre en la misma dirección para un mismo conjunto de números).

Se calcula con **escala 6, `HALF_UP`** en todos los intermedios y se redondea a **2 decimales `HALF_UP` una sola vez**, sobre el `costoUnitario` final y sobre cada monto que se muestre o se persista.

**Condición de aceptación, no negociable:** los tres productos reales de la tabla del Context (2083.20 / 5197.50 / 10416.00) tienen que dar **el mismo centavo** con la fórmula nueva. Si alguno se corre un centavo, se vuelve al redondeo por paso y se documenta — la compatibilidad hacia atrás manda sobre la elegancia del redondeo.

### Decisión 11 — La colección de descuentos no puede introducir N+1

`ProductoServiceImpl.obtenerTodosLosProductos()` mapea todos los productos de la unidad a DTO. Un `@OneToMany` LAZY leído dentro de `mapToDTO()` dispara una consulta por producto.

Mitigación: `@BatchSize` de Hibernate sobre la colección, que agrupa la carga en lotes. Es una anotación de una línea y el repo ya usa anotaciones específicas de Hibernate en el modelo (`@Formula`, `@SQLDelete`, `@SQLRestriction`), así que no introduce ningún patrón nuevo.

Vale notar que el listado de productos **ya** ejecuta una subconsulta correlacionada por fila, por la `@Formula` de `costoUnitarioHistorico`. Este change no puede arreglar eso, pero tampoco tiene permiso para agregarle un segundo N+1 encima.

### Decisión 12 — La UI vive dentro del panel de costos que ya existe; el backend no sabe de unidades de negocio

**Resuelta por la recomendación (OQ5), sin objeción del usuario.**

**Frontend:** todos los campos nuevos van dentro del bloque de análisis de costos de `ProductoForm.jsx`, el que hoy se renderiza bajo `unidadNegocioActiva === '2'` y ya contiene Costo Catálogo, Desc. Prov (%), % Ganancia y Precio Venta más el desglose en vivo. **No hay pantalla nueva ni flujo aparte.** Los descuentos pasan a ser filas agregables/borrables (nombre + porcentaje) donde hoy hay un solo campo "Desc. Prov (%)", y el desglose de la derecha suma una línea por descuento más la línea de IVA. El IVA por defecto de la unidad se edita en `ConfiguracionHerramientas.jsx`, al lado del envío por defecto que ya está ahí.

Consecuencia deseada: **Vivero no ve ninguno de los campos nuevos**, porque no ve el panel. Con IVA por defecto 0 y envío 0, sus productos calculan exactamente el mismo costo que hoy.

**Backend:** el calculador y las entidades son agnósticos de la unidad de negocio. Ningún `if (unidadId == 2)` en la capa de servicio, mismo criterio que la Decisión 9 de `herramientas-pedidos-proveedores`. El scoping por unidad ya lo hace el `UnidadNegocioContextHolder` en los servicios existentes.

**Responsive y convenciones:** las filas de descuento nacen con el patrón del repo — `FormattedNumberInput` para los porcentajes, `cursor-pointer` en los botones de agregar/quitar, íconos de `lucide-react` (`Plus` / `Trash2`), feedback vía `useUIStore`, y usables a 320px sin desborde horizontal. El panel de costos hoy es una `grid grid-cols-4`; con filas repetibles adentro hay que verificar explícitamente que no desborda en mobile.

### Decisión 13 — Los movimientos históricos no se recalculan

Los `MovimientoStock` ya registrados quedan **exactamente como están**. Sus columnas nuevas (`costo_neto`, `iva_porcentaje`, `descuento_detalle`) quedan en `null`.

**Por qué.** Un movimiento es un hecho pasado: congela lo que costó esa compra **con la información que existía en ese momento**. No había IVA registrado; escribirle uno ahora sería inventar un dato retroactivo y, peor, cambiaría el `costoUnitario` que ya alimentó cualquier análisis hecho hasta hoy. La inmutabilidad del historial es un invariante del sistema desde `us-013`, no una limitación.

Consecuencia visible y aceptada: al mirar el historial habrá un antes y un después. Los ingresos previos a este change no muestran desglose de IVA. Es la lectura correcta.

### Decisión 14 — El descuento por pagar en efectivo **no** se modela en este change

**Decidido por el usuario (OQ7 + pregunta de alcance derivada).** El usuario confirmó que el descuento por pagar en efectivo **varía compra a compra**: no es una condición fija del producto ni del proveedor. Eso lo pone en tensión directa con la Decisión 1 —una lista de descuentos que vive en el `Producto` describe condiciones permanentes—, y la resolución de alcance que eligió es:

1. **La lista de descuentos del `Producto` queda reservada a descuentos estables.** Un acuerdo permanente con el proveedor, un descuento por volumen pactado, un pronto pago fijo. Todo lo que se cumple en toda compra de ese producto.
2. **El descuento por efectivo se sigue resolviendo como hoy:** ajustando a mano el `costoUnitarioPactado` de la línea del pedido. Ese mecanismo **ya existe** desde `herramientas-pedidos-proveedores` (ya archivado) y entra en la fórmula como **costo base explícito** (paso 1 de la Decisión 3), así que el descuento de esa compra puntual queda reflejado en el costo congelado del ingreso sin necesidad de ningún desarrollo nuevo. **Este change no agrega ni una tarea por este caso.**
3. **Descuentos a nivel de `Pedido` quedan explícitamente FUERA DE ALCANCE.** Se le presentó al usuario como la alternativa que cubriría el caso de raíz con más precisión (un descuento cargado en la cabecera del pedido, aplicable a todas sus líneas) y **no la eligió**. No es un pendiente sin definir ni una tarea diferida dentro de este change: está descartada. Si más adelante el ajuste manual resultara insuficiente, se anota como candidato a change propio en el Backlog del roadmap — nunca como extensión implícita de éste.

**Por qué esto no invalida nada del resto del diseño.** La lista de descuentos, la cascada, el IVA y el envío se construyen igual; lo único que cambia es **qué se espera que se cargue ahí**. Y como el costo base explícito del pedido ya es el primer eslabón de la fórmula, el descuento por efectivo de una compra concreta ya queda representado en el número que se congela, sólo que sin nombre propio en el desglose. Es una pérdida de granularidad aceptada por el usuario a cambio de no modelar nada nuevo.

**Consecuencia práctica para la implementación:** ningún ejemplo, etiqueta, placeholder ni dato de prueba de este change debe usar `Efectivo` como nombre de descuento de producto. Sugerir ese nombre en la UI empujaría al usuario justamente al modelado que esta decisión descarta. Los ejemplos canónicos son `Proveedor`, `Volumen`, `Pronto pago`.

## Risks / Trade-offs

**[Doble conteo del descuento migrado]** → El riesgo número uno. Si la fórmula lee la colección de descuentos *y* sigue leyendo `producto.getDescuentoProveedor()`, cada producto migrado recibe su descuento dos veces y el costo baja sin que nada falle. *Mitigación:* la Decisión 8 lo prohíbe explícitamente; la verificación exige `grep` de que `getDescuentoProveedor()` no aparece en ninguna ruta de cálculo, más comparación al centavo contra la línea de base de los tres productos reales, más contar las filas de `producto_descuentos` después de la migración y confirmar que es exactamente una por producto con descuento no nulo y distinto de cero.

**[La fórmula queda desincronizada entre backend y frontend]** → Son dos implementaciones en dos lenguajes; nada las obliga a coincidir. Si divergen, el formulario muestra un costo y la base guarda otro. *Mitigación:* la Decisión 6 reduce de cuatro copias a dos; la spec de `costeo-productos` fija los ejemplos numéricos; y la verificación incluye cargar el mismo producto en el formulario y en la base y comparar el costo al centavo — no "mirar que se parezca".

**[El IVA sube el precio de venta al cargarlo]** → `calcularPrecioSiAplica()` aplica el `porcentajeGanancia` sobre el costo final; cargar 21% de IVA a un producto le sube el precio de venta en la misma proporción. *Estado:* **no es un riesgo, es el comportamiento buscado.** El usuario confirmó que el negocio es monotributista (Decisión 4), así que el IVA de compra no se recupera contra nada y tiene que estar dentro del precio. Lo que sí queda como advertencia operativa es el momento: el precio sube recién cuando el producto se edita, no al cambiar el IVA por defecto de la unidad (ver el riesgo siguiente).

**[Precios de venta desincronizados al cambiar un default de la unidad]** → `calcularPrecioSiAplica()` sólo corre al crear o editar **un producto**. Cambiar el IVA o el envío por defecto de Herramientas afecta de inmediato el costo de todos los ingresos futuros, pero **no** recalcula el `precio` de los productos ya guardados: quedan con un precio derivado de un costo que ya no es el vigente, hasta que alguien los edite uno por uno. Esto ya pasa hoy con el envío; este change lo hace más visible al agregar un segundo default. *Mitigación:* no se resuelve en este change (un recálculo masivo de precios es un efecto demasiado grande para colgar de una pantalla de configuración), pero se advierte explícitamente en la UI de `ConfiguracionHerramientas.jsx` al guardar, y se deja anotado como candidato a change propio.

**[Arrastre de redondeo con varios descuentos]** → Cada paso redondeado desplaza el resultado siempre en la misma dirección. *Mitigación:* Decisión 10 (escala 6 interna, redondeo único al final) más la condición de aceptación de que los tres productos de línea de base den el mismo centavo que hoy.

**[Editar sólo el IVA o el envío no genera movimiento]** → Si la condición de `actualizarProducto()` no se extiende, el costo histórico queda viejo sin ninguna señal. *Mitigación:* Decisión 9, con tarea de verificación propia: editar únicamente el IVA de un producto y confirmar en base que apareció un `MovimientoStock` nuevo con el costo nuevo.

**[N+1 en el listado de productos]** → La colección LAZY se lee por producto en el mapeo a DTO. *Mitigación:* Decisión 11 (`@BatchSize`), más verificación con el log de SQL de Hibernate sobre un listado real de Herramientas.

**[Vaciar un campo escribe 0 en vez de null]** → En React un input vacío es `''`, y `parseFloat('')` es `NaN`; el patrón actual de `ProductoForm.jsx` (`campo ? parseFloat(campo) : null`) manda `null`, pero un `0` tipeado y después borrado es fácil que termine como `0`. Como `null` y `0` significan cosas distintas (Decisión 5), confundirlos hace que un producto deje de heredar el default silenciosamente. *Mitigación:* tarea de verificación explícita en los dos sentidos — cargar un valor propio y después vaciarlo, confirmando en base que la columna vuelve a `NULL` y que el costo vuelve a usar el default de la unidad.

**[Sin tests automatizados]** → El proyecto no tiene runner de tests de frontend ni suite de backend. Toda la verificación de este change es manual sobre base real. *Mitigación:* la línea de base del grupo 1 y la comparación al centavo son el sustituto. Si alguna vez se automatiza, regla dura: base real o Testcontainers, **nunca** mocks de base de datos.

**[El descuento por efectivo queda sin nombre propio en el desglose]** → Al resolverse ajustando el `costoUnitarioPactado` del pedido (Decisión 14), ese descuento entra al cálculo dentro del **costo base** y no aparece como una línea nombrada ni en el desglose del formulario ni en el `descuentoDetalle` congelado del movimiento. Mirando un ingreso viejo se ve un costo base más bajo, no "Efectivo 5%". *Trade-off explícitamente aceptado por el usuario*, que prefirió eso antes que modelar descuentos a nivel de `Pedido`. *Mitigación parcial:* el pedido conserva su propio registro de lo pactado por línea, así que la trazabilidad existe — sólo que del lado del pedido y no del lado del costeo. *Riesgo residual a vigilar:* que alguien cargue igual un descuento llamado "Efectivo" en la lista del producto y quede aplicado en todas las compras. Por eso la Decisión 14 prohíbe usar ese nombre como ejemplo o placeholder en la UI.

**[Alcance real de la UI de descuentos]** → Pasar de un input único a filas repetibles dentro de un panel que ya es una `grid grid-cols-4` es más trabajo de layout del que sugiere la descripción, especialmente a 320px. *Trade-off aceptado:* es la parte del change que el usuario efectivamente va a tocar todos los días; recortarla ahí sería recortar justo lo que pidió.

## Migration Plan

1. **Antes de tocar nada**, registrar la línea de base: `costo_producto`, `descuento_proveedor`, `precio`, `porcentaje_ganancia` y el `costo_unitario` del último `INGRESO`/`AJUSTE_INICIAL` de al menos tres productos reales de Herramientas, más el `costo_envio_porcentaje` de las dos unidades de negocio. Sin esa foto no se puede demostrar que la fórmula nueva no movió nada. Es el grupo 1 de `tasks.md`.
2. Hibernate (`ddl-auto=update`) crea la tabla `producto_descuentos` y las columnas nuevas de `productos`, `unidades_negocio` y `movimientos_stock` al arrancar. **Sin script de esquema manual** — la Decisión 7 está diseñada para que no haga falta ningún `ALTER TABLE`.
3. `UnidadNegocio.ivaPorcentaje` nace en `0.00` para las dos unidades. Con IVA 0 la fórmula nueva es algebraicamente idéntica a la vieja, así que **el arranque no cambia ningún costo**. El jefe carga el 21% (o lo que corresponda) cuando decide hacerlo, y ese es un acto explícito suyo, no un efecto del deploy.
4. Migración de datos, una sola vez e idempotente: por cada producto con `descuento_proveedor` no nulo y distinto de cero, crear una fila en `producto_descuentos` con `nombre = "Proveedor"` y ese porcentaje. Productos sin descuento no generan nada. Productos que ya tienen descuentos cargados no se tocan.
5. Verificación inmediata post-migración: recalcular el costo de los tres productos de la línea de base y confirmar que da **el mismo centavo** que antes. Si no da, se detiene y se revisa antes de seguir — no se avanza con una diferencia "chica".
6. Los `MovimientoStock` existentes no se tocan (Decisión 13).
7. **Rollback:** revertir el código. `productos.descuento_proveedor` sigue en la base con su valor original y sin haber sido modificada, así que la fórmula vieja vuelve a funcionar tal cual. Las columnas y la tabla nuevas quedan sin uso y sin FK entrantes desde tablas preexistentes; se pueden dropear a mano o dejar. El único efecto persistente serían los `MovimientoStock` generados mientras el change estuvo activo, que son movimientos legítimos con su costo correcto según la configuración vigente en ese momento — no hace falta deshacerlos.
8. El negocio **Vivero** no requiere ninguna acción: no ve el panel de costos, su envío y su IVA por defecto son 0, y sus productos calculan el mismo costo que hoy.

## Open Questions — resueltas

Las 7 preguntas que abrió este diseño están **cerradas**. Se deja el registro de qué se preguntó, qué se recomendaba y qué se decidió, para que la implementación no las reabra ni las trate como abiertas. Cuatro las respondió el usuario explícitamente (OQ1, OQ2, OQ3, OQ7), más una quinta pregunta de alcance derivada de la tensión entre OQ1 y OQ7; las tres restantes (OQ4, OQ5, OQ6) quedaron por la recomendación, sin objeción.

**1. ¿Cuántos descuentos simultáneos, y son un número fijo o una lista libre?**
*Recomendación (Decisión 1):* lista libre con nombre, no columnas fijas.
✅ **RESUELTA — decidida por el usuario: LISTA LIBRE, con nombre.** No dos campos fijos. Con la acotación de la OQ7/pregunta 5: la lista es para descuentos **estables**.

**2. ¿Los descuentos se suman o se aplican en cascada?**
*Recomendación (Decisión 2):* cascada.
✅ **RESUELTA — decidida por el usuario: CASCADA.** Se le mostraron los dos números y eligió cascada: cada descuento se aplica sobre el resultado del anterior. Ejemplo confirmado: $10.000 con 10% + 5% → $9.000 → **$8.550** (no $8.500). La suma de porcentajes queda descartada y no debe quedar como opción configurable en el código.

**3. ¿El IVA se suma al costo o es sólo informativo?**
*Recomendación (Decisión 4):* se suma, con la salvedad de que la respuesta depende de la condición fiscal del negocio.
✅ **RESUELTA — decidida por el usuario: el negocio es MONOTRIBUTISTA, el IVA SÍ es costo real.** No es crédito fiscal recuperable, así que **se suma al costo** y no queda como dato meramente informativo. Que el precio de venta suba en consecuencia es el comportamiento correcto bajo monotributo.

**4. ¿El IVA y el envío por producto reemplazan el valor de la unidad de negocio, o la unidad queda como default?**
*Recomendación (Decisión 5):* default con fallback; `null` en el producto significa "usar el de la unidad", no "cero".
✅ **RESUELTA por la recomendación**, sin objeción del usuario. Migración gratis, sin backfill, y la distinción `null` vs `0` se mantiene explícita en modelo y UI.

**5. ¿Dónde se cargan los campos nuevos: en el alta/edición de producto o en una pantalla propia?**
*Recomendación (Decisión 12):* en `ProductoForm.jsx`, dentro del panel de análisis de costos que ya existe para Herramientas; los defaults de la unidad en `ConfiguracionHerramientas.jsx`.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. Sin pantalla nueva ni flujo aparte.

**6. ¿En qué posición de la cadena entra el IVA?**
*Recomendación (Decisión 3):* `base → descuentos en cascada → (IVA + envío, ambos sobre el neto con descuentos)`.
✅ **RESUELTA por la recomendación**, sin objeción del usuario. Es compatible hacia atrás por construcción (con IVA 0 colapsa exactamente en la fórmula vigente) y evita que el envío se infle solo al activar el IVA.

**7. ¿El descuento por pagar en efectivo es una propiedad del producto o de la compra?**
*Recomendación original (Decisión 1):* modelarlo igual en `Producto` por ahora.
✅ **RESUELTA — decidida por el usuario, y en contra de la recomendación original: el descuento por efectivo VARÍA COMPRA A COMPRA.** No es una condición fija del producto ni del proveedor, así que **no se modela como descuento de producto en este change**.

**5.bis (pregunta de alcance derivada, planteada al usuario porque OQ4/OQ1 y OQ7 entraban en tensión): si la lista de descuentos vive en el `Producto` pero el descuento por efectivo varía en cada compra, ¿qué se hace con ese caso en este change?**
✅ **RESUELTA — decidida por el usuario (Decisión 14):**
- la lista de descuentos del `Producto` queda **reservada a descuentos estables** (acuerdo permanente con el proveedor, volumen pactado, pronto pago fijo);
- el descuento por efectivo **se sigue ajustando a mano en el `costoUnitarioPactado` de la línea del pedido**, mecanismo que **ya existe** desde `herramientas-pedidos-proveedores` y que **no requiere ningún desarrollo nuevo** en este change;
- **los descuentos a nivel de `Pedido` quedan EXPLÍCITAMENTE FUERA DE ALCANCE.** Se le presentaron como la alternativa que resolvería el caso de raíz y **no la eligió**. No es un pendiente ni una tarea diferida de este change: está descartada. Puede anotarse como candidato a change propio en el Backlog del roadmap, nunca como extensión implícita de éste.
