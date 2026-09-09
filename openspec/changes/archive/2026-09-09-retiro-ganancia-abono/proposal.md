## Why

En Abono, el sistema calcula cuánta ganancia generó el negocio y cuánto le corresponde en teoría a cada uno (`RendicionColegaServiceImpl.obtenerLiquidacion`), pero no existe forma de registrar que el jefe o el colega **ya retiraron** parte de esa ganancia para uso personal o familiar. Hoy esa plata desaparece del sistema sin dejar rastro: "Ganancia Neta" y "Compensación Teórica" siguen mostrando montos como si estuvieran disponibles, aunque ya se hayan gastado. El dueño necesita que cada retiro quede asentado (cuánto, quién, cuándo) y que la ganancia disponible para retirar baje en consecuencia, para que el sistema refleje la realidad de la caja.

## What Changes

- Nuevo registro de "Retiro de Ganancia" en Abono: el jefe o el colega asientan que sacaron un monto de SU PROPIA ganancia ya generada, para uso personal. Es un concepto nuevo y distinto de `RendicionColega` (que es el colega devolviendo plata *operativa* de ventas al jefe, no retirando su propia ganancia) — vive en una tabla y circuito propios, sin tocar `rendiciones_colega`.
- Nuevo cálculo de "ganancia disponible" **acumulada** (histórica, no por rango de fechas) para cada uno de los dos, reutilizando la misma fórmula que ya usa `obtenerLiquidacion` (ingresos por cuenta, menos gastos de insumos y gastos manuales de Abono, repartidos según el `porcentajeRepartoColega`/`repartoSobreVentasColega` configurados), menos los retiros ya registrados por esa persona.
- El sobre-retiro está permitido: si alguien retira más de lo que tiene disponible, el saldo queda en negativo (se descuenta de la ganancia futura) en vez de bloquear la operación.
- Nueva sección en la pantalla de Rendiciones (`RendicionColega.jsx`), como pestaña separada junto a "Rendiciones", con su propio formulario de alta y su propio historial — sin ruta nueva.
- Exclusivo de la unidad Abono. No se toca Vivero ni Herramientas.

## Capabilities

### New Capabilities
- `retiro-ganancia-abono`: registro de retiros de ganancia personal (jefe/colega) en Abono, con saldo de ganancia disponible acumulado por persona.

### Modified Capabilities
(ninguna — `rendicion-colega` no cambia su comportamiento; este change agrega un circuito nuevo e independiente que sólo comparte pantalla a nivel visual)

## Impact

- Backend: nueva entidad/tabla (retiros de ganancia), nuevo repositorio, nuevo método de cálculo acumulado en el servicio de Abono (o servicio dedicado), nuevo(s) endpoint(s) para registrar un retiro y para consultar el saldo disponible de cada uno. Permiso: a definir en design.md (candidato `LEER_FINANZAS`, ya que expone plata personal, no una operación de venta).
- Frontend: `RendicionColega.jsx` gana una segunda pestaña "Retiro de Ganancia" con alta + historial + saldo disponible de cada cuenta.
- Sin impacto en `VentaServiceImpl`, `RendicionColegaServiceImpl` (salvo lectura, no escritura, de su lógica de cálculo como referencia), ni en Vivero/Herramientas.
