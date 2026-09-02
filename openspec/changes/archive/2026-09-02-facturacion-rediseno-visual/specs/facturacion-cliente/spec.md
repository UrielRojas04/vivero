## MODIFIED Requirements

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

## ADDED Requirements

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
