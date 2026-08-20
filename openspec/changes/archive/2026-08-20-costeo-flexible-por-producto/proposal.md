## Why

En el negocio **Herramientas** el costo real de comprar un producto no es "costo de catálogo menos un descuento". Es una cadena de varios componentes que hoy el sistema modela de forma más pobre que la realidad, en palabras del usuario:

> "Agregar la opción de poder agregar más descuentos porque a veces tenemos varios descuentos como por ejemplo nos hacen un descuento por pagar con efectivo. Además el IVA el cuál es diferente para cada producto además de que el costo de envío es diferente para cada producto."

Tres huecos concretos contra el modelo actual:

1. **Un solo descuento.** `Producto.descuentoProveedor` es un único porcentaje. Cuando el proveedor aplica dos o más de forma **estable** sobre ese producto (descuento de lista + descuento por volumen pactado, por ejemplo), el jefe tiene que hacer la cuenta a mano y cargar un número combinado inventado. Ese número es opaco: nadie puede después mirar el producto y saber de dónde salió.
2. **No existe el IVA.** No hay ningún campo de IVA en `Producto`, ni en la fórmula de costeo, ni en el movimiento de stock. El IVA es distinto por producto y hoy simplemente no se registra: o se lo ignora, o se lo mete escondido dentro del "costo de catálogo", que es lo mismo que perderlo.
3. **El envío es uniforme por unidad de negocio.** `UnidadNegocio.costoEnvioPorcentaje` aplica igual a los cientos de productos de Herramientas. Un producto voluminoso y uno chico pagan el mismo porcentaje de flete, que es justamente lo que el usuario dice que no es cierto.

Por qué ahora, y por qué no es cosmético: el resultado de esa fórmula se congela en `MovimientoStock.costoUnitario` en cada `INGRESO`, y `Producto.costoUnitarioHistorico` —una `@Formula` de Hibernate que lee el último ingreso— es el costo de referencia que alimenta el margen y la rentabilidad. Un componente de costo ausente o mal ubicado **no rompe ninguna pantalla ni tira ninguna excepción**: se convierte en silencio en el costo "verdadero" del producto y falsea toda la valuación de inventario. Cada compra que entra con la fórmula incompleta es un dato histórico que después no se puede recalcular, porque el movimiento es inmutable por diseño.

**Acotación del alcance, decidida con el usuario.** El ejemplo que él dio —el descuento por pagar en efectivo— resultó ser un descuento que **varía compra a compra**, no una condición fija de ese producto ni de ese proveedor. Por eso este change resuelve los descuentos **estables** por producto (más el IVA y el envío por producto), y **el descuento por efectivo se sigue resolviendo como hoy**: ajustando a mano el `costoUnitarioPactado` de la línea del pedido, mecanismo que ya existe desde `herramientas-pedidos-proveedores` y que entra en la fórmula nueva como costo base. No hace falta ningún desarrollo para ese caso. Modelar descuentos a nivel de `Pedido` se le presentó como alternativa y **quedó descartado**, fuera del alcance de este change.

Contexto adicional: el Backlog de `openspec/roadmap.md` ya había registrado —al descartar la importación de catálogos por Excel— que los proveedores de Herramientas manejan "descuentos, descuentos por método de pago, moneda, IVA y costo de envío". Este change toma la parte de ese problema que **no** depende de importar nada: hacer que el modelo de costo del producto pueda expresar esos componentes cuando se cargan a mano.

## What Changes

