# Roadmap de Implementación

Mapa completo de changes para desarrollar **Sistema Vivero (ERP)** de inicio a fin.
Generado a partir de `knowledge-base/` aplicando las reglas de secuenciación y atomicidad.

> **Nota de estado (2026-08-10):** Todos los changes hasta `us-016-remitos-pdf` están **completados y archivados** en OPSX (incl. `infra-001-db-viewer`, `docker-full-stack`, `chore-limpieza-pre-ventas`, `ui-rbac-profile`, `ui-feedback-modals`, `ui-cart-persistence` y `us-016-remitos-pdf`). El multi-negocio por `UnidadNegocio` quedó **vestigial** (RBAC plano desde `us-012`; `us-003-multi-negocio` **[REVERTIDO]** — reemplazado por `chore-limpieza-pre-ventas`). **Pendiente:** `us-017-finanzas-ui`.
>
> **⚠️ Este documento está desactualizado** (`us-017-finanzas-ui` y varios changes posteriores —incluida toda la etapa de UI responsive, `siembras-origen-lote`, `siembras-fecha-rango` y `factura-cliente-dinamica`— ya están archivados y no figuran acá). Conviene regenerarlo con `roadmap-generator` antes de usarlo para planificar el próximo change.
>
> **Recomendación registrada (change `factura-cliente-dinamica`):** el siguiente change natural es `cuenta-corriente-movimientos` — construir el libro de movimientos de cuenta corriente (entidad `MovimientoCuentaCorriente`, retrofit de `ajustarSaldo`/cheques sueltos/reversas) para que la línea agregada "Otros movimientos de cuenta corriente" de la factura por cliente se pueda desglosar en renglones detallados. Ver Decisión 4 de `openspec/changes/archive/2026-08-18-factura-cliente-dinamica/design.md` (o la ruta de archive correspondiente una vez archivado este change) para las alternativas evaluadas y por qué se dejó fuera de alcance esta vez.

## Orden de ejecución

