## ADDED Requirements

### Requirement: Registro de Recepción de Semillas de Clientes
El sistema SHALL permitir registrar la recepción de un sobre de semillas entregado por una persona en el invernadero, guardando fecha de recepción, lote impreso en el sobre, nombre de quien lo entregó, descripción de la semilla, cantidad con su unidad y observaciones opcionales. El registro SHALL ser una constancia de entrada independiente: NO SHALL crear siembras, productos ni movimientos de stock.

#### Scenario: Alta de un registro con los datos mínimos
- **WHEN** el usuario carga un registro con fecha de recepción, lote `18KR`, nombre `Gustavo Aleo`, semilla `Globe Master`, cantidad `3` y unidad `SOBRES`
- **THEN** el sistema persiste el registro, lo devuelve con su ID asignado, y no genera ninguna `Siembra`, `Producto` ni `MovimientoStock`

#### Scenario: Rechazo por falta de lote
- **WHEN** el usuario intenta guardar un registro sin lote o con el lote en blanco
- **THEN** el sistema rechaza la operación con un mensaje indicando que el lote es obligatorio, y no persiste nada

#### Scenario: Rechazo por falta de descripción de la semilla
- **WHEN** el usuario intenta guardar un registro sin descripción de la semilla o con la descripción en blanco
- **THEN** el sistema rechaza la operación con un mensaje indicando que la semilla es obligatoria, y no persiste nada

#### Scenario: Rechazo por falta de nombre de quien entregó
- **WHEN** el usuario intenta guardar un registro sin nombre de quien entregó y sin cliente vinculado
- **THEN** el sistema rechaza la operación con un mensaje indicando que el nombre de quien entregó es obligatorio, y no persiste nada

### Requirement: Lote como Código Externo Sin Restricciones de Formato
El sistema SHALL almacenar el lote como texto libre, preservando exactamente los caracteres ingresados (incluidos ceros a la izquierda, letras mayúsculas y minúsculas mezcladas y puntos), y NO SHALL imponer restricción de unicidad ni validación de formato sobre él, porque el código lo imprime el semillero en el sobre y no lo genera el sistema.

#### Scenario: Lote alfanumérico con puntos
- **WHEN** el usuario ingresa el lote `FP12.5H526`
- **THEN** el sistema lo guarda y lo devuelve tal cual, sin normalizar ni rechazar

#### Scenario: Lote numérico con cero a la izquierda
- **WHEN** el usuario ingresa el lote `043`
- **THEN** el sistema lo guarda y lo devuelve como `043`, conservando el cero inicial

#### Scenario: Dos registros con el mismo lote
- **WHEN** el usuario carga un segundo registro con un lote que ya existe en otro registro
- **THEN** el sistema acepta y persiste ambos registros sin error de unicidad

### Requirement: Vínculo Opcional al Cliente con Datos Snapshot
El sistema SHALL permitir vincular el registro a un `Cliente` existente o dejarlo sin vincular. Cuando se vincula un cliente, el sistema SHALL copiar su nombre y teléfono al registro como datos históricos. El nombre de quien entregó SHALL persistirse siempre, exista o no el vínculo, de modo que el registro conserve su valor de constancia aunque el cliente sea eliminado.

#### Scenario: Registro vinculado a un cliente existente
- **WHEN** el usuario selecciona el cliente `Claudio Cardon` (con teléfono cargado) al crear el registro
- **THEN** el sistema guarda la referencia al cliente y copia su nombre y teléfono en los campos snapshot del registro

#### Scenario: Registro de una persona que no es cliente del sistema
- **WHEN** el usuario escribe el nombre `Ismael` sin seleccionar ningún cliente
- **THEN** el sistema persiste el registro con el nombre ingresado y sin referencia a cliente, y la operación es exitosa

#### Scenario: Cliente eliminado después del registro
- **WHEN** el cliente vinculado a un registro es eliminado del sistema
- **THEN** el registro sigue mostrando el nombre y el teléfono capturados al momento de la recepción

