> ### ⚠️ Gobernanza: **MEDIA-ALTA** — Stock e insumo de costos para rentabilidad
>
> Este change escribe stock real (`Producto.stock`) y el costo histórico congelado (`MovimientoStock.costoUnitario`) que va a consumir el dashboard de rentabilidad del próximo change del roadmap (`us-017-finanzas-ui`). No toca autenticación, cuentas corrientes de dinero ni cheques, así que **no** es CRÍTICO como `cheques-rebote-endosado`.
>
> **El análisis y el diseño avanzan sin bloqueo.** Durante `/opsx:apply`, el grupo que implementa la confirmación de llegada y el alta del `MovimientoStock` requiere **checkpoint explícito del usuario antes de darse por cerrado**: se revisa con él la cantidad exacta que se suma, el costo exacto que se congela y la condición de estado resultante, no se aprueba al pasar.
>
> El motivo es concreto: `Producto.costoUnitarioHistorico` es una `@Formula` que lee el `costo_unitario` del **último** movimiento `INGRESO`/`AJUSTE_INICIAL` del producto. Un costo mal escrito en un ingreso no rompe ninguna pantalla ni tira excepción: se convierte en el costo de referencia del producto y falsea toda la valuación de inventario y el margen que se calcule sobre él, sin dejar señal.

## Context

### El caso de negocio, en palabras del usuario

> "Crear la sección pedidos donde el jefe pueda crear el pedido a sus proveedores y después confirmar que llegue porque a veces no llegan los productos que se piden o la cantidad deseada. Una vez confirma que los productos del pedido llegaron entonces esos productos que se pasen a stock automáticamente. ESTO SOLO EN EL NEGOCIO HERRAMIENTAS, no tiene nada que ver con el Vivero"

Dos momentos separados en el tiempo: se **pide** (compromiso, sin efecto sobre el stock) y después se **recibe** (efecto real sobre el stock, por la cantidad que efectivamente llegó, que puede ser menor a la pedida).

### Decisiones ya cerradas con el usuario antes de este diseño

No se reabren; el diseño parte de ellas:

1. Desde el armado del pedido se puede **crear un producto nuevo** que todavía no está en el catálogo de Herramientas.
2. `Proveedor` es una **entidad con ABM propio** (nombre, contacto/teléfono opcional), no texto libre.
3. El jefe **carga a mano** el costo pagado por ítem, y ese costo debe alimentar el `costoUnitario` del movimiento de stock.
4. Si se pidieron 10 y llegaron 7, quedan **3 pendientes visibles**; el pedido no se cierra como si no hubiera faltado nada.
5. Alcance **exclusivo a Herramientas** (`unidades_negocio.id = 2`). Vivero (`id = 1`) no se ve afectado.

También está cerrado, y fuera de alcance: nada de importación de catálogos de proveedores (Excel u otra fuente). Ver el Backlog de `openspec/roadmap.md`.

### Multi-negocio: cómo funciona hoy, verificado en código

`UnidadNegocioContextHolder` (`backend/src/main/java/com/vivero/gestion/security/UnidadNegocioContextHolder.java`) es un `ThreadLocal<Long>` que `UnidadNegocioFilter` llena por request a partir del header **`X-Unidad-Negocio`**. Los servicios leen `UnidadNegocioContextHolder.getUnidadNegocioId()` y filtran; el patrón canónico está en `ClienteServiceImpl`:

```java
Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
clientes = (unidadId != null)
    ? clienteRepository.findAllByUnidadNegocioId(unidadId)
    : clienteRepository.findAll();
```

y para el acceso por id, `findByIdAndUnidadNegocioId(id, unidadId)` con excepción si no pertenece. En la base real hay exactamente dos filas: `id=1 "Vivero"` y `id=2 "Herramientas"`, ambas `activo=true`. `UnidadNegocio` tiene además `costoEnvioPorcentaje`, que participa del cálculo de costos.

> Nota: una anotación vieja de `openspec/roadmap.md` califica a `UnidadNegocio` de "vestigial". Es incorrecta y está desactualizada — la entidad está viva y es el eje del filtrado de `Producto`, `MovimientoStock`, `Cliente` y `Cheque`.

En el frontend, `DashboardLayout.jsx` (~línea 101) hace `const isHerramientas = activeBusinessId === 2;` y con eso oculta `Siembras`, `Insumos` y `Devolución de Bandejas`, y renombra `Productos (Plantas)` a `Productos`. Ese es el mecanismo establecido para condicionar UI por negocio.

### Estado actual del stock y de los costos — verificado, no asumido

