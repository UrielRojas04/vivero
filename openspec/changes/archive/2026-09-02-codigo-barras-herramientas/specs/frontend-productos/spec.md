## ADDED Requirements

### Requirement: Campo de Código de Barras en el Formulario de Producto
El formulario de producto SHALL mostrar, únicamente cuando la unidad de negocio activa es Herramientas, un campo de texto "Código de barras" acompañado de un botón de escaneo con icono de `lucide-react`. El campo SHALL ser editable a mano y opcional.

#### Scenario: Campo visible en Herramientas
- **WHEN** un usuario abre el formulario de producto con la unidad Herramientas activa
- **THEN** el formulario muestra el campo "Código de barras" con su botón de escaneo

#### Scenario: Campo oculto fuera de Herramientas
- **WHEN** un usuario abre el formulario de producto con la unidad Vivero o Abono activa
- **THEN** el formulario no muestra el campo de código de barras ni su botón de escaneo

#### Scenario: Carga manual del código
- **WHEN** un usuario escribe un código de barras directamente en el campo de texto y guarda el formulario
- **THEN** el sistema guarda ese código en el producto, sin requerir el uso de la cámara

#### Scenario: Edición de un producto con código ya cargado
- **WHEN** un usuario abre en modo edición un producto que ya tiene código de barras
- **THEN** el campo aparece precargado con el código guardado

### Requirement: Escaneo por Cámara para Cargar el Código
Al accionar el botón de escaneo del formulario, el sistema SHALL abrir un modal con la cámara del dispositivo y, al detectar un código válido, SHALL escribir el código en el campo de texto y cerrar el modal. El sistema NO SHALL persistir el producto de forma automática: el guardado siempre requiere la confirmación explícita del usuario.

#### Scenario: Código detectado se carga en el campo
- **WHEN** el usuario abre el escáner desde el formulario y la cámara detecta un código de barras válido
- **THEN** el modal se cierra y el código detectado queda visible en el campo de texto del formulario

#### Scenario: El escaneo no guarda por sí solo
- **WHEN** el escáner detecta un código y lo carga en el campo
- **THEN** el producto no se persiste hasta que el usuario acciona el botón de guardar del formulario

#### Scenario: Corrección de un código mal leído
- **WHEN** el usuario detecta que el código escaneado es incorrecto antes de guardar
- **THEN** puede editarlo a mano en el campo o volver a escanear, y sólo el valor final se persiste

#### Scenario: Cierre del escáner sin detectar
- **WHEN** el usuario cierra el modal del escáner sin que se haya detectado ningún código
- **THEN** el campo de texto conserva el valor que tenía antes de abrir el escáner

#### Scenario: Liberación de la cámara al cerrar
- **WHEN** el modal del escáner se cierra, ya sea por detección o por cancelación del usuario
- **THEN** el sistema detiene el lector y libera todas las pistas del `MediaStream`, dejando la cámara del dispositivo disponible

### Requirement: Búsqueda de Producto por Escaneo en el Catálogo
La pantalla de catálogo de productos SHALL ofrecer, únicamente en la unidad Herramientas, un botón de escaneo junto a la barra de búsqueda. Al detectar un código, el sistema SHALL consultar el backend por ese código y mostrar el resultado en un modal.

#### Scenario: Botón visible sólo en Herramientas
- **WHEN** un usuario abre el catálogo con la unidad Herramientas activa
- **THEN** la barra de búsqueda incluye un botón de escaneo por cámara

#### Scenario: Botón ausente fuera de Herramientas
- **WHEN** un usuario abre el catálogo con la unidad Vivero o Abono activa
- **THEN** la barra de búsqueda no incluye el botón de escaneo

#### Scenario: Producto encontrado
- **WHEN** el escaneo desde el catálogo detecta un código asignado a un producto de la unidad activa
- **THEN** el sistema muestra un modal con la información del producto: nombre, descripción, precio, stock y proveedor cuando corresponda

#### Scenario: Consulta contra el backend, no contra la lista en memoria
- **WHEN** el escaneo desde el catálogo detecta un código
- **THEN** el sistema resuelve el producto consultando el endpoint de búsqueda por código de barras, no filtrando la lista ya cargada en el navegador

### Requirement: Resultado de Escaneo sin Coincidencia
Cuando el código escaneado desde el catálogo no corresponde a ningún producto, el sistema SHALL informarlo mostrando el código leído y SHALL ofrecer crear el producto con ese código precargado. Todo el feedback SHALL usar los componentes de `useUIStore` o modales propios; el sistema NO SHALL usar `alert` ni `confirm` nativos del navegador.

#### Scenario: Código sin producto asociado
- **WHEN** el escaneo detecta un código que ningún producto de la unidad activa tiene asignado
- **THEN** el sistema muestra un modal indicando que no se encontró el producto, junto con el código leído

#### Scenario: Alta directa desde el resultado no encontrado
- **WHEN** un usuario con permiso de escritura acciona "Cargar producto con este código" en ese modal
- **THEN** el sistema abre el formulario de producto en modo alta con el campo de código de barras ya completo con el código escaneado

#### Scenario: Usuario sin permiso de escritura
- **WHEN** un usuario sin permiso para crear productos obtiene un resultado no encontrado
- **THEN** el modal muestra únicamente el mensaje informativo, sin el botón de alta

#### Scenario: Sin diálogos nativos
- **WHEN** el sistema informa cualquier resultado del escaneo, sea encontrado, no encontrado o error
- **THEN** lo hace mediante toasts de `useUIStore` o modales propios de la aplicación, nunca con `alert` ni `confirm`

### Requirement: Degradación del Escaneo sin Cámara Disponible
El sistema SHALL verificar la disponibilidad de la cámara antes de intentar usarla y SHALL explicar la causa concreta cuando no esté disponible. El botón de escaneo NO SHALL ocultarse por falta de cámara o de contexto seguro.

#### Scenario: Contexto no seguro
- **WHEN** la aplicación se sirve por HTTP sobre una IP de red local y `navigator.mediaDevices` no está disponible
- **THEN** el sistema muestra un mensaje que explica que el escaneo requiere HTTPS e indica que el código puede escribirse a mano, sin intentar montar el video

#### Scenario: Permiso de cámara denegado
- **WHEN** el usuario deniega el permiso de cámara al navegador
- **THEN** el sistema muestra un mensaje específico sobre el permiso denegado, distinto del mensaje de contexto no seguro

#### Scenario: Dispositivo sin cámara disponible
- **WHEN** el dispositivo no tiene cámara o la cámara está ocupada por otra aplicación
- **THEN** el sistema muestra un mensaje específico sobre la cámara no disponible

#### Scenario: Carga manual siempre disponible
- **WHEN** el escaneo no está disponible por cualquier motivo
- **THEN** el usuario puede igualmente cargar y guardar el código escribiéndolo en el campo de texto del formulario
