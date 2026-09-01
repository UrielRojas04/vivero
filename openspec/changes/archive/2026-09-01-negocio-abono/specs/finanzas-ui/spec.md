## MODIFIED Requirements

### Requirement: Resumen de rentabilidad del período
El sistema SHALL proveer un endpoint de agregación financiera que devuelva, para un período (fecha desde/hasta con hoy como límite por defecto), los totales de ventas, el total de costos y la ganancia neta, junto al margen de ganancia porcentual. El endpoint SHALL exponer los datos vía DTO de agregado (nunca entidades JPA) y SHALL requerir el permiso `ADMIN_DB`.

La composición del total de costos SHALL determinarse por el modelo de costos declarado en la propia `UnidadNegocio` activa y MUST NOT decidirse comparando el identificador de la unidad contra valores literales en el código:
- Unidades con modelo **basado en insumos** (Vivero, Abono): el total de costos SHALL ser la suma de los gastos de insumos de la unidad en el período más los gastos financieros de la unidad en el período.
- Unidades con modelo **basado en costo de mercadería vendida** (Herramientas): el total de costos SHALL ser el costo de mercadería vendida del período más los gastos financieros de la unidad en el período.

Los gastos de insumos SHALL computarse únicamente sobre los insumos de la unidad activa. La ganancia neta SHALL ser el total de ventas menos el total de costos.

#### Scenario: Usuario con ADMIN_DB consulta el resumen del período
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el resumen de rentabilidad con un rango de fechas válido
- **THEN** el sistema devuelve un DTO con `totalVentas`, `totalCostos`, `gananciaNeta` (totalVentas − totalCostos) y `margen` (gananciaNeta / totalVentas, 0 si no hay ventas) calculados sobre las ventas y costos del período según el modelo de costos de la unidad activa.

#### Scenario: Usuario sin permiso consulta el resumen
- **WHEN** un usuario sin permiso `ADMIN_DB` consulta el endpoint de resumen
- **THEN** el sistema rechaza la solicitud con 403 Forbidden y no expone ningún dato financiero.

#### Scenario: Período sin ventas
- **WHEN** no existen ventas en el rango de fechas consultado
- **THEN** el sistema devuelve el resumen con totales en cero (totalVentas, totalCostos y gananciaNeta en 0; margen en 0) sin errores.

#### Scenario: Resumen de la unidad Abono
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el resumen con la unidad activa "Abono"
- **THEN** el total de costos se compone de los gastos de insumos de la unidad Abono más sus gastos financieros, sin ningún costo unitario por producto ni costo de mercadería vendida

#### Scenario: Los números de Vivero y Herramientas no cambian
- **WHEN** se consulta el resumen de las unidades "Vivero" y "Herramientas" con los mismos datos y el mismo rango que antes del change
- **THEN** los valores de `totalVentas`, `totalCostos`, `gananciaNeta` y `margen` son idénticos a los previos al change

## ADDED Requirements

### Requirement: Detalle de Gastos por Modelo de Costos
La pantalla de Finanzas SHALL adaptar el desglose de costos al modelo de costos de la unidad activa, resuelto a partir de los datos que devuelve el backend y no a partir de identificadores de unidad escritos literalmente en el frontend. Para unidades con modelo basado en insumos, el desglose SHALL listar insumos y gastos; para unidades con modelo basado en costo de mercadería vendida, SHALL listar el detalle por línea de venta.

#### Scenario: Desglose en la unidad Abono
- **WHEN** el jefe abre la sección de gastos de Finanzas con la unidad activa "Abono"
- **THEN** ve el desglose de insumos y gastos del período, sin columnas ni filas de costo de mercadería vendida

#### Scenario: Desglose de Herramientas sin cambios
- **WHEN** el jefe abre la sección de gastos de Finanzas con la unidad activa "Herramientas"
- **THEN** ve exactamente el mismo desglose por línea de venta que antes del change

#### Scenario: Desglose de Vivero sin cambios
- **WHEN** el jefe abre la sección de gastos de Finanzas con la unidad activa "Vivero"
- **THEN** ve exactamente el mismo desglose de insumos y gastos que antes del change
