## ADDED Requirements

### Requirement: Listado de Productos
El sistema MUST mostrar una tabla con todos los productos obtenidos de `GET /api/productos`, presentando nombre, descripción, precio, stock y acciones (editar, eliminar).

#### Scenario: Carga exitosa del listado
- **WHEN** el usuario navega a la ruta `/productos`
- **THEN** el sistema realiza una petición `GET /api/productos` con el JWT del store global y renderiza los resultados en una tabla ordenada

#### Scenario: Estado de carga
- **WHEN** la petición al backend está en curso
- **THEN** el sistema MUST mostrar un indicador de carga (spinner o skeleton) en lugar de la tabla

#### Scenario: Lista vacía
- **WHEN** el backend devuelve un arreglo vacío
- **THEN** el sistema MUST mostrar un mensaje amigable indicando que no hay productos y un botón para crear el primero

### Requirement: Creación de Producto
El sistema MUST permitir crear un nuevo producto a través de un formulario modal que envía un `POST /api/productos`.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa todos los campos obligatorios (nombre, precio, stock) y presiona "Guardar"
- **THEN** el sistema envía el `POST`, cierra el modal, muestra un mensaje de éxito y refresca la tabla

#### Scenario: Error de validación
- **WHEN** el usuario intenta guardar sin completar campos obligatorios
- **THEN** el sistema MUST mostrar mensajes de error en los campos faltantes sin enviar la petición

### Requirement: Edición de Producto
El sistema MUST permitir editar un producto existente a través del mismo formulario modal pre-cargado con los datos actuales, enviando un `PUT /api/productos/{id}`.

#### Scenario: Edición exitosa
- **WHEN** el usuario modifica los datos de un producto y presiona "Guardar"
- **THEN** el sistema envía el `PUT`, cierra el modal, muestra un mensaje de éxito y refresca la tabla con los datos actualizados

### Requirement: Eliminación de Producto
El sistema MUST permitir eliminar un producto enviando un `DELETE /api/productos/{id}`, requiriendo confirmación previa del usuario.

#### Scenario: Eliminación con confirmación
- **WHEN** el usuario presiona el botón "Eliminar" en un producto
- **THEN** el sistema MUST mostrar un diálogo de confirmación antes de ejecutar el `DELETE`

#### Scenario: Eliminación confirmada
- **WHEN** el usuario confirma la eliminación
- **THEN** el sistema envía el `DELETE`, muestra un mensaje de éxito y remueve el producto de la tabla

### Requirement: Manejo de Errores de API
El sistema MUST manejar errores HTTP del backend (403, 500, etc.) de forma amigable sin exponer detalles técnicos al usuario.

#### Scenario: Error 403 en operación de escritura
- **WHEN** el usuario intenta crear/editar/eliminar un producto y el backend devuelve 403 Forbidden
- **THEN** el sistema MUST mostrar un mensaje indicando que no tiene permisos suficientes

### Requirement: Filtrado por Marca en Herramientas
El sistema MUST permitir al usuario filtrar los productos en la sección de Stock (catálogo) según su marca cuando se encuentre en la unidad de negocio "Herramientas". 

#### Scenario: Visualización de filtros de marca
- **WHEN** el usuario navega a la sección de Stock y selecciona la unidad de negocio "Herramientas" (id 2)
- **THEN** el sistema MUST mostrar opciones (tabs o chips) con todas las marcas disponibles de los productos actuales, junto con una opción "Todas".

#### Scenario: Filtrado activo por marca
- **WHEN** el usuario hace click en una marca específica (ej. "TOTAL")
- **THEN** la grilla de productos se actualiza para mostrar únicamente aquellos productos que tienen esa marca exacta.

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


