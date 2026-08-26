## Purpose
Esta especificación define el comportamiento del registro de productos y actualización de stock dentro del catálogo.
## Requirements
### Requirement: Registro de Producto
El sistema MUST permitir registrar un nuevo producto definiendo su costo catálogo, sus descuentos, su porcentaje de IVA, su porcentaje de costo de envío y su porcentaje de ganancia deseada, y de manera opcional vincularlo a un **`Proveedor`** (entidad relacional). El sistema MUST calcular automáticamente el precio de venta final a partir del costo real de adquisición resultante de la fórmula canónica de costeo y del margen de ganancia, manteniendo guardado este precio final en el catálogo.

En la unidad de negocio Herramientas, el vínculo de catálogo del producto SHALL ser su proveedor. El sistema SHALL NOT solicitar ni utilizar una `Marca` para los productos de esa unidad de negocio.

Al asignarle un proveedor a un producto que se está creando, el sistema SHALL copiar a los campos de costeo del producto los valores por defecto del perfil de costeo de ese proveedor, dejándolos editables antes de guardar.

#### Scenario: Registro exitoso con cálculo automático de precio y proveedor
- **WHEN** un usuario con permisos envía una solicitud para crear/editar un producto, definiendo `costoProducto = 1000`, un porcentaje de ganancia del `50%`, la unidad de negocio tiene un costo de envío del `10%`, y selecciona un `proveedorId = 5`
- **THEN** el sistema persiste el producto asociado al proveedor correspondiente, calcula el precio de venta aplicando el margen de ganancia sobre el costo real resultante de la fórmula canónica de costeo y guarda el producto

#### Scenario: Registro con los valores por defecto del proveedor
- **WHEN** un usuario crea un producto y le asigna un proveedor cuyo perfil de costeo tiene un descuento por defecto `"Proveedor" 30%`, IVA incluido en el precio y envío por defecto `5%`
- **THEN** el formulario del producto queda precargado con ese descuento, con IVA propio `0` y con envío propio `5%`, y el usuario puede modificar cualquiera de esos valores antes de guardar

#### Scenario: Producto sin proveedor
- **WHEN** un usuario crea un producto sin seleccionar proveedor
- **THEN** el sistema persiste el producto sin vínculo de catálogo, sin copiar ningún valor por defecto, y el producto queda fuera de todo filtro por proveedor

#### Scenario: Fallo por falta de permisos
- **WHEN** un usuario sin permisos envía una solicitud para crear un producto
- **THEN** el sistema devuelve un estado HTTP 403 Forbidden

## ADDED Requirements

### Requirement: Definición de Margen de Ganancia
El frontend SHALL permitir al usuario ingresar el margen de ganancia esperado (%) en el formulario de Producto, pre-calculando e informando visualmente en tiempo real el precio de venta que resultará antes de enviar el formulario. El costo sobre el que se pre-calcula SHALL obtenerse aplicando la misma fórmula canónica y el mismo orden de componentes que aplica el servidor, de modo que el valor mostrado antes de guardar coincida con el que el sistema persiste.

#### Scenario: Visualización interactiva de rentabilidad
- **WHEN** el usuario ingresa un costo de catálogo y tipea un margen de "40" en el campo `% Ganancia`
- **THEN** el formulario actualiza instantáneamente el valor del "Precio Final" para reflejar la fórmula, o ajusta el porcentaje si el usuario decide sobrescribir manualmente el Precio Final.

#### Scenario: El costo mostrado coincide con el costo persistido
- **WHEN** el usuario configura descuentos, IVA y envío en el formulario, observa el costo final informado y guarda el producto
- **THEN** el costo de adquisición que el sistema calcula al guardar coincide, al centavo, con el que el formulario había informado

### Requirement: Afectación de Stock Actual
El sistema SHALL actualizar el campo `stockActual` del producto de manera transaccional al realizar una venta o ajuste, y emitir un evento SSE a los clientes conectados para notificar la nueva cantidad.

#### Scenario: Venta confirmada actualiza stock y notifica
- **WHEN** se descuentan 5 unidades de un producto en una venta
- **THEN** el `stockActual` del producto disminuye en 5 de forma atómica junto a la creación del MovimientoStock, y se despacha un evento SSE con el nuevo stock hacia el frontend.

### Requirement: Recepción de Stock
El sistema SHALL permitir ingresar stock a los productos del catálogo mediante diferentes mecanismos.

#### Scenario: Ingreso desde Siembra finalizada
- **WHEN** el usuario procesa la finalización de un lote de siembra
- **THEN** el stock del producto seleccionado se incrementa de acuerdo a la cantidad cosechada de la siembra
- **AND** se registra un movimiento de stock de tipo `INGRESO_SIEMBRA` con referencia al lote de la siembra


