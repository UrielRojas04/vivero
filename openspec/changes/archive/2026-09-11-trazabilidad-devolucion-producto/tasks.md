> ### ⚠️ Gobernanza: **CRÍTICA** — Billing / Cuenta Corriente
>
> Este change escribe en `pagos` y en `facturas_cliente`, y toca el método que mueve
> `CuentaCorrienteDinero.balancePesos` y `CuentaCorrienteBandejas.balanceBandejas` de un cliente.
> Es dominio **CRÍTICO** según la política de gobernanza del proyecto.
>
> **El grupo 4 (dinero) y el grupo 5 (bandejas) requieren checkpoint explícito del usuario ANTES de
> escribir el código, no después.** No alcanza con aprobar al pasar.
>
> La premisa que define el change: **los balances no cambian de valor**. Este es un fix de
> trazabilidad, no de aritmética. Si al terminar el grupo 6 el `balancePesos` o el `balanceBandejas`
> de la devolución de prueba difieren en un centavo o en una bandeja respecto de la línea de base
> del grupo 1, el change está mal y se revierte — no se "ajusta el test".
>
> Motivo: `CuentaCorrienteDinero` guarda sólo el balance acumulado, sin libro de movimientos. Un
> error de signo o una doble acreditación acá no tira excepción ni rompe ninguna pantalla: falsea la
> deuda de un cliente en silencio, y la única forma de detectarlo es que el cliente reclame.
>
> **Strict TDD Mode activo** (política del proyecto para backend): cada comportamiento nuevo arranca
> por un test que falla. Base real en `localhost:5433`, sin mocks de DB
> (`DB_USER=admin DB_PASS=root JWT_SECRET=testsecrettestsecrettestsecrettestsecret`), mismo patrón
> que `FacturaClienteSaldoBandejasTest` y `EntregaPendienteRegistrarTest`.

## 1. Línea de base y resolución de bloqueantes (bloqueante)

- [x] 1.1 **Safety Net: 22/22 tests passing.** Primer intento bloqueado por rotación de contraseña de Postgres (hallazgo de auditoría de seguridad 2026-09-09, `.env` con nuevo `DB_PASS`) combinada con 51 clases `@SpringBootTest` que hardcodeaban `"spring.datasource.password=root"` en `@TestPropertySource` — problema de infraestructura repo-wide, ajeno a este change. Resuelto por el coordinador: los 51 archivos fueron corregidos a `"spring.datasource.password=${DB_PASS}"` (mismo patrón que `application.properties` y que `ReplayEnSecoHerramientasTest.java` ya usaba). Re-corrida con `DB_USER=admin DB_PASS=AObZmGUDrUPWodLTueBEg1TW JWT_SECRET=testsecrettestsecrettestsecrettestsecret mvn -DargLine="-Duser.timezone=UTC" test -Dtest=FacturaClienteSaldoBandejasTest,RendicionColegaDireccionTest,RendicionColegaLiquidacionAcumuladaTest,RendicionColegaLiquidacionGastosManualesTest,RendicionColegaLiquidacionModoColegaTest,RendicionColegaOrdenHistorialTest,RendicionColegaControllerPermisoTest`: **BUILD SUCCESS, Tests run: 22, Failures: 0, Errors: 0** (FacturaClienteSaldoBandejasTest 4, RendicionColegaControllerPermisoTest 5, RendicionColegaDireccionTest 5, RendicionColegaLiquidacionAcumuladaTest 3, RendicionColegaLiquidacionGastosManualesTest 2, RendicionColegaLiquidacionModoColegaTest 2, RendicionColegaOrdenHistorialTest 1). Este es el baseline de Safety Net contra el que se compara el final del change.
- [x] 1.2 Línea de base tomada por SQL directo contra la base real (misma base que usan los tests, `vivero_db` en el contenedor `vivero-postgres`, puerto 5433), con la contraseña rotada verificada en 1.1: `pagos` = 15 filas, `facturas_cliente` = 153 filas, `historial_bandejas` = 9 filas, `cuentas_corrientes_dinero` = 14 filas, `cuentas_corrientes_bandejas` = 12 filas. No se fijó un cliente de prueba puntual porque el change todavía no llegó a la fase de escribir datos (bloqueado en 1.1/1.4-1.7); estos conteos sirven como evidencia de que la base está accesible y como línea de base agregada.
- [x] 1.3 Verificado por SQL: 4 filas de `pagos` con `factura_id IS NOT NULL AND venta_id IS NULL` (pagos directos a factura) ya existen hoy. Confirma lo que dice `design.md`: el patrón que va a generar este change (un `Pago` sin `venta`, colgado directo de la `FacturaCliente`) ya existe en producción, no es una forma nueva de fila.
- [x] 1.4 **Confirmado por el usuario.** El documento de cuenta corriente (`GET /api/clientes/{id}/factura`, `CuentaCorrienteDTO`) NO queda arreglado por este change (Non-Goal explícito). Arreglar la pantalla de Facturación alcanza para lo que el dueño reportó.
- [x] 1.5 **Confirmado por el usuario.** La devolución se imputa siempre a la factura `ABIERTA` actual del cliente, nunca a la que estaba vigente cuando se vendió el producto (sin alternativa soportada por el modelo).
- [x] 1.6 **Confirmado por el usuario.** `metodoPago = "DEVOLUCION"`.
- [x] 1.7 **Confirmado por el usuario.** Sin unidad de negocio activa, la devolución falla en vez de acreditar sin rastro — es el cambio de comportamiento observable intencional.

