## 1. Backend: Modelo de Datos

- [x] 1.1 Crear entidad `FacturaCliente` (id, cliente, fechaApertura, fechaCierre, estado, unidadNegocioId).
- [x] 1.2 Crear entidad `FacturaConcepto` (id, factura, descripcion, monto, fecha).
- [x] 1.3 Modificar entidad `Venta` y `Pago` agregando el campo `factura` (relación ManyToOne).
- [x] 1.4 Crear interfaces `FacturaClienteRepository` y `FacturaConceptoRepository`.
- [x] 1.5 Modificar `DataInitializer` para agrupar históricamente las ventas y pagos de Vivero de cada cliente en una factura `CERRADA` inicial.

## 2. Backend: Lógica de Negocio y Controladores

- [x] 2.1 Modificar `VentaServiceImpl` para que, al confirmar una venta en Vivero, la asigne a la factura `ABIERTA` del cliente (o la cree si no existe).
- [x] 2.2 Modificar flujo de Pagos para que se asigne automáticamente a la factura correspondiente.
- [x] 2.3 Crear `FacturaClienteService` y su implementación (métodos: obtenerActiva, listarHistorial, agregarConcepto, cerrarFactura).
- [x] 2.4 Crear `FacturaClienteController` exponiendo los endpoints.
- [x] 2.5 Crear DTOs correspondientes (`FacturaClienteDTO`, `FacturaConceptoDTO`, etc.).

## 3. Frontend: API y Stores

- [x] 3.1 Crear `facturas.api.js` con las llamadas a los nuevos endpoints.
- [x] 3.2 Actualizar el sidebar/menú de navegación para incluir el acceso a la sección de Facturación.

## 4. Frontend: UI

- [x] 4.1 Crear vista principal `FacturasPage` (listado de clientes y sus estados resumidos).
- [x] 4.2 Crear vista de detalle `FacturaClientePage` que muestre:
  - Información del cliente y estado de la factura actual.
  - Pestañas/Secciones: Ventas asociadas, Pagos aplicados, Conceptos Extra.
- [x] 4.3 Implementar modal/formulario para "Agregar Concepto".
- [x] 4.4 Integrar la vista con Zustand (`useUIStore`) para feedback.
- [x] 4.5 Ajustar las rutas en `App.jsx` para soportar las nuevas vistas (`/facturas`, `/facturas/:clienteId`).
- [x] 4.6 Agregar botón y confirmación para "Cerrar Factura" cuando el cliente haya saldado el total adeudado.
