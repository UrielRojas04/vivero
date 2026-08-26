## ADDED Requirements

### Requirement: Componentes del Costo de Adquisición
El sistema SHALL determinar el costo de adquisición de un producto a partir de exactamente cuatro componentes: un **costo base**, una **lista de descuentos**, un **porcentaje de IVA** y un **porcentaje de costo de envío**.

El **costo base** SHALL ser el costo unitario explícito de la operación cuando la operación lo provee (por ejemplo, el costo pactado en el ítem de un pedido a proveedor) y, en caso contrario, el costo de catálogo configurado en el producto.

La **lista de descuentos** SHALL pertenecer al producto y SHALL admitir cero, uno o varios descuentos. Cada descuento SHALL tener un nombre no vacío y un porcentaje mayor o igual a cero.

La lista de descuentos del producto SHALL representar únicamente **condiciones de descuento estables**, es decir, las que se aplican en toda compra de ese producto. Los descuentos que varían de una compra a otra —por ejemplo, un descuento por la forma de pago elegida en esa compra— SHALL NOT modelarse como descuentos del producto: SHALL quedar reflejados en el **costo base explícito** que la operación provee. El sistema SHALL NOT ofrecer descuentos a nivel de la operación de compra.

El **porcentaje de IVA** SHALL integrar el costo de adquisición como costo real, y SHALL NOT tratarse como un dato informativo ajeno al costo ni como un crédito fiscal recuperable.

El **porcentaje de IVA** y el **porcentaje de costo de envío** SHALL poder configurarse en el producto y SHALL admitir el valor "sin configurar", que SHALL resolverse tomando el valor por defecto de la unidad de negocio del producto. Un valor de cero configurado en el producto SHALL ser distinto de "sin configurar": SHALL significar que ese producto no aplica ese componente, con independencia del valor por defecto de la unidad de negocio.

#### Scenario: Producto sin valores propios hereda los de la unidad de negocio
- **WHEN** se calcula el costo de un producto cuyo porcentaje de IVA y cuyo porcentaje de envío no están configurados, en una unidad de negocio con IVA por defecto `0%` y envío por defecto `5%`
- **THEN** el cálculo aplica IVA `0%` y envío `5%`

#### Scenario: Producto con envío propio ignora el de la unidad de negocio
- **WHEN** se calcula el costo de un producto con envío propio configurado en `12%`, en una unidad de negocio con envío por defecto `5%`
- **THEN** el cálculo aplica envío `12%`

#### Scenario: Cero configurado no es lo mismo que sin configurar
- **WHEN** se calcula el costo de un producto con envío propio configurado explícitamente en `0%`, en una unidad de negocio con envío por defecto `5%`
- **THEN** el cálculo aplica envío `0%` y no `5%`

#### Scenario: Producto sin descuentos
- **WHEN** se calcula el costo de un producto que no tiene ningún descuento cargado
- **THEN** el cálculo no aplica ninguna reducción sobre el costo base por concepto de descuentos

#### Scenario: Un descuento que varía compra a compra se refleja en el costo base
- **WHEN** se calcula el costo de un ingreso originado en una operación de compra que provee un costo unitario explícito ya rebajado por un descuento puntual de esa compra, para un producto que tiene además un descuento estable del `10%`
- **THEN** el cálculo toma ese costo explícito como costo base y le aplica encima únicamente el descuento estable del `10%`, sin ninguna reducción adicional por el descuento puntual

#### Scenario: El IVA integra el costo de adquisición
- **WHEN** se calcula el costo de un producto con costo base `10000.00`, un descuento del `10%` y otro del `5%`, IVA `21%` y envío `0%`
- **THEN** el costo unitario es `10345.50`, es decir, el monto de IVA queda **incluido** en el costo y no se informa aparte como un valor que no lo integra

### Requirement: Orden de Aplicación de la Fórmula de Costo
El sistema SHALL aplicar los componentes del costo en este orden y no en otro:

1. Partir del **costo base**.
2. Aplicar **todos los descuentos en cascada**, cada uno sobre el resultado del anterior, obteniendo el **neto con descuentos**.
3. Calcular el **monto de IVA** como el porcentaje de IVA sobre el **neto con descuentos**.
4. Calcular el **monto de envío** como el porcentaje de envío sobre el **neto con descuentos**.
5. Obtener el **costo unitario** como la suma del neto con descuentos, el monto de IVA y el monto de envío.

