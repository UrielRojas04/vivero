## ADDED Requirements

### Requirement: Perfil de Costeo del Proveedor
El sistema SHALL permitir configurar, en cada proveedor, un **perfil de costeo** compuesto por: el tratamiento del IVA de sus precios de lista, un porcentaje de IVA por defecto, si cotiza precios en moneda extranjera, una lista de descuentos por defecto y un porcentaje de costo de envío por defecto.

El tratamiento del IVA SHALL expresarse como una condición de dos valores: **IVA incluido en el precio de lista** o **IVA aparte del precio de lista**. El valor inicial de un proveedor nuevo SHALL ser "IVA incluido".

El porcentaje de IVA por defecto SHALL ser relevante únicamente cuando el proveedor factura el IVA aparte, y SHALL admitir el valor "sin configurar".

La lista de descuentos por defecto SHALL admitir cero, uno o varios descuentos, cada uno con un nombre no vacío y un porcentaje mayor o igual a cero, con la misma semántica de combinación en cascada que la lista de descuentos de un producto.

El porcentaje de costo de envío por defecto SHALL admitir el valor "sin configurar".

El porcentaje de costo de envío por defecto SHALL expresarse siempre como un **porcentaje sobre el costo de cada ítem**. El sistema SHALL NOT admitir un importe fijo de flete por pedido a repartir entre las líneas.

El perfil de costeo SHALL NOT incluir ninguna cotización de moneda extranjera como valor por defecto aplicable. La cotización es un dato de cada operación de compra y se rige por la capacidad de moneda y cotización.

Un proveedor nuevo SHALL nacer con un perfil **neutro**: IVA incluido, sin IVA por defecto, sin moneda extranjera, sin descuentos y sin envío por defecto. Un perfil neutro SHALL NOT aportar ningún valor a ningún producto ni a ninguna línea de pedido.

#### Scenario: Alta de proveedor con perfil neutro
- **WHEN** un usuario da de alta un proveedor indicando únicamente su nombre
- **THEN** el proveedor queda con IVA incluido en el precio, sin IVA por defecto, sin moneda extranjera, sin descuentos por defecto y sin envío por defecto

#### Scenario: Proveedor que factura el IVA aparte
- **WHEN** un usuario configura un proveedor indicando que factura el IVA aparte, con un IVA por defecto del `21%`
- **THEN** el sistema persiste ambos datos y los ofrece como valores por defecto de los productos y las líneas de pedido de ese proveedor

#### Scenario: Proveedor con varios descuentos por defecto
- **WHEN** un usuario configura un proveedor con dos descuentos por defecto, `"Proveedor" 30%` y `"Pronto pago" 21%`
- **THEN** el sistema persiste los dos descuentos con su nombre y su porcentaje, y los ofrece juntos como valores por defecto

#### Scenario: Descuento por defecto sin nombre
- **WHEN** un usuario intenta guardar un proveedor con un descuento por defecto sin nombre o con porcentaje negativo
- **THEN** el sistema rechaza la operación y no persiste ningún cambio en el proveedor

#### Scenario: El IVA por defecto no aplica cuando el IVA viene incluido
- **WHEN** un usuario configura un proveedor con IVA incluido en el precio
- **THEN** el sistema no solicita ni aplica ningún porcentaje de IVA por defecto para los productos de ese proveedor

#### Scenario: El IVA por defecto no gobierna ningún cálculo
- **WHEN** se calcula el costo de un producto de un proveedor que factura el IVA aparte con un IVA por defecto del `21%`, y ese producto tiene un IVA propio del `10.5%`
- **THEN** el cálculo aplica el `10.5%` del producto, y el `21%` del proveedor no interviene en ningún momento

#### Scenario: El perfil no admite una cotización aplicable
- **WHEN** un usuario configura el perfil de costeo de un proveedor que cotiza en moneda extranjera
- **THEN** el perfil no incluye ninguna cotización que el sistema aplique por su cuenta a las compras de ese proveedor

