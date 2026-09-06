## 0. Alcance y red de seguridad

> **Archivos que este change NO toca bajo ninguna circunstancia:** `Venta.java`, `Pago.java`, `VentaServiceImpl.java`, `MovimientoStockAbono.java`, `StockAbonoServiceImpl.java`, `RendicionColegaServiceImpl.java`, `CuentaAbonoFilter.java`, `CuentaAbonoContextHolder.java`, `CuentaAbono.java` y todo el frontend. Si una task parece pedir tocarlos, está mal interpretada: releer `design.md` (Non-Goals).

- [x] 0.1 Correr la suite backend existente contra Postgres real (`localhost:5433`, `DB_USER=admin DB_PASS=root JWT_SECRET=testsecrettestsecrettestsecrettestsecret`) y anotar el baseline (`N tests passing`). Si algo ya falla antes de tocar nada, reportarlo como fallo preexistente y NO arreglarlo.
  - Baseline: 145 tests, 143 passing, 2 pre-existentes fallando (`UnidadNegocioConfigTest.testModeloCostoSeededCorrectly`, `GastoServiceInsumosPorUnidadTest.listarGastosDeAbonoIncluyeSusPropiosInsumos`) — no relacionados a este change, no tocados. Nota de entorno: hubo que agregar `-DargLine="-Duser.timezone=UTC"` a `mvn test` porque el JVM local toma `America/Buenos_Aires` como timezone por defecto y el Postgres del contenedor rechaza ese valor en `SET TimeZone`, tumbando el ApplicationContext completo. Es un problema de entorno local (no de este change) y no requiere tocar código de producción.
- [x] 0.2 Confirmar que el baseline incluye en verde `ClienteDocumentosTest`, `ClienteControllerGetAllPermisoAmpliadoTest`, `ClienteControllerCrearPermisoVentasTest` y `VentaServiceListarVentasAbonoTest` — son los cuatro que este change puede romper.
  - Confirmado: los cuatro en verde (7, 4, 5 y 2 tests respectivamente, 0 failures/errors).

## 1. Agenda compartida: listado y lectura por id

- [x] 1.1 RED — Nuevo test `ClienteAgendaCompartidaAbonoTest` (en `backend/src/test/java/com/vivero/gestion/services/`, patrón `@SpringBootTest` + `@TestPropertySource` a `localhost:5433`, sin mocks de DB, limpieza en `@AfterEach` de `UnidadNegocioContextHolder`, `CuentaAbonoContextHolder` y de los clientes creados). Caso: un cliente de Abono aparece en `clienteService.getAll()` tanto con `CuentaAbono.JEFE` como con `CuentaAbono.COLEGA` en contexto. Debe fallar con el código actual.
- [x] 1.2 GREEN — En `ClienteServiceImpl.getAll()`, eliminar la rama `if (unidadId == 3L && cuentaAbono != null)` y dejar únicamente `clienteRepository.findAllByUnidadNegocioId(unidadId)` cuando hay unidad en contexto. Correr el test hasta verde.
- [x] 1.3 TRIANGULAR — Agregar al mismo test: (a) un cliente creado con `JEFE` activa es legible por `getById` con `COLEGA` activa; (b) el caso inverso (`COLEGA` crea, `JEFE` lee). Ambos deben fallar antes de tocar `getById`.
- [x] 1.4 GREEN — Eliminar la misma rama en `ClienteServiceImpl.getById()`, dejando `findByIdAndUnidadNegocioId(id, unidadId)`. Verde.
- [x] 1.5 TRIANGULAR — Agregar el caso de aislamiento entre unidades: con una unidad distinta de Abono en contexto, `getAll()` no devuelve clientes de Abono. Debe pasar sin cambios (guarda de que no se rompió el multi-tenancy).

## 2. Agenda compartida: alta, edición, baja y saldo

- [x] 2.1 RED — Test: crear un cliente en Abono con una cuenta activa y verificar, leyendo la entidad desde `ClienteRepository`, que **no** quedó con cuenta operativa asignada. Falla hoy porque `create()` estampa la cuenta.
- [x] 2.2 GREEN — Quitar de `ClienteServiceImpl.create()` el bloque `if (unidadId == 3L) { ... cliente.setCuentaAbono(cuentaAbono); }`, dejando sólo la asignación de `unidadNegocio`. Verde.
- [x] 2.3 RED — Test: un cliente creado con `JEFE` activa puede ser actualizado (`update`) y ajustado de saldo (`ajustarSaldo`) con `COLEGA` activa, verificando que los cambios se persisten sobre el mismo id y que el balance queda con el valor esperado.
- [x] 2.4 GREEN — Eliminar la rama de cuenta en `update()`, `delete()`, `ajustarSaldo()` y `obtenerFactura()` de `ClienteServiceImpl`, dejando en las cuatro el camino `findByIdAndUnidadNegocioId(id, unidadId)`. Verde.
- [x] 2.5 TRIANGULAR — Agregar el caso de baja: `delete()` con la otra cuenta activa marca el cliente como borrado y deja de aparecer en `getAll()` para ambas cuentas.
- [x] 2.6 REFACTOR — Quitar de `ClienteServiceImpl` los imports que quedaron sin uso (`CuentaAbonoContextHolder`, `CuentaAbono`) y verificar que no queda ninguna referencia al literal `3L` en el archivo. Correr los tests después de cada paso.

