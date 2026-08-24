## ADDED Requirements

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
