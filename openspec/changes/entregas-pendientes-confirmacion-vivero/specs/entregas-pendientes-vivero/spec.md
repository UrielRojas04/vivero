## ADDED Requirements

### Requirement: Registro de una entrega pendiente sin venta ni precio

El sistema SHALL permitir que un usuario con `ESCRIBIR_ENTREGAS`, operando en la unidad de negocio Vivero, registre que un cliente se llevó una o más líneas de producto (producto + cantidad), sin fijar ningún precio.

El registro SHALL exigir un `Cliente` existente de la agenda; NO SHALL aceptar un cliente casual ni ad-hoc.

El registro SHALL exigir al menos una línea, con `cantidad` mayor a 0 y stock suficiente en cada producto.

El registro NO SHALL crear ninguna `Venta`, ningún `VentaDetalle`, ningún `Pago`, ninguna `FacturaCliente` ni ningún movimiento de cuenta corriente.

La entrega SHALL quedar en estado `PENDIENTE`, con la fecha, la unidad de negocio Vivero y el usuario autenticado que la registró.

#### Scenario: Registro exitoso descuenta stock y no crea venta

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` en Vivero registra una entrega de 10 unidades de un producto con stock 40, para un cliente de la agenda
- **THEN** la entrega se persiste en estado `PENDIENTE` con su fecha, su unidad de negocio Vivero y el usuario que la registró
- **AND** el stock del producto queda en 30
- **AND** no existe ninguna `Venta` nueva asociada a ese cliente
- **AND** el total de ventas informado por Finanzas no cambia

#### Scenario: Registro rechazado por stock insuficiente

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` intenta registrar una entrega de 50 unidades de un producto con stock 40
- **THEN** la operación se rechaza con un error de negocio
- **AND** el stock del producto sigue en 40
- **AND** no se persiste ninguna entrega

#### Scenario: Registro rechazado por cantidad inválida

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` intenta registrar una entrega con una línea de cantidad 0 o negativa
- **THEN** la operación se rechaza con un error de negocio
- **AND** no se persiste ninguna entrega ni se modifica ningún stock

#### Scenario: Registro rechazado sin cliente de la agenda

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` intenta registrar una entrega sin `clienteId`
- **THEN** la operación se rechaza con un error de negocio
- **AND** no se persiste ninguna entrega ni se modifica ningún stock

### Requirement: Trazabilidad del stock descontado por una entrega pendiente

El descuento de stock de una entrega pendiente SHALL quedar registrado como un `MovimientoStock` por línea, con tipo `ENTREGA_PENDIENTE`, el producto, la cantidad, la unidad de negocio y el usuario que registró la entrega.

Cada línea de la entrega SHALL conservar la referencia al `MovimientoStock` que originó, para que el costo congelado en el momento de la salida física sea el que se use al confirmar.

Un movimiento de tipo `ENTREGA_PENDIENTE` o `REVERSA_ENTREGA_PENDIENTE` NO SHALL comportarse como un movimiento entrante: no SHALL ser tomado como referencia de costo de egresos posteriores del producto, y no SHALL crear una capa de costo.

#### Scenario: La entrega deja movimiento de stock trazable

- **WHEN** se registra una entrega pendiente de 10 unidades de un producto
- **THEN** existe un `MovimientoStock` de tipo `ENTREGA_PENDIENTE` con cantidad 10 sobre ese producto, con el usuario que registró la entrega
- **AND** la línea de la entrega referencia ese movimiento

#### Scenario: El movimiento de entrega no altera la referencia de costo del producto

- **GIVEN** un producto cuyo último movimiento entrante es un `INGRESO` con un costo unitario congelado conocido
- **WHEN** se registra una entrega pendiente de ese producto y luego se registra una venta normal del mismo producto
- **THEN** el `costoUnitarioHistorico` de la línea de esa venta sigue siendo el del `INGRESO` original
- **AND** el movimiento de tipo `ENTREGA_PENDIENTE` no creó ninguna capa de costo

### Requirement: Captura y resguardo de la firma del cliente

El registro de una entrega SHALL exigir la firma del cliente capturada en pantalla, enviada como data-URL PNG (`data:image/png;base64,...`).

El sistema SHALL rechazar una firma ausente, en blanco, con un prefijo distinto de `data:image/png;base64,` o cuyo string supere 512 KB.

