## Context

La unidad **Abono** la operan dos personas bajo dos "cuentas operativas" del dominio (`CuentaAbono`: `JEFE` = Sergio, `COLEGA` = Pablo). Esa cuenta no es una identidad de autenticación: `CuentaAbonoFilter` la deriva del `username` de la sesión y la deja en un `ThreadLocal` (`CuentaAbonoContextHolder`) durante la petición.

Sobre ese contexto, `VentaServiceImpl.listarVentas()` (`backend/src/main/java/com/vivero/gestion/services/impl/VentaServiceImpl.java`, líneas ~326-357) **particiona el historial de ventas**: si la unidad en contexto es Abono y hay cuenta en contexto, usa `ventaRepository.findAllByUnidadNegocioIdAndCuentaAbonoOrderByFechaDesc(unidadId, cuentaAbono)` en lugar del camino normal `findAllByUnidadNegocioIdOrderByFechaDesc(unidadId)` que usan Vivero y Herramientas. Resultado: en `/ventas/historial`, Sergio ve sólo lo que cargó Sergio y Pablo sólo lo que cargó Pablo. Nunca ven el historial completo del negocio que comparten.

Este es **exactamente el mismo patrón** que ya se eliminó para la agenda de clientes en `clientes-compartidos-abono` (archivado 2026-09-06). Aquel change lo hizo sobre `ClienteServiceImpl` y dejó ventas/stock/rendición explícitamente fuera de alcance, con un guard de regresión. `historial-cobros-abono` (archivado 2026-09-07) hizo lo mismo con el historial de cobros y volvió a dejar constancia de que "las ventas siguen particionadas". El dueño ahora pide extender el criterio de compartido al historial de ventas: este change es el hermano menor de `clientes-compartidos-abono`, con el mismo razonamiento y una superficie mucho más chica.

### Estado real relevado (verificado sobre el código, no asumido)

1. **El único consumidor de la query particionada es `listarVentas()`.** `grep` sobre `backend/src` encuentra `findAllByUnidadNegocioIdAndCuentaAbonoOrderByFechaDesc` en exactamente dos lugares: su declaración en `VentaRepository` (línea 21) y su única llamada en `VentaServiceImpl:344`. Ningún test la usa directo.
2. **`RendicionColegaServiceImpl` no depende de `listarVentas()`.** Calcula la liquidación con queries propias que leen `Venta.cuentaAbono` / `Pago.cuentaAbono` a nivel de repositorio: `ventaRepository.sumarTotalVentasPorCuentaYPeriodo(CuentaAbono.JEFE|COLEGA, desde, hasta)` (líneas 183-184), `pagoRepository.sumarPagosPorCuentaYPeriodo(...)` (líneas 123, 143-144) y `retiroGananciaAbonoRepository.sumarRetirosPorUnidadYCuenta(...)` (líneas 307-308). Ninguna de esas queries pasa por el servicio de ventas ni por la query que este change elimina.
3. **`Venta.cuentaAbono` se sigue escribiendo igual.** `VentaServiceImpl:141-145` estampa la cuenta en el alta y `:177` / `:247` / `:406` la propagan a stock de Abono y a los pagos. Nada de eso se toca: la **atribución** de cada venta se conserva; lo único que cambia es el **criterio de consulta** del listado.
4. **`unidadNegocioRepository` se sigue usando en `VentaServiceImpl`** (líneas 102 y 137, para resolver la unidad al registrar la venta). El campo, el import y el parámetro del constructor **quedan**; sólo muere el `findById(...).map(u -> "Abono".equals(...))` de la línea 340, que existía únicamente para decidir el filtro.
5. **`VentaResponseDTO` ya expone `usuarioNombre`.** Con el historial compartido, cada fila ya identifica quién registró la venta sin agregar ningún campo nuevo al DTO ni al contrato HTTP.
6. **El frontend no necesita cambios.** `frontend/src/pages/HistorialVentas.jsx:17` hace `await ventasApi.listarVentas()` y renderiza lo que venga. Sacado el filtro del backend, la pantalla muestra el historial completo sola.
7. **La partición actual ya está rota hoy**, igual que pasaba con clientes: un tercer usuario autenticado de Abono que no sea `Sergio` ni `Pablo` no tiene cuenta en contexto, cae en el `else` y ve el listado completo. La "privacidad" del historial no es una regla que el sistema sostenga de forma consistente — es un accidente de implementación.

