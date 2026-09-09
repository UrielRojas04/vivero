## Purpose
Define core requirements for the sales process and inventory adjustments.
## Requirements
### Requirement: Registrar una nueva venta
El sistema SHALL permitir a un usuario con permisos crear una venta asignando un cliente existente O los datos de un cliente casual (solo para la unidad de negocio Herramientas), un array de detalles (productos vendidos), un porcentaje de descuento opcional, un array de pagos, y de manera opcional una cantidad de bandejas entregadas.

Cada detalle enviado SHALL admitir, de manera **opcional**, un precio por unidad para esa línea. Cuando ese precio viene informado, el sistema SHALL usarlo como `precioUnitarioHistorico` de la línea en lugar del precio de lista del producto; cuando no viene informado, el sistema SHALL copiar el precio de lista del producto al momento de la venta, tal como lo hacía antes. Este comportamiento SHALL ser idéntico en las tres unidades de negocio (Vivero, Herramientas y Abono), incluida la ruta de venta que descuenta de stock de Abono.

El precio por unidad informado SHALL ser mayor o igual a cero; un precio negativo SHALL ser rechazado con 400 Bad Request. Un precio de cero SHALL aceptarse (línea bonificada). El sistema SHALL NOT imponer un límite superior: el precio informado puede ser menor **o mayor** al precio de lista del producto.

El sistema SHALL calcular siempre en el backend el subtotal de cada línea como el precio por unidad efectivo multiplicado por la cantidad, el `subtotal` de la venta como la suma de los subtotales de sus líneas, y el `totalFinal` aplicando el porcentaje de descuento sobre ese subtotal. El sistema SHALL NOT aceptar del cliente HTTP un subtotal de línea ni un total de venta ya calculados.

El ajuste de precio SHALL ser puntual a esa venta: el sistema SHALL NOT modificar, sobrescribir ni propagar el precio de lista del producto (`Producto.precio`) como consecuencia de registrar una venta.

Cuando la venta se registra contra un cliente casual, el sistema SHALL además admitir de manera opcional un documento puntual para esa venta, expresado como un tipo de documento (DNI o CUIL) junto con su valor, y SHALL persistirlo en la venta sin crear ningún `Cliente`.

La respuesta de una venta SHALL exponer el DNI y el CUIL del comprador como dos campos independientes, resueltos de forma uniforme cualquiera sea el origen del dato: tomados del `Cliente` vinculado cuando la venta tiene uno, o derivados del documento puntual de la venta cuando es casual. Un consumidor de la API SHALL NOT necesitar distinguir entre ambos casos para leer el documento.

#### Scenario: Venta exitosa con cliente existente
- **WHEN** el payload es válido, contiene al menos un producto sin precio por unidad informado, tiene un `clienteId` válido y cero o más pagos y bandejas
- **THEN** el sistema guarda la venta (`Venta`), calcula el `subtotal` y `totalFinal` (aplicando el descuento), copia el precio de lista del producto al momento exacto en `precioUnitarioHistorico` (`VentaDetalle`), asienta los `Pago` enviados, registra la entrega en `HistorialBandejas` (si aplica), y devuelve 201 Created.

#### Scenario: Venta con precio por unidad ajustado hacia abajo
- **WHEN** se registra una venta en Vivero o Herramientas cuyo detalle informa un precio por unidad menor al precio de lista del producto
- **THEN** el sistema persiste el precio informado en `precioUnitarioHistorico` de esa línea, su `subtotal` es el precio informado por la cantidad, y el `subtotal` y `totalFinal` de la venta reflejan ese importe menor

#### Scenario: Venta con precio por unidad ajustado hacia arriba
- **WHEN** se registra una venta cuyo detalle informa un precio por unidad mayor al precio de lista del producto
- **THEN** el sistema persiste el precio informado en `precioUnitarioHistorico` de esa línea y el `totalFinal` de la venta refleja ese importe mayor, sin rechazar la operación por superar el precio de lista

