## 1. Modelos y Base de Datos (Backend)

- [x] 1.1 Revisar la entidad `MovimientoStock` y su enum de motivos (`MotivoMovimientoStock` o similar) para incorporar el concepto de `DEVOLUCION_SOBRANTE` como un ingreso válido.
- [x] 1.2 Revisar la estructura de la cuenta corriente de dinero y los movimientos financieros para asegurarse de que soportan el registro de una "Nota de Crédito" o ajuste a favor por devolución de mercadería.

## 2. Lógica de Negocio y Controladores (Backend)

- [x] 2.1 Implementar método en la capa de servicios (`CuentaCorrienteService` o similar) para procesar un crédito a favor del cliente dado un monto específico.
- [x] 2.2 Implementar método en la capa de servicios (`StockService` o `ProductoService`) para registrar el ingreso de stock del producto devuelto.
- [x] 2.3 Crear un nuevo DTO `DevolucionProductoDTO` que reciba `clienteId`, `productoId`, `cantidad` y `montoAcreditar`.
- [x] 2.4 Crear un endpoint (por ejemplo en `DevolucionController` o extendiendo `CuentaCorrienteController`) que exponga la operación `POST`, orquestando la actualización del stock y la cuenta corriente dentro de una misma transacción (`@Transactional`).

## 3. Integración con el Frontend (API y Estado)

- [x] 3.1 Crear/actualizar el archivo en `src/api/` (ej. `clientes.api.js` o `devoluciones.api.js`) añadiendo la función para hacer POST al nuevo endpoint de devolución.
- [x] 3.2 Asegurar que los componentes necesarios tengan acceso a la lista actualizada de productos (para armar el select de qué producto devuelve el cliente).

## 4. Desarrollo de Componentes (Frontend)

- [x] 4.1 Crear un componente `RegistrarDevolucionProductoModal.jsx` (modal) que solicite: Cliente (preseleccionado si se abre desde su perfil), Producto (select con búsqueda), Cantidad, y Monto Total a Acreditar.
- [x] 4.2 Agregar lógica en el modal para calcular y sugerir el "Monto Total a Acreditar" automáticamente basándose en el `precioVenta` actual del producto por la cantidad ingresada, pero dejando el campo editable para el usuario.
- [x] 4.3 Integrar validaciones en el formulario del modal (cantidad > 0, monto >= 0, producto requerido).

## 5. Ensamblado y Refinamiento (Frontend)

- [x] 5.1 Agregar un botón "Devolución de Producto" en el perfil de `CuentaCorrienteCliente.jsx` (cerca de los botones de cobro/venta) que despliegue el modal creado.
- [x] 5.2 Conectar el `onSave` / `onSubmit` del modal con el método de la API utilizando React Query.
- [x] 5.3 Implementar `queryClient.invalidateQueries` tras el éxito para refrescar el perfil del cliente (saldo en pesos actualizado) y el stock global de productos.
- [x] 5.4 Agregar notificaciones de éxito/error (`pushToast`) al completar la acción.
