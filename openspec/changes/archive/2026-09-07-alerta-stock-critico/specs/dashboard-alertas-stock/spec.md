## ADDED Requirements

### Requirement: Alertas de Stock Crítico en Dashboard
The system SHALL display a widget on the Dashboard showing the products with the lowest stock for the currently active business unit. The list MUST include products with zero stock and MUST be ordered in ascending order by stock quantity. The list SHALL be limited to a maximum of 10 items.

#### Scenario: View critical stock items on Dashboard
- **WHEN** the user navigates to the Dashboard
- **THEN** the system displays a "Alerta de Stock Crítico" card showing up to 10 products with the lowest stock.

#### Scenario: Navigate to full catalog
- **WHEN** the user clicks the "Ver todos" link on the critical stock card
- **THEN** the system navigates to the full products catalog.