#### Scenario: Venta con precio ajustado en la unidad Abono
- **WHEN** se registra una venta con la unidad de negocio Abono activa y su detalle informa un precio por unidad distinto al de lista
- **THEN** el sistema descuenta el stock de Abono como siempre y además persiste el precio informado en `precioUnitarioHistorico` y el subtotal correspondiente, igual que en Vivero y Herramientas

#### Scenario: Venta con varias líneas donde sólo algunas ajustan el precio
- **WHEN** se registra una venta con varios detalles, algunos con precio por unidad informado y otros sin informarlo
- **THEN** cada línea con precio informado usa ese precio y cada línea sin precio informado usa el precio de lista de su producto, y el `subtotal` de la venta es la suma de todos los subtotales así calculados

#### Scenario: Precio por unidad en cero
- **WHEN** se registra una venta cuyo detalle informa un precio por unidad igual a cero
- **THEN** el sistema acepta la venta y persiste esa línea con `precioUnitarioHistorico` en cero y subtotal cero, sin aportar importe al total de la venta

#### Scenario: Precio por unidad negativo
- **WHEN** se registra una venta cuyo detalle informa un precio por unidad negativo
- **THEN** el sistema rechaza la solicitud con 400 Bad Request y no persiste la venta ni descuenta stock

#### Scenario: El precio de lista del producto no se altera
- **WHEN** se registra una venta con un precio por unidad ajustado para un producto
- **THEN** el `precio` de ese `Producto` en el catálogo queda idéntico al que tenía antes de la venta, y una venta posterior sin precio informado para el mismo producto vuelve a usar ese precio de lista

#### Scenario: Venta exitosa con cliente casual
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y en lugar de `clienteId` contiene un objeto `clienteAdHoc` con bandera `casual: true`, nombre y teléfono
- **THEN** el sistema guarda la venta (`Venta`) SIN asociar un `Cliente` de la base de datos (clave foránea nula), pero almacenando el nombre y teléfono del cliente ad-hoc en los datos de la Venta para uso en comprobantes, y devuelve 201 Created.

#### Scenario: Venta exitosa con creación de cliente express
- **WHEN** el payload es válido, la unidad de negocio es Herramientas, y contiene un objeto `clienteAdHoc` con bandera `casual: false`, nombre y teléfono
- **THEN** el sistema primero crea un registro `Cliente` en la base de datos para la unidad de negocio Herramientas, luego guarda la venta (`Venta`) vinculada a este nuevo cliente, y devuelve 201 Created.

#### Scenario: Venta con payload inválido
- **WHEN** se envía una venta sin clienteId Y sin clienteAdHoc, o sin detalles
- **THEN** el sistema rechaza la solicitud con 400 Bad Request.

#### Scenario: Documento del comprador en una venta con cliente vinculado
- **WHEN** se consulta una venta asociada a un `Cliente` que tiene cargado un DNI, un CUIL, o ambos
- **THEN** la respuesta expone esos valores en los campos de DNI y CUIL de la venta

#### Scenario: Documento del comprador en una venta casual
- **WHEN** se consulta una venta sin `Cliente` vinculado que se registró con un documento puntual
- **THEN** la respuesta expone ese valor en el campo que corresponde al tipo de documento con el que fue cargado, y deja nulo el otro

#### Scenario: Venta sin ningún documento
- **WHEN** se consulta una venta cuyo cliente no tiene documentos cargados, o que es casual y se registró sin documento puntual
- **THEN** la respuesta devuelve nulos ambos campos de documento y la venta se procesa con normalidad

### Requirement: Persistencia del Carrito de Ventas en la UI
El sistema SHALL mantener el estado del carrito (cliente seleccionado, detalles, métodos de pago, notas, y descuento) persistente a través de la navegación entre distintas secciones de la aplicación mientras dure la sesión.

