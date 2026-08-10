# Funcionalidades y Épicas

> **Estado real (2026-08-10):** Marcamos con ✅ lo implementado/archivado y 🚀 lo planificado. Ver `openspec/roadmap.md` para el detalle de dependencias.

## Épica 1: Autenticación y RBAC (✅ Implementada)
- ✅ Como Jefe, quiero crear usuarios (username + password BCrypt) y gestionar por rol.
- ✅ Como Jefe, quiero un panel de administración global donde pueda crear Roles, asignarles Permisos específicos, y asignar roles a empleados desde un solo lugar (`us-012-flat-rbac`, `us-011-admin-panel`).
- ✅ Como Usuario, quiero iniciar sesión con username + password y recibir un JWT (`us-001`, `us-002`, `us-006`).
- ✅ Como Usuario, quiero ver mi perfil (avatar + nombre + rol) y que las secciones a las que no tengo permiso se oculten (`ui-rbac-profile`).

## Épica 2: Catálogo de Productos e Insumos (✅ Implementada)
- ✅ Como Jefe/Manager, quiero dar de alta productos con precio de costo y precio de venta para llevar el control del catálogo (`us-004`, `us-007`).
- ✅ Como Jefe, quiero registrar compras de insumos para llevar el control de gastos (`us-005`, `us-008`).
- ✅ Como Gestor, quiero feedback UX claro (toasts de éxito/error, diálogos de confirmación, modal de permisos denegados) en todas las pantallas (`ui-feedback-modals`).

## Épica 4: Clientes y Cuentas Corrientes (✅ Backend + UI base)
- ✅ Como Vendedor/Encargado, al buscar un cliente quiero ver el total de bandejas y dinero que adeuda (`us-009-clientes-base`, `us-010-cuentas-ctes`).
- 🚀 Como Encargado de Logística, al registrar una devolución quiero seleccionar una venta específica y devolver total o parcial (`us-014-bandejas-flujo`).
- 🚀 Como Vendedor, quiero registrar un Pago parcial o total para saldar la cuenta corriente de dinero de un cliente (`us-013-ventas-pagos`).

## Épica 3: Operaciones y Ventas (🚀 Planificada)
- 🚀 Como Operario, quiero registrar ventas desde mi celular para descontar stock en el momento (`us-013-ventas-core` — **próximo change**).
- 🚀 Como Vendedor, al registrar una venta quiero poder aplicar un descuento y registrar si el pago fue total, parcial o fiado (`us-013-ventas-pagos`).
- 🚀 Como Jefe, quiero que si un operario descuenta stock, mi pantalla se actualice automáticamente (SSE) sin tener que recargar (`us-015-realtime-sse`).
- 🚀 Como Vendedor, quiero generar un remito (comprobante) en PDF/Imagen al finalizar la venta para enviarlo por WhatsApp (`us-016-remitos-pdf`).

## Épica 5: Finanzas y Rentabilidad (🚀 Planificada)
- 🚀 Como Jefe, quiero ver reportes de ganancias (Ventas - Costos - Insumos) para evaluar la rentabilidad (`us-017-finanzas-ui`).