| # | Change | Funcionalidad | Épica/US | Depende de | Razón de la dependencia |
|---|--------|---------------|----------|-----------|-----|
| 1 | ✅ `infra-001-db-viewer` | Agregar pgAdmin al docker-compose | Infra | — | Herramienta necesaria para validar BD |
| 2 | ✅ `us-000-setup-clean` | Limpieza inicial, dependencias, estructura base | Infra | `infra-001-db-viewer` | Punto de partida |
| 3 | ✅ `us-001-auth-jwt` | Configuración JWT y Spring Security | Épica 1 | `us-000-setup-clean` | Base de seguridad |
| 4 | ✅ `us-002-auth-rbac` | Entidades Usuario, Rol y Permiso (DB) | Épica 1 | `us-001-auth-jwt` | Base de datos de seguridad |
| 5 | ~✅ `us-003-multi-negocio`~ | ~Entidad UnidadNegocio y pivote de acceso~ | Épica 2 | `us-002-auth-rbac` | **[REVERTIDO]** Reemplazado por sistema global (`chore-limpieza-pre-ventas`) |
| 6 | ✅ `us-004-catalogo-prod` | Entidad Producto (Backend CRUD) | Épica 2 | `us-002-auth-rbac` | Catálogo base |
| 7 | ✅ `us-005-catalogo-insumos` | Entidad Insumo (Backend CRUD) | Épica 5 | `us-002-auth-rbac` | Catálogo de gastos |
| 8 | ✅ `us-006-frontend-login` | Frontend SPA base (Vite) y pantalla Login | Épica 1 | `us-002-auth-rbac` | Interfaz de acceso |
| 9 | ✅ `us-007-frontend-productos` | Pantalla ABM Productos | Épica 2 | `us-004-catalogo-prod`, `us-006-frontend-login` | Requiere backend de productos y login |
| 10| ✅ `us-008-frontend-insumos` | Pantalla ABM Insumos | Épica 5 | `us-005-catalogo-insumos`, `us-006-frontend-login` | Requiere backend de insumos y login |
| 11| ✅ `us-009-clientes-base` | Modelo Cliente, CRUD backend y frontend | Épica 4 | `us-008-frontend-insumos` | Aísla la creación del cliente |
| 12| ✅ `us-010-cuentas-ctes` | Backend de CuentaCorriente Dinero y Bandejas | Épica 4 | `us-009-clientes-base` | Expande el cliente con sus balances |
| 13| ✅ `us-011-admin-panel` | Frontend Panel de Admin (Gestión Roles/Permisos) | Épica 1 | `us-012-flat-rbac` | Autogestión de usuarios y permisos |
| 14| ✅ `us-012-flat-rbac` | Refactor de RBAC a plano sin unidad de negocio | Épica 1 | `us-011-admin-panel` | Simplificar la asignación de roles |
| 15| ✅ `chore-limpieza-pre-ventas` | Limpieza previa a ventas (remoción multi-negocio vestigial) | Infra | `us-012-flat-rbac` | Destraba el camino hacia el núcleo transaccional |
| 16| ✅ `ui-rbac-profile` | Perfil visual de usuario en UI y protección de rutas | Épica 1 | `us-012-flat-rbac` | Restringe secciones según los nuevos roles planos |
| 17| ✅ `ui-feedback-modals` | Reemplazo de alerts nativos por modales/toasts reutilizables | UX | `us-011-admin-panel` | Feedback UX global sin per-page wiring |
| 18| ✅ `us-013-ventas-core` | Transacción Venta y MovimientoStock (Back/Front) | Épica 3 | `us-009-clientes-base`, `us-007-frontend-productos` | El corazón del ERP (descontar stock) |
| 19| ✅ `us-013-ventas-pagos` | Entidad Pago, descuentos y saldos a favor | Épica 4 | `us-013-ventas-core`, `us-010-cuentas-ctes` | Lógica financiera de la venta |
| 20| ✅ `us-014-bandejas-flujo` | HistorialBandejas, entregas y devoluciones | Épica 4 | `us-013-ventas-core`, `us-010-cuentas-ctes` | Trazabilidad de envases por venta |
| 21| ✅ `us-015-realtime-sse` | Endpoints SSE para notificar cambios de stock | Épica 3 | `us-013-ventas-core` | Requiere que existan eventos de stock para emitir |
| 22| ✅ `ui-cart-persistence` | Carrito de ventas persistente en UI (Zustand + sessionStorage) | Épica 3 | `us-013-ventas-core` | Evita perder el carrito al navegar/refrescar |
| 23| ✅ `us-016-remitos-pdf` | Remito PDF/Imagen + WhatsApp | Épica 3 | `us-013-ventas-core` | Comprobante client-side con envío por WhatsApp |
| 24| ✅ `us-021-registrar-cheque-manual` | Registro de cheques manual independiente de ventas | Épica 4 | `us-010-cuentas-ctes` | Permite agregar saldos a favor por cheques |
| 25| ✅ `us-021-reversa-cheques` | Reversa de saldos contables y bloqueo de estados (RECHAZADO/ENTREGADO) | Épica 4 | `us-021-registrar-cheque-manual` | Manejo contable robusto de cheques |
| 26| 🚀 `us-017-finanzas-ui` | Reportes de rentabilidad (Ventas vs Costos) | Épica 5 | `us-013-ventas-core`, `us-008-frontend-insumos` | **PRÓXIMO CHANGE** — Tablero financiero final |


## Detalle por change

### `infra-001-db-viewer` a `us-008-frontend-insumos`
**(COMPLETADOS — archivados en OPSX al 2026-08-10)**. La base de datos, seguridad JWT, catálogos backend (Productos e Insumos) y la base del frontend (Login y pantallas de catálogo) ya están implementados.

### `us-009-clientes-base` a `ui-rbac-profile`
**(COMPLETADOS — archivados en OPSX al 2026-08-10)**. Clientes + Cuentas Corrientes + Panel Admin + RBAC plano + perfil visual de usuario. Detalle original de cada uno a continuación por historial.

### `us-009-clientes-base`
**Funcionalidad**: Modelo `Cliente` global, endpoints CRUD en backend, y pantalla ABM en frontend.
**Épica**: Épica 4
**Depende de**: `us-008-frontend-insumos`.
**Justificación**: Aísla la creación del cliente (entidad centralizada) de la lógica financiera.
**Archivo**: `openspec/changes/archive/2026-08-09-us-009-clientes-base/`

