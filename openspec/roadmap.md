# Roadmap de Implementación

Mapa completo de changes para desarrollar **Sistema Vivero (ERP Multi-Negocio)** de inicio a fin.
Generado a partir de `knowledge-base/` aplicando las reglas de secuenciación y atomicidad.

## Orden de ejecución

| # | Change | Funcionalidad | Épica/US | Depende de | Razón de la dependencia |
|---|--------|---------------|----------|-----------|-----|
| 1 | `infra-001-db-viewer` | Agregar pgAdmin al docker-compose | Infra | — | Herramienta necesaria para validar BD |
| 2 | `us-000-setup-clean` | Limpieza inicial, dependencias, estructura base | Infra | `infra-001-db-viewer` | Punto de partida |
| 3 | `us-001-auth-jwt` | Configuración JWT y Spring Security | Épica 1 | `us-000-setup-clean` | Base de seguridad |
| 4 | `us-002-auth-rbac` | Entidades Usuario, Rol y Permiso (DB) | Épica 1 | `us-001-auth-jwt` | Base de datos de seguridad |
| 5 | `us-003-multi-negocio` | Entidad UnidadNegocio y pivote de acceso | Épica 2 | `us-002-auth-rbac` | Establece el tenant para todo el sistema |
| 6 | `us-004-catalogo-prod` | Entidad Producto (Backend CRUD) | Épica 2 | `us-003-multi-negocio` | Catálogo base |
| 7 | `us-005-catalogo-insumos` | Entidad Insumo (Backend CRUD) | Épica 5 | `us-003-multi-negocio` | Catálogo de gastos |
| 8 | `us-006-frontend-login` | Frontend SPA base (Vite) y pantalla Login | Épica 1 | `us-003-multi-negocio` | Interfaz de acceso |
| 9 | `us-007-frontend-productos` | Pantalla ABM Productos | Épica 2 | `us-004-catalogo-prod`, `us-006-frontend-login` | Requiere backend de productos y login |
| 10| `us-008-frontend-insumos` | Pantalla ABM Insumos | Épica 5 | `us-005-catalogo-insumos`, `us-006-frontend-login` | Requiere backend de insumos y login |
| 11| `us-009-clientes-base` | Modelo Cliente, CRUD backend y frontend | Épica 4 | `us-008-frontend-insumos` | Aísla la creación del cliente |
| 12| `us-010-cuentas-ctes` | Backend de CuentaCorriente Dinero y Bandejas | Épica 4 | `us-009-clientes-base` | Expande el cliente con sus balances |
| 13| `us-011-admin-panel` | Frontend Panel de Admin (Gestión Roles/Permisos) | Épica 1 | `us-003-multi-negocio` | Autogestión de usuarios y permisos |
| 14| `us-012-flat-rbac` | Refactor de RBAC a plano sin unidad de negocio | Épica 1 | `us-011-admin-panel` | Simplificar la asignación de roles |
| 15| `ui-rbac-profile` | Perfil visual de usuario en UI y protección de rutas | Épica 1 | `us-012-flat-rbac` | Restringe secciones según los nuevos roles planos |
| 16| `us-013-ventas-core` | Transacción Venta y MovimientoStock (Back/Front) | Épica 3 | `us-009-clientes-base`, `us-007-frontend-productos` | El corazón del ERP (descontar stock) |
| 17| `us-013-ventas-pagos` | Entidad Pago, descuentos y saldos a favor | Épica 4 | `us-013-ventas-core`, `us-010-cuentas-ctes` | Lógica financiera de la venta |
| 18| `us-014-bandejas-flujo` | HistorialBandejas, entregas y devoluciones | Épica 4 | `us-013-ventas-core`, `us-010-cuentas-ctes` | Trazabilidad de envases por venta |
| 19| `us-015-realtime-sse` | Endpoints SSE para notificar cambios de stock | Épica 3 | `us-013-ventas-core` | Requiere que existan eventos de stock para emitir |
| 20| `us-016-remitos-pdf` | Componente Frontend de generación de PDF | Épica 3 | `us-013-ventas-core` | Requiere lectura de datos de la venta |
| 21| `us-017-finanzas-ui` | Reportes de rentabilidad (Ventas vs Costos) | Épica 5 | `us-013-ventas-core`, `us-008-frontend-insumos` | Tablero financiero final |


## Detalle por change

### `infra-001-db-viewer` a `us-008-frontend-insumos`
**(COMPLETADOS)**. La base de datos, seguridad JWT, catálogos backend (Productos e Insumos) y la base del frontend (Login y pantallas de catálogo) ya están implementados.

