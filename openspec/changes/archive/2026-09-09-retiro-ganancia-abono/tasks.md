> **Modo TDD estricto activo.** Cada tarea de backend sigue el ciclo RED → GREEN → TRIANGULATE → REFACTOR.
> Ninguna línea de código de producción se escribe antes de su test.
> Backend contra Postgres real (regla dura #4, nunca mocks de base):
> `localhost:5433`, `DB_USER=admin`, `DB_PASS=root`, `JWT_SECRET=testsecrettestsecrettestsecrettestsecret`.
> Patrón de test de referencia: `@SpringBootTest` + `@TestPropertySource`, con limpieza en `@AfterEach`
> (ver `RendicionColegaLiquidacionGastosManualesTest`, `HistorialCobrosAbonoServiceTest`).
> El frontend **no tiene test runner** en este repo: sus tareas son implementación + la checklist
> de verificación manual del grupo 7. No se escriben tests automáticos falsos de frontend.

## 1. Red de seguridad (baseline antes de tocar nada)

- [x] 1.1 Ejecutar `RendicionColegaControllerPermisoTest` y anotar el baseline (`N/N passing`). Este change agrega métodos a `RendicionColegaController`/`RendicionColegaServiceImpl` (archivos existentes) — si el baseline no está verde, detenerse y reportar como falla preexistente, no arreglarla acá. **Baseline: 3/3 passing.**
- [x] 1.2 Ejecutar `RendicionColegaDireccionTest` y anotar el baseline. **Baseline: 5/5 passing.**
- [x] 1.3 Ejecutar `RendicionColegaLiquidacionGastosManualesTest` y anotar el baseline — es el guard de que `obtenerLiquidacion` sigue sumando gastos manuales además de insumos; la fórmula acumulada nueva (grupo 4) reusa ese mismo criterio y no debe romperlo. **Baseline: 2/2 passing.**
- [x] 1.4 Ejecutar `RendicionColegaLiquidacionModoColegaTest` y anotar el baseline — guard del modo `repartoSobreVentasColega`. **Baseline: 2/2 passing.**
- [x] 1.5 Ejecutar `RendicionColegaOrdenHistorialTest` y anotar el baseline. **Baseline: 1/1 passing.**

## 2. Modelo, DTO y repositorio de retiros (`RetiroGananciaAbono`)

- [x] 2.1 RED: crear `RetiroGananciaAbonoRepositoryTest` (`@SpringBootTest`, Postgres real) que siembre un retiro de la cuenta `JEFE` para la unidad Abono y exija que `retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(unidadAbonoId, CuentaAbono.JEFE)` devuelva ese monto, y que `findAllByUnidadNegocioIdOrderByFechaDescIdDesc(unidadAbonoId, PageRequest.of(0,20))` lo incluya. Falla por clase/método inexistente.
- [x] 2.2 GREEN: crear `backend/src/main/java/com/vivero/gestion/models/RetiroGananciaAbono.java` (tabla `retiros_ganancia_abono`; campos `id`, `monto`, `fecha`, `observacion`, `usuario`, `unidadNegocio`, `cuentaAbono`, `medioPago` — Decisión 1 de design.md), `backend/src/main/java/com/vivero/gestion/dto/RetiroGananciaDTO.java` (`id`, `monto`, `fecha`, `observacion`, `medioPago`, `cuentaAbono`, `retiradoPor`) y `backend/src/main/java/com/vivero/gestion/repositories/RetiroGananciaAbonoRepository.java` con los dos métodos usados en 2.1.
- [x] 2.3 TRIANGULATE: sembrar un retiro `JEFE` y otro `COLEGA` sobre la misma unidad; `sumarRetirosPorUnidadYCuenta` para cada cuenta devuelve sólo la suma de esa cuenta, sin mezclarlas (base de los escenarios *Los retiros del jefe no afectan la ganancia disponible del colega* y viceversa).
- [x] 2.4 TRIANGULATE: `sumarRetirosPorUnidadYCuenta` sin retiros previos para esa cuenta devuelve `0` (nunca `null`) — evita `NullPointerException` en el cálculo del servicio (grupo 4).
- [x] 2.5 REFACTOR: comentario en el modelo/repositorio explicando por qué es una tabla nueva y separada de `rendiciones_colega` (Decisión 1 de design.md). Tests verdes después del comentario (no debería cambiar nada funcional).

## 3. Servicio — registrar retiro y listar historial

- [x] 3.1 RED: crear `RetiroGananciaAbonoServiceTest` con un caso que llame `rendicionColegaService.registrarRetiroGanancia(RetiroGananciaRequestDTO)` con `CuentaAbonoContextHolder` en `JEFE` y verifique que persiste un `RetiroGananciaAbono` con `cuentaAbono = JEFE` y el monto/observación enviados. Falla por método inexistente en `RendicionColegaService`.
- [x] 3.2 GREEN: agregar `registrarRetiroGanancia(RetiroGananciaRequestDTO)` a `RendicionColegaService` y a `RendicionColegaServiceImpl`: valida `monto != null && monto > 0` (mismo chequeo que `registrarRendicion`), resuelve la cuenta desde `CuentaAbonoContextHolder.getCuentaAbono()` (rechaza con error explícito si es `null` — nunca cae en una cuenta por defecto), resuelve la unidad Abono por nombre (`unidadNegocioRepository.findByNombre("Abono")`, nunca id literal), guarda.
- [x] 3.3 TRIANGULATE: monto `0` o negativo lanza `IllegalArgumentException` (escenario *Rechazo de monto no positivo*); `CuentaAbonoContextHolder` en `null` lanza un error explícito en vez de asumir `JEFE` (escenario *Rechazo sin cuenta operativa resuelta*, mismo criterio que `registrarRendicion`).
- [x] 3.4 RED: extender `RetiroGananciaAbonoServiceTest` exigiendo que `obtenerHistorialRetirosGanancia(Pageable)` devuelva `Page<RetiroGananciaDTO>` con `retiradoPor` resuelto (`"Sergio"` para el retiro `JEFE` sembrado). Falla por método inexistente.
- [x] 3.5 GREEN: implementar `obtenerHistorialRetirosGanancia(Pageable)`, delegando en `retiroGananciaAbonoRepository.findAllByUnidadNegocioIdOrderByFechaDescIdDesc(...)` y mapeando cada fila con `CuentaAbonoNombres.nombreVisible(...)` para `retiradoPor` (reusar la clase de `historial-cobros-abono`, no reinventar el mapeo).
- [x] 3.6 TRIANGULATE (**guard de no-partición**, Decisión 6): sembrar un retiro `JEFE` y otro `COLEGA`; consultar `obtenerHistorialRetirosGanancia` con `CuentaAbonoContextHolder` en `JEFE` y luego en `COLEGA`; ambas consultas devuelven **el mismo conjunto completo**, con los dos retiros (escenarios *El jefe ve también los retiros del colega* / *El colega ve también los retiros del jefe*). Limpiar el `ThreadLocal` en `@AfterEach`.
- [x] 3.7 REFACTOR: confirmar por lectura que `obtenerHistorialRetirosGanancia` no referencia `CuentaAbonoContextHolder` para filtrar (sólo el test lo setea) y dejar comentado el porqué de la vista global.

## 4. Servicio — ganancia disponible acumulada

- [x] 4.1 RED: en `RetiroGananciaAbonoServiceTest`, sembrar una venta de Abono con un pago de la cuenta `JEFE` de monto conocido (sin gastos, sin retiros previos) y exigir que `rendicionColegaService.obtenerGananciaDisponible()` devuelva un `GananciaDisponibleAbonoDTO` donde `gananciaDisponibleJefe` sea igual a la ganancia teórica acumulada del jefe calculada a mano con el `porcentajeRepartoColega` sembrado (fórmula de Decisión 3 de design.md), y `gananciaDisponibleColega` su contraparte. Falla por método/DTO inexistente.
- [x] 4.2 GREEN: crear `backend/src/main/java/com/vivero/gestion/dto/GananciaDisponibleAbonoDTO.java` (`gananciaTeoricaAcumuladaJefe`, `gananciaTeoricaAcumuladaColega`, `retirosAcumuladosJefe`, `retirosAcumuladosColega`, `gananciaDisponibleJefe`, `gananciaDisponibleColega`) e implementar `obtenerGananciaDisponible()` en `RendicionColegaServiceImpl` siguiendo EXACTAMENTE la fórmula de la Decisión 3 de design.md: mismo cálculo que `obtenerLiquidacion(desde, hasta)` pero con rango `epoch` (`2000-01-01`) hasta `now()` (mismo truco que ya usa `obtenerSaldoCajaColega()`), menos `retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(...)` de cada cuenta.
- [x] 4.3 TRIANGULATE — gastos manuales restan (escenario *Los gastos manuales de Finanzas restan de la ganancia acumulada*): sembrar un `Gasto` manual con `unidadNegocio = Abono` además del pago del 4.1; verificar que la ganancia teórica acumulada baja exactamente ese monto, igual que ya lo hace `obtenerLiquidacion` (mismo criterio validado por `RendicionColegaLiquidacionGastosManualesTest`, ahora sin acotar por fecha).
- [x] 4.4 TRIANGULATE — los retiros sólo restan de su propia cuenta: sembrar un retiro `COLEGA`; verificar que `gananciaDisponibleColega` baja ese monto y `gananciaDisponibleJefe` no cambia; sembrar luego uno `JEFE` y verificar el caso inverso (escenarios *Los retiros del jefe no afectan la ganancia disponible del colega* y viceversa).
- [x] 4.5 TRIANGULATE — sobre-retiro permitido (escenario *Retiro mayor a la ganancia disponible*): sembrar un retiro de una cuenta por un monto mayor a su ganancia teórica acumulada; verificar que `obtenerGananciaDisponible()` no lanza excepción y que esa cuenta queda con valor negativo.
- [x] 4.6 TRIANGULATE — modo `repartoSobreVentasColega = true`: mismo patrón que `RendicionColegaLiquidacionModoColegaTest`, confirmando que en ese modo la base de cálculo del colega usa `ingresosColegaAcumulados` en vez de `ingresosNetosAcumulados`, igual que ya hace `obtenerLiquidacion`.
- [x] 4.7 REFACTOR: si hay duplicación evidente entre `obtenerLiquidacion` y `obtenerGananciaDisponible` (ambas resuelven ingresos/gastos con la misma fórmula, sólo cambia el rango de fechas), extraer un método privado compartido (ej. `calcularReparto(desde, hasta)`) — sin cambiar el comportamiento observable de `obtenerLiquidacion` (los 5 tests del grupo 1 deben seguir en su baseline exacto después del refactor).

## 5. Controller y permisos

- [x] 5.1 RED: crear `RetiroGananciaAbonoControllerPermisoTest` (patrón de `HistorialCobrosAbonoControllerPermisoTest`) que exija `403` para un usuario autenticado con sólo `ESCRIBIR_VENTAS` y `200` con `LEER_FINANZAS`, para los tres endpoints nuevos (registrar, listar historial, ganancia disponible).
- [x] 5.2 GREEN: agregar a `RendicionColegaController`, todos con `@PreAuthorize("hasAuthority('LEER_FINANZAS')")`:
  - `POST /api/abono/rendiciones/retiros-ganancia` → `registrarRetiroGanancia`
  - `GET /api/abono/rendiciones/retiros-ganancia` (params `page` def. `0`, `size` def. `10`, mismo default que `obtenerHistorialRendiciones`) → `obtenerHistorialRetirosGanancia`
  - `GET /api/abono/rendiciones/ganancia-disponible` → `obtenerGananciaDisponible`
  El controller **no** toca el repositorio (regla dura #6); delega todo en `RendicionColegaService`.
- [x] 5.3 Cerrar el backend: volver a correr los 5 tests de baseline de las tareas 1.1–1.5 y confirmar que siguen en su baseline exacto (escenarios *Registrar un retiro no afecta las rendiciones* / *Registrar una rendición no afecta los retiros de ganancia*). Ningún archivo `RendicionColega.java` (modelo), `DireccionRendicion.java` ni `rendiciones_colega` debe cambiar de comportamiento. **Confirmado: 13/13 passing (baseline exacto), y `git status` confirma que `RendicionColega.java`/`DireccionRendicion.java` no fueron tocados.**

## 6. Frontend (implementación + verificación manual)

- [x] 6.1 Agregar a `frontend/src/api/rendiciones.api.js`: `registrarRetiroGanancia(data)`, `getRetirosGanancia(page, size)`, `getGananciaDisponible()` (mismo estilo que los métodos de rendiciones ya existentes en ese archivo).
- [x] 6.2 En `frontend/src/pages/RendicionColega.jsx`, agregar un selector de dos pestañas arriba del layout actual: **"Rendiciones"** (el contenido de hoy, sin cambios de comportamiento) y **"Retiro de Ganancia"** (nueva). Usar `useState` simple para la pestaña activa, `cursor-pointer` en los tabs.
- [x] 6.3 Implementar la pestaña "Retiro de Ganancia": 2 tarjetas ("Ganancia Disponible (Sergio)" / "Ganancia Disponible (Pablo)") con `useQuery` a `getGananciaDisponible()`, en rojo si el valor es negativo (mismo criterio de color que `Finanzas.jsx` para ganancia negativa); formulario "Nuevo Retiro de Ganancia" (monto vía `FormattedNumberInput`, fecha, observación, medio de pago — mismos componentes que el formulario de rendición); historial paginado con columnas Fecha, Retiró, Monto, Observación, Medio.
- [x] 6.4 `useMutation` para el alta, con `onSuccess` invalidando las queries de `ganancia-disponible` e historial de retiros (mismo patrón que `rendicionMutation`), feedback de éxito/error exclusivamente vía `useUIStore().pushToast` (nunca `alert`/`confirm`, regla dura #7).
- [x] 6.5 Iconos de `lucide-react`, `cursor-pointer` en todo botón, PascalCase (regla dura #7) — sin crear un componente/archivo nuevo si cabe razonablemente dentro de `RendicionColega.jsx`; si el archivo crece demasiado, extraer la pestaña nueva a un componente propio importado ahí mismo (decisión de implementación, no de producto).
- [ ] 6.6 Verificación manual (el usuario prueba la UI; no automatizar). **Queda pendiente a propósito para el dueño del proyecto** (preferencia registrada: prueba la UI manualmente). Backend implementado y verificado por tests (33/33 verdes), `vivero-backend` reiniciado limpio con los 3 endpoints nuevos bajo `/api/abono/rendiciones`, y `vivero-frontend` sirve la pestaña nueva sin errores de compilación — listo para que el dueño ejecute esta checklist:
  - [ ] 6.6.1 Con unidad Abono activa y `LEER_FINANZAS`, la pestaña "Retiro de Ganancia" aparece junto a "Rendiciones" en `/abono/rendiciones`.
  - [ ] 6.6.2 Logueado como Sergio, registrar un retiro baja "Ganancia Disponible (Sergio)" y aparece en el historial; logueado como Pablo se ve ese mismo retiro (vista global) y su propia ganancia disponible no cambió.
  - [ ] 6.6.3 Un retiro mayor a la ganancia disponible se acepta igual y el número queda en rojo/negativo, sin bloquear el formulario.
  - [ ] 6.6.4 La pestaña "Rendiciones" sigue funcionando exactamente igual que antes (saldo en caja, alta, historial).
  - [ ] 6.6.5 Se ve correcto en mobile y desktop, en tema claro y oscuro.
