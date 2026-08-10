## 1. Backend Data Model

- [x] 1.1 Crear entidad `HistorialBandejas` (id, clienteId, ventaId opcional, cantidad, tipo [ENTREGA/DEVOLUCION], fecha, usuarioId).
- [x] 1.2 Crear `HistorialBandejasRepository`.

## 2. Backend Services y Controllers

- [x] 2.1 Crear `BandejasService` y `BandejasServiceImpl` para registrar entregas y devoluciones que actualicen la `CuentaCorrienteBandejas` de forma atómica.
- [x] 2.2 Crear `BandejasController` con endpoints para consultar historial (`GET /api/clientes/{id}/bandejas/historial`) y registrar devoluciones (`POST /api/clientes/{id}/bandejas/devolucion`).
- [x] 2.3 Modificar `VentaServiceImpl` para que acepte un parámetro `bandejasEntregadas` opcional desde el DTO y llame a `BandejasService` para registrar la entrega vinculada al `ventaId`.
- [x] 2.4 Actualizar `VentaRequestDTO` y `VentaResponseDTO` (o endpoints relacionados) si es necesario.

## 3. Frontend - Modificaciones de Venta

- [x] 3.1 Agregar input numérico opcional "Bandejas entregadas" en `NuevaVenta.jsx`.
- [x] 3.2 Modificar el payload de creación de venta en `ventas.api.js` o `NuevaVenta.jsx` para incluir este dato.

## 4. Frontend - Flujo de Devoluciones

- [x] 4.1 Crear un Modal o vista de `DevolucionBandejas` accesible desde el listado de Clientes (botón "Devolver Bandejas").
- [x] 4.2 Consumir el nuevo endpoint `POST /api/clientes/{id}/bandejas/devolucion` para asentar devoluciones y actualizar el UI local.
- [x] 4.3 (Opcional) Crear una vista o modal `HistorialBandejasModal` para que el encargado de logística pueda revisar el historial físico.