**(a) `MovimientoStockServiceImpl.registrarMovimiento()` no acepta un costo.** Su firma es `registrarMovimiento(Producto, Integer cantidad, TipoMovimientoStock, Usuario)` y **deriva el costo internamente**:

```java
if (tipo == INGRESO || tipo == AJUSTE_INICIAL) {
    costoBase      = producto.getCostoProducto();
    descuentoPerc  = producto.getDescuentoProveedor();
    costoEnvioPerc = producto.getUnidadNegocio().getCostoEnvioPorcentaje();
    // costoUnitarioFinal = (costoBase − descuento%) + envío% sobre eso
}
```

Es decir: **si la confirmación de llegada llamara a este método tal cual, el costo del pedido nunca llegaría al movimiento**; se congelaría el `costoProducto` que el producto tenga en ese momento, que puede ser de una compra de hace seis meses. Es el hallazgo que obliga a la Decisión 4.

**(b) `Producto.costoUnitarioHistorico` es una `@Formula`, no una columna.** Lee el `costo_unitario` del último movimiento `INGRESO`/`AJUSTE_INICIAL` del producto por fecha descendente. Consecuencia directa: escribir bien el `costoUnitario` del ingreso es suficiente para que el costo histórico del producto quede correcto — y escribirlo mal es suficiente para falsearlo, sin ninguna otra señal.

**(c) `ProductoServiceImpl.actualizarProducto()` ya genera un movimiento de stock.** Cuando el `stock` del DTO difiere del actual calcula `diff` y llama `registrarMovimiento(producto, Math.abs(diff), diff > 0 ? INGRESO : EGRESO, usuario)`. **Es la trampa principal de este change**: si la confirmación de llegada resolviera el ingreso llamando a `actualizarProducto()`, se generarían dos movimientos por el mismo hecho (uno de ese método, otro del servicio de pedidos), y el del método existente llevaría el costo derivado del producto en vez del costo del pedido. Ver Decisión 5.

**(d) El mismo método recalcula el precio de venta.** `calcularPrecioSiAplica()` corre en `crearProducto()` y en `actualizarProducto()`: si `porcentajeGanancia > 0`, **pisa `producto.precio`** con `(costoProducto − descuento% + envío%) × (1 + ganancia%)`. O sea que tocar `costoProducto` no es un cambio inerte: mueve el precio de venta. Ver Decisión 6.

**(e) No existe hoy ningún endpoint de "ingreso manual de stock".** `ProductoController` expone sólo `POST`, `GET`, `GET /{id}`, `PUT /{id}` y `DELETE /{id}`. El único camino a un `INGRESO` es el efecto colateral de (c).

**(f) No existe ninguna entidad `Proveedor`, `Pedido` ni `Compra`.** Es dominio 100% nuevo; no hay datos preexistentes que migrar ni compatibilidad hacia atrás que preservar.

### Molde de ABM simple ya establecido

`Cliente` + `ClienteController` + `ClienteServiceImpl` es el patrón vigente: entidad con `@SQLDelete`/`@SQLRestriction("deleted = false")` para baja lógica, `@ManyToOne` a `UnidadNegocio`, controller delgado con `@PreAuthorize` por método, servicio `@Transactional` que filtra por unidad y mapea a DTO. `Proveedor` copia esa forma, sin las cuentas corrientes.

## Goals / Non-Goals

**Goals:**

- Que quede registrado **qué se pidió** antes de que llegue, con proveedor, ítems, cantidades y costo pactado.
- Que la confirmación de llegada admita que **llegó menos de lo pedido**, y que el faltante quede visible como remanente por ítem en vez de desaparecer.
- Que el stock suba **sólo** por esa confirmación, de forma atómica y auditada por un `MovimientoStock` de tipo `INGRESO`, nunca por un `UPDATE` silencioso.
- Que el `costoUnitario` congelado en ese movimiento sea **el costo del pedido**, para que `us-017-finanzas-ui` calcule margen contra el precio realmente pagado.
- Que todo el circuito sea invisible e inocuo para el negocio Vivero.
- Que agregar un producto que no existe todavía no obligue a abandonar el armado del pedido.

**Non-Goals:**