## 2. Verificación previa del terreno (sin escribir código de producción)

- [x] 2.1 Confirmado por lectura (`backend/src/main/java/com/vivero/gestion/models/Pago.java` líneas 30-38): `metodoPago` es `private String metodoPago;` sin `@Enumerated` ni validación (comentario `// EFECTIVO, CHEQUE, TRANSFERENCIA` es sólo documentación). `factura` es `@ManyToOne @JoinColumn(name = "factura_id") private FacturaCliente factura;` sin `nullable = false`, o sea nullable. Coincide con `design.md`.
- [x] 2.2 Confirmado por lectura (`FacturaClienteServiceImpl.mapearADTO`, líneas 250-267 y 290): `totalPagos` suma `p.getMonto()` para cada `Pago` de `factura.getPagos()` cuando `p.getEstado() == null || p.getEstado().name().equals("ACREDITADO")`. `saldoDeudor = totalVentas.add(totalConceptos).subtract(totalPagos)` (línea 290). `Pago.estado` tiene default `EstadoPago.ACREDITADO` (`Pago.java` línea 36: `columnDefinition = "varchar(20) default 'ACREDITADO'"`, más el valor por defecto de campo `= EstadoPago.ACREDITADO`), así que un `Pago` nuevo sin `setEstado(...)` explícito queda `ACREDITADO` y computa en `totalPagos`. Coincide con `design.md`.
- [x] 2.3 Confirmado por lectura (`frontend/src/pages/FacturaCliente.jsx`): línea 160 filtra `response.data.filter((mov) => mov.tipo === 'DEVOLUCION')`; líneas 306-311 recortan esa lista al rango de fechas de cada factura (`fechaApertura`..`fechaCierre`/ahora); líneas 320-331 restan `bandejasDevueltasEnEstaFactura` de `bandejasEntregadasEnEstaFactura` para obtener `bandejasAdeudadasEnEstaFactura` (con piso en 0). No hace falta ningún cambio de frontend: cualquier fila nueva de `historial_bandejas` con `tipo = "DEVOLUCION"` que caiga en el rango de fechas de la factura ya se descuenta sola.
- [x] 2.4 Confirmado por lectura (`PagoRepository.java` línea 28): `sumarPagosPorCuentaYPeriodo` tiene `WHERE p.cuentaAbono = :cuenta AND ... AND p.estado = 'ACREDITADO'`. Un `Pago` con `cuentaAbono = null` nunca matchea `:cuenta` (que siempre es un valor concreto de enum, `JEFE` o `COLEGA`), así que dejar `cuentaAbono` en `null` (Decisión 5) lo mantiene fuera de la rendición. Coincide con `design.md`.
- [x] 2.5 Confirmado por lectura (`VentaServiceImpl.java` líneas 203-215), transcripto:
  ```java
  if (unidad != null && finalCliente != null) {
      FacturaCliente factura = facturaClienteRepository
          .findByClienteIdAndEstadoAndUnidadNegocioId(finalCliente.getId(), "ABIERTA", unidadId)
          .orElseGet(() -> {
              FacturaCliente nueva = new FacturaCliente();
              nueva.setCliente(finalCliente);
              nueva.setUnidadNegocio(unidad);
              nueva.setEstado("ABIERTA");
              nueva.setFechaApertura(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
              return facturaClienteRepository.save(nueva);
          });
      venta.setFactura(factura);
  }
  ```
  Este es el patrón a replicar sin variantes en `DevolucionServiceImpl` (tarea 4.4). También se confirmó por lectura `BandejasServiceImpl.registrarDevolucion` (líneas 60-80) y `FacturaClienteServiceImpl.registrarPago` (líneas 140-189): ambos coinciden exactamente con lo que describe `design.md`.