#### Scenario: Usuario cambia de sección sin perder el carrito
- **WHEN** el usuario agrega productos al carrito en la vista "Nueva Venta" y navega a la sección de "Insumos" y luego retorna a "Nueva Venta"
- **THEN** los datos previamente cargados (productos, cliente, etc.) se restauran automáticamente sin requerir interacción manual.

### Requirement: Registro Inmutable de Ventas
The system SHALL register sales linking them to a `UnidadNegocio` and an optional `Cliente`, persisting the total cost and total price frozen at the exact moment of sale.

Each sold product SHALL produce **exactly one** `VentaDetalle` line, regardless of how many cost layers its units are deducted from. The system SHALL NOT split a sale line —neither its quantity, nor its unit price, nor its subtotal— for cost accounting reasons, so that the document the customer sees keeps one row per product.

Each sale line SHALL freeze a **single unit cost** for its whole quantity. When the product's business unit has layer-based costing enabled, that unit cost SHALL be the product's **reference cost at the moment of the sale** — the highest unit cost among its active layers, as defined by the `costeo-por-capas` capability — and the line SHALL freeze the full cost breakdown of the layer that supplied that cost. The system SHALL NOT persist a weighted average of several layers, and SHALL NOT persist a per-layer breakdown on the sale line.

Values frozen on a `VentaDetalle` SHALL remain immutable: no later change to cost configuration, to cost layers, or to the costing mode of a business unit SHALL alter the historical profit of an already registered sale.

Sales registered before layer-based costing existed SHALL keep their frozen values untouched and SHALL NOT be recalculated.

#### Scenario: Realización de Venta Exitosa
- **WHEN** a user finalizes a sale of multiple products
- **THEN** the system generates a `Venta` record and one `VentaDetalle` record per sold product containing the copied unit price, unit cost, and applied modifiers, preventing future global configuration changes from altering the historical profit calculation.

#### Scenario: Venta cuyas unidades salen de dos capas
- **WHEN** a sale of `6` units of one product deducts `5` units from a layer at `22822.80` and `1` unit from a layer at `15561.00`
- **THEN** the sale contains exactly one `VentaDetalle` for that product with quantity `6` and a single frozen unit cost of `22822.80` — the highest among the active layers — with its subtotal still equal to the unit price times `6`

#### Scenario: El costo congelado no es el de la capa de la que salieron las unidades
- **WHEN** a sale of `1` unit deducts it from the oldest layer at `21780.00` while a more expensive active layer at `25987.50` remains
- **THEN** the `VentaDetalle` freezes a unit cost of `25987.50`

#### Scenario: El comprobante impreso conserva una fila por producto
- **WHEN** a customer's receipt is produced for a sale whose line drew units from two cost layers
- **THEN** the product appears in a single row with its full quantity, and never as two rows for the same product

#### Scenario: Ventas anteriores al costeo por capas
- **WHEN** layer-based costing is introduced and its cost layers are initialized
- **THEN** every previously registered `VentaDetalle` keeps its frozen unit price, unit cost and base cost exactly as recorded

#### Scenario: Una venta ya registrada no cambia de margen
- **WHEN** cost layers are consumed, a product's cost configuration is edited, or layer-based costing is disabled for a business unit, after a sale has been registered
- **THEN** the frozen values of that sale's details remain exactly as they were, and its historical profit is unchanged

### Requirement: Impacto en Movimientos
The system SHALL automatically generate stock movements of type `VENTA` for each product sold, to decrement inventory properly and record the cost of goods sold.

The system SHALL generate **exactly one** movement per sold product, for the full quantity of its sale line, regardless of whether the business unit has layer-based costing enabled and regardless of how many cost layers its units are deducted from.

When the product's business unit has layer-based costing **disabled**, that movement SHALL freeze the cost of the product's most recent inbound movement, exactly as before.

When the product's business unit has layer-based costing **enabled**, that movement SHALL freeze the product's reference cost at the moment of the sale — the highest unit cost among its active layers — and the quantities SHALL be deducted from the product's oldest active layers first, as defined by the `costeo-por-capas` capability.

