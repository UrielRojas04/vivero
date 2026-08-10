## 1. Backend: Entidad y Persistencia

- [x] 1.1 Crear la entidad JPA `Cliente` en `models/Cliente.java` (campos `id`, `nombreRazonSocial`, `telefono`).
- [x] 1.2 Crear el repositorio `ClienteRepository.java`.

## 2. Backend: Lógica de Negocio y API

- [x] 2.1 Crear el DTO `ClienteDTO.java`.
- [x] 2.2 Crear el servicio `ClienteService.java` y su implementación `ClienteServiceImpl.java` con métodos CRUD globales.
- [x] 2.3 Crear el controlador `ClienteController.java` mapeado a `/api/clientes`.

## 3. Frontend: Componentes y Vistas

- [x] 3.1 Actualizar `App.jsx` para incluir la ruta `/clientes` y enlazar `Clientes.jsx`.
- [x] 3.2 Actualizar `DashboardLayout.jsx` para incluir el enlace a "Clientes" en el sidebar.
- [x] 3.3 Crear el modal de formulario `ClienteForm.jsx` (glassmorphism, mobile-friendly).
- [x] 3.4 Crear la página `Clientes.jsx` con fetch inicial, tabla en desktop y cards en mobile.
- [x] 3.5 Implementar funciones CRUD (`POST`, `PUT`, `DELETE`) en `Clientes.jsx` usando el modal y llamadas Axios.

## 4. Verificación y Testing

- [x] 4.1 Reiniciar backend y compilar frontend (Docker Compose).
- [x] 4.2 Probar la creación, edición y eliminación de un cliente desde la interfaz.
- [x] 4.3 Comprobar que los clientes creados son visibles independientemente de la Unidad de Negocio en la que se esté operando (visibilidad global).
