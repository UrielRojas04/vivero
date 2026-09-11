## Context

La motivación está en `proposal.md` y no se repite acá. Lo que sigue es el estado real del código,
verificado archivo por archivo, y las decisiones técnicas que salen de él.

**El punto de la falla.** `DevolucionServiceImpl.registrarDevolucionLlenas`
(`backend/src/main/java/com/vivero/gestion/services/impl/DevolucionServiceImpl.java`, líneas 39-100)
hace cuatro cosas: crea el `Producto` clonado de la devolución, registra el `MovimientoStock`,
descuenta bandejas del saldo del cliente y acredita pesos en la cuenta corriente. Las dos primeras
dejan rastro. Las dos últimas no:

- Línea 84: `ccb.setBalanceBandejas(ccb.getBalanceBandejas() - dto.getCantidad())` seguido de
  `clienteRepository.save(cliente)`. Ninguna fila en `historial_bandejas`.
- Línea 97: `ccd.agregarSaldoAFavor(dto.getMontoAcreditar())` seguido de `ccdRepository.save(ccd)`.
  Ninguna fila en `pagos`.

**Por qué eso se traduce en "no se ve nada".** `FacturaClienteServiceImpl.mapearADTO` (líneas
209-300) arma el `FacturaClienteDTO` recorriendo exclusivamente `factura.getVentas()`,
`factura.getPagos()` y `factura.getConceptos()`. `totalPagos` sale de sumar los `Pago` de la
factura; `saldoDeudor = totalVentas + totalConceptos − totalPagos`. Un movimiento que sólo toca
`CuentaCorrienteDinero.balancePesos` es, por construcción, invisible para esa pantalla. El balance
global del cliente cambia, la factura no se entera.

**Del lado de bandejas la pieza ya está esperando.** `frontend/src/pages/FacturaCliente.jsx` línea
160 consume `GET /clientes/{id}/bandejas/historial` y se queda con los movimientos
`tipo === 'DEVOLUCION'`; las líneas 306-330 los filtran por el rango de fechas de la factura y los
restan de las bandejas entregadas para calcular `bandejasAdeudadasEnEstaFactura`. Es decir: la
pantalla ya sabe descontar devoluciones de bandejas — lo único que falta es que la devolución de
producto genere la fila. Por eso el change no toca frontend.

**El patrón correcto ya existe dos veces en el repo.** `BandejasServiceImpl.registrarDevolucion`
(líneas 60-80) crea el `HistorialBandejas` con `tipo = "DEVOLUCION"`, fecha en
`America/Argentina/Buenos_Aires`, cliente y usuario, **y además** descuenta el balance.
`FacturaClienteServiceImpl.registrarPago` (líneas 140-189) crea el `Pago` ligado a la factura **y
además** llama `ccd.agregarSaldoAFavor(...)`. En los dos casos el registro trazable y el balance
acumulado conviven; ninguno reemplaza al otro. La devolución de producto se quedó con la mitad de
abajo y sin la de arriba.

**Contexto de unidad de negocio.** `UnidadNegocioFilter` lee el header `X-Unidad-Negocio` en cada
request y lo deja en `UnidadNegocioContextHolder`; el interceptor de `frontend/src/api/axios.js`
(línea 23) lo inyecta siempre que haya una unidad activa. `DevolucionServiceImpl` hoy no lee ese
contexto para nada — va a tener que hacerlo, porque una `FacturaCliente` se identifica por
`(cliente, estado, unidadNegocio)`.

**Gobernanza.** Esto toca cuenta corriente y facturación: dominio **CRÍTICO** según la política del
proyecto. El objetivo del change es *no* cambiar un solo peso ni una sola bandeja de los balances —
sólo agregar el registro que faltaba. Cualquier diferencia en `balancePesos` o `balanceBandejas`
antes/después es un defecto del change, no un efecto esperado.

## Goals / Non-Goals

**Goals:**

- Que una devolución de producto sobrante deje un `Pago` visible en la factura ABIERTA del cliente,
  con un método que se lea como devolución y no como plata cobrada.