The quantity of the movement generated for a sold product SHALL equal the quantity sold on its sale line, and its frozen unit cost SHALL equal the unit cost frozen on that line.

#### Scenario: Deducción Automática de Inventario
- **WHEN** a sale is finalized successfully
- **THEN** the system reduces the `stock` in `Producto` and logs the corresponding `MovimientoStock` con el costo de salida congelado.

#### Scenario: Venta cuyas unidades salen de una sola capa
- **WHEN** `3` units are sold of a product of a business unit with layer-based costing enabled whose only active layer holds `5` remaining units
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for `3` units, carrying that layer's frozen cost breakdown

#### Scenario: Venta cuyas unidades salen de dos capas
- **WHEN** `6` units are sold of a product of a business unit with layer-based costing enabled whose oldest layer holds `5` remaining units at `22822.80` and whose next layer holds `2` at `15561.00`
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for `6` units at a unit cost of `22822.80`, and the remaining quantities of both layers are decremented by `5` and `1` respectively

#### Scenario: Venta en una unidad sin costeo por capas
- **WHEN** a sale is finalized for a product of a business unit with layer-based costing disabled
- **THEN** the system logs exactly one `MovimientoStock` of type `VENTA` for the full quantity sold, copying the cost of the product's most recent inbound movement

### Requirement: Alta de cliente al vuelo desde el buscador de Nueva Venta
El sistema SHALL permitir, en la pantalla de Nueva Venta y en las tres unidades de negocio, dar de alta un cliente desde el propio buscador de clientes cuando el texto tipeado no coincide con ningún cliente existente, sin abandonar la venta en curso ni perder el carrito ya cargado.

El alta SHALL ocurrir en el momento contra el endpoint de creación de clientes, de manera que el cliente exista con identidad propia antes de confirmar la venta, y el cliente recién creado SHALL quedar seleccionado como cliente de la venta en curso. La venta resultante SHALL enviarse como cualquier otra venta a cliente de agenda, referenciando al cliente por su identificador.

El formulario de alta al vuelo SHALL pedir únicamente el nombre —tomado del texto ya tipeado— y ofrecer como opcionales el teléfono y un documento, este último mediante la elección de un tipo (DNI o CUIL) y su valor. Ninguno de los campos opcionales SHALL ser requerido para completar el alta.

Si el alta falla, el sistema SHALL informar el error, SHALL NOT dejar seleccionado ningún cliente y SHALL conservar intacto el carrito de la venta en curso.

#### Scenario: Alta al vuelo desde el buscador de agenda
- **WHEN** el vendedor escribe en el buscador de cliente de Nueva Venta un nombre que no coincide con ningún cliente y confirma la creación
- **THEN** el sistema crea el cliente, lo deja seleccionado como cliente de la venta en curso y muestra confirmación del alta

#### Scenario: Alta al vuelo con teléfono y documento
- **WHEN** el vendedor, en el formulario de alta al vuelo, además del nombre completa el teléfono y elige DNI o CUIL cargando su valor
- **THEN** el cliente queda creado con el teléfono y el documento indicados en el campo que corresponde al tipo elegido

#### Scenario: Alta al vuelo solo con nombre
- **WHEN** el vendedor confirma el alta al vuelo sin completar teléfono ni documento
- **THEN** el sistema crea el cliente solo con el nombre y lo selecciona, sin exigir los datos opcionales

#### Scenario: Confirmación de la venta tras el alta al vuelo
- **WHEN** el vendedor confirma la venta usando un cliente que acaba de crear al vuelo
- **THEN** el sistema envía la venta referenciando al cliente por su identificador, sin datos de cliente ad-hoc, y la venta queda vinculada a ese cliente

#### Scenario: El carrito sobrevive a un alta fallida
- **WHEN** el alta al vuelo falla por un error del servidor mientras hay productos cargados en el carrito
- **THEN** el sistema muestra el error, la venta permanece sin cliente seleccionado y los productos del carrito siguen cargados