- **Los descuentos estables dejan de ser un único porcentaje y pasan a ser una lista por producto.** Cada descuento tiene un nombre (`Proveedor`, `Volumen`, `Pronto pago`, …) y un porcentaje, de modo que el desglose sea legible y auditable en vez de un número combinado calculado a mano. La lista es para las condiciones que se cumplen en **toda** compra de ese producto; los descuentos que varían compra a compra no se cargan ahí. El `descuentoProveedor` actual de cada producto se migra como el primer descuento de esa lista, sin pérdida de información.
- **Los descuentos se combinan en cascada**, cada uno sobre el resultado del anterior, no sumando los porcentajes: $10.000 con 10% y 5% da $9.000 y después $8.550, que es lo que factura el proveedor cuando ofrece "10 y 5".
- **Se introduce el IVA como componente propio de la fórmula**, configurable por producto, con un valor por defecto a nivel de unidad de negocio para no tener que cargarlo producto por producto. Es 100% nuevo: hoy no existe en ningún lado del modelo. El negocio es **monotributista**, así que ese IVA **no** es crédito fiscal recuperable: es costo real y **se suma** al costo de adquisición, no queda como dato meramente informativo.
- **El costo de envío pasa a ser configurable por producto**, manteniendo el valor de `UnidadNegocio.costoEnvioPorcentaje` como **default** para los productos que no tengan uno propio. Ningún producto existente cambia de costo por este change: sin valor propio, sigue usando exactamente el de la unidad de negocio.
- **Se define un orden explícito y único de aplicación de los cuatro componentes** (costo base → descuentos → IVA → envío) y se documenta como requisito, en vez de quedar implícito en el orden de las líneas de código. El orden elegido es **compatible hacia atrás por construcción**: con IVA en 0 y un solo descuento, produce exactamente el mismo número que hoy.
- **La fórmula deja de estar duplicada en cuatro lugares.** Hoy la misma aritmética está escrita en `MovimientoStockServiceImpl` (dos veces, en dos ramas), en `ProductoServiceImpl.calcularPrecioSiAplica()` y en `ProductoForm.jsx`. Con cuatro componentes y N descuentos, mantener cuatro copias sincronizadas es una garantía de divergencia. Se consolida en un único calculador en backend y uno en frontend.
- **El movimiento de stock pasa a congelar el desglose completo**, no sólo `descuentoPorcentaje` y `envioPorcentaje`. Con varios descuentos y con IVA, los campos actuales ya no alcanzan para reconstruir cómo se llegó al `costoUnitario` de un ingreso viejo.
- **El formulario de producto muestra el desglose completo en vivo**: cada descuento con su nombre y su monto, el IVA, el envío y el costo final, sobre el panel de análisis de costos que ya existe para Herramientas. Los campos nuevos se cargan ahí, en el alta/edición de producto, sin pantalla ni flujo aparte.
- **Fuera de alcance, explícito:** no se importa ningún catálogo de proveedor (sigue descartado en el Backlog del roadmap); no se agrega moneda ni tipo de cambio, aunque figuraban en la misma anotación del Backlog; **no se modelan descuentos a nivel de `Pedido` ni por método de pago elegido en el momento de la compra** — el usuario vio esa alternativa y la descartó, y el caso concreto (el descuento por efectivo) se sigue cubriendo con el ajuste manual del `costoUnitarioPactado` de la línea del pedido, que ya existe (Decisión 14 de `design.md`); no se toca el circuito de ventas, cheques, cuentas corrientes, bandejas ni siembras; no se recalculan retroactivamente los movimientos de stock ya registrados.

## Capabilities

### New Capabilities

- `costeo-productos`: la definición canónica de la fórmula de costo de adquisición de un producto — qué componentes la forman (costo base, descuentos múltiples, IVA, envío), en qué orden se aplican, con qué redondeo, de dónde sale el valor de cada componente (producto propio o default de la unidad de negocio) y qué queda congelado en el histórico. Hoy esa definición no vive en ninguna spec: está implícita y repartida entre `catalogo-productos` y `movimientos-stock`, y duplicada en cuatro lugares del código.

### Modified Capabilities

- `catalogo-productos`: hoy el requisito de registro dice que el producto se define con "costo catálogo, porcentaje de descuento del proveedor y porcentaje de ganancia", y que el precio de venta se calcula sobre `Base + Envío − Descuento`. Cambia a: el producto se define con costo catálogo, **una lista de descuentos estables**, **su IVA**, **su costo de envío** (con default de la unidad de negocio) y su porcentaje de ganancia; y el precio de venta se calcula sobre el costo final resultante de la fórmula canónica de `costeo-productos`.
- `movimientos-stock`: hoy el requisito dice que el movimiento persiste el cálculo de costo unitario "(base + envío − descuento)" congelado. Cambia a: persiste el desglose completo de la fórmula canónica —costo base, descuento efectivo total, IVA y envío aplicados— de modo que un ingreso viejo siga siendo reconstruible aunque la configuración del producto haya cambiado después.
- `frontend-productos`: el formulario de producto suma los campos nuevos (lista de descuentos con nombre y porcentaje, IVA, envío propio) y su desglose en vivo, dentro del panel de análisis de costos que ya existe para la unidad de negocio Herramientas.

## Impact

