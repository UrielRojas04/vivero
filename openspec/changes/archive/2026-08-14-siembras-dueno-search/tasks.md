## 1. Actualización de API y Estado Global

- [x] 1.1 Asegurar que el hook o la llamada a la API para obtener clientes (`clientesApi.getAll()`) esté disponible y funcional para ser importada en `SiembraForm.jsx`.

## 2. Modificación de la Interfaz (SiembraForm.jsx)

- [x] 2.1 Reemplazar el input de texto simple para el campo "dueño" por un componente o estructura de selector con búsqueda (Searchable Select o ComboBox).
- [x] 2.2 Integrar la lista de clientes obtenidos desde el backend como opciones disponibles en el selector.
- [x] 2.3 Incluir una opción estática o adicional para seleccionar al "Jefe / Vivero propio" si no se selecciona un cliente.
- [x] 2.4 Implementar la lógica de filtrado local para que el usuario pueda tipear y reducir la lista de clientes mostrados.
- [x] 2.5 Actualizar el estado del formulario (`formData.dueno`) con el valor seleccionado (nombre o referencia esperada por el backend) al hacer clic en una opción.
