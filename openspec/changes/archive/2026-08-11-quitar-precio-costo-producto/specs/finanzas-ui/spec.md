## MODIFIED Requirements

### Requirement: Resumen de rentabilidad del período
El sistema SHALL proveer un endpoint de agregación financiera que devuelva, para un período (fecha desde/hasta con hoy como límite por defecto), los totales de ventas, el total de costos (únicamente provenientes de gastos e insumos registrados en el período) y la ganancia neta, junto al margen de ganancia porcentual. El endpoint SHALL exponer los datos vía DTO de agregado (nunca entidades JPA) y SHALL requerir el permiso `ADMIN_DB`. Adicionalmente, el cálculo de ganancia neta SHALL descontar también el total de gastos del período obtenidos.

#### Scenario: Usuario con ADMIN_DB consulta el resumen del período
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el resumen de rentabilidad con un rango de fechas válido
- **THEN** el sistema devuelve un DTO con `totalVentas`, `totalCostos` (exclusivamente proveniente de Gasto), `gananciaNeta` (totalVentas − totalCostos) y `margen` (gananciaNeta / totalVentas, 0 si no hay ventas) calculados sobre las ventas y costos del período.

#### Scenario: Usuario sin permiso consulta el resumen
- **WHEN** un usuario sin permiso `ADMIN_DB` consulta el endpoint de resumen
- **THEN** el sistema rechaza la solicitud con 403 Forbidden y no expone ningún dato financiero.

#### Scenario: Período sin ventas
- **WHEN** no existen ventas en el rango de fechas consultado
- **THEN** el sistema devuelve el resumen con totales en cero (totalVentas, totalCostos y gananciaNeta en 0; margen en 0) sin errores.
