## ADDED Requirements

### Requirement: Historial Global de Cobros de Abono

El sistema SHALL ofrecer una vista de sólo lectura que liste **todos** los pagos registrados en la unidad de negocio Abono, sin importar por cuál de las dos cuentas operativas (`JEFE` / `COLEGA`) fueron cobrados.

Un pago SHALL considerarse "de Abono" cuando la venta a la que está ligado, o la factura a la que está ligado, pertenece a la unidad de negocio Abono. El sistema MUST NOT exigir que el pago tenga una unidad de negocio propia: la pertenencia se deduce de la venta o de la factura.

La vista MUST ser de sólo lectura: no SHALL permitir crear, editar, anular ni reasignar pagos.

#### Scenario: Se listan los cobros de la unidad Abono

- **WHEN** un usuario autorizado abre el historial de cobros de Abono y existen pagos ligados a ventas o facturas de esa unidad
- **THEN** el listado muestra esos pagos con su fecha, monto, método de pago y estado

#### Scenario: Los cobros de otras unidades no aparecen

- **WHEN** existen pagos ligados a ventas o facturas de las unidades Vivero o Herramientas
- **THEN** esos pagos no aparecen en el historial de cobros de Abono

#### Scenario: La vista no ofrece acciones de escritura

- **WHEN** un usuario autorizado abre el historial de cobros de Abono
- **THEN** la pantalla no ofrece ninguna acción para registrar, modificar, anular ni reasignar un cobro

### Requirement: El Historial No Se Particiona por Cuenta de Abono

El historial de cobros SHALL mostrar los pagos de **ambas** cuentas operativas juntos, en un mismo listado, sin importar cuál sea la cuenta activa de quien lo consulta. El sistema MUST NOT filtrar este listado por la cuenta en contexto de la petición.

Esta no-partición SHALL ser independiente de la partición que siguen aplicando las ventas, el stock y la rendición del colega de Abono, que MUST permanecer sin cambios.

#### Scenario: El jefe ve también los cobros del colega

- **WHEN** el usuario cuya cuenta operativa es `JEFE` abre el historial de cobros y existen pagos cobrados por la cuenta `COLEGA`
- **THEN** el listado incluye los pagos de `COLEGA` además de los de `JEFE`

#### Scenario: El colega ve también los cobros del jefe

- **WHEN** el usuario cuya cuenta operativa es `COLEGA` abre el historial de cobros y existen pagos cobrados por la cuenta `JEFE`
- **THEN** el listado incluye los pagos de `JEFE` además de los de `COLEGA`

#### Scenario: El listado es idéntico para ambas cuentas

- **WHEN** el mismo historial se consulta con la cuenta `JEFE` en contexto y luego con la cuenta `COLEGA` en contexto, con los mismos filtros
- **THEN** ambas consultas devuelven exactamente el mismo conjunto de cobros

#### Scenario: La partición de ventas sigue vigente (guard de no regresión)

- **WHEN** existe el historial global de cobros y se lista el historial de ventas de Abono con una cuenta en contexto
- **THEN** el historial de ventas sigue devolviendo únicamente las ventas de esa cuenta, igual que antes de este cambio

### Requirement: Atribución del Cobro a la Persona que Cobró

Cada fila del historial SHALL indicar quién cobró, resolviendo el nombre real a partir de la cuenta operativa del pago: la cuenta `JEFE` SHALL mostrarse como `Sergio` y la cuenta `COLEGA` como `Pablo`.

El sistema MUST NOT agregar un campo de usuario al pago para lograrlo: la atribución se deriva de la cuenta ya persistida.

La correspondencia entre cuenta operativa y nombre real SHALL estar definida en un único lugar del sistema, compartido con la resolución inversa (nombre de usuario de la sesión → cuenta operativa), de modo que un renombre de usuario no pueda dejar las dos direcciones desincronizadas.

#### Scenario: Cobro de la cuenta del jefe

- **WHEN** el historial incluye un pago cuya cuenta operativa es `JEFE`
- **THEN** la fila muestra `Sergio` como quien cobró

#### Scenario: Cobro de la cuenta del colega

- **WHEN** el historial incluye un pago cuya cuenta operativa es `COLEGA`
- **THEN** la fila muestra `Pablo` como quien cobró

#### Scenario: Cobro sin cuenta asignada

- **WHEN** el historial incluye un pago cuya cuenta operativa está vacía (pago histórico anterior al campo)
- **THEN** la fila muestra `Sin cuenta asignada` como quien cobró, y el listado se devuelve completo sin error

#### Scenario: No se inventa una atribución por defecto

- **WHEN** un pago no tiene cuenta operativa
- **THEN** el sistema no lo atribuye a `Sergio` ni a `Pablo`

### Requirement: Origen del Cobro (Venta o Cuenta Corriente)

Cada fila del historial SHALL indicar de dónde salió el cobro.

Cuando el pago está ligado a una venta, la fila SHALL mostrar el cliente de esa venta, la fecha de esa venta y su identificador, además de la fecha del cobro.

Cuando el pago está ligado únicamente a una factura de cliente, sin venta puntual detrás, la fila SHALL identificarlo como pago a cuenta corriente y SHALL mostrar el cliente de esa factura.

Cuando el cliente asociado ya no está disponible, la fila SHALL mostrar un texto de reemplazo en vez de fallar.

