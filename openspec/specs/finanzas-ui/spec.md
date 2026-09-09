## Purpose
Define requirements for the financial dashboard and reporting user interface.
## Requirements
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

### Requirement: Listado de ventas paginado por rango de fechas
El sistema SHALL permitir listar las ventas de un período con paginación, devolviendo ventas compactas (DTO `VentaLiteDTO`: id, número, fecha, cliente, total final, estado de pago, método de pago) ordenadas por fecha descendente, sin exponer entidades JPA y sin `findAll()` sin límite.

#### Scenario: Consulta paginada de ventas del período
- **WHEN** un usuario con permiso `ADMIN_DB` consulta el listado de ventas con rango de fechas, número de página y tamaño de página
- **THEN** el sistema devuelve una página con las ventas del período ordenadas por fecha descendente (DTOs compactos) y los metadatos de paginación (total de elementos, total de páginas, página actual, tamaño).

#### Scenario: Página fuera de rango
- **WHEN** el número de página solicitado supera el total de páginas disponibles
- **THEN** el sistema devuelve una página vacía (sin elementos) con los metadatos de paginación consistentes, sin errores.

### Requirement: Sección Finanzas protegida por permiso en la navegación
El sistema SHALL exponer la sección "Finanzas" en la navegación principal del frontend únicamente a usuarios con permiso `ADMIN_DB`; para el resto de los roles la entrada SHALL estar oculta y la ruta SHALL bloquear el acceso sin el permiso. Adicionalmente, el dashboard principal SHALL mostrar tarjetas KPI de métricas financieras, gráficos estadísticos y secciones desplegables interactivas para el detalle de "Ventas" y "Gastos" con buscador por texto.

#### Scenario: Usuario Jefe ve la sección Finanzas
- **WHEN** un usuario autenticado con permiso `ADMIN_DB` inicia sesión
- **THEN** el sistema muestra la entrada "Finanzas" en la navegación y la ruta responde con la pantalla de tablero de rentabilidad.

#### Scenario: Usuario sin permiso no ve ni accede a Finanzas
- **WHEN** un usuario autenticado sin permiso `ADMIN_DB` (por ejemplo VENDEDOR u OPERARIO) inicia sesión
- **THEN** el sistema no muestra la entrada "Finanzas" en la navegación, y si intenta navegar a la ruta bloqueada, el sistema redirige o muestra la pantalla de permiso denegado sin renderizar datos financieros.

#### Scenario: Tablero muestra KPIs y cruce Ventas vs Costos
- **WHEN** el usuario con `ADMIN_DB` abre la pantalla de Finanzas con un rango de fechas seleccionado y datos disponibles
- **THEN** el sistema renderiza tarjetas KPI (total ventas, total costos, ganancia neta, margen %) y gráficos visuales y estadísticos de distribución de ingresos/egresos, manteniendo ocultos los detalles de las tablas inicialmente.

#### Scenario: Usuario interactúa con KPIs para ver el detalle
- **WHEN** el usuario hace clic en la tarjeta de "Total Ventas" o "Total Costos"
- **THEN** el sistema despliega la tabla paginada correspondiente, permitiéndole usar una barra de búsqueda para filtrar los resultados, colapsando la otra vista para enfocar la lectura.

#### Scenario: Búsqueda en los listados
- **WHEN** el usuario ingresa texto en el buscador de la tabla (Ventas o Gastos)
- **THEN** el frontend dispara la consulta paginada al backend con el parámetro de búsqueda y el backend devuelve únicamente los registros que coinciden con dicho criterio en su nombre/cliente/concepto.

### Requirement: Filtro y Resumen por Usuario (Vendedor) en Finanzas
El sistema MUST permitir visualizar las ventas realizadas por cada vendedor en la sección de Finanzas, filtradas por los períodos "esta semana" o "este mes". 

#### Scenario: Visualización del Vendedor en el listado
- **WHEN** el usuario con permisos de Finanzas consulta el listado de ventas
- **THEN** cada fila de venta en la tabla debe indicar claramente el nombre del usuario (vendedor) que la registró.

#### Scenario: Filtro de ventas por usuario
- **WHEN** el usuario hace click sobre el nombre de un vendedor específico en el panel de Finanzas
- **THEN** la vista de ventas se filtra mostrando únicamente las operaciones realizadas por ese vendedor en el período activo (semana o mes).

#### Scenario: Totales por vendedor
- **WHEN** el usuario selecciona un vendedor y un período (ej. "este mes")
- **THEN** el tablero actualiza las tarjetas de KPIs (Total Ventas, Ganancia) para reflejar exclusivamente la actividad de ese usuario en ese lapso de tiempo.

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

### Requirement: Los importes de Finanzas reflejan lo efectivamente cobrado
Todos los importes de venta que informa la sección Finanzas SHALL derivarse de los valores congelados en la propia venta y en sus líneas al momento de registrarla — el precio por unidad histórico, el subtotal de cada línea y el total final de la venta — y SHALL NOT recalcularse a partir del precio de lista vigente del producto (`Producto.precio`).

Esto SHALL aplicar en particular a: el total de ventas del resumen del período, la ganancia neta y el margen derivados de él, el total final de cada venta del listado, la ganancia neta por venta, y el detalle de costo de mercadería vendida.

En consecuencia, cuando una venta se registró con un precio por unidad ajustado (menor o mayor al de lista), Finanzas SHALL informar el importe efectivamente cobrado en esa venta, y un cambio posterior del precio de lista del producto SHALL NOT alterar los importes que Finanzas informa para ventas ya registradas.

El costo de mercadería vendida SHALL seguir calculándose sobre el costo unitario histórico de cada línea y SHALL NOT verse afectado por un ajuste del precio de venta.

#### Scenario: El resumen del período incluye el importe ajustado
- **WHEN** se consulta el resumen de rentabilidad de un período que contiene una venta registrada con un precio por unidad menor al de lista
- **THEN** el total de ventas del resumen incluye el importe efectivamente cobrado en esa venta, no el que hubiera resultado del precio de lista, y la ganancia neta y el margen se calculan sobre ese total

#### Scenario: El listado de ventas muestra el total cobrado
- **WHEN** se consulta el listado de ventas del período y una de ellas tiene líneas con precio ajustado
- **THEN** el total final que muestra esa venta es el importe efectivamente cobrado, y su ganancia neta se calcula como la diferencia entre el precio por unidad histórico y el costo unitario histórico de cada línea por su cantidad

#### Scenario: Cambiar el precio de lista no altera Finanzas hacia atrás
- **WHEN** se modifica el precio de lista de un producto en el catálogo después de haber registrado ventas de ese producto
- **THEN** los importes que Finanzas informa para esas ventas anteriores permanecen idénticos, tanto en el resumen del período como en el listado de ventas y en el detalle de costo de mercadería vendida

#### Scenario: El costo de mercadería vendida no cambia por un ajuste de precio
- **WHEN** se registra una venta con un precio por unidad ajustado en una unidad de negocio con modelo de costo de mercadería vendida
- **THEN** el costo de mercadería vendida del período se calcula sobre el costo unitario histórico de la línea y es el mismo que si la venta se hubiera registrado al precio de lista, mientras que la ganancia neta sí refleja el ajuste

