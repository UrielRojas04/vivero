## Why

El usuario necesita visibilidad rápida del detalle que compone el total mostrado en la tarjeta "Valores a Depositar (Cheques)" o equivalentes en el dashboard de Finanzas. Actualmente, el número total se muestra, pero para ver cuáles cheques lo componen hay que navegar a la pestaña de Cheques y buscar/filtrar manualmente. 

## What Changes

- La tarjeta de cheques en `Finanzas.jsx` pasará a ser clickeable (interactiva).
- Al hacer click, se abrirá un modal flotante.
- El modal mostrará una tabla resumida con el listado de cheques que están pendientes (`EN_CARTERA`).

## Capabilities

### New Capabilities
- `finanzas-cheques-modal`: Modal de visualización rápida de cheques pendientes desde el dashboard financiero.

### Modified Capabilities
- `gestion-cheques`: Se modificará para exponer un endpoint o permitir al frontend consultar cheques con estado `EN_CARTERA` de manera simplificada si fuera necesario (aunque ya existe el paginado, se reutilizará).

## Impact

- `frontend/src/pages/Finanzas.jsx` (UI y lógicas del modal).
- `frontend/src/components/` (posiblemente un nuevo componente `ChequesPendientesModal.jsx`).
- No requiere impacto crítico en backend, ya que el endpoint `getAll` soporta filtros si fuera necesario, o se puede cargar la vista.
