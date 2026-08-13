## ADDED Requirements

### Requirement: Widget de Conversión Semillas ↔ Bandejas
El sistema SHALL proveer una interfaz visual (widget) que permita al usuario convertir rápidamente entre cantidad de bandejas y cantidad de semillas, seleccionando un tipo de bandeja predefinido (ej. 128, 200, 288 celdas).

#### Scenario: Convertir de bandejas a semillas
- **WHEN** el usuario ingresa "10" en el campo de bandejas y selecciona el tipo "288 celdas"
- **THEN** el sistema calcula y muestra instantáneamente "2880 semillas".

#### Scenario: Convertir de semillas a bandejas
- **WHEN** el usuario ingresa "2880" en el campo de semillas y selecciona el tipo "288 celdas"
- **THEN** el sistema calcula y muestra instantáneamente "10 bandejas".

#### Scenario: Bandejas fraccionarias
- **WHEN** el usuario ingresa una cantidad de semillas que no es múltiplo exacto de la capacidad de la bandeja
- **THEN** el sistema muestra la cantidad de bandejas en formato decimal o indicando sobrante (ej. "10.5 bandejas").