#### Scenario: Disponibilidad en las tres unidades de negocio
- **WHEN** el vendedor usa el buscador de cliente de Nueva Venta en Vivero, en Herramientas o en Abono
- **THEN** la opción de crear el cliente al vuelo está disponible en las tres, con el mismo comportamiento

### Requirement: Historial de Ventas Compartido en Abono

El listado del historial de ventas de una unidad de negocio MUST estar delimitado únicamente por la unidad de negocio. En la unidad Abono, donde cada venta se atribuye a una cuenta operativa (`JEFE` o `COLEGA`), el sistema MUST NOT usar esa cuenta como criterio de visibilidad ni de filtrado del historial: ambos usuarios MUST ver el mismo historial completo de la unidad, exactamente igual que en las unidades que no tienen cuentas operativas.

El sistema MUST NOT conservar ninguna consulta capaz de devolver el historial de ventas filtrado por cuenta operativa.

Esta unificación aplica **solo a la consulta del historial**. La atribución de cada venta a su cuenta operativa MUST permanecer intacta y MUST seguir persistiéndose al registrar la venta: es la que alimenta el stock de Abono, la atribución del pago y el cálculo de la rendición del colega. Compartir la vista no significa compartir la plata.

Cada fila del historial SHALL permitir identificar quién registró la venta a partir del dato de usuario que la respuesta de venta ya expone. El sistema MUST NOT agregar ningún campo nuevo al contrato de la respuesta para lograrlo.

#### Scenario: El jefe ve también las ventas del colega

- **WHEN** existen en Abono una venta registrada bajo la cuenta `JEFE` y otra bajo la cuenta `COLEGA`, y se solicita el historial de ventas con la cuenta `JEFE` activa
- **THEN** el historial devuelve ambas ventas, la de `JEFE` y la de `COLEGA`

#### Scenario: El colega ve también las ventas del jefe

- **WHEN** existen en Abono una venta registrada bajo la cuenta `JEFE` y otra bajo la cuenta `COLEGA`, y se solicita el historial de ventas con la cuenta `COLEGA` activa
- **THEN** el historial devuelve ambas ventas, la de `COLEGA` y la de `JEFE`

#### Scenario: El historial es idéntico para ambas cuentas

- **WHEN** el historial de ventas de Abono se consulta con la cuenta `JEFE` en contexto y luego con la cuenta `COLEGA` en contexto
- **THEN** ambas consultas devuelven exactamente el mismo conjunto de ventas

#### Scenario: Historial de Abono sin cuenta operativa en contexto

- **WHEN** se solicita el historial de ventas de Abono sin ninguna cuenta operativa en el contexto de la petición
- **THEN** el historial devuelve todas las ventas de la unidad, sin error y sin diferencia respecto de la consulta hecha con una cuenta activa

#### Scenario: Cada venta sigue identificando a quién la registró

- **WHEN** se consulta el historial compartido de Abono
- **THEN** cada venta expone el usuario que la registró, sin que haga falta ningún campo nuevo en la respuesta

#### Scenario: Vivero y Herramientas no se ven afectados (guarda de regresión)

- **WHEN** se solicita el historial de ventas con la unidad Vivero o Herramientas en contexto, incluso habiendo una cuenta operativa residual en el contexto de la petición
- **THEN** el historial devuelve todas las ventas de esa unidad, sin filtrarlas por cuenta operativa

#### Scenario: Aislamiento entre unidades de negocio intacto

- **WHEN** se solicita el historial de ventas con una unidad de negocio distinta de Abono en contexto
- **THEN** el sistema devuelve únicamente las ventas de esa unidad y ninguna venta de Abono

#### Scenario: La rendición del colega sigue calculándose por cuenta (guarda de regresión)

