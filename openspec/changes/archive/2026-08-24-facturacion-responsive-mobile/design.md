## Context

El sistema ya implementa patrones básicos de diseño responsivo (con Tailwind CSS y clases modulares), pero la sección nueva de Facturación, que incluye tablas complejas y componentes flotantes, no ha sido optimizada. El usuario experimenta recortes de contenido y desbordes en vistas angostas (como celulares y ventanas divididas en PC).

## Goals / Non-Goals

**Goals:**
- Que las vistas `FacturasPage` y `FacturaClientePage` sean 100% usables en resoluciones móviles (desde 320px de ancho).
- Mantener la integridad de los datos presentados: usar scroll horizontal controlado en lugar de colapsar columnas o esconder información crítica.
- Ajustar botones, modales y layouts de resumen financiero para evitar solapamientos.

**Non-Goals:**
- Rediseñar el frontend completo. Solo se aplica responsividad sobre los layouts actuales.
- Cambios en el backend o en el modelo de datos.

## Decisions

- **Tablas Responsivas**: Seguiremos el estándar actual del proyecto de agregar `overflow-x-auto` en el contenedor padre de las tablas (o `w-full` temporal si la vista se está exportando).
- **Cards de Resumen**: Usaremos las utilidades de grid de Tailwind CSS (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) para que las tarjetas de métricas colapsen en columnas verticales o mosaicos al achicarse el viewport.
- **Acciones y Cabecera**: Los botones principales y badges de estado se reubicarán usando flex-wrap (`flex-wrap gap-y-2`) o cambiarán de disposición horizontal a vertical si el espacio es limitado.

## Risks / Trade-offs

- **Interacción con html-to-image** → El cambio en anchos y márgenes móviles no debe interferir con la lógica que fuerza 1000px de ancho para la exportación de facturas. Se deberá asegurar que las clases dinámicas de responsividad solo apliquen a la vista normal y no afecten el layout congelado.
