## Why

Hoy, para descontar stock cuando un cliente se lleva mercadería, la única puerta es "Nueva Venta" — que exige precio, forma de pago y cierra la venta ahí mismo. En la práctica del vivero, muchas veces un empleado (sin permiso ni criterio para fijar precio final, descuentos, etc.) es quien atiende al cliente y le entrega los productos, y es el dueño quien más tarde decide el precio real de esa entrega y la cobra. Hoy no hay forma de que el empleado registre "esto salió" sin, de paso, tener que decidir el precio y cerrar una venta — así que ese control queda fuera del sistema (se anota en un papel, o se descuenta stock a mano después).

El dueño pide una sección nueva, exclusiva de Vivero, donde el empleado registre que un cliente se llevó determinados productos — eso descuenta stock al instante, pero **no** genera una venta ni fija ningún precio. Esa entrega queda pendiente de revisión: aparece en el Dashboard del dueño como una tarjeta, y recién cuando él la confirma (poniéndole precio a cada línea, igual que ya puede editar el precio al cerrar una venta) es que se convierte en una Venta real, con su pago y su reflejo en la factura del cliente — nunca antes.

Además, el dueño pregunta si es técnicamente posible que, al registrar la entrega, el empleado le haga firmar al cliente en la pantalla del celular (firma digital), como constancia de que se llevó la mercadería. Es técnicamente viable sin ninguna librería paga: un `<canvas>` HTML5 estándar captura el trazo del dedo/mouse y se guarda como imagen — no hace falta ningún servicio externo ni licencia. Se incluye en el alcance de este change.

## What Changes

- Nueva entidad **Entrega Pendiente**: cliente, una o más líneas (producto + cantidad, sin precio ni descuento), fecha, quién la registró (empleado autenticado), estado (`PENDIENTE` / `CONFIRMADA` / `RECHAZADA`) y la firma digital del cliente (imagen).
- Al registrar la entrega, el stock de cada producto se descuenta **inmediatamente** — el cliente ya se llevó la mercadería, el stock tiene que reflejarlo ya, aunque todavía no haya venta ni precio. Queda un registro trazable (no es un ajuste manual invisible).
- Pantalla nueva, exclusiva de Vivero, para que el empleado busque cliente + productos (reutilizando los mismos buscadores que ya existen en Nueva Venta) y registre la entrega — con la firma digital del cliente capturada en el momento, en su propio celular.
- Permisos nuevos y acotados (`LEER_ENTREGAS` / `ESCRIBIR_ENTREGAS`), separados de `ESCRIBIR_VENTAS`: un empleado puede tener acceso a registrar entregas sin por eso poder cerrar ventas, editar precios ni ver plata.
- Dashboard del dueño: tarjeta(s) nueva(s) listando las entregas pendientes de confirmar (mismo espíritu que la lista de "Productos Disponibles" que ya existe ahí), con acceso a la firma capturada como constancia.
- Confirmación por el dueño: para cada entrega pendiente, le asigna un precio por unidad a cada línea (mismo mecanismo ya construido en `precio-editable-confirmacion-venta` — precio editable, recalculo automático del total) y confirma. En ese momento, y **sólo** en ese momento:
  - Se crea la Venta real, con sus detalles y su pago.
  - Se marca la entrega como `CONFIRMADA`, vinculada a esa venta.
  - Recién ahí aparece en el historial de ventas y en la factura/cuenta corriente del cliente.
- El dueño también puede **rechazar** una entrega (carga errónea, cliente que no vino, etc.) — a definir en design.md si eso repone el stock automáticamente o requiere un ajuste manual aparte.
- El stock ya descontado al registrar la entrega **no se vuelve a descontar** al confirmar la venta — la confirmación sólo le pone precio y la convierte en venta, el movimiento de stock real ya ocurrió antes.

## Capabilities

### New Capabilities
- `entregas-pendientes-vivero`: registro de entregas de mercadería sin venta ni precio, con descuento de stock inmediato, firma digital del cliente, y confirmación posterior por el dueño que recién ahí genera la venta real.

### Modified Capabilities
(ninguna directamente — se reutiliza el mecanismo de precio editable de `precio-editable-confirmacion-venta` tal cual está, sin modificarlo)

## Impact

- Backend: nueva entidad/tabla (`EntregaPendiente` + `EntregaPendienteDetalle`), nuevo repositorio y servicio, nuevos endpoints (crear entrega, listar pendientes, obtener una con su firma, confirmar con precios, rechazar), nuevos permisos (`LEER_ENTREGAS`/`ESCRIBIR_ENTREGAS`), y la lógica de "convertir en Venta al confirmar" reutilizando lo más posible de `VentaServiceImpl` (sin duplicar la fórmula de precio/subtotal ya construida ahí).
- Frontend: pantalla nueva de registro para empleados (con captura de firma vía `<canvas>`, sin librerías nuevas), tarjeta(s) nueva(s) en el Dashboard del dueño, y un flujo de confirmación que reutiliza el editor de precio por línea ya existente en el modal de "Liquidar Venta".
- Exclusivo de Vivero — no aplica a Herramientas ni Abono (mismo criterio de "sólo mostrarse en el negocio Vivero" ya aplicado a Siembras/Registro de Semillas/Devoluciones).
- Sin impacto en el modelo de `Venta`/`VentaDetalle` existente — la entrega pendiente es una entidad previa, separada, que recién al confirmarse dispara la creación de una Venta con el mecanismo que ya existe hoy.
