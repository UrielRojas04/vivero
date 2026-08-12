## 1. Backend: Modelos y Repositorios

- [x] 1.1 Crear el enum `EstadoSiembra` (`EN_PROCESO`, `FINALIZADA`).
- [x] 1.2 Crear la entidad `Siembra` (`id`, `variedad`, `fechaEstimada`, `dueno`, `numeroLote`, `cantidad`, `EstadoSiembra estado`).
- [x] 1.3 Crear el `SiembraDTO` para la transferencia de datos.
- [x] 1.4 Crear el `SiembraRepository`.

## 2. Backend: Lógica de Negocio

- [x] 2.1 Crear `SiembraService` y `SiembraServiceImpl` con operaciones CRUD básicas (crear, listar, obtener).
- [x] 2.2 Implementar método en `SiembraService` para finalizar siembra (`finalizarSiembra(Long idSiembra, Long idProducto, Integer cantidadLograda)`).
- [x] 2.3 Conectar la finalización con `MovimientoStockService` o `ProductoService` para ingresar el stock al catálogo.
- [x] 2.4 Crear `SiembraController` para exponer las rutas de la API.

## 3. Frontend: Configuración y API

- [x] 3.1 Crear `siembras.api.js` con las llamadas a la API (GET, POST, PUT para finalizar).
- [x] 3.2 Agregar el link de "Siembras" en el menú principal (`Sidebar.jsx`) y configurar su ruta en `App.jsx`.

## 4. Frontend: Vistas y Componentes

- [x] 4.1 Crear `Siembras.jsx` (página principal con la tabla y listado de siembras).
- [x] 4.2 Crear `SiembraForm.jsx` (modal para cargar una nueva siembra o editarla).
- [x] 4.3 Crear `FinalizarSiembraModal.jsx` (modal que aparece al marcar "Lista para entregar" y permite elegir un producto del catálogo para sumar el stock).
