## ADDED Requirements

### Requirement: Filtrado por Marca en Herramientas
El sistema MUST permitir al usuario filtrar los productos en la sección de Stock (catálogo) según su marca cuando se encuentre en la unidad de negocio "Herramientas". 

#### Scenario: Visualización de filtros de marca
- **WHEN** el usuario navega a la sección de Stock y selecciona la unidad de negocio "Herramientas" (id 2)
- **THEN** el sistema MUST mostrar opciones (tabs o chips) con todas las marcas disponibles de los productos actuales, junto con una opción "Todas".

#### Scenario: Filtrado activo por marca
- **WHEN** el usuario hace click en una marca específica (ej. "TOTAL")
- **THEN** la grilla de productos se actualiza para mostrar únicamente aquellos productos que tienen esa marca exacta.
