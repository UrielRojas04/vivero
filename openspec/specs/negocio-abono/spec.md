## ADDED Requirements

### Requirement: Unidad de Negocio Abono
El sistema SHALL registrar "Abono" como una tercera `UnidadNegocio` activa, sembrada por `DataInitializer` de forma idempotente y asignada al usuario jefe junto a las unidades existentes. La unidad SHALL reutilizar sin modificaciones las capacidades transversales ya existentes de `Cliente`, `Venta`, `Pago`, `FacturaCliente` y `CuentaCorrienteDinero`, alcanzadas por unidad de negocio como ya ocurre con Vivero y Herramientas.

#### Scenario: Seed inicial de la unidad
- **WHEN** el backend arranca contra una base que aún no tiene la unidad "Abono"
- **THEN** el sistema crea la unidad "Abono" activa y la asocia al usuario jefe, sin duplicar ni alterar las unidades "Vivero" y "Herramientas" existentes

#### Scenario: Seed idempotente
- **WHEN** el backend arranca contra una base que ya tiene la unidad "Abono"
- **THEN** el sistema no crea una unidad duplicada ni reescribe su configuración

#### Scenario: Cliente alcanzado por la unidad Abono
- **WHEN** un usuario da de alta un cliente con la unidad activa "Abono"
- **THEN** el cliente queda asociado a la unidad "Abono" y no aparece en los listados de clientes de Vivero ni de Herramientas

#### Scenario: Venta a crédito con pago parcial en Abono
- **WHEN** se registra una venta de Abono a un cliente con un pago menor al total
- **THEN** el sistema aplica exactamente la misma lógica de estado de pago y cuenta corriente que en las unidades existentes, dejando el saldo pendiente en la cuenta corriente del cliente

### Requirement: Catálogo de Categorías de Bolsa
El sistema SHALL representar cada categoría de bolsa de abono (Categoría 1 a Categoría 7) como un `Producto` normal del catálogo de la unidad "Abono", cada uno con su propio precio de venta. El sistema MUST NOT introducir un campo "categoría" en `Producto`, MUST NOT almacenar receta ni conversión insumo→producto para esta unidad, y MUST NOT poblar costo unitario por producto para los productos de esta unidad.

#### Scenario: Seed de las siete categorías
- **WHEN** el backend arranca por primera vez con la unidad "Abono" recién creada
- **THEN** el sistema siembra siete productos ("Categoría 1" … "Categoría 7") asociados a la unidad "Abono", con stock agregado en cero y precio editable

#### Scenario: Edición de precio de una categoría
- **WHEN** un usuario con permiso de escritura de productos modifica el precio de "Categoría 3" con la unidad activa "Abono"
- **THEN** el sistema persiste el precio nuevo y las ventas posteriores lo usan, sin afectar productos de otras unidades

#### Scenario: Producto de Abono sin costeo por capas
- **WHEN** se consulta un producto de la unidad "Abono"
- **THEN** el producto no tiene capas de costo asociadas y el flag `costeoPorCapasHabilitado` de su unidad es falso

### Requirement: Porcentaje de Reparto Configurable
El sistema SHALL exponer en `UnidadNegocio` un porcentaje de reparto de ganancias configurable (`porcentajeRepartoColega`), editable desde la pantalla de Configuración cuando la unidad activa es Abono, siguiendo el mismo patrón que `costoEnvioPorcentaje` e `ivaPorcentaje`. El valor SHALL usarse únicamente para mostrar cálculos informativos y MUST NOT disparar ningún movimiento de dinero automático.

#### Scenario: Valor por defecto
- **WHEN** la unidad "Abono" se crea por primera vez
- **THEN** su `porcentajeRepartoColega` arranca en 0.00, y las unidades Vivero y Herramientas también quedan en 0.00 sin cambio de comportamiento

#### Scenario: Configuración del porcentaje
- **WHEN** el jefe guarda un porcentaje de reparto de 40.00 desde Configuración con la unidad activa "Abono"
- **THEN** el sistema persiste 40.00 en la unidad "Abono" y el dashboard de liquidación pasa a calcular con ese valor

#### Scenario: Rechazo de porcentaje inválido
- **WHEN** se intenta guardar un porcentaje de reparto menor a 0 o mayor a 100
- **THEN** el sistema rechaza la operación con un error de validación y conserva el valor anterior

### Requirement: Alcance de Módulos de la Unidad Abono
El sistema SHALL habilitar para la unidad "Abono" los módulos de Productos, Clientes, Ventas, Cuenta Corriente, Facturas, Insumos y Finanzas, más las pantallas propias de Stock por ubicación, Producción, Traslados, Rendición y Liquidación. El sistema SHALL ocultar en esta unidad los módulos que no le aplican: Siembras, Devolución de Bandejas, Pedidos a Proveedores y Variedades.

#### Scenario: Navegación en la unidad Abono
- **WHEN** el usuario tiene la unidad activa "Abono"
- **THEN** la navegación muestra las entradas propias de Abono (Stock, Producción, Traslados, Rendición, Liquidación) y no muestra Siembras, Devolución de Bandejas ni Pedidos

#### Scenario: La navegación de las otras unidades no cambia
- **WHEN** el usuario cambia la unidad activa a "Vivero" o a "Herramientas"
- **THEN** la navegación muestra exactamente las mismas entradas que antes de introducir la unidad Abono, sin las entradas propias de Abono

#### Scenario: Acceso directo a una ruta de Abono desde otra unidad
- **WHEN** un usuario con la unidad activa "Vivero" navega directamente a una ruta propia de Abono
- **THEN** el sistema no muestra datos de Abono y redirige o informa que la sección no corresponde a la unidad activa
