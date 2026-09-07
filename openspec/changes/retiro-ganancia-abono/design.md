## Context

El dueño pidió una forma de registrar que el jefe o el colega retiraron plata de SU PROPIA ganancia ya generada en Abono, para uso personal/familiar — y que esa plata deje de figurar como "disponible" en el sistema. Preguntas hechas y respondidas (ver proposal.md para el resumen; acá el detalle técnico de por qué cada respuesta se traduce en la decisión correspondiente).

### Estado real relevado (verificado sobre el código, no asumido)

1. **`RendicionColegaServiceImpl.obtenerLiquidacion(desde, hasta)`** ya calcula, para un rango de fechas, `ingresosJefe`, `ingresosColega` (vía `pagoRepository.sumarPagosPorCuentaYPeriodo`), `gastosInsumos` (insumos **+ gastos manuales**, fix del 2026-09-04 — `insumoRepository.sumarGastosInsumos(...)` más `gastoRepository.findByUnidadNegocioIdAndFechaBetween(...)`), `ingresosNetos = ingresosJefe + ingresosColega - gastosInsumos`, y `compensacionTeorica` = la base (`ingresosNetos` o `ingresosColega` según `UnidadNegocio.repartoSobreVentasColega`) multiplicada por `UnidadNegocio.porcentajeRepartoColega`. Es la única fórmula de reparto que existe en el sistema — no hay que inventar una nueva, sólo correrla sin acotar por fecha.
2. **`obtenerSaldoCajaColega()`** ya resuelve "acumulado histórico" con el mismo truco que este change necesita: rango fijo `LocalDateTime.of(2000, 1, 1, 0, 0)` hasta `LocalDateTime.now()`, en vez de un `desde`/`hasta` elegido por el usuario.
3. **`RendicionColega` (modelo, tabla `rendiciones_colega`)** tiene `monto`, `fecha`, `observacion`, `usuario`, `unidadNegocio`, `direccion` (`DireccionRendicion`: `COLEGA_A_JEFE`/`JEFE_A_COLEGA`) y `medioPago`. Es el molde de convenciones más cercano, pero su `direccion` no aplica acá: una rendición es un movimiento *entre* dos cuentas; un retiro de ganancia es alguien sacando de *su propia* bolsa, no hay "hacia quién".
4. **`RendicionRequestDTO`** ya no lleva `direccion` en el body — se deriva en el server de `CuentaAbonoContextHolder` (poblado por `CuentaAbonoFilter` según el username logueado). Mismo criterio aplica acá: el request no elige de quién es el retiro, lo decide la sesión.
5. **Permisos**: `LEER_FINANZAS` (`PermisoEnum`, id 9) ya es el permiso que protege `obtenerLiquidacion` puntualmente (no todo el controller) porque expone "cuánto gana/tiene cada socio" — información financiera personal, distinta de la operación de "anotar que el colega entregó plata" (`registrarRendicion`, que sigue con `ESCRIBIR_VENTAS`). Un retiro de ganancia personal es, si cabe, más sensible que la liquidación (es plata que alguien ya se llevó), así que aplica el mismo criterio: `LEER_FINANZAS` para registrar y para consultar.
6. **`RendicionColega.jsx`** hoy es una sola pantalla: 2 tarjetas de saldo (Pablo, Sergio) + formulario "Nueva Rendición" + historial paginado, en un layout de 3 columnas (`lg:col-span-1` formulario, `lg:col-span-2` historial). No tiene pestañas todavía.
7. **`historial-cobros-abono`** (change recién archivado) dejó `CuentaAbonoNombres` (`JEFE`↔`Sergio`, `COLEGA`↔`Pablo`, más `"Sin cuenta asignada"` para nulo) como la única fuente de este mapeo en el sistema — se reutiliza acá para mostrar "quién retiró", sin reinventar el mapeo ni tocar `CuentaAbonoFilter`.

## Goals / Non-Goals

