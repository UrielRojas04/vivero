## Context

El ERP de vivero ya registra ventas (`Venta`/`VentaDetalle` con `precioUnitarioHistorico`), pagos (`Pago`), insumos (`Insumo.costo`, `fechaCompra`) y productos (`Producto.precioCosto`, `precioVenta`), pero el Jefe no tiene forma de ver la rentabilidad. `us-017-finanzas-ui` entrega el tablero final: cruce de **Ventas vs Costos** y ganancia neta por período. Depende de `us-013-ventas-core` (entidades transaccionales) y `us-008-frontend-insumos` (catálogo de costos), ambos archivados. El RBAC es plano y el único permiso que habilita finanzas es `ADMIN_DB` (rol JEFE) — **no existe un permiso `LEER_VENTAS`**.

Restricciones de contrato: backend Java 21 / Spring Boot 3.4 con estricta separación Controller → Service (`@Transactional`) → Repository → Model; **nunca** exponer entidades JPA en endpoints (siempre DTOs); sin `findAll()` sin límite (paginación); frontend React 19 / Vite / Tailwind v4 con componentes PascalCase, iconos `lucide-react`, feedback vía `useUIStore` (nunca `alert`/`confirm`).

## Goals / Non-Goals

**Goals:**
- Endpoint de agregado financiero que devuelva, por período: `totalVentas`, `totalCostos`, `gananciaNeta` y `margen` %, vía DTO de resumen.
- Endpoint de listado de ventas del período, paginado, con DTOs compactos y sin fugas de entidades.
- Pantalla React "Finanzas" (KPIs + cruce Ventas vs Costos + listado paginado por rango de fechas) protegida por `ADMIN_DB`, con entrada oculta en el sidebar para roles sin permiso.
- Reutilizar entidades existentes — **cero tablas/entidades nuevas** (se agregan dos columnas a tablas existentes vía `ddl-auto=update`, ver D6).

**Non-Goals:**
- No crear entidades contables nuevas (asientos, planes de cuenta, costos históricos por ítem).
- No calcular costo histórico exacto por producto al momento de la venta (ver Decisión D2).
- No exportar PDF/CSV de reportes (fuera de alcance; puede ser change futuro).
- No reportes multi-período comparativos, gráficos avanzados ni alertas de umbral.

## Decisions

### D1. Backend: un `FinanzasController` + `FinanzasService` + proyecciones Spring Data en repositorios de lectura
Endpoint `GET /api/finanzas/resumen?desde=...&hasta=...` → `DashboardResumenDTO` y `GET /api/finanzas/ventas?desde=...&hasta=...&page=0&size=20` → `Page<VentaLiteDTO>`. El Service orquesta agregaciones de **solo lectura** usando Spring Data projections o queries JPQL con `SELECT NEW` hacia DTOs, sobre los repositorios existentes (`VentaRepository`, `ProductoRepository`, `InsumoRepository`) — sin escribir en BD (sin `@Transactional` de escritura; `@Transactional(readOnly = true)` si se necesita consistencia de lectura).

**Alternativa considerada**: un `ReporteController` genérico con un solo endpoint agnóstico. **Rechazada**: mezcla responsabilidades y complica la UX del frontend; dos endpoints acotados responden directo a los requirements de la spec.

### D2. Cálculo del costo: `precioCostoHistorico` congelado en `VentaDetalle` al momento de la venta; insumos por `precio` y `fechaCompra`
Se agregó el campo `precioCostoHistorico` (BigDecimal, nullable, precision 10 scale 2) a `VentaDetalle`. Al crear la venta, `VentaServiceImpl` copia `producto.getPrecioCosto()` a este campo, exactamente como ya se hacía con `precioUnitarioHistorico` para el precio de venta. Para `totalCostos`:
- **Costo de lo vendido**: `SUM(COALESCE(d.precioCostoHistorico, 0) * d.cantidad)` sobre detalles de ventas cuya `fecha` cae en el rango (JPQL directo sobre `VentaDetalle`, sin JOIN a `Producto`).
- **Costo de insumos**: `SUM(Insumo.precio)` para insumos con `fechaCompra` entre desde/hasta (`InsumoRepository.sumarGastosInsumos(desde, hasta)`).
`gananciaNeta = totalVentas − totalCostos`; `margen = (gananciaNeta / totalVentas) * 100` (0 si no hay ventas).

