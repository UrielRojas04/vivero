## ADDED Requirements

### Requirement: Capas de Costo de Stock

El sistema SHALL mantener, para cada producto de una unidad de negocio con costeo por capas habilitado, un conjunto de **capas de costo**. Cada capa SHALL representar una tanda de mercadería efectivamente ingresada, y SHALL registrar la **cantidad original** ingresada, la **cantidad restante** todavía en stock, el **costo unitario** congelado de esa compra y el **momento** de su ingreso.

Una capa SHALL crearse cuando, y sólo cuando, se registra un movimiento de stock **entrante** con una cantidad **mayor a cero**. Un movimiento entrante de cantidad cero SHALL NOT crear ninguna capa.

El **costo unitario** de una capa SHALL ser exactamente el costo unitario congelado en el movimiento que la originó, calculado con la fórmula canónica de la capability `costeo-productos`. El sistema SHALL NOT recalcular el costo de una capa después de creada, con independencia de cualquier cambio posterior en la configuración de costo del producto, de su proveedor o de su unidad de negocio.

Una capa SHALL registrarse como un dato **propio y separado del historial de movimientos de stock**. Cada capa SHALL conservar la referencia al movimiento de stock que la originó, de modo que el desglose completo del costo de esa compra —costo base, neto con descuentos, porcentaje de descuento efectivo, detalle legible de los descuentos, IVA, envío, moneda de origen y cotización aplicada— siga siendo consultable **sin duplicarse** en la capa.

El sistema SHALL NOT modificar ningún movimiento de stock ya registrado para llevar la cuenta de las unidades restantes de una capa: el historial de movimientos SHALL permanecer inmutable, tal como lo exige la capability `movimientos-stock`.

La **cantidad restante** SHALL ser el único dato mutable de una capa. El sistema SHALL NOT modificar la cantidad original, el costo unitario ni el momento de una capa ya creada.

Crear o consumir una capa SHALL NOT modificar por sí solo el campo de stock del producto: el stock SHALL seguir siendo responsabilidad de la operación que originó el movimiento.

Una capa SHALL considerarse **activa** mientras su cantidad restante sea mayor a cero, y **agotada** cuando llega a cero. Una capa agotada SHALL NOT volver a considerarse activa ni SHALL recibir unidades de un ingreso posterior: cada ingreso crea su propia capa.

#### Scenario: Un ingreso de mercadería crea su capa
- **WHEN** se registra un ingreso de `5` unidades de un producto cuyo costo unitario calculado para esa compra es `22822.80`
- **THEN** se crea una capa con cantidad original `5`, cantidad restante `5` y costo unitario `22822.80`, referenciando el movimiento de ingreso que la originó

#### Scenario: Consumir una capa no altera el movimiento que la originó
- **WHEN** se consumen `3` unidades de una capa creada por un ingreso de `5` unidades
- **THEN** la capa queda con `2` unidades restantes y el movimiento de ingreso que la originó conserva su cantidad, su desglose de costo y su momento exactamente como fueron registrados

#### Scenario: Dos compras a distinto costo son dos capas distintas
- **WHEN** se registra un ingreso de `5` unidades a un costo unitario de `22822.80` y, más tarde, otro ingreso de `1` unidad del mismo producto a un costo unitario de `15561.00`
- **THEN** el producto queda con dos capas separadas, una de `5` unidades a `22822.80` y otra de `1` unidad a `15561.00`, y ninguna de las dos altera el costo de la otra

#### Scenario: Un cambio de configuración de costo no crea capa
- **WHEN** se edita un producto cambiando su porcentaje de IVA, sus descuentos o su costo de catálogo, sin que varíe su stock, y el sistema registra el movimiento entrante de cantidad cero que corresponde a ese cambio
- **THEN** no se crea ninguna capa y ninguna capa existente cambia su costo unitario ni su cantidad restante

#### Scenario: El costo de una capa sobrevive a un cambio posterior de configuración
- **WHEN** existe una capa creada con costo unitario `22822.80` y después se modifica el IVA, los descuentos o el costo de catálogo del producto
- **THEN** la capa conserva su costo unitario `22822.80` sin ninguna modificación

