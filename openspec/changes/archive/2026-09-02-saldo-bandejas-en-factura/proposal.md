## Why

La factura del cliente (`FacturaCliente.jsx`) es el documento que se le entrega al cliente: se ve en pantalla y se exporta como imagen para mandársela. Hoy declara únicamente la deuda en dinero (ventas, conceptos, pagos, saldo deudor), pero en Vivero el cliente además tiene una deuda física de bandejas (envases retornables) que hoy sólo es visible desde el listado de clientes. El resultado es que el documento que el cliente recibe no dice cuántas bandejas debe devolver, y el encargado tiene que abrir otra pantalla para reclamarlas.

Las bandejas no existen como concepto en Herramientas ni en Abono, así que el dato debe aparecer **sólo en la unidad de negocio Vivero**.

## What Changes

- **Backend** — `FacturaClienteDTO` gana un campo nuevo `saldoBandejas` (entero, sólo lectura), mapeado en `FacturaClienteServiceImpl.mapearADTO(...)` desde `cliente.getCuentaCorrienteBandejas().getBalanceBandejas()` con el mismo tratamiento null-safe que ya usa `ClienteServiceImpl` (ausencia de cuenta corriente de bandejas ⇒ `0`).
- **Backend** — No se crea ningún endpoint nuevo: `mapearADTO` ya tiene el `Cliente` completo cargado dentro de la transacción, y todos los endpoints de `/api/facturas` pasan por ese mismo mapeo.
- **Frontend** — La cabecera de la factura muestra el saldo de bandejas del cliente como chip, con la misma semántica de color ya establecida para este dato en el listado de clientes (`bg-warn-bg text-warn-ink` cuando debe bandejas, `bg-thead text-body` cuando está en cero).
- **Frontend** — El chip se renderiza **sólo** cuando la unidad de negocio activa es Vivero (`unidadNegocioActiva === '1'`), replicando el gating que `Clientes.jsx` ya aplica sobre este mismo dato.
- **Frontend** — El chip se renderiza **sólo en la factura activa**, no en las facturas cerradas del historial: el saldo de bandejas es un saldo vigente, no una foto histórica de la factura.
- El chip queda dentro del nodo que se exporta a imagen, de modo que el dato viaja en la imagen que se le manda al cliente. No se toca la lógica de captura (`capturarNodoComoImagen` / `esperarProximoFrame`) ni la fila de indicadores de resumen (que está oculta durante la exportación).
- Sin cambios de esquema, sin migraciones, sin escritura de datos. **No hay breaking changes.**

## Capabilities

### New Capabilities

Ninguna. El saldo de bandejas ya existe como capacidad (`flujo-bandejas`, `acceso-bandejas`); este change sólo lo transporta y lo muestra en un documento que ya existe.

### Modified Capabilities

- `facturacion-cliente`: el documento de factura del cliente pasa a declarar, además del saldo en dinero, el saldo de bandejas del cliente, acotado a la unidad de negocio Vivero y a la factura activa. Agrega un requisito de transporte del dato en el DTO y un requisito de presentación en la pantalla.

Capacidades explícitamente **no** modificadas:
- `flujo-bandejas` y `acceso-bandejas`: el circuito de bandejas (registro de entregas/devoluciones, permisos, pantalla dedicada) no cambia. Este change es consumo de sólo lectura de un saldo que esas capacidades ya mantienen.
- `facturacion-ciclos`: apertura, cierre y conceptos de la factura no cambian.

## Impact

**Código afectado**

| Archivo | Cambio |
|---|---|
| `backend/src/main/java/com/vivero/gestion/dto/FacturaClienteDTO.java` | Campo `Integer saldoBandejas` + getter/setter |
| `backend/src/main/java/com/vivero/gestion/services/impl/FacturaClienteServiceImpl.java` | Una línea de mapeo null-safe en `mapearADTO(...)` |
| `frontend/src/pages/FacturaCliente.jsx` | Chip de saldo de bandejas en la cabecera de `renderFacturaCompleta(...)` |

**Zonas de riesgo declaradas como intocables**
- `capturarNodoComoImagen` y `esperarProximoFrame` en `FacturaCliente.jsx`: lógica de clonado/captura ya blindada en changes anteriores. No se modifica ni una línea ni un comentario.
- La fila de indicadores de resumen (`{!isExporting && (...)}`) mantiene su comportamiento actual: el saldo de bandejas **no** se agrega ahí, precisamente porque esa fila desaparece en la exportación.

**API**: `FacturaClienteDTO` gana un campo. Es aditivo; ningún consumidor existente se rompe.

**Datos**: ninguno. No hay columnas nuevas, no hay migración, no se escribe nada.

**Gobernanza: LOW.** Es un campo de sólo lectura agregado a una pantalla existente. No toca cálculo de dinero, no toca escritura de datos, no toca autenticación ni permisos. Se implementa con autonomía y se reporta en el resumen.
