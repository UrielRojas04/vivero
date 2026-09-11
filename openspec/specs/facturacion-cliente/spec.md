# facturacion-cliente Specification

## Purpose
TBD - created by archiving change estado-pago-cheques. Update Purpose after archive.
## Requirements
### Requirement: Filtrado de pagos rechazados
The system SHALL exclude payments with state RECHAZADO from all "Total Abonado" and "Saldo Deudor" calculations.

#### Scenario: Factura con pago rechazado
- **WHEN** calculating the total amount paid (Total Abonado) for a sale or the overall invoice
- **THEN** any payment marked as RECHAZADO must not be summed, and the unpaid balance (Saldo Deudor) must reflect the remaining debt.

### Requirement: Diseño Responsivo en Detalle de Factura
The system SHALL display the client invoice detail interface correctly on mobile screens. Summary
indicators SHALL stack vertically or in a 2-column grid, and the action buttons SHALL be presented as
a full-width grid instead of a wrapping flex row. The invoice status chip SHALL be laid out in normal
document flow, never absolutely positioned, so that it cannot overlap the action buttons at
intermediate widths. The article detail table MAY remain horizontally scrollable, but SHALL be
governed by exactly one horizontal scroll container — nested horizontal scrollers over the same
content are prohibited.

#### Scenario: Mobile viewport viewing
- **WHEN** the user views the invoice detail page on a screen width smaller than 768px
- **THEN** the summary indicators stack vertically or in a 2-column grid
- **THEN** the action buttons occupy the full width in a two-column grid, below the client identity block
- **THEN** the status chip appears next to the invoice title without overlapping any button
- **THEN** the article detail table is scrollable within exactly one horizontal scroll container

#### Scenario: Sin scrollers horizontales anidados
- **WHEN** any invoice is displayed, whether the active one or one expanded from the history tab
- **THEN** the chain of ancestors above the article table contains exactly one element with horizontal overflow enabled
- **THEN** the page body itself never scrolls horizontally

### Requirement: Autorización de los Endpoints de Factura por Cliente
Todos los endpoints bajo `/api/facturas` SHALL exigir el permiso `LEER_FACTURACION`. Además del permiso base:

- los endpoints de **lectura** (`GET /api/facturas/cliente/{clienteId}/activa`, `GET /api/facturas/cliente/{clienteId}/historial`) SHALL exigir también `LEER_CLIENTES`;
- los endpoints de **escritura** (`POST /cliente/{clienteId}/abrir`, `POST /{facturaId}/conceptos`, `POST /{facturaId}/pagos`, `POST /{facturaId}/cerrar`, `PUT /pagos/{pagoId}/rechazar`) SHALL exigir también `ESCRIBIR_VENTAS`.

La condición MUST ser conjuntiva (AND) en todos los casos: `ESCRIBIR_VENTAS` por sí solo ya no otorga acceso a ningún endpoint de factura.

#### Scenario: Lectura autorizada
- **WHEN** un usuario con `LEER_FACTURACION` y `LEER_CLIENTES` pide `GET /api/facturas/cliente/3/activa`
- **THEN** el backend responde 200 con la factura activa (o 204 si no hay ninguna)

#### Scenario: Lectura rechazada por falta del permiso nuevo
- **WHEN** un usuario con `ESCRIBIR_VENTAS` y `LEER_CLIENTES` pero sin `LEER_FACTURACION` pide `GET /api/facturas/cliente/3/historial`
- **THEN** el backend responde 403 Forbidden y no devuelve ningún dato de factura

#### Scenario: Escritura rechazada por falta del permiso nuevo
- **WHEN** un usuario con `ESCRIBIR_VENTAS` pero sin `LEER_FACTURACION` hace `POST /api/facturas/12/pagos`
- **THEN** el backend responde 403 Forbidden y no registra el pago

