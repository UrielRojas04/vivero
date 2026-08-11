## MODIFIED Requirements

### Requirement: Tablero muestra KPIs y cruce Ventas vs Costos
El sistema SHALL exponer la sección "Finanzas" en la navegación principal del frontend únicamente a usuarios con permiso `ADMIN_DB`; para el resto de los roles la entrada SHALL estar oculta y la ruta SHALL bloquear el acceso sin el permiso. Adicionalmente, el sistema SHALL mostrar una sección de "Gastos" visualmente a la par de los ingresos, con listados ordenados de más nuevos a más viejos (descendente).

#### Scenario: Tablero muestra KPIs y cruce Ventas vs Costos
- **WHEN** el usuario con `ADMIN_DB` abre la pantalla de Finanzas con un rango de fechas seleccionado y datos disponibles
- **THEN** el sistema renderiza tarjetas KPI (total ventas, total costos, ganancia neta, margen %) y el cruce Ventas vs Costos del período, con feedback de carga y de error vía `useUIStore` y sin `alert`/`confirm` nativos. Adicionalmente muestra la lista de Gastos ordenados descendentemente.