## 3. Eliminación del campo y de las queries particionadas (Decisión 2 de design.md)

- [x] 3.1 Eliminar el campo `cuentaAbono` (con `@Enumerated` y `@Column(name = "cuenta_abono")`) de `backend/src/main/java/com/vivero/gestion/models/Cliente.java`. **No** escribir ningún `ALTER TABLE`: la columna física se conserva a propósito.
- [x] 3.2 Eliminar de `ClienteRepository` los métodos `findAllByUnidadNegocioIdAndCuentaAbono` y `findByIdAndUnidadNegocioIdAndCuentaAbono`, que quedan sin uso y sin campo que consultar.
- [x] 3.3 Compilar y correr la suite completa.
  - Compiló limpio (`mvn test-compile`, sin errores — no había consumidores no relevados). Suite: 152 tests, 150 passing, mismos 2 pre-existentes fallando (`UnidadNegocioConfigTest`, `GastoServiceInsumosPorUnidadTest`), cero regresiones. Un error de compilación acá significa que quedó un consumidor de `Cliente.cuentaAbono` sin relevar: identificarlo y reportarlo antes de seguir, no silenciarlo.
- [x] 3.4 Verificar por búsqueda que no queda ninguna referencia a `cuentaAbono` en `ClienteServiceImpl`, `ClienteRepository`, `Cliente.java` ni `ClienteDTO`, y que sí siguen existiendo en `Venta`, `Pago`, `MovimientoStockAbono`, `StockAbonoServiceImpl` y `RendicionColegaServiceImpl` (deben permanecer intactas).
  - Confirmado por grep: sin referencias en los cuatro archivos del directorio de clientes; intactas en los cinco archivos de ventas/stock/rendición.

## 4. Guarda de regresión: ventas, stock y rendición siguen particionados

- [x] 4.1 RED/GUARD — Test que, con la agenda ya compartida, crea dos ventas de Abono sobre **el mismo cliente**, una con `CuentaAbono.JEFE` y otra con `CuentaAbono.COLEGA`, y verifica que `ventaService.listarVentas()` con `JEFE` activa devuelve sólo la venta del jefe. Este test debe pasar en verde sin tocar código de ventas: si falla, el change se desbordó de su alcance.
- [x] 4.2 Correr `VentaServiceListarVentasAbonoTest`, `RendicionColegaLiquidacionModoColegaTest` y `RendicionColegaLiquidacionGastosManualesTest` y confirmar que siguen verdes con el mismo resultado que en el baseline de 0.1.
  - Confirmado: 2, 2 y 2 tests respectivamente, 0 failures/errors — mismo resultado que baseline.
- [x] 4.3 Correr `FacturaClienteSaldoBandejasTest` y `ClienteDocumentosTest` para confirmar que Facturación y el CRUD de documentos del cliente no se vieron afectados (Decisión 3 de design.md: no requieren cambios de código).
  - Confirmado: 4 y 7 tests respectivamente, 0 failures/errors.

## 5. Cierre

- [x] 5.1 Correr la suite backend completa y comparar contra el baseline de 0.1: mismos tests verdes más los nuevos, cero regresiones.
  - Final: 153 tests (145 baseline + 8 nuevos de `ClienteAgendaCompartidaAbonoTest`), 151 passing (143 baseline-passing + 8 nuevos), mismos 2 pre-existentes fallando (`UnidadNegocioConfigTest`, `GastoServiceInsumosPorUnidadTest`). Cero regresiones.
- [x] 5.2 Verificar a mano en la UI (dos sesiones, Sergio y Pablo) que la pantalla de Clientes de Abono muestra la misma lista para ambos y que se puede facturar y ajustar saldo del mismo cliente desde cualquiera de las dos. Sin cambios de frontend: si hiciera falta tocar algo del frontend, es un hallazgo a reportar, no a implementar sobre la marcha.
  - Verificado manualmente por el dueño del proyecto: confirmó en la UI real (dos sesiones) que ambos usuarios ven la misma lista de clientes de Abono y pueden operar sobre el mismo cliente. Ningún hallazgo que requiera tocar frontend.
- [x] 5.3 Dejar registrado en el resumen final: la columna `cuenta_abono` quedó huérfana en la tabla `clientes` a propósito (Decisión 2), para que se la incluya en la primera migración de limpieza si algún día el proyecto adopta Flyway.
  - Registrado: ver resumen de la sesión de apply. La columna física `cuenta_abono` de `clientes` queda con valores mixtos (JEFE/COLEGA en clientes viejos, NULL en los nuevos) y sin mapear en la entidad; no se dropeó porque el proyecto usa `ddl-auto=update` sin Flyway/Liquibase. Incluir en la primera migración de limpieza si el proyecto adopta una herramienta de migraciones versionadas.