#### Scenario: Usuario de sólo lectura no puede mutar la factura
- **WHEN** un usuario con `LEER_FACTURACION` y `LEER_CLIENTES` pero sin `ESCRIBIR_VENTAS` hace `POST /api/facturas/12/cerrar`
- **THEN** el backend responde 403 Forbidden y la factura permanece abierta

#### Scenario: El rol JEFE conserva acceso completo
- **WHEN** un usuario con el rol `JEFE` (que posee todos los permisos del enum) opera sobre cualquier endpoint de `/api/facturas`
- **THEN** el backend autoriza la operación exactamente como antes del cambio

### Requirement: Desacople de Facturación respecto de Ventas
El acceso a la sección Facturación MUST NOT derivarse de la combinación `ESCRIBIR_VENTAS` + `LEER_CLIENTES`. La carga de ventas y la consulta de facturación SHALL ser dos accesos otorgables por separado.

#### Scenario: Empleado de ventas sin visibilidad financiera
- **WHEN** un empleado con rol de ventas (`ESCRIBIR_VENTAS`, `LEER_STOCK`, `LEER_CLIENTES`, sin `LEER_FACTURACION`) inicia sesión y carga una venta a cuenta corriente
- **THEN** la venta se registra normalmente y se imputa a la factura activa del cliente, pero el empleado no puede abrir la sección Facturación ni consultar saldos, pagos o historial de facturas por API

#### Scenario: Administrativo con visibilidad financiera sin carga de ventas
- **WHEN** un usuario administrativo con `LEER_FACTURACION` y `LEER_CLIENTES` inicia sesión
- **THEN** ve el item "Facturación" en el menú y puede consultar la factura activa y el historial de cualquier cliente, sin poder cargar ventas ni registrar pagos

### Requirement: Presentación de la Factura como Documento Único
The system SHALL present the client invoice as a single document panel rather than as a set of
separate floating cards. The header, the summary indicators, the article detail table, the additional
concepts table and the final amount due SHALL be adjacent sections of one container, separated by 1px
rules and not by vertical gaps. Only the outer container SHALL carry a border and shadow; inner
sections SHALL NOT have their own border, shadow or corner radius.

#### Scenario: Factura activa con artículos
- **WHEN** a user opens the active invoice of a client that has sales
- **THEN** the header, indicators, article table and total are rendered inside a single bordered panel
- **THEN** no inner section renders its own card border, shadow or corner radius
- **THEN** consecutive sections are separated by a single-pixel rule with no background gap between them

#### Scenario: Factura sin conceptos adicionales
- **WHEN** the invoice has no additional concepts
- **THEN** the concepts section is omitted entirely and the remaining sections stay adjacent, leaving no empty gap in the panel

### Requirement: Indicadores de Resumen con Acento Lateral
The system SHALL present each summary indicator (Total Ventas, Total Conceptos, Pagos Recibidos,
Saldo Deudor) over a white background with a colored accent bar on its left edge, instead of a solid
colored background. The accent colors SHALL be drawn from the palette already used elsewhere in the
application, and the semantic color of the Saldo Deudor indicator SHALL continue to depend on whether
the outstanding balance is greater than zero.

#### Scenario: Factura con saldo deudor pendiente
- **WHEN** the invoice has an outstanding balance greater than zero
- **THEN** the Saldo Deudor indicator shows a red accent bar and its amount is rendered in red
- **THEN** the Pagos Recibidos indicator shows an emerald accent bar and its amount is rendered in emerald
- **THEN** no indicator uses a fully colored background

#### Scenario: Factura completamente saldada
- **WHEN** the invoice has an outstanding balance of zero
- **THEN** the Saldo Deudor indicator shows an emerald accent bar and its amount is rendered in emerald, matching the semantics used before this change

