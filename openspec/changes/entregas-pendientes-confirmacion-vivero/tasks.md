# Tasks — entregas-pendientes-confirmacion-vivero

> **Strict TDD Mode activo.** Cada tarea de backend sigue el ciclo RED → GREEN → TRIANGULATE → REFACTOR.
> Cero código de producción antes de su test. Base real Postgres `localhost:5433`, **sin mocks de DB**
> (`DB_USER=admin DB_PASS=root JWT_SECRET=testsecrettestsecrettestsecrettestsecret`), patrón
> `@SpringBootTest` + `@TestPropertySource` de `PrecioAjustadoVentaTest` / `HistorialCobrosAbonoControllerPermisoTest`.
> Referencias: escenarios normativos en `specs/entregas-pendientes-vivero/spec.md`; decisiones D1-D14 en `design.md`.

## 1. Red de seguridad y línea base

- [x] 1.1 Correr la suite completa de backend ANTES de tocar nada y anotar acá el conteo exacto de tests que pasan (`N tests passing`). Si alguno falla ya, reportarlo como *pre-existing failure* y NO arreglarlo dentro de este change.
  - **Baseline: 206 tests run, 203 passing, 3 failures, 0 errors.** Las 3 fallas son *pre-existing failures* de un change en curso sin relación (`costeo-flexible-por-producto`, ver working tree sucio antes de empezar), NO se tocan en este change: `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly`, `GastoServiceInsumosPorUnidadTest.listarGastosDeAbonoIncluyeSusPropiosInsumos`, `GastoServiceInsumosPorUnidadTest.listarGastosDeViveroSigueIncluyendoSusPropiosInsumos`.
  - **Gotcha de entorno (no es del change):** en este host Windows, `mvnw test` sin más falla el 100% de los `@SpringBootTest` con `FATAL: invalid value for parameter "TimeZone": "America/Buenos_Aires"` — la JVM traduce el TZ de Windows ("Argentina Standard Time") al alias legacy `America/Buenos_Aires`, que el tzdata de la imagen `postgres:15` no reconoce (sólo tiene `America/Argentina/Buenos_Aires`). Workaround usado en TODA corrida de este change: `-DargLine="-Duser.timezone=UTC"`.
- [x] 1.2 Anotar el subconjunto que constituye la red de regresión de venta, que debe seguir verde **sin modificarse** durante todo el change: `PrecioAjustadoVentaTest`, `VentaDocumentoCasualTest`, `VentaResponseDocumentoTest`, `VentaServiceListarVentasAbonoTest`, `VentaServiceObtenerPorIdTest`, `FinanzasBaselineTest`, `VentaControllerObtenerPorIdPermisoTest`.
  - **Baseline exacto: 25 tests (9+4+4+2+3+1+2), 0 failures, 0 errors.**
- [x] 1.3 Verificar que la base de test responde en `localhost:5433` y que la unidad "Vivero" existe (`unidadNegocioRepository.findByNombre("Vivero")`).
  - Confirmado: `docker exec vivero-postgres psql` responde, `UnidadNegocioConfigTest`/`FinanzasBaselineTest` (que dependen de la unidad Vivero sembrada) corren y usan esa unidad sin error de "unidad no encontrada".

## 2. Enum de movimientos de stock (D1)

- [x] 2.1 RED: test que registra un movimiento de tipo `ENTREGA_PENDIENTE` sobre un producto de Vivero y verifica que se persiste con la cantidad y el desglose de costo copiado del último ingreso. Falla porque el valor de enum no existe.
- [x] 2.2 GREEN: agregar `ENTREGA_PENDIENTE` y `REVERSA_ENTREGA_PENDIENTE` a `TipoMovimientoStock`, **al final**, sin reordenar los existentes.
- [x] 2.3 TRIANGULATE: segundo caso — tras registrar un `ENTREGA_PENDIENTE`, una venta normal posterior del mismo producto sigue congelando el `costoUnitarioHistorico` del `INGRESO` original (el tipo nuevo NO entra en `findFirstByProductoIdAndTipoMovimientoIn([INGRESO, AJUSTE_INICIAL])`). Tercer caso: el movimiento nuevo NO crea ninguna `CapaCostoStock`.
- [x] 2.4 TRIANGULATE: mismo par de aserciones para `REVERSA_ENTREGA_PENDIENTE`.
- [x] 2.5 Verificar por búsqueda que ningún `switch`/pattern-match sobre `TipoMovimientoStock` quedó incompleto en backend, y que el frontend no referencia el enum. Dejar constancia del resultado en el resumen final (la auditoría previa dio 0 `switch` y 0 referencias en frontend — confirmarlo, no asumirlo).
  - **Reconfirmado independientemente:** `grep -rn "TipoMovimientoStock\."` → 13 ocurrencias en 7 archivos backend (DataInitializer, DevolucionServiceImpl, PedidoServiceImpl, MovimientoStockServiceImpl x4, VentaServiceImpl, ProductoServiceImpl x4, SiembraServiceImpl); 0 `switch` sobre el enum; `frontend/src` → 0 referencias a `TipoMovimientoStock`/`tipoMovimiento`/`AJUSTE_INICIAL`/`DEVOLUCION_SOBRANTE`. Coincide exacto con la auditoría de design.md.
  - Test: `backend/src/test/java/com/vivero/gestion/services/EntregaPendienteMovimientoStockTest.java` (3 tests, 0 failures).

## 3. Permisos nuevos (D8)

