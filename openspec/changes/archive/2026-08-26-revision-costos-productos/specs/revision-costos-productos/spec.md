## ADDED Requirements

### Requirement: Criterio de Detección de Costos Desalineados

El sistema MUST identificar como **costo desalineado** todo producto de la unidad de negocio activa cuyo `costoProducto` de ficha difiera del `costoBase` congelado en su último movimiento de stock de tipo `INGRESO` o `AJUSTE_INICIAL`.

El sistema MUST determinar "el último movimiento" ordenando por fecha descendente **y, ante fechas iguales, por identificador descendente**. El sistema SHALL NOT depender de un orden ambiguo cuando dos movimientos comparten el mismo instante.

El sistema MUST comparar `costoProducto` contra `costoBase` —los dos costos **base**, anteriores a descuentos, IVA y envío— y SHALL NOT comparar `costoProducto` contra el `costoUnitario` final del movimiento.

El sistema MUST comparar los importes **por valor numérico** y no por su escala decimal, de modo que dos importes iguales expresados con distinta cantidad de decimales no se reporten como una diferencia.

El sistema SHALL NOT aplicar ninguna tolerancia: una diferencia de un centavo MUST reportarse como diferencia.

El sistema MUST aplicar el criterio **con independencia del origen del movimiento**: un ingreso proveniente de la confirmación de un pedido a proveedor y un movimiento generado por una edición manual del producto se tratan exactamente igual.

De la lista resultante, el sistema MUST excluir los productos cuyo último ingreso ya fue descartado por el usuario, según el requisito *Acción de Descartar una Diferencia*.

#### Scenario: Diferencia generada por la confirmación de un pedido
- **WHEN** un producto tiene `costoProducto = 1972.00` en su ficha y su último `INGRESO` —generado al confirmar un pedido— tiene `costoBase = 2500.00`
- **THEN** el producto MUST aparecer en la lista de costos desalineados

#### Scenario: Diferencia generada por una edición manual de stock
- **WHEN** el último movimiento `AJUSTE_INICIAL` de un producto tiene un `costoBase` distinto del `costoProducto` actual de su ficha
- **THEN** el producto MUST aparecer en la lista, sin ninguna distinción respecto del caso anterior

#### Scenario: Producto alineado
- **WHEN** el `costoProducto` de la ficha coincide con el `costoBase` del último ingreso
- **THEN** el producto MUST NOT aparecer en la lista

#### Scenario: Igualdad con distinta escala decimal
- **WHEN** la ficha tiene `costoProducto = 15000.00` y el último ingreso tiene `costoBase = 15000.000`
- **THEN** el producto MUST NOT aparecer en la lista

#### Scenario: Diferencia de un centavo
- **WHEN** la ficha tiene `costoProducto = 15000.00` y el último ingreso tiene `costoBase = 15000.01`
- **THEN** el producto MUST aparecer en la lista

#### Scenario: Producto sin ningún ingreso registrado
- **WHEN** un producto no tiene ningún movimiento de tipo `INGRESO` ni `AJUSTE_INICIAL`
- **THEN** el producto MUST NOT aparecer en la lista, porque no existe un costo contra el cual comparar

#### Scenario: El último movimiento es una venta o un egreso
- **WHEN** el movimiento más reciente de un producto es de tipo `VENTA` o `EGRESO`, y el `INGRESO` anterior a él tiene el mismo `costoBase` que la ficha
- **THEN** el producto MUST NOT aparecer en la lista, porque sólo los movimientos de tipo `INGRESO` y `AJUSTE_INICIAL` cuentan como referencia de costo

#### Scenario: Ficha sin costo cargado y último ingreso con costo real
- **WHEN** un producto tiene `costoProducto` sin informar y su último ingreso tiene `costoBase = 10000.00`
- **THEN** el producto MUST aparecer en la lista, indicando que la ficha no tiene costo cargado

#### Scenario: Ambos lados sin costo real
- **WHEN** un producto tiene `costoProducto` sin informar y su último ingreso tiene `costoBase` en cero
- **THEN** el producto MUST NOT aparecer en la lista