- Que esa misma devolución deje una entrada `DEVOLUCION` en `historial_bandejas`, igual que la
  devolución de bandejas sueltas, para que la pantalla de factura pueda descontarla de las bandejas
  adeudadas sin ningún cambio de frontend.
- Que si el cliente no tiene una factura ABIERTA en el momento de la devolución, se le abra una
  automáticamente con el mismo criterio que ya usa la venta, en vez de fallar.
- Que los valores finales de `CuentaCorrienteDinero.balancePesos` y
  `CuentaCorrienteBandejas.balanceBandejas` queden **idénticos** a los de hoy para la misma
  devolución.

**Non-Goals:**

- **No** se corrige el documento de cuenta corriente de la capability `factura-cliente`
  (`GET /api/clientes/{id}/factura` → `CuentaCorrienteDTO`, servido por `ClienteServiceImpl`). Ahí
  `totalPagado` se calcula sumando los pagos **de las ventas** (`ClienteServiceImpl` línea 182), y
  el `Pago` de la devolución no tiene venta asociada. Para ese documento la devolución va a seguir
  cayendo dentro de `diferenciaNoItemizada`. Ver Open Question 1.
- **No** se toca `BandejasServiceImpl`. La devolución de bandejas sueltas ya funciona bien; se
  replica su patrón, no se modifica su código.
- **No** se toca `FacturaClienteServiceImpl.registrarPago` ni `mapearADTO`. La factura ya sabe
  mostrar y sumar pagos; el problema era que nadie los creaba.
- **No** se cambia el `DevolucionProductoDTO`, ni la firma del endpoint
  `POST /api/devoluciones`, ni sus permisos (`ESCRIBIR_CLIENTES` / `ESCRIBIR_BANDEJAS`).
- **No** se toca frontend.
- **No** se hace backfill de las devoluciones históricas. Ver Migration Plan.

## Decisions

### Decisión 1 — El registro de dinero es un `Pago`, no un `FacturaConcepto`

`mapearADTO` tiene tres colecciones y cada una tiene un signo fijo: `totalVentas` y
`totalConceptos` **suman** al saldo deudor, `totalPagos` **resta**
(`saldo = totalVentas + totalConceptos − totalPagos`, línea 290). Una devolución acredita a favor
del cliente, o sea que resta deuda. La única colección con ese signo es `pagos`.

Alternativa considerada y descartada: un `FacturaConcepto` con `monto` negativo. Funcionaría
aritméticamente pero mete un valor negativo en una tabla cuyos consumidores asumen montos
positivos, y la pantalla lo mostraría en la tabla de "conceptos adicionales" (cargos), donde un
cargo en negativo se lee como un error de carga. Además `Pago` es lo que el usuario ya entiende:
la devolución aparece junto a los otros movimientos que le bajan la deuda.

### Decisión 2 — `metodoPago = "DEVOLUCION"`

`Pago.metodoPago` es un `String` libre (`Pago.java` línea 32, con el comentario
`// EFECTIVO, CHEQUE, TRANSFERENCIA` — es documentación, no una restricción; no hay enum ni
`@Enumerated`). `FacturaCliente.jsx` (líneas 528 y 563) lo renderiza tal cual viene, sin mapeo ni
lista blanca, así que un valor nuevo se muestra correctamente sin tocar frontend.

Se elige `"DEVOLUCION"` — mismo vocabulario que `HistorialBandejas.tipo`, así los dos rastros que
deja la misma operación se llaman igual.

Se descarta `"EFECTIVO"`: sería mentira contable (no entró efectivo) y contaminaría cualquier
reporte que discrimine por método de cobro. Se descarta `"CHEQUE"`: además de ser falso, en
`registrarPago` esa cadena dispara la creación de un `Cheque`
(`"CHEQUE".equalsIgnoreCase(...)`, línea 161) — no está en nuestro camino de código, pero elegir un
valor que en otro lado tiene efectos secundarios es pedirlo. Se descarta convertir `metodoPago` en
un enum: es refactor de todo el sistema de pagos, fuera de alcance de un fix de trazabilidad.

