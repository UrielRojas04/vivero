## Purpose
Define los requisitos de diseño responsivo del frontend para adaptarse dinámicamente a diferentes tamaños de pantalla (mobile, tablet, desktop), asegurando una experiencia de usuario óptima en todos los dispositivos sin reescribir la lógica de negocio.
## Requirements
### Requirement: Layout Responsive
El frontend SHALL adaptar su layout principal (Sidebar, Navbar y Contenedor), sus vistas de catálogos y pantallas complejas como el Punto de Venta dinámicamente según el tamaño de la pantalla del dispositivo.

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

#### Scenario: Pantallas de Escritorio (mayor a 768px)
- **WHEN** la aplicación se visualiza en escritorio o tablet grande
- **THEN** el Sidebar es visible permanentemente como una columna fija
- **THEN** el botón hamburguesa está oculto
- **THEN** el contenedor principal respeta el margen izquierdo correspondiente al Sidebar
- **THEN** las tablas de datos ocupan el ancho del contenedor sin necesidad de scroll horizontal
- **THEN** los modales se presentan centrados con dimensiones máximas definidas (no fullscreen)
- **THEN** las barras de búsqueda y botones principales se presentan alineados en la misma fila horizontal
- **THEN** en pantallas divididas como Nueva Venta, ambos paneles se muestran simultáneamente (ej. Búsqueda a la izquierda, Carrito a la derecha)

