## Why

Hoy `VentaServiceImpl.listarVentas()` (usado por la pantalla "Historial de Ventas", `/ventas/historial`) particiona las ventas de Abono por `CuentaAbono`: si Sergio (JEFE) mira el historial, sólo ve las ventas que él cargó; si Pablo (COLEGA) lo mira, sólo ve las suyas. Ninguno ve las del otro. Este mismo criterio de partición ya se sacó para Clientes (`clientes-compartidos-abono`) y se dejó explícitamente fuera de alcance — con guardas de regresión propias — en `clientes-compartidos-abono` e `historial-cobros-abono`, que documentaron "las ventas siguen particionadas por cuenta" como comportamiento intencional a preservar. El dueño ahora pide extender ese mismo criterio de "compartido entre los dos usuarios de Abono" al historial de ventas: quiere que Sergio y Pablo vean el mismo historial completo, no la mitad cada uno.

Nota importante de alcance: esto es específicamente sobre la **lista/consulta** de ventas (qué se ve en el historial). NO cambia quién puede vender de qué stock, ni el cálculo de rendición de cuentas (`RendicionColegaServiceImpl`), que sigue necesitando saber qué venta es de quién para calcular cuánto le corresponde a cada uno — eso sigue leyendo `Venta.cuentaAbono` directamente vía sus propios repositorios, no pasa por `listarVentas()`.

## What Changes

- `VentaServiceImpl.listarVentas()` deja de filtrar por `CuentaAbono` para Abono: usa el mismo camino que ya usan Vivero/Herramientas (`findAllByUnidadNegocioIdOrderByFechaDesc`), sin importar si el usuario logueado es JEFE o COLEGA. Mismo patrón exacto ya aplicado en `ClienteServiceImpl.getAll()` (change `clientes-compartidos-abono`).
- El repositorio `VentaRepository.findAllByUnidadNegocioIdAndCuentaAbonoOrderByFechaDesc` queda sin uso tras este cambio y se elimina (mismo criterio: no dejar código muerto que pueda reintroducir la partición sin querer).
- El test `VentaServiceListarVentasAbonoTest.unidadAbonoConCuentaJefeSoloDevuelveVentasDeJefe` (que hoy afirma la partición) se reescribe para afirmar lo contrario: con cualquiera de las dos cuentas activa, el historial trae AMBAS ventas (la de JEFE y la de COLEGA). El segundo test del mismo archivo (`unidadViveroNoFiltraPorCuentaAbonoAunConContextoResidual`, que protege a Vivero de un filtro por cuenta que nunca debió aplicarle) queda intacto — no es parte de este cambio.
- El escenario de `historial-cobros-abono` que documenta "las ventas siguen particionadas por cuenta" como guarda de regresión queda desactualizado por este cambio y se corrige en su spec archivada para reflejar el nuevo comportamiento (no se relanza ese change, sólo se sincroniza la spec principal).
- `VentaResponseDTO` ya expone `usuarioNombre` (quién registró la venta) — no hace falta agregar ningún campo nuevo para saber "de quién es" cada venta en el historial compartido.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `ventas-core`: el historial de ventas de Abono deja de estar particionado por `CuentaAbono` — pasa a ser compartido entre JEFE y COLEGA, igual que ya lo es la agenda de clientes.

## Impact

- Backend: `VentaServiceImpl.listarVentas()` (quitar la rama `cuentaAbono`), `VentaRepository` (eliminar el método de query que queda sin uso), `VentaServiceListarVentasAbonoTest` (reescribir el primer test).
- Sin impacto en `RendicionColegaServiceImpl` ni en el cálculo de liquidación/saldo de caja del colega — esos servicios leen `Venta.cuentaAbono` directo vía sus propios repositorios (`sumarVentasPorCuentaYPeriodo` y similares), no a través de `listarVentas()`.
- Sin impacto en Stock, Producción ni Traslados de Abono — su partición operativa (de dónde sale la mercadería, quién la cargó) no cambia.
- Frontend: ningún cambio de código — `HistorialVentas.jsx` ya consume `ventasApi.listarVentas()` tal cual; con el filtro sacado del backend, automáticamente muestra el historial completo.