### `us-010-cuentas-ctes`
**Funcionalidad**: Modelos `CuentaCorrienteDinero` y `CuentaCorrienteBandejas` (vacías, asociadas al cliente).
**Épica**: Épica 4
**Depende de**: `us-009-clientes-base`.
**Justificación**: Prepara las billeteras y balances del cliente antes de poder registrarle una venta a cuenta.
**Archivo**: `openspec/changes/archive/2026-08-09-us-010-cuentas-ctes/`

### `us-011-admin-panel`
**Funcionalidad**: Panel de control para el Jefe. Asignación de Permisos a Roles, y Roles a Empleados (por Unidad de Negocio).
**Épica**: Épica 1
**Depende de**: `us-012-flat-rbac`.
**Justificación**: Permite la autogestión de seguridad sin tocar la base de datos (User Management System).
**Archivo**: `openspec/changes/archive/2026-08-09-us-011-admin-panel/`

### `us-012-flat-rbac`
**Funcionalidad**: Eliminación de `UsuarioUnidadRol`. Refactor de todo el RBAC para asignar roles y permisos directamente al usuario, sin aislar por unidad de negocio.
**Épica**: Épica 1
**Depende de**: `us-011-admin-panel`.
**Justificación**: Simplifica la seguridad para roles que gestionan tareas en ambas unidades de negocio de forma cruzada, resolviendo la restricción impuesta por `UnidadNegocio`.
**Archivo**: `openspec/changes/archive/2026-08-09-us-012-flat-rbac/`

### `chore-limpieza-pre-ventas`
**Funcionalidad**: Limpieza del código vestigial de multi-negocio (`UnidadNegocio`, `UsuarioUnidadRol`) que quedaba de `us-003-multi-negocio`, destrabando el camino hacia el núcleo transaccional de ventas.
**Épica**: Infra
**Depende de**: `us-012-flat-rbac`.
**Justificación**: Concretó la decisión de abandonar el multi-negocio; `us-003` queda **[REVERTIDO]**.
**Archivo**: `openspec/changes/archive/2026-08-10-chore-limpieza-pre-ventas/`

### `ui-rbac-profile`
**Funcionalidad**: Restricción visual de secciones de la barra de navegación basada en permisos planos. Adición de indicador visual del usuario activo (nombre y rol principal) en el Layout principal.
**Épica**: Épica 1
**Depende de**: `us-012-flat-rbac`.
**Justificación**: Permite limpiar la interfaz para empleados de diferentes roles y visualizar correctamente el contexto de la cuenta activa.
**Archivo**: `openspec/changes/archive/2026-08-10-ui-rbac-profile/`

### `ui-feedback-modals`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: Reemplazo de los 18 `alert`/`confirm` nativos del frontend por componentes reutilizables: `ConfirmDialog`, `PermissionDeniedModal`, `ToastContainer` + store global `useUIStore` (pushToast/askConfirm/denyAccess), montados en `DashboardLayout`. Migrados Productos, Insumos, Clientes y UsuariosAdmin. Corrección de strings de permisos VIVERO_* obsoletos.
**Depende de**: `us-011-admin-panel`.
**Justificación**: Feedback UX global y consistente sin wiring por página.
**Archivo**: `openspec/changes/archive/2026-08-10-ui-feedback-modals/`

### `us-013-ventas-core`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: Modelos `Venta`, `VentaDetalle`, `MovimientoStock`. Pantalla de nueva venta optimizada para mobile, que descuente stock físico de los productos.
**Épica**: Épica 3
**Depende de**: `us-009-clientes-base`, `us-007-frontend-productos`.
**Justificación**: El corazón transaccional del ERP. Se enfoca exclusivamente en registrar los items y el total, sin la complejidad de saldos a favor.
**Archivo**: `openspec/changes/archive/2026-08-10-us-013-ventas-core/`

### `us-013-ventas-pagos`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: Entidad `Pago`. Lógica para aplicar descuentos a la venta, registrar pagos parciales y enviar deudas/excedentes a la `CuentaCorrienteDinero`.
**Épica**: Épica 4
**Depende de**: `us-013-ventas-core`, `us-010-cuentas-ctes`.
**Justificación**: Separa la complejidad financiera (pagos diferidos, saldos a favor) del núcleo de la venta (bajar stock).
**Archivo**: `openspec/changes/archive/2026-08-10-us-013-ventas-pagos/`