**Alternativa anterior (D2 original)**: usar `Producto.precioCosto` vigente al momento de la consulta. **Reemplazada**: produce informes históricos imprecisos cuando el costo cambia con el tiempo (ej. inflación). La forma profesional es congelar el costo al momento de la transacción.

### D3. Seguridad: reutilizar el filtro JWT existente + `@PreAuthorize("hasAuthority('ADMIN_DB')")`
Los permisos planos se verifican vía `JwtFilter` + authorities. Ambos endpoints de finanzas se protegen con `@PreAuthorize` por `ADMIN_DB` (solo el JEFE ve rentabilidad, consistente con la matriz de roles de la KB). El frontend hereda la protección: se limpiaron los prefijos `VIVERO_*` obsoletos en `us-011/ui-feedback-modals`; usar el string plano `ADMIN_DB`.

**Alternativa considerada**: crear permiso `LEER_FINANZAS` nuevo. **Rechazada**: la KB explícitamente prohíbe inventar permisos; `ADMIN_DB` ya cubre al único actor de finanzas.

### D4. Frontend: página `Finanzas.jsx` + hooks TanStack Query + entrada en sidebar protegida
- `pages/Finanzas.jsx` (PascalCase): estado local de selección de **Año** (predeterminado: año en curso, convirtiendo a rango `desde=YYYY-01-01` y `hasta=YYYY-12-31`), consulta con `useQuery` a `/api/finanzas/resumen`, listado paginado con `useQuery` clave por página, y render de 4 tarjetas KPI + cruce visual + tabla de ventas.
- Entrada de sidebar en `DashboardLayout.jsx` visible **solo si** el store de sesión tiene el permiso `ADMIN_DB`; la ruta usa el mecanismo de protección de rutas existente (pantalla de permiso denegado vía `useUIStore.denyAccess`, patrón ya usado en `ui-rbac-profile`).
- Feedback de carga/error con `pushToast` de `useUIStore`; botones con `cursor-pointer`; iconos `lucide-react`.
- API client: función `fetchResumenFinanzas()`/`fetchVentasFinanzas()` en el módulo de Axios existente (reutilizando el interceptor JWT).

**Alternativa considerada**: componente `recharts` para gráficos de línea histórica. **Rechazada**: los requirements actuales piden KPIs y cruce (puede renderizarse con simple diseño Tailwind); recharts queda como mejora futura y evita dependencia nueva en este change.

### D5. Sin dependencias nuevas
`jspdf`/`html-to-image` ya instalados (us-016) no se usan acá. No se agregan librerías nuevas de backend ni frontend; las agregaciones se hacen con JPQL/proyecciones de Spring Data y el cruce visual con Tailwind.

