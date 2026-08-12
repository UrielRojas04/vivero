## 1. Backend: Endpoints de Ajuste y Eliminación

- [x] 1.1 Crear endpoint `DELETE /api/gastos/{id}` en `GastoController` y lógica en `GastoService` que utilice el `deleteById` para aprovechar el soft delete configurado por Hibernate.
- [x] 1.2 Crear endpoint `POST /api/clientes/{id}/saldo/ajuste` en `ClienteController` que reciba el monto a ajustar.
- [x] 1.3 Implementar la lógica en `ClienteService` para actualizar `balancePesos` en `CuentaCorrienteDinero` del cliente sumando/restando el monto recibido.

## 2. Frontend: Eliminación de Gastos

- [x] 2.1 Agregar función en la API del frontend (`gastos.api.js` u homólogo) para la petición DELETE del gasto.
- [x] 2.2 Agregar columna de acción en el listado de gastos de la sección "Finanzas" con un botón de icono de papelera (rojo).
- [x] 2.3 Implementar el manejador del botón que, al ser clickeado, pida confirmación (mediante `useUIStore`) y llame a la API de eliminación.
- [x] 2.4 Actualizar el estado de React Query (`queryClient.invalidateQueries(['gastos'])`) o mutar el estado local de Zustand para que la tabla y los resúmenes financieros se recalculen al eliminar el gasto.

## 3. Frontend: Ajuste Manual de Saldo del Cliente

- [x] 3.1 Agregar función en la API del frontend (`clientes.api.js`) para la petición POST del ajuste de saldo.
- [x] 3.2 Añadir un botón "Ajustar Saldo" en la tarjeta de Cuenta Corriente del panel del Cliente.
- [x] 3.3 Crear un modal simple (o prompt seguro con UI) que permita ingresar un monto positivo o negativo (y opcionalmente confirmar la acción).
- [x] 3.4 Conectar el modal a la llamada a la API y luego invalidar las queries del cliente para actualizar el saldo en la vista.
