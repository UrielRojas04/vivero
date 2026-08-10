## Context
En la UI actual (`NuevaVenta.jsx`), la creación de una venta es un proceso iterativo donde el usuario selecciona un cliente y va agregando productos al carrito, definiendo cantidades y opcionalmente un descuento. Todo este estado (detalles, cliente, descuento, pago, nota) reside en el estado local de React (`useState`).
El problema es que si el usuario navega a otra sección de la aplicación, el componente se desmonta y el estado se pierde. 

## Goals / Non-Goals

**Goals:**
- Persistir el carrito de compras a nivel global en la memoria durante toda la sesión.
- Guardar el estado localmente (`localStorage` o `sessionStorage`) de modo que si el usuario refresca la página, pueda continuar su venta.

**Non-Goals:**
- No se persistirán los carritos en el backend ni en la base de datos de forma temporal.

## Decisions

1. **Gestor de estado global**: Se utilizará **Zustand** para crear un `useCartStore`. 
   - **Rationale**: Zustand ya se está usando en el proyecto (ej. `useAuthStore`). Es liviano, no requiere decorators ni wrappers complejos como Redux, y se integra bien con hooks.

2. **Persistencia**: Se utilizará el middleware `persist` de Zustand apuntando a `sessionStorage` (o `localStorage` temporal).
   - **Rationale**: Permite que al recargar la pestaña el estado se restaure mágicamente. 

## Risks / Trade-offs

- **Risk:** Datos obsoletos (ej. un producto en el carrito que se queda sin stock mientras el usuario navega).
  - **Mitigation:** El backend y el frontend (vía SSE implementado anteriormente) se encargan de validar el stock. Además, el `useStockEvents` actualizará los stocks en vivo. Si al volver, la validación detecta problemas, avisará al usuario en el momento de procesar o ajustar la cantidad (ya implementado en `NuevaVenta.jsx`).
