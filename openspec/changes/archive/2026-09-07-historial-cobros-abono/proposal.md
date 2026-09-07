## Why

En Abono, los cobros hoy quedan repartidos entre varias pantallas y ninguna los junta en un solo lugar: el pago inicial de una venta se ve en el historial de esa venta puntual, un pago posterior sobre una cuenta corriente se ve en `CuentaCorrienteCliente.jsx`, y un pago directo a una factura se ve en `FacturaCliente.jsx`. No hay ninguna vista que junte TODOS los cobros de Abono — de ambas cuentas (JEFE/COLEGA) — para responder de un vistazo "¿cuánto se cobró, quién lo cobró, y de qué venta salió?". El dueño necesita ese historial global para poder auditar la caja de Abono sin tener que ir venta por venta ni cliente por cliente.

## What Changes

- Nuevo endpoint de sólo lectura que lista TODOS los pagos (`Pago`) de la unidad Abono, sin filtrar por `CuentaAbono` — a diferencia de cómo Ventas/Stock siguen particionados hoy, este historial es deliberadamente GLOBAL (mismo criterio que ya se aplicó en el change `clientes-compartidos-abono`: la partición JEFE/COLEGA sigue existiendo donde corresponde, pero las vistas de auditoría/reporte muestran todo junto).
- Cada fila del historial expone: fecha, monto, método de pago, **quién lo cobró** y **de qué venta/factura salió**.
  - "Quién lo cobró": no existe un campo `usuario` en `Pago` hoy, sólo `cuentaAbono` (JEFE/COLEGA). Dado que `CuentaAbonoFilter` ya mapea de forma unívoca `JEFE` → Sergio y `COLEGA` → Pablo (confirmado en el change anterior), se resuelve el nombre a partir de `cuentaAbono` sin agregar un campo nuevo. Pagos históricos con `cuentaAbono` nulo (de antes de que ese campo existiera, o de Vivero/Herramientas si el endpoint se reutilizara mal) se muestran como "Sin cuenta asignada" en vez de fallar.
  - "De qué venta": todo `Pago` está ligado a una `Venta` o a una `FacturaCliente` (nunca a ninguna, confirmado revisando los 3 puntos donde se crea un `Pago` hoy). Si viene de una venta, se muestra el cliente y la fecha de esa venta; si viene de un pago directo a una factura (sin venta puntual detrás), se muestra "Pago a cuenta corriente" con el cliente de la factura.
- Nueva pantalla en Abono (ruta nueva, análoga a `/abono/produccion` y `/abono/rendiciones`) con el listado, buscador por cliente y filtro por período — mismo patrón visual que el resto de las pantallas de Abono (tarjetas en mobile, tabla en desktop).
- No se toca la partición por `CuentaAbono` de Ventas, Stock ni Rendición de Colega — se mantienen exactamente como están. Tampoco se agrega un campo `usuario` a `Pago`: se resuelve "quién cobró" a partir de `cuentaAbono`, evitando una migración y una atribución redundante con un dato que ya existe.

## Capabilities

### New Capabilities
- `historial-cobros-abono`: listado global (ambas cuentas) de todos los pagos registrados en Abono, con quién cobró y de qué venta/factura salió cada uno.

### Modified Capabilities
(ninguna — no cambia el comportamiento de ventas, facturación ni cuentas corrientes, sólo agrega una vista de lectura sobre datos que ya existen)

## Impact

- Backend: nuevo endpoint (ej. `GET /api/pagos/abono/historial`, paginado, filtrable por rango de fechas), nuevo método en `PagoRepository` para traer pagos de Abono con `venta`/`factura`/clientes ya cargados (evitar N+1), y un DTO de respuesta enriquecido (no reutilizar `PagoResponseDTO` tal cual: éste no expone cliente ni "quién cobró" — hace falta uno nuevo o extenderlo, a decidir en design.md). Permiso: reutilizar `LEER_FINANZAS` (ya existe, ya protege Cheques y Finanzas) en vez de crear uno nuevo.
- Frontend: nueva página bajo `/abono/cobros` (o el nombre de ruta que se defina en design.md), agregada al menú de Abono.
- Sin impacto en `VentaServiceImpl`, `FacturaClienteServiceImpl` ni en el modelo `Pago` — es 100% lectura sobre datos ya persistidos.