### Requirement: Migración del Vínculo de Catálogo de Marca a Proveedor
El sistema SHALL convertir, una sola vez y de forma idempotente, el vínculo de catálogo de los productos existentes: por cada marca de la unidad de negocio Herramientas SHALL resolverse un proveedor de la misma unidad con el mismo nombre, reutilizándolo si ya existe y creándolo con perfil de costeo neutro si no existe, y cada producto vinculado a esa marca SHALL quedar vinculado a ese proveedor.

La conversión SHALL modificar **únicamente** el vínculo de catálogo. SHALL NOT modificar el costo de catálogo, los descuentos, el porcentaje de IVA, el porcentaje de envío, el precio de venta ni el porcentaje de ganancia de ningún producto. El costo unitario calculado de cada producto tras la conversión SHALL ser idéntico, al centavo, al que tenía antes.

La resolución del proveedor a partir de la marca SHALL hacerse por **coincidencia exacta del nombre normalizado** —sin espacios sobrantes al inicio o al final y sin distinguir mayúsculas de minúsculas— dentro de la misma unidad de negocio. El sistema SHALL NOT resolver la correspondencia por coincidencias parciales ni aproximadas.

Los productos sin marca SHALL quedar sin proveedor. El sistema SHALL NOT asignarles ningún proveedor por defecto, ni inferirlo del pedido que los originó. El usuario SHALL poder asignarles un proveedor manualmente desde el formulario de producto en cualquier momento posterior.

El vínculo anterior con la marca SHALL conservarse en la base de datos sin modificarse, y SHALL dejar de leerse y de escribirse en la unidad de negocio Herramientas.

#### Scenario: Marca con proveedor homónimo preexistente
- **WHEN** se ejecuta la conversión sobre una marca llamada `SHIMURA` para la que ya existe un proveedor llamado `SHIMURA` en la misma unidad de negocio
- **THEN** el sistema reutiliza el proveedor existente y no crea ninguno nuevo

#### Scenario: Marca sin proveedor homónimo
- **WHEN** se ejecuta la conversión sobre una marca llamada `INGCO` para la que no existe ningún proveedor con ese nombre
- **THEN** el sistema crea un proveedor llamado `INGCO` con perfil de costeo neutro y vincula a él los productos que tenían esa marca

#### Scenario: La conversión no altera ningún costo
- **WHEN** se ejecuta la conversión sobre un producto con costo de catálogo `15000.00`, un descuento del `1.20%` y envío heredado del `5%`
- **THEN** el producto queda vinculado a su proveedor y su costo unitario calculado es exactamente el mismo que antes de la conversión

#### Scenario: Producto sin marca queda sin proveedor
- **WHEN** se ejecuta la conversión sobre un producto que no tenía ninguna marca asignada
- **THEN** el producto queda sin proveedor y sin ningún cambio en sus campos de costeo

#### Scenario: Asignación manual posterior de un producto sin proveedor
- **WHEN** un usuario edita un producto que quedó sin proveedor tras la conversión y le asigna uno
- **THEN** el producto queda vinculado a ese proveedor y pasa a aparecer bajo él en el filtro del catálogo

#### Scenario: La conversión es idempotente
- **WHEN** se ejecuta la conversión dos veces consecutivas sobre el mismo conjunto de productos
- **THEN** no se crea ningún proveedor duplicado y ningún producto cambia de vínculo respecto de la primera ejecución

#### Scenario: Una unidad de negocio sin marcas no se ve afectada
- **WHEN** se ejecuta la conversión en un sistema cuya unidad de negocio Vivero no tiene ninguna marca ni ningún producto con marca
- **THEN** ningún producto de esa unidad de negocio se modifica y no se crea ningún proveedor para ella


### Requirement: Moneda del Precio de Lista del Producto
El sistema SHALL registrar, para cada producto, la moneda en la que está expresado su costo de catálogo, con el valor "pesos" por defecto. La moneda SHALL copiarse desde el perfil del proveedor al asignárselo y SHALL ser modificable por el usuario.

#### Scenario: Producto en dólares
- **WHEN** un usuario crea un producto de un proveedor que cotiza en moneda extranjera e indica que su costo de catálogo `66.24` está en dólares
- **THEN** el sistema persiste el producto con su costo de catálogo expresado en dólares

#### Scenario: Producto existente sin moneda declarada
- **WHEN** se consulta un producto creado antes de la introducción de la moneda
- **THEN** su costo de catálogo se interpreta como expresado en pesos