#### Scenario: Un ingreso originado en un pedido a proveedor crea su capa con el costo pactado
- **WHEN** se confirma la recepción de un pedido a proveedor con una línea cuyo costo unitario pactado difiere del costo de catálogo del producto
- **THEN** la capa resultante toma como costo unitario el congelado en ese ingreso —el pactado, con los descuentos estables, el IVA, el envío y la conversión de moneda del producto aplicados encima— y no el costo de catálogo

#### Scenario: Dos líneas del mismo producto en un mismo pedido generan dos capas
- **WHEN** se confirma la recepción de un pedido que contiene dos líneas del mismo producto con costos unitarios pactados distintos
- **THEN** se crean dos capas separadas, cada una con su propio costo unitario, ordenadas de forma determinista entre sí

### Requirement: Costo de Referencia Igual al Máximo entre las Capas Activas

El sistema SHALL determinar el **costo de referencia** de un producto de una unidad de negocio con costeo por capas habilitado como el **mayor costo unitario entre todas sus capas activas**, es decir entre todas las capas del producto cuya cantidad restante es mayor a cero.

El costo de referencia SHALL NOT depender del orden de ingreso de las capas, ni de cuál capa se consumió primero, ni de cuál se va a consumir a continuación. Una capa recién ingresada más cara SHALL pasar a determinar el costo de referencia **de inmediato**, aunque las capas anteriores más baratas todavía conserven unidades. Una capa más vieja y más cara SHALL seguir determinando el costo de referencia mientras conserve al menos una unidad, aunque hayan ingresado después capas más baratas.

Cuando dos o más capas activas comparten el mismo costo unitario máximo, el sistema SHALL elegir de forma determinista **la más antigua** entre ellas, y en caso de compartir también el momento de ingreso, la creada primero. Esa capa SHALL denominarse **capa de referencia** del producto.

Cuando la capa de referencia se agota, el costo de referencia SHALL recalcularse sobre las capas que queden activas, y SHALL bajar si ninguna de ellas alcanza el valor anterior. El sistema SHALL NOT conservar como costo de referencia un valor que no corresponda al costo de ninguna unidad efectivamente en stock.

Cuando un producto no tenga ninguna capa activa, el costo de referencia SHALL resolverse con el mismo criterio que el sistema aplicaba antes de la introducción de las capas, sin inventar ningún valor nuevo.

El costo de referencia así definido SHALL ser **conservador por diseño**: nunca es menor que el costo de ninguna unidad en stock, y por lo tanto SHALL poder sobrestimar el costo real de las unidades que efectivamente se están vendiendo primero.

#### Scenario: Una compra más cara eleva el costo de referencia de inmediato
- **WHEN** un producto tiene una capa activa de `1` unidad a `21780.00` y se registra un ingreso posterior de `5` unidades a `25987.50`
- **THEN** el costo de referencia del producto pasa a ser `25987.50` de inmediato, aunque la unidad de `21780.00` siga sin venderse

#### Scenario: Una compra más barata no baja el costo de referencia
- **WHEN** un producto tiene una capa activa de `5` unidades a `22822.80` y se registra un ingreso posterior de `1` unidad a `15561.00`
- **THEN** el costo de referencia del producto sigue siendo `22822.80`

#### Scenario: El costo de referencia baja cuando se agota la capa más cara
- **WHEN** un producto tiene capas activas de `1` unidad a `25987.50` y `4` unidades a `21780.00`, y un egreso consume la unidad de `25987.50`
- **THEN** el costo de referencia del producto pasa a ser `21780.00`

#### Scenario: El costo de referencia no se queda pegado a una compra ya agotada
- **WHEN** todas las unidades de la capa más cara de un producto fueron vendidas y sólo quedan activas capas más baratas
- **THEN** el costo de referencia corresponde al mayor costo entre las capas que todavía tienen unidades, y no al de la capa agotada

#### Scenario: Empate de costo entre dos capas activas
- **WHEN** un producto tiene dos capas activas con el mismo costo unitario máximo, ingresadas en momentos distintos
- **THEN** la capa de referencia es la más antigua de las dos, y el resultado es el mismo en cualquier ejecución

#### Scenario: Un cambio de configuración de costo no mueve el costo de referencia del stock existente
- **WHEN** un producto tiene capas activas y se edita su porcentaje de IVA, sus descuentos o su costo de catálogo sin que varíe el stock
- **THEN** el costo de referencia del producto no cambia, y el cambio de configuración sólo afecta el costo de la próxima compra