### Requirement: Cantidad con Unidad Explícita
El sistema SHALL registrar la cantidad como un valor numérico decimal acompañado de una unidad obligatoria entre `SEMILLAS`, `SOBRES` y `GRAMOS`, sin convertir entre unidades. Cuando la unidad es `SOBRES`, el sistema SHALL permitir informar opcionalmente el contenido de semillas por sobre. El total de semillas SHALL calcularse como cantidad por contenido por sobre y exponerse como valor derivado, sin persistirse.

#### Scenario: Cantidad expresada en gramos con decimales
- **WHEN** el usuario carga cantidad `12.5` con unidad `GRAMOS`
- **THEN** el sistema persiste el valor decimal sin redondear y sin intentar convertirlo a cantidad de semillas

#### Scenario: Sobres con contenido informado
- **WHEN** el usuario carga cantidad `7`, unidad `SOBRES` y contenido por sobre `1000`
- **THEN** el sistema expone un total derivado de `7000` semillas

#### Scenario: Sobres sin contenido informado
- **WHEN** el usuario carga cantidad `9` y unidad `SOBRES` sin informar el contenido por sobre
- **THEN** el sistema acepta el registro y no expone ningún total derivado

#### Scenario: Contenido por sobre con una unidad que no es sobres
- **WHEN** el usuario envía contenido por sobre `1000` junto con unidad `GRAMOS`
- **THEN** el sistema descarta el contenido por sobre guardándolo como nulo, y no expone total derivado

#### Scenario: Rechazo por unidad ausente
- **WHEN** el usuario intenta guardar un registro con cantidad pero sin unidad
- **THEN** el sistema rechaza la operación indicando que la unidad es obligatoria

### Requirement: Registro del Usuario Receptor
El sistema SHALL asociar cada registro al usuario autenticado que lo dio de alta, tomándolo del contexto de seguridad y NO del cuerpo de la petición, como equivalente digital de la firma de recepción del papel. El usuario receptor SHALL exponerse en el listado y en el comprobante.

#### Scenario: Alta de un registro por un usuario autenticado
- **WHEN** un usuario autenticado crea un registro de semillas
- **THEN** el sistema guarda ese usuario como receptor del registro

#### Scenario: Intento de suplantar el receptor desde la petición
- **WHEN** la petición de alta incluye un usuario receptor distinto del usuario autenticado
- **THEN** el sistema ignora el valor recibido y guarda como receptor al usuario autenticado

### Requirement: Fecha de Recepción Obligatoria con Valor Por Defecto
El sistema SHALL exigir una fecha de recepción en cada registro y SHALL proponer la fecha actual por defecto en el formulario de alta, permitiendo al usuario modificarla para cargar entregas de días anteriores. El sistema SHALL además guardar de forma automática el instante en que el registro fue creado, como dato de auditoría independiente de la fecha de recepción.

#### Scenario: Alta sin tocar el campo de fecha
- **WHEN** el usuario abre el formulario de alta y guarda sin modificar la fecha
- **THEN** el registro queda con la fecha del día como fecha de recepción

#### Scenario: Carga de una entrega de un día anterior
- **WHEN** el usuario cambia la fecha de recepción a una fecha pasada y guarda
- **THEN** el sistema persiste esa fecha como fecha de recepción y registra por separado el instante real de creación

### Requirement: Listado, Búsqueda y Edición de Registros
El sistema SHALL exponer el listado de registros de semillas ordenado por fecha de recepción descendente, ocultando los registros eliminados. El listado SHALL permitir filtrar por nombre de quien entregó, por lote y por descripción de la semilla. El sistema SHALL permitir editar y eliminar un registro existente.

#### Scenario: Listado ordenado
- **WHEN** el usuario abre la sección de registro de semillas
- **THEN** el sistema muestra los registros no eliminados con el más reciente primero

