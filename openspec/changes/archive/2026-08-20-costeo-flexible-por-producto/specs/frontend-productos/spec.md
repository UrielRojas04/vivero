## ADDED Requirements

### Requirement: Carga de Descuentos Múltiples en el Formulario de Producto
El sistema MUST permitir, dentro del panel de análisis de costos del formulario de producto de la unidad de negocio Herramientas, cargar cero, uno o varios descuentos **estables** del producto, cada uno con su nombre y su porcentaje, pudiendo agregar y quitar filas sin salir del formulario. El sistema MUST NOT requerir una pantalla ni un flujo separado para esto.

El sistema MUST impedir guardar un descuento sin nombre o con un porcentaje negativo, informándolo en el formulario sin enviar la petición.

Los nombres sugeridos, etiquetas de ayuda y textos de ejemplo del formulario MUST referirse a condiciones de descuento permanentes del producto (por ejemplo `Proveedor`, `Volumen`, `Pronto pago`) y MUST NOT sugerir descuentos que dependan de la forma de pago o de la compra concreta, que no se modelan en el producto.

#### Scenario: Agregar un segundo descuento
- **WHEN** el usuario abre el formulario de un producto de Herramientas que ya tiene un descuento y presiona el control de agregar descuento
- **THEN** aparece una fila nueva con campos de nombre y porcentaje, y el desglose de costos se recalcula en vivo al completarla

#### Scenario: Quitar un descuento
- **WHEN** el usuario quita una de las filas de descuento y guarda
- **THEN** el producto queda sin ese descuento y su costo de adquisición se recalcula sin él

#### Scenario: Descuento sin nombre
- **WHEN** el usuario carga una fila de descuento con porcentaje pero sin nombre e intenta guardar
- **THEN** el sistema muestra el error en el campo correspondiente y no envía la petición

### Requirement: Carga de IVA y Envío por Producto
El sistema MUST permitir definir, en el mismo panel de análisis de costos, el porcentaje de IVA y el porcentaje de costo de envío propios del producto, y MUST permitir dejar ambos campos vacíos para que el producto use los valores por defecto de la unidad de negocio.

Cuando un campo está vacío, el sistema MUST informar visualmente el valor heredado que se está aplicando, de modo que el usuario distinga "hereda el valor de la unidad" de "vale cero".

Al vaciar un campo que tenía un valor propio y guardar, el sistema MUST volver a dejar el producto sin valor propio, y MUST NOT persistir un cero.

#### Scenario: Campo vacío muestra el valor heredado
- **WHEN** el usuario abre el formulario de un producto que no tiene envío propio, en una unidad de negocio con envío por defecto del `5%`
- **THEN** el campo de envío se muestra vacío e informa que se está aplicando el `5%` de la unidad de negocio

#### Scenario: Definir un valor propio
- **WHEN** el usuario escribe `12` en el campo de envío de un producto y guarda
- **THEN** el producto queda con envío propio del `12%` y su desglose de costos lo refleja

#### Scenario: Volver a heredar el valor de la unidad
- **WHEN** el usuario borra el contenido del campo de envío de un producto que tenía un valor propio y guarda
- **THEN** el producto vuelve a quedar sin valor propio y su costo se recalcula con el valor por defecto de la unidad de negocio, no con cero

#### Scenario: Definir explícitamente cero
- **WHEN** el usuario escribe `0` en el campo de envío de un producto y guarda, en una unidad de negocio con envío por defecto del `5%`
- **THEN** el producto queda con envío propio del `0%` y su costo se calcula sin envío

### Requirement: Desglose de Costo en Vivo
El sistema MUST mostrar en el panel de análisis de costos, actualizado en vivo mientras el usuario edita, el desglose completo del costo: una línea por cada descuento con su nombre y el monto que descuenta, el monto de IVA con su porcentaje, el monto de envío con su porcentaje, el costo final y el precio de venta resultante.

El desglose MUST calcularse con la misma fórmula y el mismo orden de componentes que aplica el servidor.

#### Scenario: Desglose con dos descuentos e IVA
- **WHEN** el usuario carga costo `10000`, descuentos `Proveedor 10%` y `Volumen 5%`, IVA `21%` y envío `5%`
- **THEN** el panel muestra una línea por cada descuento, la línea de IVA por `1795.50`, la línea de envío por `427.50` y un costo final de `10773.00`

#### Scenario: El desglose acompaña al agregado de un descuento
- **WHEN** el usuario agrega una fila de descuento y completa su porcentaje
- **THEN** el desglose incorpora inmediatamente una línea nueva y actualiza el costo final y el precio de venta sin necesidad de guardar

### Requirement: Configuración de Valores por Defecto de la Unidad de Negocio
El sistema MUST permitir configurar el porcentaje de IVA por defecto de la unidad de negocio en la misma pantalla de configuración donde ya se configura su costo de envío por defecto.

Al guardar un cambio en cualquiera de esos valores por defecto, el sistema MUST advertir al usuario que el cambio afecta el costo de los movimientos de stock futuros y que los precios de venta ya guardados de los productos existentes no se recalculan solos.

#### Scenario: Configurar el IVA por defecto
- **WHEN** el usuario abre la pantalla de configuración de la unidad de negocio Herramientas
- **THEN** encuentra el campo de IVA por defecto junto al de costo de envío por defecto, y puede guardarlos juntos

#### Scenario: Advertencia al cambiar un valor por defecto
- **WHEN** el usuario cambia el IVA por defecto de la unidad de negocio y confirma el guardado
- **THEN** el sistema le informa que los ingresos de stock posteriores usarán el valor nuevo y que los precios de venta ya persistidos no cambian hasta que cada producto se edite

### Requirement: Convenciones del Panel de Costos Ampliado
El sistema MUST mantener las convenciones vigentes de la aplicación en los controles nuevos: entradas numéricas con el componente de formato numérico de la aplicación, cursor de puntero en todos los botones, íconos de la biblioteca de íconos del proyecto, y avisos y confirmaciones a través del mecanismo de feedback de la aplicación en lugar de diálogos nativos del navegador.

El panel MUST seguir siendo usable a un ancho de 320 píxeles, sin desborde horizontal, incluso con varias filas de descuento cargadas.

#### Scenario: Panel con varios descuentos en pantalla angosta
- **WHEN** el usuario abre el formulario con tres descuentos cargados en una pantalla de 320 píxeles de ancho
- **THEN** todas las filas y el desglose se ven completos sin desborde horizontal