La firma SHALL persistirse asociada a la entrega y SHALL poder consultarse individualmente por un usuario con `LEER_ENTREGAS`.

Ningún listado de entregas SHALL incluir la firma en su respuesta.

#### Scenario: La firma se guarda y el dueño la consulta

- **WHEN** un empleado registra una entrega adjuntando la firma del cliente
- **THEN** la entrega se persiste con esa firma
- **AND** un usuario con `LEER_ENTREGAS` que consulta la firma de esa entrega recibe exactamente el mismo data-URL PNG que se capturó

#### Scenario: Firma ausente o con formato inválido

- **WHEN** se intenta registrar una entrega sin firma, con la firma vacía, o con un contenido que no empieza con `data:image/png;base64,`
- **THEN** la operación se rechaza con un error de negocio
- **AND** no se persiste ninguna entrega ni se modifica ningún stock

#### Scenario: La firma no viaja en los listados

- **WHEN** un usuario con `LEER_ENTREGAS` lista las entregas de la unidad
- **THEN** ningún elemento de la respuesta contiene la firma

### Requirement: Visibilidad de las entregas pendientes para el dueño

El sistema SHALL exponer a los usuarios con `LEER_ENTREGAS` un listado paginado de las entregas de la unidad Vivero, filtrable por estado, ordenado por fecha con la más antigua primero cuando se piden las pendientes.

El Dashboard SHALL mostrar, únicamente en la unidad Vivero y únicamente a usuarios con `LEER_ENTREGAS`, una tarjeta con las entregas en estado `PENDIENTE`, indicando cliente, fecha y quién la registró, con acceso al detalle, a la firma y a la confirmación.

#### Scenario: La entrega recién registrada aparece para el dueño

- **GIVEN** un empleado que acaba de registrar una entrega pendiente en Vivero
- **WHEN** un usuario con `LEER_ENTREGAS` lista las entregas en estado `PENDIENTE`
- **THEN** la entrega aparece en el listado, con su cliente, su fecha y el empleado que la registró

#### Scenario: El listado es paginado

- **WHEN** un usuario con `LEER_ENTREGAS` pide el listado indicando página y tamaño
- **THEN** la respuesta es una página con el total de elementos y sólo los elementos de esa página

#### Scenario: La tarjeta del Dashboard sólo aparece en Vivero

- **WHEN** un usuario con `LEER_ENTREGAS` abre el Dashboard con la unidad activa Herramientas o Abono
- **THEN** la tarjeta de entregas pendientes no se muestra

### Requirement: El empleado ve sus propias entregas y no puede resolverlas

El sistema SHALL exponer a los usuarios con `ESCRIBIR_ENTREGAS` un listado paginado que contenga únicamente las entregas registradas por ese mismo usuario en la unidad Vivero, en cualquier estado.

Un usuario que sólo tenga `ESCRIBIR_ENTREGAS` NO SHALL poder confirmar, rechazar ni ver la firma de ninguna entrega, ni listar las entregas registradas por otros usuarios.

#### Scenario: El empleado ve sólo lo que registró él

- **GIVEN** dos empleados distintos que registraron entregas en Vivero
- **WHEN** uno de ellos pide su listado de entregas propias
- **THEN** la respuesta contiene sus entregas y ninguna del otro empleado

#### Scenario: El empleado no puede resolver una entrega

- **WHEN** un usuario que sólo tiene `ESCRIBIR_ENTREGAS` intenta confirmar o rechazar una entrega
- **THEN** la operación se rechaza por falta de permisos
- **AND** la entrega sigue en estado `PENDIENTE` y el stock no cambia

### Requirement: Confirmación de una entrega con precio por línea

El sistema SHALL permitir que un usuario con `LEER_ENTREGAS` y `ESCRIBIR_VENTAS` confirme una entrega en estado `PENDIENTE`, indicando un precio por unidad para cada línea, un descuento porcentual global opcional y los pagos.

La confirmación SHALL exigir exactamente un precio por cada línea de la entrega, identificada por el id de la línea; ni de menos ni de más.

El precio por unidad SHALL seguir las mismas reglas que el precio ajustable de una venta: un valor negativo se rechaza, 0 es válido, y el valor se normaliza a dos decimales.

La confirmación SHALL crear una `Venta` real con un `VentaDetalle` por línea, cuyo `precioUnitarioHistorico` es el precio indicado y cuyo costo histórico se copia del `MovimientoStock` registrado al momento de la entrega.