## Goals / Non-Goals

**Goals:**
- Que los dos usuarios de Abono vean **el mismo historial de ventas completo** en `/ventas/historial`, sin importar quién registró cada venta.
- Que el código deje de tener un camino capaz de re-particionar el listado por cuenta (no alcanza con dejar de llamarlo: hay que borrar la query).
- Cero cambios en el contrato HTTP (mismas rutas, mismo `VentaResponseDTO`) y cero cambios de frontend.
- Corregir los dos escenarios de specs ya sincronizadas que documentaban la partición como comportamiento a preservar, y que este change invierte a propósito.

**Non-Goals:**
- **No** se toca `RendicionColegaServiceImpl`, la liquidación, el saldo de caja del colega ni los retiros de ganancia. Siguen calculándose por cuenta (punto 2 del contexto). Este change no los roza: se los cubre con un guard de regresión, no con código.
- **No** se toca el campo `Venta.cuentaAbono` ni su escritura. A diferencia de `clientes-compartidos-abono` — donde el campo se borró de la entidad porque nadie más lo leía — acá el campo **tiene consumidores vivos y legítimos** (rendición, stock de Abono, atribución del pago). Borrarlo sería una regresión funcional, no una limpieza.
- **No** se toca stock de Abono (`StockAbonoServiceImpl`, `MovimientoStockAbono`), producción ni traslados: cada uno sigue vendiendo de su propio stock.
- **No** se toca `listarVentasPorCliente()`, `listarVentasPorRango()` ni `obtenerPorId()`: ninguno filtraba por cuenta antes y ninguno lo hace después.
- **No** se toca `CuentaAbonoFilter` ni `CuentaAbonoContextHolder`.
- **No** se agrega paginación a `listarVentas()` (deuda preexistente, ajena a este change).
- **No** se toca el segundo test de `VentaServiceListarVentasAbonoTest` (`unidadViveroNoFiltraPorCuentaAbonoAunConContextoResidual`): protege a Vivero de un filtro por cuenta que nunca debió aplicarle, y sigue siendo válido tal cual.

## Decisions

### Decisión 1 — Eliminar la rama de partición, no volverla configurable

`listarVentas()` pasa a tener **un solo camino** cuando hay unidad en contexto, el mismo de Vivero y Herramientas:

```java
if (unidadId != null) {
    ventas = ventaRepository.findAllByUnidadNegocioIdOrderByFechaDesc(unidadId);
} else {
    ventas = ventaRepository.findAllByOrderByFechaDesc();
}
```

Desaparecen: la lectura de `CuentaAbonoContextHolder.getCuentaAbono()` dentro del método, el `boolean esUnidadAbono` con su `unidadNegocioRepository.findById(...)`, el `if/else` interno y el bloque de comentario que explicaba por qué el gate por unidad era necesario (ese comentario documenta una decisión que este change deroga; dejarlo sería documentación mentirosa).

*Alternativa considerada:* dejar la partición detrás de un flag (`app.abono.ventas-compartidas`). Rechazada por el mismo motivo que en `clientes-compartidos-abono`: el dueño quiere un solo historial, no dos modos; un flag deja vivo el código muerto, obliga a testear las dos ramas para siempre, y el punto 7 del contexto muestra que la partición ya no se cumple de forma consistente ni hoy.

*Efecto colateral deseado:* al desaparecer la única lectura de `CuentaAbonoContextHolder` en `listarVentas()`, el import a nivel de clase **no** se puede quitar — sigue usándose en `:141` para estampar la cuenta en el alta. El REFACTOR se limita a lo que realmente queda huérfano.

### Decisión 2 — Se borra el método de repositorio, no sólo su llamada

`VentaRepository.findAllByUnidadNegocioIdAndCuentaAbonoOrderByFechaDesc` se elimina. Verificado (punto 1) que su único llamador es la línea que este change borra.

*Por qué borrarlo y no dejarlo:* mismo criterio que la Decisión 2 de `clientes-compartidos-abono`. Mientras el método exista, volver a particionar el historial es una línea de código; borrándolo, hay que reescribir la query — el invariante pasa a estar defendido por el compilador y no por la memoria del próximo lector. Además evita que un `grep` futuro lo encuentre y lo interprete como comportamiento vigente.

