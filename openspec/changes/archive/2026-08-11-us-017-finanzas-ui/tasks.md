## 1. DTOs de respuesta (backend)

- [x] 1.1 Crear `DashboardResumenDTO` en `backend/src/main/java/com/vivero/gestion/dto/` con getters/setters manuales para `totalVentas` (BigDecimal), `totalCostos` (BigDecimal), `gananciaNeta` (BigDecimal) y `margen` (BigDecimal o Double)
- [x] 1.2 Crear `VentaLiteDTO` en `backend/src/main/java/com/vivero/gestion/dto/` con getters/setters manuales para `id` (Long), `nroVenta` (String o Long), `fecha` (LocalDateTime), `clienteNombre` (String), `totalFinal` (BigDecimal), `estadoDePago` (String) y `metodoPago` (String)

## 2. Capa de acceso a datos (sin tocar entidades)

- [x] 2.1 En `VentaRepository` agregar consulta de agregación JPQL que retorne total de ventas del período (`Venta.fecha` entre desde/hasta): `SUM(v.totalFinal)` como `BigDecimal` (usar `VentaDetalle.totalSubtotal` o el campo total correspondiente tras validar en el modelo real) — implementado como `sumarTotalVentas(desde, hasta)`
- [x] 2.2 En `VentaRepository` agregar consulta de listado paginado (Spring Data `Page<VentaLiteDTO>` con proyección de interfaz o `SELECT NEW`) de ventas del período ordenado por `fecha` descendente — implementado como `listarVentasPorRango(desde, hasta, pageable)`
- [x] 2.3 En `VentaDetalleRepository` (o el repositorio correspondiente) agregar consulta agregada de costo de lo vendido: `SUM(Producto.precioCosto * VentaDetalle.cantidad)` para detalles de ventas con `Venta.fecha` en el rango (join con Producto) — corregido tras aprobación: `SELECT COALESCE(SUM(COALESCE(p.precioCosto, 0) * d.cantidad), 0)` (usa `precioCosto` real, no `precio`)
- [x] 2.4 En `InsumoRepository` agregar consulta agregada `SUM(i.costo)` para insumos con `fechaCompra` entre desde/hasta — corregido: `sumarGastosInsumos(desde, hasta)` con `WHERE i.fechaCompra BETWEEN :desde AND :hasta`; el campo de costo real del insumo es `precio`
- [x] 2.5 Verificar que ninguna consulta nueva use `findAll()` sin límite (solo agregaciones y `Page`)

## 3. Service y Controller de Finanzas

- [x] 3.1 Crear `FinanzasService` (interfaz) y `FinanzasServiceImpl` en `services/` (y `services/impl/`) con métodos `resumen(desde, hasta)` → `DashboardResumenDTO` y `listarVentas(desde, hasta, pageable)` → `Page<VentaLiteDTO>`; usar `@Transactional(readOnly = true)`
- [x] 3.2 Implementar cálculo en `resumen()`: `gananciaNeta = totalVentas − totalCostos`; `margen = (gananciaNeta / totalVentas) * 100` con manejo de división por cero (margen 0 si no hay ventas)
- [x] 3.3 Crear `FinanzasController` en `controllers/` con `GET /api/finanzas/resumen?desde=&hasta=` → `DashboardResumenDTO` y `GET /api/finanzas/ventas?desde=&hasta=&page=&size=` → `Page<VentaLiteDTO>`; ambos con `@PreAuthorize("hasAuthority('ADMIN_DB')")` y `@Operation` documentado
- [x] 3.4 Validar manejo de parámetros de fecha: valores por defecto (default mes en curso o todo el histórico), 400 si formato inválido, nunca exponer entidades JPA — se validó con @DateTimeFormat y handler MethodArgumentTypeMismatch → 400 en `GlobalExceptionHandler.java`

## 4. Pruebas de backend (mínimas, sin mocks de DB)

- [ ] 4.1 Escribir test de `FinanzasServiceImpl.resumen()` con base real/Testcontainers: verifica totales correctos con datos seed de ventas e insumos en el rango — **NO implementado**: no existe infraestructura de tests con base real (ni Testcontainers ni H2 en `pom.xml`; el único test es `BackendApplicationTests.contextLoads` de contexto) y la regla dura prohíbe build/ejecución Maven para validar. Requiere un change/infra de testing dedicado.
- [ ] 4.2 Escribir test de período sin ventas: el resumen devuelve 0s y margen 0 sin errores — **NO implementado**: misma limitación que 4.1 (sin infraestructura de base real + no-build).
- [ ] 4.3 Escribir test de `listarVentas()` paginado: página fuera de rango devuelve página vacía con metadatos consistentes — **NO implementado**: misma limitación que 4.1 (sin infraestructura de base real + no-build).

## 5. Frontend — hook de API y página Finanzas