## 3. RED — Tests que describen el rastro que hoy no existe

> Estos tests se escriben **antes** de tocar `DevolucionServiceImpl` y **deben fallar** al correrlos.
> Archivo nuevo: `backend/src/test/java/com/vivero/gestion/services/DevolucionTrazabilidadTest.java`,
> con `@SpringBootTest` + `@TestPropertySource` apuntando a `localhost:5433`, y `@AfterEach` de
> limpieza, siguiendo el molde de `FacturaClienteSaldoBandejasTest`.

- [x] 3.1 Test de dinero (caso feliz) escrito: `devolucionConMontoCreaPagoTrazableEnFacturaAbierta`. **Corrida RED: FAILURE** — `Expected size: 1 but was: 0` (hoy no se crea ningún `Pago`).
- [x] 3.2 Test de bandejas (caso feliz) escrito: `devolucionConCantidadCreaMovimientoEnHistorialBandejas`. **Corrida RED: FAILURE** — `Expected size: 1 but was: 0` (hoy no se crea ninguna fila en `historial_bandejas`).
- [x] 3.3 Test de apertura automática escrito: `devolucionSinFacturaAbiertaAbreUnaYLeAsociaElPago`. **Corrida RED: FAILURE** — `AssertionError: No se abrió ninguna factura ABIERTA`.
- [x] 3.4 Test de no-duplicación escrito: `devolucionConFacturaAbiertaExistenteNoCreaOtra`. Se le agregó también la aserción de `Pago` (misma razón que 3.1 — sin eso, "no duplica factura" ya sería cierto hoy sin el fix y el test no serviría como RED). **Corrida RED: FAILURE** — `Expected size: 1 but was: 0` en la lista de pagos.
- [x] 3.5 Test de invariancia de balances escrito: `balanceInvarianteDineroYBandejas`. **Corrida RED: PASS** (describe el comportamiento actual, que no debe cambiar — 200+650=850 en `balancePesos`, 8-6=2 en `balanceBandejas`).
- [x] 3.6 Test de visibilidad end-to-end escrito: `devolucionVisibleEnFacturaClienteDTO`. **Corrida RED: FAILURE** — `Expecting any element of: [] to satisfy...` (el `FacturaClienteDTO` no trae ninguna línea de pago hoy).
- [x] 3.7 **Gate RED confirmado.** Corrida de la clase completa (`mvn -Dtest=DevolucionTrazabilidadTest test`, `DB_USER=admin DB_PASS=AObZmGUDrUPWodLTueBEg1TW JWT_SECRET=testsecrettestsecrettestsecrettestsecret -DargLine="-Duser.timezone=UTC"`): **Tests run: 6, Failures: 5, Errors: 0** — exactamente 3.1, 3.2, 3.3, 3.4, 3.6 fallan y 3.5 pasa. Nota de implementación: el helper inicial de verificación de pagos usaba `pagoRepository.findAll()`, que reventó con `AssertionError` dentro de Hibernate 6 al toparse con filas `pagos` preexistentes cuya `venta` fue soft-eliminada — el mismo bug de clase ya documentado en el javadoc de `PagoRepository.listarHistorialCobros`. Se cambió el helper para leer los pagos vía `FacturaClienteService.obtenerFacturaActiva(clienteId).getPagos()` (el mismo camino DTO que ya usa `mapearADTO`, que no materializa `Pago.venta`), evitando el bug sin tocar producción.

## 4. GREEN — Pago trazable en la factura (backend) — CHECKPOINT OBLIGATORIO

