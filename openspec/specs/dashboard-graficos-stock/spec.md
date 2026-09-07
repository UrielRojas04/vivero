# dashboard-graficos-stock Specification

## Purpose
TBD - created by archiving change grafico-stock-unidades. Update Purpose after archive.
## Requirements
### Requirement: Gráfico de Torta de Stock por Negocio
The system SHALL display a pie chart summarizing the current physical stock of products. The data MUST be strictly filtered by the currently active business unit in the user interface.

#### Scenario: Visualización en Dashboard
- **WHEN** the user navigates to the Dashboard and has an active business unit selected
- **THEN** the system displays a pie chart showing the stock distribution of products belonging to that specific business unit.

#### Scenario: Cambio de Negocio
- **WHEN** the user changes the active business unit in the application
- **THEN** the pie chart automatically updates to reflect the stock distribution of the newly selected business unit.

#### Scenario: Demasiados Productos
- **WHEN** a business unit has more than 10 different products with stock
- **THEN** the pie chart displays the top 9 products by stock quantity and groups the rest into an "Otros" slice to maintain readability.