- **No** se importa ningún catálogo de proveedor (Excel, API, scraping). Descartado y documentado en el Backlog del roadmap.
- **No** se registra deuda con el proveedor ni cuenta corriente de proveedores. El pedido mueve stock, no plata. `CuentaCorrienteDinero` es de clientes y no se toca.
- **No** se modela recepción en múltiples entregas parciales sucesivas (hoy: una confirmación por pedido). Ver Decisión 7 y Open Question 2.
- **No** se toca el circuito de ventas, cheques, bandejas ni siembras.
- **No** se cambia el comportamiento de `ProductoServiceImpl.actualizarProducto()`. El doble movimiento se evita **no pasando por ahí**, no reescribiendo un método que hoy funciona para su caso de uso.
- **No** se construye reporte ni dashboard de compras. Este change genera los datos; leerlos es de `us-017-finanzas-ui`.

## Decisions

### Decisión 1 — Modelo de datos: tres entidades, pedido de un solo proveedor

**`Proveedor`** (tabla `proveedores`) — ABM simple, molde `Cliente`:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `Long` | identity |
| `nombre` | `String(150)` | obligatorio |
| `telefono` | `String(50)` | opcional |
| `contacto` | `String(150)` | opcional — nombre de la persona de contacto |
| `unidadNegocio` | `@ManyToOne` | scoping; en la práctica siempre Herramientas |
| `deleted` | `boolean` | baja lógica vía `@SQLDelete` + `@SQLRestriction` |

**`Pedido`** (tabla `pedidos`) — cabecera:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `Long` | identity |
| `proveedor` | `@ManyToOne Proveedor` | obligatorio, **uno solo por pedido** |
| `unidadNegocio` | `@ManyToOne` | del contexto al crear |
| `usuario` | `@ManyToOne Usuario` | quién lo creó, igual que `MovimientoStock` |
| `fechaCreacion` | `LocalDateTime` | seteada por el servidor, no por el cliente |
| `fechaRecepcion` | `LocalDateTime` | `null` hasta confirmar |
| `estado` | `@Enumerated(STRING) EstadoPedido` | ver Decisión 2 |
| `observaciones` | `String(500)` | opcional |
| `detalles` | `@OneToMany(mappedBy="pedido", cascade=ALL, orphanRemoval=true)` | ítems |
| `deleted` | `boolean` | baja lógica |

**`PedidoDetalle`** (tabla `pedido_detalles`) — ítem:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `Long` | identity |
| `pedido` | `@ManyToOne Pedido` | dueño |
| `producto` | `@ManyToOne Producto` | obligatorio; puede haberse creado inline (Decisión 3) |
| `cantidadPedida` | `Integer` | > 0 |
| `costoUnitarioPactado` | `BigDecimal(12,2)` | lo que el jefe dice que va a pagar por unidad |
| `cantidadRecibida` | `Integer` | **`null` mientras el pedido está `PENDIENTE`**; entero ≥ 0 al confirmar |

El remanente **no se persiste como columna**: es derivado, `cantidadPedida − COALESCE(cantidadRecibida, 0)`, y se expone calculado en el DTO. Un dato derivado guardado es un dato que se puede desincronizar; acá no hace falta.

**Por qué un solo proveedor por pedido.** Un pedido es un acto comercial con una contraparte: se le reclama a *alguien* lo que faltó. Permitir ítems de proveedores distintos en la misma cabecera haría que "el pedido llegó parcial" no signifique nada accionable. Si el jefe le compra a dos proveedores, son dos pedidos. *Alternativa descartada:* proveedor a nivel de ítem — más flexible en el papel, pero rompe la unidad de reclamo, complica el listado ("¿de quién es este pedido?") y no responde a ninguna necesidad expresada.

**Por qué `cantidadRecibida` es nullable y no arranca en 0.** `null` significa "todavía no se confirmó"; `0` significa "se confirmó y este ítem no llegó". Son dos hechos distintos y arrancar en `0` los volvería indistinguibles.

### Decisión 2 — Estados: cuatro, con `PARCIAL` y `COMPLETO` derivados de los datos, no elegidos por el usuario

```java
public enum EstadoPedido { PENDIENTE, COMPLETO, PARCIAL, CANCELADO }
```

| Estado | Significado |
|---|---|
| `PENDIENTE` | Creado. Sin efecto sobre el stock. Editable y cancelable. |
| `COMPLETO` | Confirmado, y **todos** los ítems recibieron exactamente lo pedido. Sin remanente. |
| `PARCIAL` | Confirmado, y **al menos un ítem** recibió menos de lo pedido. Hay remanente pendiente. |
| `CANCELADO` | El pedido no va a llegar. Sin efecto sobre el stock, ni al entrar ni al salir. |

Matriz de transiciones — todo lo que no está marcado se rechaza con excepción:

| Desde \ Hacia | PENDIENTE | COMPLETO | PARCIAL | CANCELADO |
|---|---|---|---|---|
| **PENDIENTE** | — | ✅ confirmar (sin faltantes) | ✅ confirmar (con faltantes) | ✅ cancelar |
| **COMPLETO** | ❌ | ❌ | ❌ | ❌ |
| **PARCIAL** | ❌ | ❌ | ❌ | ❌ |
| **CANCELADO** | ❌ | ❌ | ❌ | ❌ |

**`COMPLETO` y `PARCIAL` no los elige el usuario: los calcula el servidor** a partir de las cantidades recibidas. El usuario carga números; el estado es una consecuencia. Un estado elegido a dedo podría contradecir los datos ("COMPLETO" con un ítem faltante) y ese es exactamente el caso que el usuario quiere evitar.

**Un pedido confirmado es terminal.** Igual que un `MovimientoStock`, la confirmación ya movió inventario: dejar reabrirla obligaría a diseñar la reversa del stock, que nadie pidió. Si el remanente llega después, se arma un pedido nuevo — que además es lo que corresponde comercialmente, porque es otra entrega. *Alternativa descartada:* un estado `RECIBIDO_PARCIAL` reabrible con confirmaciones sucesivas — ver Decisión 7 y Open Question 2.

**Inspiración y diferencia respecto de `Cheque`.** `ChequeServiceImpl` usa un guard de estados de origen bloqueados, y `cheques-rebote-endosado` mostró el costo de ese enfoque: para abrir *una* transición hubo que relajar un guard escrito en negativo. Acá se escribe desde el principio como **matriz de transiciones permitidas** (whitelist), no como lista de estados bloqueados. Mismo rigor, forma mejor.

### Decisión 3 — Producto nuevo inline: se reutiliza `ProductoService.crearProducto()`, sin endpoint nuevo

El armado del pedido necesita poder dar de alta un producto que no está en el catálogo. **No se crea un endpoint nuevo para eso.** El frontend, cuando el usuario elige "crear producto nuevo" dentro del armado del ítem, llama al `POST /api/productos` **que ya existe**, con el header `X-Unidad-Negocio: 2` que ya manda en toda petición, y usa el `id` devuelto para el ítem del pedido.

Por qué alcanza, verificado en `ProductoServiceImpl.crearProducto()`:
- ya asigna `unidadNegocio` desde `UnidadNegocioContextHolder`, así que el producto nace en Herramientas sin nada extra;
- ya registra su `MovimientoStock` de `AJUSTE_INICIAL`;
- ya está detrás de `@PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")`.

El producto se crea con **`stock = 0`**. El stock lo va a poner la confirmación de llegada, que es el único camino de ingreso por compra que define este change. Crear el producto ya con la cantidad pedida sumaría inventario que todavía no llegó — exactamente el error que el change viene a corregir.

*Alternativa descartada:* un DTO anidado que permita mandar un producto nuevo embebido dentro del ítem del pedido y crearlo dentro de la transacción del pedido. Acopla dos dominios, duplica la validación de producto y no gana nada: el alta inline es un acto del usuario en la pantalla, no una operación atómica con el pedido.

### Decisión 4 — Sobrecarga de `registrarMovimiento` que acepta el costo del pedido

Como estableció el Context (a), la firma actual deriva el costo de `producto.getCostoProducto()` y no hay forma de inyectarle el costo del pedido. Se agrega **una sobrecarga**, sin tocar la existente:

```java
// Firma vigente — se conserva intacta, con todos sus llamadores
MovimientoStock registrarMovimiento(Producto p, Integer cant, TipoMovimientoStock tipo, Usuario u);

// Nueva — costo base explícito; null se comporta exactamente como la firma vigente
MovimientoStock registrarMovimiento(Producto p, Integer cant, TipoMovimientoStock tipo, Usuario u,
                                    BigDecimal costoBaseExplicito);
```

En la implementación, la rama `INGRESO`/`AJUSTE_INICIAL` toma `costoBase = costoBaseExplicito != null ? costoBaseExplicito : producto.getCostoProducto()`. **El resto de la fórmula no cambia**: se le sigue aplicando el `descuentoProveedor` del producto y el `costoEnvioPorcentaje` de la unidad de negocio, y se siguen persistiendo `costoBase`, `descuentoPorcentaje` y `envioPorcentaje` junto al `costoUnitario` final. La rama de egresos queda sin tocar.

La firma vigente pasa a delegar en la nueva con `null`, para que exista una sola implementación de la fórmula y no haya dos caminos que puedan divergir.

