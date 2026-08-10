# Visión y Objetivos

> **Estado real (2026-08-10):** La etapa inicial contemplaba multi-tenancy por Unidad de Negocio + PIN. **Ya no es así**: el proyecto evolucionó a RBAC plano con passwords (BCrypt). La entidad `UnidadNegocio` quedó **vestigial** (existe en BD y modelo, pero sin controller ni uso real; el frontend hardcodea `unidadNegocioId=1`). Decisión pendiente: completar o abandonar el multi-negocio (ver `10_preguntas_abiertas.md`).

## Propósito del Proyecto
El "Sistema Vivero" evoluciona de un software monolítico de gestión básica a una plataforma ERP (Enterprise Resource Planning) modular. El propósito es centralizar la gestión operativa, logística y financiera del vivero: control de stock de productos, trazabilidad de deudas físicas (bandejas) y dinerarias (cuenta corriente), y márgenes de ganancia.

## Objetivos por Actor
- **El Jefe (Administrador Global, `ADMIN_DB`):** Tener visibilidad financiera exacta (costo vs venta), gestionar usuarios, roles y permisos desde el panel de administración.
- **Operario de Invernadero:** Descontar stock y registrar ventas/movimientos en tiempo real desde el celular (online).
- **Encargado de Logística:** Controlar las devoluciones y deudas de bandejas de los clientes.
- **Vendedor/Encargado:** Registrar ventas y ver la cuenta corriente (bandejas y dinero) de cada cliente antes de vender.
- **Cliente:** Recibir comprobantes/remitos de sus compras de manera digital (PDF/Imagen) por canales informales (ej. WhatsApp).

## Alcance (In Scope) — implementado o planificado
- RBAC plano: `Usuario ↔ Rol ↔ Permiso` (asignación directa, sin pivot por unidad). Permisos reales: `LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`, `LEER_CLIENTES`, `ESCRIBIR_CLIENTES`, `LEER_INSUMOS`, `ESCRIBIR_INSUMOS`, `ADMIN_DB`.
- Catálogos: Productos e Insumos (backend CRUD + frontend ABM).
- Clientes + Cuentas Corrientes (Dinero y Bandejas) — backend y bandejas de UI.
- Panel de Admin para gestión de usuarios/roles/permisos.
- Feedback UX global (toasts, ConfirmDialog, PermissionDeniedModal) — change `ui-feedback-modals`.
- Sincronización de UI en tiempo real vía Server-Sent Events (SSE) — **planificado** (`us-015-realtime-sse`, aún no implementado).
- Generación de Remitos en formato PDF/Imagen desde el cliente (Frontend) — **planificado** (`us-016-remitos-pdf`).
- Núcleo transaccional Venta + MovimientoStock — **planificado** (`us-013-ventas-core`, próximo change).
- Sistema exclusivo de funcionamiento Online.

## Fuera de Alcance (Out of Scope)
- **Facturación Electrónica:** No hay integración con AFIP ni entes gubernamentales.
- **Modo Offline:** El sistema bloqueará operaciones si no hay conexión a internet; no habrá resolución de conflictos asíncrona.