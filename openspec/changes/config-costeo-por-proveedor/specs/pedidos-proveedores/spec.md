## MODIFIED Requirements

### Requirement: Alta de producto nuevo durante el armado del pedido
El sistema SHALL permitir indicar, durante el armado del pedido, un producto que todavía no existe en el catálogo, sin abandonar el armado y sin darlo de alta en ese momento. El producto real SHALL crearse recién al confirmar la recepción, y únicamente para los ítems de los que efectivamente llegó mercadería.

El producto creado de esta forma SHALL quedar asociado a la unidad de negocio activa y **al proveedor del pedido del que proviene**, y SHALL nacer con los valores de costeo pactados en la línea del pedido: sus descuentos, su porcentaje de IVA, su porcentaje de costo de envío y la moneda de su costo.

#### Scenario: Producto nuevo indicado desde el pedido
- **WHEN** el usuario está armando un ítem, el producto no existe en el catálogo y elige indicarlo por su nombre
- **THEN** el ítem del pedido queda referenciando un producto pendiente de creación, y no se da de alta ningún producto en el catálogo mientras el pedido siga pendiente

#### Scenario: El producto nuevo hereda el proveedor del pedido
- **WHEN** se confirma la recepción de un ítem con producto pendiente perteneciente a un pedido dirigido al proveedor `INGCO`
- **THEN** el producto creado queda asociado al proveedor `INGCO` y aparece bajo ese proveedor en el filtro del catálogo

#### Scenario: El producto nuevo hereda los valores de costeo de la línea
- **WHEN** se confirma la recepción de un ítem con producto pendiente cuya línea del pedido tenía un descuento pactado del `30%`, IVA pactado `0%` y envío pactado `5%`
- **THEN** el producto creado queda con ese descuento, ese porcentaje de IVA y ese porcentaje de envío como valores propios

#### Scenario: El producto nuevo no aporta stock por sí solo
- **WHEN** se indica un producto pendiente en un ítem de 10 unidades y el pedido queda en `PENDIENTE`
- **THEN** no existe ningún producto en el catálogo por ese ítem, y sólo se creará —con stock 10— cuando se confirme la recepción de esas 10 unidades

#### Scenario: Ítem pendiente que no llegó
- **WHEN** se confirma la recepción indicando cantidad recibida cero para un ítem con producto pendiente
- **THEN** no se crea ningún producto en el catálogo para ese ítem y no se genera ningún movimiento de stock

### Requirement: Creación de pedidos a proveedores
El sistema SHALL permitir registrar un pedido de reposición dirigido a **un solo proveedor**, compuesto por uno o más ítems. Cada ítem SHALL indicar un producto, una cantidad pedida mayor a cero y el costo unitario pactado con el proveedor. Cada ítem SHALL registrar además los **valores de costeo pactados** para esa compra: la moneda de su costo, sus descuentos, su porcentaje de IVA y su porcentaje de costo de envío. El pedido SHALL quedar en estado `PENDIENTE` al crearse y SHALL registrar la fecha de creación, la unidad de negocio activa y el usuario que lo creó. La creación de un pedido SHALL NOT modificar el stock de ningún producto.

Al seleccionar el proveedor del pedido, el sistema SHALL precargar en las líneas del pedido los valores por defecto del perfil de costeo de ese proveedor, y el usuario SHALL poder modificarlos ítem por ítem antes de guardar.

El pedido SHALL registrar la cotización informada para esa compra cuando alguno de sus ítems está expresado en moneda extranjera.

#### Scenario: Alta de un pedido con varios ítems
- **WHEN** un usuario con permiso de escritura de pedidos crea un pedido para un proveedor con tres ítems, cada uno con su cantidad y su costo unitario
- **THEN** el sistema persiste el pedido en estado `PENDIENTE` con sus tres ítems y sus valores de costeo pactados, y registra la fecha de creación, la unidad de negocio activa y el usuario autor

#### Scenario: Precarga de los valores del proveedor
- **WHEN** un usuario selecciona un proveedor con un descuento por defecto del `30%`, IVA incluido en el precio y envío por defecto del `5%` al armar un pedido
- **THEN** las líneas del pedido quedan precargadas con ese descuento, IVA `0%` y envío `5%`, y el usuario puede modificarlos línea por línea

#### Scenario: Modificación de un valor precargado en una línea
- **WHEN** el usuario cambia el descuento precargado de una línea del `30%` al `35%` y deja las demás líneas con el valor precargado
- **THEN** el pedido persiste esa línea con el `35%` y las restantes con el `30%`, y el perfil del proveedor no se modifica

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

## ADDED Requirements

### Requirement: Cotización del Pedido con Ítems en Moneda Extranjera
El sistema SHALL solicitar la cotización del dólar al armar un pedido que contenga al menos un ítem expresado en moneda extranjera, y SHALL NOT solicitarla cuando todos los ítems están expresados en pesos.

El sistema SHALL rechazar la confirmación de recepción de un pedido con al menos un ítem en moneda extranjera si no hay cotización informada, con un error explícito, sin modificar stock ni registrar ningún movimiento.

La cotización informada SHALL aplicarse exclusivamente a los ítems expresados en moneda extranjera. Los ítems expresados en pesos SHALL ingresar con su importe sin transformación alguna.

#### Scenario: Cotización solicitada
- **WHEN** un usuario marca un ítem del pedido como expresado en dólares
- **THEN** el formulario del pedido solicita la cotización del dólar para esa compra

#### Scenario: Confirmación sin cotización
- **WHEN** se intenta confirmar la recepción de un pedido con un ítem en dólares y sin cotización informada
- **THEN** el sistema rechaza la operación completa con un error explícito, sin modificar el stock de ningún producto ni registrar ningún movimiento

#### Scenario: Pedido mixto
- **WHEN** se confirma la recepción de un pedido con un ítem de `66.24` dólares y otro de `15000.00` pesos, con cotización `1460`
- **THEN** el primer ítem ingresa con un costo base de `96710.40` y el segundo con un costo base de `15000.00`

### Requirement: El Costo Congelado del Ingreso Usa los Valores Pactados en la Línea
El sistema SHALL calcular el costo unitario congelado de cada ingreso originado en la confirmación de recepción a partir de los **valores pactados en la línea del pedido** —costo unitario pactado, moneda, cotización del pedido, descuentos, IVA y envío pactados— y SHALL NOT recurrir a la configuración vigente del producto ni a la del proveedor en el momento de la confirmación.

#### Scenario: Configuración del producto cambiada entre el pedido y la recepción
- **WHEN** se confirma la recepción de un ítem cuya línea pactó un descuento del `30%`, mientras que el producto asociado fue editado entretanto a un descuento del `10%`
- **THEN** el costo unitario congelado en el movimiento de stock se calcula con el `30%` pactado en la línea

#### Scenario: Perfil del proveedor cambiado entre el pedido y la recepción
- **WHEN** se confirma la recepción de un pedido cuyo proveedor cambió su perfil de costeo después de que el pedido fuera creado
- **THEN** el costo unitario congelado se calcula con los valores que quedaron registrados en la línea del pedido, no con el perfil actual del proveedor
