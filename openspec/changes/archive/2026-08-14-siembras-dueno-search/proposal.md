## Why

El formulario actual de registro de siembras no facilita la selección del "dueño" del lote, que puede ser tanto un cliente registrado como un usuario interno (ej. el jefe). A medida que crece la base de datos de clientes, es necesario contar con una caja de búsqueda rápida (un select con autocompletado) para seleccionar al dueño sin tener que escribir su nombre manualmente o buscar en una lista estática inmanejable.

## What Changes

- Modificar el campo "Dueño" en el formulario de Nueva Siembra (`SiembraForm.jsx`).
- Implementar un selector con búsqueda (ComboBox / Searchable Select) que permita filtrar y seleccionar un dueño.
- El listado de dueños disponibles deberá incluir a los clientes registrados en el sistema y, opcionalmente, al jefe o usuarios administradores.
- Ajustar la lógica del formulario para enviar correctamente la referencia o nombre del dueño al backend.

## Capabilities

### New Capabilities
<!-- No new capabilities. -->

### Modified Capabilities
- `gestion-siembras`: Se modifica el requisito de selección del dueño al crear una siembra para incluir búsqueda y listado dinámico de clientes.

## Impact

- **Frontend**: 
  - `SiembraForm.jsx` (UI y lógica del selector)
  - Integración con la API de clientes/usuarios para cargar las opciones del selector de dueño.
- **Backend**:
  - No se esperan cambios importantes en la base de datos si el campo "dueño" sigue guardándose como texto, aunque se consultará el endpoint de clientes (`/api/clientes`).