### `us-009-clientes-base`
**Funcionalidad**: Modelo `Cliente` global, endpoints CRUD en backend, y pantalla ABM en frontend.
**Épica**: Épica 4
**Depende de**: `us-008-frontend-insumos`.
**Justificación**: Aísla la creación del cliente (entidad centralizada) de la lógica financiera.

### `us-010-cuentas-ctes`
**Funcionalidad**: Modelos `CuentaCorrienteDinero` y `CuentaCorrienteBandejas` (vacías, asociadas al cliente).
**Épica**: Épica 4
**Depende de**: `us-009-clientes-base`.
**Justificación**: Prepara las billeteras y balances del cliente antes de poder registrarle una venta a cuenta.

### `us-011-admin-panel`
**Funcionalidad**: Panel de control para el Jefe. Asignación de Permisos a Roles, y Roles a Empleados (por Unidad de Negocio).
**Épica**: Épica 1
**Depende de**: `us-003-multi-negocio`.
**Justificación**: Permite la autogestión de seguridad sin tocar la base de datos (User Management System).

### `us-012-flat-rbac`
**Funcionalidad**: Eliminación de `UsuarioUnidadRol`. Refactor de todo el RBAC para asignar roles y permisos directamente al usuario, sin aislar por unidad de negocio.
**Épica**: Épica 1
**Depende de**: `us-011-admin-panel`.
**Justificación**: Simplifica la seguridad para roles que gestionan tareas en ambas unidades de negocio de forma cruzada, resolviendo la restricción impuesta por `UnidadNegocio`.

### `ui-rbac-profile`
**Funcionalidad**: Restricción visual de secciones de la barra de navegación basada en permisos planos. Adición de indicador visual del usuario activo (nombre y rol principal) en el Layout principal.
**Épica**: Épica 1
**Depende de**: `us-012-flat-rbac`.
**Justificación**: Permite limpiar la interfaz para empleados de diferentes roles y visualizar correctamente el contexto de la cuenta activa.

### `us-013-ventas-core`
**Funcionalidad**: Modelos `Venta`, `VentaDetalle`, `MovimientoStock`. Pantalla de nueva venta optimizada para mobile, que descuente stock físico de los productos.
**Épica**: Épica 3
**Depende de**: `us-009-clientes-base`, `us-007-frontend-productos`.
**Justificación**: El corazón transaccional del ERP. Se enfoca exclusivamente en registrar los items y el total, sin la complejidad de saldos a favor.

### `us-013-ventas-pagos`
**Funcionalidad**: Entidad `Pago`. Lógica para aplicar descuentos a la venta, registrar pagos parciales y enviar deudas/excedentes a la `CuentaCorrienteDinero`.
**Épica**: Épica 4
**Depende de**: `us-013-ventas-core`, `us-010-cuentas-ctes`.
**Justificación**: Separa la complejidad financiera (pagos diferidos, saldos a favor) del núcleo de la venta (bajar stock).

### `us-014-bandejas-flujo`
**Funcionalidad**: `HistorialBandejas` (entregas y devoluciones). Pantalla de logística para devolver bandejas asociadas a una venta específica y saldar la `CuentaCorrienteBandejas`.
**Épica**: Épica 4
**Depende de**: `us-013-ventas-core`, `us-010-cuentas-ctes`.
**Justificación**: Desacopla el tracking de envases plásticos de la contabilidad monetaria.

### `us-015-realtime-sse`
**Funcionalidad**: Emisores SSE (Server-Sent Events) en el backend y listeners en Zustand (frontend) para notificar updates de stock cuando otro dispositivo registra una venta.
**Épica**: Épica 3
**Depende de**: `us-013-ventas-core`.
**Justificación**: Garantiza que si dos vendedores usan la app simultáneamente, no vendan plantas sin stock.

### `us-016-remitos-pdf`
**Funcionalidad**: Generación en memoria (client-side) del comprobante de venta (PDF o Imagen) para enviarlo al cliente (integración preparada para botón "Enviar por WhatsApp").
**Épica**: Épica 3
**Depende de**: `us-013-ventas-core`.
**Justificación**: Necesidad crítica de UX/UI final de la transacción comercial.

### `us-017-finanzas-ui`
**Funcionalidad**: Dashboards y agregaciones. Cruce de totales de ventas vs costos de insumos y plantas.
**Épica**: Épica 5
**Depende de**: `us-013-ventas-core`, `us-008-frontend-insumos`.
**Justificación**: El entregable final para el dueño del negocio: ver la rentabilidad neta.