**Qué es exactamente `costoBaseExplicito` en el flujo de pedidos:** el `costoUnitarioPactado` del `PedidoDetalle`, o sea el precio de lista por unidad que el jefe cargó. Se le aplica descuento y envío porque son las mismas condiciones comerciales que el sistema ya modela; lo que cambia es de dónde sale el número base.

*Alternativa descartada:* que el servicio de pedidos construya y guarde el `MovimientoStock` por su cuenta, salteando `MovimientoStockService`. Duplicaría la fórmula de costo en dos lugares — la garantía de que un `INGRESO` de pedido y uno manual se valúan igual desaparecería en el primer cambio de fórmula.

### Decisión 5 — La confirmación no pasa por `ProductoService.actualizarProducto()`

Es la decisión más importante del change y sale directo del Context (c). `actualizarProducto()` **ya crea un `MovimientoStock` cuando cambia el stock**. Si la confirmación lo usara, cada ítem recibido produciría **dos** movimientos: el suyo, con el costo del pedido, y el de ese método, con el costo derivado del producto. El inventario quedaría inflado al doble y el último movimiento por fecha —el que lee la `@Formula` de `costoUnitarioHistorico`— sería el equivocado.

`PedidoServiceImpl.confirmarRecepcion()` resuelve el ingreso por sí mismo, dentro de un único `@Transactional`, y por cada ítem con `cantidadRecibida > 0`:

1. `producto.setStock(stockActual + cantidadRecibida)` sobre la entidad ya administrada por el `EntityManager`;
2. `movimientoStockService.registrarMovimiento(producto, cantidadRecibida, INGRESO, usuario, detalle.getCostoUnitarioPactado())`.

Los ítems con `cantidadRecibida == 0` **no generan movimiento**: no pasó nada de stock, y un `INGRESO` de cantidad 0 ensuciaría el historial y podría convertirse en el "último ingreso" que lee la `@Formula`.

Todo el bucle, el cálculo del estado resultante y el `fechaRecepcion` van en la misma transacción: o llega todo el pedido al inventario o no llega nada. Sin `REQUIRES_NEW`, sin `flush()` intermedio, sin llamadas a servicios externos entre medio — mismo criterio de atomicidad que se aplicó en `cheques-rebote-endosado`.

*Alternativa descartada:* llamar a `actualizarProducto()` y no registrar movimiento propio. El movimiento existiría pero con el costo derivado del producto, que es justamente lo que este change viene a corregir; y arrastraría el recálculo de precio de venta de (d) como efecto colateral no pedido.

### Decisión 6 — La confirmación **no** pisa `Producto.costoProducto`

Tentador: "llegó mercadería a un costo nuevo, actualicemos el costo del producto". **No.** Por el Context (d), `costoProducto` alimenta `calcularPrecioSiAplica()`, que **pisa el precio de venta** cuando el producto tiene `porcentajeGanancia > 0`. Confirmar la llegada de un pedido cambiaría en silencio el precio de venta de todos los productos recibidos, en medio de una operación cuyo propósito declarado es "que los productos pasen a stock".

El costo real de la compra queda registrado donde corresponde y de forma inmutable: en `MovimientoStock.costoUnitario` del ingreso. Y como `Producto.costoUnitarioHistorico` es la `@Formula` que lee el último ingreso, **el costo actualizado ya queda visible en el producto sin escribir nada**. No hace falta pisar el campo.

Si el jefe además quiere que suba el precio de venta, tiene el flujo que ya existe: editar el producto desde `Productos`. Eso es una decisión comercial explícita, no un efecto colateral de recibir mercadería.

### Decisión 7 — Una confirmación por pedido; el remanente vive en el pedido cerrado

Confirmar es un acto único. Después el pedido es terminal y su remanente queda **legible** —listado con filtro "con faltantes", y cada ítem mostrando pedido / recibido / pendiente— pero no operable.

Por qué así y no confirmaciones sucesivas: el pedido con faltante ya cumple lo que el usuario pidió, que es "que quede pendiente, visible, para reclamo o reposición futura". Las entregas sucesivas contra el mismo pedido agregan un modelo de recepciones (una tabla más, `Recepcion`, con sus ítems) y la posibilidad de que un pedido quede semanas en un limbo `PENDIENTE_PARCIAL`. Es complejidad real contra un caso que todavía no se sabe si ocurre. Ver Open Question 2.

### Decisión 8 — Permisos propios `LEER_PEDIDOS` / `ESCRIBIR_PEDIDOS`, sólo para `JEFE`

Se dan de alta en `DataInitializer` junto a los demás y se agregan a `permisosJefe`. `permisosEmpleado` queda **exactamente** como está (`LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`).