**Goals:**
- Registrar retiros de ganancia personal del jefe o del colega en Abono: monto, fecha, observación, quién.
- Calcular la ganancia disponible **acumulada** (histórica completa, no por período) de cada uno, descontando los retiros ya hechos.
- Permitir sobre-retiro: el saldo puede quedar negativo, sin bloquear la operación.
- Vivir como una segunda pestaña dentro de `RendicionColega.jsx`, con su propio formulario e historial.

**Non-Goals:**
- No se toca Vivero ni Herramientas — exclusivo de Abono.
- No se modifica `RendicionColega`, `rendiciones_colega`, ni el cálculo de `saldoCajaColega`/`compensacionTeorica` por período que ya usa `LiquidacionAbono.jsx`. El retiro de ganancia es un circuito nuevo y paralelo.
- No se agrega un permiso nuevo: se reutiliza `LEER_FINANZAS`.
- No hay edición ni anulación de un retiro ya registrado — igual que `RendicionColega`, es sólo alta + historial de sólo lectura.
- No se bloquea ni se valida el sobre-retiro contra el saldo disponible (Non-Goal explícito, por pedido directo del dueño).

## Decisions

### Decisión 1 — Entidad y tabla nuevas: `RetiroGananciaAbono` / `retiros_ganancia_abono`

Campos: `id`, `monto` (`BigDecimal`, `precision=12, scale=2`, `nullable=false`), `fecha` (`LocalDateTime`, `nullable=false`), `observacion` (`String`, `length=500`, opcional), `usuario` (`@ManyToOne` `Usuario`, quien registró — mismo campo que `RendicionColega.usuario`), `unidadNegocio` (`@ManyToOne` `UnidadNegocio`, siempre Abono), `cuentaAbono` (`@Enumerated(STRING)` `CuentaAbono`, de qué cuenta es la ganancia retirada — reemplaza al rol que cumple `direccion` en `RendicionColega`, pero acá es un solo valor, no un par origen/destino), `medioPago` (`String`, opcional, mismo criterio que `RendicionColega.medioPago`).

*Por qué una tabla nueva y no una columna/flag en `rendiciones_colega`:* una rendición mueve plata **entre** las dos cuentas (siempre hay un origen y un destino, `direccion` lo captura). Un retiro de ganancia es plata que **sale del sistema** hacia el bolsillo personal de uno solo — no tiene contraparte. Forzar ambos conceptos en la misma tabla obligaría a un campo `direccion` que no aplica, o a "inventar" una dirección falsa (ej. `JEFE_A_COLEGA` no tiene sentido para "el jefe se lleva su propia plata"), ensuciando el significado del campo existente y arriesgando romper `RendicionColegaServiceImpl.obtenerLiquidacion` (que ya suma `rendicionesEntregadas` con el signo de `direccion` — un tipo de movimiento distinto ahí adentro sería un bug esperando pasar).

*Alternativa considerada: usar `RendicionColega` con un `TipoMovimiento` (RENDICION / RETIRO_GANANCIA) y `direccion` nullable.* Rechazada: el dueño pidió explícitamente que sea un concepto separado, y mezclar dos tipos de movimiento con reglas de cálculo distintas en la misma tabla/repositorio es exactamente el tipo de acoplamiento que ya le costó un bug a este proyecto (ver el fix de gastos manuales del 2026-09-04, que fue justamente una liquidación con un origen de datos incompleto).

### Decisión 2 — La lógica vive en `RendicionColegaService`/`RendicionColegaServiceImpl`, no en un servicio nuevo

Se agregan métodos nuevos (`registrarRetiroGanancia`, `obtenerHistorialRetirosGanancia`, `obtenerGananciaDisponible`) a la interfaz y a la implementación **existentes**, en vez de crear `RetiroGananciaAbonoService`.

