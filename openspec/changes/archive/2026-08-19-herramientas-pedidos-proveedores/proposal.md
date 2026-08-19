## Why

En el negocio **Herramientas** el jefe le compra mercadería a proveedores para reponer stock. Hoy ese circuito no existe en el sistema: el pedido se arma por WhatsApp o teléfono, se anota en un papel, y cuando llega el camión el jefe entra a `Productos`, busca uno por uno los productos y les edita el campo `stock` a mano.

Eso rompe en dos lugares concretos:

1. **Lo que se pidió no siempre es lo que llega.** El proveedor manda 7 de las 10 unidades pedidas, o directamente no manda un ítem. Como el pedido nunca se registró, no queda rastro de qué faltó: no hay contra qué reclamar ni qué reponer en el pedido siguiente. El faltante se pierde en la memoria del jefe.
2. **El costo real de compra se pierde.** El único lugar donde hoy se puede cargar el costo pagado es `Producto.costoProducto`, que es un campo único y pisable: la compra de hoy borra el costo de la compra anterior. El próximo change del roadmap (`us-017-finanzas-ui`, dashboard de rentabilidad) necesita costos de adquisición confiables, y `MovimientoStock.costoUnitario` — que sí es histórico e inmutable — hoy sólo se llena derivándolo de ese mismo campo pisable, no del precio que el proveedor efectivamente cobró en esa compra.

Este change registra el pedido antes de que llegue, permite confirmar qué llegó realmente, y hace que esa confirmación sea el único camino por el cual el stock de Herramientas sube por compra — dejando el costo real asentado en el movimiento.

## What Changes

- **Se introduce la entidad `Proveedor`** con un ABM propio y simple (nombre, contacto/teléfono opcional), scoped por unidad de negocio igual que `Cliente`. No es un campo de texto libre: es una entidad real, para poder listar y filtrar pedidos por proveedor.
- **Se introduce el circuito de pedidos**: cabecera `Pedido` (proveedor, fecha, estado, usuario que lo creó, unidad de negocio) más ítems `PedidoDetalle` (producto, cantidad pedida, costo unitario pactado, cantidad recibida). Un pedido es siempre de **un solo proveedor**.
- **Estados del pedido**: `PENDIENTE` al crearse; tras confirmar la llegada pasa a `COMPLETO` (llegó todo lo pedido) o `PARCIAL` (faltó algo). Un pedido `PARCIAL` **conserva el remanente por ítem** (`cantidadPedida − cantidadRecibida`) visible para reclamo o reposición futura; no se cierra como si no hubiera faltado nada. También existe `CANCELADO` para un pedido que nunca va a llegar.
- **Al confirmar la llegada, el stock sube de forma auditada**: por cada ítem con cantidad recibida > 0 se crea un `MovimientoStock` de tipo `INGRESO` y se incrementa `Producto.stock`, todo en una sola transacción. El `costoUnitario` de ese movimiento sale del **costo cargado en el ítem del pedido**, no del `costoProducto` actual del producto.
- **`MovimientoStockService` gana una variante que acepta el costo explícito.** La firma actual `registrarMovimiento(producto, cantidad, tipo, usuario)` deriva el costo internamente de `producto.getCostoProducto()`; con eso el costo del pedido nunca llegaría al movimiento. Se agrega una sobrecarga que recibe el costo base del ítem. La firma existente y todos sus llamadores actuales quedan sin cambios.
- **Se puede crear un producto nuevo desde el armado del pedido**, sin salir de la pantalla, para el caso —habitual— de que el proveedor traiga un artículo que todavía no está en el catálogo de Herramientas.
- **Sección nueva "Pedidos" en el menú, visible únicamente cuando la unidad de negocio activa es Herramientas** (`id = 2`), siguiendo el mismo patrón de `isHerramientas` que hoy oculta Siembras / Insumos / Devolución de Bandejas. El negocio Vivero no ve la sección ni se ve afectado en nada.
- **Permisos nuevos `LEER_PEDIDOS` y `ESCRIBIR_PEDIDOS`**, dados de alta en la inicialización y asignados sólo al rol `JEFE`. Ningún otro rol semilla los recibe.
- **Fuera de alcance, explícito:** no se importan catálogos de proveedores desde Excel ni de ninguna otra fuente. Todo el costo se carga a mano. Ese enfoque fue evaluado y descartado (ver `openspec/roadmap.md`, sección Backlog) y no se reabre acá. Tampoco se toca el circuito de ventas, ni las cuentas corrientes de dinero, ni se registra la deuda con el proveedor: el pedido mueve **stock**, no plata.

