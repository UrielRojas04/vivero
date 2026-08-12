## 1. Lógica de Backend

- [x] 1.1 En `ChequeServiceImpl.actualizarEstado`, implementar lógica para identificar transición al estado `RECHAZADO`.
- [x] 1.2 Agregar condicional según `esEmisionPropia` para revertir saldo: `agregarDeuda` (si era propio, y falló el pago) o revertir sumando deuda (si era de tercero y el pago rebotó).
- [x] 1.3 Bloquear transición de salida si el estado actual ya es `RECHAZADO` (lanzar excepción o manejar en frontend).

## 2. Interfaz de Usuario

- [x] 2.1 En `Cheques.jsx`, detectar si el estado de un cheque es `RECHAZADO`.
- [x] 2.2 Deshabilitar los botones de acciones de estado (o menú desplegable) si el cheque está `RECHAZADO`.
- [x] 2.3 Agregar un confirm dialog (usando SweetAlert o `useUIStore.pushToast`) advirtiendo al usuario que pasar a `RECHAZADO` afectará la cuenta corriente y no se puede deshacer, antes de llamar al backend.

## 3. Pruebas y Validación

- [x] 3.1 Probar rechazar un cheque PROPIO y validar que la deuda del cliente aumente.
- [x] 3.2 Probar rechazar un cheque PARA CLIENTE y validar que el saldo del cliente se revierta a como estaba.
- [x] 3.3 Validar que no se puede cambiar de estado un cheque que ya está rechazado en el frontend.