- [x] 3.1 RED: test que verifica `PermisoEnum.fromId(22L) == LEER_ENTREGAS` y `fromId(23L) == ESCRIBIR_ENTREGAS`, y que los IDs 1..21 siguen mapeando a los mismos permisos que antes.
- [x] 3.2 GREEN: agregar `LEER_ENTREGAS(22L)` y `ESCRIBIR_ENTREGAS(23L)` **al final** de `PermisoEnum`.
- [x] 3.3 TRIANGULATE: test de que `GET /api/roles/permisos` (vía `RolService.getAllPermisos()`) devuelve los dos permisos nuevos con sus IDs — confirma que el endpoint que alimenta el modal de roles no necesita cambios.
- [x] 3.4 RED/GREEN: test de que el rol `COLEGA` sembrado por `DataInitializer` NO contiene `LEER_ENTREGAS` ni `ESCRIBIR_ENTREGAS`, y que `JEFE` sí contiene ambos. Implementar quitándolos de `permisosColega` en `DataInitializer`, con comentario en el estilo del de `LEER_CONFIGURACION`.
  - Tests: `PermisoEnumEntregasTest.java` (unitario puro), `EntregaPendientePermisosSeedTest.java` (`@SpringBootTest`) — ambos en verde.

## 4. Modelo y repositorios (D12)

- [x] 4.1 Crear el enum `EstadoEntregaPendiente { PENDIENTE, CONFIRMADA, RECHAZADA }`.
- [x] 4.2 Crear la entidad `EntregaPendiente` (tabla `entregas_pendientes`) con los campos de D12, `@SQLDelete`/`@SQLRestriction` de soft-delete como el resto del repo, y `firmaBase64` como `TEXT` `nullable = false`.
- [x] 4.3 Crear la entidad `EntregaPendienteDetalle` (tabla `entrega_pendiente_detalles`) con FK a la entrega, al producto y al `MovimientoStock` (D3), más `cantidad`.
- [x] 4.4 Crear `EntregaPendienteRepository` con: página por unidad + estado ordenada por fecha ascendente; página por unidad + usuario que registró; y `findByIdWithDetalles`. Nada de `findAll()` sin límite.
- [x] 4.5 RED/GREEN: test de repositorio que persiste una entrega con dos detalles y la recupera con sus detalles y su firma intactos (round-trip de la data-URL completa, sin truncar).
  - Test: `EntregaPendienteRepositoryTest.java` — round-trip con firma de ~50KB, en verde.

## 5. DTOs (regla dura: nunca entidades JPA en endpoints)

- [x] 5.1 `EntregaPendienteRequestDTO` (`clienteId`, `observacion?`, `firmaBase64`, `detalles: [{productoId, cantidad}]`).
- [x] 5.2 `EntregaPendienteResumenDTO` — **sin firma** (D6): id, fecha, cliente, usuario que registró, estado, cantidad de líneas, cantidad total de unidades.
- [x] 5.3 `EntregaPendienteResponseDTO` — detalle con líneas (producto, cantidad, precio de lista actual como referencia), estado, resolución; **sin firma**.
- [x] 5.4 `EntregaPendienteFirmaDTO` (`firmaBase64`) y `EntregaPendienteRechazoDTO` (`motivo?`).
- [x] 5.5 `EntregaPendienteConfirmarRequestDTO` (`porcentajeDescuento?`, `lineas: [{detalleId, precioUnitario}]`, `pagos: [PagoRequestDTO]`).
  - Compilación limpia (`mvnw compile`). 8 archivos DTO en `backend/src/main/java/com/vivero/gestion/dto/` (incluye `EntregaPendienteDetalleRequestDTO`/`EntregaPendienteDetalleResponseDTO`/`EntregaPendienteConfirmarLineaDTO` como DTOs anidados propios, ninguno expone entidades JPA).

## 6. Servicio: registrar entrega (D5, D7, D9)

- [x] 6.1 RED: registrar una entrega válida en Vivero descuenta el stock y NO crea ninguna `Venta` (escenario "Registro exitoso descuenta stock y no crea venta").
- [x] 6.2 GREEN: `EntregaPendienteService` + `EntregaPendienteServiceImpl` con `registrar(request, username)`, `@Transactional`, guard de unidad Vivero primero (D9), y descuento de stock + `MovimientoStock` `ENTREGA_PENDIENTE` + `sseService.emitStockUpdate` por línea.
- [x] 6.3 TRIANGULATE: stock insuficiente → rechaza sin persistir nada ni mover stock.
- [x] 6.4 TRIANGULATE: cantidad 0 o negativa → rechaza sin persistir nada.
- [x] 6.5 TRIANGULATE: sin `clienteId` (o cliente inexistente) → rechaza (D7, no se acepta cliente casual).
- [x] 6.6 TRIANGULATE: entrega sin líneas → rechaza.
- [x] 6.7 RED/GREEN/TRIANGULATE: validación de firma — ausente, en blanco, prefijo distinto de `data:image/png;base64,` y string de más de 512 KB → rechazan; firma válida → se persiste y se recupera idéntica.
- [x] 6.8 TRIANGULATE: la entrega queda `PENDIENTE`, con fecha, unidad Vivero y usuario que la registró; y su línea referencia el `MovimientoStock` creado (D3).
- [x] 6.9 TRIANGULATE: con la unidad activa Herramientas o Abono, `registrar` lanza y no persiste ni mueve stock (D9).
- [x] 6.10 REFACTOR: extraer la validación de firma a un método privado propio; correr tests tras cada paso.
  - Test: `EntregaPendienteRegistrarTest.java` — 9/9 tests en verde (`Tests run: 9, Failures: 0, Errors: 0`). `validarFirma` y `exigirUnidadVivero` ya nacieron como métodos privados propios (REFACTOR incorporado desde el GREEN, sin un paso separado).
  - Nota no bloqueante: Hibernate emite un WARN de DDL ("alter column ... set data type ... default") al arrancar el contexto por `columnDefinition` con `default` en `estado` — mismo comportamiento pre-existente que ya tienen `pagos.estado`/`registros_semillas.estado` (columnas ya creadas con ese default; el ALTER re-declarativo de `ddl-auto=update` no es válido en Postgres para esa sintaxis). No es un error, no aborta el arranque, y no es nuevo de este change.

## 7. Servicio: listados paginados (D6, D10)

