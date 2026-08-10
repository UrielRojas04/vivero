# Reglas de Negocio

Este documento detalla las reglas inviolables del núcleo del negocio, que deben estar protegidas en el backend (Service Layer).

> **Nota de estado (2026-08-10):** RN-01 a RN-06 definen el contrato de negocio. Las reglas transaccionales (RN-01, RN-03, RN-04, RN-06) se implementarán con los changes de ventas (`us-013`+). La regla RN-02 original ("aislamiento por Unidad de Negocio") **fue eliminada** junto con el RBAC por tenant — reemplazada por el control de permisos planos.

### RN-01: Gestión de Stock
- No se permite stock negativo. Las ventas o ajustes de salida deben fallar si la cantidad supera el stock actual.
- Todo movimiento de stock genera un registro inmutable en `MovimientoStock`.
- *(Implementación: `us-013-ventas-core`.)*

### RN-02: Control de Acceso por Permisos Planos
- Un usuario solo puede realizar acciones para las que tenga el permiso correspondiente (ej. `ESCRIBIR_STOCK` para descontar stock, `ADMIN_DB` para gestionar usuarios).
- La UI oculta las secciones a las que el usuario no tiene permiso (Section Rendering Based on Roles) y las rutas están protegidas (Route Protection) — ver spec `user-rbac`.

### RN-03: Deuda de Bandejas (Cuenta Corriente)
- La deuda de bandejas es acumulativa. Una entrega suma deuda al cliente, una devolución resta deuda.
- Puede existir balance negativo (el cliente tiene bandejas a favor) si devuelve de más.
- *(Implementación: `us-014-bandejas-flujo`.)*

### RN-04: Inmutabilidad Financiera de Ventas
- Al registrar una venta, el `precioUnitario` y `precioCosto` del momento exacto deben copiarse a la tabla `VentaDetalle`. Si el precio del producto cambia al día siguiente, el balance histórico no debe alterarse.
- *(Implementación: `us-013-ventas-core`.)*

### RN-05: Seguridad y Acceso
- No existe el auto-registro. Todas las cuentas deben ser creadas por un usuario con permiso `ADMIN_DB` (generalmente el Jefe).
- La autenticación se realiza mediante **username + password** (hash BCrypt). No se requieren emails.
- Login con rate limiting (5 intentos/15 min por IP+email) en entorno productivo.

### RN-06: Pagos Parciales, Excedentes y Cuenta Corriente de Dinero
- Al registrar una venta, el vendedor puede aplicar un descuento discrecional.
- Si una venta no se abona en su totalidad (Pago Parcial o Nulo), el saldo restante se registra automáticamente como deuda en la `CuentaCorrienteDinero` del cliente.
- Si el cliente **paga de más** (excedente), ese monto extra queda registrado como **saldo a favor** (balance negativo) en su cuenta corriente.
- *(Implementación: `us-013-ventas-pagos`.)*