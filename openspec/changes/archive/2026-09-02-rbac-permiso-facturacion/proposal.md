## Why

Hoy la sección **Facturación** (`/facturas`, facturación por cliente) no tiene permiso propio: se habilita con la combinación `ESCRIBIR_VENTAS` + `LEER_CLIENTES`, que son permisos que cualquier empleado de ventas necesita para su trabajo normal. Eso hace **imposible** — incluso editando la base a mano — darle Ventas a alguien sin darle también Facturación, o darle Facturación a alguien de administración sin habilitarle además la carga de ventas. Como Facturación expone saldos, pagos, cuenta corriente y el historial financiero del cliente, el jefe necesita poder decidir quién la ve, con independencia de quién carga ventas.

No es sólo que falte una etiqueta en el modal de roles: es un **acoplamiento real de permisos** en el modelo RBAC.

## What Changes

- **Nuevo permiso `LEER_FACTURACION`** en `PermisoEnum` (id estable `17L`, agregado al final del enum como manda la convención del archivo). Es el permiso que gatea la sección Facturación de forma independiente de `ESCRIBIR_VENTAS`.
- **Backend — `FacturaClienteController`**: se reescriben las 7 anotaciones `@PreAuthorize` para que TODAS exijan `LEER_FACTURACION`:
  - lectura (`/cliente/{id}/activa`, `/cliente/{id}/historial`) → `LEER_FACTURACION` **y** `LEER_CLIENTES`
  - escritura (`abrir`, `conceptos`, `pagos`, `cerrar`, `pagos/{id}/rechazar`) → `LEER_FACTURACION` **y** `ESCRIBIR_VENTAS`
  - **BREAKING (a propósito)**: la regla vieja era `ESCRIBIR_VENTAS or LEER_CLIENTES`; pasa a ser una conjunción con el permiso nuevo. Un usuario que hoy entra a Facturación deja de entrar hasta que el jefe le asigne `LEER_FACTURACION`.
- **Frontend — nuevo grupo "Facturación"** en el modal de crear/editar rol (`UsuariosAdmin.jsx`, modo "Por Secciones"), con `LEER_FACTURACION` + `LEER_CLIENTES`. Visible en **ambas** unidades de negocio (Vivero y Herramientas), sin filtro condicional.
- **Frontend — gating del acceso**: el link `/facturas` del sidebar (`DashboardLayout.jsx`) y la ruta protegida `/facturas` + `/facturas/:clienteId` (`App.jsx`) pasan a exigir `LEER_FACTURACION`.
- **Sin migración de datos.** Ningún rol existente recibe `LEER_FACTURACION` automáticamente. Es una decisión de negocio explícita del usuario: quiere reconstruir a mano quién ve Facturación. Consecuencia esperada y aceptada: **apenas se aplique el change, ningún rol salvo `JEFE` puede ver Facturación** hasta que el jefe lo asigne desde el panel de Usuarios (Admin).
- **`JEFE` no pierde acceso**: `DataInitializer` lo siembra con `EnumSet.allOf(PermisoEnum.class)` y además reasigna ese set en cada arranque (`rolJefe.setPermisos(permisosJefe)`), así que absorbe cualquier permiso nuevo del enum, incluido `LEER_FACTURACION`, sin intervención manual. Verificado en `DataInitializer.java:82-87`.
- **Se elimina el seed del rol `EMPLEADO_VIVERO`** (`DataInitializer.java:89-96`). De ahora en más, todo rol que no sea `JEFE` se gestiona a mano desde el panel de Usuarios (Admin). **Esto NO borra datos**: si el rol ya existe en una base real (creado por corridas anteriores), sacar el bloque sólo evita que se siga creando/actualizando en arranques futuros — el rol y sus asignaciones a usuarios quedan intactos en la base.

## Capabilities

### New Capabilities
_(ninguna — este change modifica el modelo de permisos existente, no introduce una capability nueva)_

### Modified Capabilities
- `user-rbac`: se agrega un permiso al modelo RBAC (`LEER_FACTURACION`), se agrega el requerimiento de que el modal de roles exponga la sección "Facturación" en ambas unidades de negocio, y se extiende la protección de rutas del frontend a `/facturas`.
- `facturacion-cliente`: las reglas de autorización de los endpoints de factura por cliente pasan a exigir `LEER_FACTURACION` (lectura y escritura), desacoplando la sección de `ESCRIBIR_VENTAS`.

## Impact

**Backend**
- `backend/src/main/java/com/vivero/gestion/models/PermisoEnum.java` — nuevo valor `LEER_FACTURACION(17L)`.
- `backend/src/main/java/com/vivero/gestion/controllers/FacturaClienteController.java` — 7 `@PreAuthorize` reescritas. **Dominio CRÍTICO (seguridad)** — requiere checkpoint antes de tocarse.
- `backend/src/main/java/com/vivero/gestion/config/DataInitializer.java` — se elimina el bloque de seed de `EMPLEADO_VIVERO`. El bloque de `JEFE` no se toca.
- `GET /api/roles/permisos` empieza a devolver 17 permisos en vez de 16 (sin cambio de código: se sirve directo desde el enum).

**Frontend**
- `frontend/src/pages/UsuariosAdmin.jsx` — nuevo item en el array `SECTIONS`.
- `frontend/src/layouts/DashboardLayout.jsx` — `permission` del item `/facturas`.
- `frontend/src/App.jsx` — `requiredPermission` del bloque de rutas de Facturas.

**Sin impacto de código, pero con impacto operativo**
- Roles existentes distintos de `JEFE` (incluido el `Admin2` de Herramientas creado a mano) pierden acceso a Facturación hasta reasignación manual. Requiere aviso al jefe antes de desplegar.
- `frontend/src/pages/FacturaCliente.jsx` y `frontend/src/pages/Facturas.jsx` **no se modifican** en este change (sólo cambian sus guards de ruta). `FacturaCliente.jsx` está siendo tocado por el change activo `facturacion-rediseno-visual` (sólo visual) — no hay colisión de líneas, pero conviene aplicar este change después o coordinar.

**Fuera de alcance explícito**
- El bug del modal de roles que muestra las secciones **Finanzas** y **Cheques** sólo cuando la unidad activa es Herramientas (`UsuariosAdmin.jsx:45-46`), aunque `LEER_FINANZAS` aplica a ambas unidades. Detectado durante la exploración; el usuario no pidió corregirlo todavía. **No tocar en este change.**
- Los permisos `LEER_PEDIDOS` / `ESCRIBIR_PEDIDOS` sin grupo en el modal. Decisión explícita del usuario de no tocarlos ahora.
- Ninguna migración SQL ni script de reasignación de permisos.
