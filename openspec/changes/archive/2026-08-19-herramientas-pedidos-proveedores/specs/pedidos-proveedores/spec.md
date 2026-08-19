## ADDED Requirements

### Requirement: Creación de pedidos a proveedores
El sistema SHALL permitir registrar un pedido de reposición dirigido a **un solo proveedor**, compuesto por uno o más ítems. Cada ítem SHALL indicar un producto, una cantidad pedida mayor a cero y el costo unitario pactado con el proveedor. El pedido SHALL quedar en estado `PENDIENTE` al crearse y SHALL registrar la fecha de creación, la unidad de negocio activa y el usuario que lo creó. La creación de un pedido SHALL NOT modificar el stock de ningún producto.

#### Scenario: Alta de un pedido con varios ítems
- **WHEN** un usuario con permiso de escritura de pedidos crea un pedido para un proveedor con tres ítems, cada uno con su cantidad y su costo unitario
- **THEN** el sistema persiste el pedido en estado `PENDIENTE` con sus tres ítems, y registra la fecha de creación, la unidad de negocio activa y el usuario autor

#### Scenario: El alta no mueve stock
- **WHEN** se crea un pedido de 10 unidades de un producto cuyo stock actual es 4
- **THEN** el stock del producto sigue siendo 4 y no se genera ningún movimiento de stock

#### Scenario: Pedido sin ítems
- **WHEN** un usuario intenta crear un pedido sin ningún ítem
- **THEN** el sistema rechaza la operación y no persiste ningún pedido

#### Scenario: Ítem con cantidad no positiva
- **WHEN** un usuario intenta crear un pedido con un ítem cuya cantidad pedida es cero o negativa
- **THEN** el sistema rechaza la operación completa y no persiste ningún pedido ni ningún ítem

#### Scenario: Pedido sin proveedor
- **WHEN** un usuario intenta crear un pedido sin indicar proveedor, o indicando un proveedor inexistente o de otra unidad de negocio
- **THEN** el sistema rechaza la operación y no persiste ningún pedido

### Requirement: Alta de producto nuevo durante el armado del pedido
El sistema SHALL permitir dar de alta un producto que todavía no existe en el catálogo sin abandonar el armado del pedido, y usarlo inmediatamente como ítem de ese pedido. El producto creado de esta forma SHALL quedar asociado a la unidad de negocio activa y SHALL nacer con stock cero, porque la mercadería todavía no llegó.

#### Scenario: Producto nuevo desde el pedido
- **WHEN** el usuario está armando un ítem, el producto no existe en el catálogo y elige crearlo indicando nombre y datos básicos
- **THEN** el sistema da de alta el producto en la unidad de negocio activa con stock cero, y el ítem del pedido queda referenciando ese producto recién creado

#### Scenario: El producto nuevo no aporta stock por sí solo
- **WHEN** se crea un producto nuevo desde el armado de un ítem de 10 unidades y el pedido queda en `PENDIENTE`
- **THEN** el stock del producto nuevo es cero, y sólo pasará a 10 cuando se confirme la recepción de esas 10 unidades

### Requirement: Estados del pedido y transiciones permitidas
El sistema SHALL manejar exactamente cuatro estados de pedido: `PENDIENTE`, `COMPLETO`, `PARCIAL` y `CANCELADO`. Las únicas transiciones permitidas SHALL ser `PENDIENTE → COMPLETO`, `PENDIENTE → PARCIAL` y `PENDIENTE → CANCELADO`. Un pedido en `COMPLETO`, `PARCIAL` o `CANCELADO` SHALL ser terminal: no SHALL admitir ninguna transición posterior, ni edición de sus ítems, ni una nueva confirmación de recepción. Los estados `COMPLETO` y `PARCIAL` SHALL ser determinados por el sistema a partir de las cantidades recibidas, y SHALL NOT ser elegibles por el usuario.

#### Scenario: Edición sólo mientras está pendiente
- **WHEN** un usuario intenta modificar los ítems de un pedido en estado `PENDIENTE`
- **THEN** el sistema acepta la modificación

#### Scenario: Edición de un pedido ya confirmado
- **WHEN** un usuario intenta modificar los ítems de un pedido en estado `COMPLETO` o `PARCIAL`
- **THEN** el sistema rechaza la operación y el pedido queda intacto

