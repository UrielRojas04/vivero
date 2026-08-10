# Actores y Roles (RBAC)

> **Estado real (2026-08-10):** El RBAC es **plano**: `Usuario ↔ Rol ↔ Permiso` (N:M directos). A diferencia de la etapa inicial, NO existe el pivot `Usuario_Unidad_Rol` ni roles con scope por Unidad de Negocio. La autenticación usa **username + password (BCrypt)**, no PIN.

## Actores del Sistema

| Actor | Descripción | Notas |
|-------|-------------|-------|
| **Jefe (SuperAdmin)** | Dueño del negocio. Acceso total (permiso `ADMIN_DB`): finanzas, configuración, usuarios. | Rol principal `JEFE` |
| **Encargado de Logística** | Gestiona envíos, despachos y devoluciones de bandejas. | Permisos según rol asignado |
| **Operario (Stock)** | Registra movimientos de inventario desde el celular en el invernadero/galpón. | Permisos `LEER_STOCK`, `ESCRIBIR_STOCK` |
| **Vendedor** | Registra ventas y genera remitos para los clientes. | Próximamente `ESCRIBIR_VENTAS` |
| **Cliente** | Actor pasivo. No ingresa al sistema, pero es el sujeto de deudas de bandejas y receptor de remitos. | N/A |

## Permisos Planos Reales (seedeos en `DataInitializer`)

Los permisos definen qué acciones exactas se pueden realizar. Los roles son simplemente agrupaciones de estos permisos.

| Permiso | Descripción |
|---------|-------------|
| `LEER_STOCK` | Ver inventario actual de productos. |
| `ESCRIBIR_STOCK` | Descontar o agregar stock. |
| `ESCRIBIR_VENTAS` | Crear ventas (ya seedeado; en uso con `us-013`). |
| `LEER_CLIENTES` | Ver listado y detalle de clientes. |
| `ESCRIBIR_CLIENTES` | Crear/editar clientes. |
| `LEER_INSUMOS` | Ver insumos. |
| `ESCRIBIR_INSUMOS` | Crear/editar insumos. |
| `ADMIN_DB` | Gestión de usuarios, roles y permisos (panel de Admin). |

> **Nota:** En versiones anteriores existieron strings `VIVERO_LEER_STOCK`/`VIVERO_ESCRIBIR_STOCK` (stage inicial). Fueron reemplazados por los planos actuales. No usar los prefijos `VIVERO_*`.

## Matriz de Roles y Permisos (ejemplos del seed)

| Rol | Permisos Incluidos |
|-----|--------------------|
| **JEFE** | `ADMIN_DB`, `LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`, `LEER_CLIENTES`, `ESCRIBIR_CLIENTES`, `LEER_INSUMOS`, `ESCRIBIR_INSUMOS` |
| **VENDEDOR** | `LEER_STOCK`, `ESCRIBIR_VENTAS`, `LEER_CLIENTES` |
| **OPERARIO** | `LEER_STOCK`, `ESCRIBIR_STOCK` |