*Qué NO se borra de `VentaRepository`:* `sumarTotalVentasPorCuentaYPeriodo` **se queda**. Es la query que alimenta la rendición del colega (punto 2 del contexto) y es la razón por la que `Venta.cuentaAbono` sigue teniendo sentido. Confundir las dos y borrar ambas sería romper la liquidación.

### Decisión 3 — El test existente que afirma la partición se reescribe, no se borra ni se agrega uno nuevo al lado

`VentaServiceListarVentasAbonoTest.unidadAbonoConCuentaJefeSoloDevuelveVentasDeJefe` afirma hoy *exactamente lo contrario* de lo que este change quiere. No es un test que "se rompe por accidente": es la especificación anterior escrita en código. Se lo reescribe (nombre incluido) para afirmar el comportamiento nuevo, cubriendo **las dos direcciones**, igual que `ClienteAgendaCompartidaAbonoTest` cubrió listado y lectura desde ambas cuentas:

- con `CuentaAbono.JEFE` en contexto, el historial contiene la venta de JEFE **y** la de COLEGA;
- con `CuentaAbono.COLEGA` en contexto, el historial contiene las dos también.

Esto tiene una consecuencia sobre el módulo TDD estricto que hay que decir en voz alta: **este test no puede usarse como "baseline que debe quedar idéntico"** en el paso 0 (safety net), porque su cambio de resultado *es* el objetivo del change. El baseline de este change son el **segundo** test del mismo archivo (Vivero) y los tests de rendición (`RendicionColegaLiquidacionModoColegaTest`, `RendicionColegaLiquidacionGastosManualesTest`), que sí deben quedar bit a bit iguales. La secuencia RED→GREEN es explícita: primero se reescribe la aserción contra el código viejo (debe fallar), después se toca el servicio.

*Alternativa considerada:* dejar el test viejo y agregar uno nuevo `VentaHistorialCompartidoAbonoTest` al lado. Rechazada: quedarían dos tests contradictorios, uno de los cuales fallaría siempre. La partición no es un caso de uso alternativo, es el comportamiento derogado.

### Decisión 4 — Las specs ya sincronizadas que documentan la partición se corrigen a mano, en este mismo change

Dos specs principales (ya sincronizadas desde changes archivados) afirman hoy que el historial de ventas sigue particionado, como guarda de regresión de *sus* changes:

1. `openspec/specs/historial-cobros-abono/spec.md` — requirement *"El Historial No Se Particiona por Cuenta de Abono"*: la frase normativa "Esta no-partición SHALL ser independiente de la partición que siguen aplicando **las ventas**, el stock y la rendición..." y el escenario *"La partición de ventas sigue vigente (guard de no regresión)"*.
2. `openspec/specs/backend-clientes/spec.md` — requirement *"Agenda de Clientes Compartida en Abono"*: la frase "La atribución de ventas, pagos, movimientos de stock de Abono y rendición del colega a la cuenta operativa MUST permanecer intacta: cada cuenta sigue teniendo **sus propias ventas**..." y el escenario *"Ventas, stock y rendición siguen particionados por cuenta (guarda de regresión)"*.

Ambas quedan **falsas** en cuanto este change entre. No se reabre ni se re-lanza ninguno de los dos changes archivados: se corrige el texto de la spec principal a mano, en este mismo change, y se deja el archivo del change original intacto como registro histórico de lo que se decidió en su momento.

*Alternativa considerada:* expresar esas correcciones como deltas `## MODIFIED Requirements` sobre `backend-clientes` e `historial-cobros-abono` dentro de `specs/` de este change, para que el sync de archive las aplique solo. Rechazada por dos motivos: (a) `MODIFIED` exige copiar el **requirement completo** palabra por palabra, y en ambos casos se trata de requirements largos de los que sólo cambian dos frases — el riesgo de perder detalle por una copia imperfecta (el pitfall que la propia guía de OpenSpec advierte) es mayor que el de una edición quirúrgica de dos líneas; (b) el `proposal.md` declara `ventas-core` como la única capability modificada, y agregar dos capabilities más al delta ensancharía el alcance declarado del change por una corrección de redacción. La corrección va como task explícita y verificable en `tasks.md`.

