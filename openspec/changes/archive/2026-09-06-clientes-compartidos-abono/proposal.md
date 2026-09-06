## Why

En el negocio Abono hay dos usuarios que operan bajo cuentas distintas (`CuentaAbono`: `JEFE` y `COLEGA` — Sergio e Pablo). Hoy `ClienteServiceImpl` particiona la lista de clientes por esa misma cuenta (`findAllByUnidadNegocioIdAndCuentaAbono` / `findByIdAndUnidadNegocioIdAndCuentaAbono`): cada usuario arma y ve su propia agenda de clientes, sin ver los que el otro cargó. El dueño quiere que ambos usuarios de Abono compartan una única lista de clientes — como ya sucede naturalmente en Vivero y Herramientas, donde no existe esta partición. Al ser un directorio único y no duplicado, la sección Finanzas (cuenta corriente por cliente) y Facturación (facturas/pagos por cliente) dejan de depender de qué usuario cargó al cliente: cualquiera de los dos puede facturarle o cobrarle al mismo cliente sin tener que recrearlo de su lado.

Importante: esto es exclusivo del negocio Abono — Vivero y Herramientas no tienen el concepto de `CuentaAbono` y no se ven afectados.

## What Changes

- `ClienteServiceImpl` deja de filtrar por `CuentaAbono` en Abono: `getAll()`, `getById()`, `update()`, `delete()`, `ajustarSaldo()` y `obtenerFactura()` usan el mismo camino que ya usan Vivero/Herramientas (`findAllByUnidadNegocioId` / `findByIdAndUnidadNegocioId`), sin importar si el usuario logueado es JEFE o COLEGA.
- `ClienteServiceImpl.create()` deja de asignarle una `CuentaAbono` al cliente nuevo — el cliente pasa a ser un registro de la unidad de negocio, no de una cuenta particular dentro de ella.
- Los métodos de `ClienteRepository` que filtran por `cuentaAbono` (`findAllByUnidadNegocioIdAndCuentaAbono`, `findByIdAndUnidadNegocioIdAndCuentaAbono`) quedan sin uso y se eliminan.
- No se toca la partición por `CuentaAbono` de Ventas, Pagos, Stock ni Rendición de Colega — esos siguen siendo independientes entre JEFE y COLEGA (es el modelo de negocio real: cada uno vende de su propio stock y rinde cuentas por separado). Sólo el directorio de clientes pasa a ser compartido.
- Finanzas (cuenta corriente por cliente) y Facturación (`FacturaClienteServiceImpl`) no requieren cambios de código: ya resuelven el cliente por `clienteId` sin re-filtrar por `cuentaAbono` — al compartirse la lista de clientes, automáticamente cualquiera de los dos usuarios puede facturarle/cobrarle al mismo cliente. Esto se documenta en `design.md` para dejar constancia de que se investigó y no hace falta tocar esos servicios.
- Diseño abierto a decidir en `design.md`: si la columna `cuenta_abono` de `Cliente` se conserva vacía/sin usar (más simple, sin migración) o se elimina de la entidad — dado que ya no se lee en ningún lado tras este cambio.

## Capabilities

### New Capabilities
(ninguna — extiende comportamiento existente)

### Modified Capabilities
- `backend-clientes`: la agenda de clientes de Abono deja de estar particionada por `CuentaAbono` (JEFE/COLEGA) — pasa a ser un único directorio compartido por unidad de negocio, igual que Vivero y Herramientas.

## Impact

- Backend: `ClienteServiceImpl` (quitar las ramas `cuentaAbono` de `getAll`, `getById`, `create`, `update`, `delete`, `ajustarSaldo`, `obtenerFactura`), `ClienteRepository` (eliminar los dos métodos de query que quedan sin uso).
- Sin impacto en Frontend: `ClienteDTO` ya no expone `cuentaAbono`, así que ningún componente lo lee ni lo filtra — la UI de Clientes, Finanzas y Facturación funciona igual, sólo que ahora ve la lista completa en vez de la mitad.
- Sin impacto en Ventas, Stock de Abono ni Rendición de Colega — su partición por `CuentaAbono` es intencional y se mantiene intacta.