*Por qué:* el cálculo de "ganancia disponible acumulada" es una variante directa de `obtenerLiquidacion` (mismos repositorios: `pagoRepository`, `insumoRepository`, `gastoRepository`, `unidadNegocioRepository`; misma fórmula, sólo que con rango épocas-a-hoy en vez de `desde`/`hasta`). Duplicar esa lógica en un servicio nuevo obligaría a inyectar los mismos cinco repositorios ahí también, y el día que la fórmula de reparto cambie (ej. el `porcentajeRepartoColega`) habría que acordarse de tocar dos lugares. Mantenerlo en el mismo servicio que ya es dueño de esa fórmula es la opción de menor acoplamiento real, aunque la tabla de datos sea distinta (Decisión 1).

*Alternativa considerada: `RetiroGananciaAbonoService` dedicado, inyectando `RendicionColegaService` para reusar `obtenerLiquidacion`.* Rechazada: `obtenerLiquidacion` exige `desde`/`hasta` obligatorios y no expone una versión acumulada — habría que agregar esa versión en `RendicionColegaServiceImpl` de todos modos, y en ese punto ya está ahí la mitad del trabajo; separar el resto a otro servicio sólo por prolijidad no paga su costo de indirección extra.

*Dónde NO cambia nada:* `obtenerLiquidacion(desde, hasta)` y `obtenerSaldoCajaColega()` quedan exactamente como están — los métodos nuevos son agregados, no refactors de los existentes.

### Decisión 3 — Fórmula de "ganancia disponible acumulada" (mismo criterio que `obtenerLiquidacion`, sin acotar por fecha)

```java
LocalDateTime epoch = LocalDateTime.of(2000, 1, 1, 0, 0);
LocalDateTime ahora = LocalDateTime.now();

BigDecimal ingresosJefeAcum = pagoRepository.sumarPagosPorCuentaYPeriodo(JEFE, epoch, ahora);
BigDecimal ingresosColegaAcum = pagoRepository.sumarPagosPorCuentaYPeriodo(COLEGA, epoch, ahora);

BigDecimal gastosAcum = insumoRepository.sumarGastosInsumos(epoch, ahora, abono.getId())
        .add(gastoRepository.findByUnidadNegocioIdAndFechaBetween(abono.getId(), epoch, ahora)
                .stream().map(Gasto::getMonto).reduce(ZERO, BigDecimal::add));

BigDecimal ingresosNetosAcum = ingresosJefeAcum.add(ingresosColegaAcum).subtract(gastosAcum);

BigDecimal baseColega = abono.isRepartoSobreVentasColega() ? ingresosColegaAcum : ingresosNetosAcum;
BigDecimal gananciaTeoricaColega = baseColega.multiply(abono.getPorcentajeRepartoColega()).divide(valueOf(100));
BigDecimal gananciaTeoricaJefe = ingresosNetosAcum.subtract(gananciaTeoricaColega);

BigDecimal retirosColega = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), COLEGA);
BigDecimal retirosJefe = retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(abono.getId(), JEFE);

BigDecimal gananciaDisponibleColega = gananciaTeoricaColega.subtract(retirosColega); // puede dar negativo
BigDecimal gananciaDisponibleJefe = gananciaTeoricaJefe.subtract(retirosJefe);       // puede dar negativo
```

Es exactamente la misma fórmula de `obtenerLiquidacion`, con `epoch`/`ahora` en vez de `desde`/`hasta` (mismo truco ya usado por `obtenerSaldoCajaColega`), más la resta de los retiros ya registrados. `gananciaTeoricaJefe` se obtiene como el resto (`ingresosNetosAcum - gananciaTeoricaColega`), igual que hoy el jefe no tiene un campo explícito propio en `LiquidacionAbonoDTO` — se sigue derivando, no se lo materializa por separado en la base.