### D6. Corrección post-apply: campos de costo/fecha agregados al modelo real (opciones 1A/2A aprobadas)
El diseño original asumía que el modelo ya tenía `Producto.precioCosto`, `Producto.precioVenta`, `Insumo.costo` e `Insumo.fechaCompra`. Al inspeccionar el modelo real se confirmó que **no existían** (el producto solo tenía `precio` de venta y el insumo solo `precio`/`stock` sin fecha). Sin estos datos el tablero de rentabilidad no podía mostrar costos reales, así que el usuario aprobó agregarlos:
- `Producto.precioCosto` (`BigDecimal`, `precision=10, scale=2`, **nullable**): se elige nullable porque `spring.jpa.hibernate.ddl-auto=update` sobre tablas existentes fallaría al agregar una columna `NOT NULL` sin valor por defecto sobre filas existentes; las queries de costo usan `COALESCE(precioCosto, 0)` para lidiar con el valor ausente. Expuesto en `ProductoDTO` (request/response) y editable desde `ProductoForm.jsx`.
- `Insumo.fechaCompra` (`java.time.LocalDateTime`, nullable): consistente con `Venta.fecha`/`Pago.fecha` (el resto del modelo usa `LocalDateTime`) y alineado con los rangos `LocalDateTime` que ya usa `FinanzasService`. Expuesto en `InsumoDTO` (request/response) y editable desde `InsumoForm.jsx`.
- `InsumoRepository.sumarGastosInsumos()` ahora recibe `desde`/`hasta` y filtra `WHERE i.fechaCompra BETWEEN :desde AND :hasta`; `FinanzasServiceImpl.resumen()` pasa el rango (antes sumaba todos los insumos sin filtro).
- **Nota de seed**: `DataInitializer` no crea productos/insumos demo (solo roles/usuarios), por lo que no hubo seed que actualizar para estos campos; la columna nullable evita romper filas ya existentes.

**Alternativa considerada**: crear columnas `NOT NULL` con valor por defecto vía migración manual. **Rechazada**: el proyecto no usa Flyway/Liquibase y `ddl-auto=update` no puede backfillear; nullable + `COALESCE` es la opción segura y consistente con la arquitectura actual.

## Risks / Trade-offs

- **[R1] ~~Costo histórico impreciso~~ RESUELTO** → Se agregó `precioCostoHistorico` a `VentaDetalle`. El costo se congela al momento de la venta, igual que el precio de venta (`precioUnitarioHistorico`). **Nota**: las ventas creadas ANTES de este refactor tendrán `precioCostoHistorico = null`, y la query usa `COALESCE(d.precioCostoHistorico, 0)` para esos casos.
- **[R2] Semántica de "insumos del período"** → Sumar insumos comprados en el rango puede no alinear compras con consumo real. → **Mitigación**: la spec lo define explícitamente como gasto de insumos del período; alinear expectativas del dueño en el tablero (etiqueta clara "Gastos en insumos").
- **[R3] Permiso único `ADMIN_DB`** → Si mañana un `VENDEDOR` necesita leer rentabilidad, habría que crear permiso nuevo. → **Mitigación**: aceptado por decisión de la KB (solo JEFE ve finanzas); migración trivial si cambia (nuevo permiso + seed en `DataInitializer`).
- **[R4] Performance de agregaciones con muchos datos** → Sumas sobre períodos largos pueden pesar. → **Mitigación**: consultas agregadas a nivel BD (no traer filas a la JVM), paginación en el listado, e índices existentes sobre fechas de venta/insumo.

## Migration Plan

- La única alteración de esquema son **dos columnas agregadas por `ddl-auto=update`** (`productos.precio_costo` y `insumos.fecha_compra`), ambas nullable para no romper filas existentes y porque `ddl-auto=update` no puede agregar columnas `NOT NULL` sin default. Sin entidades nuevas, sin Flyway/Liquibase.
- Backend: agregar DTOs, Service y Controller; entidades modificadas solo en los campos nuevos (valor nullable); repositorios existentes solo con métodos de query nuevos/corregidos.
- Frontend: agregar página + ruta + entrada de nav protegida; los formularios `ProductoForm`/`InsumoForm` se editan (no se crean nuevos) para exponer `precioCosto`/`fechaCompra`.
- Rollback: eliminar los endpoints, la página/ruta, los campos nuevos y el `QueryClientProvider`; las columnas se pueden dropear manualmente (no hay datos críticos atados).

## Open Questions

- ¿El listado de ventas de Finanzas debe incluir ventas con pagos pendientes y su saldo? → Se asume que sí (la tabla muestra estado de pago), pero se puede limitar si el dueño solo quiere ventas cobradas. Default: mostrar todas las del período con su estado.
- ¿El rango de fechas debe tener límite máximo (ej. 1 año) para protección de performance? → Default: sin límite por ahora (R4 se mitiga con agregación a nivel BD); decisión post-prueba con datos reales.