Por qué no reutilizar `LEER_STOCK`/`ESCRIBIR_STOCK`: los tiene el rol de empleado, y un pedido expone los **costos de compra** — margen del negocio. Es información que el usuario quiso acotada al jefe. Es el mismo razonamiento y el mismo precedente de `bandejas-acceso-limitado`, que separó `LEER_BANDEJAS`/`ESCRIBIR_BANDEJAS` de `LEER_CLIENTES` para no arrastrar acceso a datos financieros.

**Advertencia operativa heredada de `bandejas-acceso-limitado`:** `DataInitializer` **reescribe** los permisos de `JEFE` y `EMPLEADO_VIVERO` en cada arranque (`rolJefe.setPermisos(permisosJefe); rolRepository.save(rolJefe);`). Los roles creados a mano desde `UsuariosAdmin.jsx` no se tocan. Si el usuario quiere que otro rol acceda a Pedidos, se lo asigna él desde esa pantalla; este change no crea ni modifica roles a mano.

El alta inline de producto sigue exigiendo `ESCRIBIR_STOCK`, que es del endpoint de productos y no cambia. En la práctica el `JEFE` tiene los dos.

### Decisión 9 — Scoping a Herramientas: por unidad de negocio en backend, por `isHerramientas` en frontend

**Backend:** el filtrado es por `unidadNegocio` con el patrón de `ClienteServiceImpl` — nunca por `id == 2` hardcodeado. Los listados usan `findAllByUnidadNegocioId(unidadId)` y los accesos por id `findByIdAndUnidadNegocioId(id, unidadId)`, lanzando excepción si no pertenece. El backend no necesita saber que "2 es Herramientas": si el header dice 1, no hay pedidos que devolver, porque nunca se creó ninguno con esa unidad. Esto sale gratis y evita meter una constante mágica en la capa de servicio.

**Frontend:** la sección "Pedidos" se muestra sólo cuando `isHerramientas`, con el mismo mecanismo que hoy oculta Siembras / Insumos / Devolución de Bandejas en `DashboardLayout.jsx`. Es la barrera de UX; la de datos es la del backend.

### Decisión 10 — Cantidad recibida mayor a la pedida: se acepta, con confirmación explícita en la UI

Si llegan 12 de las 10 pedidas, el backend **acepta** el número: ingresan 12 al stock, con su movimiento por 12. El estado resultante es `COMPLETO` (ningún ítem quedó corto) y el remanente del ítem se muestra como `0`, nunca negativo.

Por qué aceptar y no rechazar: el inventario tiene que reflejar lo que **físicamente** entró al depósito. Un backend que rechaza 12 obliga al jefe a mentirle al sistema (cargar 10 y "arreglar" el resto editando el producto a mano) y ahí se pierde el costo y el rastro — exactamente el problema que este change resuelve. La validación dura que sí se aplica es `cantidadRecibida >= 0`.

Del lado del frontend, cargar más de lo pedido dispara una confirmación explícita vía `useUIStore.askConfirm` que nombra la diferencia, para que el sobrante sea una decisión y no un error de tipeo.

### Decisión 11 — Paginación de los listados

Regla dura del proyecto: sin `findAll()` sin límite. `GET /api/pedidos` es un listado que crece de forma monótona con el tiempo y **nace paginado** (`Pageable`, orden por `fechaCreacion` descendente), con filtros opcionales por proveedor y por estado.

`GET /api/proveedores` **no** se pagina: es un catálogo de decenas de filas que se consume como opciones de un selector, igual que `GET /api/clientes` hoy. Paginarlo obligaría al frontend a paginar un `<select>`, que no tiene sentido.

### Decisión 12 — Responsive desde el día uno

Toda tabla nueva (listado de pedidos, listado de proveedores, ítems del pedido) nace con el patrón dual ya canonizado en el repo: `grid grid-cols-1 gap-4 md:hidden` para tarjetas mobile + `hidden md:block` para la tabla desktop. Los modales (confirmación de llegada, alta de proveedor, alta inline de producto) usan el shell fullscreen-mobile de `ProductoForm.jsx`:

```
overlay: fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm
panel:   w-full h-full sm:h-auto max-w-* rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[95vh]
header:  flex-none | body: flex-1 overflow-y-auto | footer: flex-none (botones flex-1 en mobile)
```

Todos los inputs numéricos (cantidad, costo) usan `FormattedNumberInput`, que ya existe. Feedback vía `useUIStore` (`pushToast` / `askConfirm`), nunca `alert`/`confirm` nativos. Botones con `cursor-pointer`, íconos de `lucide-react`.