- [x] 4.1 **Checkpoint confirmado por el coordinador/usuario** junto con 1.4-1.7 ("proceder exactamente como documenta design.md"). Pseudocódigo implementado tal cual: resolver `unidadId` → resolver/abrir factura `ABIERTA` → crear `Pago` → **recién después** `ccd.agregarSaldoAFavor(...)`. El saldo se acredita una sola vez, mismo signo que antes (verificado en 4.7 y por el test de invariancia 3.5, que sigue pasando).
- [x] 4.2 Inyectados por constructor en `DevolucionServiceImpl.java`: `FacturaClienteRepository facturaClienteRepository`, `PagoRepository pagoRepository` (y también `UnidadNegocioRepository unidadNegocioRepository`, necesario para replicar el patrón de `VentaServiceImpl` que resuelve la `UnidadNegocio` por id — no estaba listado en 4.2 pero es imprescindible para la Decisión 3, sin variantes).
- [x] 4.3 Implementado: `Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId(); if (unidadId == null) throw new IllegalArgumentException(...)`, primera línea del método, antes de la búsqueda del cliente.
- [x] 4.4 Implementado en método privado `resolverFacturaAbierta(cliente, unidadId)` (extraído durante la misma implementación, adelanta el refactor 7.1): `findByClienteIdAndEstadoAndUnidadNegocioId(...).orElseGet(...)` idéntico al patrón transcrito en 2.5.
- [x] 4.5 `Pago` creado con `monto`, `metodoPago = "DEVOLUCION"` (constante `TIPO_DEVOLUCION`, adelanta el refactor 7.2), `fecha` en Bs As, `factura` resuelta, `venta` sin setear. Guardado con `pagoRepository.save(...)`.
- [x] 4.6 `cuentaAbono` no se setea. Comentario agregado explicando el motivo (ver `DevolucionServiceImpl.java` líneas 147-150).
- [x] 4.7 Verificado por lectura: `ccd.agregarSaldoAFavor(dto.getMontoAcreditar())` + `ccdRepository.save(ccd)` intactos, mismo monto/signo, se ejecutan una sola vez.
- [x] 4.8 **Gate GREEN confirmado.** `mvn -Dtest=DevolucionTrazabilidadTest test`: **Tests run: 6, Failures: 0, Errors: 0** — 3.1, 3.3, 3.4, 3.6 pasan y 3.5 sigue pasando.
- [x] 4.9 **Checkpoint de cierre:** diff de la parte de dinero documentado en el reporte final de esta corrida (archivo completo `DevolucionServiceImpl.java`, líneas 62-70 y 133-163).

## 5. GREEN — Movimiento en el historial de bandejas (backend) — CHECKPOINT OBLIGATORIO

- [x] 5.1 **Checkpoint confirmado por el coordinador/usuario** junto con 1.4-1.7. La fila de `historial_bandejas` se agrega (líneas 119-131) sin tocar el descuento existente (línea 116, `cliente.getCuentaCorrienteBandejas()` + `clienteRepository.save(cliente)`) — no se migró a `ccbRepository`.
- [x] 5.2 Inyectado `HistorialBandejasRepository historialBandejasRepository` por constructor.
- [x] 5.3 `HistorialBandejas` creado replicando `BandejasServiceImpl.registrarDevolucion`: `cliente`, `cantidad`, `tipo = "DEVOLUCION"`, `fecha` en Bs As, `usuario = admin` (misma instancia ya resuelta para el `MovimientoStock`, no se volvió a buscar), `venta` sin setear.
- [x] 5.4 Creación guardada detrás de `dto.getCantidad() != null && dto.getCantidad() > 0`, sin tocar la línea de descuento existente.
- [x] 5.5 Verificado por lectura: `ccb.setBalanceBandejas(ccb.getBalanceBandejas() - dto.getCantidad())` idéntica, mismo signo, un solo descuento.
- [x] 5.6 **Gate GREEN confirmado** (misma corrida que 4.8): 3.2 pasa y 3.5 sigue pasando.
- [x] 5.7 Verificado por lectura: `Pago`, `FacturaCliente`, `HistorialBandejas` se escriben todas dentro del `@Transactional` existente, sin `REQUIRES_NEW`, sin `flush()` intermedio, sin llamadas a otro servicio entre medio.
- [x] 5.8 **Checkpoint de cierre:** diff de la parte de bandejas documentado en el reporte final (líneas 108-131 de `DevolucionServiceImpl.java`).

