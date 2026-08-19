## MODIFIED Requirements

### Requirement: Layout Responsive
El frontend SHALL adaptar su layout principal (Sidebar, Navbar y Contenedor), sus vistas de catálogos y pantallas complejas como el Punto de Venta, la gestión de Clientes / Cuentas Corrientes y el módulo de Finanzas / Cheques dinámicamente según el tamaño de la pantalla del dispositivo.

#### Scenario: Pantallas Móviles (menor a 768px)
- **WHEN** la aplicación se visualiza en un dispositivo móvil
- **THEN** el Sidebar está oculto por defecto
- **THEN** el botón hamburguesa es visible en el Navbar
- **THEN** al clickear el botón hamburguesa, el Sidebar se abre como un Drawer superpuesto con un fondo oscuro (backdrop)
- **THEN** al clickear el fondo oscuro, el Sidebar se cierra
- **THEN** el contenedor principal ocupa el 100% del ancho de la pantalla sin márgenes laterales extra
- **THEN** las tablas de datos (ej. catálogos) se vuelven scrollables horizontalmente para evitar romper la vista
- **THEN** los modales de formulario abarcan todo el ancho y alto disponible en la pantalla
- **THEN** las barras de búsqueda y botones principales de las páginas de catálogo se apilan verticalmente ocupando el ancho completo
- **THEN** en pantallas divididas como Nueva Venta, los componentes secundarios (ej. Carrito) pasan a ocultarse por defecto y se abren vía modal o panel desplegable
- **THEN** todos los campos monetarios o de cantidades en modales utilizan teclados numéricos nativos
- **THEN** los modales de cuenta corriente del cliente (ajuste de saldo, devolución de bandejas, historial de bandejas) se presentan a pantalla completa, con el encabezado fijo arriba, el contenido scrolleable y la botonera de acciones fija abajo ocupando el ancho completo
- **THEN** el historial de bandejas dentro de ese modal se presenta como tarjetas apiladas y su tabla permanece oculta, sin scroll horizontal en ningún ancho
- **THEN** los listados tabulares densos del módulo de Finanzas (detalle de ventas y cheques en cartera) se presentan como tarjetas y sus tablas permanecen ocultas
- **THEN** los modales de cheque (registro de cheque manual y actualización de estado) se presentan a pantalla completa, con el encabezado fijo arriba, el contenido scrolleable y la botonera de acciones fija abajo ocupando el ancho completo
- **THEN** los formularios en línea del módulo de Finanzas (alta rápida de gasto) apilan sus campos verticalmente ocupando el ancho completo, sin comprimir los inputs

#### Scenario: Pantallas de Escritorio (mayor a 768px)
- **WHEN** la aplicación se visualiza en escritorio o tablet grande
- **THEN** el Sidebar es visible permanentemente como una columna fija
- **THEN** el botón hamburguesa está oculto
- **THEN** el contenedor principal respeta el margen izquierdo correspondiente al Sidebar
- **THEN** las tablas de datos ocupan el ancho del contenedor sin necesidad de scroll horizontal
- **THEN** los modales se presentan centrados con dimensiones máximas definidas (no fullscreen)
- **THEN** las barras de búsqueda y botones principales se presentan alineados en la misma fila horizontal
- **THEN** en pantallas divididas como Nueva Venta, ambos paneles se muestran simultáneamente (ej. Búsqueda a la izquierda, Carrito a la derecha)
- **THEN** los modales de cuenta corriente del cliente conservan su presentación centrada con bordes redondeados y alto máximo acotado
- **THEN** el historial de bandejas dentro de ese modal conserva su presentación tabular completa y las tarjetas permanecen ocultas
- **THEN** los listados del módulo de Finanzas y de la cartera de cheques conservan su presentación tabular completa y las tarjetas permanecen ocultas
- **THEN** los modales de cheque conservan su presentación centrada con bordes redondeados y alto máximo acotado

## ADDED Requirements

### Requirement: Historial de Bandejas Priorizado en Mobile
El frontend SHALL presentar el historial de movimientos de bandejas de un cliente en pantallas móviles como tarjetas apiladas que prioricen el tipo de movimiento y la cantidad de bandejas por sobre el resto de los datos, manteniendo la tabla completa en escritorio y sin requerir scroll horizontal en ningún ancho de pantalla.

#### Scenario: Historial en pantalla móvil
- **WHEN** el historial de bandejas se visualiza en una pantalla menor a 768px
- **THEN** cada movimiento se presenta como una tarjeta y la tabla permanece oculta
- **THEN** el contenido del historial no requiere desplazamiento horizontal en ningún momento
- **THEN** la tarjeta muestra la cantidad de bandejas como el elemento de mayor jerarquía visual, con tipografía destacada
- **THEN** la tarjeta muestra el tipo de movimiento como una etiqueta de color siempre visible
- **THEN** la tarjeta muestra la fecha del movimiento, su detalle asociado y el usuario responsable como datos secundarios de menor peso visual

#### Scenario: Historial en pantalla de escritorio
- **WHEN** el historial de bandejas se visualiza en una pantalla mayor o igual a 768px
- **THEN** los movimientos se presentan en la tabla completa de fecha, tipo, cantidad, detalle y usuario
- **THEN** las tarjetas permanecen ocultas
- **THEN** el panel del modal dispone de un ancho máximo suficiente para que las cinco columnas se lean sin comprimirse ni requerir scroll horizontal

#### Scenario: Movimiento originado en una venta
- **WHEN** un movimiento del historial tiene una venta asociada
- **THEN** tanto la tarjeta como la fila de la tabla identifican la venta de origen por su número
- **THEN** ambas vistas obtienen esa descripción del mismo origen de presentación, sin duplicar la lógica

#### Scenario: Movimiento sin venta asociada
- **WHEN** un movimiento del historial no tiene una venta asociada
- **THEN** tanto la tarjeta como la fila de la tabla lo identifican como una devolución directa

#### Scenario: Movimiento de entrega y movimiento de devolución
- **WHEN** un movimiento es de tipo entrega
- **THEN** su etiqueta de tipo se presenta con tono de salida (naranja) en ambas vistas
- **WHEN** un movimiento no es de tipo entrega
- **THEN** su etiqueta de tipo se presenta con tono de ingreso (esmeralda) en ambas vistas

#### Scenario: Historial vacío o en carga
- **WHEN** el historial está cargando
- **THEN** se muestra un indicador de carga centrado, idéntico en móvil y escritorio
- **WHEN** el historial no tiene movimientos registrados
- **THEN** se muestra un mensaje centrado indicando que no hay movimientos, idéntico en móvil y escritorio
