## Context

La sección de Finanzas actualmente expone toda la información (KPIs, barra de estado, tabla de ventas y tabla de gastos) simultáneamente. Esto genera ruido visual y dificulta la experiencia del usuario. Además, carece de elementos interactivos modernos como gráficos estadísticos o buscadores rápidos de registros.

## Goals / Non-Goals

**Goals:**
- Implementar un diseño limpio y moderno con "drill-down" (despliegue condicional) para las tablas detalladas.
- Agregar búsqueda por texto (`q`) tanto para Ventas como para Gastos.
- Incorporar gráficos estadísticos (ej. Recharts) para dar un vistazo rápido a la distribución financiera.

**Non-Goals:**
- No se modificarán las lógicas subyacentes de cálculo de rentabilidad.
- No se cambiarán las tablas o el esquema de la base de datos (solo se ampliarán los repositorios con soporte de búsqueda).

## Decisions

1. **Gestión del Estado de UI (Drill-down)**
   - **Decisión**: Usar estado local (`useState`) en `Finanzas.jsx` para controlar `showVentas` y `showGastos`, que por defecto estarán en `false`. Al hacer clic en las tarjetas KPI correspondientes, se conmutará la visibilidad de las listas.
   - **Alternativa rechazada**: Usar routing (ej. `/finanzas/ventas`). Se descarta porque el usuario quiere que sea parte del mismo tablero interactivo sin recargar o cambiar de ruta agresivamente.

2. **Gráficos Estadísticos**
   - **Decisión**: Instalar e integrar `recharts` (librería estándar, declarativa y muy usada en React) para mostrar un gráfico de torta/anillo (Distribución de Ingresos vs Egresos) y/o un gráfico de barras.
   - **Alternativa rechazada**: Escribir CSS puro para los gráficos (muy limitado y complejo de mantener para datos dinámicos).

3. **Buscador (Search)**
   - **Decisión**: Incorporar un parámetro `q` a los endpoints de `/api/finanzas/ventas` y `/api/gastos`. En el backend, las consultas paginadas usarán este texto para filtrar (por nombre de cliente en ventas, o por concepto en gastos) usando `LIKE %:q%` o equivalente.
   - **Alternativa rechazada**: Filtrado 100% frontend. Como los endpoints están paginados, el filtrado frontend solo aplicaría a la página actual de 10 elementos, arruinando la UX.

## Risks / Trade-offs

- **Risk**: Añadir `recharts` suma peso al bundle del frontend. 
  → **Mitigation**: Es una librería modular y el costo-beneficio de una vista ejecutiva profesional lo justifica totalmente.
- **Risk**: La búsqueda unificada en gastos (`UNION ALL`) podría volverse compleja si los campos a buscar difieren mucho entre Insumos y Gastos.
  → **Mitigation**: Filtraremos usando `ILIKE %:q%` de PostgreSQL de forma directa en los campos concatenados (concepto/nombre).
