## ADDED Requirements

### Requirement: Historial de Ventas Compartido en Abono

El listado del historial de ventas de una unidad de negocio MUST estar delimitado únicamente por la unidad de negocio. En la unidad Abono, donde cada venta se atribuye a una cuenta operativa (`JEFE` o `COLEGA`), el sistema MUST NOT usar esa cuenta como criterio de visibilidad ni de filtrado del historial: ambos usuarios MUST ver el mismo historial completo de la unidad, exactamente igual que en las unidades que no tienen cuentas operativas.

El sistema MUST NOT conservar ninguna consulta capaz de devolver el historial de ventas filtrado por cuenta operativa.

Esta unificación aplica **solo a la consulta del historial**. La atribución de cada venta a su cuenta operativa MUST permanecer intacta y MUST seguir persistiéndose al registrar la venta: es la que alimenta el stock de Abono, la atribución del pago y el cálculo de la rendición del colega. Compartir la vista no significa compartir la plata.

Cada fila del historial SHALL permitir identificar quién registró la venta a partir del dato de usuario que la respuesta de venta ya expone. El sistema MUST NOT agregar ningún campo nuevo al contrato de la respuesta para lograrlo.

#### Scenario: El jefe ve también las ventas del colega

- **WHEN** existen en Abono una venta registrada bajo la cuenta `JEFE` y otra bajo la cuenta `COLEGA`, y se solicita el historial de ventas con la cuenta `JEFE` activa
- **THEN** el historial devuelve ambas ventas, la de `JEFE` y la de `COLEGA`

#### Scenario: El colega ve también las ventas del jefe

- **WHEN** existen en Abono una venta registrada bajo la cuenta `JEFE` y otra bajo la cuenta `COLEGA`, y se solicita el historial de ventas con la cuenta `COLEGA` activa
- **THEN** el historial devuelve ambas ventas, la de `COLEGA` y la de `JEFE`

#### Scenario: El historial es idéntico para ambas cuentas

- **WHEN** el historial de ventas de Abono se consulta con la cuenta `JEFE` en contexto y luego con la cuenta `COLEGA` en contexto
- **THEN** ambas consultas devuelven exactamente el mismo conjunto de ventas

#### Scenario: Historial de Abono sin cuenta operativa en contexto

- **WHEN** se solicita el historial de ventas de Abono sin ninguna cuenta operativa en el contexto de la petición
- **THEN** el historial devuelve todas las ventas de la unidad, sin error y sin diferencia respecto de la consulta hecha con una cuenta activa

#### Scenario: Cada venta sigue identificando a quién la registró

- **WHEN** se consulta el historial compartido de Abono
- **THEN** cada venta expone el usuario que la registró, sin que haga falta ningún campo nuevo en la respuesta

#### Scenario: Vivero y Herramientas no se ven afectados (guarda de regresión)

- **WHEN** se solicita el historial de ventas con la unidad Vivero o Herramientas en contexto, incluso habiendo una cuenta operativa residual en el contexto de la petición
- **THEN** el historial devuelve todas las ventas de esa unidad, sin filtrarlas por cuenta operativa

#### Scenario: Aislamiento entre unidades de negocio intacto

- **WHEN** se solicita el historial de ventas con una unidad de negocio distinta de Abono en contexto
- **THEN** el sistema devuelve únicamente las ventas de esa unidad y ninguna venta de Abono

#### Scenario: La rendición del colega sigue calculándose por cuenta (guarda de regresión)

- **WHEN** con el historial de ventas ya compartido se liquida el período de la rendición del colega de Abono
- **THEN** los totales de ventas, de cobros y de retiros se siguen calculando por separado para la cuenta `JEFE` y para la cuenta `COLEGA`, con los mismos resultados que antes de compartir el historial

#### Scenario: El stock de Abono sigue siendo de cada cuenta (guarda de regresión)

- **WHEN** con el historial de ventas ya compartido se registra una venta de Abono bajo una cuenta operativa
- **THEN** el descuento de stock se aplica sobre el stock de esa cuenta y el pago queda atribuido a esa misma cuenta, sin cambios respecto del comportamiento anterior