Los descuentos SHALL aplicarse **en cascada**, cada uno sobre el resultado del anterior. El sistema SHALL NOT combinarlos sumando sus porcentajes, y SHALL NOT ofrecer la suma de porcentajes como modo alternativo de cálculo.

El monto de IVA y el monto de envío SHALL calcularse ambos sobre el neto con descuentos, y no uno sobre el resultado del otro. El monto de IVA SHALL sumarse al costo unitario.

Como consecuencia directa de este orden, cuando el porcentaje de IVA es cero el costo unitario resultante SHALL ser idéntico al que producía el sistema antes de la introducción del IVA.

#### Scenario: Cálculo completo con dos descuentos, IVA y envío
- **WHEN** se calcula el costo de un producto con costo base `10000.00`, descuentos de `10%` ("Proveedor") y `5%` ("Volumen"), IVA `21%` y envío `5%`
- **THEN** el neto con descuentos es `8550.00`, el monto de IVA es `1795.50`, el monto de envío es `427.50` y el costo unitario es `10773.00`

#### Scenario: Los descuentos se combinan en cascada y no sumando sus porcentajes
- **WHEN** se calcula el costo de un producto con costo base `10000.00` y descuentos de `10%` y `5%`, sin IVA ni envío
- **THEN** el costo unitario es `8550.00` y no `8500.00`

#### Scenario: El orden de carga de los descuentos no altera el resultado
- **WHEN** se calcula el costo de un producto con descuentos de `10%` y `5%`, y luego se recalcula con los mismos descuentos cargados en el orden inverso
- **THEN** ambos cálculos producen el mismo costo unitario

#### Scenario: Compatibilidad con el costeo previo a la introducción del IVA
- **WHEN** se calcula el costo de un producto con costo base `5000.00`, un único descuento de `1%`, IVA `0%` y envío `5%`
- **THEN** el costo unitario es `5197.50`, el mismo valor que producía la fórmula anterior a este cambio

#### Scenario: El envío no se incrementa al activar el IVA
- **WHEN** se calcula el costo de un producto con neto con descuentos `8550.00` y envío `5%`, primero con IVA `0%` y luego con IVA `21%`
- **THEN** el monto de envío es `427.50` en ambos casos

### Requirement: Redondeo del Costo
El sistema SHALL calcular los valores intermedios de la fórmula con precisión suficiente para que la acumulación de redondeos no altere el resultado, y SHALL redondear a dos decimales con criterio de medio hacia arriba únicamente los valores que persiste o presenta.

El costo unitario resultante para un producto con un solo descuento y sin IVA SHALL coincidir, al centavo, con el que el sistema calculaba antes de este cambio.

#### Scenario: Costo unitario expresado en dos decimales
- **WHEN** se calcula el costo de un producto cuya fórmula produce un valor con más de dos decimales
- **THEN** el costo unitario persistido y presentado tiene exactamente dos decimales

#### Scenario: No hay regresión de centavos frente al costeo anterior
- **WHEN** se recalcula el costo de un producto que antes de este cambio tenía un costo unitario congelado de `2083.20`, con la misma configuración de costo base, descuento y envío, e IVA `0%`
- **THEN** el costo unitario resultante es `2083.20`

### Requirement: Definición Única de la Fórmula
El sistema SHALL implementar la fórmula de costo una sola vez por cada lado de la aplicación (servidor y cliente), y todos los consumidores SHALL obtener el costo a través de esa implementación.

En el servidor, el cálculo del costo unitario de un movimiento de stock y el cálculo del precio de venta a partir del costo SHALL usar la misma implementación, y ninguno SHALL contener aritmética propia de costeo.

El cálculo SHALL exponer, además del costo unitario, el desglose intermedio: el neto con descuentos, el monto de IVA, el monto de envío y el porcentaje de descuento efectivo equivalente a la cascada aplicada.

#### Scenario: El precio de venta se deriva del mismo costo que se congela
- **WHEN** se edita un producto con porcentaje de ganancia configurado y se guarda, generando además un movimiento de stock
- **THEN** el costo sobre el que se calcula el precio de venta y el costo unitario congelado en el movimiento provienen del mismo cálculo y coinciden