La confirmación NO SHALL volver a descontar stock ni generar un movimiento de stock adicional.

La confirmación SHALL marcar la entrega como `CONFIRMADA`, vinculada a la venta creada, con el usuario y la fecha de la resolución.

La `Venta` creada SHALL llevar la fecha del momento de la confirmación y el usuario que confirmó.

#### Scenario: Confirmar crea la venta sin volver a tocar stock

- **GIVEN** una entrega `PENDIENTE` de 10 unidades de un producto cuyo stock ya quedó en 30 al registrarse
- **WHEN** un usuario con `LEER_ENTREGAS` y `ESCRIBIR_VENTAS` la confirma con un precio por unidad de 150
- **THEN** se crea una `Venta` con una línea de 10 unidades a 150, subtotal 1500
- **AND** el stock del producto sigue en 30
- **AND** no se creó ningún `MovimientoStock` adicional para ese producto
- **AND** la entrega queda en estado `CONFIRMADA`, vinculada a esa venta, con el usuario y la fecha de confirmación

#### Scenario: El precio asignado al confirmar es el que se cobra

- **WHEN** se confirma una entrega asignando a una línea un precio por unidad distinto del precio de lista del producto
- **THEN** el `precioUnitarioHistorico` y el subtotal de esa línea de venta reflejan el precio asignado
- **AND** el precio de lista del producto queda intacto

#### Scenario: El costo histórico es el del momento de la entrega

- **WHEN** se confirma una entrega
- **THEN** el `costoUnitarioHistorico` de cada línea de la venta es el costo congelado en el `MovimientoStock` de tipo `ENTREGA_PENDIENTE` de esa línea

#### Scenario: Precio faltante, sobrante o negativo

- **WHEN** se intenta confirmar una entrega omitiendo el precio de una línea, enviando un precio para una línea que no pertenece a la entrega, o enviando un precio negativo
- **THEN** la operación se rechaza con un error de negocio
- **AND** no se crea ninguna venta
- **AND** la entrega sigue en estado `PENDIENTE`

#### Scenario: No se puede confirmar dos veces

- **WHEN** se intenta confirmar una entrega que ya está `CONFIRMADA` o `RECHAZADA`
- **THEN** la operación se rechaza con un error de negocio
- **AND** no se crea ninguna venta adicional

### Requirement: La venta sólo aparece en historial y cuenta corriente al confirmarse

Mientras una entrega esté en estado `PENDIENTE`, su mercadería NO SHALL figurar en el historial de ventas, ni en la factura del cliente, ni en su cuenta corriente, ni en los totales de Finanzas.

Al confirmarse, la venta resultante SHALL integrarse al historial de ventas, a la `FacturaCliente` abierta del cliente y a su cuenta corriente exactamente igual que cualquier otra venta registrada por el flujo normal.

#### Scenario: Antes de confirmar, la mercadería no impacta en la facturación del cliente

- **GIVEN** una entrega `PENDIENTE` para un cliente
- **WHEN** se consulta el historial de ventas del cliente, su factura abierta, su cuenta corriente y los totales de Finanzas
- **THEN** ninguno refleja importe alguno por esa entrega

#### Scenario: Al confirmar, la venta impacta como cualquier otra

- **WHEN** se confirma esa entrega con precios y un pago parcial
- **THEN** la venta aparece en el historial de ventas del cliente
- **AND** queda asociada a la `FacturaCliente` abierta del cliente
- **AND** el saldo de la cuenta corriente refleja la diferencia entre el total de la venta y lo pagado
- **AND** los totales de Finanzas incluyen esa venta y su costo de mercadería vendida

### Requirement: Rechazo de una entrega y reposición del stock

El sistema SHALL permitir que un usuario con `LEER_ENTREGAS` rechace una entrega en estado `PENDIENTE`, con un motivo opcional.

El rechazo SHALL reponer el stock de cada línea al valor previo a la entrega, dejando por cada línea un `MovimientoStock` de tipo `REVERSA_ENTREGA_PENDIENTE` con el producto, la cantidad y el usuario que rechazó.

El rechazo SHALL marcar la entrega como `RECHAZADA`, con su motivo, el usuario y la fecha de resolución, y NO SHALL crear ninguna `Venta`.

Una entrega que no esté en estado `PENDIENTE` NO SHALL poder rechazarse.

#### Scenario: Rechazar repone el stock