### Requirement: Comparación de Costos Expresados en Moneda Extranjera

El sistema MUST comparar los dos costos **en la misma moneda**. Cuando el costo de catálogo del producto está expresado en moneda extranjera y el movimiento registró la conversión aplicada, el sistema MUST reconvertir el costo base del movimiento a la moneda del producto antes de compararlo, y MUST informar la cotización utilizada.

Cuando el costo de catálogo del producto está expresado en moneda extranjera pero el movimiento **no** registró ninguna conversión, el sistema MUST excluir a ese producto de la lista y SHALL NOT ofrecer ninguna acción sobre él, porque los dos importes no son comparables.

El sistema SHALL NOT escribir jamás en el costo de catálogo un importe expresado en una moneda distinta de la declarada para ese producto.

#### Scenario: Producto en pesos
- **WHEN** el costo de catálogo del producto está expresado en pesos
- **THEN** el sistema compara el costo de la ficha contra el costo base del movimiento de forma directa

#### Scenario: Producto en dólares con conversión registrada
- **WHEN** el costo de catálogo del producto está expresado en dólares con valor `66.24`, y su último ingreso tiene un costo base de `96710.40` con una cotización aplicada de `1460.0000`
- **THEN** el sistema compara `66.24` contra `66.24` (el costo base reconvertido a dólares), no reporta diferencia, e informa la cotización utilizada cuando muestra el producto

#### Scenario: Producto en dólares sin conversión registrada en el movimiento
- **WHEN** el costo de catálogo del producto está expresado en dólares y su último ingreso no registró moneda de origen ni cotización aplicada
- **THEN** el producto MUST NOT aparecer en la lista, y el sistema MUST dejar registro del caso para que sea diagnosticable

### Requirement: Información Expuesta por Cada Producto Desalineado

Por cada producto de la lista, el sistema MUST exponer: el nombre del producto, su proveedor cuando lo tenga, la fecha del último ingreso, el costo actual de la ficha, el costo del último ingreso, el precio de venta actual y el **precio de venta que resultaría** de aplicar el costo nuevo.

El sistema MUST exponer además el **costo unitario final** —el costo después de descuentos, IVA y envío— tanto el actual como el que resultaría de aplicar el costo nuevo, porque es el valor que explica la diferencia entre el precio actual y el precio resultante.

El sistema MUST exponer también la identidad del movimiento de ingreso que originó la fila, de modo que la acción de descartar pueda registrar exactamente cuál fue el ingreso revisado.

El sistema MUST calcular el precio resultante con **la misma fórmula y el mismo código** que utiliza la edición de un producto, de modo que el precio mostrado sea exactamente el que quedará persistido si el usuario aplica la actualización.

Cuando el producto no tiene margen de ganancia configurado, o el costo nuevo es cero, el sistema MUST informar como precio resultante el **mismo precio actual**, porque en ese caso la actualización no modifica el precio de venta.

#### Scenario: Contraste completo
- **WHEN** un producto desalineado tiene `costoProducto = 10000.00`, `porcentajeGanancia = 30`, `precio = 13000.00` y su último ingreso tiene `costoBase = 12000.00`
- **THEN** el sistema expone el costo actual, el costo del último ingreso, el precio actual y el precio resultante calculado sobre `12000.00` con el `30%` de ganancia y las condiciones de costeo propias del producto

#### Scenario: El precio previsualizado coincide con el persistido
- **WHEN** el usuario aplica la actualización sobre un producto cuyo precio resultante informado era `X`
- **THEN** el precio persistido del producto MUST ser exactamente `X`

#### Scenario: Costo unitario final expuesto junto al costo base
- **WHEN** el sistema expone un producto desalineado cuya ficha tiene descuentos, IVA o envío configurados
- **THEN** además del contraste de costos base, el sistema informa el costo unitario final actual y el costo unitario final resultante, calculados con las condiciones de costeo propias del producto

#### Scenario: Producto sin margen de ganancia configurado
- **WHEN** un producto desalineado no tiene porcentaje de ganancia configurado o lo tiene en cero
- **THEN** el precio resultante informado MUST ser igual al precio actual