#### Scenario: Búsqueda por lote
- **WHEN** el usuario escribe `18KR` en el buscador
- **THEN** el listado muestra únicamente los registros cuyo lote, nombre de quien entregó o descripción de semilla contengan ese texto

#### Scenario: Edición de un registro
- **WHEN** el usuario modifica la cantidad de un registro existente y guarda
- **THEN** el sistema persiste el nuevo valor conservando el mismo identificador de registro

### Requirement: Borrado Lógico de Registros de Semillas
El sistema SHALL eliminar los registros de semillas de forma lógica, marcándolos como eliminados en lugar de borrarlos físicamente, y SHALL excluirlos de todas las consultas de lectura por defecto.

#### Scenario: Eliminación de un registro
- **WHEN** el usuario elimina un registro de semillas
- **THEN** el sistema marca el registro como eliminado sin borrar la fila, y el registro deja de aparecer en el listado

### Requirement: Comprobante de Recepción de Semillas
El sistema SHALL generar, a partir de un registro existente, un comprobante de recepción que incluya el número de registro, la fecha de recepción, el nombre de quien entregó, su teléfono si está disponible, el lote, la descripción de la semilla, la cantidad con su unidad, el total derivado de semillas cuando corresponda, las observaciones si existen y el usuario que recibió. El comprobante SHALL declarar explícitamente que no constituye comprobante de venta. El sistema SHALL permitir descargarlo en PDF y en imagen PNG, y enviarlo por WhatsApp.

#### Scenario: Descarga del comprobante en PDF
- **WHEN** el usuario abre el comprobante de un registro y elige descargar el PDF
- **THEN** el sistema genera un archivo PDF con los datos del registro y la leyenda de que no constituye comprobante de venta

#### Scenario: Descarga del comprobante como imagen
- **WHEN** el usuario elige descargar la imagen del comprobante
- **THEN** el sistema genera un PNG legible con fondo claro y texto oscuro, independientemente de si la aplicación está en tema claro u oscuro

#### Scenario: Envío por WhatsApp a un cliente con teléfono
- **WHEN** el usuario elige enviar por WhatsApp el comprobante de un registro cuyo teléfono está cargado
- **THEN** el sistema abre WhatsApp dirigido a ese número con el comprobante listo para enviar

#### Scenario: Envío por WhatsApp sin teléfono cargado
- **WHEN** el usuario elige enviar por WhatsApp el comprobante de un registro sin teléfono
- **THEN** el sistema abre WhatsApp sin destinatario precargado, permitiendo al usuario elegir el contacto

#### Scenario: Segundo envío por WhatsApp en la misma sesión
- **WHEN** el usuario envía un comprobante por WhatsApp y luego envía otro comprobante en la misma sesión del navegador
- **THEN** el sistema reutiliza la misma pestaña de WhatsApp ya abierta en lugar de abrir una nueva

### Requirement: Acceso Restringido a la Unidad Vivero
El sistema SHALL exponer la sección de registro de semillas únicamente a usuarios con permiso de lectura de siembras y únicamente cuando la unidad de negocio activa es Vivero. Las operaciones de alta, edición y eliminación SHALL requerir el permiso de escritura de siembras.

#### Scenario: Usuario sin permiso de lectura
- **WHEN** un usuario sin el permiso de lectura de siembras intenta acceder al listado de registros de semillas
- **THEN** el sistema deniega el acceso y no devuelve datos

#### Scenario: Usuario con lectura pero sin escritura
- **WHEN** un usuario con permiso de lectura pero sin permiso de escritura de siembras intenta crear un registro
- **THEN** el sistema rechaza la operación por falta de permisos

#### Scenario: Cambio a una unidad de negocio distinta de Vivero
- **WHEN** el usuario está en la sección de registro de semillas y cambia la unidad de negocio activa a Herramientas o Abono
- **THEN** el sistema lo redirige fuera de la sección y el ítem deja de mostrarse en el menú
