## ADDED Requirements

### Requirement: Autorización de los Endpoints de Factura por Cliente
Todos los endpoints bajo `/api/facturas` SHALL exigir el permiso `LEER_FACTURACION`. Además del permiso base:

- los endpoints de **lectura** (`GET /api/facturas/cliente/{clienteId}/activa`, `GET /api/facturas/cliente/{clienteId}/historial`) SHALL exigir también `LEER_CLIENTES`;
- los endpoints de **escritura** (`POST /cliente/{clienteId}/abrir`, `POST /{facturaId}/conceptos`, `POST /{facturaId}/pagos`, `POST /{facturaId}/cerrar`, `PUT /pagos/{pagoId}/rechazar`) SHALL exigir también `ESCRIBIR_VENTAS`.

La condición MUST ser conjuntiva (AND) en todos los casos: `ESCRIBIR_VENTAS` por sí solo ya no otorga acceso a ningún endpoint de factura.

#### Scenario: Lectura autorizada
- **WHEN** un usuario con `LEER_FACTURACION` y `LEER_CLIENTES` pide `GET /api/facturas/cliente/3/activa`
- **THEN** el backend responde 200 con la factura activa (o 204 si no hay ninguna)

#### Scenario: Lectura rechazada por falta del permiso nuevo
- **WHEN** un usuario con `ESCRIBIR_VENTAS` y `LEER_CLIENTES` pero sin `LEER_FACTURACION` pide `GET /api/facturas/cliente/3/historial`
- **THEN** el backend responde 403 Forbidden y no devuelve ningún dato de factura

#### Scenario: Escritura rechazada por falta del permiso nuevo
- **WHEN** un usuario con `ESCRIBIR_VENTAS` pero sin `LEER_FACTURACION` hace `POST /api/facturas/12/pagos`
- **THEN** el backend responde 403 Forbidden y no registra el pago

#### Scenario: Usuario de sólo lectura no puede mutar la factura
- **WHEN** un usuario con `LEER_FACTURACION` y `LEER_CLIENTES` pero sin `ESCRIBIR_VENTAS` hace `POST /api/facturas/12/cerrar`
- **THEN** el backend responde 403 Forbidden y la factura permanece abierta

#### Scenario: El rol JEFE conserva acceso completo
- **WHEN** un usuario con el rol `JEFE` (que posee todos los permisos del enum) opera sobre cualquier endpoint de `/api/facturas`
- **THEN** el backend autoriza la operación exactamente como antes del cambio

### Requirement: Desacople de Facturación respecto de Ventas
El acceso a la sección Facturación MUST NOT derivarse de la combinación `ESCRIBIR_VENTAS` + `LEER_CLIENTES`. La carga de ventas y la consulta de facturación SHALL ser dos accesos otorgables por separado.

#### Scenario: Empleado de ventas sin visibilidad financiera
- **WHEN** un empleado con rol de ventas (`ESCRIBIR_VENTAS`, `LEER_STOCK`, `LEER_CLIENTES`, sin `LEER_FACTURACION`) inicia sesión y carga una venta a cuenta corriente
- **THEN** la venta se registra normalmente y se imputa a la factura activa del cliente, pero el empleado no puede abrir la sección Facturación ni consultar saldos, pagos o historial de facturas por API

#### Scenario: Administrativo con visibilidad financiera sin carga de ventas
- **WHEN** un usuario administrativo con `LEER_FACTURACION` y `LEER_CLIENTES` inicia sesión
- **THEN** ve el item "Facturación" en el menú y puede consultar la factura activa y el historial de cualquier cliente, sin poder cargar ventas ni registrar pagos
