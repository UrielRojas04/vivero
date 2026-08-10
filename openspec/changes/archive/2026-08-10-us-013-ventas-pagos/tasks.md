## 1. Backend: Entidades y Repositorios

- [x] 1.1 Crear entidad `Pago` (monto, metodoPago, fecha, Venta) y `PagoRepository`.
- [x] 1.2 Actualizar entidad `Venta` agregando campos `descuento`, `totalFinal`, y relación a `pagos`.
- [x] 1.3 Asegurar que `CuentaCorrienteDinero` tenga los métodos adecuados para sumar saldos o deudas.

## 2. Backend: DTOs y Lógica

- [x] 2.1 Actualizar `VentaRequestDTO` y `VentaResponseDTO` (y crear `PagoRequestDTO`).
- [x] 2.2 Refactorizar `VentaServiceImpl` para calcular `totalFinal` (subtotal - descuento) y guardar los pagos enviados.
- [x] 2.3 Incluir en la transacción lógica para detectar diferencias (Pagado vs TotalFinal) e impactar la `CuentaCorrienteDinero` del cliente (creando la cuenta si no existe).

## 3. Frontend: Modal de Liquidación

- [x] 3.1 Modificar Payload de Venta en `NuevaVenta.jsx`.
- [x] 3.2 Crear componente Modal/Sección de Pago en `NuevaVenta.jsx` que pida el descuento y los pagos antes del Submit final.
- [x] 3.3 Mostrar el resumen financiero al operador (Subtotal, Descuento, Total, Pagado, Diferencia/Deuda) en tiempo real en el frontend.
