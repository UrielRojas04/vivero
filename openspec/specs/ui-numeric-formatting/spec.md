## ADDED Requirements

### Requirement: Formateo automático de inputs numéricos monetarios
El sistema SHALL formatear visualmente los valores ingresados en los inputs monetarios y de cantidades grandes utilizando separadores de miles y coma decimal en tiempo real, de acuerdo al locale de Argentina (`es-AR`). El valor subyacente que se mantiene en el estado de la aplicación y se envía a la API MUST mantenerse como un número puro.

#### Scenario: Ingreso de miles
- **WHEN** el usuario ingresa el número "6000" en un campo de monto
- **THEN** el sistema formatea visualmente el input para que muestre "6.000"
- **AND** el valor interno almacenado se mantiene como `6000`

#### Scenario: Ingreso de millones
- **WHEN** el usuario ingresa el número "6000000"
- **THEN** el sistema formatea visualmente el input para que muestre "6.000.000"
- **AND** el valor interno almacenado se mantiene como `6000000`

#### Scenario: Ingreso con decimales
- **WHEN** el usuario ingresa "1500,50" o "1500.50"
- **THEN** el sistema formatea visualmente el input para que muestre "1.500,50"
- **AND** el valor interno almacenado se mantiene como `1500.50`

#### Scenario: Eliminación de dígitos
- **WHEN** el usuario presiona Backspace para borrar dígitos de "6.000"
- **THEN** el sistema actualiza dinámicamente los separadores de miles para que se adapten a la nueva longitud (ej. borra un cero y se ve "600")
