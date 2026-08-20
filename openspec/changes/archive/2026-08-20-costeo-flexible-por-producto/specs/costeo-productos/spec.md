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
