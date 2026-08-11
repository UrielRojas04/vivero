## Why

Actualmente la sección de finanzas solo muestra las ganancias (income) o ingresos, pero para tener un balance real de las finanzas del vivero, el usuario necesita poder registrar y visualizar los gastos (expenses) operativos o de insumos. Además, para mejorar la usabilidad, todos los listados de finanzas deben ordenarse de más nuevos a más viejos (descendentes).

## What Changes

- Se agregará una nueva subsección de "Gastos" en la interfaz de Finanzas, visualmente a la par de las ganancias o flujo de caja.
- Se implementará un listado/tabla de gastos que muestre fecha, concepto y monto.
- Se agregará la funcionalidad de registrar un nuevo gasto manual.
- Todos los listados de la sección finanzas (ingresos, gastos) se ordenarán de forma descendente por fecha/ID (los más nuevos primero).

## Capabilities

### New Capabilities
- `finanzas-gastos`: Funcionalidad para registrar, listar y calcular los gastos del negocio.

### Modified Capabilities
- `finanzas-core`: Se modifican los requerimientos para que el ordenamiento de los listados financieros sea descendente por defecto.

## Impact

- **Frontend**: Modificación de la pantalla `Finanzas.jsx` (o similar), agregando componentes para listar y registrar gastos.
- **Backend**: Creación del modelo `Gasto` (GastoDTO, GastoService, GastoController, GastoRepository) o integración de salidas de dinero si el modelo actual ya lo soporta, y actualización del sort en listados de caja/finanzas.
- **Database**: Nueva tabla `gasto` o modificación de tabla existente de movimientos financieros.
