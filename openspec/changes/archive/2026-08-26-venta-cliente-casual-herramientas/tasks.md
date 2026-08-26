## 1. Ajustes en Backend (Modelo y Endpoints)

- [x] 1.1 Agregar a la entidad `Venta` los campos de cliente casual: `clienteNombreCasual` y `clienteTelefonoCasual` (ambos String, mapeados a columnas). Modificar la relación con `Cliente` para que sea opcional/nullable.
- [x] 1.2 Actualizar el endpoint de creación de Venta (`POST /api/ventas`): Modificar el DTO de entrada para que `clienteId` sea opcional, y recibir un nuevo objeto `clienteAdHoc { nombre, telefono, casual }`.
- [x] 1.3 En el Servicio de Ventas (`VentaServiceImpl`), implementar la lógica:
  - Si viene `clienteAdHoc` y `casual == true`: Setear `clienteId = null`, y poblar los campos `clienteNombreCasual` y `clienteTelefonoCasual` en la entidad Venta.
  - Si viene `clienteAdHoc` y `casual == false`: Llamar al `ClienteService` para crear y guardar un nuevo Cliente con el Nombre y Teléfono recibidos para la Unidad de Negocio "Herramientas". Luego asignar este nuevo cliente a la Venta.
- [x] 1.4 Actualizar el servicio de obtención de Ventas (`VentaServiceImpl` y DTO de respuesta): Si `venta.cliente` es null, poblar el nombre y teléfono en el DTO usando los campos `clienteNombreCasual` y `clienteTelefonoCasual` para que el frontend siga viendo un "Cliente" en los listados.

## 2. Ajustes en Frontend (UI Ventas)

- [x] 2.1 En la vista de "Nueva Venta" (`NuevaVenta.jsx` o componente de Selección de Cliente), condicionar la renderización: si `unidadNegocioActiva === 'Herramientas'`, mostrar un botón/checkbox de "Cliente Express" o "Ingreso Manual".
- [x] 2.2 Al activar "Cliente Express", mostrar inputs para "Nombre" y "Teléfono", y un checkbox "Es cliente casual (no guardar en agenda)". Ocultar el selector de clientes existentes.
- [x] 2.3 Modificar el armado del payload de Venta: Si se usó Cliente Express, enviar `clienteId: null` y el objeto `clienteAdHoc: { nombre, telefono, casual }`.
- [x] 2.4 Verificar que en la tabla de Historial de Ventas (`VentasHistorial.jsx`), el nombre del cliente se muestre correctamente para clientes casuales (el backend debería mandarlo normalizado en el DTO, pero verificar si hace falta algún ajuste en la columna).

## 3. Pruebas y Validación

- [x] 3.1 Probar crear una venta con un cliente existente (debería funcionar igual que siempre).
- [x] 3.2 Probar crear una venta con cliente "express" marcado como casual. Verificar en BD que el `cliente_id` de la venta sea null, que los campos casuales estén poblados, y que NO se haya creado un nuevo cliente.
- [x] 3.3 Probar crear una venta con cliente "express" NO marcado como casual. Verificar en BD que se haya creado el cliente, y que la venta lo tenga asignado.
- [x] 3.4 Validar que el historial de ventas y la visualización de la factura muestren el nombre del cliente casual correctamente.
