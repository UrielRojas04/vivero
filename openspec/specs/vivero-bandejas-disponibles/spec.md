## ADDED Requirements

### Requirement: Reporte de Bandejas Disponibles para Venta
The system SHALL provide a calculation of available trays (bandejas) for the Vivero business unit. The available stock MUST be calculated as the total physical stock of the product MINUS the total `cantidadBandejas` reserved from active `RegistroSemilla` entries for that same plant variety.

#### Scenario: View available trays for Vivero
- **WHEN** the user requests the available trays report for Vivero
- **THEN** the system returns a list containing the plant variety name, the physical stock, the reserved quantity (encargadas), and the net available quantity.
