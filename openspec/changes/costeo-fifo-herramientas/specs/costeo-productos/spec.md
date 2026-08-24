## ADDED Requirements

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