#### Scenario: Descuentos desglosados con su nombre
- **WHEN** un usuario conoce la composición del descuento de un proveedor —un `15%` de proveedor seguido de un `5%` de pronto pago— y lo carga como dos descuentos por defecto con esos nombres
- **THEN** el sistema conserva las dos filas por separado con su nombre, y el resultado de aplicarlas en cascada es el mismo que el de un único descuento equivalente

### Requirement: Los Valores del Proveedor son Valores por Defecto Copiados
El sistema SHALL tratar el perfil de costeo del proveedor exclusivamente como un conjunto de **valores por defecto que se copian** al destino en el momento en que se establece la relación, y SHALL NOT usarlo como origen de una herencia en vivo.

La resolución del IVA y del costo de envío efectivos de un producto SHALL seguir teniendo exactamente dos niveles: el valor propio del producto y, cuando el producto no tiene valor propio, el valor por defecto de su unidad de negocio. El proveedor SHALL NOT participar de esa resolución.

La copia SHALL ocurrir **una sola vez**, en el momento en que se establece la relación, y a partir de entonces el destino SHALL ser el único dueño de esos valores.

Modificar el perfil de costeo de un proveedor SHALL NOT alterar por sí solo el costo, el precio de venta ni la configuración de ningún producto ya existente, ni el contenido de ninguna línea de pedido ya registrada.

El cálculo del costo SHALL NOT consultar el proveedor en ningún momento.

#### Scenario: Cambiar el perfil del proveedor no reprecifica sus productos
- **WHEN** un usuario modifica el descuento por defecto de un proveedor del `30%` al `35%`, y ese proveedor tiene productos ya cargados con el `30%` copiado
- **THEN** los productos conservan su descuento del `30%`, su costo y su precio de venta sin ningún cambio

#### Scenario: El proveedor no es un nivel de herencia
- **WHEN** se calcula el costo de un producto sin IVA propio, cuyo proveedor tiene un IVA por defecto del `21%` y cuya unidad de negocio tiene un IVA por defecto del `10.5%`
- **THEN** el cálculo aplica el `10.5%` de la unidad de negocio y no el `21%` del proveedor

### Requirement: Copia de los Valores por Defecto a un Producto
El sistema SHALL copiar los valores del perfil de costeo del proveedor a los campos correspondientes del producto cuando se le asigna ese proveedor a un producto que se está creando, dejándolos visibles y editables antes de guardar.

Cuando el proveedor tiene el **IVA incluido en el precio de lista**, el sistema SHALL escribir en el producto un porcentaje de IVA **igual a cero de forma explícita**, y SHALL NOT dejarlo "sin configurar". Dejarlo sin configurar haría que el producto heredara el IVA por defecto de su unidad de negocio y se le sumara un IVA que el precio de lista ya contiene.

Cuando el proveedor factura el **IVA aparte**, el sistema SHALL copiar su porcentaje de IVA por defecto al producto, y el usuario SHALL poder modificarlo antes de guardar.

#### Scenario: Producto de un proveedor con IVA incluido
- **WHEN** se crea un producto asignándole un proveedor configurado con IVA incluido en el precio, en una unidad de negocio cuyo IVA por defecto es `21%`
- **THEN** el producto queda con un porcentaje de IVA propio igual a `0`, y su costo calculado no incluye ningún monto de IVA

#### Scenario: Producto de un proveedor con IVA aparte
- **WHEN** se crea un producto asignándole un proveedor que factura el IVA aparte con un IVA por defecto del `21%`
- **THEN** el producto queda con un porcentaje de IVA propio igual a `21`, modificable por el usuario antes de guardar

#### Scenario: Los descuentos del proveedor se copian con su nombre
- **WHEN** se crea un producto asignándole un proveedor con dos descuentos por defecto `"Proveedor" 30%` y `"Pronto pago" 21%`
- **THEN** el producto queda con esos dos descuentos, cada uno con su nombre y su porcentaje, editables y eliminables antes de guardar

#### Scenario: El usuario puede pisar un valor copiado
- **WHEN** se crea un producto de un proveedor con descuento por defecto del `30%` y el usuario lo cambia a `35%` antes de guardar
- **THEN** el producto queda con el `35%` y el perfil del proveedor no se modifica