- **WHEN** con el historial de ventas ya compartido se liquida el período de la rendición del colega de Abono
- **THEN** los totales de ventas, de cobros y de retiros se siguen calculando por separado para la cuenta `JEFE` y para la cuenta `COLEGA`, con los mismos resultados que antes de compartir el historial

#### Scenario: El stock de Abono sigue siendo de cada cuenta (guarda de regresión)

- **WHEN** con el historial de ventas ya compartido se registra una venta de Abono bajo una cuenta operativa
- **THEN** el descuento de stock se aplica sobre el stock de esa cuenta y el pago queda atribuido a esa misma cuenta, sin cambios respecto del comportamiento anterior

### Requirement: Ajuste del precio por unidad al confirmar la venta
El sistema SHALL permitir ajustar el precio por unidad de cada línea de la venta dentro del modal de confirmación "Liquidar Venta", antes de registrarla. El precio ajustado SHALL ser el que se envía al backend para esa línea.

Al modificar el precio por unidad de una línea, el sistema SHALL recalcular de inmediato y sin requerir guardado el subtotal de esa línea, el subtotal de la venta, el monto del descuento y el total a pagar mostrados en la interfaz. Este recálculo SHALL aplicarse tanto si el precio nuevo es menor como si es mayor al precio de lista.

La interfaz SHALL conservar y mostrar el precio de lista original del producto como referencia, y SHALL permitir restaurarlo, de modo que el usuario siempre pueda distinguir el precio ajustado del precio de catálogo. La interfaz SHALL NOT ofrecer desde este flujo ninguna acción que modifique el precio de lista del producto en el catálogo.

El comportamiento SHALL ser el mismo para las tres unidades de negocio (Vivero, Herramientas y Abono), que comparten el mismo modal de confirmación.

#### Scenario: Ajustar el precio de una línea baja el total en vivo
- **WHEN** el usuario abre el modal "Liquidar Venta" y reduce el precio por unidad de una línea
- **THEN** el subtotal de esa línea, el subtotal de la venta y el total a pagar se actualizan inmediatamente al importe menor, sin cerrar ni reabrir el modal

#### Scenario: Ajustar el precio de una línea sube el total en vivo
- **WHEN** el usuario aumenta el precio por unidad de una línea en el modal de confirmación
- **THEN** el subtotal de esa línea, el subtotal de la venta y el total a pagar se actualizan inmediatamente al importe mayor

#### Scenario: El precio ajustado es el que se registra
- **WHEN** el usuario ajusta el precio de una o más líneas y confirma la venta
- **THEN** la venta registrada persiste para cada línea el precio ajustado y su subtotal, y el total de la venta coincide con el total que mostraba el modal al confirmar

#### Scenario: Referencia al precio de lista y restauración
- **WHEN** el precio por unidad de una línea difiere del precio de lista del producto
- **THEN** la interfaz señala esa línea como ajustada, muestra el precio de lista original como referencia y ofrece restaurarlo, y al restaurarlo los totales se recalculan en vivo

#### Scenario: Precio inválido en la interfaz
- **WHEN** el usuario intenta dejar el precio por unidad de una línea vacío o negativo
- **THEN** la interfaz impide confirmar la venta con ese valor y avisa mediante el sistema de feedback de la aplicación, sin usar diálogos nativos del navegador

#### Scenario: El monto del pago auto-completado sigue al total
- **WHEN** el modal auto-completó una única línea de pago con el total a pagar, el usuario no editó ese monto, y luego ajusta el precio de una línea
- **THEN** el monto de esa única línea de pago se actualiza al nuevo total a pagar, de modo que no se genere un saldo en cuenta corriente que el usuario no pidió

#### Scenario: Un monto de pago editado a mano no se pisa
- **WHEN** el usuario editó manualmente el monto del pago, o cargó más de una línea de pago, y luego ajusta el precio de una línea
- **THEN** el sistema respeta los montos cargados sin sobrescribirlos, y el indicador de saldo refleja la diferencia contra el nuevo total

