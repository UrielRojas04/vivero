# Modelo de Datos

> **Estado real (2026-08-10):** 9 entidades JPA en `backend/src/main/java/com/vivero/gestion/models/`. La ejecución de migraciones se maneja con `ddl-auto` + `DataInitializer` (seed de roles/permisos/usuarios demo). No hay `Usuario_Unidad_Rol` (RBAC plano). Las entidades transaccionales (Venta, VentaDetalle, MovimientoStock, Pago, HistorialBandejas) **no existen aún** — se crearán con `us-013-ventas-core` y siguientes.

## Entidades Reales (implementadas)

### 1. Seguridad y RBAC
- **`Usuario`**: `id`, `username`, `nombreCompleto`, `password` (hash BCrypt), `activo`. Relación N:M con `Rol`. *No requiere email.*
- **`Rol`**: `id`, `nombre`. Relación N:M con `Permiso` y con `Usuario`.
- **`Permiso`**: `id`, `codigo` (ej. `LEER_STOCK`, `ADMIN_DB`).

### 2. Catálogo
- **`Producto`**: `id`, `nombre`, `precioCosto`, `precioVenta`, `stockActual`.
  - *(`costeo-flexible-por-producto`, archivado 2026-08-20)* Campos nuevos: `ivaPorcentaje` y `costoEnvioPorcentaje`, ambos `BigDecimal(5,2)` **nullable, sin default**. `null` = hereda el valor por defecto de la `UnidadNegocio`; `0` = explícitamente no aplica ese componente (ver RN-07). Colección `descuentos` (`@OneToMany` a `ProductoDescuento`, `cascade=ALL`, `orphanRemoval=true`, `@BatchSize(25)` para evitar N+1 en el listado). El campo legado `descuentoProveedor` se mantiene intacto (no se borra ni se resignifica), pero ya no participa en ningún cálculo de costo — fue migrado a una fila de `ProductoDescuento` (`nombre="Proveedor"`) por una migración idempotente en `DataInitializer`.
- **`ProductoDescuento`** *(nueva, `costeo-flexible-por-producto`)*: `id`, `producto` (`@ManyToOne`), `nombre` (`String(100)`, obligatorio), `porcentaje` (`BigDecimal(5,2)`, obligatorio), `orden` (`Integer`). Tabla `producto_descuentos`. Representa un descuento **estable** del producto (acuerdo permanente con el proveedor); la lista se aplica en cascada, no se suma (ver RN-07). No modela descuentos puntuales de una compra (esos van en `PedidoDetalle.costoUnitarioPactado`).
- **`Insumo`**: `id`, `descripcion`, `costo`, `fechaCompra`. Para trazabilidad de gastos.

### 3. Clientes y Cuentas Corrientes
- **`Cliente`**: `id`, `nombreRazonSocial`, `telefono`. *(El teléfono queda preparado para la futura integración de enviar el PDF directo por WhatsApp).*
- **`CuentaCorrienteBandejas`**: `id`, `clienteId`, `balanceBandejas` (entero, deuda total).
- **`CuentaCorrienteDinero`**: `id`, `clienteId`, `balancePesos`. *(Si es positivo, el cliente debe dinero; si es negativo, tiene saldo a favor).*


## Entidades Planificadas (próximos changes)

### `us-013-ventas-core` (próximo)
- **`Venta`**: `id`, `clienteId`, `usuarioId`, `subtotal`, `descuento`, `totalFinal`, `estadoPago` (PAGADO/PARCIAL/DEBE), `fecha`, `remitoUrl`.
- **`VentaDetalle`**: `id`, `ventaId`, `productoId`, `cantidad`, `precioUnitarioHistorico`, `subtotal`.
- **`MovimientoStock`**: `id`, `productoId`, `cantidad`, `tipo` (IN/OUT), `motivo` (Venta, Descarte, Ajuste), `fecha`, `usuarioId`.

### Changes posteriores
- **`Pago`** (`us-013-ventas-pagos`): `id`, `ventaId`, `monto`, `fecha`, `usuarioId`.
- **`HistorialBandejas`** (`us-014-bandejas-flujo`): `id`, `clienteId`, `ventaId`, `cantidad`, `tipo` (ENTREGA/DEVOLUCION), `fecha`, `usuarioId`.

### Campos de costeo agregados a entidades ya implementadas (`costeo-flexible-por-producto`, archivado 2026-08-20)
> Nota: pese a la nota de estado de la cabecera de este documento (2026-08-10, desactualizada), `UnidadNegocio` y `MovimientoStock` ya existen y están en producción — se implementaron en changes archivados posteriores a esa fecha (`multi-negocio-core`, `us-013-ventas-core` y siguientes). Esta sección documenta sólo los campos que agregó `costeo-flexible-por-producto` sobre esas dos entidades; no es una resincronización completa del resto del documento.
- **`UnidadNegocio`**: campo nuevo `ivaPorcentaje` (`BigDecimal(5,2)`, default `ZERO`), simétrico al `costoEnvioPorcentaje` que ya existía. Es el default de IVA que hereda un producto de esa unidad cuando su propio `ivaPorcentaje` es `null` (ver RN-07).
- **`MovimientoStock`**: tres campos nuevos, todos **nullable y sin default**: `costoNeto` (`BigDecimal(12,2)`, el costo tras aplicar la cascada de descuentos, antes de IVA/envío), `ivaPorcentaje` (`BigDecimal(5,2)`, el IVA efectivo aplicado en ese movimiento) y `descuentoDetalle` (`String(500)`, snapshot textual de los descuentos aplicados, ej. `"Proveedor 10.00%; Volumen 5.00%"`). Se pueblan sólo en movimientos `INGRESO`/`AJUSTE_INICIAL` posteriores a este change; un egreso copia el desglose del último ingreso en vez de recalcularlo. Los movimientos anteriores al change quedan con las tres columnas en `NULL` (no hay recálculo retroactivo).

## Relaciones Clave (ERD Lógico)
- `Usuario` N:M `Rol` N:M `Permiso` (RBAC plano, sin tenant).
- `Cliente` 1:N `CuentaCorrienteBandejas` y `CuentaCorrienteDinero` (billeteras por cliente).

## Restricciones y Reglas de BD
- Las contraseñas NUNCA se guardan en texto plano (BCrypt, cost factor ≥ 12).
- `precioUnitarioHistorico` en `VentaDetalle` será obligatorio: si el precio de un producto cambia mañana, las ventas de hoy no deben verse afectadas (RN-04).