### `us-014-bandejas-flujo`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: `HistorialBandejas` (entregas y devoluciones). Pantalla de logística para devolver bandejas asociadas a una venta específica y saldar la `CuentaCorrienteBandejas`.
**Épica**: Épica 4
**Depende de**: `us-013-ventas-core`, `us-010-cuentas-ctes`.
**Justificación**: Desacopla el tracking de envases plásticos de la contabilidad monetaria.
**Archivo**: `openspec/changes/archive/2026-08-10-us-014-bandejas-flujo/`

### `us-015-realtime-sse`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: Emisores SSE (Server-Sent Events) en el backend y listeners en Zustand (frontend) para notificar updates de stock cuando otro dispositivo registra una venta.
**Épica**: Épica 3
**Depende de**: `us-013-ventas-core`.
**Justificación**: Garantiza que si dos vendedores usan la app simultáneamente, no vendan plantas sin stock.
**Archivo**: `openspec/changes/archive/2026-08-10-us-015-realtime-sse/`

### `ui-cart-persistence`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: `useCartStore` (Zustand + `persist` + sessionStorage, clave `cart-storage`) que mantiene `clienteSeleccionado`, `detalles`, `descuento`, `metodoPago`, `fechaVenta`, `nota` y `bandejasEntregadas`. Refactor de `NuevaVenta.jsx` para usar el store; `clearCart()` tras venta exitosa. El carrito sobrevive navegación entre secciones y refresh (F5).
**Depende de**: `us-013-ventas-core`.
**Justificación**: UX de punto de venta: el vendedor no pierde el carrito en curso al navegar o refrescar.
**Archivo**: `openspec/changes/archive/2026-08-10-ui-cart-persistence/`

### `us-016-remitos-pdf`
**(COMPLETADO — archivado en OPSX al 2026-08-10)**.
**Funcionalidad**: Generación en memoria (client-side) del comprobante de venta (PDF o Imagen) para enviarlo al cliente. `ComprobanteVentaModal.jsx` desde el historial: descarga PDF (`jspdf`), exporta PNG completo (`html-to-image`, clon off-screen sin recorte) y "Enviar por WhatsApp" — en escritorio copia el PNG al portapapeles y abre `web.whatsapp.com/send?phone={clienteTelefono}` reutilizando la ventana (`whatsapp-remito`); en móvil intenta Web Share con el archivo. `clienteTelefono` expuesto en `VentaResponseDTO`.
**Épica**: Épica 3
**Depende de**: `us-013-ventas-core`.
**Justificación**: Necesidad crítica de UX/UI final de la transacción comercial.
**Archivo**: `openspec/changes/archive/2026-08-10-us-016-remitos-pdf/`

### `us-021-registrar-cheque-manual`
**(COMPLETADO — archivado en OPSX al 2026-08-12)**.
**Funcionalidad**: Permite cargar un cheque suelto al sistema y que impacte sumando saldo a favor en la cuenta del cliente seleccionado (registro sin venta).
**Archivo**: `openspec/changes/archive/2026-08-12-us-021-registrar-cheque-manual/`

### `us-021-reversa-cheques`
**(COMPLETADO — archivado en OPSX al 2026-08-12)**.
**Funcionalidad**: Al pasar un cheque a estado RECHAZADO, el sistema automáticamente revierte los saldos generados (suma o resta deuda según el emisor original). Bloquea la edición de cheques en estado RECHAZADO, ENTREGADO o COBRADO por seguridad contable.
**Archivo**: `openspec/changes/archive/2026-08-12-us-021-reversa-cheques/`

### `us-017-finanzas-ui`
**Funcionalidad**: Dashboards y agregaciones. Cruce de totales de ventas vs costos de insumos y plantas.
**Épica**: Épica 5
**Depende de**: `us-013-ventas-core`, `us-008-frontend-insumos`.
**Justificación**: El entregable final para el dueño del negocio: ver la rentabilidad neta.
**🚀 PRÓXIMO CHANGE**: es el siguiente a proponer/implementar según el roadmap.