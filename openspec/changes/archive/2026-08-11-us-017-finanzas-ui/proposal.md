## Why

El dueño del negocio no tiene forma de ver la rentabilidad del vivero: existen ventas (con precios históricos por producto), costos de productos (`precioCosto`) e insumos (`Insumo.costo`), pero no hay ningún tablero que cruce totales de ventas vs costos y muestre la ganancia neta. Este change entrega el resultado final del ERP: **reportes de rentabilidad (Ventas vs Costos)** para evaluar ganancias por período.

## What Changes

- **Nuevos endpoints de agregación financiera** en el backend (Controller → Service → Repository) que consultan las entidades existentes `Venta`, `VentaDetalle`, `Pago`, `Insumo` y `MovimientoStock` mediante agregaciones a nivel BD — **sin crear entidades contables nuevas** (ver Capabilities).
- **DTOs de agregados** (`DashboardResumenDTO`, `VentaLiteDTO`, etc.) — nunca se devuelven entidades JPA directo; paginación en los listados.
- **Pantalla de Finanzas en el frontend** (React, `Dashboard` estilo finanzas) con tarjetas KPI (ventas, costos, rentabilidad neta, margen %), cruce Ventas vs Costos y listado de ventas filtrable por rango de fechas con paginación.
- **Acceso por permisos planos existentes**: solo usuarios con `ADMIN_DB` (Jefe) y `LEER_VENTAS`/lectura de insumos según los roles seed reales — la UI oculta la sección sin el permiso (nav wiring en `DashboardLayout`).
- **Wiring de navegación**: nueva sección "Finanzas" en el sidebar de `DashboardLayout`, ruta protegida.
- **Sin nuevas entidades**: no se agregan tablas contables/costos nuevos; se reutilizan las existentes.

## Capabilities

### New Capabilities
- `finanzas-ui`: Dashboards y agregaciones de rentabilidad — endpoints de agregados financieros (ventas por período, margen/beneficio neto, listado paginado por rango de fechas), permisos de acceso y pantalla React de Finanzas (KPIs + cruce Ventas vs Costos).

### Modified Capabilities
<!-- Ninguna spec existente cambia a nivel de requirements: ventas-core (transacción de venta), catalogo-insumos, user-rbac y frontend-core (nav) no modifican su contrato; la visibilidad de la nueva sección la define la spec finanzas-ui. -->

## Impact

- **Backend** (`backend/src/main/java/com/vivero/gestion/`): nuevo `FinanzasController`, `FinanzasService` (`@Transactional` de lectura no aplica, readonly), `FinanzasRepository` (interfaces de agregación con Spring Data projections / queries JPQL/nativas de solo lectura) y DTOs en `/dto`. No se tocan las entidades existentes.
- **Frontend** (`frontend/src/`): nueva página `pages/Finanzas.jsx` (PascalCase), componente(s) de UI de KPIs (`Dashboard` y helpers), hook API con TanStack Query, ruta y entrada en el sidebar de `DashboardLayout`, protección por permiso (se oculta sin `ADMIN_DB`).
- **Permisos**: se reutilizan permisos planos seedeados (`ADMIN_DB`, `LEER_INSUMOS`); sin permisos ni roles nuevos.
- **Dependencias**: `us-013-ventas-core` (entidades Venta/VentaDetalle/MovimientoStock) y `us-008-frontend-insumos` (catálogo de costos) — ambos archivados.
- **Sin build ni Maven** durante propose/design (regla dura del proyecto).

## Criterios de éxito (medibles)

- El Jefe puede ver, en un solo tablero, el total de ventas, el total de costos (productos + insumos) y la ganancia neta del período seleccionado.
- El listado de ventas por rango de fechas paginado responde sin fugas (DTOs, sin entidades).
- La nueva sección se oculta automáticamente para roles sin el permiso correspondiente.
- No se agregan entidades JPA nuevas al modelo.