#### Scenario: Producto sin proveedor
- **WHEN** se crea un producto sin asignarle ningún proveedor
- **THEN** el sistema no copia ningún valor por defecto y el producto queda con sus campos de costeo sin configurar

### Requirement: Reaplicación Explícita de los Valores por Defecto
El sistema SHALL permitir reaplicar el perfil de costeo actual de un proveedor a los productos que lo tienen asignado, únicamente como una acción explícita solicitada por el usuario.

Antes de modificar nada, el sistema SHALL presentar la lista de productos afectados con su costo actual y el costo que tendrían tras la reaplicación, y SHALL permitir excluir productos puntuales de la operación. La operación SHALL requerir una confirmación explícita del usuario y SHALL NOT ejecutarse de forma automática al guardar el proveedor.

Los productos modificados por esta operación SHALL registrar el cambio de la misma forma que si hubieran sido editados manualmente.

#### Scenario: Vista previa antes de aplicar
- **WHEN** un usuario pide reaplicar el perfil de un proveedor que tiene tres productos asignados
- **THEN** el sistema muestra los tres productos con su costo actual y su costo resultante, sin haber modificado ninguno todavía

#### Scenario: Exclusión de un producto de la reaplicación
- **WHEN** el usuario excluye uno de los tres productos de la vista previa y confirma la operación
- **THEN** los otros dos productos quedan con los valores del proveedor y el excluido conserva exactamente los suyos

#### Scenario: Guardar el proveedor no reaplica nada
- **WHEN** un usuario modifica el perfil de costeo de un proveedor y guarda los cambios sin pedir la reaplicación
- **THEN** ningún producto de ese proveedor cambia de configuración, de costo ni de precio

#### Scenario: La reaplicación queda registrada
- **WHEN** el usuario confirma la reaplicación sobre un producto cuyo costo resultante difiere del actual
- **THEN** el sistema registra el cambio de costo del producto igual que ante una edición manual

### Requirement: Administración de Proveedores desde la Configuración del Negocio
El sistema SHALL ofrecer la administración de proveedores, incluido su perfil de costeo, dentro de la pantalla de configuración de la unidad de negocio Herramientas, además de la pantalla de proveedores ya existente.

El formulario de proveedor SHALL presentar los datos de contacto y el perfil de costeo como secciones distinguibles, SHALL permitir agregar y quitar filas de descuento, y SHALL ser usable en pantallas de 320 píxeles de ancho sin desbordar horizontalmente. Toda confirmación SHALL usar el mecanismo de diálogos de la aplicación y SHALL NOT usar diálogos nativos del navegador.

#### Scenario: Alta de proveedor desde configuración
- **WHEN** un usuario habilitado abre la configuración del negocio Herramientas y da de alta un proveedor con su perfil de costeo
- **THEN** el proveedor queda persistido con su perfil y aparece también en la pantalla de proveedores y en el selector de proveedores del armado de pedidos

#### Scenario: Filas de descuento agregables y quitables
- **WHEN** el usuario agrega dos filas de descuento en el formulario del proveedor y luego elimina la primera
- **THEN** el formulario conserva únicamente la segunda fila con su nombre y su porcentaje

#### Scenario: Formulario usable en mobile
- **WHEN** un usuario abre el formulario de proveedor en una pantalla de 320 píxeles de ancho, con dos filas de descuento cargadas
- **THEN** todos los campos son accesibles y la pantalla no desborda horizontalmente

### Requirement: Un Único Origen del Perfil de Costeo del Proveedor
El sistema SHALL exponer y editar el perfil de costeo del proveedor a través de una única definición, con independencia de desde qué pantalla se lo administre. El sistema SHALL NOT mantener dos definiciones distintas del mismo perfil.

#### Scenario: El mismo proveedor visto desde dos pantallas
- **WHEN** un usuario edita el descuento por defecto de un proveedor desde la configuración del negocio y luego abre ese mismo proveedor desde la pantalla de proveedores
- **THEN** ve el valor que acaba de guardar, con los mismos campos y las mismas validaciones
