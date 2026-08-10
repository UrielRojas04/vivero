# Reglas de Negocio

Este documento detalla las reglas inviolables del núcleo del negocio, que deben estar protegidas en el backend (Service Layer).

### RN-01: Gestión de Stock
- No se permite stock negativo. Las ventas o ajustes de salida deben fallar si la cantidad supera el stock actual.
- Todo movimiento de stock genera un registro inmutable en `MovimientoStock`.

### RN-02: Aislamiento de Negocios
- Un usuario solo puede acceder a datos (Ventas, Productos, Stock, Finanzas) de la Unidad de Negocio en la que se encuentra logueado/actuando.
- El Jefe (SuperAdmin) puede cambiar de Unidad de Negocio, pero NUNCA puede visualizar balances consolidados (mezclados) de múltiples unidades en un mismo reporte.

### RN-03: Deuda de Bandejas (Cuenta Corriente)
- La deuda de bandejas es acumulativa. Una entrega suma deuda al cliente, una devolución resta deuda.
- Puede existir balance negativo (el cliente tiene bandejas a favor) si devuelve de más.
- Esta regla aplica exclusivamente a las unidades de negocio configuradas para usar bandejas (principalmente el Vivero).

### RN-04: Inmutabilidad Financiera de Ventas
- Al registrar una venta, el `precio_unitario` y `precio_costo` del momento exacto deben copiarse a la tabla `VentaDetalle`. Si el precio del producto cambia al día siguiente, el balance histórico no debe alterarse.

### RN-05: Seguridad y Acceso
- No existe el auto-registro. Todas las cuentas deben ser creadas por un usuario con permiso `USUARIOS_ADMIN` (generalmente el Jefe).
- La autenticación se realiza mediante Username y un PIN de seguridad (4-6 dígitos). No se requieren emails.

### RN-06: Pagos Parciales, Excedentes y Cuenta Corriente de Dinero (Global)
- Al registrar una venta, el Jefe (o un usuario con permisos) puede aplicar un descuento discrecional.
- Si una venta no se abona en su totalidad (Pago Parcial o Nulo), el saldo restante se registra automáticamente como deuda en la `CuentaCorrienteDinero` del cliente.
- Si el cliente **paga de más** (excedente), ese monto extra queda registrado como **saldo a favor** (balance negativo) en su cuenta corriente.
- **La cuenta corriente de dinero es GLOBAL:** El dinero es del cliente frente a la empresa. Un cliente puede usar el saldo a favor generado en "Plantas" para pagar mercadería en "Herramientas".
