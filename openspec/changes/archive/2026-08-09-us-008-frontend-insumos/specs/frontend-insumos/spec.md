## ADDED Requirements

### Requirement: Listado de Insumos
El sistema MUST mostrar una tabla o tarjetas responsivas con todos los insumos obtenidos de `GET /api/insumos`, presentando nombre, descripción, precio, stock y acciones (editar, eliminar).

#### Scenario: Carga exitosa del listado
- **WHEN** el usuario navega a la ruta `/insumos`
- **THEN** el sistema realiza una petición `GET /api/insumos` con el JWT del store global y renderiza los resultados.

#### Scenario: Estado de carga
- **WHEN** la petición al backend está en curso
- **THEN** el sistema MUST mostrar un indicador de carga (spinner o skeleton) en lugar del contenido.

#### Scenario: Lista vacía
- **WHEN** el backend devuelve un arreglo vacío
- **THEN** el sistema MUST mostrar un mensaje amigable indicando que no hay insumos y un botón para crear el primero.

### Requirement: Creación de Insumo
El sistema MUST permitir crear un nuevo insumo a través de un formulario modal que envía un `POST /api/insumos`. El formulario MUST ser responsive (mobile-first).

#### Scenario: Creación exitosa
- **WHEN** el usuario completa todos los campos obligatorios (nombre, precio, stock) y presiona "Guardar"
- **THEN** el sistema envía el `POST`, cierra el modal, muestra un mensaje de éxito y refresca la lista.

#### Scenario: Error de validación
- **WHEN** el usuario intenta guardar sin completar campos obligatorios
- **THEN** el sistema MUST mostrar mensajes de error en los campos faltantes sin enviar la petición.

### Requirement: Edición de Insumo
El sistema MUST permitir editar un insumo existente a través del mismo formulario modal pre-cargado con los datos actuales, enviando un `PUT /api/insumos/{id}`.

#### Scenario: Edición exitosa
- **WHEN** el usuario modifica los datos de un insumo y presiona "Guardar"
- **THEN** el sistema envía el `PUT`, cierra el modal, muestra un mensaje de éxito y refresca la lista.

### Requirement: Eliminación de Insumo
El sistema MUST permitir eliminar un insumo enviando un `DELETE /api/insumos/{id}`, requiriendo confirmación previa del usuario.

#### Scenario: Eliminación con confirmación
- **WHEN** el usuario presiona el botón "Eliminar" en un insumo
- **THEN** el sistema MUST mostrar un diálogo de confirmación antes de ejecutar el `DELETE`.

#### Scenario: Eliminación confirmada
- **WHEN** el usuario confirma la eliminación
- **THEN** el sistema envía el `DELETE`, muestra un mensaje de éxito y remueve el insumo de la lista.

### Requirement: Manejo de Errores de API
El sistema MUST manejar errores HTTP del backend de forma amigable sin exponer detalles técnicos al usuario.

#### Scenario: Error 403 en operación
- **WHEN** el usuario intenta realizar una operación y el backend devuelve 403 Forbidden
- **THEN** el sistema MUST mostrar un mensaje indicando que no tiene permisos suficientes.
