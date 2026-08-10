## ADDED Requirements

### Requirement: Listado de Productos
El sistema MUST mostrar una tabla con todos los productos obtenidos de `GET /api/productos`, presentando nombre, descripción, precio, stock y acciones (editar, eliminar).

#### Scenario: Carga exitosa del listado
- **WHEN** el usuario navega a la ruta `/productos`
- **THEN** el sistema realiza una petición `GET /api/productos` con el JWT del store global y renderiza los resultados en una tabla ordenada

#### Scenario: Estado de carga
- **WHEN** la petición al backend está en curso
- **THEN** el sistema MUST mostrar un indicador de carga (spinner o skeleton) en lugar de la tabla

#### Scenario: Lista vacía
- **WHEN** el backend devuelve un arreglo vacío
- **THEN** el sistema MUST mostrar un mensaje amigable indicando que no hay productos y un botón para crear el primero

### Requirement: Creación de Producto
El sistema MUST permitir crear un nuevo producto a través de un formulario modal que envía un `POST /api/productos`.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa todos los campos obligatorios (nombre, precio, stock) y presiona "Guardar"
- **THEN** el sistema envía el `POST`, cierra el modal, muestra un mensaje de éxito y refresca la tabla

#### Scenario: Error de validación
- **WHEN** el usuario intenta guardar sin completar campos obligatorios
- **THEN** el sistema MUST mostrar mensajes de error en los campos faltantes sin enviar la petición

### Requirement: Edición de Producto
El sistema MUST permitir editar un producto existente a través del mismo formulario modal pre-cargado con los datos actuales, enviando un `PUT /api/productos/{id}`.

#### Scenario: Edición exitosa
- **WHEN** el usuario modifica los datos de un producto y presiona "Guardar"
- **THEN** el sistema envía el `PUT`, cierra el modal, muestra un mensaje de éxito y refresca la tabla con los datos actualizados

### Requirement: Eliminación de Producto
El sistema MUST permitir eliminar un producto enviando un `DELETE /api/productos/{id}`, requiriendo confirmación previa del usuario.

#### Scenario: Eliminación con confirmación
- **WHEN** el usuario presiona el botón "Eliminar" en un producto
- **THEN** el sistema MUST mostrar un diálogo de confirmación antes de ejecutar el `DELETE`

#### Scenario: Eliminación confirmada
- **WHEN** el usuario confirma la eliminación
- **THEN** el sistema envía el `DELETE`, muestra un mensaje de éxito y remueve el producto de la tabla

### Requirement: Manejo de Errores de API
El sistema MUST manejar errores HTTP del backend (403, 500, etc.) de forma amigable sin exponer detalles técnicos al usuario.

#### Scenario: Error 403 en operación de escritura
- **WHEN** el usuario intenta crear/editar/eliminar un producto y el backend devuelve 403 Forbidden
- **THEN** el sistema MUST mostrar un mensaje indicando que no tiene permisos suficientes