#### Scenario: El desglose acompaña al total
- **WHEN** se solicita el costo de un producto con descuentos, IVA y envío configurados
- **THEN** el resultado incluye el neto con descuentos, el monto de IVA, el monto de envío y el porcentaje de descuento efectivo, además del costo unitario

### Requirement: Valores por Defecto de la Unidad de Negocio
El sistema SHALL permitir configurar, por unidad de negocio, un porcentaje de IVA por defecto y un porcentaje de costo de envío por defecto, aplicables a los productos de esa unidad que no tengan un valor propio.

El porcentaje de IVA por defecto SHALL inicializarse en cero para las unidades de negocio existentes, de modo que la introducción de este componente no altere el costo de ningún producto hasta que el valor se configure explícitamente.

Cambiar un valor por defecto de la unidad de negocio SHALL afectar el costo de los movimientos de stock posteriores, y SHALL NOT modificar por sí solo el precio de venta ya persistido de los productos existentes.

#### Scenario: IVA por defecto inicial no altera ningún costo
- **WHEN** el sistema arranca por primera vez con el componente de IVA disponible y sin que nadie lo haya configurado
- **THEN** el porcentaje de IVA por defecto de cada unidad de negocio es `0%` y el costo unitario de todos los productos es el mismo que antes

#### Scenario: Cambio del envío por defecto afecta ingresos futuros
- **WHEN** se cambia el costo de envío por defecto de una unidad de negocio y luego se registra un ingreso de stock de un producto sin envío propio
- **THEN** el costo unitario congelado en ese ingreso usa el porcentaje de envío nuevo

### Requirement: Migración del Descuento Único Existente
El sistema SHALL convertir el descuento de proveedor configurado en cada producto existente en el primer descuento de su lista de descuentos, conservando su porcentaje, y SHALL dejar de considerar el campo anterior en el cálculo del costo.

La conversión SHALL ser idempotente: ejecutarla más de una vez SHALL NOT duplicar descuentos. Los productos cuyo descuento anterior sea nulo o cero SHALL NOT recibir ningún descuento.

Ningún descuento SHALL aplicarse más de una vez sobre el mismo costo base.

#### Scenario: Producto con descuento previo queda con un único descuento equivalente
- **WHEN** se ejecuta la conversión sobre un producto que tenía un descuento de proveedor de `1%`
- **THEN** el producto queda con exactamente un descuento de `1%` y su costo unitario calculado es idéntico al que tenía antes de la conversión

#### Scenario: La conversión es idempotente
- **WHEN** se ejecuta la conversión dos veces consecutivas sobre el mismo conjunto de productos
- **THEN** cada producto conserva la misma cantidad de descuentos que tras la primera ejecución

#### Scenario: Producto sin descuento previo no recibe descuentos
- **WHEN** se ejecuta la conversión sobre un producto cuyo descuento de proveedor era cero o no estaba definido
- **THEN** el producto queda sin ningún descuento en su lista


### Requirement: Conversión de Moneda como Primer Paso de la Cadena de Costo
El sistema SHALL anteponer a la cadena de cálculo del costo de adquisición un paso de **conversión de moneda**, previo a la aplicación de los descuentos, del IVA y del costo de envío.

Cuando la operación está expresada en moneda extranjera, el **costo base** SHALL ser el importe en moneda extranjera multiplicado por la cotización informada para esa operación. Cuando la operación está expresada en pesos, el costo base SHALL ser el importe tal cual, sin ninguna transformación.

La cadena resultante SHALL ser, en este orden y no en otro:

0. Obtener el **costo base en pesos**: el importe en moneda extranjera multiplicado por la cotización, o el importe en pesos sin transformar.
1. Aplicar **todos los descuentos en cascada** sobre el costo base en pesos, obteniendo el **neto con descuentos**.
2. Calcular el **monto de IVA** como el porcentaje de IVA sobre el neto con descuentos.
3. Calcular el **monto de envío** como el porcentaje de envío sobre el neto con descuentos **más el monto de IVA** (el envío se aplica en cadena sobre el resultado de aplicar el IVA, no en paralelo sobre el mismo neto).
4. Obtener el **costo unitario** como la suma del neto con descuentos, el monto de IVA y el monto de envío — equivalente a `neto × (1 + IVA%) × (1 + envío%)`.

