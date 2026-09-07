## MODIFIED Requirements

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

## ADDED Requirements

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
