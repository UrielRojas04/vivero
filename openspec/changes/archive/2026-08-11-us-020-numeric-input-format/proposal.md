## Why

Actualmente, el sistema utiliza inputs numéricos estándar (o de texto) para el ingreso de valores monetarios o cantidades grandes, lo que dificulta la legibilidad para los usuarios mientras escriben (ej. tipean "6000000" y no saben a simple vista si escribieron 6 millones o 600 mil). 
Es necesario mejorar la experiencia de usuario y prevenir errores de carga implementando un formateo automático en los inputs que agregue los separadores de miles y maneje correctamente los decimales a medida que el usuario tipea.

## What Changes

- Identificación de todos los inputs numéricos (especialmente monetarios como precios, montos de gastos, ajustes de saldo) en el frontend.
- Implementación de un componente reutilizable de input numérico o un hook que formatee el valor mostrado al usuario con separadores de miles (puntos) y mantenga el valor numérico puro para el estado interno y envío a la API.
- Actualización de los formularios clave (creación de producto, ajuste de saldo, nuevo gasto, etc.) para utilizar este nuevo input formateado.

## Capabilities

### New Capabilities
- `ui-numeric-formatting`: Funcionalidad transversal para el manejo y formateo en tiempo real de inputs monetarios y numéricos grandes en la UI.

### Modified Capabilities
- Ninguna (el formato es un detalle de implementación transversal de UI).

## Impact

- **Frontend:** Creación de un nuevo componente `FormattedNumberInput` o directiva similar, impactando en varios formularios (Gastos, Productos, Ajustes de Saldo, Pagos).
- **Backend:** Sin impacto directo (el frontend se asegurará de desformatear el número y enviarlo como un tipo numérico estándar a las APIs).