> **Nota (corregida 2026-08-22):** los pasos 2-4 originalmente calculaban el monto de envío sobre el mismo neto que el IVA y sumaban ambos en paralelo (`neto + neto×IVA% + neto×envío%`). Se corrigió tras verificar contra la planilla real del proveedor Shimura (fila "escalera shimura aluminio 4.70m"): la planilla calcula `precio × (1+IVA%) × (1+envío%)`, en cadena. La fórmula en paralelo pierde el término cruzado `neto × IVA% × envío%`, invisible mientras el IVA fue siempre `0%` (caso Ingco/Extra Power/Duroll) pero real en cuanto IVA y envío son ambos distintos de cero (caso Shimura).

Los pasos 1 a 4 SHALL permanecer exactamente como estaban definidos antes de este cambio. Como consecuencia directa, cuando la operación está expresada en pesos el costo unitario resultante SHALL ser idéntico al que producía el sistema antes de la introducción de la moneda.

#### Scenario: Cadena completa con conversión de moneda
- **WHEN** se calcula el costo de una operación de `66.24` dólares con cotización `1460`, sin descuentos, IVA `0%` y envío `5%`
- **THEN** el costo base en pesos es `96710.40`, el neto con descuentos es `96710.40`, el monto de envío es `4835.52` y el costo unitario es `101545.92`

#### Scenario: La conversión precede a los descuentos
- **WHEN** se calcula el costo de una operación de `100.00` dólares con cotización `1000`, con un descuento del `10%`
- **THEN** el neto con descuentos es `90000.00`, es decir, el descuento se aplica sobre el importe ya convertido y no sobre el importe en dólares

#### Scenario: Operación en pesos sin cambios de resultado
- **WHEN** se calcula el costo de una operación en pesos con costo base `5000.00`, un único descuento del `1%`, IVA `0%` y envío `5%`
- **THEN** el costo unitario es `5197.50`, el mismo valor que producía la fórmula anterior a la introducción de la moneda

#### Scenario: Cotización uno es la identidad
- **WHEN** se calcula el costo de una operación con una cotización igual a `1`
- **THEN** el costo base en pesos es idéntico al importe original y el costo unitario coincide con el de la misma operación expresada en pesos


### Requirement: Precisión de la Conversión de Moneda
El sistema SHALL realizar la conversión de moneda dentro de la misma precisión intermedia con la que calcula el resto de la cadena, y SHALL NOT redondear el costo base convertido antes de continuar con los pasos siguientes.

#### Scenario: Sin redondeo intermedio tras la conversión
- **WHEN** se calcula el costo de una operación en moneda extranjera cuyo importe convertido tiene más de dos decimales, con descuentos, IVA y envío configurados
- **THEN** el costo unitario resultante se obtiene sin haber redondeado el importe convertido a dos decimales en un paso previo


### Requirement: El Proveedor como Origen de los Valores de Costeo
El sistema SHALL permitir que los componentes del costo de un producto —su lista de descuentos, su porcentaje de IVA y su porcentaje de costo de envío— se originen en el perfil de costeo de su proveedor, **copiándolos** al producto en el momento en que se establece la relación.

El proveedor SHALL NOT participar en la resolución del IVA ni del envío efectivos en el momento del cálculo. La resolución SHALL seguir teniendo exactamente dos niveles: el valor propio del producto y, cuando el producto no tiene valor propio, el valor por defecto de su unidad de negocio.

Cuando el proveedor factura con el IVA ya incluido en su precio de lista, el porcentaje de IVA copiado al producto SHALL ser **cero de forma explícita**, y SHALL NOT quedar "sin configurar".

#### Scenario: El cálculo no consulta al proveedor
- **WHEN** se calcula el costo de un producto sin IVA propio ni envío propio, cuyo proveedor tiene un IVA por defecto del `21%` y un envío por defecto del `8%`, en una unidad de negocio con IVA por defecto `0%` y envío por defecto `5%`
- **THEN** el cálculo aplica IVA `0%` y envío `5%`, es decir, los valores de la unidad de negocio y no los del proveedor

#### Scenario: IVA incluido en el precio no se vuelve a sumar
- **WHEN** se calcula el costo de un producto de un proveedor que factura con IVA incluido, con costo base `15000.00`, un descuento del `1.20%` y envío `5%`, en una unidad de negocio cuyo IVA por defecto es `21%`
- **THEN** el monto de IVA del cálculo es `0.00` y el costo unitario no contiene ningún importe de IVA


### Requirement: Costo de Referencia de un Producto

