# Decisiones de Diseño y Supuestos

> **Estado real (2026-08-10):** Varias decisiones de la etapa inicial fueron **revertidas o superadas** (marcadas como REVERTIDA). Este documento refleja las decisiones vigentes.

## Decisiones Arquitectónicas (ADRs)

### ADR-001: Sincronización en Tiempo Real (planificada)
- **Decisión:** Utilizar Server-Sent Events (SSE) desde Spring Boot hacia el frontend (React), combinado con invalidación de caché usando TanStack Query.
- **Razón:** El enfoque SSE provee notificaciones push ultralivianas desde el servidor (ej. cuando se descuenta stock) sin la complejidad bidireccional de WebSockets.
- **Alternativas descartadas:** WebSockets (excesivo para updates simples), Short Polling (ineficiente).
- **Estado:** 🚀 Planificada (`us-015-realtime-sse`). **NO implementada aún.**

### ADR-002: RBAC Plano (✅ Vigente — `us-012-flat-rbac`)
- **Decisión:** Autenticación con **username + password (BCrypt)** y RBAC **plano**: `Usuario ↔ Rol ↔ Permiso` (N:M directos), sin pivot por Unidad de Negocio.
- **Razón:** Simplifica la seguridad para roles que gestionan tareas de forma cruzada y elimina la restricción impuesta por `Usuario_Unidad_Rol`.
- **REVERTIDA:** la estrategia anterior de "Logical Isolation multi-tenant" con PIN (ADR original 002 y 004 de la etapa inicial) fue abandonada. `UnidadNegocio` quedó **vestigial** (sin controller, sin uso real, `SecurityService` dead code).

### ADR-003: Manejo de Conectividad (Online-Only) — vigente
- **Decisión:** La aplicación es estrictamente dependiente de una conexión a internet activa.
- **Razón:** Evitar la altísima complejidad de implementar una estrategia "Local-First" y resolución de conflictos asíncrona.
- **Alternativas descartadas:** Sincronización Offline First.

### ADR-004: Feedback UX Global (✅ Vigente — `ui-feedback-modals`)
- **Decisión:** Reemplazar los `alert`/`confirm` nativos del navegador por componentes React reutilizables implementados **a mano con Tailwind** (no librerías externas): `ToastContainer`, `ConfirmDialog`, `PermissionDeniedModal`, orquestados por `useUIStore` (Zustand) y montados globalmente en `DashboardLayout`.
- **Razón:** Consistencia visual mobile-first (bottom-sheet en mobile, centrado en desktop), cero dependencias extra, feedback visible en todas las páginas sin wiring por página.
- **Alternativas descartadas:** Sonner, Radix UI (dependencias y estilos ajenos al design system propio).

### ADR-005: Generación de Remitos (planificada)
- **Decisión:** Generación de PDFs orientada a uso interno/informal, renderizada del lado del cliente (Frontend).
- **Razón:** No hay requisitos legales/fiscales (AFIP) que exijan firmas digitales pesadas o trazabilidad gubernamental en el backend.
- **Estado:** 🚀 Planificada (`us-016-remitos-pdf`).

## Supuestos (Assumptions)
1. **Suposición:** El Jefe centraliza la creación de usuarios y la asignación de roles desde el panel de Admin (`ADMIN_DB`); no hay auto-registro.
2. **Suposición:** "Precio Costo" y "Precio Venta" en Finanzas implica que se registrarán compras de insumos para calcular el margen neto real.
3. **Suposición (pendiente de decisión):** El multi-negocio (`UnidadNegocio`) se considera vestigial; falta decidir si se completa o se abandona por completo (ver `10_preguntas_abiertas.md` #2).