#### Scenario: Producto sin capas activas
- **WHEN** se consulta el costo de referencia de un producto cuyo stock es cero y que no tiene ninguna capa con unidades restantes
- **THEN** el sistema devuelve el mismo valor que devolvía antes de la introducción de las capas, sin error y sin valor inventado

### Requirement: Consumo de Cantidades por Antigüedad

El sistema SHALL descontar las unidades de un egreso de las capas del producto empezando por la **más antigua con cantidad restante mayor a cero**, y SHALL pasar a la capa siguiente únicamente cuando la anterior queda en cero.

Este orden SHALL regir exclusivamente la **contabilidad de cantidades**: qué capa pierde unidades. El sistema SHALL NOT derivar de él el costo del egreso, que se determina según el requisito *Costo de un Egreso*.

El orden de las capas SHALL ser determinista y SHALL estar totalmente definido incluso cuando dos capas comparten el mismo momento de ingreso: en caso de empate, SHALL considerarse más antigua la capa creada primero.

Cuando un egreso abarca más unidades de las que restan en la capa más antigua, el sistema SHALL continuar descontando de las capas siguientes, en orden, hasta cubrir la cantidad total del egreso.

Todos los tipos de egreso de stock —venta, egreso por ajuste negativo y merma— SHALL descontar cantidades con exactamente la misma lógica. El sistema SHALL NOT eximir a ningún tipo de egreso.

El sistema SHALL NOT permitir que un egreso consuma más unidades de las que suman las cantidades restantes de todas las capas del producto, y ante ese intento SHALL NOT dejar ninguna capa parcialmente descontada.

#### Scenario: Un egreso que cabe en la capa más antigua
- **WHEN** un producto tiene una capa de `5` unidades restantes a `22822.80` y otra posterior de `2` unidades a `15561.00`, y se registra una venta de `3` unidades
- **THEN** se descuentan `3` unidades de la capa de `22822.80`, que queda con `2` unidades restantes, y la capa de `15561.00` queda intacta con `2` unidades

#### Scenario: Un egreso que agota la capa más antigua y sigue en la siguiente
- **WHEN** un producto tiene una capa de `5` unidades restantes a `22822.80` y otra posterior de `2` unidades a `15561.00`, y se registra una venta de `6` unidades
- **THEN** la capa de `22822.80` queda con `0` unidades restantes y la de `15561.00` queda con `1` unidad restante

#### Scenario: El orden de consumo no determina el costo
- **WHEN** un producto tiene una capa antigua de `1` unidad a `21780.00` y una capa posterior de `5` unidades a `25987.50`, y se vende `1` unidad
- **THEN** la unidad se descuenta de la capa de `21780.00`, que queda agotada, y sin embargo el costo registrado para esa venta es `25987.50`, el máximo entre las capas activas al momento del egreso

#### Scenario: Una merma descuenta capas igual que una venta
- **WHEN** se registra un movimiento de merma de `2` unidades sobre un producto cuya capa más antigua tiene `3` unidades restantes
- **THEN** se descuentan `2` unidades de esa capa, exactamente igual que si hubiera sido una venta

#### Scenario: Un ajuste negativo de stock descuenta capas
- **WHEN** se edita un producto reduciendo su stock en `1` unidad y el sistema registra el egreso correspondiente
- **THEN** se descuenta `1` unidad de la capa más antigua con cantidad restante mayor a cero

#### Scenario: Empate de momento de ingreso entre dos capas
- **WHEN** dos capas de un mismo producto fueron creadas en el mismo instante y se registra un egreso de `1` unidad
- **THEN** se descuenta de la capa creada primero, y el resultado es el mismo en cualquier ejecución

#### Scenario: Un egreso mayor al stock disponible se rechaza
- **WHEN** se intenta registrar un egreso de más unidades que la suma de las cantidades restantes de todas las capas del producto
- **THEN** la operación falla y ninguna capa queda modificada

### Requirement: Costo de un Egreso

El sistema SHALL asignar a **todo el egreso** un único costo unitario: el **costo de referencia del producto en el momento del egreso**, es decir el mayor costo unitario entre sus capas activas. El sistema SHALL NOT repartir el costo de un egreso entre varias capas, SHALL NOT promediar costos de capas distintas y SHALL NOT asignar a un egreso el costo de la capa de la que se descontaron las unidades cuando esa capa no es la de referencia.

