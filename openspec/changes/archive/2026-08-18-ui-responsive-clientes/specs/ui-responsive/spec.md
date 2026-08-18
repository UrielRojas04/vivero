## MODIFIED Requirements

### Requirement: Layout Responsive
El frontend SHALL adaptar su layout principal (Sidebar, Navbar y Contenedor), sus vistas de catálogos y pantallas complejas como el Punto de Venta y la gestión de Clientes / Cuentas Corrientes dinámicamente según el tamaño de la pantalla del dispositivo.

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

## ADDED Requirements

### Requirement: Visualización del Saldo de Cuenta Corriente
El frontend SHALL comunicar el estado de la cuenta corriente en dinero de un cliente de forma inequívoca, distinguiendo deuda, saldo a favor y saldo nulo mediante etiqueta textual y color, con jerarquía visual reforzada en pantallas móviles.

#### Scenario: Cliente con deuda
- **WHEN** el saldo en dinero del cliente es menor a cero
- **THEN** se muestra la etiqueta "Debe" junto al monto en valor absoluto
- **THEN** el monto y la etiqueta se presentan en tono rojo
- **THEN** en la tarjeta móvil del listado, el monto se muestra con tipografía destacada (mayor que el texto secundario de la tarjeta)

#### Scenario: Cliente con saldo a favor
- **WHEN** el saldo en dinero del cliente es mayor a cero
- **THEN** se muestra la etiqueta "A favor" junto al monto en valor absoluto
- **THEN** el monto y la etiqueta se presentan en tono verde (emerald)

#### Scenario: Cliente sin saldo pendiente
- **WHEN** el saldo en dinero del cliente es exactamente cero
- **THEN** se muestra la etiqueta "Sin saldo"
- **THEN** el monto y la etiqueta se presentan en tono gris neutro, sin usar el color de saldo a favor

#### Scenario: Coherencia entre vistas
- **WHEN** el mismo cliente se observa en la tarjeta móvil, en la tabla de escritorio y en el modal de ajuste de saldo
- **THEN** las tres vistas derivan la etiqueta y el tono del saldo de la misma función de presentación compartida
- **THEN** las tres vistas muestran la misma etiqueta de estado para el mismo valor de saldo

### Requirement: Listado de Clientes Priorizado en Mobile
El frontend SHALL presentar el listado de clientes en pantallas móviles como tarjetas que prioricen el nombre o razón social y el saldo de cuenta corriente por sobre el resto de los datos, manteniendo la tabla completa en escritorio.

#### Scenario: Listado en pantalla móvil
- **WHEN** el listado de clientes se visualiza en una pantalla menor a 768px
- **THEN** cada cliente se presenta como una tarjeta y la tabla permanece oculta
- **THEN** la tarjeta muestra el nombre o razón social y el saldo como los elementos de mayor jerarquía visual
- **THEN** las acciones de la tarjeta (Editar, Saldo, Eliminar y, si corresponde, las de bandejas) se presentan como botones de ancho repartido y área táctil amplia

#### Scenario: Eliminación de un cliente
- **WHEN** el usuario activa la acción de eliminar un cliente, tanto desde la tarjeta móvil como desde la tabla de escritorio
- **THEN** se abre el modal de confirmación de la aplicación con variante de peligro
- **THEN** la eliminación solo se ejecuta al confirmar en ese modal
- **THEN** no se utilizan diálogos nativos del navegador
