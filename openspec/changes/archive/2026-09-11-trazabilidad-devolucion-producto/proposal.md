## Why

Cuando un empleado registra la devolución de un producto sobrante (sección Devoluciones, pestaña
de productos), el sistema acredita el monto correspondiente y repone la bandeja en el saldo del
cliente — pero lo hace tocando directamente los campos de saldo global (`CuentaCorrienteDinero.
balancePesos`, `CuentaCorrienteBandejas.balanceBandejas`), sin dejar ningún registro trazable. La
pantalla de "Facturas" arma todo lo que muestra a partir de `Venta`, `Pago` y `FacturaConcepto`
ligados a la factura abierta del cliente — como la devolución no crea ninguno de esos tres, el
saldo del cliente cambia mientras la factura sigue mostrando exactamente lo mismo que antes. Lo
mismo pasa con el historial de bandejas (`HistorialBandejas`): la devolución de bandejas "sueltas"
(sin producto) ya crea una entrada ahí (`BandejasServiceImpl.registrarDevolucion`), pero la
devolución de producto sobrante -- que también repone una bandeja -- no lo hace, así que esa
bandeja repuesta queda igual de invisible en el historial.

El dueño lo detectó directamente probando el sistema en producción: "en las facturas no se ve
cuando un cliente hace la devolución de un producto" y "la deuda de bandejas de la factura tampoco
contempla que al devolver productos también se están devolviendo bandejas".

## What Changes

- `DevolucionServiceImpl.registrarDevolucionLlenas` deja de acreditar el saldo en pesos de forma
  ciega: crea un `Pago` (mismo mecanismo que ya usa `registrarPago` en `FacturaClienteServiceImpl`)
  ligado a la factura ABIERTA del cliente, con un método/descr¡pción que lo identifique como
  devolución -- así aparece en la lista de pagos de la factura y resta del saldo deudor como
  corresponde. Si el cliente no tiene una factura ABIERTA en el momento de la devolución, se abre
  una automáticamente (mismo criterio que ya existe para adjuntar una venta a una factura).
- La misma llamada también crea una entrada en `HistorialBandejas` (tipo `DEVOLUCION`), igual que
  ya hace `BandejasServiceImpl.registrarDevolucion` para la devolución de bandejas sueltas -- para
  que la bandeja repuesta por una devolución de producto aparezca en el mismo historial que
  cualquier otra devolución de bandeja.
- Sin cambios de comportamiento en la devolución de bandejas sueltas (`BandejasServiceImpl`), que
  ya hace esto bien -- se reutiliza su mismo patrón, no se toca su código.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `devolucion-repique-bandejas`: la devolución de producto sobrante ahora deja un `Pago` trazable
  en la factura del cliente y una entrada en el historial de bandejas, en vez de acreditar saldos
  globales sin registro.
- `facturacion-cliente`: la factura de un cliente refleja las devoluciones de producto como parte
  de su historial de pagos, no sólo como un saldo que cambió sin explicación visible. (Es la
  capability de la sección Facturación, servida por `FacturaClienteServiceImpl` → `FacturaClienteDTO`.
  La capability homónima `factura-cliente` es otra cosa: el documento de cuenta corriente de
  `GET /api/clientes/{id}/factura` → `CuentaCorrienteDTO`, y queda explícitamente fuera de alcance —
  ver Non-Goals y Open Question 1 de `design.md`.)

## Impact

- Backend: `DevolucionServiceImpl.java` (la única lógica que cambia), reutiliza `Pago`,
  `FacturaCliente`, `HistorialBandejas` y sus repositorios ya existentes -- ninguna entidad ni
  tabla nueva.
- Frontend: sin cambios necesarios -- la lista de pagos y el historial de bandejas ya se muestran
  donde corresponde, sólo faltaba que el backend generara los registros.
- Alcance acotado a la devolución de PRODUCTO (`registrarDevolucionLlenas`); la devolución de
  bandejas sueltas ya funciona bien y no se toca.