### Requirement: Conservación de Funcionalidad y Color en el Rediseño
The visual redesign of the invoice SHALL NOT remove or alter any existing action, handler, computed
value or semantic color. Registrar Pago, Agregar Concepto, Descargar, Cerrar Factura and Abrir
Factura Manualmente SHALL remain available under exactly the same conditions as before, and the
colors that communicate payment state SHALL keep their present meaning.

#### Scenario: Acciones disponibles en una factura abierta
- **WHEN** a user views the active invoice of a client and that invoice is in state ABIERTA
- **THEN** the actions Registrar Pago, Agregar Concepto, Descargar and Cerrar Factura are all available and behave exactly as before the redesign

#### Scenario: Colores semánticos de estado de pago
- **WHEN** the article table renders a sale that was fully paid, one that was partially paid and one that was not paid
- **THEN** the fully paid row keeps its emerald treatment, the partially paid row keeps its orange treatment and the unpaid row keeps its red treatment
- **THEN** a payment in state RECHAZADO is still shown struck through and marked as rejected

### Requirement: Teléfono del Cliente en la Factura
The system SHALL expose the client's phone number in the invoice payload and display it in the
invoice document header, below the client name. When the client has no phone number recorded, the
line SHALL be omitted rather than rendered empty.

#### Scenario: Cliente con teléfono cargado
- **WHEN** the invoice of a client that has a phone number recorded is requested
- **THEN** the response payload includes the client's phone number
- **THEN** the invoice header displays it below the client name

#### Scenario: Cliente sin teléfono cargado
- **WHEN** the invoice of a client whose phone number is empty or null is displayed
- **THEN** no phone line is rendered in the invoice header

### Requirement: Detalle del Historial Alineado con la Factura Activa
When a closed invoice is expanded from the history tab, the system SHALL render its detail on the
same horizontal axis and at the same width as the active invoice. The expanded detail SHALL NOT be
indented, offset or narrowed relative to the page container, and SHALL NOT introduce a horizontal
scroll container of its own.

#### Scenario: Expansión de una factura cerrada
- **WHEN** a user expands a closed invoice from the history tab
- **THEN** the left edge of the expanded detail coincides with the left edge of the page container, with no additional indentation
- **THEN** the width of the expanded detail equals the width the same invoice would have in the active tab
- **THEN** the expanded detail is visually connected to its summary card as one continuous block

#### Scenario: Comparación entre pestañas
- **WHEN** the same invoice content is rendered in the active tab and expanded in the history tab
- **THEN** both render at the same width and the same left offset, differing only by the action buttons, which are absent for closed invoices

### Requirement: Presentación del Historial de Facturas Cerradas
The system SHALL present each closed invoice in the history tab as a summary card that indicates it
can be expanded, and that shows the billing period, the total billed and the outstanding balance at
the time of closing. Closed invoices SHALL be listed from most recently closed to oldest. An invoice
closed with no sales and no concepts SHALL be labelled as empty rather than shown as a zero amount
without context. The history tab counter SHALL count exactly the invoices that are rendered.

#### Scenario: Cliente con varias facturas cerradas
- **WHEN** a user opens the history tab for a client with more than one closed invoice
- **THEN** the invoices are listed from the most recently closed to the oldest
- **THEN** each card shows an affordance indicating it can be expanded, and reflects its expanded or collapsed state
- **THEN** each card shows the billing period, the total billed and the balance at closing

#### Scenario: Contador coherente con lo renderizado
- **WHEN** the endpoint returns invoices that are not in state CERRADA alongside the closed ones
- **THEN** the history tab counter shows only the number of closed invoices
- **THEN** the counter equals the number of cards actually rendered

#### Scenario: Factura cerrada sin movimientos
- **WHEN** a closed invoice has no sales and no additional concepts
- **THEN** its card indicates that the invoice was closed with no movements, instead of displaying a bare zero total