*Qué se corrige exactamente:* la parte que dejó de ser cierta es el **listado**, no la **atribución**. Cada venta sigue perteneciendo a una cuenta y la rendición la sigue usando. Las dos frases y los dos escenarios se reescriben para decir eso: la atribución por cuenta permanece; la partición del *historial* ya no.

### Decisión 5 — Alcance de la spec `ventas-core`: `ADDED`, no `MODIFIED`

`openspec/specs/ventas-core/spec.md` no tiene hoy **ningún** requirement que describa el criterio de visibilidad del historial de ventas por cuenta operativa (sus requirements cubren registro de venta, inmutabilidad, impacto en stock y alta de cliente al vuelo). No hay bloque que modificar. El delta de este change es por lo tanto `## ADDED Requirements`, con un requirement nuevo que fija el criterio compartido y sus guards. Es el mismo movimiento que hizo `clientes-compartidos-abono` al agregar *"Agenda de Clientes Compartida en Abono"* a `backend-clientes`.

## Risks / Trade-offs

- **[Cada usuario ve ahora ventas que antes no veía]** → Es el objetivo explícito del pedido, no un efecto secundario. No se expone dato sensible nuevo: ambos operan la misma unidad de negocio y `VentaResponseDTO` ya se devolvía completo. El aislamiento entre unidades (`unidadNegocioId`) sigue intacto y es la frontera de seguridad real.
- **[Confundir "historial compartido" con "rendición compartida"]** → Es el riesgo grande de este change. La liquidación del colega debe seguir separando plata de cada uno; si eso se rompe, el dueño pierde el cálculo de cuánto le corresponde a Pablo. Mitigación: la Decisión 2 preserva `sumarTotalVentasPorCuentaYPeriodo` explícitamente, `tasks.md` lista los archivos intocables, y los tests de rendición actúan como baseline de comparación exacta antes y después.
- **[Se borra la query equivocada de `VentaRepository`]** → Mitigación: la task de borrado nombra el método exacto y exige verificar por `grep` que `sumarTotalVentasPorCuentaYPeriodo` sigue presente y con sus llamadores intactos.
- **[El historial crece y la pantalla se vuelve lenta]** → `listarVentas()` no tiene paginación (deuda preexistente) y ahora devuelve el doble de filas en Abono. Aceptado: el volumen real de Abono es bajo y Vivero/Herramientas ya funcionan sin partición con más ventas. Si algún día molesta, la solución es paginar el endpoint, no reintroducir el filtro por cuenta.
- **[Quedan specs contradictorias en el repo]** → Mitigado por la Decisión 4 y sus tasks. Si esas ediciones se saltean, el repo queda afirmando dos cosas opuestas sobre el mismo comportamiento.
- **[Alguien reintroduce el filtro más adelante]** → Mitigado por construcción: borrado el método de repositorio, volver a particionar exige reescribir la query. El test de historial compartido falla si eso ocurre.

## Migration Plan

No hay migración de datos ni de esquema. Ninguna entidad cambia, ninguna columna se agrega ni se borra (`Venta.cuenta_abono` queda igual, con sus valores, y se sigue escribiendo).

1. Deploy del backend con el código nuevo. Hibernate en `ddl-auto=update` no altera nada.
2. Efecto inmediato al primer request: `/ventas/historial` en Abono pasa a mostrar el historial completo de la unidad para ambos usuarios. Sin reindexar, sin recalcular saldos, sin tocar el frontend.
3. **Rollback:** revertir el commit y redesplegar. Como `Venta.cuentaAbono` se siguió escribiendo durante toda la ventana, el código anterior vuelve a particionar exactamente igual que antes, sin datos huérfanos ni ventas invisibles. El rollback de este change es totalmente limpio — a diferencia de `clientes-compartidos-abono`, donde los clientes creados durante la ventana quedaban con `cuenta_abono = NULL`.

## Open Questions

Ninguna. El alcance está cerrado: sólo el criterio de consulta de `listarVentas()`, la query de repositorio que queda huérfana, el test que afirmaba lo contrario y la redacción de los dos escenarios de spec que este change invierte.