### Decisión 3 — Factura ABIERTA: resolver o abrir, copiando literal el criterio de la venta

`VentaServiceImpl` (líneas ~204-214) ya resuelve esto:

```
facturaClienteRepository
    .findByClienteIdAndEstadoAndUnidadNegocioId(clienteId, "ABIERTA", unidadId)
    .orElseGet(() -> { /* nueva FacturaCliente ABIERTA con fechaApertura = now(Bs As) */ });
```

Se usa exactamente ese criterio, sin variantes. Una devolución puede perfectamente ocurrir cuando
el cliente no tiene factura abierta (devolvió después de que se le cerró el ciclo), y en ese caso
abrir una es lo correcto: es el mismo evento que ya abre factura cuando llega una venta nueva.

Alternativa descartada: lanzar excepción si no hay factura ABIERTA. Rompería una operación que hoy
funciona, y por un motivo puramente administrativo.

Alternativa descartada: colgar el `Pago` sin factura (`factura = null`). El campo lo permite, pero
un pago sin factura es exactamente el problema que estamos arreglando — invisible en la pantalla.

### Decisión 4 — Sin `unidadNegocio` activa, la devolución falla

La factura se identifica por `(cliente, "ABIERTA", unidadNegocio)`. Sin `unidadId` no hay forma de
elegir ni de crear la factura correcta. Las opciones son: (a) saltear el `Pago` y acreditar el
saldo como hoy, o (b) rechazar la operación.

Se elige **(b)**: `UnidadNegocioContextHolder.getUnidadNegocioId() == null` →
`IllegalArgumentException`, antes de tocar ningún balance. La opción (a) reintroduce en silencio la
misma falla que el change viene a cerrar, y encima de forma intermitente, que es peor que un bug
consistente. El riesgo práctico es nulo: el interceptor de axios manda siempre el header cuando hay
unidad activa, y no hay otro cliente de este endpoint.

Es coherente con el precedente de `VentaServiceImpl`, que rechaza la venta de Abono sin cuenta
activa en vez de adivinar.

### Decisión 5 — El `Pago` de la devolución **no** lleva `cuentaAbono`

`registrarPago` setea `pago.setCuentaAbono(CuentaAbonoContextHolder.getCuentaAbono())`. Acá no se
copia eso, a propósito: `PagoRepository.sumarPagosPorCuentaYPeriodo` filtra por `p.cuentaAbono` y
alimenta los ingresos de `RendicionColegaServiceImpl` (líneas 123, 151-152). Una devolución no es
plata que entró a la caja de nadie; sumarla ahí inflaría la rendición del colega o del jefe con un
ingreso que no existió.

Dejarlo en `null` es además el uso documentado del campo: *"Nullable. NULL significa 'no aplica
cuenta' (Vivero, Herramientas, histórico)"* (`Pago.java` línea 27). La devolución de producto es un
flujo de Vivero.

### Decisión 6 — El `HistorialBandejas` se crea con `venta = null` y `tipo = "DEVOLUCION"`

Idéntico a `BandejasServiceImpl.registrarDevolucion`: cliente, cantidad, tipo, fecha en
`America/Argentina/Buenos_Aires`, usuario. El campo `venta` queda en `null`, que es su semántica
documentada (`HistorialBandejas.java` línea 22: *"Puede ser nulo si es una devolución suelta"*) — la
devolución de producto tampoco proviene de una venta puntual.

El `Usuario` no hay que ir a buscarlo: `registrarDevolucionLlenas` ya lo resuelve desde el
`SecurityContext` en las líneas 65-67 para el `MovimientoStock`. Se reutiliza esa misma instancia.

El filtro del frontend es por `tipo === 'DEVOLUCION'` y por rango de fechas de la factura, nada más
—así que la entrada aparece y descuenta bandejas sin ningún cambio en `FacturaCliente.jsx`.

