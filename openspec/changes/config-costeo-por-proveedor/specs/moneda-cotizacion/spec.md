## ADDED Requirements

### Requirement: Moneda del Precio de Lista
El sistema SHALL permitir expresar el precio de lista de un producto en pesos o en dólares estadounidenses. La moneda SHALL ser una propiedad del producto y SHALL tener el valor "pesos" por defecto.

El sistema SHALL ofrecer la opción de moneda extranjera únicamente para los productos cuyo proveedor está configurado como proveedor que cotiza en moneda extranjera. Para el resto, el sistema SHALL tratar el precio de lista como pesos sin preguntar.

El sistema SHALL NOT admitir ninguna moneda distinta de pesos y dólares estadounidenses.

#### Scenario: Producto en pesos por defecto
- **WHEN** se crea un producto sin indicar moneda
- **THEN** el precio de lista del producto queda expresado en pesos

#### Scenario: Producto en dólares
- **WHEN** se crea un producto de un proveedor que cotiza en moneda extranjera, indicando que su precio de lista está en dólares y vale `66.24`
- **THEN** el producto queda con su precio de lista en dólares y el sistema no lo interpreta como un importe en pesos

#### Scenario: Proveedor que no cotiza en moneda extranjera
- **WHEN** se crea un producto de un proveedor configurado como proveedor que no cotiza en moneda extranjera
- **THEN** el sistema no ofrece la opción de moneda y el precio de lista queda expresado en pesos

### Requirement: La Cotización Pertenece a la Operación de Compra
El sistema SHALL registrar la cotización del dólar como un dato de la **operación de compra**, y SHALL NOT resolverla a partir de una cotización almacenada en la configuración del proveedor ni de ninguna otra configuración estable.

El sistema SHALL solicitar la cotización al registrar un pedido que contenga al menos una línea expresada en dólares, y SHALL NOT solicitarla cuando todas las líneas están expresadas en pesos.

El sistema SHALL solicitar la cotización **en cada operación de compra**, sin excepción, aunque exista una cotización utilizada anteriormente para ese mismo proveedor.

El sistema MAY conservar en el proveedor la última cotización utilizada junto con su fecha, y MAY ofrecerla como valor prellenado del campo, siempre mostrando su antigüedad. Ese valor conservado SHALL tener exclusivamente la condición de **ayuda de tipeo**: SHALL NOT aplicarse a ninguna operación sin que el usuario lo confirme, SHALL NOT usarse como valor de reserva cuando el campo de cotización quedó vacío, y SHALL NOT mostrarse nunca sin la fecha en que fue cargado.

#### Scenario: Cotización pedida sólo cuando corresponde
- **WHEN** un usuario arma un pedido cuyas líneas están todas expresadas en pesos
- **THEN** el sistema no solicita ninguna cotización

#### Scenario: Cotización requerida con una línea en dólares
- **WHEN** un usuario arma un pedido con una línea expresada en dólares
- **THEN** el sistema solicita la cotización del dólar para ese pedido

#### Scenario: Valor prellenado con su antigüedad
- **WHEN** un usuario arma un pedido con líneas en dólares para un proveedor cuya última cotización utilizada fue `1460` hace veintitrés días
- **THEN** el sistema ofrece `1460` como valor prellenado indicando que corresponde a una carga de hace veintitrés días, y el usuario puede reemplazarlo

#### Scenario: La cotización guardada no se aplica sola
- **WHEN** un usuario confirma un pedido con líneas en dólares habiendo dejado el campo de cotización vacío
- **THEN** el sistema no toma ninguna cotización almacenada y rechaza la operación

#### Scenario: Cada pedido vuelve a pedir la cotización
- **WHEN** un usuario arma un segundo pedido con líneas en dólares al mismo proveedor para el que ya cargó una cotización en un pedido anterior
- **THEN** el sistema vuelve a solicitar la cotización para ese pedido y no reutiliza automáticamente la del pedido anterior

### Requirement: Una Compra en Dólares sin Cotización se Rechaza
El sistema SHALL rechazar la confirmación de recepción de un pedido que contenga al menos una línea expresada en dólares sin una cotización informada. El sistema SHALL NOT asumir una cotización igual a uno, SHALL NOT usar la última cotización conocida y SHALL NOT registrar el ingreso omitiendo la conversión.

El rechazo SHALL ser explícito e indicar que falta la cotización.

#### Scenario: Confirmación rechazada por falta de cotización
- **WHEN** se intenta confirmar la recepción de un pedido con una línea en dólares y sin cotización informada
- **THEN** el sistema rechaza la operación completa con un error explícito, no modifica el stock de ningún producto y no registra ningún movimiento de stock

#### Scenario: No se asume cotización uno
- **WHEN** se intenta confirmar la recepción de una línea de `66.24` dólares sin cotización informada
- **THEN** el sistema no registra ningún ingreso con costo `66.24`

### Requirement: La Cotización Aplicada Queda Congelada en el Histórico
El sistema SHALL registrar, en cada movimiento de stock originado en una línea expresada en moneda extranjera, la moneda de origen y la cotización efectivamente aplicada, de modo que el precio de lista original pueda reconstruirse aunque la cotización vigente sea otra.

El costo base registrado en el movimiento SHALL ser el importe **ya convertido a pesos**, conservando el significado que ese campo tiene para las operaciones en pesos.

Los movimientos de stock registrados antes de la introducción de la moneda SHALL quedar sin moneda de origen ni cotización, y esa ausencia SHALL interpretarse como "la operación no tuvo conversión de moneda".

#### Scenario: Ingreso en dólares reconstruible
- **WHEN** se confirma la recepción de una línea de `66.24` dólares con una cotización de `1460`
- **THEN** el movimiento de stock queda con moneda de origen dólares, cotización `1460` y costo base `96710.40`, de modo que dividir el costo base por la cotización devuelve el precio de lista original

#### Scenario: Ingreso en pesos sin datos de moneda
- **WHEN** se confirma la recepción de una línea expresada en pesos
- **THEN** el movimiento de stock queda sin moneda de origen y sin cotización, y su costo base es el importe en pesos de la línea

#### Scenario: Movimientos anteriores a la introducción de la moneda
- **WHEN** se consulta un movimiento de stock registrado antes de que existiera la moneda en el sistema
- **THEN** el movimiento no informa moneda de origen ni cotización, y su costo unitario permanece exactamente como fue congelado

### Requirement: La Conversión Nunca se Aplica a una Operación en Pesos
El sistema SHALL aplicar la conversión de moneda **únicamente** a las líneas explícitamente expresadas en moneda extranjera. La presencia de una cotización informada en un pedido SHALL NOT provocar la conversión de las líneas expresadas en pesos de ese mismo pedido.

#### Scenario: Pedido mixto
- **WHEN** se confirma la recepción de un pedido con una línea de `66.24` dólares y otra de `15000.00` pesos, con cotización `1460`
- **THEN** la primera línea ingresa con un costo base de `96710.40` y la segunda con un costo base de `15000.00`, sin conversión alguna

#### Scenario: Cotización cargada sin líneas en dólares
- **WHEN** se confirma la recepción de un pedido cuyas líneas están todas en pesos, en el que se había informado una cotización
- **THEN** el costo base de cada línea es idéntico al que tendría sin ninguna cotización informada
