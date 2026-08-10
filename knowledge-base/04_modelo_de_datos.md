# Modelo de Datos

> **Estado real (2026-08-10):** 9 entidades JPA en `backend/src/main/java/com/vivero/gestion/models/`. La ejecución de migraciones se maneja con `ddl-auto` + `DataInitializer` (seed de roles/permisos/usuarios demo). No hay `Usuario_Unidad_Rol` (RBAC plano). Las entidades transaccionales (Venta, VentaDetalle, MovimientoStock, Pago, HistorialBandejas) **no existen aún** — se crearán con `us-013-ventas-core` y siguientes.

## Entidades Reales (implementadas)

### 1. Seguridad y RBAC
- **`Usuario`**: `id`, `username`, `nombreCompleto`, `password` (hash BCrypt), `activo`. Relación N:M con `Rol`. *No requiere email.*
- **`Rol`**: `id`, `nombre`. Relación N:M con `Permiso` y con `Usuario`.
- **`Permiso`**: `id`, `codigo` (ej. `LEER_STOCK`, `ADMIN_DB`).

### 2. Catálogo
- **`Producto`**: `id`, `unidadNegocioId` (FK a `UnidadNegocio` — vestigial), `nombre`, `precioCosto`, `precioVenta`, `stockActual`.
- **`Insumo`**: `id`, `unidadNegocioId`, `descripcion`, `costo`, `fechaCompra`. Para trazabilidad de gastos.

### 3. Clientes y Cuentas Corrientes
- **`Cliente`**: `id`, `nombreRazonSocial`, `telefono`. *(El teléfono queda preparado para la futura integración de enviar el PDF directo por WhatsApp).*
- **`CuentaCorrienteBandejas`**: `id`, `clienteId`, `balanceBandejas` (entero, deuda total).
- **`CuentaCorrienteDinero`**: `id`, `clienteId`, `balancePesos`. *(Si es positivo, el cliente debe dinero; si es negativo, tiene saldo a favor).*

### 4. Multi-negocio (VESTIGIAL)
- **`UnidadNegocio`**: `id`, `nombre`, `razonSocial`, `domicilioComercial`, `logoUrl`, `activa`. **Existe pero no se usa activamente**: no hay controller, `SecurityService` es dead code, y el frontend hardcodea `unidadNegocioId=1`.

## Entidades Planificadas (próximos changes)

### `us-013-ventas-core` (próximo)
- **`Venta`**: `id`, `unidadNegocioId`, `clienteId`, `usuarioId`, `subtotal`, `descuento`, `totalFinal`, `estadoPago` (PAGADO/PARCIAL/DEBE), `fecha`, `remitoUrl`.
- **`VentaDetalle`**: `id`, `ventaId`, `productoId`, `cantidad`, `precioUnitarioHistorico`, `subtotal`.
- **`MovimientoStock`**: `id`, `productoId`, `cantidad`, `tipo` (IN/OUT), `motivo` (Venta, Descarte, Ajuste), `fecha`, `usuarioId`.

### Changes posteriores
- **`Pago`** (`us-013-ventas-pagos`): `id`, `ventaId`, `monto`, `fecha`, `usuarioId`.
- **`HistorialBandejas`** (`us-014-bandejas-flujo`): `id`, `clienteId`, `ventaId`, `cantidad`, `tipo` (ENTREGA/DEVOLUCION), `fecha`, `usuarioId`.

## Relaciones Clave (ERD Lógico)
- `Usuario` N:M `Rol` N:M `Permiso` (RBAC plano, sin tenant).
- `Cliente` 1:N `CuentaCorrienteBandejas` y `CuentaCorrienteDinero` (billeteras por cliente).
- `Producto`/`Insumo` → FK vestigial a `UnidadNegocio`.

## Restricciones y Reglas de BD
- Las contraseñas NUNCA se guardan en texto plano (BCrypt, cost factor ≥ 12).
- `precioUnitarioHistorico` en `VentaDetalle` será obligatorio: si el precio de un producto cambia mañana, las ventas de hoy no deben verse afectadas (RN-04).