- [x] 7.1 RED/GREEN: `listarPorEstado(estado, pageable)` devuelve `Page<EntregaPendienteResumenDTO>` de la unidad Vivero, pendientes primero por fecha ascendente.
- [x] 7.2 TRIANGULATE: la paginación es real — con 3 entregas y `size=2`, la página 0 trae 2 elementos y `totalElements` es 3.
- [x] 7.3 TRIANGULATE: ningún elemento del listado contiene la firma (D6).
- [x] 7.4 RED/GREEN: `listarMias(username, pageable)` devuelve sólo las entregas registradas por ese usuario.
- [x] 7.5 TRIANGULATE: con dos usuarios que registraron entregas, cada uno ve únicamente las suyas (escenario "El empleado ve sólo lo que registró él").
- [x] 7.6 RED/GREEN: `obtenerPorId` devuelve el detalle con sus líneas y sin firma; `obtenerFirma` devuelve el data-URL completo.
- [x] 7.7 TRIANGULATE: una entrega de otra unidad de negocio no es accesible por id desde Vivero.
  - Test: `EntregaPendienteListadosTest.java` — 5/5 en verde. Nota de interpretación: como el guard Vivero-only impide que exista una `EntregaPendiente` fuera de Vivero, 7.7 se ejerce cambiando la unidad activa a Herramientas y confirmando que `obtenerPorId` de una entrega real de Vivero se rechaza igual (mismo guard que cubre el caso).

## 8. Reutilización del camino de venta (D4) — el punto de mayor riesgo de regresión

- [x] 8.1 Safety net: correr la red de regresión de venta de la tarea 1.2 y anotar el conteo ANTES de tocar `VentaServiceImpl`.
  - **Baseline confirmado: 25 tests, 0 failures, 0 errors** (mismo conteo que 1.2).
- [x] 8.2 REFACTOR puro (sin cambio de comportamiento): extraer el cuerpo de `crearVenta` a un privado `crearVentaInterna(request, username, movimientosPorLinea)` y dejar `crearVenta` delegando con `null`. Correr la red de regresión: debe dar el mismo conteo, con los tests **sin modificar**.
  - **Verificado independientemente tras un stall del agente de apply:** `crearVenta(request, username)` delega a `crearVentaInterna(request, username, null)`; re-corrida de la misma red de regresión (`PrecioAjustadoVentaTest`, `VentaDocumentoCasualTest`, `VentaResponseDocumentoTest`, `VentaServiceListarVentasAbonoTest`, `VentaServiceObtenerPorIdTest`, `FinanzasBaselineTest`, `VentaControllerObtenerPorIdPermisoTest`) con `JWT_SECRET`/`DB_USER`/`DB_PASS` correctamente seteados → **25 tests, 0 failures, 0 errors, BUILD SUCCESS**, mismo conteo, cero archivos de test modificados.
- [x] 8.3 RED: test que llama a `crearVentaConStockYaDescontado(...)` con movimientos preexistentes y espera una venta creada sin tocar stock. Falla porque el método no existe.
- [x] 8.4 GREEN: agregar `crearVentaConStockYaDescontado(VentaRequestDTO, String, List<MovimientoStock>)` a `VentaService` y su implementación: en la rama Vivero/Herramientas, si `movimientosPorLinea != null` se saltea el bloque de stock y se toma el movimiento índice-alineado; todo lo demás (precio, subtotal, descuento, pagos, cheques, cuenta corriente, factura) sin tocar.
- [x] 8.5 TRIANGULATE: tamaño de la lista distinto al de los detalles, o un elemento `null` → rechaza antes de persistir nada.
- [x] 8.6 TRIANGULATE: llamado con la unidad activa Abono → rechaza (la rama de `StockAbono` no participa de este flujo).
- [x] 8.7 TRIANGULATE: `crearVenta` normal (con `movimientosPorLinea == null`) sigue descontando stock y creando su `MovimientoStock` de tipo `VENTA` — contrato de no-regresión explícito.
  - Test: `backend/src/test/java/com/vivero/gestion/services/VentaServiceStockYaDescontadoTest.java` (4/4 en verde). Implementación: `VentaService.crearVentaConStockYaDescontado` (nuevo en la interfaz) delega en `crearVentaInterna(request, username, movimientosPorLinea)` con `movimientosPorLinea` no-null obligatorio; el for-loop de `crearVentaInterna` pasó a índice (`for (int i = 0; ...)`) para poder tomar `movimientosPorLinea.get(i)` en la rama Vivero/Herramientas cuando no es null. El guard de unidad Abono se agregó al bloque de validación inicial de `movimientosPorLinea` (antes de tocar cliente/factura/stock), leyendo `UnidadNegocioContextHolder` directo porque `venta.getUnidadNegocio()` todavía no existe en ese punto. Red de regresión de venta (tarea 1.2) re-corrida junto con el test nuevo: **29 tests (25+4), 0 failures, 0 errors, BUILD SUCCESS**, cero archivos de test de la red de regresión modificados.

## 9. Servicio: confirmar entrega (D3, D4, D11)

