## ADDED Requirements

### Requirement: Panel de Revisión de Costos en la Sección Productos

El sistema SHALL mostrar la revisión de costos desalineados **dentro de la sección Productos**, como un panel ubicado por encima de la grilla del catálogo. El sistema SHALL NOT ofrecerla como una sección propia del menú de navegación.

El panel SHALL mostrarse únicamente cuando la unidad de negocio activa es Herramientas **y** existe al menos un producto desalineado. Cuando no hay ninguno, el panel SHALL NOT ocupar espacio en la pantalla.

#### Scenario: Panel visible con diferencias pendientes
- **WHEN** el usuario entra a la sección Productos con la unidad de negocio Herramientas activa y existen productos con costo desalineado
- **THEN** el panel se muestra por encima de la grilla del catálogo, listando esos productos

#### Scenario: Sin diferencias pendientes
- **WHEN** el usuario entra a la sección Productos con Herramientas activa y ningún producto está desalineado
- **THEN** el panel no se muestra y la grilla del catálogo se ve exactamente como hoy

#### Scenario: Unidad de negocio Vivero
- **WHEN** el usuario entra a la sección Productos con la unidad de negocio Vivero activa
- **THEN** el panel no se muestra en ningún caso

#### Scenario: El panel no reemplaza la grilla
- **WHEN** el panel está visible
- **THEN** la grilla del catálogo, su buscador y sus filtros por proveedor siguen funcionando sin cambios

### Requirement: Contraste Visible en Cada Fila del Panel

Cada fila del panel SHALL mostrar el nombre del producto, su proveedor cuando lo tenga, la fecha del último ingreso, el **costo actual de la ficha junto al costo del último ingreso**, y el **precio de venta actual junto al precio de venta que resultaría** de aplicar la actualización.

Como línea secundaria, en tipografía menor y por debajo del contraste de costos base, la fila SHALL mostrar el **costo unitario final actual junto al costo unitario final resultante**, que es lo que explica el cambio de precio.

El precio resultante y el costo unitario resultante SHALL ser los que provee el backend, y el frontend SHALL NOT recalcularlos por su cuenta.

Los importes SHALL formatearse con la convención de moneda ya vigente en la sección Productos.

#### Scenario: Fila con el contraste completo
- **WHEN** el panel muestra un producto desalineado
- **THEN** la fila permite leer, sin abrir nada, de qué costo a qué costo y de qué precio a qué precio se pasaría

#### Scenario: Producto sin costo cargado en la ficha
- **WHEN** un producto desalineado no tiene costo cargado en su ficha
- **THEN** la fila indica explícitamente que la ficha no tiene costo, en lugar de mostrar un cero que parezca un costo real

#### Scenario: Producto sin proveedor
- **WHEN** un producto desalineado no tiene proveedor asignado
- **THEN** la fila lo indica explícitamente en lugar de dejar el espacio vacío

### Requirement: Acciones de Un Click en el Panel

Cada fila del panel SHALL ofrecer exactamente dos acciones, cada una resuelta en un solo click y **sin diálogo de confirmación intermedio**: aplicar el costo nuevo, o descartar la diferencia.

Ambos botones SHALL usar `cursor-pointer` e iconos de `lucide-react`, y el feedback posterior SHALL entregarse mediante el store de UI de la aplicación. El sistema SHALL NOT utilizar `alert` ni `confirm` nativos del navegador.

Tras aplicar el costo nuevo, el sistema SHALL informar en el mensaje de éxito **qué producto** se actualizó y **de qué precio a qué precio** quedó, y SHALL refrescar la grilla del catálogo para reflejar el costo y el precio nuevos.

#### Scenario: Aplicar el costo nuevo
- **WHEN** el usuario hace click en la acción de actualizar de una fila
- **THEN** el producto se actualiza sin ningún diálogo intermedio, la fila desaparece del panel, la grilla del catálogo refleja el costo y el precio nuevos, y se muestra un mensaje de éxito indicando el producto y el cambio de precio

#### Scenario: Descartar la diferencia
- **WHEN** el usuario hace click en la acción de descartar de una fila
- **THEN** la fila desaparece del panel sin ningún diálogo intermedio, el sistema registra el ingreso revisado, y ningún dato de negocio del producto se modifica

#### Scenario: El descarte se mantiene al volver a la sección
- **WHEN** el usuario descartó una fila y más tarde vuelve a entrar a la sección Productos, sin que haya llegado ningún ingreso nuevo de ese producto
- **THEN** esa fila SHALL NOT volver a mostrarse en el panel

#### Scenario: Falta de permisos al descartar
- **WHEN** un usuario sin permiso de escritura sobre el stock hace click en la acción de descartar
- **THEN** el sistema muestra el aviso de acceso denegado con el mismo mecanismo que ya usan las acciones de editar y eliminar producto, y la fila permanece en el panel

#### Scenario: Última fila del panel
- **WHEN** el usuario resuelve la última fila pendiente, sea actualizando o descartando
- **THEN** el panel deja de mostrarse

#### Scenario: Falta de permisos al actualizar
- **WHEN** un usuario sin permiso de escritura sobre el stock hace click en la acción de actualizar
- **THEN** el sistema muestra el aviso de acceso denegado con el mismo mecanismo que ya usan las acciones de editar y eliminar producto, y la fila permanece en el panel

#### Scenario: Error de red al actualizar
- **WHEN** la actualización falla por un error del servidor
- **THEN** el sistema muestra un mensaje de error, la fila permanece en el panel y ningún dato se modifica

### Requirement: Degradación del Panel ante un Backend sin el Endpoint

Cuando la consulta de costos desalineados falle, el sistema SHALL ocultar el panel y SHALL NOT bloquear ni degradar el resto de la sección Productos.

#### Scenario: El endpoint no responde
- **WHEN** la consulta de costos desalineados devuelve un error
- **THEN** el panel no se muestra, no se despliega ningún error bloqueante, y el catálogo de productos se carga y opera con normalidad