### Requirement: Integridad de la Exportación a Imagen tras el Rediseño
The image export logic SHALL remain unchanged by this redesign. The redesigned document SHALL remain
capturable: the exported node SHALL be able to reflow to the fixed capture width, and no ancestor of
the captured node SHALL introduce fixed positioning, transparency or hidden visibility. The exported
image SHALL include the document content — header, summary indicators, tables and totals — and SHALL
exclude the application action buttons.

#### Scenario: Exportación de la factura activa
- **WHEN** a user downloads the image of the active invoice
- **THEN** the resulting image contains the header, the summary indicators, the article table and the totals
- **THEN** the resulting image does not contain the action buttons
- **THEN** no column or row is cut off and the image is not blank

#### Scenario: Exportación de una factura del historial
- **WHEN** a user downloads the image of a closed invoice expanded from the history tab
- **THEN** the resulting image has the same completeness and quality as that of the active invoice

#### Scenario: Exportación desde una pantalla angosta
- **WHEN** a user downloads an invoice image from a viewport narrower than the capture width
- **THEN** the document reflows to the capture width before the snapshot is taken, and every column is present in the resulting image

### Requirement: Visibilidad de las devoluciones de producto en la factura del cliente
La factura de un cliente SHALL reflejar las devoluciones de producto sobrante como parte de su detalle de pagos. El `Pago` generado por una devolución SHALL computarse en `totalPagos` y, en consecuencia, reducir el `saldoDeudor` con el mismo criterio que cualquier otro pago acreditado (`saldoDeudor = totalVentas + totalConceptos − totalPagos`). El sistema SHALL NOT modificar el saldo de la cuenta corriente de un cliente por una devolución sin que ese movimiento sea visible en el detalle de la factura.

#### Scenario: La devolución aparece en el detalle de pagos
- **WHEN** un usuario abre la factura activa de un cliente que registró una devolución de producto sobrante
- **THEN** la devolución aparece como una línea en el detalle de pagos, con su fecha, su monto y su método identificándola como devolución

#### Scenario: La devolución reduce el saldo deudor de la factura
- **WHEN** se registra una devolución de producto sobrante por un monto determinado sobre la factura activa de un cliente
- **THEN** el `totalPagos` de la factura aumenta en ese monto y el `saldoDeudor` disminuye en ese mismo monto
- **THEN** ninguno de los demás totales de la factura (`totalVentas`, `totalConceptos`) se ve alterado por la devolución

#### Scenario: Método de pago no reconocido por la interfaz
- **WHEN** la factura renderiza un pago cuyo método es el de una devolución
- **THEN** el método se muestra tal como viene del backend, sin romper el renderizado ni requerir cambios en la interfaz

### Requirement: Descuento de las bandejas devueltas por producto en la deuda de bandejas de la factura
El cálculo de bandejas adeudadas de una factura SHALL contemplar las bandejas repuestas por devoluciones de producto sobrante, además de las repuestas por devoluciones de bandejas sueltas. Ambas SHALL alimentar el mismo historial de movimientos de bandejas del cliente, de modo que la factura las descuente por el mismo camino y sin distinguir su origen.

#### Scenario: Cliente que devuelve producto dentro del período de una factura
- **WHEN** un cliente registra una devolución de producto sobrante mientras tiene una factura activa
- **THEN** las bandejas de esa devolución se descuentan de las bandejas adeudadas de esa factura, igual que si hubiera devuelto bandejas sueltas

#### Scenario: Devolución fuera del período de la factura consultada
- **WHEN** la devolución de producto se registró fuera del rango de fechas de la factura que se está consultando
- **THEN** no se descuenta de esa factura, con el mismo criterio de rango que ya se aplica a las devoluciones de bandejas sueltas

#### Scenario: Devolución de más bandejas que las entregadas en la factura
- **WHEN** las bandejas devueltas dentro del período de una factura superan a las entregadas en esa misma factura
- **THEN** la deuda de bandejas de esa factura no baja de cero y el excedente se presenta por separado, sin que el origen de la devolución (producto o bandejas sueltas) cambie ese comportamiento

