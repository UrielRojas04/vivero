# Modelo de Datos

El diseño de la base de datos se fundamenta en un esquema centralizado con discriminación lógica por **Unidad de Negocio** (Tenant).

## Entidades Principales

### 1. Sistema Base y Seguridad (RBAC)
- **`UnidadNegocio`**: `id`, `nombre` (Ej: Plantas, Sustratos y Perlitas, Herramientas), `razon_social`, `domicilio_comercial`, `logo_url`, `activa`. *(Contiene los datos formales para imprimir en el remito).*
- **`Usuario`**: `id`, `username` (Ej: juan.perez), `nombre_completo`, `pin_hash` (PIN de 4-6 dígitos encriptado), `activo`. *No requiere email. Creación centralizada por el Jefe.*
- **`Rol`**: `id`, `nombre` (Ej: Encargado Vivero).
- **`Permiso`**: `id`, `codigo` (Ej: STOCK_EDITAR).
- **`Rol_Permiso`**: Tabla intermedia (N:M).
- **`Usuario_Unidad_Rol`**: Tabla pivote crítica. Define qué rol tiene un usuario en qué negocio específico (`usuario_id`, `unidad_id`, `rol_id`).

### 2. Catálogo y Finanzas
- **`Producto`**: `id`, `unidad_id` (FK), `nombre`, `precio_costo`, `precio_venta`, `stock_actual`. *Aislado por unidad*.
- **`Insumo`**: `id`, `unidad_id` (FK), `descripcion`, `costo`, `fecha_compra`. Para trazabilidad de gastos.

### 3. Clientes, Bandejas y Cuentas Corrientes
- **`Cliente`**: `id`, `nombre_razon_social`, `telefono`. *(Global. El teléfono queda preparado para la futura integración de enviar el PDF directo por WhatsApp).*
- **`CuentaCorrienteBandejas`**: `id`, `cliente_id` (FK), `balance_bandejas` (entero, deuda total). Sumatoria de todas las ventas adeudadas.
- **`HistorialBandejas`**: `id`, `cliente_id` (FK), `venta_id` (FK), `cantidad`, `tipo` (ENTREGA/DEVOLUCION), `fecha`, `usuario_id`. *Permite saber exactamente qué devolución pertenece a qué venta.*
- **`CuentaCorrienteDinero`**: `id`, `cliente_id` (FK), `balance_pesos`. *(Global. Si es positivo, el cliente debe dinero. Si es negativo, tiene saldo a favor. Al ser global, Juan puede usar el saldo a favor que le quedó de comprar Plantas para comprar Herramientas).*

### 4. Operaciones, Ventas y Pagos
- **`Venta`**: `id`, `unidad_id` (FK), `cliente_id` (FK), `usuario_id` (FK), `subtotal`, `descuento`, `total_final`, `estado_pago` (PAGADO/PARCIAL/DEBE), `bandejas_entregadas`, `bandejas_devueltas`, `fecha`, `remito_url`.
- **`VentaDetalle`**: `id`, `venta_id`, `producto_id`, `cantidad`, `precio_unitario_historico`, `subtotal`.
- **`Pago`**: `id`, `venta_id` (FK), `monto`, `fecha`, `usuario_id`. Para registrar los pagos parciales o posteriores de una venta.
- **`MovimientoStock`**: `id`, `producto_id` (FK), `cantidad`, `tipo` (IN/OUT), `motivo` (Venta, Descarte, Ajuste), `fecha`, `usuario_id` (Para auditoría).

## Relaciones Clave (ERD Lógico)
- Un `Usuario` puede operar múltiples `UnidadNegocio` si tiene registros en `Usuario_Unidad_Rol`.
- Toda `Venta` y `Producto` pertenece a una única `UnidadNegocio` (`tenant_id` lógico).
- El `Cliente` es global para evitar duplicar "Juan Pérez" si compra lechuga (Vivero) y luego tierra (Sustratos).

## Restricciones y Reglas de BD
- Las contraseñas NUNCA se guardan en texto plano (bcrypt).
- `precio_unitario_historico` en `VentaDetalle` es obligatorio: si el precio de un producto cambia mañana, las ventas de hoy no deben verse afectadas.