#### Scenario: Segunda confirmación rechazada
- **WHEN** un usuario intenta confirmar la recepción de un pedido que ya está en `COMPLETO` o `PARCIAL`
- **THEN** el sistema rechaza la operación, no genera ningún movimiento de stock y no modifica ningún producto

#### Scenario: Cancelación de un pedido pendiente
- **WHEN** un usuario con permiso de escritura de pedidos cancela un pedido en estado `PENDIENTE`
- **THEN** el pedido pasa a `CANCELADO`, no se genera ningún movimiento de stock y ningún producto cambia de stock

#### Scenario: Cancelación de un pedido ya confirmado
- **WHEN** un usuario intenta cancelar un pedido en estado `COMPLETO` o `PARCIAL`
- **THEN** el sistema rechaza la operación y el pedido conserva su estado

### Requirement: Confirmación de recepción e ingreso de stock
El sistema SHALL ofrecer una operación de confirmación de recepción que reciba, para **cada uno** de los ítems del pedido, la cantidad realmente recibida. Esa operación SHALL ser la única vía por la cual el stock aumenta como consecuencia de un pedido, y SHALL ejecutarse de forma atómica: si falla cualquier parte, ningún producto SHALL quedar modificado y ningún movimiento de stock SHALL quedar registrado.

Por cada ítem con cantidad recibida mayor a cero, el sistema SHALL incrementar el stock del producto en esa cantidad y SHALL registrar un movimiento de stock de tipo `INGRESO` por esa misma cantidad. Los ítems con cantidad recibida igual a cero SHALL NOT generar movimiento de stock. La confirmación SHALL registrar además la fecha de recepción del pedido.

#### Scenario: Recepción completa
- **WHEN** se confirma la recepción de un pedido de 10 unidades de un producto con stock 4, indicando 10 recibidas
- **THEN** el stock del producto pasa a 14, se registra un movimiento de tipo `INGRESO` por 10 unidades, y el pedido queda en estado `COMPLETO`

#### Scenario: Recepción parcial
- **WHEN** se confirma la recepción de un pedido de 10 unidades de un producto con stock 4, indicando 7 recibidas
- **THEN** el stock del producto pasa a 11, se registra un movimiento de tipo `INGRESO` por 7 unidades, y el pedido queda en estado `PARCIAL` con 3 unidades pendientes en ese ítem

#### Scenario: Ítem que no llegó
- **WHEN** se confirma la recepción de un pedido de dos ítems indicando 5 recibidas para el primero y 0 para el segundo
- **THEN** el stock del primer producto aumenta en 5 con su movimiento `INGRESO`, el segundo producto no cambia de stock y no genera ningún movimiento, y el pedido queda en estado `PARCIAL`

#### Scenario: Un solo movimiento por ítem recibido
- **WHEN** se confirma la recepción de un pedido con tres ítems, todos con cantidad recibida mayor a cero
- **THEN** el sistema genera exactamente tres movimientos de stock de tipo `INGRESO`, uno por ítem, y ninguno adicional

#### Scenario: Atomicidad ante un fallo
- **WHEN** durante la confirmación de un pedido de varios ítems falla el procesamiento de uno de ellos
- **THEN** ningún producto del pedido queda con el stock modificado, no queda ningún movimiento de stock registrado y el pedido conserva el estado `PENDIENTE`

#### Scenario: Payload incompleto
- **WHEN** se confirma la recepción enviando cantidades para sólo algunos de los ítems del pedido
- **THEN** el sistema rechaza la operación completa, sin modificar stock ni el estado del pedido

#### Scenario: Ítem ajeno al pedido
- **WHEN** el payload de confirmación incluye el identificador de un ítem que no pertenece a ese pedido
- **THEN** el sistema rechaza la operación completa, sin modificar stock ni el estado del pedido

#### Scenario: Cantidad recibida negativa
- **WHEN** el payload de confirmación incluye una cantidad recibida negativa para algún ítem
- **THEN** el sistema rechaza la operación completa, sin modificar stock ni el estado del pedido

#### Scenario: Cantidad recibida mayor a la pedida
- **WHEN** se confirma la recepción de un ítem de 10 unidades indicando 12 recibidas
- **THEN** el sistema acepta la operación, el stock del producto aumenta en 12, el movimiento de `INGRESO` se registra por 12, el pedido queda en estado `COMPLETO` y la cantidad pendiente de ese ítem se informa como cero, nunca negativa