El sistema SHALL exponer, para cada producto, un **costo de referencia**: el costo unitario que representa lo que le cuesta al negocio la mercadería de ese producto que tiene disponible para vender.

El costo de referencia SHALL resolverse según el modo de costeo de la unidad de negocio del producto:

- En una unidad con **costeo por capas habilitado**, SHALL ser el **mayor costo unitario entre las capas activas** del producto, tal como lo define la capability `costeo-por-capas`. Cuando el producto no tenga ninguna capa con unidades restantes, SHALL resolverse con el criterio de la unidad sin costeo por capas.
- En una unidad con **costeo por capas deshabilitado**, SHALL ser el costo unitario congelado en el **último movimiento entrante** del producto y, a falta de movimientos entrantes, el costo de catálogo configurado en el producto. Cuando el producto no tenga ni movimientos entrantes ni costo de catálogo, el costo de referencia SHALL quedar **sin valor**, y el sistema SHALL NOT sustituirlo por cero.

El costo de referencia SHALL calcularse a partir de datos ya congelados y SHALL NOT recalcular la fórmula de costo en el momento de la consulta.

El costo de referencia SHALL NOT ser un componente del cálculo de costo: los cuatro componentes definidos por esta capability —costo base, lista de descuentos, IVA y envío— y su orden de aplicación SHALL permanecer exactamente como están definidos, y SHALL seguir usándose sin ninguna modificación para calcular el costo de cada compra.

Consultar el costo de referencia de todos los productos de una unidad de negocio SHALL NOT emitir una consulta a la base de datos por producto.

#### Scenario: Costo de referencia con costeo por capas habilitado
- **WHEN** se consulta el costo de referencia de un producto de una unidad con costeo por capas habilitado, que tiene una capa activa de `1` unidad a `21780.00` y otra posterior de `5` unidades a `25987.50`
- **THEN** el costo de referencia es `25987.50`

#### Scenario: El costo de referencia no lo determina la capa más antigua
- **WHEN** se consulta el costo de referencia de un producto de una unidad con costeo por capas habilitado cuya capa más antigua, todavía con unidades, es más barata que una capa posterior
- **THEN** el costo de referencia es el de la capa más cara, no el de la más antigua

#### Scenario: Costo de referencia con costeo por capas deshabilitado
- **WHEN** se consulta el costo de referencia de un producto de una unidad con costeo por capas deshabilitado
- **THEN** el costo de referencia es el costo unitario congelado en su último movimiento entrante, exactamente el mismo valor que el sistema devolvía antes de la introducción del costeo por capas

#### Scenario: Producto sin movimientos ni costo de catálogo
- **WHEN** se consulta el costo de referencia de un producto que no tiene ningún movimiento entrante ni costo de catálogo configurado
- **THEN** el costo de referencia queda sin valor, y no se devuelve cero

#### Scenario: Producto con costeo por capas habilitado y sin capas activas
- **WHEN** se consulta el costo de referencia de un producto de una unidad con costeo por capas habilitado cuyo stock es cero y que no tiene ninguna capa con unidades restantes
- **THEN** el costo de referencia es el mismo que devolvería si la unidad tuviera el costeo por capas deshabilitado

#### Scenario: La fórmula de costo no se altera
- **WHEN** se calcula el costo de una compra de un producto de una unidad con costeo por capas habilitado, con costo base `10000.00`, descuentos de `10%` y `5%`, IVA `21%` y envío `5%`
- **THEN** el resultado es `10862.78`, idéntico al que produce la fórmula en una unidad sin costeo por capas

> **Nota (corregida 2026-08-22):** el resultado de este escenario era `10773.00` bajo la fórmula anterior, que sumaba el monto de IVA y el monto de envío en paralelo sobre el mismo neto. Se corrigió a `10862.78` (envío en cadena sobre neto+IVA, equivalente a `neto × (1+IVA%) × (1+envío%)`) tras verificar contra la planilla real del proveedor Shimura. Esta capability no toca la fórmula de costo — el cambio de número es sólo para reflejar la corrección hecha en `CostoCalculator.java`, no una modificación de esta capability.

#### Scenario: El listado de productos no degrada
- **WHEN** se solicita el listado completo de productos de una unidad de negocio con costeo por capas habilitado
- **THEN** el costo de referencia de cada producto se obtiene sin emitir una consulta adicional por producto