## Capabilities

### New Capabilities

- `gestion-proveedores`: alta, consulta, edición y baja lógica de proveedores, acotados a la unidad de negocio activa.
- `pedidos-proveedores`: creación de pedidos de reposición con sus ítems, confirmación de llegada total o parcial, remanente pendiente por ítem, y el ingreso de stock derivado de esa confirmación. Incluye la visibilidad exclusiva de la sección en el negocio Herramientas y los permisos que la habilitan.

### Modified Capabilities

- `movimientos-stock`: hoy el requisito dice que el costo unitario de un `INGRESO` se congela calculándolo desde la configuración vigente del producto (`costoProducto` + envío − descuento). Cambia a: cuando el ingreso proviene de la confirmación de un pedido a proveedor, el costo unitario se congela a partir del **costo pactado en el ítem del pedido**, que es el precio que el proveedor efectivamente cobró en esa compra. El caso genérico (ingreso sin pedido asociado) mantiene el comportamiento actual sin cambios.

## Impact

**Nivel de gobernanza: MEDIA-ALTA.** Este change mueve stock real y escribe los datos de costo que va a leer el dashboard de rentabilidad (`us-017-finanzas-ui`). No toca autenticación, cuentas corrientes de dinero ni cheques, así que no es CRÍTICO como `cheques-rebote-endosado`, pero tampoco corresponde autonomía plena: **el grupo de tareas que implementa la confirmación de llegada y el alta del `MovimientoStock` requiere checkpoint explícito del usuario antes de cerrarse**. Un error ahí infla o desinfla el inventario y falsea el costo histórico de forma silenciosa —`Producto.costoUnitarioHistorico` es una `@Formula` que lee el último `INGRESO`, así que un costo mal escrito se propaga solo a toda la valuación.

**Backend — código nuevo**

- `models/Proveedor.java`, `models/Pedido.java`, `models/PedidoDetalle.java`, `models/EstadoPedido.java` (enum).
- `repositories/`, `services/`, `services/impl/`, `dto/` y `controllers/` correspondientes a las dos entidades, siguiendo `Cliente*` como molde de ABM simple.

**Backend — código existente que se toca**

- `services/MovimientoStockService.java` y `services/impl/MovimientoStockServiceImpl.java`: sobrecarga nueva que acepta el costo base explícito. La firma vigente no cambia de comportamiento.
- `config/DataInitializer.java`: alta de `LEER_PEDIDOS` y `ESCRIBIR_PEDIDOS`, agregados al set de `JEFE`. `permisosEmpleado` queda intacto.

**Backend — código existente que NO se toca (y por qué importa)**

- `services/impl/ProductoServiceImpl.actualizarProducto()` **ya genera un `MovimientoStock` de tipo `INGRESO` cuando cambia el stock**. La confirmación de llegada **no** debe pasar por ese método: haría doble movimiento y con el costo derivado del producto en vez del costo del pedido. El ingreso se resuelve en el servicio de pedidos. Ver `design.md`.
- `ProductoServiceImpl.crearProducto()` **sí** se reutiliza tal cual para el alta inline de un producto nuevo desde el pedido: ya asigna la unidad de negocio desde el contexto y ya registra su `AJUSTE_INICIAL`.

**Base de datos**

- Tablas nuevas `proveedores`, `pedidos`, `pedido_detalles`. El proyecto corre con `ddl-auto=update`, así que Hibernate las crea al arrancar; sin migración manual. Ninguna tabla existente cambia de esquema.

**Frontend**

- Páginas nuevas de listado/creación de pedidos, confirmación de llegada y ABM de proveedores, más su entrada de navegación y sus rutas protegidas en `App.jsx` / `DashboardLayout.jsx`.
- Toda tabla nueva nace ya con el patrón tabla-desktop / tarjetas-mobile en `md`, que es el estándar consolidado del repo tras `ui-responsive-clientes`, `ui-responsive-finanzas` y `ui-responsive-historial-bandejas`. No se difiere a un change responsive posterior.

**Sin impacto**

- El negocio **Vivero** (`unidad_negocio.id = 1`) no ve la sección, no gana entidades visibles y no cambia ningún comportamiento existente.
- Ventas, cheques, cuentas corrientes, bandejas y siembras quedan intactos.
