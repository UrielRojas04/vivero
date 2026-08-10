## 1. Store Zustand

- [x] 1.1 Crear archivo `frontend/src/store/useCartStore.js`.
- [x] 1.2 Configurar el store usando `create` de Zustand e importar el middleware `persist`.
- [x] 1.3 Definir el estado inicial del carrito: `clienteSeleccionado`, `detalles`, `descuento`, `metodoPago`, `fechaVenta`, `nota`, `bandejasEntregadas`.
- [x] 1.4 Crear las acciones para modificar cada propiedad: `setCliente`, `addDetalle`, `removeDetalle`, `updateDetalleCantidad`, `setDescuento`, etc., y una acción `clearCart` para vaciarlo tras confirmar la venta.

## 2. Refactor NuevaVenta.jsx

- [x] 2.1 Reemplazar los `useState` locales que manejan el carrito por llamadas al `useCartStore`.
- [x] 2.2 Ajustar las dependencias de los `useEffect` que recalculan totales para que usen el store global en lugar del estado local.
- [x] 2.3 Validar que el flujo de agregar producto, modificar cantidad y eliminar producto siga funcionando con las acciones del store.
- [x] 2.4 Al confirmar exitosamente la venta, invocar `clearCart` del store para reiniciar el ciclo y eliminar la persistencia.

## 3. Pruebas y Validación

- [x] 3.1 Probar añadir productos, cambiar de sección (ej. ir a Insumos) y volver, verificando que el carrito sigue allí.
- [x] 3.2 Refrescar la página (`F5`) y verificar que el estado se restaura gracias a la persistencia.
