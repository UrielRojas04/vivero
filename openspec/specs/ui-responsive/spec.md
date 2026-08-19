## Purpose
Define los requisitos de diseño responsivo del frontend para adaptarse dinámicamente a diferentes tamaños de pantalla (mobile, tablet, desktop), asegurando una experiencia de usuario óptima en todos los dispositivos sin reescribir la lógica de negocio.
## Requirements
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

### Requirement: Cartera de Cheques Priorizada en Mobile
El frontend SHALL presentar la cartera de cheques en pantallas móviles como tarjetas que prioricen el monto y la proximidad de la fecha de cobro por sobre el resto de los datos, manteniendo la tabla completa en escritorio.

#### Scenario: Listado de cheques en pantalla móvil
- **WHEN** la cartera de cheques se visualiza en una pantalla menor a 768px
- **THEN** cada cheque se presenta como una tarjeta y la tabla permanece oculta
- **THEN** la tarjeta muestra el monto como el elemento de mayor jerarquía visual, con tipografía destacada
- **THEN** la tarjeta muestra el estado del cheque como una etiqueta de color siempre visible, sin requerir scroll horizontal
- **THEN** la tarjeta muestra el origen del cheque (cliente o "Suelto"), el banco y el número de serie como datos secundarios de menor peso visual
- **THEN** la acción de actualizar el estado se presenta como un botón de ancho completo y área táctil amplia

#### Scenario: Cheque pendiente próximo a cobrarse
- **WHEN** un cheque está en cartera y su fecha de cobro ocurre dentro de los próximos 7 días
- **THEN** la tarjeta muestra los días restantes hasta el cobro en lenguaje relativo
- **THEN** los días restantes se presentan con tono de advertencia (ámbar)

#### Scenario: Cheque pendiente vencido o del día
- **WHEN** un cheque está en cartera y su fecha de cobro es anterior o igual a la fecha actual
- **THEN** la tarjeta indica que el cheque vence hoy o los días transcurridos desde el vencimiento
- **THEN** esa indicación se presenta con tono de urgencia (rojo)

#### Scenario: Cheque sin fecha de cobro registrada
- **WHEN** un cheque no tiene fecha de cobro
- **THEN** la tarjeta indica que no hay fecha de cobro registrada, con tono neutro
- **THEN** no se muestra ningún cálculo de días restantes

#### Scenario: Cheque ya resuelto
- **WHEN** un cheque está cobrado, entregado o rechazado
- **THEN** la tarjeta no muestra indicador de urgencia de cobro
- **THEN** la acción de actualizar el estado se presenta como bloqueada, igual que en la tabla de escritorio

#### Scenario: Coherencia de la semántica de estado entre vistas
- **WHEN** el mismo cheque se observa en la tarjeta móvil, en la tabla de escritorio, en el listado de cheques en cartera de Finanzas y en el modal de actualización de estado
- **THEN** todas las vistas derivan la etiqueta, el tono y la condición de editable del cheque de la misma función de presentación compartida
- **THEN** un cheque de emisión propia muestra "EMITIDO" en lugar de "EN CARTERA" y "DEBITADO" en lugar de "COBRADO" en todas las vistas por igual

### Requirement: Confirmación de Transiciones de Estado de Cheque
El frontend SHALL exigir confirmación explícita mediante el modal de confirmación de la aplicación antes de ejecutar transiciones de estado de cheque que afecten saldos de cuenta corriente y no puedan deshacerse desde la interfaz.

#### Scenario: Rechazo de un cheque
- **WHEN** el usuario cambia el estado de un cheque a rechazado y su estado previo no era rechazado
- **THEN** se abre el modal de confirmación de la aplicación con variante de peligro
- **THEN** el mensaje advierte que se revertirán los saldos de la cuenta corriente del cliente y que la acción no se puede deshacer
- **THEN** la actualización solo se ejecuta al confirmar en ese modal

#### Scenario: Endoso de un cheque
- **WHEN** el usuario cambia el estado de un cheque a entregado y su estado previo no era entregado
- **THEN** se abre el modal de confirmación de la aplicación con variante de peligro
- **THEN** el mensaje identifica al destinatario del endoso (tercero o cliente) y advierte que el cheque quedará bloqueado para futuras ediciones
- **THEN** la actualización solo se ejecuta al confirmar en ese modal

#### Scenario: Ausencia de diálogos nativos
- **WHEN** cualquier acción del módulo de Finanzas y Cheques requiere confirmación o comunica un resultado
- **THEN** se utiliza el modal de confirmación y el sistema de avisos de la aplicación
- **THEN** no se utilizan diálogos nativos del navegador

### Requirement: Selección de Endoso Accesible al Tacto
El frontend SHALL presentar los controles de selección del modal de actualización de estado de cheque con áreas táctiles amplias y contenido alcanzable en pantallas móviles.

#### Scenario: Selección del tipo de endoso en móvil
- **WHEN** el usuario elige entre endosar a un tercero o a un cliente en una pantalla menor a 640px
- **THEN** las dos opciones se presentan como controles apilados de ancho completo con área táctil amplia
- **THEN** la opción seleccionada se distingue por color de borde y de fondo, no solo por el indicador nativo del radio button

#### Scenario: Búsqueda de cliente destinatario en móvil
- **WHEN** el usuario abre el buscador de clientes para endosar dentro del modal a pantalla completa
- **THEN** la lista de resultados es visible y desplazable en su totalidad sin quedar recortada por el área scrolleable del modal
- **THEN** cada resultado de la lista tiene un área táctil suficiente para seleccionarse con el pulgar

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

