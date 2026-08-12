## 1. Backend: Servicio y Controlador

- [x] 1.1 Revisar `ChequeDTO.java` para asegurar que contiene los campos necesarios (`clienteId`, `monto`, `banco`, `numeroSerie`, `fechaCobro`, `fechaRecepcion`).
- [x] 1.2 Implementar en `ChequeServiceImpl.java` el método `crearChequeManual(ChequeDTO dto)` que cree y guarde el cheque en estado `EN_CARTERA`, y que además sume el monto al saldo del cliente si `clienteId` está presente.
- [x] 1.3 Modificar o agregar en `ChequeController.java` el endpoint `POST /api/cheques` para invocar este nuevo servicio y retornar el cheque creado.

## 2. Frontend: Componente Modal

- [x] 2.1 Agregar/verificar en `cheques.api.js` (u otro) la llamada API para crear cheque (`crearCheque(payload)`).
- [x] 2.2 Crear `NuevoChequeModal.jsx` en `components/`. Incluir buscador de clientes, e inputs para Banco, N° Serie, Fechas y Monto (usando `FormattedNumberInput`).
- [x] 2.3 Manejar la mutación de guardado en el modal, mostrando notificaciones de éxito/error.

## 3. Frontend: Integración en Vista

- [x] 3.1 En `Cheques.jsx`, agregar un botón "Nuevo Cheque" en el header o barra de acciones.
- [x] 3.2 Integrar `NuevoChequeModal` en `Cheques.jsx` controlado por estado `isModalOpen`.
- [x] 3.3 Al cerrar con éxito el modal, invalidar las queries de `cheques` y `clientes` (si se usa React Query) para refrescar la tabla de cheques.
