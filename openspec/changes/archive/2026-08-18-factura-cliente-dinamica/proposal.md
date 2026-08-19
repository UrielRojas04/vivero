## Why

Hoy el sistema sabe emitir el comprobante de **una** venta (`ComprobanteVentaModal.jsx`, capability `remitos-pdf`), pero no sabe responder la pregunta que el jefe hace todos los días: *"¿cuánto se llevó este cliente en total, cuánto me fue pagando y cuánto me falta cobrarle?"*. En el vivero el cliente compra varias veces, a veces no retira todo el lote de una vez, queda debiendo, vuelve y compra de nuevo, y la deuda se acumula a lo largo de varias ventas separadas. Con las herramientas actuales el jefe tiene que abrir el Historial de Ventas, filtrar a mano por el nombre del cliente, abrir un comprobante por venta y sumar mentalmente.

El único dato consolidado que existe es `CuentaCorrienteDinero.balancePesos`: un número suelto, sin detalle de qué lo compone. Sirve para saber *cuánto* debe, no *por qué* debe. Falta el documento intermedio: una **factura dinámica** —una cuenta corriente itemizada por cliente— que liste todo lo que el cliente se llevó, todo lo que fue pagando y el saldo pendiente, y que se pueda descargar o mandar por WhatsApp igual que el remito de una venta.

## What Changes

- **Nueva capability `factura-cliente`**: documento consolidado por cliente que agrega el historial completo de ventas de ese cliente (ítems de cada venta, pagos de cada venta, totales) y lo contrasta contra el saldo real de su cuenta corriente.
- **Backend — nuevo endpoint `GET /api/clientes/{id}/factura`** (protegido por `LEER_CLIENTES`), que devuelve un `FacturaClienteDTO` con: datos del cliente, la lista de sus ventas (reutilizando `VentaResponseDTO`, con `detalles[]` y `pagos[]`), los totales agregados (`totalVentas`, `totalPagado`, `saldoSegunVentas`), el `balanceDinero` autoritativo de la cuenta corriente y la `diferenciaNoItemizada` entre ambos.
- **Backend — nuevo método de repositorio `findByClienteIdAndUnidadNegocioIdOrderByFechaDesc`** en `VentaRepository`. Cierra el hueco actual: hoy no existe ninguna forma de traer las ventas de un cliente por ID (`VentaResponseDTO` ni siquiera expone `clienteId`, y `listarVentas()` devuelve todo sin filtros).
- **Frontend — nuevo componente `FacturaClienteModal.jsx`**: vista previa del documento con cabecera del cliente, una sección por venta (fecha, ítems, total), el detalle de pagos, el resumen final (total comprado / total pagado / saldo pendiente) y exportación a PDF (`jspdf`) e imagen (`html-to-image`) más envío por WhatsApp, siguiendo el mismo patrón ya probado en `ComprobanteVentaModal.jsx`.
- **Frontend — nueva acción "Ver Factura"** en `Clientes.jsx` (tarjeta mobile y fila de tabla desktop), junto al botón de "Ajustar Saldo" que ya existe ahí.
- **Línea de conciliación explícita**: cuando el saldo de la cuenta corriente no coincide con lo que suman las ventas y pagos itemizados (porque hubo ajustes manuales de saldo, cheques sueltos o ventas dadas de baja), el documento lo declara en una línea aparte en vez de mostrar un total que no cierra sin explicación.
- **Fuera de alcance declarado**: no se agrega libro de movimientos de cuenta corriente (ver Decisión 4 de `design.md`, con pregunta abierta pendiente de confirmación), no se genera PDF en el backend, no se persiste ningún archivo, y no es un comprobante fiscal (el proyecto no integra AFIP — ver `knowledge-base/01_vision_y_objetivos.md`).

## Capabilities

### New Capabilities
- `factura-cliente`: cuenta corriente itemizada por cliente ("factura dinámica"): consulta agregada de todas las ventas, ítems y pagos de un cliente, conciliación contra el saldo de cuenta corriente, y exportación del documento a PDF, imagen y WhatsApp.

### Modified Capabilities
- `ajustes-cuenta-cte`: la spec vigente documenta la convención de signo al revés de como está implementada (dice que un ajuste positivo aumenta la deuda, cuando en `ClienteServiceImpl.ajustarSaldo` el monto se **suma** al balance y en `saldoDisplay.js` un balance negativo es deuda). Este change renderiza ese saldo dentro de un documento que se le entrega al cliente, así que la convención queda corregida en la spec y se declara explícitamente que el ajuste manual no deja registro itemizado.

## Impact

**Backend** (`backend/src/main/java/com/vivero/gestion/`):
- `dto/FacturaClienteDTO.java` — nuevo.
- `repositories/VentaRepository.java` — nuevo método de consulta por cliente.
- `services/ClienteService.java` + `services/impl/ClienteServiceImpl.java` — nuevo método `obtenerFactura(Long id)`; pasa a depender de `VentaRepository`.
- `controllers/ClienteController.java` — nuevo endpoint `GET /{id}/factura`.
- Sin migración de base de datos: no se crean ni modifican entidades ni columnas.

**Frontend** (`frontend/src/`):
- `components/FacturaClienteModal.jsx` — nuevo.
- `api/clientes.api.js` — nuevo método `obtenerFactura(id)`.
- `pages/Clientes.jsx` — nuevo botón y estado de modal.
- Sin dependencias nuevas: `jspdf` y `html-to-image` ya están instaladas por `us-016-remitos-pdf`.

**Permisos / RBAC**: el endpoint queda bajo `LEER_CLIENTES`, permiso que hoy sólo tiene el rol `JEFE` (`DataInitializer`). El rol `EMPLEADO_VIVERO` no lo tiene y por lo tanto no verá la factura, lo cual es consistente con el pedido ("el jefe quiere tener una factura de ese cliente") y con que ya no puede acceder a la pantalla de Clientes.

**Riesgo**: es una vista de solo lectura sobre dinero y deuda de clientes. No muta saldos ni ventas. El riesgo real no es de corrupción de datos sino de **mostrar un número equivocado en un papel que se le entrega al cliente**, y por eso la conciliación es parte del alcance y no un detalle cosmético.