### Decisión 7 — La matemática de balances no se toca; sólo se agregan registros

`registrarDevolucionLlenas` muta `cliente.getCuentaCorrienteBandejas()` y persiste con
`clienteRepository.save(cliente)`, mientras que `BandejasServiceImpl` usa `ccbRepository`
directamente. **No se unifica.** Se replica el `HistorialBandejas` de `BandejasServiceImpl`, no su
mecanismo de persistencia del balance: cambiar el camino de escritura del balance es justamente el
tipo de cambio que podría alterar valores, y este change se define por no alterarlos. Lo mismo del
lado del dinero: `ccd.agregarSaldoAFavor(...)` + `ccdRepository.save(ccd)` quedan literalmente como
están, y el `Pago` se agrega al lado.

Corolario para los tests: los valores finales de `balancePesos` y `balanceBandejas` para una
devolución dada tienen que ser exactamente los mismos antes y después del change. Eso se verifica
explícitamente, no se asume.

### Decisión 8 — Guardas: el registro se crea sólo si hay algo que registrar

- El `Pago` se crea únicamente dentro del `if` que ya existe
  (`montoAcreditar != null && montoAcreditar > 0`, línea 88). Una devolución sin monto a acreditar
  no genera un pago de $0, que sería ruido en la factura.
- El `HistorialBandejas` se crea sólo si `cantidad != null && cantidad > 0`, mismo criterio de
  entrada que `BandejasServiceImpl.registrarDevolucion`. El descuento de balance de la línea 84
  queda como está (Decisión 7).

### Decisión 9 — Todo dentro de la transacción que ya existe

El método ya es `@Transactional`. Las escrituras nuevas van adentro, sin `REQUIRES_NEW` ni flush
intermedio, y **después** de las mutaciones de balance, de modo que o queda todo (producto,
movimiento de stock, balances, `Pago`, `HistorialBandejas`) o no queda nada. Una devolución que
mueva el saldo y falle al escribir el rastro sería el bug original otra vez, esta vez de forma
esporádica.

### Decisión 10 — Las delta specs van a `devolucion-repique-bandejas` y `facturacion-cliente`

`proposal.md` nombra `factura-cliente` como capability modificada. Verificado contra el repo, hay
dos capabilities con nombres casi iguales y son cosas distintas:

| Capability | Endpoint | Servicio | DTO |
|---|---|---|---|
| `facturacion-cliente` | sección Facturación / factura activa | `FacturaClienteServiceImpl` | `FacturaClienteDTO` (`pagos`, `conceptos`, `totalPagos`, `saldoDeudor`) |
| `factura-cliente` | `GET /api/clientes/{id}/factura` | `ClienteServiceImpl` | `CuentaCorrienteDTO` (`totalPagado`, `saldoSegunVentas`, `diferenciaNoItemizada`) |

La pantalla que el dueño reportó — la que arma su contenido con ventas, pagos y conceptos de la
factura — es la primera. Por eso la delta spec de la parte de dinero se escribe en
`specs/facturacion-cliente/spec.md`, y `proposal.md` se corrige en consecuencia. La segunda queda
como Non-Goal declarado y como Open Question 1.

## Risks / Trade-offs

- **[El `Pago` de la devolución aparece en el Historial de Cobros de Abono]** → La query de
  `PagoRepository` que alimenta ese historial hace `LEFT JOIN p.factura f` con
  `uf.id = :unidadId` justamente para incluir los pagos directos a factura, así que un `Pago` de
  devolución hecho bajo la unidad Abono se listaría ahí. No afecta ningún total (la suma de
  ingresos filtra por `cuentaAbono`, que dejamos en `null` — Decisión 5), sólo el listado. En la
  práctica la devolución de producto sobrante es un flujo de Vivero. Se verifica en los tests que
  el total de la rendición no se mueve; si el listado molesta, se filtra por `metodoPago` en un
  change aparte.

