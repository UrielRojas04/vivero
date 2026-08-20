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

### RN-07: Costeo de Productos (fórmula canónica)
- *(Implementación: `costeo-flexible-por-producto`, archivado 2026-08-20. Calculador único: `backend/.../services/CostoCalculator.java` en backend, `frontend/src/utils/costeo.js` en frontend — misma fórmula, mismo orden, mismo redondeo en los dos lados.)*
- El costo unitario que se congela en cada `MovimientoStock` de tipo `INGRESO`/`AJUSTE_INICIAL` se calcula en este orden, y **no en otro**:
  1. **`costoBase`**: el costo de lista del producto (`Producto.costoProducto`), o el `costoUnitarioPactado` de la línea de pedido cuando el ingreso viene de la recepción de un pedido a proveedor.
  2. **Descuentos en cascada**: la lista libre de descuentos estables del producto (`ProductoDescuento`, cada uno con nombre y porcentaje) se aplica como **producto de factores**, no como suma: `neto = costoBase × Π(1 − descuento_i/100)`. Ejemplo: $10.000 con 10% + 5% da **$8.550** (la suma de porcentajes habría dado $8.500 — esa variante está descartada, no existe como opción).
  3. **IVA**: se calcula sobre el **neto con descuentos ya aplicados** (nunca sobre el bruto, nunca sobre el neto-más-envío) y **se suma** al costo — el negocio es monotributista, el IVA no es crédito fiscal recuperable, es costo real.
  4. **Envío**: se calcula también sobre el **mismo neto con descuentos**, en paralelo al IVA (no uno sobre el resultado del otro), y se suma al costo.
  5. **`costoUnitario` final** = `neto + montoIVA + montoEnvío`.
- **Fallback producto → unidad de negocio**, tanto para IVA como para envío: si el campo del producto (`Producto.ivaPorcentaje` / `Producto.costoEnvioPorcentaje`) es `null`, se usa el valor por defecto de su `UnidadNegocio` (`UnidadNegocio.ivaPorcentaje` / `costoEnvioPorcentaje`). Si el campo del producto está en `0` (explícito), **no** cae al default: `0` significa "este producto no paga este componente", `null` significa "hereda el default de la unidad". Confundir los dos rompe la regla.
- **Descuento estable de producto vs. descuento puntual de una compra — distinción obligatoria:**
  - Un descuento **estable** (un acuerdo permanente con el proveedor, ej. "Proveedor 10%", "Volumen 5%", "Pronto pago 2%") va en la lista de `ProductoDescuento` del producto y se aplica en todo ingreso futuro.
  - Un descuento **puntual de una compra puntual** — típicamente el descuento por pagar en efectivo, que varía compra a compra y no es una condición fija del producto ni del proveedor — **no se modela como `ProductoDescuento`**. Se resuelve ajustando a mano el `costoUnitarioPactado` de la línea del pedido (mecanismo que ya existe desde `herramientas-pedidos-proveedores`), que pasa a ser el `costoBase` de ese ingreso puntual.
  - **Nunca cargar "Efectivo" (ni ningún descuento que varíe compra a compra) como fila fija en la lista de descuentos del producto.** Eso aplicaría ese descuento a todas las compras futuras, incluidas las que no se paguen en efectivo, y falsearía el costo de todas ellas en silencio.
- El desglose aplicado en el momento (`costoNeto`, `descuentoDetalle` con nombre+porcentaje de cada descuento, `ivaPorcentaje`, `costoUnitario`) queda **congelado** en el `MovimientoStock` de `INGRESO`. Un movimiento de egreso no recalcula: copia el desglose del último ingreso. Los movimientos anteriores a este change quedan con estas columnas en `NULL` y su `costo_unitario` histórico intacto — no hay recálculo retroactivo.