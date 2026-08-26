# Roadmap de Implementación

Mapa completo de changes para desarrollar **Sistema Vivero (ERP)** de inicio a fin.
Generado a partir de `knowledge-base/` aplicando las reglas de secuenciación y atomicidad.

> **Nota de estado (2026-08-10):** Todos los changes hasta `us-016-remitos-pdf` están **completados y archivados** en OPSX (incl. `infra-001-db-viewer`, `docker-full-stack`, `chore-limpieza-pre-ventas`, `ui-rbac-profile`, `ui-feedback-modals`, `ui-cart-persistence` y `us-016-remitos-pdf`). El multi-negocio por `UnidadNegocio` quedó **vestigial** (RBAC plano desde `us-012`; `us-003-multi-negocio` **[REVERTIDO]** — reemplazado por `chore-limpieza-pre-ventas`). **Pendiente:** `us-017-finanzas-ui`.
>
> **⚠️ Este documento está desactualizado** (`us-017-finanzas-ui` y varios changes posteriores —incluida toda la etapa de UI responsive, `siembras-origen-lote`, `siembras-fecha-rango` y `factura-cliente-dinamica`— ya están archivados y no figuran acá). Conviene regenerarlo con `roadmap-generator` antes de usarlo para planificar el próximo change.
>
> **Recomendación registrada (change `factura-cliente-dinamica`):** el siguiente change natural es `cuenta-corriente-movimientos` — construir el libro de movimientos de cuenta corriente (entidad `MovimientoCuentaCorriente`, retrofit de `ajustarSaldo`/cheques sueltos/reversas) para que la línea agregada "Otros movimientos de cuenta corriente" de la factura por cliente se pueda desglosar en renglones detallados. Ver Decisión 4 de `openspec/changes/archive/2026-08-18-factura-cliente-dinamica/design.md` (o la ruta de archive correspondiente una vez archivado este change) para las alternativas evaluadas y por qué se dejó fuera de alcance esta vez.
>
> **`costeo-fifo-herramientas` (implementado 2026-08-21/22, pendiente de archivar — `openspec/changes/costeo-fifo-herramientas/`):** ⚠️ **el nombre del directorio es histórico y ya NO describe el algoritmo.** El diseño arrancó como FIFO puro pero el usuario corrigió el requisito durante el checkpoint del grupo 3 (2026-08-21): el costo de referencia de un producto de Herramientas no es "el costo de la próxima unidad a vender" sino **el máximo entre todas las capas activas (`cantidadRestante > 0`)**, sin importar antigüedad — sólo baja cuando la capa más cara se agota. El **consumo de cantidades** (qué capa pierde unidades) sí sigue la regla de siempre, más vieja primero (Decisión 2b) — son dos reglas independientes, y sólo la segunda es "FIFO". Entidad nueva `CapaCostoStock` (una por ingreso con `cantidad > 0`), motor puro `CosteoPorCapasCalculator` (18 tests unitarios verdes), `@Formula` de `Producto.costoUnitarioHistorico` repuntada a `MAX(costo_unitario)` de las capas activas con `COALESCE` al comportamiento viejo, todo detrás del flag `UnidadNegocio.costeoPorCapasHabilitado` (en `false` para las dos unidades — estado de reposo). Vivero no cambia de comportamiento (nunca tiene capas). `VentaDetalle`/`VentaServiceImpl`/`FinanzasServiceImpl`/frontend no necesitaron ni una línea: con un solo costo por línea de venta, `cantidad × costoUnitarioHistorico` ya era el total exacto. **Relación con otros changes:** (a) `revision-costos-productos` (archivado 2026-08-26 como **superado/abandonado**, quedó en 20/61 — `openspec/changes/archive/2026-08-26-revision-costos-productos/`) iba a detectar "revisión pendiente" comparando el costo de catálogo contra el costo de referencia; ese criterio quedó **desactualizado** por este change (ver Riesgo R6 de su `proposal.md`) y nunca se retomó — el problema que resolvía terminó cubierto por el ratchet automático (`ProductoServiceImpl.actualizarFichaSiCostoFinalSupera`) y el badge de margen de `Productos.jsx`, ambos posteriores; (b) `config-costeo-por-proveedor` (implementado, pendiente de archivar) tocó los mismos archivos centrales (`CostoCalculator`, `Producto`, `MovimientoStockServiceImpl`) para la conversión de moneda USD/ARS, sin superposición de lógica — ambos changes conviven en el mismo working tree sin conflicto porque operan en pasos distintos de la cadena de costeo (conversión de moneda vs. selección de capa).

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

## Backlog (descartado por ahora, no proponer sin retomar la conversación)

### Pedidos a proveedores de herramientas (catálogos multi-marca) — descartado el 2026-08-19

**Problema**: el jefe arma pedidos de reposición de stock a proveedores de herramientas (ej. SHIMURA), cada uno con su propio catálogo, descuentos, descuentos por método de pago, moneda (algunos en USD con tipo de cambio propio), IVA y costo de envío. Tipear todo eso a mano es tedioso.