El costo de referencia SHALL evaluarse **antes** de descontar las cantidades del egreso, de modo que un egreso que agota la capa de referencia siga registrándose al costo que el producto tenía cuando la operación comenzó.

El egreso SHALL registrarse como **un único movimiento de stock**, por la cantidad total del egreso, cualquiera sea el número de capas de las que se descontaron sus unidades. El sistema SHALL NOT fraccionar un egreso en varios movimientos por motivos de contabilidad de costos.

Ese movimiento SHALL congelar el **desglose completo del costo de la capa de referencia** —costo base, neto con descuentos, porcentaje de descuento efectivo, detalle legible de los descuentos, IVA y envío—, obtenido del movimiento de ingreso que originó esa capa.

Cuando un producto de una unidad con costeo por capas habilitado no tenga ninguna capa activa en el momento del egreso, el movimiento SHALL congelar su costo con el mismo criterio que el sistema aplicaba antes de la introducción de las capas.

#### Scenario: Un egreso que descuenta de dos capas registra un solo costo
- **WHEN** se venden `6` unidades de un producto cuya capa más antigua tiene `5` unidades restantes a `22822.80` y la siguiente tiene `1` unidad a `15561.00`
- **THEN** se registra un único movimiento de venta de `6` unidades con costo unitario `22822.80` —el máximo entre las capas activas— y las cantidades se descuentan `5` de la primera capa y `1` de la segunda

#### Scenario: El costo del egreso es el máximo, no el de la capa consumida
- **WHEN** se vende `1` unidad de un producto cuya capa más antigua tiene `1` unidad a `21780.00` y cuya capa siguiente tiene `5` unidades a `25987.50`
- **THEN** el movimiento de venta congela un costo unitario de `25987.50`, y no `21780.00`

#### Scenario: El desglose congelado es el de la capa de referencia
- **WHEN** se registra un egreso de un producto cuya capa de referencia fue originada por un ingreso con un descuento del `10%`, un IVA del `21%` y un envío del `5%`
- **THEN** el movimiento de egreso congela exactamente ese costo base, ese neto, ese porcentaje de descuento efectivo, ese detalle legible de descuentos, ese IVA y ese envío

#### Scenario: El costo se evalúa antes de descontar
- **WHEN** un egreso consume todas las unidades de la capa de referencia
- **THEN** el movimiento registra el costo de esa capa de referencia, y el nuevo costo de referencia —menor— rige recién para los egresos posteriores

#### Scenario: Egreso de un producto sin capas activas
- **WHEN** se registra un egreso de un producto de una unidad con costeo por capas habilitado que no tiene ninguna capa con unidades restantes
- **THEN** el movimiento congela su costo copiando el desglose del último movimiento entrante del producto, exactamente como antes de la introducción de las capas

### Requirement: Alcance del Costeo por Capas por Unidad de Negocio

El sistema SHALL habilitar el costeo por capas **por unidad de negocio**, mediante una configuración propia de la unidad y no mediante una identificación fija de una unidad concreta en la lógica de negocio.

En una unidad de negocio con el costeo por capas **deshabilitado**, el sistema SHALL NOT crear capas, SHALL NOT consumir capas, y SHALL determinar el costo de un egreso y el costo de referencia de un producto **exactamente igual que antes de la introducción de las capas**, produciendo los mismos valores, incluida la ausencia de valor cuando el criterio anterior no producía ninguno.

Habilitar o deshabilitar el costeo por capas de una unidad de negocio SHALL NOT requerir cambios de código.

#### Scenario: Una unidad sin costeo por capas conserva su comportamiento exacto
- **WHEN** se registra un egreso de un producto de una unidad de negocio con el costeo por capas deshabilitado
- **THEN** el movimiento congela su costo copiando el desglose del último ingreso del producto, exactamente como antes, y no se crea ni se consume ninguna capa

#### Scenario: El costo de referencia de una unidad sin costeo por capas no cambia de valor
- **WHEN** se consulta el costo de referencia de los productos de una unidad de negocio con el costeo por capas deshabilitado, antes y después de introducir las capas
- **THEN** cada producto devuelve exactamente el mismo valor en los dos momentos, incluidos los productos cuyo costo de referencia era inexistente

