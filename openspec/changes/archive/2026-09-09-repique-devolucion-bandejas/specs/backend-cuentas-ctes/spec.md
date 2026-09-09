## ADDED Requirements

### Requirement: Generación de crédito por devolución
El sistema MUST permitir generar un ajuste de saldo positivo (crédito) a favor del cliente como compensación por productos devueltos.

#### Scenario: Acreditación por devolución de bandejas llenas
- **WHEN** se confirma la devolución de bandejas llenas
- **THEN** el saldo en pesos de la cuenta corriente del cliente disminuye (o aumenta el saldo a favor) por el valor acordado de los productos devueltos