- [x] 5.1 Agregar en el módulo de servicios/Axios existente (`frontend/src/api/` o equivalente) las funciones `fetchResumenFinanzas(desde, hasta)` y `fetchVentasFinanzas(desde, hasta, page, size)` reutilizando el interceptor JWT — en `frontend/src/api/finanzas.api.js`
- [x] 5.2 Crear `frontend/src/pages/Finanzas.jsx` (PascalCase) con selector de **Año** (default: año en curso), `useQuery` para el resumen y el listado paginado (TanStack Query), estado de loading/error — refactorizado a `useQuery` con queryKeys `['finanzas','resumen',{desde,hasta}]` y `['finanzas','ventas',{desde,hasta,page,size}]`; `@tanstack/react-query` instalado (v5, declarado en el stack del proyecto) y `QueryClientProvider` agregado en `main.jsx`.
- [x] 5.3 Renderizar tarjetas KPI: total ventas, total costos, ganancia neta, margen % (con `cursor-pointer` en elementos interactivos, iconos `lucide-react`)
- [x] 5.4 Renderizar cruce Ventas vs Costos del período y tabla de ventas paginada con `VentaLiteDTO` (cliente, fecha, total, estado de pago, método de pago)
- [x] 5.5 Feedback de errores y éxito exclusivamente vía `useUIStore` (`pushToast`); nunca `alert`/`confirm` nativos — errores 403 → `denyAccess`, resto → `pushToast`

## 6. Wiring de navegación y protección

- [x] 6.1 Agregar ruta `/finanzas` (o `/reportes`) en el router existente apuntando a `Finanzas.jsx`, protegida con el mecanismo de rutas de `ui-rbac-profile` (permiso `ADMIN_DB`); sin permiso → pantalla de permiso denegado vía `useUIStore.denyAccess` — en `App.jsx` con `ProtectedRoute requiredPermission="ADMIN_DB"`
- [x] 6.2 Agregar entrada "Finanzas" en el sidebar de `DashboardLayout.jsx` (icono `lucide-react`, `cursor-pointer`) visible únicamente si el store de sesión tiene `ADMIN_DB`
- [x] 6.3 Verificar que para roles sin `ADMIN_DB` (VENDEDOR/OPERARIO) la entrada no se renderiza ni la ruta es accesible — verificado por inspección: `navGroups` filtra por `hasPermission` y `ProtectedRoute` bloquea la ruta

## 7. Verificación final

- [x] 7.1 Correr `npm run lint` en `frontend/` y verificar cero errores (sin build; regla dura del proyecto) — ejecutado: **0 errores** (warnings pre-existentes en otros archivos no relacionados)
- [x] 7.2 Revisar que los endpoints no devuelvan entidades JPA (solo `DashboardResumenDTO`, `VentaLiteDTO` y `Page`) y que `FinanzasController` no use repositorios directo — verificado por inspección (Controller → Service → Repository, DTOs de request/response)
- [ ] 7.3 Verificación manual sugerida al usuario: JEFE ve tablero y KPIs correctos; VENDEDOR no ve la sección — pendiente de verificación manual del usuario

## Work extra aprobado por el usuario (opciones 1A/2A/3)

- [x] 1A: Campo `precioCosto` (BigDecimal, nullable) agregado a `Producto.java`, expuesto en `ProductoDTO` y mapeado en `ProductoServiceImpl`; campo editable en `ProductoForm.jsx`. Decisiones en `design.md` (D6).
- [x] 2A: Campo `fechaCompra` (LocalDateTime, nullable) agregado a `Insumo.java`, expuesto en `InsumoDTO` y mapeado en `InsumoServiceImpl`; campo editable en `InsumoForm.jsx`. Decisiones en `design.md` (D6).
- [x] 3: `Finanzas.jsx` refactorizado a TanStack Query (`useQuery` + queryKeys dependientes de desde/hasta/page); `@tanstack/react-query` instalado y `QueryClientProvider` agregado en `main.jsx`.

## Work extra: Costo Histórico + Selector de Año

- [x] 4: Selector de Año en `Finanzas.jsx`: reemplazo de inputs date (desde/hasta) por dropdown de Año Fiscal; el frontend calcula `desde=YYYY-01-01` y `hasta=YYYY-12-31`.
- [x] 5: Campo `precioCostoHistorico` (BigDecimal, nullable, precision 10 scale 2) agregado a `VentaDetalle.java`. Al crear la venta, `VentaServiceImpl` congela `producto.getPrecioCosto()` en este campo (mismo patrón que `precioUnitarioHistorico`).
- [x] 6: Query `sumarCostoVendido` en `VentaDetalleRepository` refactorizada: usa `d.precioCostoHistorico` directo (sin JOIN a `Producto`), con `COALESCE` para ventas anteriores al refactor.
- [x] 7: Nota informativa en `Finanzas.jsx` actualizada: de advertencia amber ("precio vigente") a nota verde ("costo histórico al momento de la venta").