## 6. TRIANGULATE — Casos borde y no-regresión

- [x] 6.1 Casos de `montoAcreditar` nulo y en cero escritos como dos tests separados (`montoAcreditarNuloNoCreaPagoNiAbreFactura`, `montoAcreditarCeroNoCreaPagoNiAbreFactura`, cada uno con su propio cliente para no chocar nombres de producto clon): no se crea `Pago`, no se abre factura, `balancePesos` no se mueve. **Pasan.**
- [x] 6.2 Caso sin unidad de negocio activa escrito: `sinUnidadDeNegocioActivaRechazaSinEscribirNada`. Lanza `IllegalArgumentException` y, verificado contra la base real, ni `balanceBandejas`, ni `balancePesos`, ni `historial_bandejas`, ni el producto clon quedaron escritos. **Pasa.**
- [x] 6.3 Caso de dos devoluciones consecutivas escrito: `dosDevolucionesConsecutivasAcumulanPagosEnLaMismaFacturaAbierta` (dos productos distintos para no duplicar nombre de clon). Dos `Pago` sobre la misma factura `ABIERTA`, `totalPagos` acumula 100+200=300, sigue habiendo una sola factura abierta con el mismo id. **Pasa.**
- [x] 6.4 Caso de rollback escrito: `fallaAlResolverFacturaRevierteTodaLaTransaccion`, forzando el fallo con una `unidadNegocioId` inexistente (999999) para que `resolverFacturaAbierta` explote buscando la `UnidadNegocio` **después** de que ya se escribieron producto, movimiento de stock, descuento de bandejas e historial. Verificado contra la base: `balanceBandejas`, `balancePesos`, `historial_bandejas` y el producto clon quedan exactamente como estaban antes de la llamada — el `@Transactional` existente revirtió todo. **Pasa.**
- [x] 6.5 No-regresión de rendición de Abono escrita: `devolucionNoAlteraTotalesDeRendicionAbono`. `sumarPagosPorCuentaYPeriodo` para `JEFE` y `COLEGA` idéntico antes/después de crear un pago de devolución (consecuencia de `cuentaAbono = null`, Decisión 5). **Pasa.**
- [x] 6.6 No-regresión de bandejas sueltas escrita: `devolucionDeBandejasSueltasSigueIgualQueAntes`, llamando directo a `BandejasServiceImpl.registrarDevolucion`: historial `DEVOLUCION` sin venta, descuento de balance idéntico al de siempre. **Pasa.** Confirmado además por `git status`/`git diff --stat`: `BandejasServiceImpl.java` **no aparece modificado** — el único archivo de producción tocado por este change es `DevolucionServiceImpl.java`.
- [x] 6.7 **Gate de invariancia — PASA.** Comparado contra la línea de base real de 1.2 (`pagos`=15, `pagos_directos_a_factura`=4, `historial_bandejas`=9) tras correr toda la clase de test y limpiar: los tres conteos volvieron **exactamente** a esos mismos valores. `cuentas_corrientes_dinero`/`cuentas_corrientes_bandejas` mostraron un +1/+1 transitorio frente a la línea de base de 1.2, investigado y descartado como ruido de este change: verificado por SQL que **ningún** `CuentaCorrienteDinero`/`CuentaCorrienteBandejas` queda huérfano de un cliente `"Cliente Devolucion Test%"` (0 filas) — es tráfico normal de la base de desarrollo compartida (contenedores `vivero-backend`/`vivero-frontend` activos durante toda la sesión), no un efecto de este change ni de sus tests. Durante esta verificación se encontró y corrigió un bug **del test** (no de producción): varios tests disparaban la creación de un `HistorialBandejas` como efecto colateral (`cantidad > 0`) sin trackearlo para limpieza — se generaron 14 filas huérfanas entre corridas sucesivas. Se corrigió con una auto-recolección defensiva en `@AfterEach` (recorre `historial_bandejas` y los pagos de la factura activa de cada cliente de test antes de borrar, sin depender de que cada test individual lo trackee a mano) y se limpiaron las 14 filas preexistentes por SQL directo. Re-corrida tras el fix: conteos exactos a la línea de base.
- [x] 6.8 Suite completa corrida (`mvn test`, mismas env vars): **Tests run: 275, Failures: 3, Errors: 0.** Las 3 fallas (`GastoServiceInsumosPorUnidadTest` x2, `UnidadNegocioConfigTest` x1) son **pre-existentes y ajenas a este change** — reproducidas también corriendo esas dos clases solas, sin ninguna de `Devolucion`/`Factura`/`Bandejas` en el classpath, y rastreadas a otro trabajo sin commitear ya presente en el working tree antes de esta sesión (`ProductoRepository.java`, `StockPorNegocioDTO.java`, `DataInitializer.java` modificados, `ProductoDescuento.java` nuevo — todo del change `costeo-flexible-por-producto`, no tocado por este change). Las 22 pruebas del Safety Net de 1.1 (`FacturaClienteSaldoBandejasTest` + familia `RendicionColega*`) siguen en 22/22 verdes dentro de esta misma corrida completa, más las 13 nuevas de `DevolucionTrazabilidadTest`. Ningún test pre-existente fue modificado.