*Consecuencia asumida y explícita:* si `porcentajeRepartoColega` o `repartoSobreVentasColega` cambian en el medio de la historia del negocio (ej. el dueño ajusta el % de reparto), la ganancia disponible acumulada se recalcula con la configuración **actual** aplicada retroactivamente a todo el historial de ingresos/gastos — no hay versionado de configuración histórica. Es el mismo comportamiento que ya tiene `obtenerLiquidacion` hoy (aplica el % vigente al período consultado, sea cual sea), sólo que ahora el período es "toda la vida del negocio" en vez de un mes. No es un comportamiento nuevo, es el mismo asumido para un rango más largo.

### Decisión 4 — Sin validación de sobre-retiro

`registrarRetiroGanancia` valida únicamente `monto != null && monto > 0` (mismo chequeo que `registrarRendicion`). No se compara contra `gananciaDisponible` antes de guardar. Pedido explícito del dueño: "que lo permita y el saldo quede en negativo". El frontend puede (opcionalmente) mostrar una advertencia visual si el retiro deja el saldo en negativo, pero no bloquea el submit.

### Decisión 5 — Endpoints nuevos en `RendicionColegaController`, bajo `/api/abono/rendiciones`

| Método | Ruta | Permiso | Qué hace |
|---|---|---|---|
| `POST` | `/api/abono/rendiciones/retiros-ganancia` | `LEER_FINANZAS` | Registra un retiro de ganancia de la cuenta activa (`CuentaAbonoContextHolder`) |
| `GET` | `/api/abono/rendiciones/retiros-ganancia` | `LEER_FINANZAS` | Historial paginado, **global** (ambas cuentas juntas — mismo criterio de no-partición que `historial-cobros-abono`, ver Decisión 6) |
| `GET` | `/api/abono/rendiciones/ganancia-disponible` | `LEER_FINANZAS` | Devuelve `GananciaDisponibleAbonoDTO` con el desglose de ambas cuentas |

*Por qué anidado bajo `/rendiciones` y no un controller nuevo:* mismo criterio que la Decisión 2 a nivel HTTP — es una subsección de la misma pantalla/feature, y `RendicionColegaController` ya inyecta `RendicionColegaService`, que es donde vive la lógica. Un controller nuevo sería una capa extra sin necesidad.

*Por qué `LEER_FINANZAS` y no `ESCRIBIR_VENTAS`* (que es lo que usa `registrarRendicion`): ver punto 5 del Context. Registrar una rendición es una operación logística ("anotá que entregué esta plata"); registrar un retiro de ganancia revela y mueve plata personal — es información financiera, como `obtenerLiquidacion`.

### Decisión 6 — El historial de retiros es GLOBAL (no se particiona por `CuentaAbono`)

Igual que el historial de cobros (`historial-cobros-abono`, Decisión 4 de su design.md): quien tiene `LEER_FINANZAS` ya ve la liquidación completa de ambas cuentas (`ingresosJefe`, `ingresosColega`, `compensacionTeorica`), así que particionar el historial de retiros por la cuenta activa de quien consulta no aportaría privacidad real — sólo escondería información que la misma persona ya puede ver en la liquidación, y complicaría innecesariamente la pantalla nueva (dos historiales separados en vez de uno). El GET de historial no filtra por `CuentaAbonoContextHolder`; cada fila expone de qué cuenta fue el retiro vía `CuentaAbonoNombres.nombreVisible(...)`, igual que `historial-cobros-abono` expone "cobradoPor".

### Decisión 7 — DTOs nuevos

- `RetiroGananciaRequestDTO`: `monto`, `observacion`, `medioPago` (opcional), `fecha` (String `"YYYY-MM-DD"`, opcional — mismo patrón que `RendicionRequestDTO`). Sin campo de cuenta: se deriva de `CuentaAbonoContextHolder`, igual que la `direccion` de una rendición.
- `RetiroGananciaDTO` (fila de historial): `id`, `monto`, `fecha`, `observacion`, `medioPago`, `cuentaAbono` (crudo), `retiradoPor` (derivado con `CuentaAbonoNombres.nombreVisible(...)`).
- `GananciaDisponibleAbonoDTO`: `gananciaTeoricaAcumuladaJefe`, `gananciaTeoricaAcumuladaColega`, `retirosAcumuladosJefe`, `retirosAcumuladosColega`, `gananciaDisponibleJefe`, `gananciaDisponibleColega` — se exponen tanto el teórico como lo ya retirado, no sólo el resultado final, para que la pantalla pueda mostrar el desglose sin una segunda llamada.

