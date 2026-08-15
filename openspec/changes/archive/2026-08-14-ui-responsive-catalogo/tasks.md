## 1. Adaptación de Tablas y Cabeceras

- [x] 1.1 Revisar `Productos.jsx`: Asegurar que la barra superior (Buscador y botón "Nuevo") use `flex-col sm:flex-row` para apilarse en móviles, y que la tabla esté contenida en un `overflow-x-auto w-full` sin romper el layout.
- [x] 1.2 Revisar `Siembras.jsx`: Aplicar el mismo patrón en la cabecera (Buscador + Botón Nuevo) con `flex-col sm:flex-row` y verificar que su tabla también cuente con `overflow-x-auto w-full`.
- [x] 1.3 Revisar `Insumos.jsx`: Validar que la vista de tarjetas (Cards) en mobile y la tabla en desktop funcionen correctamente tras los cambios estructurales previos.

## 2. Modales a Pantalla Completa (Mobile)

- [x] 2.1 Modificar `ProductoForm.jsx`: Cambiar el contenedor del modal para que en mobile (`< sm`) tenga `p-0 h-full max-h-screen rounded-none` y en desktop recupere su apariencia normal (`sm:p-4 sm:max-h-[95vh] sm:rounded-2xl`).
- [x] 2.2 Modificar `InsumoForm.jsx`: Aplicar las mismas clases responsivas al contenedor del modal.
- [x] 2.3 Modificar `SiembraForm.jsx`: Aplicar las mismas clases responsivas al contenedor del modal.
- [x] 2.4 Modificar `FinalizarSiembraModal.jsx` y `PaseStockModal.jsx`: Adaptar sus contenedores para que también sean fullscreen en móviles y no queden apretados.

## 3. Pruebas y Ajustes Finales

- [x] 3.1 Simular en vista móvil (DevTools o dispositivo real) la navegación por Productos, Insumos y Siembras, verificando que no haya scroll horizontal involuntario en la página.
- [x] 3.2 Verificar que al abrir los modales en mobile el teclado virtual no oculte los botones de acción principales (Guardar/Cancelar), asegurando que el cuerpo del formulario tenga `overflow-y-auto flex-1`.
