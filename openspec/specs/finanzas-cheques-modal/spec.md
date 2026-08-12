## ADDED Requirements

### Requirement: Detalle de cheques en cartera desde Finanzas
El sistema SHALL permitir al usuario visualizar el detalle de los cheques pendientes directamente desde el dashboard de finanzas.

#### Scenario: Abrir modal de detalle
- **WHEN** el usuario hace click en la tarjeta de "Valores a Depositar (Cheques)" en Finanzas
- **THEN** el sistema abre un modal superpuesto
- **AND** renderiza una tabla con la información de los cheques que actualmente están en estado `EN_CARTERA` (banco, monto, fecha de recepción, emisor)

#### Scenario: Cierre del modal
- **WHEN** el usuario hace click en el botón de cerrar del modal de detalle de cheques
- **THEN** el modal se oculta y el usuario vuelve a ver el dashboard principal de Finanzas sin perder su contexto