#### Scenario: Producto sin proveedor
- **WHEN** un producto desalineado no tiene proveedor asignado
- **THEN** el sistema lo lista igualmente, informando que no tiene proveedor

### Requirement: Acción de Actualizar el Costo de la Ficha

El sistema MUST permitir aplicar, en una sola acción por producto, el costo del último ingreso al costo de catálogo del producto, recalculando su precio de venta con la fórmula estándar.

El sistema MUST ejecutar esa actualización a través del **mismo servicio de actualización de producto** que utiliza el formulario de producto, con la misma validación, el mismo control de permisos y el mismo registro de movimiento de stock. El sistema SHALL NOT introducir una ruta de escritura alternativa que modifique el costo o el precio por fuera de ese servicio.

La actualización MUST modificar **únicamente** el costo de catálogo y el precio de venta del producto. El sistema SHALL NOT modificar la lista de descuentos del producto, su IVA propio, su costo de envío propio, su margen de ganancia, su proveedor, su stock ni ningún otro dato de la ficha.

Tras aplicar la actualización, el producto MUST dejar de figurar en la lista de costos desalineados.

#### Scenario: Actualización exitosa
- **WHEN** el usuario aplica la actualización sobre un producto cuya ficha tiene `costoProducto = 10000.00` y cuyo último ingreso tiene `costoBase = 12000.00`
- **THEN** el `costoProducto` del producto pasa a `12000.00`, su precio se recalcula con la fórmula estándar, y el producto desaparece de la lista

#### Scenario: Ningún otro campo de la ficha se altera
- **WHEN** el usuario aplica la actualización sobre un producto con descuentos, IVA propio y envío propio cargados
- **THEN** su lista de descuentos, su IVA propio, su costo de envío propio, su margen de ganancia, su proveedor, su stock, su lote y su dueño MUST quedar exactamente iguales que antes de la acción

#### Scenario: Los descuentos congelados del movimiento no se copian a la ficha
- **WHEN** el último ingreso del producto congeló un descuento pactado distinto del que tiene la ficha, y el usuario aplica la actualización
- **THEN** el sistema copia únicamente el costo base y MUST NOT copiar a la ficha el descuento, el IVA ni el envío congelados en ese movimiento

#### Scenario: Usuario sin permiso de escritura
- **WHEN** un usuario sin permiso de escritura sobre el stock intenta aplicar la actualización
- **THEN** el sistema rechaza la operación, no modifica ningún dato, e informa la falta de permisos con el mecanismo de feedback estándar de la aplicación

### Requirement: Acción de Descartar una Diferencia

El sistema MUST permitir descartar la diferencia de un producto en una sola acción, sacándolo de la lista **sin modificar** su costo de catálogo, su precio ni ningún otro dato de negocio del producto.

El descarte MUST **persistir**: el sistema registra la **identidad del movimiento de ingreso ya revisado** y, mientras ése siga siendo el último ingreso del producto, el producto MUST NOT aparecer en la lista, aunque el usuario recargue la página o vuelva a entrar a la sección más tarde. El único dato que el sistema escribe al descartar es ese marcador de revisión.

Descartar SHALL NOT ser un estado permanente de "resuelto". Cuando se registre un ingreso **nuevo** —es decir, un movimiento de ingreso distinto del que fue revisado— y siga habiendo diferencia entre la ficha y el costo ingresado, el producto MUST volver a aparecer en la lista. Esto MUST ocurrir **aunque el ingreso nuevo llegue al mismo costo que ya se había descartado**: el descarte identifica al ingreso revisado, no al importe.

Cuando el producto se actualiza —desde la propia lista o desde el formulario de producto— el movimiento de stock resultante MUST pasar a ser el último ingreso, con lo cual el marcador de descarte queda sin efecto sin necesidad de ninguna limpieza explícita.

#### Scenario: Descartar no modifica ningún dato del producto
- **WHEN** el usuario descarta la diferencia de un producto
- **THEN** el `costoProducto`, el `precio`, los descuentos, el IVA propio, el envío propio, el margen, el proveedor y el stock del producto MUST quedar exactamente iguales que antes de la acción, y el producto sale de la lista

