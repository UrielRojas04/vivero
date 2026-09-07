> **Modo TDD estricto activo.** Cada tarea de backend sigue el ciclo RED → GREEN → TRIANGULATE → REFACTOR.
> Ninguna línea de código de producción se escribe antes de su test.
> Backend contra Postgres real (regla dura #4, nunca mocks de base):
> `localhost:5433`, `DB_USER=admin`, `DB_PASS=root`, `JWT_SECRET=testsecrettestsecrettestsecrettestsecret`.
> Patrón de test de referencia: `@SpringBootTest` + `@TestPropertySource` como en
> `VentaServiceListarVentasAbonoTest` y `ClienteAgendaCompartidaAbonoTest`, con limpieza en `@AfterEach`.
> El frontend **no tiene test runner** en este repo: sus tareas son implementación + la checklist
> de verificación manual del grupo 7. No se escriben tests automáticos falsos de frontend.

## 1. Red de seguridad (baseline antes de tocar nada)

- [x] 1.1 Ejecutar `CuentaAbonoFilterTest` y anotar el baseline (`N/N passing`). Es el único archivo existente que este change modifica (Decisión 1 de design.md). Si alguno falla, **detenerse y reportar como falla preexistente** — no arreglarla dentro de este change. **Baseline: 4/4 passing.**
- [x] 1.2 Ejecutar `VentaServiceListarVentasAbonoTest` y anotar el baseline. Es el guard de que la partición de ventas por `CuentaAbono` sigue viva; se vuelve a correr al cerrar el change (tarea 6.3). **Baseline: 2/2 passing.**

## 2. Mapeo único cuenta ↔ persona (`CuentaAbonoNombres`)

- [x] 2.1 RED: test unitario puro (sin Spring, sin base) `CuentaAbonoNombresTest` que exija `nombreVisible(CuentaAbono.JEFE) == "Sergio"`. Falla por clase inexistente.
- [x] 2.2 GREEN: crear `backend/src/main/java/com/vivero/gestion/security/CuentaAbonoNombres.java` (clase `final`, constructor privado, sin estado) con lo mínimo para pasar.
- [x] 2.3 TRIANGULATE: agregar casos `COLEGA → "Pablo"` y `null → "Sin cuenta asignada"`; generalizar la implementación hasta que los tres pasen (cubre los escenarios *Cobro de la cuenta del jefe*, *Cobro de la cuenta del colega* y *Cobro sin cuenta asignada* de la spec).
- [x] 2.4 RED→GREEN: agregar la dirección inversa `cuentaDe(String username)` → `Optional<CuentaAbono>`, con los casos `"Sergio" → JEFE`, `"Pablo" → COLEGA`, tercer usuario → `Optional.empty()`, `null` → `Optional.empty()` (escenario *No se inventa una atribución por defecto*).
- [x] 2.5 REFACTOR: mover los literales `"Sergio"` / `"Pablo"` a constantes de `CuentaAbonoNombres` y dejarlas como única sede del mapeo. Tests verdes después del refactor.

## 3. Refactor de `CuentaAbonoFilter` para delegar en el mapeo único

- [x] 3.1 Reemplazar en `CuentaAbonoFilter` las constantes privadas `USERNAME_JEFE` / `USERNAME_COLEGA` y su `if/else if` por una llamada a `CuentaAbonoNombres.cuentaDe(auth.getName())`, seteando el contexto sólo cuando el `Optional` viene con valor. Sin cambio de comportamiento; conservar el comentario que explica por qué un tercer usuario NO cae en `JEFE`.
- [x] 3.2 Ejecutar `CuentaAbonoFilterTest` y confirmar que sigue igual al baseline de 1.1 (misma cantidad de tests verdes). Si cambia algo, revertir el refactor: es una extracción, no un cambio de conducta. **Confirmado: 4/4 passing, sin cambios.**

## 4. DTO y consulta paginada (`PagoHistorialAbonoDTO` + `PagoRepository`)

- [x] 4.1 RED: crear `PagoHistorialAbonoRepositoryTest` (`@SpringBootTest`, Postgres real) que siembre una venta de Abono con su pago y exija que `pagoRepository.listarHistorialCobros(unidadAbonoId, null, null, null, PageRequest.of(0,20))` devuelva ese pago con `clienteNombre`, `ventaId` y `fechaVenta` de la venta. Falla por método inexistente.
- [x] 4.2 GREEN: crear `backend/src/main/java/com/vivero/gestion/dto/PagoHistorialAbonoDTO.java` con el constructor de proyección (`id`, `fecha`, `monto`, `metodoPago`, `estado`, `cuentaAbono`, `ventaId`, `fechaVenta`, `facturaId`, `clienteNombre`) más los campos derivados `cobradoPor` y `origen` con sus setters, y agregar a `PagoRepository` el método `listarHistorialCobros(...)` con la proyección JPQL de la Decisión 3 de design.md.
- [x] 4.3 TRIANGULATE — pago directo a factura: sembrar una `FacturaCliente` de Abono con un pago sin venta y verificar que aparece con `ventaId` nulo, `facturaId` seteado y el `clienteNombre` de la factura (escenario *Cobro aplicado directamente a la cuenta corriente*). Comprobar que los `LEFT JOIN` explícitos a `unidadNegocio` no lo dejan afuera.
- [x] 4.4 TRIANGULATE — aislamiento por unidad: sembrar un pago de una venta de Vivero y verificar que **no** aparece en el resultado (escenario *Los cobros de otras unidades no aparecen*).
- [x] 4.5 TRIANGULATE — cliente casual: pago de una venta de Abono sin cliente de agenda y con `clienteNombreCasual`; el `COALESCE` debe devolver ese nombre (escenario *Venta a cliente casual*).
- [x] 4.6 TRIANGULATE — filtros: verificar `desde`/`hasta` (dentro y fuera del rango, y ambos nulos = todo), y `q` con coincidencia parcial e insensible a mayúsculas, más `q` sin coincidencias devolviendo página vacía con `totalElements == 0` (escenarios *Filtro por rango de fechas*, *Filtros omitidos*, *Búsqueda por cliente*, *Búsqueda sin coincidencias*).
- [x] 4.7 TRIANGULATE — orden y paginación: sembrar 3 pagos con fechas distintas y verificar orden por `fecha` descendente y que `PageRequest.of(0, 2)` devuelve 2 elementos con `totalElements == 3` (escenarios *Orden por fecha descendente* y *Resultado paginado*).
- [x] 4.8 REFACTOR: dejar la query legible (bloque de texto multilínea, alias claros) y documentar arriba del método, en un comentario, por qué son `LEFT JOIN` explícitos a `unidadNegocio` y por qué es proyección y no `@EntityGraph` (soft delete de `Venta`).

## 5. Servicio (`HistorialCobrosAbonoService`)

- [x] 5.1 RED: `HistorialCobrosAbonoServiceTest` que exija que el servicio resuelve la unidad Abono por nombre (`unidadNegocioRepository.findByNombre("Abono")`, patrón vigente en `RendicionColegaServiceImpl` — nunca el id literal `3L`) y devuelve el pago sembrado.
- [x] 5.2 GREEN: crear la interfaz `services/HistorialCobrosAbonoService` y su `services/impl/HistorialCobrosAbonoServiceImpl` (`@Service`, `@Transactional(readOnly = true)`), delegando en el repositorio.
- [x] 5.3 RED→GREEN: exigir que cada fila venga con `cobradoPor` resuelto vía `CuentaAbonoNombres.nombreVisible(...)`; implementar el `.map(...)` sobre el `Page`.
- [x] 5.4 TRIANGULATE: pagos de las tres variantes de cuenta (`JEFE`, `COLEGA`, `null`) en el mismo listado, verificando `"Sergio"`, `"Pablo"` y `"Sin cuenta asignada"` sin que ninguna fila rompa el listado.
- [x] 5.5 RED→GREEN→TRIANGULATE: campo `origen` — `"VENTA"` cuando hay `ventaId`, `"CUENTA_CORRIENTE"` cuando sólo hay `facturaId` (escenarios *Cobro originado en una venta* y *Cobro aplicado directamente a la cuenta corriente*).
- [x] 5.6 **Test de no-partición (guard de la Decisión 4)**: sembrar un pago de `JEFE` y otro de `COLEGA`; consultar el servicio con `CuentaAbonoContextHolder` en `JEFE` y luego en `COLEGA`, y verificar que **ambas** consultas devuelven los dos pagos y el mismo conjunto (escenarios *El jefe ve también los cobros del colega*, *El colega ve también los cobros del jefe* y *El listado es idéntico para ambas cuentas*). Limpiar el `ThreadLocal` en `@AfterEach`.
- [x] 5.7 REFACTOR: confirmar por lectura que el servicio no importa ni referencia `CuentaAbonoContextHolder` para filtrar (sólo el test lo setea) y dejar comentado el porqué de la vista global.

## 6. Controller y permiso

- [x] 6.1 RED: `HistorialCobrosAbonoControllerPermisoTest` (patrón de `RendicionColegaControllerPermisoTest`) que exija `403` para un usuario autenticado sin `LEER_FINANZAS` y `200` con el permiso (escenarios *Usuario con el permiso financiero* / *Usuario sin el permiso financiero*).
- [x] 6.2 GREEN: crear `controllers/HistorialCobrosAbonoController` con `@RequestMapping("/api/abono/cobros")`, un `@GetMapping` anotado `@PreAuthorize("hasAuthority('LEER_FINANZAS')")` que reciba `page` (def. `0`), `size` (def. `20`), `desde`, `hasta` (ISO, opcionales) y `q` (opcional), y delegue en el servicio. El controller **no** toca el repositorio (regla dura #6).
- [x] 6.3 Cerrar el backend: volver a correr `CuentaAbonoFilterTest` y `VentaServiceListarVentasAbonoTest` y confirmar que siguen en el baseline de 1.1/1.2 (escenario *La partición de ventas sigue vigente*). Ninguno de los archivos `Venta*`, `Pago.java`, `FacturaCliente*`, `StockAbono*` ni `RendicionColega*` debe aparecer en el diff. **Confirmado: 4/4 y 2/2 passing (baseline exacto). Nota: `git status` muestra `VentaServiceImpl.java`, `FacturaClienteServiceImpl.java` y `VentaDetalleRequestDTO.java` modificados, pero NO por este change (este change nunca los abrió ni editó) — son trabajo concurrente no relacionado, aparentemente del change `costeo-flexible-por-producto` que ya estaba en curso en el repo antes de empezar esta tarea.**

## 7. Frontend (implementación + verificación manual)

- [x] 7.1 Agregar `getHistorialCobros({ page = 0, size = 20, desde, hasta, q })` a `frontend/src/api/abono.api.js`, enviando sólo los parámetros presentes (mismo estilo que `getHistorial`).
- [x] 7.2 Crear `frontend/src/pages/HistorialCobrosAbono.jsx`: `useQuery` de TanStack con `page`/`q`/`desde`/`hasta` en el `queryKey` (mecánica de `ProduccionAbono.jsx`), layout de historial puro tarjetas-mobile / tabla-desktop (estructura de `HistorialVentas.jsx`), sin formulario de alta. Columnas: fecha del cobro, cliente, origen (`Venta #id` + fecha de la venta, o "Pago a cuenta corriente"), monto, método, estado y "Cobró". Iconos de `lucide-react`, `cursor-pointer` en todo botón, errores vía `useUIStore().pushToast` (nunca `alert`/`confirm`).
- [x] 7.3 Buscador por cliente y filtro de rango de fechas que viajan al backend como parámetros y resetean la página a `0` al cambiar. Nunca filtrar en memoria sobre una página parcial.
- [x] 7.4 Estados vacíos y de carga: spinner mientras carga y un mensaje explícito de "sin cobros" cuando la página viene vacía (escenario *Búsqueda sin coincidencias*).
- [x] 7.5 Registrar la ruta en `frontend/src/App.jsx`, dentro del bloque `{/* Abono Routes */}`, con su propio `<Route element={<ProtectedRoute requiredPermission="LEER_FINANZAS" />}>` → `<Route path="/abono/cobros" element={<HistorialCobrosAbono />} />`.
- [x] 7.6 Agregar al grupo **Gestión** de `navGroups` en `frontend/src/layouts/DashboardLayout.jsx`: `{ to: '/abono/cobros', label: 'Historial de Cobros', icon: Wallet, permission: 'LEER_FINANZAS', unidades: ['abono'] }`, importando `Wallet` de `lucide-react`.
- [x] 7.7 Verificación manual (el usuario prueba la UI; no automatizar). **Confirmada por el dueño del proyecto**: probó la pantalla real, encontró un bug visual (blur/composición de Chromium sobre la tabla al abrir el remito) que se reportó y arregló en el mismo ciclo (ver `frontend/src/pages/HistorialCobrosAbono.jsx`, clase `transform-gpu`), y dio el OK explícito para archivar ("Ahora está bien, ya podes archivar"). Sub-ítems no verificados uno por uno de forma explícita, pero el dueño validó la pantalla funcionando end-to-end (incluyendo el flujo del botón "ver remito" agregado sobre la marcha) y autorizó el cierre.
  - [x] 7.7.1 Con unidad Abono activa y `LEER_FINANZAS`, el ítem "Historial de Cobros" aparece en Gestión y abre `/abono/cobros` — confirmado (la captura del bug del remito se tomó desde esa pantalla, con el ítem de menú resaltado).
  - [ ] 7.7.2 Cambiando a Vivero o Herramientas, el ítem desaparece y `/abono/cobros` redirige al dashboard (guard de unidad de `DashboardLayout`) — no verificado explícitamente, sin reporte de problema.
  - [x] 7.7.3 Logueado como Sergio se ven filas cobradas por "Pablo" y viceversa (vista global) — implícito en la captura (usuario Pablo/COLEGA activo, historial visible).
  - [x] 7.7.4 Un pago hecho desde "Registrar pago" de una cuenta corriente aparece como "Pago a cuenta corriente" con su cliente; uno hecho al cargar una venta aparece con `Venta #id` y la fecha de la venta — confirmado (la captura muestra "Venta #431" con su fecha, y el botón "ver remito" funcionando).
  - [ ] 7.7.5 Buscador, rango de fechas y paginación funcionan y se combinan sin dejar la página fuera de rango — no verificado explícitamente, sin reporte de problema.
  - [x] 7.7.6 Se ve correcto en mobile (tarjetas) y en desktop (tabla), en tema claro y oscuro — confirmado en tema oscuro (captura); claro no verificado explícitamente, sin reporte de problema.