### Decisión 8 — Frontend: pestañas dentro de `RendicionColega.jsx`

Se agrega un selector de dos pestañas arriba del layout de 3 columnas ya existente: **"Rendiciones"** (el contenido actual, sin cambios) y **"Retiro de Ganancia"** (nuevo). La pestaña nueva reutiliza la misma estructura visual (tarjetas de saldo a la izquierda + formulario, historial a la derecha), pero con sus propios datos:
- 2 tarjetas: "Ganancia Disponible (Sergio)" y "Ganancia Disponible (Pablo)", desde `GananciaDisponibleAbonoDTO`. Si el valor es negativo, se muestra en rojo (mismo criterio de color que ya usa `Finanzas.jsx` para ganancia negativa).
- Formulario "Nuevo Retiro de Ganancia": monto, fecha, observación, medio de pago — mismos componentes (`FormattedNumberInput`, etc.) que el formulario de rendición.
- Historial paginado con columnas: Fecha, Retiró (vía `CuentaAbonoNombres`), Monto, Observación, Medio.

Nuevos métodos en `frontend/src/api/rendiciones.api.js`: `registrarRetiroGanancia(data)`, `getRetirosGanancia(page, size)`, `getGananciaDisponible()`.

## Risks / Trade-offs

- **[La ganancia disponible acumulada usa el % de reparto vigente HOY sobre toda la historia]** → Documentado explícitamente en Decisión 3 como comportamiento heredado, no nuevo. Si el dueño necesita versionar el % por período, es un change aparte.
- **[Dos tipos de "movimiento de dinero personal" en la misma pantalla (Rendición vs Retiro de Ganancia) pueden confundirse]** → Mitigado con pestañas separadas y nombres explícitos en la UI ("Rendición" siempre implica una dirección Jefe↔Colega; "Retiro de Ganancia" siempre es plata que sale del sistema). El backend los mantiene en tablas y endpoints distintos para que un bug de cálculo en uno no pueda filtrarse al otro.
- **[Sobre-retiro sin aviso puede sorprender al usuario]** → Fuera de alcance bloquear, pero el frontend puede (no obligatorio, a criterio de implementación) resaltar en rojo un saldo que ya quedó negativo antes del nuevo retiro, igual que ya hace `Finanzas.jsx` con ganancia negativa.
- **[Volumen del historial de retiros]** → Paginado desde el primer commit, mismo criterio que el resto del sistema (regla dura #6).

## Migration Plan

No hay migración de datos: es una tabla nueva (`retiros_ganancia_abono`), `ddl-auto=update` la crea sola. No se tocan columnas existentes.

1. Deploy backend: aparecen los 3 endpoints nuevos bajo `/api/abono/rendiciones`. Ningún endpoint existente cambia de forma ni de contrato.
2. Deploy frontend: aparece la pestaña "Retiro de Ganancia" en `RendicionColega.jsx`. La pestaña "Rendiciones" sigue exactamente igual.
3. **Rollback:** revertir el commit y redesplegar. La tabla nueva queda huérfana en la base (vacía o con datos reales de retiros ya hechos) — si se necesita revertir con datos ya cargados, decisión del dueño si conservarlos para una reintroducción futura del feature.

## Open Questions

Ninguna. Las decisiones pendientes que dejaba `proposal.md` (nombre de la entidad, endpoints, permiso, forma del DTO de saldo, layout de pestañas) quedan cerradas en las Decisiones 1, 5, 7 y 8 de este documento.
