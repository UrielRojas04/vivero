## MODIFIED Requirements

### Requirement: Pantallas del circuito de pedidos
El sistema SHALL ofrecer una pantalla de listado de pedidos, un flujo de creación que permita elegir proveedor y agregar ítems —eligiendo un producto existente o creando uno nuevo en el momento— con su cantidad y su costo unitario, y una pantalla o diálogo de confirmación de recepción donde se cargue por ítem la cantidad realmente recibida.

En el flujo de creación, elegir un proveedor SHALL ser condición previa para cargar ítems: mientras no haya proveedor seleccionado, la carga de ítems SHALL estar deshabilitada y el sistema SHALL explicar el motivo. Los ítems SHALL presentarse como una grilla tabular de ancho completo, una fila por ítem, donde cada fila exponga en columnas propias el producto, la cantidad, los descuentos aplicables, el porcentaje de IVA, el porcentaje de costo de envío y el costo total de esa fila. El costo total de cada fila y el total del pedido SHALL calcularse aplicando la cadena de costeo vigente (descuentos en cascada, IVA sobre el neto, envío en cadena sobre neto+IVA, y conversión de moneda cuando la línea es en dólares) y SHALL NOT mostrarse como el costo unitario pactado sin procesar.

En la confirmación, la cantidad recibida SHALL venir precargada con la cantidad pedida y SHALL ser editable, y el usuario SHALL poder ver el remanente resultante antes de confirmar. Los listados SHALL presentarse como tabla en anchos `md` o mayores y como tarjetas apiladas en anchos menores. El feedback y las confirmaciones SHALL usar el mecanismo de diálogos y avisos de la aplicación, y SHALL NOT usar diálogos nativos del navegador.

#### Scenario: El total del pedido refleja el costo real, no el pactado crudo
- **WHEN** el usuario carga un único ítem con cantidad 1, costo unitario pactado $3.000, IVA 21% y envío 5%, y la fila muestra un costo final de $3.811,50
- **THEN** tanto el total del encabezado de la grilla como el total del pie del formulario muestran $3.811,50, y ninguno de los dos muestra $3.000

#### Scenario: El total suma el costo real de todas las filas
- **WHEN** el pedido tiene dos ítems, uno con costo final de fila $3.811,50 y cantidad 2, y otro con costo final de fila $1.000 y cantidad 3
- **THEN** el total mostrado es $10.623,00 — la suma de costo final de fila por cantidad de cada ítem

#### Scenario: Los descuentos de la línea impactan en el total
- **WHEN** el usuario agrega un descuento a una fila de producto pendiente y el costo final de esa fila baja
- **THEN** el total del encabezado y el del pie bajan en el mismo instante, sin necesidad de guardar ni recargar

#### Scenario: Una línea en dólares aporta al total convertida a pesos
- **WHEN** el pedido tiene una línea en USD y el usuario carga la cotización del pedido
- **THEN** esa línea aporta al total su costo final ya convertido a pesos por esa cotización, con la misma cadena de costeo que el resto

#### Scenario: Una línea en dólares sin cotización no inventa un total
- **WHEN** el pedido tiene una línea en USD y todavía no se cargó la cotización del pedido
- **THEN** esa línea aporta cero al total en vez de sumar su importe en dólares como si fueran pesos, y el sistema advierte que falta la cotización

#### Scenario: No se pueden cargar ítems sin proveedor
- **WHEN** el usuario entra a la pantalla de nuevo pedido y todavía no eligió proveedor
- **THEN** la grilla de ítems aparece bloqueada, la acción de agregar ítem está deshabilitada y el sistema muestra un mensaje que indica que primero hay que elegir un proveedor

#### Scenario: Elegir el proveedor habilita la carga de ítems
- **WHEN** el usuario selecciona un proveedor en la pantalla de nuevo pedido
- **THEN** la grilla de ítems queda habilitada con una primera fila lista para completar, precargada con el perfil de costeo por defecto de ese proveedor

#### Scenario: Cada fila muestra su composición de costo en columnas
- **WHEN** el usuario carga un ítem con descuentos, IVA y costo de envío
- **THEN** la fila muestra el nombre del producto, la cantidad, los descuentos aplicados, el porcentaje de IVA, el porcentaje de envío y el costo total de la fila, cada uno en su propia columna alineada con las del resto de las filas

#### Scenario: Una fila con varios descuentos no rompe la alineación de la grilla
- **WHEN** un ítem tiene tres descuentos cargados y los demás ítems no tienen ninguno
- **THEN** todas las filas conservan la misma estructura de columnas y la grilla no desborda horizontalmente la pantalla

#### Scenario: Los descuentos de un producto existente se ven pero no se editan desde el pedido
- **WHEN** el usuario elige en una fila un producto que ya existe en el catálogo y ese producto tiene descuentos configurados en su ficha
- **THEN** la fila muestra esos descuentos como información de solo lectura, sin ofrecer agregarlos ni quitarlos desde el pedido, y los aplica al costo total de la fila

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

## ADDED Requirements

### Requirement: Continuidad del borrador de pedido en curso
El sistema SHALL preservar el pedido que el usuario está armando ante una recarga de la página o una navegación de ida y vuelta, restaurando el proveedor, los ítems con todo su costeo pactado, la cotización y las observaciones. El borrador SHALL descartarse al crear el pedido y al cancelar explícitamente. Un borrador restaurado que contenga ítems pero no tenga proveedor SHALL conservar esos ítems y SHALL mantenerlos bloqueados hasta que se elija un proveedor, sin descartarlos en silencio.

#### Scenario: El borrador sobrevive a una recarga
- **WHEN** el usuario carga proveedor y dos ítems, recarga la página y vuelve a la pantalla de nuevo pedido
- **THEN** el proveedor y los dos ítems aparecen tal como estaban, con su cantidad, costo pactado, IVA, envío y descuentos

#### Scenario: Borrador anterior sin proveedor
- **WHEN** se restaura un borrador que tiene ítems cargados pero ningún proveedor seleccionado
- **THEN** los ítems se conservan visibles y bloqueados, y el sistema pide elegir un proveedor para poder seguir editándolos

#### Scenario: El borrador se descarta al cancelar
- **WHEN** el usuario cancela el armado del pedido
- **THEN** el borrador se elimina y la próxima vez que entre a nuevo pedido la pantalla arranca vacía
