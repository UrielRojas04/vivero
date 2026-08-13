## Context

Actualmente el modelo `Venta` en la base de datos ya posee una relación `@ManyToOne` hacia `Usuario`, pero al crear una venta en el `VentaServiceImpl` este campo no se está poblando con el usuario autenticado que realiza la operación. El frontend necesita tener visibilidad sobre quién efectúa cada venta para implementar la vista de rendimiento por vendedor en la sección de Finanzas de la unidad Herramientas.

## Goals / Non-Goals

**Goals:**
- Asegurar que todas las ventas de aquí en adelante registren correctamente el `usuario` creador.
- Exponer el nombre del vendedor en los listados de ventas y detalle de finanzas (`VentaLiteDTO`).
- Implementar controles de filtro por vendedor en la UI de Finanzas, afectando la lista de ventas y los KPIs (Total, Ganancia).

**Non-Goals:**
- No se implementará un sistema complejo de permisos cruzados (ej. un vendedor solo viendo sus ventas), actualmente los reportes en Finanzas son para `ADMIN_DB`.
- No se modificarán ventas históricas pasadas que no tengan usuario asociado (quedarán como null o "Vendedor Desconocido").

## Decisions

**Backend - Asignación del Usuario:**
Se modificará `VentaServiceImpl` para que recupere el `username` del usuario logueado mediante el `SecurityContextHolder`. Si el usuario no existe en la base, lanzará excepción, de lo contrario se lo asigna a la `Venta`.
*Alternativa considerada*: Recibir el usuario desde el frontend. *Rechazada* por motivos de seguridad (spoofing de identidad).

**Backend - DTO y Repositorio:**
`VentaLiteDTO` incluirá un nuevo campo `String vendedorNombre`. Si el repositorio requiere, se ajustará `finanzasService.obtenerResumen(...)` para aceptar un `usuarioId` opcional como filtro, permitiendo recalcular ganancias netas filtradas.

**Frontend - Componente Finanzas:**
En la sección `Finanzas.jsx` se añadirá un `<select>` o lista de botones (tabs) con los vendedores que han realizado ventas en ese período para filtrar dinámicamente las ventas y recalcular el dashboard.

## Risks / Trade-offs

- **Risk**: Las ventas viejas no tendrán `usuarioId`, por lo que el filtrado por vendedor en períodos pasados mostrará ventas "sin asignar".
- **Mitigation**: El UI debe contemplar gracefully el caso `vendedorNombre === null` mostrando un fallback como "Sistema/Sin registrar".