**Nivel de gobernanza: MEDIA-ALTA.** Mismo criterio que `herramientas-pedidos-proveedores`: este change reescribe la fórmula que determina el costo congelado en cada `INGRESO`/`AJUSTE_INICIAL` y, a través de `Producto.costoUnitarioHistorico`, el costo de referencia que alimenta la valuación de inventario y el margen. No toca autenticación, cheques ni cuentas corrientes, así que no es CRÍTICO — pero tampoco corresponde autonomía plena. **El grupo de tareas que reescribe la fórmula en `MovimientoStockServiceImpl` requiere checkpoint explícito del usuario ANTES de escribir el código**, mostrando la fórmula exacta resultante con números de ejemplo sobre productos reales.

**Backend — código existente que se toca**

- `models/Producto.java`: campos nuevos de IVA y envío propios, y la relación con la lista de descuentos.
- `models/UnidadNegocio.java`: IVA por defecto, junto al `costoEnvioPorcentaje` que ya existe.
- `models/MovimientoStock.java`: columnas nuevas para congelar los componentes que hoy no tienen dónde guardarse.
- `services/impl/MovimientoStockServiceImpl.java`: **el corazón del change.** La fórmula está escrita dos veces en el mismo archivo (rama de ingresos y fallback de la rama de egresos); ambas pasan a delegar en el calculador único.
- `services/impl/ProductoServiceImpl.java`: `calcularPrecioSiAplica()` deja de tener su propia copia de la fórmula. Además, su detección de cambios (`costChanged`/`discountChanged`, que decide si generar un movimiento de stock al editar un producto) tiene que contemplar los componentes nuevos — si no, editar sólo el IVA no generaría movimiento y el costo histórico quedaría viejo sin ninguna señal.
- `dto/ProductoDTO.java`, `dto/UnidadNegocioDTO.java`: campos nuevos.
- `services/impl/UnidadNegocioServiceImpl.java`: persistencia del IVA por defecto.

**Backend — código nuevo**

- Un calculador de costo único (clase de dominio o servicio) que sea la **única** implementación de la fórmula en backend.
- La entidad de descuento por producto, su repositorio y su mapeo a DTO.

**Backend — código existente que NO se toca (y por qué importa)**

- `services/impl/PedidoServiceImpl.confirmarRecepcion()`: sigue llamando a `registrarMovimiento(..., costoUnitarioPactado)` exactamente igual. El costo pactado del pedido sigue siendo el **costo base** de la fórmula; lo que cambia es qué se le aplica encima. No se reabre la Decisión 6 de `herramientas-pedidos-proveedores`: confirmar una recepción sigue sin pisar `costoProducto` ni `precio`.
- La rama de egresos de `registrarMovimiento` (que copia el desglose del último ingreso) mantiene su comportamiento: copiar, no recalcular.

**Base de datos**

- Columnas nuevas en `productos`, `unidades_negocio` y `movimientos_stock`, más una tabla de descuentos por producto. `ddl-auto=update` las crea al arrancar.
- **Sí hay migración de datos**, a diferencia del change anterior: el `descuento_proveedor` de cada producto existente tiene que quedar representado como descuento en el modelo nuevo. Es el punto de mayor riesgo de la migración y tiene tareas de verificación propias.
- Los `movimientos_stock` históricos **no se recalculan**: son inmutables por diseño y sus columnas nuevas quedan nulas/cero, que es la lectura correcta ("no había IVA registrado cuando esto se congeló").

**Frontend**

- `components/ProductoForm.jsx`: campos nuevos y desglose en vivo dentro del panel de costos de Herramientas; su copia local de la fórmula se reemplaza por el calculador único de frontend.
- `components/ConfiguracionHerramientas.jsx`: el IVA por defecto de la unidad de negocio, junto al envío por defecto que ya edita.
- `api/productos.api.js` y el cliente de unidades de negocio: campos nuevos en los payloads.

**Sin impacto**

- El negocio **Vivero** (`unidad_negocio.id = 1`) no muestra el panel de costos en el formulario de producto (hoy está condicionado a la unidad Herramientas), así que no ve ninguno de los campos nuevos. Su `costoEnvioPorcentaje` es 0 y su IVA por defecto nace en 0: con la fórmula nueva, el costo de sus productos da exactamente el mismo número que hoy.
- Ventas, cheques, cuentas corrientes, bandejas, siembras y el circuito de pedidos a proveedores quedan funcionalmente intactos.
