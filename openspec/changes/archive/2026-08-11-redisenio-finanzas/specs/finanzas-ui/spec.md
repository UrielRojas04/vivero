## MODIFIED Requirements

### Requirement: Tablero muestra KPIs y cruce Ventas vs Costos
El sistema SHALL exponer la sección "Finanzas" en la navegación principal del frontend únicamente a usuarios con permiso `ADMIN_DB`. El sistema SHALL mostrar un dashboard principal compuesto de:
1. Tarjetas KPI de métricas financieras.
2. Gráficos visuales y estadísticos de distribución de ingresos/egresos.
3. Secciones desplegables interactivas para el detalle de "Ventas" y "Gastos", las cuales SHALL contar con un buscador por texto que permita filtrar los registros desde el backend.

#### Scenario: Tablero muestra KPIs y cruce Ventas vs Costos
- **WHEN** el usuario con `ADMIN_DB` abre la pantalla de Finanzas con un rango de fechas seleccionado y datos disponibles
- **THEN** el sistema renderiza tarjetas KPI (total ventas, total costos, ganancia neta, margen %) y gráficos estadísticos, manteniendo ocultos los detalles de las tablas inicialmente.

#### Scenario: Usuario interactúa con KPIs para ver el detalle
- **WHEN** el usuario hace clic en la tarjeta de "Total Ventas" (o similar designado)
- **THEN** el sistema despliega la tabla paginada de Ventas, permitiéndole usar una barra de búsqueda para filtrar los resultados, colapsando o ignorando la vista de Gastos para enfocar la lectura.

#### Scenario: Búsqueda en los listados
- **WHEN** el usuario ingresa texto en el buscador de la tabla (Ventas o Gastos)
- **THEN** el frontend dispara la consulta paginada al backend con el parámetro de búsqueda y el backend devuelve únicamente los registros que coinciden con dicho criterio en su nombre/cliente/concepto.