**Opciones evaluadas**:
1. **Carga de Excel por marca + armado de pedido por código de producto** (recomendada si se retoma): el Excel se parsea a una tabla propia (`catalogo_proveedor_items` o similar) con código/precio/moneda/tipo de cambio/IVA/descuento — no se guarda el archivo `.xlsx` en sí, solo los datos parseados. Quedaba pendiente decidir si cada carga nueva **pisa** el catálogo vigente de esa marca (más simple, sin historial de precios) o lo **versiona** (guarda las filas viejas marcadas como no vigentes, para poder auditar precios pasados). El volumen de datos no era el problema — a la escala de un vivero (incluso con ~200 catálogos) es trivial para Postgres.
2. **Conectar la web a un catálogo externo de cada proveedor** (descartada): depende de que cada proveedor tenga API pública o página estable para leer, cosa que la mayoría de proveedores de vivero no tiene. Frágil (se rompe si el proveedor cambia de diseño) y no escala a "todos los proveedores" como estrategia general.

**Por qué se descartó por ahora**: el cliente informó que podrían llegar a ser ~200 catálogos distintos (una carga por marca/proveedor), lo cual vuelve operativamente pesado el enfoque de carga manual de Excel uno por uno, más allá de que la base de datos en sí lo soportaría sin problema. Se decidió no avanzar con ningún enfoque por ahora.

**Si se retoma en el futuro**, antes de proponer un change conviene repensar el enfoque para 200 proveedores (¿priorizar solo los más usados? ¿un formato de carga más masivo, tipo ZIP con varios Excel a la vez? ¿un mapeo de columnas reutilizable por marca para que cargar un catálogo nuevo sea rápido incluso a esa escala?) en vez de asumir que el patrón "un Excel, un mapeo manual" pensado para pocas marcas escala igual de bien a 200.

**Actualización 2026-08-20 — parte de este problema ya se resolvió, y el resto tiene change propuesto:**

- **Resuelto por `costeo-flexible-por-producto`** (archivado 2026-08-20): la parte de "cada proveedor tiene sus descuentos, su IVA y su envío" ya no depende de tipear todo a mano en cada compra. El producto tiene una lista libre de descuentos **estables** (`ProductoDescuento`, aplicados en cascada) e IVA/envío propios con fallback al default de la unidad de negocio. Elimina la fricción de las cuatro copias de la fórmula que existían antes, pero **no** resuelve nada de catálogos ni de moneda — sigue sin haber forma de cargar un catálogo de proveedor de una vez.
  - ⚠️ **Nota 2026-08-22 — bug de fórmula corregido, posterior al archivado de este change.** El paso de IVA+envío que este change dejó en `CostoCalculator.java`/`costeo.js` (`envío sobre el mismo neto que el IVA, y suma`) tenía un bug: pierde el término cruzado `neto × IVA% × envío%` cuando IVA y envío son ambos distintos de cero al mismo tiempo. Se detectó y corrigió el 2026-08-22 al verificar contra la planilla real del proveedor Shimura (`img/shimura.png`) — la fórmula correcta es `neto × (1+IVA%) × (1+envío%)` (envío en cadena sobre el neto+IVA, no en paralelo). Con Ingco/Extra Power/Duroll (IVA siempre 0%) el bug nunca se notó, porque el término cruzado daba cero. Los ejemplos numéricos de este change archivado (y los de `design.md`/`tasks.md` de este propio `roadmap.md` que lo citan) quedan con la fórmula vieja tal cual se decidieron en su momento — no se reescriben retroactivamente — pero si los lee alguien más adelante, el número correcto hoy es el de la fórmula en cadena, no el de la suma en paralelo.
- **Resuelto por `config-costeo-por-proveedor`** (implementado 2026-08-20, pendiente de archivar — `openspec/changes/config-costeo-por-proveedor/`): tomó **la parte de moneda y tipo de cambio** que quedaba pendiente acá (conversión de USD a pesos como paso 0 de la cadena de costeo, para proveedores como Shimura que cotizan en dólares, con la cotización pedida en cada pedido — nunca un fallback guardado) y **configuración de proveedor por defecto** (perfil de costeo del `Proveedor`: si maneja IVA aparte o incluido, sus descuentos habituales, su envío — precargables una sola vez al crear un producto o una línea de pedido), más la unificación de `Marca`/`Proveedor` en Herramientas (los 8 productos vivos con marca migrados a `Proveedor` por nombre normalizado; la pestaña "Marcas" de Configuración quedó escondida, sin borrar el código). **No** incluyó la importación de catálogos por Excel — ese pedazo del problema (los ~200 catálogos) sigue descartado más abajo, sin change propuesto todavía. El grupo 11 de ese change (botón "reaplicar valores del proveedor a sus productos", con vista previa) quedó **explícitamente recortado de alcance** (OQ5) — no se implementó; queda como candidato a retomar más abajo si el negocio lo pide.