#### Scenario: El descarte sobrevive a la recarga
- **WHEN** el usuario descarta la diferencia de un producto y vuelve a consultar la lista más tarde, sin que se haya registrado ningún ingreso nuevo sobre ese producto
- **THEN** el producto MUST seguir sin aparecer en la lista

#### Scenario: Un ingreso nuevo reabre la diferencia
- **WHEN** el usuario descartó la diferencia de un producto y posteriormente se confirma un pedido que registra un ingreso nuevo a un costo distinto del de la ficha
- **THEN** el producto MUST volver a aparecer en la lista, con el costo del ingreso nuevo

#### Scenario: Un ingreso nuevo al mismo costo ya descartado también reabre la diferencia
- **WHEN** el usuario descartó la diferencia de un producto y posteriormente se registra un ingreso **nuevo** cuyo costo coincide con el del ingreso que ya había descartado
- **THEN** el producto MUST volver a aparecer en la lista, porque se trata de un ingreso distinto del revisado

#### Scenario: Actualizar deja el descarte sin efecto
- **WHEN** un producto con una diferencia descartada se actualiza y el movimiento resultante pasa a ser su último ingreso
- **THEN** el marcador de descarte MUST quedar sin efecto, sin requerir ninguna acción de limpieza

#### Scenario: Descartar y actualizar después
- **WHEN** el usuario descartó la diferencia de un producto y más tarde decide actualizarlo desde el formulario de producto
- **THEN** el sistema no impide ni condiciona esa edición de ninguna forma

#### Scenario: Usuario sin permiso de escritura
- **WHEN** un usuario sin permiso de escritura sobre el stock intenta descartar una diferencia
- **THEN** el sistema rechaza la operación, no registra ningún descarte, e informa la falta de permisos con el mecanismo de feedback estándar de la aplicación

### Requirement: Alcance por Unidad de Negocio

El sistema MUST acotar la revisión de costos a los productos de la **unidad de negocio activa**, con el mismo mecanismo de aislamiento que usa el resto del catálogo de productos. El sistema SHALL NOT exponer productos de otra unidad de negocio.

#### Scenario: Aislamiento entre unidades
- **WHEN** un usuario consulta la revisión de costos con una unidad de negocio activa
- **THEN** el sistema devuelve únicamente productos de esa unidad de negocio

#### Scenario: Unidad de negocio sin costos cargados
- **WHEN** la unidad de negocio activa es Vivero, cuyos productos no manejan costo de catálogo
- **THEN** la revisión de costos devuelve una lista vacía

### Requirement: Listado Acotado y Ordenado

El sistema MUST devolver la lista de productos desalineados **acotada por un límite explícito** y ordenada por fecha de ingreso descendente, de modo que los ingresos más recientes aparezcan primero. El sistema SHALL NOT devolver un listado sin límite.

Cuando la cantidad de productos desalineados supere el límite, el sistema MUST informar explícitamente que la lista está recortada.

#### Scenario: Orden por ingreso más reciente
- **WHEN** hay varios productos desalineados con fechas de ingreso distintas
- **THEN** el producto cuyo último ingreso es más reciente aparece primero

#### Scenario: Lista recortada por el límite
- **WHEN** la cantidad de productos desalineados supera el límite del listado
- **THEN** el sistema devuelve como máximo esa cantidad e informa que la lista está recortada

### Requirement: La Revisión de Costos No Altera el Circuito de Pedidos

La confirmación de recepción de un pedido a proveedor MUST seguir sin modificar el costo de catálogo ni el precio de venta del producto. La revisión de costos MUST ser el paso posterior, **explícito y disparado por el usuario**, que aplica ese cambio.

#### Scenario: La confirmación sigue sin tocar la ficha
- **WHEN** el usuario confirma la recepción de un pedido a un costo distinto del de la ficha del producto
- **THEN** el `costoProducto` y el `precio` del producto MUST quedar sin modificar, y el producto MUST pasar a figurar en la lista de costos desalineados
