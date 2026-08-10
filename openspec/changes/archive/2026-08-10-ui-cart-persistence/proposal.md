## Why

Actualmente, el estado del carrito (cliente seleccionado, productos añadidos, descuento, notas, etc.) reside de forma local en el componente `NuevaVenta.jsx`. Si el usuario navega a otra sección del sistema (ej. para consultar el precio de un insumo) y vuelve, el estado se pierde y el carrito se reinicia. Esto genera una mala experiencia de usuario (UX) para los cajeros que operan el sistema de forma dinámica.

## What Changes

- Extraer el estado local de la vista `NuevaVenta.jsx` hacia un manejador de estado global de Zustand (`useCartStore.js` o similar).
- Implementar persistencia de este estado en el `localStorage` (o `sessionStorage`) para que sobreviva recargas accidentales de la página.
- Refactorizar `NuevaVenta.jsx` para que consuma y actualice este store en lugar de usar `useState`.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `ventas-core`: Se modificará el requerimiento de registro de venta para especificar que el armado de la venta (carrito) debe ser persistente ante navegaciones dentro de la sesión activa.

## Impact

- **Frontend**: 
  - `NuevaVenta.jsx`: Refactor completo de hooks locales a Zustand.
  - Creación de nuevo store `useCartStore.js`.
- **Backend**: Sin impacto.
- **Base de Datos**: Sin impacto.