- [x] 9.1 RED: confirmar una entrega `PENDIENTE` con precio por línea crea la `Venta`, con subtotal = precio × cantidad, y el stock NO cambia (escenario "Confirmar crea la venta sin volver a tocar stock").
- [x] 9.2 GREEN: `confirmar(id, request, username)` en `EntregaPendienteServiceImpl`, `@Transactional`: valida estado y unidad, arma un `VentaRequestDTO` con `precioUnitario` por línea, y llama a `crearVentaConStockYaDescontado` con los `MovimientoStock` de cada detalle.
- [x] 9.3 TRIANGULATE: no se crea ningún `MovimientoStock` adicional al confirmar (conteo de movimientos del producto antes y después).
- [x] 9.4 TRIANGULATE: el `costoUnitarioHistorico` de cada línea de venta es el congelado en el `MovimientoStock` de la entrega (D3), no el del catálogo actual.
- [x] 9.5 TRIANGULATE: precio distinto del de lista → `precioUnitarioHistorico` y subtotal reflejan el asignado, y `Producto.precio` queda intacto.
- [x] 9.6 TRIANGULATE: precio negativo, precio faltante para una línea, y precio para un `detalleId` que no pertenece a la entrega → rechazan; no se crea venta; la entrega sigue `PENDIENTE`.
- [x] 9.7 TRIANGULATE: precio 0 en una línea es válido (línea bonificada), coherente con `resolverPrecioUnitario`.
- [x] 9.8 TRIANGULATE: la entrega queda `CONFIRMADA`, vinculada a la venta, con usuario y fecha de resolución; `Venta.usuario` es el que confirmó y `Venta.fecha` el momento de la confirmación (D11).
- [x] 9.9 TRIANGULATE: confirmar una entrega ya `CONFIRMADA` o `RECHAZADA` → rechaza sin crear una segunda venta.
- [x] 9.10 TRIANGULATE: con un pago parcial, la venta queda asociada a la `FacturaCliente` abierta del cliente y la cuenta corriente refleja la diferencia — mismo comportamiento que una venta normal.
- [x] 9.11 TRIANGULATE: antes de confirmar, ni el historial de ventas del cliente, ni su factura, ni su cuenta corriente, ni los totales de Finanzas reflejan importe alguno; después de confirmar, los cuatro lo reflejan (requirement "La venta sólo aparece en historial y cuenta corriente al confirmarse").
- [x] 9.12 TRIANGULATE: si la creación de la venta falla (por ejemplo, precio inválido), la transacción revierte y la entrega sigue `PENDIENTE` sin `venta` asociada.
  - Test: `backend/src/test/java/com/vivero/gestion/services/EntregaPendienteConfirmarTest.java` — 10/10 en verde. Implementación: `EntregaPendienteService.confirmar(id, EntregaPendienteConfirmarRequestDTO, username)`, `@Transactional`; valida estado PENDIENTE, arma el mapa `detalleId -> precioUnitario` (precio null explícito rechaza directo, no cae al fallback de precio de lista), exige tamaño exacto contra `entrega.getDetalles()`, construye `VentaRequestDTO` + la lista índice-alineada de `MovimientoStock` de cada detalle, y llama a `ventaService.crearVentaConStockYaDescontado(ventaRequest, username, movimientosPorLinea)` -- el `username` que confirma (no el que registró) es el que terminan usando `Venta.usuario`/`Venta.fecha` porque así ya funciona `crearVentaInterna`. Si la venta se crea, `entrega` pasa a `CONFIRMADA` con `venta`/`usuarioResolucion`/`fechaResolucion`; si `crearVentaConStockYaDescontado` lanza, el `@Transactional` de `confirmar` revierte todo sin necesidad de un catch (la excepción se propaga tal cual). **Gotcha de test no bloqueante:** `Cliente` tiene un `@OneToOne mappedBy` con cascade PERSIST/MERGE hacia `CuentaCorrienteDinero`; borrar el cliente de test en `@AfterEach` sin borrar antes la `CuentaCorrienteDinero` creada por un pago parcial tira `TransientObjectException` al flushear -- mismo patrón ya resuelto en `FacturaClienteSaldoBandejasTest.limpiar()` (borrar la CCD por `clienteId` antes que al cliente). Red de regresión de venta no re-corrida en esta tarea puntual (no se tocó `VentaServiceImpl`); se re-corre completa en 18.1.

## 10. Servicio: rechazar entrega (D2)

- [x] 10.1 RED: rechazar una entrega `PENDIENTE` repone el stock al valor previo (escenario "Rechazar repone el stock").
- [x] 10.2 GREEN: `rechazar(id, motivo, username)`, `@Transactional`: repone stock por línea, registra `MovimientoStock` de tipo `REVERSA_ENTREGA_PENDIENTE`, emite el evento SSE de stock, y marca la entrega `RECHAZADA` con motivo, usuario y fecha de resolución.
- [x] 10.3 TRIANGULATE: existe un `MovimientoStock` `REVERSA_ENTREGA_PENDIENTE` por línea con la cantidad correcta y el usuario que rechazó.
- [x] 10.4 TRIANGULATE: rechazar NO crea ninguna `Venta` y no toca cuenta corriente ni factura.
- [x] 10.5 TRIANGULATE: rechazar una entrega ya `CONFIRMADA` o `RECHAZADA` → rechaza; el stock no cambia.
  - Test: `backend/src/test/java/com/vivero/gestion/services/EntregaPendienteRechazarTest.java` — 4/4 en verde. Implementación: `EntregaPendienteServiceImpl.rechazar(id, motivo, username)`, `@Transactional`, agregada junto con `confirmar` en la tarea 9 (mismo archivo/PR de trabajo): valida estado PENDIENTE, repone `producto.stock` por línea, `sseService.emitStockUpdate`, y `movimientoStockService.registrarMovimiento(..., REVERSA_ENTREGA_PENDIENTE, usuario)` -- sólo suma, no valida stock (Decisión 2, no puede fallar por insuficiencia). Interfaz `EntregaPendienteService.rechazar` agregada también en la tarea 9.

## 11. Controller y permisos (D8) — todo endpoint nace con `@PreAuthorize`