### Requirement: La confirmación no altera la configuración de precio del producto
El sistema SHALL NOT modificar el costo configurado del producto (`costoProducto`) ni su precio de venta como consecuencia de confirmar la recepción de un pedido. El costo pagado en esa compra SHALL quedar registrado exclusivamente en el movimiento de stock generado.

#### Scenario: El precio de venta no cambia al recibir mercadería
- **WHEN** se confirma la recepción de un producto cuyo costo pactado en el pedido difiere del costo configurado del producto, y el producto tiene porcentaje de ganancia configurado
- **THEN** el precio de venta del producto y su costo configurado quedan exactamente como estaban antes de la confirmación, y sólo cambian su stock y el costo histórico derivado del último ingreso

### Requirement: Remanente pendiente visible por ítem
El sistema SHALL exponer, para cada ítem de un pedido confirmado, la cantidad pedida, la cantidad recibida y la cantidad pendiente resultante, entendida como la cantidad pedida menos la recibida y nunca menor a cero. El sistema SHALL permitir identificar en el listado los pedidos que quedaron con faltantes, para poder reclamarlos o reponerlos en un pedido posterior.

#### Scenario: Consulta del detalle con faltantes
- **WHEN** un usuario consulta un pedido en estado `PARCIAL` donde se pidieron 10 unidades de un ítem y se recibieron 7
- **THEN** el sistema informa para ese ítem cantidad pedida 10, cantidad recibida 7 y cantidad pendiente 3

#### Scenario: Detalle de un pedido sin faltantes
- **WHEN** un usuario consulta un pedido en estado `COMPLETO`
- **THEN** todos sus ítems informan cantidad pendiente cero

#### Scenario: Ítems no confirmados
- **WHEN** un usuario consulta un pedido en estado `PENDIENTE`
- **THEN** sus ítems informan la cantidad pedida y ninguna cantidad recibida, distinguiéndose de un ítem confirmado con cero recibidas

#### Scenario: Filtrado de pedidos con faltantes
- **WHEN** un usuario solicita el listado de pedidos filtrando por estado `PARCIAL`
- **THEN** el sistema devuelve únicamente los pedidos que quedaron con al menos un ítem faltante

### Requirement: Listado paginado de pedidos
El sistema SHALL exponer el listado de pedidos de forma paginada, ordenado por fecha de creación descendente, y SHALL admitir filtrar opcionalmente por estado y por proveedor. El listado SHALL NOT devolver la totalidad de los pedidos sin límite.

#### Scenario: Listado paginado por defecto
- **WHEN** un usuario solicita el listado de pedidos sin parámetros
- **THEN** el sistema devuelve una página acotada de pedidos, ordenados del más reciente al más antiguo, junto con la información de paginación

#### Scenario: Filtro por proveedor
- **WHEN** un usuario solicita el listado de pedidos filtrando por un proveedor
- **THEN** el sistema devuelve únicamente los pedidos dirigidos a ese proveedor

### Requirement: Aislamiento de pedidos por unidad de negocio
El sistema SHALL asociar cada pedido a la unidad de negocio activa en el momento de su creación, y SHALL devolver en los listados únicamente los pedidos de la unidad de negocio activa de la petición. Consultar, editar, cancelar o confirmar un pedido que pertenece a otra unidad de negocio SHALL ser rechazado.

#### Scenario: Listado acotado a la unidad activa
- **WHEN** un usuario solicita el listado de pedidos con una unidad de negocio activa
- **THEN** el sistema devuelve únicamente los pedidos de esa unidad de negocio

#### Scenario: Confirmación de un pedido de otra unidad
- **WHEN** un usuario intenta confirmar la recepción de un pedido perteneciente a una unidad de negocio distinta de la activa
- **THEN** el sistema rechaza la operación, sin modificar stock ni el estado del pedido

#### Scenario: El negocio Vivero no tiene pedidos
- **WHEN** un usuario opera con la unidad de negocio Vivero activa y solicita el listado de pedidos
- **THEN** el sistema devuelve un listado vacío, porque ningún pedido se crea bajo esa unidad de negocio