- **GIVEN** una entrega `PENDIENTE` de 10 unidades de un producto cuyo stock quedó en 30
- **WHEN** un usuario con `LEER_ENTREGAS` la rechaza indicando un motivo
- **THEN** el stock del producto vuelve a 40
- **AND** existe un `MovimientoStock` de tipo `REVERSA_ENTREGA_PENDIENTE` de 10 unidades sobre ese producto
- **AND** la entrega queda `RECHAZADA` con su motivo, usuario y fecha de resolución
- **AND** no se creó ninguna `Venta`

#### Scenario: No se puede rechazar una entrega ya resuelta

- **WHEN** se intenta rechazar una entrega que ya está `CONFIRMADA` o `RECHAZADA`
- **THEN** la operación se rechaza con un error de negocio
- **AND** el stock no cambia

### Requirement: Control de permisos en todos los endpoints de entregas

Cada endpoint de entregas pendientes SHALL verificar en el backend un permiso explícito, independientemente de lo que muestre la interfaz:

- registrar una entrega y listar las propias: `ESCRIBIR_ENTREGAS`
- listar todas, ver el detalle, ver la firma y rechazar: `LEER_ENTREGAS`
- confirmar: `LEER_ENTREGAS` y `ESCRIBIR_VENTAS`

Los permisos `LEER_ENTREGAS` y `ESCRIBIR_ENTREGAS` SHALL existir como permisos propios, asignables a un rol, y distintos de `ESCRIBIR_VENTAS`.

#### Scenario: Sin permiso de escritura no se registra

- **WHEN** un usuario sin `ESCRIBIR_ENTREGAS` intenta registrar una entrega
- **THEN** la operación se rechaza por falta de permisos

#### Scenario: Sin permiso de supervisión no se listan ni se ve la firma

- **WHEN** un usuario sin `LEER_ENTREGAS` intenta listar todas las entregas de la unidad, ver el detalle de una o ver su firma
- **THEN** cada una de esas operaciones se rechaza por falta de permisos

#### Scenario: Confirmar exige además poder crear ventas

- **WHEN** un usuario con `LEER_ENTREGAS` pero sin `ESCRIBIR_VENTAS` intenta confirmar una entrega
- **THEN** la operación se rechaza por falta de permisos
- **AND** no se crea ninguna venta

#### Scenario: Con los permisos correspondientes la operación procede

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` registra una entrega, y luego un usuario con `LEER_ENTREGAS` y `ESCRIBIR_VENTAS` la confirma
- **THEN** ambas operaciones son autorizadas y se completan

#### Scenario: Un empleado con permiso de entregas no gana acceso a ventas

- **WHEN** se otorga a un rol únicamente `ESCRIBIR_ENTREGAS`
- **THEN** ese rol no queda habilitado para registrar ventas ni para ver importes de venta

### Requirement: Alcance exclusivo de Vivero

Las entregas pendientes SHALL existir únicamente para la unidad de negocio Vivero.

El backend SHALL rechazar cualquier operación de entregas pendientes cuando la unidad de negocio activa no sea Vivero, aun cuando el usuario tenga los permisos correspondientes.

La sección de entregas NO SHALL aparecer en el menú de navegación ni ser accesible por ruta cuando la unidad activa sea Herramientas o Abono, con el mismo mecanismo de gating por unidad ya aplicado a Siembras, Registro de Semillas y Devoluciones.

Este cambio NO SHALL alterar ningún comportamiento existente de Herramientas ni de Abono.

#### Scenario: El backend rechaza la operación fuera de Vivero

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` y la unidad activa Herramientas o Abono llama al endpoint de registro de entregas
- **THEN** la operación se rechaza
- **AND** no se persiste ninguna entrega ni se modifica ningún stock

#### Scenario: La sección no se ofrece fuera de Vivero

- **WHEN** un usuario con `ESCRIBIR_ENTREGAS` cambia la unidad activa a Herramientas o a Abono
- **THEN** el ítem de Entregas desaparece del menú
- **AND** si estaba parado en la ruta de Entregas, es redirigido al Dashboard

#### Scenario: Los flujos existentes de Herramientas y Abono no cambian

- **WHEN** se registra una venta normal en Herramientas y una venta normal en Abono, antes y después de este cambio
- **THEN** el stock, el costo histórico, el precio histórico, los pagos y los totales de Finanzas resultantes son idénticos en ambos casos