- [x] 11.1 GREEN: `EntregaPendienteController` con los 7 endpoints de D13, cada uno con su `@PreAuthorize` explícito. El controller NO llama a ningún repositorio (regla dura #6): sólo a `EntregaPendienteService`.
- [x] 11.2 RED/GREEN: `EntregaPendienteControllerPermisoTest` siguiendo el patrón de `HistorialCobrosAbonoControllerPermisoTest` — sin `ESCRIBIR_ENTREGAS`, `registrar` y `listarMias` lanzan `AccessDeniedException`; con el permiso, no lanzan.
- [x] 11.3 TRIANGULATE: sin `LEER_ENTREGAS`, `listar`, `obtenerPorId`, `obtenerFirma` y `rechazar` lanzan `AccessDeniedException`; con el permiso, no lanzan.
- [x] 11.4 TRIANGULATE: `confirmar` con `LEER_ENTREGAS` pero sin `ESCRIBIR_VENTAS` lanza; con ambos, no lanza.
- [x] 11.5 TRIANGULATE: un usuario que sólo tiene `ESCRIBIR_ENTREGAS` no puede confirmar ni rechazar ni ver la firma (escenario "El empleado no puede resolver una entrega").
- [x] 11.6 Verificar endpoint por endpoint que ninguno quedó sin `@PreAuthorize` — el antecedente concreto es `DevolucionController`, que shippeó sin ninguno.
  - Controller: `backend/src/main/java/com/vivero/gestion/controllers/EntregaPendienteController.java` — 7 endpoints, `Controller -> EntregaPendienteService` únicamente, nunca un repositorio. Test: `backend/src/test/java/com/vivero/gestion/controllers/EntregaPendienteControllerPermisoTest.java` — 16/16 en verde, mismo patrón de "distinguir AccessDeniedException de cualquier otra RuntimeException" que `VentaControllerObtenerPorIdPermisoTest` (el `@PreAuthorize` se resuelve antes que el cuerpo del método, vía el proxy AOP del bean). La 11.6 quedó como un test automatizado real (reflection sobre `EntregaPendienteController.class.getDeclaredMethods()`, exige `@PreAuthorize` en los 7 métodos públicos), no sólo una revisión manual — sirve de guardrail si se agrega un endpoint nuevo sin permiso a futuro.

## 12. Frontend — API y capa de datos

- [x] 12.1 Crear `frontend/src/api/entregas.api.js` con los 7 llamados, mismo estilo que `registroSemillas.api.js` / `bandejas.api.js`.
  - Archivo: `frontend/src/api/entregas.api.js` -- `registrar`, `listarMias`, `listar`, `obtenerPorId`, `obtenerFirma`, `confirmar`, `rechazar`, todas `async` devolviendo `response.data`, mismo estilo que `devolucionesApi`/`registroSemillasApi`.
- [ ] 12.2 Verificar contra el backend levantado que cada llamado devuelve la forma esperada (paginación incluida) antes de construir UI encima. **(bloqueado por la regla dura #1: el contenedor `vivero-backend` corriendo está en una imagen vieja sin este código; verificarlo en vivo exige `docker compose build backend && docker compose up -d backend`, y "nunca ejecutar build/compile/bundle sin pedido explícito del usuario" — no se corrió. Verificación alternativa realizada: contrato cruzado estáticamente contra `EntregaPendienteController`/los DTOs reales -- las 7 funciones de `entregas.api.js` calzan exacto con los 7 endpoints, sus `@RequestParam`/`@RequestBody`/`@PathVariable` y los campos de cada DTO. El usuario puede correr el rebuild y confirmar en vivo cuando lo pida.)**

## 13. Frontend — captura de firma (D14)

- [x] 13.1 Crear `frontend/src/components/FirmaCanvas.jsx`: `<canvas>` 600×200 escalado por `devicePixelRatio`, fondo blanco explícito, Pointer Events, `touch-action: none`, `lineCap`/`lineJoin` redondeados, botón "Borrar" con `cursor-pointer` e icono `lucide-react`, y expone `toDataURL('image/png')`.
- [ ] 13.2 Verificar en el navegador: se firma con el dedo en móvil sin scrollear la página, y con el mouse en escritorio. **(pendiente, verificación manual del usuario)**
- [ ] 13.3 Verificar que la firma exportada se ve correctamente en tema claro y en tema oscuro (el fondo blanco es lo que lo garantiza). **(pendiente, verificación manual del usuario)**
- [x] 13.4 Confirmar que NO se agregó ninguna dependencia a `package.json`.
  - Componente: `frontend/src/components/FirmaCanvas.jsx`. Expone vía `ref`: `toDataURL()`, `estaVacio()`, `limpiar()`; prop `onChange(dataUrlOrNull)` se dispara al terminar cada trazo y al borrar. **Decisión de implementación no trivial:** el color del trazo es una constante fija (`#221D1A`), deliberadamente NO tomado del token `--color-ink` del sistema de diseño -- ese token se invierte a un tono claro en tema oscuro, y el fondo del canvas siempre se pinta blanco explícito sin importar el tema activo; si el trazo siguiera el token, una firma capturada con la app en tema oscuro sería invisible (trazo claro sobre fondo blanco). `package.json` no tocado (confirmar con `git diff --stat frontend/package.json` en la verificación final, tarea 18).

## 14. Frontend — pantalla del empleado

- [x] 14.1 Crear `frontend/src/pages/Entregas.jsx`: buscador de cliente (con alta al vuelo, reutilizando lo de `NuevaVenta.jsx`), buscador de producto, líneas con cantidad, `FirmaCanvas`, observación y botón de registrar.
- [x] 14.2 Toda validación y feedback vía `useUIStore().pushToast` — nunca `alert`/`confirm`. Botones con `cursor-pointer`, iconos `lucide-react`, componente en PascalCase.
- [x] 14.3 Bloquear el envío sin firma, sin cliente o sin líneas, con mensaje claro.
- [x] 14.4 Agregar en la misma pantalla la lista paginada "Mis entregas" (`GET /mias`), mostrando el estado de cada una (D10).
- [x] 14.5 Tras registrar con éxito, limpiar el formulario y la firma, y refrescar "Mis entregas".
  - Componente: `frontend/src/pages/Entregas.jsx`. Reutiliza el patrón de buscador de cliente/producto de `NuevaVenta.jsx` (incluida `CrearClienteRapido` en el dropdown sin coincidencias) pero con estado local propio (`useState` para `lineas`, sin `useCartStore` — no se tocó ni ese store ni `NuevaVenta.jsx`), sin ramas de cliente casual/express (Decisión 7: sólo cliente real de agenda). Validaciones cliente-side antes de llamar a la API: sin cliente, sin líneas, línea con cantidad ≤0/vacía, firma vacía (`firmaRef.current.estaVacio()`) — todas vía `pushToast('error', ...)`. "Mis entregas" usa TanStack Query (`queryKey: ['entregas-mias', page]`, `entregasApi.listarMias(page, 20)`) con paginador Anterior/Siguiente calcado de `HistorialCobrosAbono.jsx` (vista tarjetas en mobile, tabla en desktop) y badge de estado con la misma convención de tonos que `chequeDisplay.js` (PENDIENTE=warn, CONFIRMADA=ok, RECHAZADA=danger). Tras un registro exitoso: `pushToast('success', ...)`, reset de cliente/líneas/observación/firma (`firmaRef.current.limpiar()`) y `queryClient.invalidateQueries({ queryKey: ['entregas-mias'] })`. Errores del backend se muestran vía `getErrorMessage` (mismo helper que usa `CrearClienteRapido.jsx`). No se corrió build ni se commiteó nada.

## 15. Frontend — Dashboard y confirmación del dueño

- [x] 15.1 Crear `frontend/src/components/EntregasPendientesList.jsx` siguiendo el patrón de `BandejasDisponiblesList.jsx` (TanStack Query, estados loading/error/vacío, mismas clases del sistema de diseño).
- [x] 15.2 Montarlo en `Dashboard.jsx` bajo `unidadNegocioActiva === '1' && hasPermission('LEER_ENTREGAS')`, sin tocar las tarjetas existentes.
- [x] 15.3 Crear `frontend/src/components/ConfirmarEntregaModal.jsx`: líneas fijas con `FormattedNumberInput` de precio por unidad, subtotal por línea y total recalculados en vivo, descuento global, líneas de pago, y la firma mostrada como `<img>` traída de `GET /{id}/firma`.
- [x] 15.4 Botón "Rechazar" en el modal, con motivo y confirmación explícita vía el diálogo del sistema (`useUIStore`), advirtiendo que se repone el stock.
- [x] 15.5 Tras confirmar o rechazar, invalidar las queries de entregas y de stock para que la tarjeta y el resto de la UI se actualicen.
- [x] 15.6 Verificar que NO se modificó `NuevaVenta.jsx` ni `useCartStore` (Non-Goal: no se toca el mecanismo de precio editable existente).
  - Componentes: `frontend/src/components/EntregasPendientesList.jsx` (tarjeta del Dashboard, `useQuery(['entregas-pendientes', 'PENDIENTE'])`, clic en fila abre el modal) y `frontend/src/components/ConfirmarEntregaModal.jsx` (fetch paralelo de `obtenerPorId` + `obtenerFirma`, precio por línea prefilado con `precioListaActual` pero editable, descuento global, líneas de pago con el mismo patrón de "Liquidar Venta" de `NuevaVenta.jsx` incluida la validación de cheque de 8 dígitos, motivo de rechazo vía input inline + `useUIStore().askConfirm` antes de llamar a `rechazar`). `onResolved` invalida `['entregas-pendientes']` + las claves de stock/productos/ventas conocidas. `Dashboard.jsx`: sólo se agregó `hasPermission` al destructuring existente de `useAuthStore()`, el import y el bloque `col-span-1` condicional -- ninguna tarjeta previa tocada.
  - **Hallazgo de la verificación 15.6 (no es de este change):** `git diff --stat -- frontend/src/pages/NuevaVenta.jsx frontend/src/store/useCartStore.js` muestra `useCartStore.js` sin diff (limpio) pero `NuevaVenta.jsx` con un diff preexistente de 13 líneas, ya presente en el working tree ANTES de empezar esta tarea (dos fixes fechados 2026-09-08/2026-09-09 ajenos a este change: sync de `clientes` tras alta al vuelo, e invalidación de queries de liquidación de Abono) -- confirmado no originado por ninguno de los dos agentes que trabajaron en paralelo en los grupos 14/15 (ninguno abrió ese archivo en modo escritura).

## 16. Frontend — RBAC y gating por unidad (D9)

- [x] 16.1 `layouts/DashboardLayout.jsx`: agregar a `navGroups` (grupo "Ventas") `{ to: '/entregas', label: 'Entregas', icon: <icono lucide>, permission: 'ESCRIBIR_ENTREGAS', unidades: ['vivero'] }`.
- [x] 16.2 `App.jsx`: ruta `/entregas` dentro de `<ProtectedRoute requiredPermission="ESCRIBIR_ENTREGAS" />`.
- [x] 16.3 `pages/UsuariosAdmin.jsx`: agregar `LEER_ENTREGAS: ['vivero']` y `ESCRIBIR_ENTREGAS: ['vivero']` a `PERMISO_UNIDAD_MAP` — sin esto el permiso es inasignable desde el modal de roles.
- [x] 16.4 `pages/UsuariosAdmin.jsx`: agregar a `SECTIONS` `{ id: 'entregas', name: 'Entregas', permNames: ['ESCRIBIR_ENTREGAS'], unidades: ['vivero'] }`, con comentario de por qué `LEER_ENTREGAS` queda sólo en "Avanzado" (mismo criterio deliberado que Finanzas/Cheques).
- [ ] 16.5 Verificar manualmente: crear un rol con la casilla "Entregas" tildada, asignarlo a un usuario y comprobar que ve la sección y puede registrar, pero no ve la tarjeta del Dashboard ni puede confirmar. **(pendiente, verificación manual del usuario)**
  - Icono elegido: `PackageCheck` (lucide-react), agregado al import existente de `DashboardLayout.jsx`. Los 3 archivos editados: `frontend/src/layouts/DashboardLayout.jsx` (import + `navGroups`), `frontend/src/App.jsx` (import de `Entregas` + `<Route>`), `frontend/src/pages/UsuariosAdmin.jsx` (`PERMISO_UNIDAD_MAP` + `SECTIONS`).

## 17. Regresión: Herramientas y Abono intactos

- [ ] 17.1 Verificar en la UI que, con la unidad activa Herramientas y luego Abono, el ítem "Entregas" no aparece en el menú. **(pendiente, verificación manual del usuario)**
- [ ] 17.2 Verificar que, estando parado en `/entregas` y cambiando la unidad activa a Herramientas o Abono, el guard de `DashboardLayout.jsx` redirige a `/dashboard` — sin agregar ningún mecanismo nuevo de gating. **(pendiente, verificación manual del usuario)**
- [ ] 17.3 Verificar que la tarjeta de entregas pendientes no se renderiza en el Dashboard de Herramientas ni de Abono. **(pendiente, verificación manual del usuario)**
- [x] 17.4 Test de regresión de venta en Abono y en Herramientas: stock, costo histórico, precio histórico y totales de Finanzas idénticos a la línea base (escenario "Los flujos existentes de Herramientas y Abono no cambian").
  - Ya cubierto por la red de regresión existente, sin necesidad de un test nuevo: `PrecioAjustadoVentaTest.ventaConPrecioMayorAlDeListaAceptaYAumentaElTotal` (Herramientas), `PrecioAjustadoVentaTest.ventaEnAbonoConPrecioAjustadoDescuentaStockAbonoYPersisteElPrecio` (Abono, stock de `StockAbono`), y `PrecioAjustadoVentaTest.elResumenYElListadoDeFinanzasReflejanElPrecioAjustadoSinAlterarElCosto` (Herramientas, Finanzas). Los tres corrieron **sin modificarse** en la corrida conjunta de la tarea 8/9/10/11 (81 tests, 0 failures) después de tocar `VentaServiceImpl` en la tarea 8 -- prueba directa de que el for-loop convertido a índice y el nuevo guard de Abono no alteraron el comportamiento de Herramientas/Abono.

## 18. Verificación final

- [x] 18.1 Correr la suite completa de backend y comparar contra la línea base de la tarea 1.1: todos los tests previos siguen pasando, más los nuevos. Ningún test preexistente modificado.
  - **262 tests run, 259 passing, 3 failures, 0 errors** (vs. línea base 206/203/3). Las mismas 3 fallas preexistentes de `costeo-flexible-por-producto` (`UnidadNegocioConfigTest.testModeloCostoSeededCorrectly`, `GastoServiceInsumosPorUnidadTest.listarGastosDeAbonoIncluyeSusPropiosInsumos`, `GastoServiceInsumosPorUnidadTest.listarGastosDeViveroSigueIncluyendoSusPropiosInsumos`) — mismos nombres, sin cambios. Diferencia exacta: 262 − 206 = 56 tests nuevos, que coincide exacto con la suma de las clases de este change: `VentaServiceStockYaDescontadoTest`(4) + `EntregaPendienteConfirmarTest`(10) + `EntregaPendienteRechazarTest`(4) + `EntregaPendienteControllerPermisoTest`(16) + `EntregaPendienteRepositoryTest`(1) + `EntregaPendienteListadosTest`(5) + `EntregaPendienteMovimientoStockTest`(3) + `EntregaPendientePermisosSeedTest`(2) + `EntregaPendienteRegistrarTest`(9) + `PermisoEnumEntregasTest`(2) = 56.
- [x] 18.2 Repasar los escenarios de `specs/entregas-pendientes-vivero/spec.md` uno por uno y marcar qué test cubre cada uno; cualquier escenario sin test cubierto es una tarea pendiente, no un detalle.
  - **Registro de una entrega pendiente sin venta ni precio**: "Registro exitoso..." → `EntregaPendienteRegistrarTest.registrarEntregaValidaDescuentaStockYNoCreaVenta`. "...stock insuficiente" → `stockInsuficienteRechazaSinPersistirNiMoverStock`. "...cantidad inválida" → `cantidadInvalidaRechazaSinPersistirNada`. "...sin cliente de la agenda" → `sinClienteIdORVAlidoRechaza`.
  - **Trazabilidad del stock**: "La entrega deja movimiento trazable" → `EntregaPendienteRegistrarTest.laEntregaQuedaPendienteConFechaUnidadYUsuarioYSuLineaReferenciaElMovimiento` + `EntregaPendienteMovimientoStockTest` (grupo 2). "El movimiento no altera la referencia de costo" → `EntregaPendienteMovimientoStockTest` (2.3/2.4, no entra en `[INGRESO, AJUSTE_INICIAL]`, no crea capa).
  - **Captura y resguardo de la firma**: "Se guarda y el dueño la consulta" → `EntregaPendienteRegistrarTest.firmaValidaSePersisteYSeRecuperaIdentica`. "Ausente o inválida" → `firmaAusenteOInvalidaRechaza`. "No viaja en los listados" → `EntregaPendienteListadosTest.listarPorEstadoDevuelveResumenDeLaUnidadSinFirma` (assert estructural sobre `EntregaPendienteResumenDTO.class`).
  - **Visibilidad para el dueño**: "La entrega recién registrada aparece" → `EntregaPendienteListadosTest.listarPorEstadoDevuelveResumenDeLaUnidadSinFirma`. "El listado es paginado" → `laPaginacionEsReal`. "La tarjeta del Dashboard sólo aparece en Vivero" → **sin test automatizado** (frontend sin test runner configurado en todo el proyecto -- convención existente, no un gap de este change); cubierto por revisión de código (`Dashboard.jsx`: `unidadNegocioActiva === '1' && hasPermission('LEER_ENTREGAS')`) + verificación manual (tarea 17.3).
  - **El empleado ve lo propio y no resuelve**: "Ve sólo lo que registró él" → `EntregaPendienteListadosTest.listarMiasDevuelveSoloLasDelUsuarioQueRegistro`. "No puede resolver una entrega" → `EntregaPendienteControllerPermisoTest.unUsuarioConSoloEscribirEntregasNoPuedeConfirmarNiRechazarNiVerLaFirma`.
  - **Confirmación con precio por línea**: "Confirmar crea la venta sin tocar stock" → `EntregaPendienteConfirmarTest.confirmarCreaLaVentaSinVolverATocarStockYQuedaConfirmada`. "El precio asignado es el que se cobra" → `precioAsignadoEsElQueSeCobraYElPrecioDeListaQuedaIntacto`. "El costo histórico es el de la entrega" → `costoHistoricoEsElCongeladoAlMomentoDeLaEntregaNoElDelCatalogoActual`. "Precio faltante/sobrante/negativo" → `precioFaltanteSobranteONegativoRechazaSinCrearVentaYEntregaSiguePendiente`. "No se puede confirmar dos veces" → `noSePuedeConfirmarUnaEntregaYaResuelta`.
  - **La venta sólo aparece al confirmarse**: ambos escenarios (antes/después) → `EntregaPendienteConfirmarTest.antesDeConfirmarNadaImpactaYDespuesTodoImpacta`, reforzado por `pagoParcialSeAsociaALaFacturaAbiertaYLaCuentaCorrienteReflejaLaDiferencia`.
  - **Rechazo y reposición de stock**: "Rechazar repone el stock" → `EntregaPendienteRechazarTest.rechazarReponeElStock` + `dejaUnMovimientoReversaPorLineaConCantidadYUsuarioCorrectos` + `noCreaVentaNiTocaCuentaCorrienteNiFactura`. "No se puede rechazar una ya resuelta" → `noSePuedeRechazarUnaEntregaYaResuelta`.
  - **Control de permisos**: "Sin `ESCRIBIR_ENTREGAS` no se registra" → `EntregaPendienteControllerPermisoTest.registrarSinEscribirEntregasRechaza` (+ `listarMiasSinEscribirEntregasRechaza`). "Sin `LEER_ENTREGAS` no se listan/ven/rechazan" → `listarSinLeerEntregasRechaza`/`obtenerPorIdSinLeerEntregasRechaza`/`obtenerFirmaSinLeerEntregasRechaza`/`rechazarSinLeerEntregasRechaza`. "Confirmar exige además `ESCRIBIR_VENTAS`" → `confirmarConLeerEntregasPeroSinEscribirVentasRechaza`. "Con los permisos correspondientes procede" → los `*ConLeerEntregasPasaElGate`/`*ConEscribirEntregasPasaElGate`/`confirmarConAmbosPermisosPasaElGate`, reforzado end-to-end por el flujo completo registrar→confirmar de `EntregaPendienteConfirmarTest`. "Un empleado con `ESCRIBIR_ENTREGAS` no gana acceso a ventas" → garantía estructural de Spring Security (autoridades independientes, `VentaController` exige `ESCRIBIR_VENTAS` que `ESCRIBIR_ENTREGAS` no otorga) verificada indirectamente por `confirmarConLeerEntregasPeroSinEscribirVentasRechaza`; no hay un test dedicado que llame a `VentaController` con sólo `ESCRIBIR_VENTAS` -- no se agrega uno nuevo porque `VentaControllerObtenerPorIdPermisoTest`/`VentaController` ya prueban sus propios gates y no hay código de este change que los toque.
  - **Alcance exclusivo de Vivero**: "El backend rechaza fuera de Vivero" → `EntregaPendienteRegistrarTest.conUnidadActivaHerramientasRegistrarLanzaYNoPersisteNiMueveStock` (mismo guard cubre los demás métodos, ver `EntregaPendienteListadosTest.entregaDeOtraUnidadNoEsAccesiblePorIdDesdeVivero`). "La sección no se ofrece fuera de Vivero" → **sin test automatizado** (frontend), cubierto por `navGroups` (`unidades: ['vivero']`) + guard de `DashboardLayout.jsx` (mecanismo ya existente, no nuevo) + verificación manual (17.1/17.2). "Los flujos de Herramientas/Abono no cambian" → tarea 17.4 (`PrecioAjustadoVentaTest`, sin modificar, verde).
- [x] 18.3 Repaso de reglas duras: DTOs en todos los endpoints, ningún controller llamando a un repositorio, todos los listados paginados, cero mocks de DB en los tests nuevos, componentes en PascalCase, `cursor-pointer` en todos los botones nuevos, iconos `lucide-react`, cero `alert`/`confirm`.
  - **DTOs**: `EntregaPendienteController` sólo expone `EntregaPendienteRequestDTO`/`ResponseDTO`/`ResumenDTO`/`FirmaDTO`/`ConfirmarRequestDTO`/`RechazoDTO`/`VentaResponseDTO` -- ninguna entidad JPA cruza el borde HTTP.
  - **Controller → Service → Repository**: `grep -c Repository backend/.../EntregaPendienteController.java` → 0.
  - **Paginación**: `listar`/`listarMias` devuelven `Page<EntregaPendienteResumenDTO>`; `listarMias`/`listar` del frontend siempre pasan `page`/`size`.
  - **Cero mocks de DB**: las 10 clases de test nuevas son todas `@SpringBootTest` + `@TestPropertySource` contra `localhost:5433` real, mismo patrón que el resto del repo -- cero `@MockBean`/Mockito sobre un repositorio.
  - **PascalCase**: `FirmaCanvas.jsx`, `Entregas.jsx`, `EntregasPendientesList.jsx`, `ConfirmarEntregaModal.jsx` -- los 4 archivos y componentes nuevos.
  - **cursor-pointer**: verificado con grep sobre los 4 archivos nuevos -- 11 `<button>`, 11 con `cursor-pointer` en su `className`.
  - **lucide-react**: único origen de iconos en los 4 archivos nuevos (`PackageCheck`, `Send`, `Eraser`, `Search`, `Clock`, `UserCheck`, `Plus`, `Trash2`, `X`, `Loader2`, `Ban`, `User`, `Calendar`, `FileText`, `AlertCircle`, `Inbox`).
  - **Cero alert/confirm/prompt**: `grep -rn "alert(\|window.confirm\|confirm(\|prompt("` sobre los 4 archivos nuevos → 0 matches; el rechazo usa `useUIStore().askConfirm` (el diálogo propio del sistema).
- [x] 18.4 Confirmar que no se corrió ningún build ni se commiteó nada sin pedido explícito del usuario.
  - Ningún `docker compose build`, `npm run build`/`vite build`, `mvn package`/`install`, ni `git commit`/`git add` se ejecutó en esta sesión -- sólo `mvnw test`/`mvnw compile`/`mvnw test-compile` (explícitamente permitidos por las instrucciones de la tarea) y lectura/escritura de archivos. La tarea 12.2 quedó bloqueada por esta misma regla (ver su nota) en vez de forzar un rebuild de Docker sin pedido explícito.
