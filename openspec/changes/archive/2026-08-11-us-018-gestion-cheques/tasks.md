## 1. Backend: Modelo de Datos

- [x] 1.1 Crear entidad `Cheque` en `com.vivero.gestion.models` con `id`, `fechaRecepcion`, `numeroInterno`, `monto`, `banco`, `fechaCobro`, `numeroSerie`, `estado`, `fechaEntrega`, `entregadoA`.
- [x] 1.2 Agregar relaciones `@ManyToOne` hacia `Cliente` y `Venta` en la entidad `Cheque` (con `@JoinColumn`).
- [x] 1.3 Crear repositorio `ChequeRepository` en `com.vivero.gestion.repositories`.

## 2. Backend: Servicios y Controladores

- [x] 2.1 Crear `ChequeDTO` y su conversión en la capa de DTOs.
- [x] 2.2 Crear `ChequeService` y `ChequeServiceImpl` con métodos para registrar un nuevo cheque (por sí solo o vinculado a una venta), listarlos, obtener por ID y actualizar su estado.
- [x] 2.3 Crear `ChequeController` con operaciones CRUD (`GET /api/cheques`, `POST /api/cheques`, `PUT /api/cheques/{id}`).
- [x] 2.4 Modificar el dto de requests de ventas (`VentaRequestDTO` y `DetallePagoRequestDTO`) para admitir la carga de datos del cheque al crear la venta.
- [x] 2.5 Modificar `VentaServiceImpl` para que al recibir un pago de tipo `CHEQUE`, capture los metadatos y cree el objeto `Cheque` persistido asociado a la venta.

## 3. Frontend: Modal de Nueva Venta

- [x] 3.1 En `NuevaVenta.jsx` / `ModalConfirmacionVenta.jsx`, cuando el usuario selecciona "CHEQUE" como método de pago, mostrar inputs adicionales (banco, numeroSerie, fechaCobro).
- [x] 3.2 Modificar el armado del JSON del checkout para enviar los metadatos del cheque en el array de pagos hacia la API `/api/ventas`.

## 4. Frontend: Sección Gestión de Cheques

- [x] 4.1 Crear un cliente API (`cheques.api.js`) para consumir el endpoint `/api/cheques`.
- [x] 4.2 Crear vista principal `Cheques.jsx` (lista paginada, tabla con cheques, y buscador).
- [x] 4.3 Incorporar un modal o sección para editar un cheque (actualizar su estado, indicar a quién se entregó si pasa a `ENTREGADO`, y fecha de entrega).
- [x] 4.4 Agregar la ruta en `App.jsx` y el link en la sidebar del `DashboardLayout.jsx`. ("Gestión Cheques").