#### Scenario: Deshabilitar el costeo por capas restituye el comportamiento anterior
- **WHEN** se deshabilita el costeo por capas de una unidad de negocio que lo tenía habilitado
- **THEN** los egresos posteriores vuelven a congelar su costo con el criterio anterior, sin necesidad de modificar ni desplegar código

### Requirement: Inicialización de las Capas del Stock Existente

El sistema SHALL inicializar las capas de la mercadería que ya estaba en stock antes de la introducción del costeo por capas, **reconstruyéndolas a partir del historial real de movimientos** del producto: recorriendo sus movimientos en orden cronológico, creando una capa por cada movimiento entrante con cantidad mayor a cero y descontando cantidades de las capas más antiguas en cada movimiento saliente.

La reconstrucción SHALL usar el orden de antigüedad para descontar cantidades, sin necesidad de reconstruir el costo que cada egreso histórico registró: los costos ya congelados en los movimientos y en los detalles de venta existentes SHALL quedar intactos.

La inicialización SHALL verificar, producto por producto, que la suma de las cantidades restantes de las capas resultantes **coincide con el stock actual** del producto.

Cuando la reconstrucción de un producto no coincida con su stock actual, el sistema SHALL NOT escribir capas reconstruidas para ese producto: SHALL crear en su lugar una **única capa de apertura** con el stock actual y el costo de referencia vigente, y SHALL informar explícitamente ese producto como excepción. Esa capa de apertura SHALL entenderse como una **aproximación**, no como una reconstrucción del historial real de compras.

La inicialización SHALL ser **idempotente**: ejecutarla más de una vez SHALL NOT crear capas duplicadas ni alterar las capas ya existentes.

La inicialización SHALL NOT modificar ningún movimiento de stock, ningún detalle de venta ya registrado, ningún stock de producto, ningún costo de catálogo y ningún precio de venta.

#### Scenario: Reconstrucción exacta de un producto con historial completo
- **WHEN** se inicializan las capas de un producto cuyo historial registra un ingreso de `4` unidades a `14820.00`, dos ventas de `2` y `1` unidad, un ingreso de `5` unidades a `22822.80`, un ingreso de `1` unidad a `15561.00` y un egreso de `1` unidad, con stock actual `6`
- **THEN** el producto queda con las capas `5` unidades a `22822.80` y `1` unidad a `15561.00`, la capa inicial queda agotada, la suma de restantes es `6` y su costo de referencia pasa a ser `22822.80`

#### Scenario: Reconstrucción de un producto cuya capa más cara es la más nueva
- **WHEN** se inicializan las capas de un producto cuyo historial registra un ingreso de `2` unidades a `21780.00`, una venta de `1` unidad y un ingreso posterior de `5` unidades a `25987.50`, con stock actual `6`
- **THEN** el producto queda con las capas `1` unidad a `21780.00` y `5` unidades a `25987.50`, la suma de restantes es `6` y su costo de referencia pasa a ser `25987.50`

#### Scenario: Los movimientos de cantidad cero se ignoran en la reconstrucción
- **WHEN** se inicializan las capas de un producto cuyo historial incluye movimientos entrantes de cantidad cero registrados por cambios de configuración de costo
- **THEN** esos movimientos no generan ninguna capa y no alteran el costo de ninguna capa reconstruida

#### Scenario: Producto cuyo historial no reconcilia con su stock
- **WHEN** se inicializan las capas de un producto cuya reconstrucción arroja una suma de cantidades restantes distinta de su stock actual
- **THEN** ese producto recibe una única capa de apertura con su stock actual y su costo de referencia vigente, y queda informado explícitamente como excepción de la inicialización

#### Scenario: Producto sin stock
- **WHEN** se inicializan las capas de un producto cuyo stock actual es cero
- **THEN** el producto queda sin ninguna capa con cantidad restante mayor a cero, y su costo de referencia sigue siendo el que tenía

#### Scenario: La inicialización es idempotente
- **WHEN** se ejecuta la inicialización dos veces consecutivas sobre el mismo conjunto de productos
- **THEN** cada producto conserva exactamente las mismas capas que tras la primera ejecución, sin duplicados

#### Scenario: La inicialización no altera ninguna venta ya registrada
- **WHEN** se ejecuta la inicialización sobre productos que ya tienen ventas registradas
- **THEN** el costo unitario, el costo base y el precio congelados en cada detalle de venta existente quedan exactamente como estaban