### Reaplicar el perfil de costeo del proveedor a sus productos ya cargados — recortado de `config-costeo-por-proveedor` (grupo 11, OQ5)

**Estado real hoy:** los cinco campos del perfil de costeo del proveedor (IVA, dólares, envío, descuentos) se copian **una sola vez** al crear un producto o una línea de pedido (Decisión 3 — OQ3); cambiar el perfil del proveedor después **no** afecta a los productos ya cargados, por diseño. No existe ningún botón para reaplicar esos valores a los productos existentes de un proveedor.

**Por qué quedó fuera:** el grupo 11 de `config-costeo-por-proveedor` (botón "Aplicar estos valores a los productos de este proveedor", con vista previa costo-actual-vs-costo-resultante, deselección puntual y confirmación explícita) estaba diseñado y no era grande, pero se marcó como recortable desde el propio `design.md` (OQ5) para no alargar un change ya extenso. Si se retoma, el diseño ya existe en `openspec/changes/config-costeo-por-proveedor/tasks.md` (tareas 11.1-11.7) y en su `design.md` — no hace falta re-diseñarlo, sólo implementarlo.

### Flete fijo prorrateado por pedido — candidato a change propio (OQ11 de `config-costeo-por-proveedor`)

**Estado real hoy:** el costo de envío es siempre un **porcentaje** del costo neto (a nivel unidad de negocio, producto o proveedor), tanto en el `CostoCalculator` como en el perfil del proveedor. No existe la opción de cargar un monto fijo de flete por pedido y prorratearlo entre las líneas.

**Por qué quedó fuera:** se evaluó explícitamente en la OQ11 de `config-costeo-por-proveedor` y se descartó para ese change — coincide con el modelo actual y con las planillas reales relevadas (todas usan porcentaje). Un flete fijo prorrateado es un problema aparte porque el prorrateo puede repartirse de formas distintas (por unidades, por peso, por importe de cada línea) y esa decisión de diseño no estaba resuelta. **Sólo se anota como candidato si el usuario confirma que es un caso real de negocio** — no proponer un change sobre esto sin retomar la conversación primero.

### Borrado definitivo de `Marca` — candidato a *chore* posterior (OQ10 de `config-costeo-por-proveedor`)

**Estado real hoy:** `Marca`, `MarcaController`, `MarcaService(Impl)`, `MarcaRepository`, `MarcaDTO` y los endpoints `/api/marcas` siguen intactos en el código (verificados respondiendo tras `config-costeo-por-proveedor`), pero la pestaña "Marcas" de `pages/Configuracion.jsx` está escondida y `Producto.proveedor` es la única referencia de catálogo que se lee o se escribe desde cualquier alta/edición de producto. `Producto.marca`/`marca_id` quedan como columnas huérfanas, sin ningún flujo que las toque.

**Por qué no se borró ya:** `config-costeo-por-proveedor` decidió explícitamente (OQ10) dejar `Marca` como red de rollback de la unificación con `Proveedor`, en vez de borrarla en el mismo change que la reemplaza. **Cuando la unificación lleve un tiempo funcionando sin problemas**, borrar `Marca` de verdad (entidad, controller, service, repository, DTO, endpoints, columna `marca_id` de `productos`, y el `<select>`/badge que ya no la usan) es un *chore* chico y de bajo riesgo — no requiere `design.md` propio, sólo confirmar con el usuario que ya no hace falta el rollback.

### Descuentos a nivel de `Pedido` (para el descuento por pagar en efectivo) — posible trabajo futuro, no pendiente de ningún change

**Estado real hoy:** los descuentos que varían compra a compra —típicamente el descuento por pagar en efectivo, que no es una condición fija del producto ni del proveedor— se resuelven ajustando a mano el `costoUnitarioPactado` de cada línea del pedido, mecanismo que ya existe desde `herramientas-pedidos-proveedores` y que **no requiere ningún desarrollo nuevo**. Este ajuste manual convive sin conflicto con la lista de descuentos **estables** del producto (`ProductoDescuento`, de `costeo-flexible-por-producto`): la cascada de descuentos estables se sigue aplicando encima del `costoUnitarioPactado` ya rebajado, sin doble conteo (verificado en la tarea 11.10.1 de ese change).

Modelar un descuento a nivel de cabecera de `Pedido` (uno solo que se reparta o se aplique a todas sus líneas) se **evaluó explícitamente con el usuario durante `costeo-flexible-por-producto`** como alternativa al ajuste manual línea por línea, y **se descartó para ese change** (Decisión 14 de su `design.md`; confirmado también, sin reabrirlo, en el alcance de `config-costeo-por-proveedor`). No es un pendiente de ningún change activo ni propuesto — queda anotado acá únicamente como **opción abierta a futuro**, sin comprometer el alcance de ningún change existente. Si se retoma algún día, conviene repensarlo junto con `config-costeo-por-proveedor` (que ya introduce el perfil de costeo por defecto del proveedor) en vez de como un campo aislado en `Pedido`.