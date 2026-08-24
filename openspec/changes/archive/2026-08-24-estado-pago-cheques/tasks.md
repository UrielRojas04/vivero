## Phase 1: Backend Database & Entities

- [x] Create `EstadoPago` enum with `ACREDITADO` and `RECHAZADO` in `backend/src/main/java/com/vivero/gestion/models/enums/EstadoPago.java`.
- [x] Add `estado` field to `Pago` entity with default `ACREDITADO`.
- [x] Add `estado` field to `PagoResponseDTO` and map it.

## Phase 2: Backend API & Logic

- [x] Modify `FacturaClienteServiceImpl` to calculate `saldoDeudor` excluding `RECHAZADO` payments.
- [x] Create `PUT /api/facturas/pagos/{pagoId}/rechazar` endpoint in `FacturaClienteController`.
- [x] Implement `rechazarPago` logic in `FacturaClienteServiceImpl`.

## Phase 3: Frontend

- [x] Add `rechazarPagoFactura` API call in `frontend/src/api/facturas.api.js`.
- [x] Update `FacturaCliente.jsx` to render payment methods individually.
- [x] Add `(X)` button next to `CHEQUE` methods that are `ACREDITADO`.
- [x] Add visual indication `CHEQUE(RECHAZADO)` and update colors for rejected payments.
- [x] Update frontend totals calculation (`totalAbonado`, footer totals) to ignore `RECHAZADO` payments.