Cuando el pago está ligado a una venta, la fila SHALL ofrecer una acción para ver el remito de esa venta (los ítems vendidos), sin salir del historial. Esa acción MUST NOT depender de la cuenta operativa que cobró la venta: SHALL funcionar igual sea cual sea la cuenta activa de quien la consulta (misma vista global de la que se hereda todo el historial).

#### Scenario: Cobro originado en una venta

- **WHEN** el historial incluye un pago ligado a una venta de Abono
- **THEN** la fila lo identifica como originado en esa venta y muestra el cliente de la venta, la fecha de la venta y el identificador de la venta

#### Scenario: Cobro aplicado directamente a la cuenta corriente

- **WHEN** el historial incluye un pago ligado a una factura de Abono y sin venta asociada
- **THEN** la fila lo identifica como pago a cuenta corriente y muestra el cliente de esa factura

#### Scenario: Venta a cliente casual

- **WHEN** el pago proviene de una venta sin cliente de agenda, cargada con el nombre de un cliente casual
- **THEN** la fila muestra ese nombre casual como cliente

#### Scenario: Cliente ya no disponible

- **WHEN** el pago proviene de una venta o factura cuyo cliente fue eliminado
- **THEN** la fila muestra un texto de reemplazo en lugar del nombre y el listado se devuelve completo sin error

#### Scenario: Ver remito de la venta de origen

- **WHEN** el usuario acciona "ver remito" sobre una fila cuyo cobro está ligado a una venta
- **THEN** el sistema muestra el remito de esa venta, con sus ítems, sin importar qué cuenta operativa la cobró

### Requirement: Paginación, Búsqueda y Filtro por Período

El historial de cobros SHALL devolverse siempre paginado; el sistema MUST NOT exponer un listado sin límite de cantidad.

El historial SHALL ordenarse por fecha de cobro descendente (los cobros más recientes primero).

El historial SHALL aceptar un texto de búsqueda que filtre por nombre del cliente, ignorando mayúsculas y minúsculas y admitiendo coincidencia parcial. Ese mismo texto de búsqueda SHALL también matchear por el número de la venta de la que salió el cobro (coincidencia parcial), cuando el pago está ligado a una venta.

El historial SHALL aceptar un rango de fechas (desde / hasta) que acote los cobros por su fecha de cobro. Ambos límites SHALL ser opcionales e independientes entre sí: omitirlos SHALL devolver el historial completo.

#### Scenario: Resultado paginado

- **WHEN** un usuario autorizado pide el historial de cobros
- **THEN** la respuesta contiene una página de resultados junto con el total de cobros que cumplen los filtros

#### Scenario: Orden por fecha descendente

- **WHEN** se devuelve una página del historial
- **THEN** los cobros aparecen del más reciente al más antiguo

#### Scenario: Búsqueda por cliente

- **WHEN** el usuario escribe parte del nombre de un cliente en el buscador
- **THEN** el listado muestra únicamente los cobros cuyo cliente contiene ese texto, sin distinguir mayúsculas de minúsculas

#### Scenario: Búsqueda por número de venta

- **WHEN** el usuario escribe en el buscador un texto que coincide parcialmente con el número de una venta
- **THEN** el listado incluye el cobro ligado a esa venta, aunque el texto no coincida con el nombre del cliente

#### Scenario: Filtro por rango de fechas

- **WHEN** el usuario indica una fecha desde y una fecha hasta
- **THEN** el listado muestra únicamente los cobros cuya fecha de cobro cae dentro de ese rango

#### Scenario: Filtros omitidos

- **WHEN** el usuario no indica texto de búsqueda ni rango de fechas
- **THEN** el listado muestra todos los cobros de Abono, paginados

#### Scenario: Búsqueda sin coincidencias

- **WHEN** el texto buscado no coincide con ningún cliente
- **THEN** el listado se devuelve vacío, con total cero, y sin error

### Requirement: Acceso Restringido al Permiso Financiero

El historial de cobros de Abono SHALL exigir el permiso `LEER_FINANZAS`, el mismo que ya protege Finanzas, Cheques, Gastos y la liquidación de Abono. El sistema MUST NOT crear un permiso nuevo para esta vista.

Tanto el endpoint como el acceso a la pantalla y su entrada de menú SHALL respetar ese permiso; la entrada de menú SHALL mostrarse únicamente cuando la unidad de negocio activa es Abono.

#### Scenario: Usuario con el permiso financiero

- **WHEN** un usuario con el permiso `LEER_FINANZAS` pide el historial de cobros de Abono
- **THEN** el sistema devuelve el listado

#### Scenario: Usuario sin el permiso financiero

- **WHEN** un usuario autenticado sin el permiso `LEER_FINANZAS` pide el historial de cobros de Abono
- **THEN** el sistema rechaza la petición y no devuelve ningún dato de cobros

#### Scenario: Entrada de menú sólo en Abono

- **WHEN** la unidad de negocio activa es Vivero o Herramientas
- **THEN** la entrada de menú del historial de cobros de Abono no se muestra

#### Scenario: Entrada de menú sólo con el permiso financiero

- **WHEN** la unidad de negocio activa es Abono y el usuario no tiene el permiso `LEER_FINANZAS`
- **THEN** la entrada de menú del historial de cobros no se muestra
