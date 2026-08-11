## ADDED Requirements

### Requirement: Resumen de rentabilidad del período
El sistema SHALL proveer un endpoint de agregación financiera que devuelva, para un período (fecha desde/hasta con hoy como límite por defecto), los totales de ventas, el total de costos (productos vendidos + insumos del período) y la ganancia neta, junto al margen de ganancia porcentual. El endpoint SHALL exponer los datos vía DTO de agregado (nunca entidades JPA) y SHALL requerir el permiso `ADMIN_DB`.

#### Scenario: Usuario con ADMIN_DB consulta el resumen del período
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el resumen de rentabilidad con un rango de fechas válido
- **THEN** el sistema devuelve un DTO con `totalVentas`, `totalCostos`, `gananciaNeta` (totalVentas − totalCostos) y `margen` (gananciaNeta / totalVentas, 0 si no hay ventas) calculados sobre las ventas y costos del período.

#### Scenario: Usuario sin permiso consulta el resumen
- **WHEN** un usuario sin permiso `ADMIN_DB` consulta el endpoint de resumen
- **THEN** el sistema rechaza la solicitud con 403 Forbidden y no expone ningún dato financiero.

#### Scenario: Período sin ventas
- **WHEN** no existen ventas en el rango de fechas consultado
- **THEN** el sistema devuelve el resumen con totales en cero (totalVentas, totalCostos y gananciaNeta en 0; margen en 0) sin errores.

### Requirement: Listado de ventas paginado por rango de fechas
El sistema SHALL permitir listar las ventas de un período con paginación, devolviendo ventas compactas (DTO `VentaLiteDTO`: id, número, fecha, cliente, total final, estado de pago, método de pago) ordenadas por fecha descendente, sin exponer entidades JPA y sin `findAll()` sin límite.

#### Scenario: Consulta paginada de ventas del período
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el listado de ventas con rango de fechas, número de página y tamaño de página
- **THEN** el sistema devuelve una página con las ventas del período ordenadas por fecha descendente (DTOs compactos) y los metadatos de paginación (total de elementos, total de páginas, página actual, tamaño).

#### Scenario: Página fuera de rango
- **WHEN** el número de página solicitado supera el total de páginas disponibles
- **THEN** el sistema devuelve una página vacía (sin elementos) con los metadatos de paginación consistentes, sin errores.

### Requirement: Sección Finanzas protegida por permiso en la navegación
El sistema SHALL exponer la sección "Finanzas" en la navegación principal del frontend únicamente a usuarios con permiso `ADMIN_DB`; para el resto de los roles la entrada SHALL estar oculta y la ruta SHALL bloquear el acceso sin el permiso.

#### Scenario: Usuario Jefe ve la sección Finanzas
- **WHEN** un usuario autenticado con permiso `ADMIN_DB` inicia sesión
- **THEN** el sistema muestra la entrada "Finanzas" en la navegación y la ruta responde con la pantalla de tablero de rentabilidad.

#### Scenario: Usuario sin permiso no ve ni accede a Finanzas
- **WHEN** un usuario autenticado sin permiso `ADMIN_DB` (por ejemplo VENDEDOR u OPERARIO) inicia sesión
- **THEN** el sistema no muestra la entrada "Finanzas" en la navegación, y si intenta navegar a la ruta bloqueada, el sistema redirige o muestra la pantalla de permiso denegado sin renderizar datos financieros.

#### Scenario: Tablero muestra KPIs y cruce Ventas vs Costos
- **WHEN** el usuario con `ADMIN_DB` abre la pantalla de Finanzas con un rango de fechas seleccionado y datos disponibles
- **THEN** el sistema renderiza tarjetas KPI (total ventas, total costos, ganancia neta, margen %) y el cruce Ventas vs Costos del período, con feedback de carga y de error vía `useUIStore` y sin `alert`/`confirm` nativos.