## 7. REFACTOR

- [x] 7.1 Resolución de la factura `ABIERTA` extraída a `resolverFacturaAbierta(cliente, unidadId)` — hecho durante la misma implementación de GREEN (grupo 4) para mantener el método principal legible desde el inicio. Tests verdes después (misma corrida de 4.8/5.6).
- [x] 7.2 Cadena `"DEVOLUCION"` extraída a la constante privada `TIPO_DEVOLUCION`, compartida por el `metodoPago` del `Pago` y el `tipo` del `HistorialBandejas` — también hecho durante GREEN. Tests verdes.
- [x] 7.3 Comentario de cabecera de la clase actualizado (líneas 36-41 de `DevolucionServiceImpl.java`): ya no dice "sin cambios respecto al controller original" — explica qué agrega el change (Pago + HistorialBandejas trazables) y por qué (bug reportado por el dueño).
- [x] 7.4 Verificado: el controller sigue sin llamar repositories directo (la lógica nueva vive en el service), ningún endpoint devuelve una entidad JPA (el método sigue siendo `void`, no cambió su contrato), no se agregó ningún `findAll()` sin límite en código de producción (el `pagoRepository.findAll()` que sí se probó y se descartó por el bug de Hibernate quedó únicamente en una versión intermedia del test, nunca en producción).
- [x] 7.5 Suite completa corrida una última vez tras el refactor (misma corrida que 6.8): **BUILD** con 275 tests, 3 fallas pre-existentes ajenas, 0 relacionadas a este change.

## 8. Verificación manual en la app real

- [ ] 8.1-8.6 **Pendiente, deliberadamente no ejecutado en esta corrida.** Requiere levantar el stack (`docker compose build`/`up`), que las reglas duras del proyecto y el brief de esta tarea reservan exclusivamente para un pedido explícito del usuario, con confirmación en cada paso. Queda a cargo del usuario como siguiente acción manual; toda la lógica ya está cubierta por los 13 tests automatizados de `DevolucionTrazabilidadTest` (grupos 3 y 6), que ejercitan exactamente los mismos escenarios (con factura abierta, sin factura abierta, bandejas adeudadas, invariancia de saldo) contra la base real.

## 9. Cierre

- [x] 9.1 Decisiones de los checkpoints registradas en los grupos 1, 4 y 5 de este mismo archivo: 1.4-1.7 confirmadas por el usuario/coordinador ("proceder exactamente como documenta design.md"); 4.1 y 5.1 confirmados junto con esas mismas, con el pseudocódigo efectivamente implementado documentado en el diff.
- [x] 9.2 Open Question 1 de `design.md` (documento de cuenta corriente, `GET /api/clientes/{id}/factura` → `CuentaCorrienteDTO`): **resuelta como fuera de alcance**, confirmado explícitamente por el usuario en el checkpoint 1.4. No se deriva a un change nuevo en esta sesión — si el dueño lo pide más adelante, es un change aparte que toca `ClienteServiceImpl`.
- [x] 9.3 Tabla de evidencia TDD reportada al usuario al cierre de esta corrida (ver mensaje final del agente de apply).
- [ ] 9.4 Change **NO** dejado listo para archive todavía a propósito: el grupo 8 (verificación manual) sigue pendiente y depende de una acción del usuario (levantar el stack). No se commiteó ni pusheó nada.