### Requirement: Permisos propios del circuito de pedidos
El sistema SHALL exponer dos permisos independientes, `LEER_PEDIDOS` y `ESCRIBIR_PEDIDOS`, que habilitan exclusivamente el circuito de pedidos a proveedores. Ambos SHALL darse de alta en la inicialización del sistema y SHALL quedar incluidos en el conjunto de permisos del rol `JEFE`. Ningún otro rol semilla SHALL recibirlos por defecto. Los permisos de stock SHALL NOT habilitar por sí solos ninguna operación del circuito de pedidos.

#### Scenario: Alta de los permisos en la inicialización
- **WHEN** el backend arranca y ejecuta la inicialización de datos
- **THEN** existen en la base los permisos `LEER_PEDIDOS` y `ESCRIBIR_PEDIDOS`, y ambos figuran entre los permisos asignados al rol `JEFE`

#### Scenario: El rol de empleado no recibe los permisos por defecto
- **WHEN** el backend arranca y ejecuta la inicialización de datos
- **THEN** el rol `EMPLEADO_VIVERO` conserva únicamente `LEER_STOCK`, `ESCRIBIR_STOCK` y `ESCRIBIR_VENTAS`, sin ningún permiso de pedidos

#### Scenario: Confirmación de recepción sin permiso de escritura
- **WHEN** un usuario con `LEER_PEDIDOS` pero sin `ESCRIBIR_PEDIDOS` intenta confirmar la recepción de un pedido
- **THEN** el sistema responde 403 Forbidden, sin modificar stock ni el estado del pedido

### Requirement: Sección Pedidos exclusiva del negocio Herramientas
El sistema SHALL mostrar la sección de Pedidos en la navegación únicamente cuando la unidad de negocio activa es Herramientas. Cuando la unidad de negocio activa es Vivero, la sección SHALL NOT aparecer en el menú. Las rutas de la sección SHALL estar protegidas por los permisos del circuito de pedidos.

#### Scenario: Navegación en Herramientas
- **WHEN** un usuario con `LEER_PEDIDOS` opera con la unidad de negocio Herramientas activa
- **THEN** el menú principal muestra la sección de Pedidos

#### Scenario: Navegación en Vivero
- **WHEN** un usuario con `LEER_PEDIDOS` cambia la unidad de negocio activa a Vivero
- **THEN** el menú principal deja de mostrar la sección de Pedidos, y el resto de las secciones del Vivero se comportan como antes de este cambio

#### Scenario: Acceso por URL sin permisos
- **WHEN** un usuario autenticado sin `LEER_PEDIDOS` navega directamente por URL a una ruta de la sección de Pedidos
- **THEN** el sistema lo redirige al dashboard

### Requirement: Pantallas del circuito de pedidos
El sistema SHALL ofrecer una pantalla de listado de pedidos, un flujo de creación que permita elegir proveedor y agregar ítems —eligiendo un producto existente o creando uno nuevo en el momento— con su cantidad y su costo unitario, y una pantalla o diálogo de confirmación de recepción donde se cargue por ítem la cantidad realmente recibida. En la confirmación, la cantidad recibida SHALL venir precargada con la cantidad pedida y SHALL ser editable, y el usuario SHALL poder ver el remanente resultante antes de confirmar. Los listados SHALL presentarse como tabla en anchos `md` o mayores y como tarjetas apiladas en anchos menores. El feedback y las confirmaciones SHALL usar el mecanismo de diálogos y avisos de la aplicación, y SHALL NOT usar diálogos nativos del navegador.

#### Scenario: Precarga de cantidades en la confirmación
- **WHEN** el usuario abre la confirmación de recepción de un pedido
- **THEN** cada ítem muestra su cantidad recibida precargada con la cantidad pedida, editable, y el remanente que resultaría de confirmar con los valores actuales

#### Scenario: Vista previa del faltante
- **WHEN** el usuario baja la cantidad recibida de un ítem de 10 a 7 en el formulario de confirmación
- **THEN** la pantalla muestra que quedarían 3 unidades pendientes para ese ítem, antes de confirmar

#### Scenario: Confirmación explícita de un sobrante
- **WHEN** el usuario carga una cantidad recibida mayor a la pedida para algún ítem y pide confirmar
- **THEN** el sistema le presenta una confirmación explícita que nombra la diferencia antes de ejecutar la operación

#### Scenario: Listado de pedidos en mobile
- **WHEN** un usuario abre el listado de pedidos en una pantalla de ancho menor a `md`
- **THEN** los pedidos se muestran como tarjetas apiladas de ancho completo, con proveedor, fecha y estado, sin desbordar horizontalmente
