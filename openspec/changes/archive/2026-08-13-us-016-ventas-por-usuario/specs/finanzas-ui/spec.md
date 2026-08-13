## ADDED Requirements

### Requirement: Filtro y Resumen por Usuario (Vendedor) en Finanzas
El sistema MUST permitir visualizar las ventas realizadas por cada vendedor en la sección de Finanzas, filtradas por los períodos "esta semana" o "este mes". 

#### Scenario: Visualización del Vendedor en el listado
- **WHEN** el usuario con permisos de Finanzas consulta el listado de ventas
- **THEN** cada fila de venta en la tabla debe indicar claramente el nombre del usuario (vendedor) que la registró.

#### Scenario: Filtro de ventas por usuario
- **WHEN** el usuario hace click sobre el nombre de un vendedor específico en el panel de Finanzas
- **THEN** la vista de ventas se filtra mostrando únicamente las operaciones realizadas por ese vendedor en el período activo (semana o mes).

#### Scenario: Totales por vendedor
- **WHEN** el usuario selecciona un vendedor y un período (ej. "este mes")
- **THEN** el tablero actualiza las tarjetas de KPIs (Total Ventas, Ganancia) para reflejar exclusivamente la actividad de ese usuario en ese lapso de tiempo.