Se hace acá y no en un change responsive posterior porque el repo ya pagó tres veces ese costo (`ui-responsive-clientes`, `ui-responsive-finanzas`, `ui-responsive-historial-bandejas`): retrofitear el patrón sale más caro que nacer con él.

### Decisión 13 — Contrato de endpoints

| Método | Ruta | Permiso | Qué hace |
|---|---|---|---|
| `GET` | `/api/proveedores` | `LEER_PEDIDOS` | Lista proveedores de la unidad activa |
| `POST` | `/api/proveedores` | `ESCRIBIR_PEDIDOS` | Alta |
| `PUT` | `/api/proveedores/{id}` | `ESCRIBIR_PEDIDOS` | Edición |
| `DELETE` | `/api/proveedores/{id}` | `ESCRIBIR_PEDIDOS` | Baja lógica |
| `GET` | `/api/pedidos` | `LEER_PEDIDOS` | Listado **paginado**, filtros `estado` y `proveedorId` |
| `GET` | `/api/pedidos/{id}` | `LEER_PEDIDOS` | Detalle con ítems y remanentes |
| `POST` | `/api/pedidos` | `ESCRIBIR_PEDIDOS` | Crea el pedido en `PENDIENTE`. **No toca stock.** |
| `PUT` | `/api/pedidos/{id}` | `ESCRIBIR_PEDIDOS` | Edita un pedido **sólo si está `PENDIENTE`** |
| `POST` | `/api/pedidos/{id}/recepcion` | `ESCRIBIR_PEDIDOS` | **Confirma la llegada.** Único camino de ingreso de stock por compra |
| `POST` | `/api/pedidos/{id}/cancelar` | `ESCRIBIR_PEDIDOS` | `PENDIENTE → CANCELADO`. No toca stock |
| `DELETE` | `/api/pedidos/{id}` | `ESCRIBIR_PEDIDOS` | Baja lógica, **sólo si está `PENDIENTE`** |

La confirmación es un `POST` a un sub-recurso propio y no un `PUT` del pedido: es una operación de dominio con efecto sobre el inventario, no una actualización de campos. Mismo criterio que `POST /api/clientes/{id}/saldo/ajuste`, que ya existe en el repo.

Payload de `POST /api/pedidos/{id}/recepcion`:

```json
{ "items": [ { "detalleId": 12, "cantidadRecibida": 7 }, { "detalleId": 13, "cantidadRecibida": 0 } ] }
```

Reglas de validación, todas antes de tocar nada: el pedido existe, pertenece a la unidad activa y está en `PENDIENTE`; **cada** `detalleId` del payload pertenece a ese pedido; **todos** los ítems del pedido vienen en el payload (una confirmación parcial del formulario no puede dejar ítems sin decidir); toda `cantidadRecibida` es un entero `>= 0`. Cualquier violación aborta la operación completa sin efecto sobre el stock.

Todos los DTOs son de request/response — nunca se devuelve una entidad JPA (regla dura). En particular, `PedidoDTO` expone `proveedorId`/`proveedorNombre` y no el objeto `Proveedor`, y `PedidoDetalleDTO` expone `productoId`/`productoNombre` más `cantidadPedida`, `cantidadRecibida`, `costoUnitarioPactado` y el `cantidadPendiente` calculado.

## Risks / Trade-offs

**[Doble movimiento de stock por pasar sin querer por `actualizarProducto()`]** → Es el riesgo número uno y el que justifica el checkpoint de gobernanza. Mitigación: la Decisión 5 lo prohíbe explícitamente; la tarea de verificación correspondiente exige contar los `MovimientoStock` generados por una confirmación de prueba en la base real y comprobar que son exactamente uno por ítem con cantidad recibida > 0.

**[Costo mal congelado que envenena la valuación]** → `Producto.costoUnitarioHistorico` es una `@Formula` sobre el último ingreso: un costo equivocado se vuelve el costo de referencia sin ninguna señal. Mitigación: checkpoint del usuario sobre el costo exacto antes de cerrar el grupo, más verificación en base real comparando el `costo_unitario` persistido contra el cálculo esperado a mano (`(pactado − descuento%) + envío%`).

**[La sobrecarga de `registrarMovimiento` cambia el comportamiento de los llamadores actuales]** → Hay dos llamadores hoy, ambos en `ProductoServiceImpl`. Mitigación: la firma vigente se conserva y delega con `null`, que por construcción reproduce la rama actual; la verificación incluye crear y editar un producto por el flujo de siempre y comprobar que el movimiento resultante es idéntico al de antes del change.