- **[Abrir factura automáticamente crea filas nuevas en `facturas_cliente`]** → Es el mismo
  comportamiento que ya tiene la venta desde `us-013`, con el mismo criterio y el mismo estado
  inicial. El riesgo real sería abrir una factura *duplicada*: lo previene el
  `findByClienteIdAndEstadoAndUnidadNegocioId` que se ejecuta primero, igual que en la venta.

- **[`metodoPago = "DEVOLUCION"` es un valor nuevo en una columna de texto libre]** → Verificado
  que no hay comparación por igualdad contra `metodoPago` en backend fuera de la rama `"CHEQUE"` de
  `registrarPago` (que no está en este camino), y que el frontend lo renderiza tal cual. El costo de
  equivocarse es cosmético, no contable.

- **[Las devoluciones ya registradas siguen sin rastro]** → Las filas históricas de
  `cuentas_corrientes_dinero` / `cuentas_corrientes_bandejas` no guardan de dónde vino cada
  movimiento, así que no hay forma de reconstruirlas. Ver Migration Plan.

- **[La cuenta corriente y la factura pueden divergir para un mismo cliente]** → Tras el change, la
  devolución baja la deuda en la factura *y* sube el saldo a favor en la cuenta corriente, igual que
  hace hoy cualquier pago registrado con `registrarPago`. Es la convención vigente del sistema, no
  una doble contabilización introducida acá. Punto explícito de checkpoint con el usuario antes de
  escribir el código.

## Migration Plan

1. Sin migración de esquema. No hay entidades ni columnas nuevas: se usan `pagos`,
   `facturas_cliente` e `historial_bandejas` tal como están.
2. Antes de tocar código, tomar línea de base en la base real: `balancePesos` y `balanceBandejas` de
   un cliente de prueba, y la cantidad de filas en `pagos` e `historial_bandejas`. Es la evidencia
   contra la que se verifica que los balances no se movieron.
3. Sin backfill de devoluciones históricas: no existe el dato de origen. Las devoluciones anteriores
   al change quedan absorbidas en el balance acumulado, exactamente como están hoy. Si el dueño
   necesita corregir alguna puntual, el camino es el ajuste manual de cuenta corriente que ya existe.
4. Rollback: revertir el commit. Como no hay cambio de esquema, las filas de `pagos` e
   `historial_bandejas` creadas mientras el change estuvo activo sobreviven al revert y siguen
   siendo válidas — quedan como pagos y movimientos de bandejas legítimos, no como datos huérfanos.

## Open Questions

1. **El documento de cuenta corriente (`factura-cliente`) queda sin arreglar.** Su `totalPagado`
   suma sólo los pagos que cuelgan de una venta (`ClienteServiceImpl` línea 182), y el `Pago` de la
   devolución no tiene venta. O sea que en ese documento la devolución va a seguir apareciendo
   dentro de `diferenciaNoItemizada` ("otros movimientos de cuenta corriente"), no desglosada.
   ¿Alcanza con arreglar la pantalla de Facturación (que es la que el dueño reportó), o hay que
   incluir también los pagos directos a factura en ese documento? Lo segundo es un change aparte:
   toca `ClienteServiceImpl` y el cálculo de `saldoSegunVentas`. **Decidir antes de dar el change
   por cerrado.**

2. **¿La devolución tiene que quedar imputada a la factura ABIERTA aunque el producto se haya
   vendido en una factura ya CERRADA?** La Decisión 3 dice que sí (siempre a la abierta), que es lo
   que hace hoy el resto del sistema. La alternativa —buscar la factura donde se vendió— no tiene
   soporte en el modelo: `DevolucionProductoDTO` no trae la venta de origen. Se asume el criterio
   simple; confirmar con el usuario que es lo que espera.

3. **¿Se muestra algo distinto en la UI para un pago con `metodoPago = "DEVOLUCION"`?** El change
   asume que no: se lista como un pago más, con la palabra "DEVOLUCION" en la columna de método. Si
   el dueño quiere un ícono o un color propio, es un ajuste de frontend posterior que no bloquea
   nada de esto.