### Requirement: Filtrado por Marca en Herramientas`
- TO: `### Requirement: Filtrado por Proveedor en Herramientas
El sistema MUST permitir al usuario filtrar los productos en la sección de Stock (catálogo) según su **proveedor** cuando se encuentre en la unidad de negocio "Herramientas". El sistema SHALL ofrecer **un único filtro** de este tipo y SHALL NOT ofrecer simultáneamente un filtro por marca.

#### Scenario: Visualización de filtros de proveedor
- **WHEN** el usuario navega a la sección de Stock y selecciona la unidad de negocio "Herramientas" (id 2)
- **THEN** el sistema MUST mostrar opciones (tabs o chips) con todos los proveedores de los productos actuales, junto con una opción "Todos"

#### Scenario: Filtrado activo por proveedor
- **WHEN** el usuario hace click en un proveedor específico (ej. "INGCO")
- **THEN** la grilla de productos se actualiza para mostrar únicamente aquellos productos que tienen ese proveedor exacto

#### Scenario: Producto sin proveedor
- **WHEN** existen productos sin proveedor asignado y el usuario selecciona cualquier proveedor concreto
- **THEN** esos productos no aparecen bajo ningún proveedor, y sí aparecen al seleccionar la opción "Todos"

#### Scenario: No coexisten dos filtros equivalentes
- **WHEN** el usuario navega a la sección de Stock en la unidad de negocio "Herramientas"
- **THEN** el sistema no muestra ningún filtro por marca junto al filtro por proveedor

## ADDED Requirements


### Requirement: Proveedor en el Formulario de Producto
El sistema SHALL permitir seleccionar el proveedor de un producto desde el formulario de producto de la unidad de negocio Herramientas, y SHALL NOT solicitar una marca en esa unidad de negocio.

Al seleccionar un proveedor durante la creación de un producto, el formulario SHALL precargar visiblemente los valores de costeo por defecto de ese proveedor —descuentos, IVA, envío y moneda— dejándolos editables, y SHALL recalcular el desglose de costo y el precio de venta en vivo con esos valores.

El formulario SHALL indicar de forma visible que los valores precargados provienen del proveedor y que pueden modificarse.

#### Scenario: Selección de proveedor precarga los valores
- **WHEN** el usuario crea un producto en Herramientas y selecciona un proveedor con un descuento por defecto del `30%`, IVA incluido en el precio y envío por defecto del `5%`
- **THEN** el formulario muestra ese descuento en la lista de descuentos, el IVA propio en `0` y el envío propio en `5`, y actualiza el desglose de costo y el precio de venta en consecuencia

#### Scenario: El usuario modifica un valor precargado
- **WHEN** el usuario cambia el descuento precargado del `30%` al `35%` antes de guardar
- **THEN** el desglose de costo y el precio de venta se recalculan con el `35%` y el perfil del proveedor no se modifica

#### Scenario: Cambiar de proveedor en la edición de un producto existente
- **WHEN** el usuario edita un producto ya existente y le cambia el proveedor
- **THEN** el sistema no sobrescribe silenciosamente los valores de costeo ya cargados del producto, y ofrece explícitamente traer los valores del proveedor nuevo

#### Scenario: El formulario de Vivero no muestra proveedor
- **WHEN** el usuario abre el formulario de producto con la unidad de negocio Vivero activa
- **THEN** el formulario no muestra ni el selector de proveedor ni los campos de costeo


### Requirement: Moneda del Costo en el Formulario de Producto
El sistema SHALL permitir indicar en el formulario de producto si su costo de catálogo está expresado en pesos o en dólares, únicamente cuando el proveedor seleccionado está configurado como proveedor que cotiza en moneda extranjera.

Cuando el costo está expresado en dólares, el formulario SHALL indicarlo de forma inequívoca en el desglose de costo, para que el importe no se confunda con un importe en pesos.

#### Scenario: Selector de moneda visible sólo cuando corresponde
- **WHEN** el usuario selecciona un proveedor que no cotiza en moneda extranjera
- **THEN** el formulario no muestra ningún selector de moneda y el costo de catálogo se interpreta en pesos

#### Scenario: Costo en dólares señalizado
- **WHEN** el usuario indica que el costo de catálogo `66.24` está expresado en dólares
- **THEN** el desglose de costo del formulario indica explícitamente que ese importe está en dólares


### Requirement: Equivalencia entre Porcentaje y Multiplicador en los Campos de Descuento
El sistema SHALL mostrar, junto a cada campo de porcentaje de descuento del formulario de producto y del formulario de proveedor, la equivalencia como multiplicador del porcentaje ingresado, para permitir el contraste directo con las listas de precios del proveedor.

#### Scenario: Equivalencia visible al tipear
- **WHEN** el usuario ingresa `12.6` en un campo de porcentaje de descuento
- **THEN** el formulario muestra junto al campo la equivalencia `× 0.874`

#### Scenario: Campo de descuento vacío
- **WHEN** el campo de porcentaje de descuento está vacío
- **THEN** el formulario no muestra ninguna equivalencia