**[`DataInitializer` reescribe los permisos de `JEFE` en cada arranque]** → Ya observado en `bandejas-acceso-limitado`. Mitigación: se agregan los permisos a `permisosJefe` y se verifica en base real que el conteo de `JEFE` subió en 2 y que ningún rol creado a mano cambió.

**[Un producto creado inline con `stock = 0` queda huérfano si el pedido se cancela]** → El producto queda en el catálogo sin stock. Trade-off aceptado: es un producto real del proveedor que probablemente se vuelva a pedir, y borrarlo automáticamente al cancelar sería un efecto colateral sorpresivo. El jefe puede darlo de baja desde `Productos` si no lo quiere.

**[No hay reversa de una confirmación]** → Si el jefe confirma con un número equivocado, no puede deshacerlo desde Pedidos. Mitigación: la UI pide confirmación explícita mostrando el resumen de lo que va a ingresar antes de mandar; y el ajuste sigue siendo posible desde `Productos` editando el stock, que es el mecanismo que existe hoy. Diseñar la reversa del ingreso está fuera de alcance y nadie lo pidió.

**[Sin tests automatizados]** → El proyecto no tiene runner de tests de frontend ni suite de backend más allá de la carga de contexto. Toda la verificación de este change es manual sobre la base real. Si se decidiera automatizar, la regla dura del proyecto aplica: base real o Testcontainers, **nunca** mocks de base de datos.

## Migration Plan

1. Hibernate corre con `ddl-auto=update` y crea `proveedores`, `pedidos` y `pedido_detalles` al arrancar. **Sin script de migración manual.** Ninguna tabla existente cambia de esquema — el change no agrega ni modifica columnas de `productos` ni de `movimientos_stock`.
2. Los permisos nuevos los siembra `DataInitializer` en el mismo arranque.
3. **Sin datos históricos que migrar**: no hay pedidos previos en ningún lado más que en el papel del jefe. El circuito arranca vacío y los pedidos anteriores a este change simplemente no se cargan retroactivamente.
4. **Rollback**: revertir el código. Las tablas nuevas quedan en la base sin uso y sin FK entrantes desde tablas preexistentes, así que no molestan; se pueden dropear a mano si se quiere. El único efecto persistente de una ejecución previa serían los `MovimientoStock` de tipo `INGRESO` ya generados, que son movimientos legítimos y correctos por sí mismos — no hace falta deshacerlos.
5. El negocio Vivero no requiere ninguna acción: no ve la sección y no tiene filas en las tablas nuevas.

## Open Questions

Ninguna es bloqueante. Cada una tiene recomendación; si el usuario no se pronuncia, se implementa la recomendación.

**1. ¿Un pedido puede tener ítems de más de un proveedor?**
*Recomendación (ya aplicada en la Decisión 1):* **no**, un pedido es de un solo proveedor. Un pedido es la unidad de reclamo; con varios proveedores en la misma cabecera, "llegó parcial" deja de ser accionable. Si el jefe compra a dos, son dos pedidos. Sólo cambiar si el usuario dice explícitamente que arma una orden única para varios proveedores.

**2. ¿Hace falta recibir un mismo pedido en varias entregas sucesivas?**
*Recomendación (Decisión 7):* **no por ahora**, una sola confirmación y el remanente queda legible en el pedido cerrado. Si en el uso real aparece el caso "me mandaron 7 ahora y 3 la semana que viene contra el mismo pedido", se retoma con un modelo de recepciones. Es una extensión aditiva y no invalida nada de lo que se construye acá.

**3. ¿Qué pasa si llega más de lo pedido?**
*Recomendación (Decisión 10):* **se acepta** y se ingresa la cantidad real, con confirmación explícita en la UI. Rechazarlo obligaría al jefe a falsear el número y perder el rastro del costo.

**4. ¿La confirmación debería actualizar también `Producto.costoProducto`?**
*Recomendación (Decisión 6):* **no**, porque arrastra el recálculo del precio de venta vía `calcularPrecioSiAplica()`. El costo real queda en el movimiento y ya se refleja en `costoUnitarioHistorico`. Si el usuario prefiere que sí, es un cambio de una línea — pero debe entender que le mueve los precios de venta de todo lo recibido.

**5. ¿El listado de pedidos debería mostrar el total del pedido en pesos?**
*Recomendación:* sí, calculado (`Σ cantidad × costoUnitarioPactado`) y expuesto en el DTO, no persistido. Es información útil para el jefe y sale gratis. Es cosmética; si complica, se difiere.
