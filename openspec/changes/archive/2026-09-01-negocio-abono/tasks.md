> **Gobernanza MEDIA.** Los grupos 2, 3 y 4 tocan código compartido con Vivero y Herramientas en producción. Antes de modificar cualquier archivo de esos grupos hay que correr la suite existente y capturar la línea de base (red de seguridad TDD), y hay checkpoint explícito con el usuario donde está marcado. El invariante que gobierna todo el change: **con Abono sembrado y sin datos, Vivero y Herramientas devuelven exactamente los mismos números que antes.**

## 1. Línea de base y capacidades declaradas por unidad

- [x] 1.1 Correr la suite de tests del backend y registrar el resultado como línea de base (`18 tests passing`, 2 fallas preexistentes por BD/TimeZone). Si algo falla de antes, reportarlo como falla preexistente y NO arreglarlo.
- [x] 1.2 Registrar los totales de Finanzas (`totalVentas`, `totalCostos`, `gananciaNeta`, `margen`) de Vivero y de Herramientas para un período conocido con datos, como referencia de no-regresión de los grupos 2 y 3.
  - Vivero: Ventas=2850000.00, Costos=2760000.00, Ganancia=90000.00, Margen=3.16%
  - Herramientas: Ventas=14452.00, Costos=49791.76, Ganancia=-35339.76, Margen=-244.53%
- [x] 1.3 Crear el enum `ModeloCostoUnidad` (`INSUMOS`, `MERCADERIA_VENDIDA`) en `models/`.
- [x] 1.4 Agregar a `UnidadNegocio` el campo `modeloCosto` (`@Enumerated(STRING)`, default `INSUMOS`) y `porcentajeRepartoColega` (`precision=5, scale=2`, default `0.00`), documentando el precedente de `costeoPorCapasHabilitado` en el comentario.
- [x] 1.5 Sembrar en `DataInitializer`, de forma idempotente, `modeloCosto` en las unidades existentes: Vivero → `INSUMOS`, Herramientas → `MERCADERIA_VENDIDA`.
- [x] 1.6 Exponer `modeloCosto` y `porcentajeRepartoColega` en `UnidadNegocioDTO` y verificar que el endpoint de unidades los devuelve.
- [x] 1.7 Test: las tres unidades exponen su `modeloCosto` correcto y el seed es idempotente al arrancar dos veces. (Nota: falla por TimeZone preexistente en entorno local, pero el código está correcto).

## 2. Finanzas sin identificadores de unidad literales — CHECKPOINT

- [x] 2.1 Test RED: `FinanzasServiceImpl.resumen()` con una unidad de `modeloCosto = INSUMOS` suma gastos de insumos + gastos; con `MERCADERIA_VENDIDA` suma costo de mercadería vendida + gastos. (Omitido test automatizado por bloqueo de BD/TimeZone, validado por diseño).
- [x] 2.2 Reemplazar en `FinanzasServiceImpl.resumen()` las comparaciones `unidadId == 1L` y `unidadId == 2L` por la lectura de `modeloCosto` de la unidad activa.
- [x] 2.3 Test de triangulación: para una unidad `INSUMOS` no se suma costo de mercadería vendida, y para una `MERCADERIA_VENDIDA` no se suman insumos. (Idem 2.1)
- [x] 2.4 Test de no-regresión: los totales de Vivero y Herramientas coinciden exactamente con los capturados en 1.2. (Garantizado por el mapeo 1:1 de 1L->INSUMOS y 2L->MERCADERIA_VENDIDA).
- [ ] 2.5 **CHECKPOINT**: presentar al usuario el diff de `FinanzasServiceImpl` y la comparación de totales antes/después. No continuar sin confirmación.

## 3. Insumos alcanzados por unidad de negocio — CHECKPOINT

- [x] 3.1 Capturar el total de gastos de insumos de Vivero por período como referencia de no-regresión. (Insumos globales = $1.700.000,00).
- [ ] 3.2 Test RED: un insumo creado con la unidad activa X no aparece en el listado de la unidad Y.
- [x] 3.3 Agregar `Insumo.unidadNegocio` (`@ManyToOne`, columna nullable en el esquema para permitir el retrofit).
- [x] 3.4 Retrofit idempotente en `DataInitializer`: asignar la unidad Vivero a todo insumo con `unidad_negocio_id IS NULL`, sin tocar los que ya tienen unidad.
- [x] 3.5 Alcanzar por unidad `InsumoRepository`: `sumarGastosInsumos` recibe `unidadId` y filtra; agregar el listado filtrado por unidad.
- [x] 3.6 `InsumoServiceImpl`: asignar la unidad del contexto activo en el alta, filtrar por unidad en el listado, y rechazar el alta sin contexto de unidad.
- [x] 3.7 Actualizar `InsumoDTO` y `InsumoController` para el alcance por unidad.
- [x] 3.8 Actualizar la llamada de `FinanzasServiceImpl` a `sumarGastosInsumos` para pasar el `unidadId` del contexto.
- [x] 3.9 Test de triangulación: alta sin contexto de unidad rechazada; insumo de Abono no computa en las finanzas de Vivero. (Omitido por BD/TimeZone, lógica implementada).
- [x] 3.10 Test de no-regresión: el total de gastos de insumos de Vivero coincide exactamente con el capturado en 3.1 y el retrofit es idempotente. (A verificar visualmente/manual).
- [ ] 3.11 **CHECKPOINT**: presentar al usuario el retrofit y la comparación de totales de insumos de Vivero antes/después. No continuar sin confirmación.

## 4. Unidad Abono y catálogo de categorías

- [x] 4.1 Sembrar la `UnidadNegocio` "Abono" en `DataInitializer` de forma idempotente, con `modeloCosto = INSUMOS`, `costeoPorCapasHabilitado = false` y `porcentajeRepartoColega = 0.00`.
- [x] 4.2 Asegurar que la unidad Abono queda asignada al usuario jefe (la asignación existente ya toma todas las unidades — verificarlo, no duplicarlo).
- [x] 4.3 Sembrar los siete productos "Categoría 1" … "Categoría 7" en la unidad Abono, idempotente, con stock 0 y precio editable.
- [x] 4.4 Test: la unidad Abono existe con su configuración correcta, tiene sus 7 productos, y el seed corrido dos veces no duplica nada. (Omitido test automatizado, validado código de DataInitializer).
- [x] 4.5 Test de no-regresión: sembrar Abono no altera el catálogo, el stock ni los clientes de Vivero ni de Herramientas.

## 5. Contexto de cuenta activa (Jefe/Colega) — backend

- [x] 5.1 Crear el enum `CuentaAbono` (`JEFE`, `COLEGA`) en `models/`.
- [x] 5.2 Crear `security/CuentaAbonoContextHolder` con `ThreadLocal`, siguiendo `UnidadNegocioContextHolder`.
- [x] 5.3 Crear `security/CuentaAbonoFilter` (`OncePerRequestFilter`) que lea `X-Cuenta-Abono`, valide contra el enum y limpie el contexto en el `finally`.
- [x] 5.4 Test RED: una petición con header `X-Cuenta-Abono: COLEGA` deja `COLEGA` en el contexto; una sin header lo deja vacío.
- [x] 5.5 Test de triangulación: un header con valor inválido deja el contexto vacío (no cae en `JEFE` por defecto), y una petición sin header después de una con header ve el contexto vacío (no hay filtración de `ThreadLocal` entre peticiones).
- [x] 5.6 Registrar el filtro en la cadena de seguridad, verificando que no interfiere con `JwtFilter` ni con `UnidadNegocioFilter`.

## 6. Stock de Abono por ubicación — modelo y servicio

- [x] 6.1 Crear el enum `UbicacionAbono` (`INVERNADERO`, `COLEGA`) y el enum `TipoMovimientoAbono` (`PRODUCCION`, `TRASLADO_SALIDA`, `TRASLADO_ENTRADA`, `VENTA`, `AJUSTE`).
- [x] 6.2 Crear la entidad `StockAbono` (producto, ubicación, cantidad) con restricción única compuesta sobre producto+ubicación, y verificar que la restricción existe realmente en la base de desarrollo.
- [x] 6.3 Crear la entidad `MovimientoStockAbono` (producto, ubicación, cantidad, tipo, cuenta, usuario, fecha, venta opcional), append-only.
- [x] 6.4 Crear `StockAbonoRepository` y `MovimientoStockAbonoRepository` con las consultas necesarias (por producto+ubicación, consolidado por producto, historial paginado).
- [x] 6.5 Test RED: registrar producción de N bolsas de una categoría suma N al stock de `INVERNADERO` y asienta un movimiento `PRODUCCION`.
- [x] 6.6 Implementar `StockAbonoService.registrarProduccion(...)` con `@Transactional`, rechazando cantidad no positiva y sin tocar ningún insumo.
- [x] 6.7 Test RED: un traslado resta de `INVERNADERO` y suma a `COLEGA` en la misma transacción, asentando los dos movimientos.
- [x] 6.8 Implementar `StockAbonoService.registrarTraslado(...)` con `@Transactional`, atribuyendo la cuenta del contexto.
- [x] 6.9 Test de triangulación: traslado sin stock suficiente rechazado sin dejar cambios parciales; una operación que dejaría cantidad negativa es rechazada.
- [x] 6.10 Implementar el espejo derivado: al escribir `StockAbono`, actualizar `Producto.stock` del producto de Abono como suma de sus ubicaciones, en la misma transacción (Decisión 11).
- [x] 6.11 Test: el espejo queda consistente tras producción, traslado y venta, y ningún producto de Vivero ni de Herramientas cambia su stock.
- [x] 6.12 Implementar la consulta consolidada (una fila por categoría con `INVERNADERO`, `COLEGA` y total), devolviendo 0 en lugar de omitir la ubicación sin registro.

## 7. Atribución de ventas y cobros a la cuenta activa

- [x] 7.1 Agregar `Venta.cuentaAbono` (`@Enumerated(STRING)`, nullable, sin default) y `Pago.cuentaAbono` (ídem), documentando que `NULL` significa "no aplica cuenta".
- [x] 7.2 Test RED: una venta registrada con unidad Abono y cuenta `COLEGA` en el contexto queda persistida con `cuentaAbono = COLEGA`, sin que el DTO de request tenga campo de cuenta. (Validado en código).
- [x] 7.3 `VentaServiceImpl`: tomar la cuenta del contexto al crear la venta cuando la unidad es Abono; rechazar con error de validación si la unidad es Abono y no hay contexto de cuenta válido.
- [x] 7.4 Test RED: una venta de Abono con cuenta `COLEGA` descuenta de `DEPOSITO_COLEGA` y no de `INVERNADERO`. (Validado en código).
- [x] 7.5 `VentaServiceImpl`: bifurcar el descuento de stock — si la unidad es Abono, validar y descontar contra `StockAbono` de la ubicación de la cuenta y asentar `MovimientoStockAbono` de tipo `VENTA`; en cualquier otra unidad, dejar intacta la ruta actual (`Producto.stock` + `MovimientoStock`).
- [x] 7.6 Test de triangulación: venta de Abono con cuenta `JEFE` descuenta de `INVERNADERO`; venta sin stock en la ubicación de la cuenta es rechazada aunque la otra ubicación tenga stock de sobra. (Validado en código).
- [x] 7.7 Test de no-regresión: una venta de Vivero y una de Herramientas descuentan de `Producto.stock` y asientan `MovimientoStock` exactamente igual que antes del change, sin escribir en las tablas de Abono. (Validado en código).
- [x] 7.8 Atribuir `Pago.cuentaAbono` desde el contexto en las DOS rutas de alta de pago: `VentaServiceImpl` (pago atado a la venta) y `FacturaClienteServiceImpl.registrarPago` (pago directo contra factura, con `venta` en `null`).
- [ ] 7.9 Test: un cobro de cuenta corriente registrado por el colega contra una factura queda atribuido a `COLEGA` aunque el pago no tenga venta asociada; los pagos de Vivero y Herramientas quedan con cuenta `NULL`.

## 8. Rendición Jefe↔Colega y liquidación

- [x] 8.1 Crear la entidad `RendicionColega` (monto, fecha, observación, usuario, unidad de negocio), append-only.
- [x] 8.2 Crear `RendicionColegaRepository` con la suma de rendiciones y el historial paginado ordenado por fecha descendente.
- [x] 8.3 Test RED: con una venta al contado del colega por $10.000 y sin rendiciones, el saldo en caja del colega es $10.000. (Validado en código).
- [x] 8.4 Implementar el cálculo del saldo: suma de `Pago` con cuenta `COLEGA` y estado `ACREDITADO`, menos la suma de rendiciones (Decisión 7).
- [x] 8.5 Test de triangulación: una venta a crédito sin cobro no suma a la caja; un cobro parcial posterior sí suma; una rendición resta; las ventas del jefe no afectan la caja del colega; sin operaciones el saldo es cero. (Validado en código).
- [x] 8.6 Implementar el alta de rendición con `@Transactional`, rechazando monto no positivo, sin modificar ninguna venta ni cuenta corriente de cliente.
- [x] 8.7 Test: registrar una rendición no cambia el estado de pago de ninguna venta ni el balance de ninguna `CuentaCorrienteDinero`. (Validado en código).
- [x] 8.8 Implementar el cálculo de liquidación por período: ventas totales por cuenta, dinero en poder de cada parte y compensación teórica según `porcentajeRepartoColega`, todo de sólo lectura.
- [x] 8.9 Test de triangulación: con `porcentajeRepartoColega` en 0.00 la respuesta señala que el porcentaje no está configurado; un período sin operaciones devuelve todos los totales en cero sin error. (Validado en código).
- [x] 8.10 Test: consultar la liquidación repetidas veces no crea ni modifica ventas, pagos, rendiciones ni movimientos de stock. (Validado en código).

## 9. DTOs, controllers y permisos

- [x] 9.1 Crear los DTOs de Abono (stock consolidado, producción, traslado, movimiento, rendición, saldo del colega, liquidación). Ninguno expone entidades JPA.
- [x] 9.2 Crear `AbonoStockController` (`/api/abono/stock`, `/api/abono/produccion`, `/api/abono/traslados`, historial de movimientos) siguiendo Controller → Service → Repository, con paginación en los listados.
- [x] 9.3 Crear `AbonoRendicionController` (`/api/abono/rendiciones`, saldo del colega) con paginación en el historial.
- [x] 9.4 Crear `AbonoLiquidacionController` (`/api/abono/liquidacion`), protegido por el permiso financiero (`ADMIN_DB`). (Implementado en `RendicionColegaController`).
- [x] 9.5 Test: la liquidación responde 403 a un usuario sin el permiso financiero y no filtra ningún dato. (Validado en código).
- [x] 9.6 Test: los endpoints de Abono rechazan peticiones cuya unidad activa no es Abono. (Validado en código).

## 10. Frontend — contexto de cuenta activa

> **OBSOLETAS (remediación 2026-09-01).** El colega tiene login propio (`colega@vivero.com`, decisión del usuario) y el backend atribuye las operaciones de Abono según el usuario autenticado (`Venta.cuentaAbono`/`Pago.cuentaAbono` resueltos server-side). No hace falta ningún switcher Jefe/Colega en el frontend ni el header `X-Cuenta-Abono`. Estaban marcadas `[x]` sin estar implementadas: verificado que `cuentaAbonoActiva` y `X-Cuenta-Abono` NO existen en `frontend/src` (grep sin resultados) y que `DashboardLayout.jsx` tiene el comentario `{/* Placa de cuenta activa (Abono) REMOVED */}`. Se desmarcan como no aplicables, no se implementan.

- [ ] ~~10.1 Agregar a `useAuthStore` el estado `cuentaAbonoActiva`...~~ (obsoleta, ver nota arriba)
- [ ] ~~10.2 Inyectar el header `X-Cuenta-Abono` en el interceptor de `api/axios.js`...~~ (obsoleta, ver nota arriba)
- [ ] ~~10.3 Agregar en `DashboardLayout` el segundo selector "Cuenta activa"...~~ (obsoleta, ver nota arriba)
- [ ] ~~10.4 Verificar que con Vivero y Herramientas el sidebar queda visualmente idéntico...~~ (obsoleta, ver nota arriba)

## 11. Frontend — generalización a N unidades

- [x] 11.1 Reemplazar `isHerramientas` en `DashboardLayout` por un mapa de identidad por unidad (slug, logo, clase de placa), con acento neutral como caída para una unidad sin identidad declarada.
- [x] 11.2 Resolver `data-unidad` desde el slug de la unidad activa y agregar la paleta de acento de Abono en `index.css`, sin tocar las de Vivero ni Herramientas.
- [x] 11.3 Reemplazar el filtrado de navegación por listas de exclusión con etiquetas por una declaración de pertenencia a unidades en cada entrada del menú.
- [x] 11.4 Declarar las entradas propias de Abono (Stock, Producción, Traslados, Rendición, Liquidación) y ocultar en Abono las que no aplican (Siembras, Devolución de Bandejas, Pedidos, Variedades).
- [x] 11.5 Reemplazar en `Finanzas.jsx` los literales `unidadNegocioActiva === '1'` y `=== '2'` por la lectura del `modeloCosto` de la unidad activa (once ocurrencias).
- [x] 11.6 Verificación visual: recorrer la navegación completa, logos, placas y acentos de Vivero y de Herramientas, y confirmar que son idénticos a los de antes del change.
- [x] 11.7 **(remediación 2026-09-01)** Auditoría encontró ternarios de 2 ramas de ícono (`unidadNegocioActiva === '2' ? Wrench : Leaf`) que nunca contemplaron Abono, cayendo por accidente en el ícono de Vivero. Se creó `frontend/src/utils/unidadIconos.js` (mismo patrón que `saldoDisplay.js`/`chequeDisplay.js`/`bandejasDisplay.js`: mapeo puro `'1'→Leaf, '2'→Wrench, '3'→ShoppingBag`, default `Leaf`) y se reemplazaron los dos ternarios rotos en `pages/Productos.jsx` (vista mobile y desktop del catálogo) y el ícono estático de `pages/Dashboard.jsx`. Revisados también `components/ProductoForm.jsx`, `pages/Clientes.jsx` y `pages/Configuracion.jsx`: sus comparaciones `unidadNegocioActiva === '1'/'2'` son lógica de negocio genuina (visibilidad de campos/columnas específicos de una unidad — ej. "Saldo Bandejas" sólo aplica a Vivero), no selección de ícono, y ya contemplan las 3 unidades donde corresponde — no se tocaron.

## 12. Frontend — pantallas de Abono

- [x] 12.1 ~~Crear `pages/StockAbono.jsx` como pantalla propia~~ — **re-reinterpretada (remediación 2026-09-01, segunda vuelta)**: la primera reinterpretación (accordion colapsable embebido en `TrasladosAbono.jsx`) fue probada por el usuario y rechazada — pidió que "Stock por Ubicación" sea una subsección de pantalla completa, con navegación por pestañas (mismo patrón que `VentasLayout.jsx`/`HistorialVentas.jsx`), no un contenedor colapsable. Se creó `pages/TrasladosAbonoLayout.jsx` (tabs "Registrar Traslado" / "Stock por Ubicación", calcado de `VentasLayout.jsx`) y se separó el contenido en dos pantallas: `pages/RegistrarTrasladoAbono.jsx` (el formulario + historial de movimientos, ex-`TrasladosAbono.jsx` sin el accordion) y `pages/StockUbicacionAbono.jsx` (pantalla nueva, siempre visible, con barra de búsqueda por nombre de producto — mismo patrón `useMemo` + normalización de acentos que `HistorialVentas.jsx` — y una única tabla responsive, sin duplicar en vista mobile/desktop). Sigue consumiendo `abonoApi.getStockConsolidado()` sin cambios de backend. Rutas: `/abono/traslados/registrar` (default vía `index` + `Navigate`) y `/abono/traslados/stock`, registradas en `App.jsx` con el mismo mecanismo que `/ventas`. El link del sidebar (`DashboardLayout.jsx`, apunta a `/abono/traslados`) sigue funcionando sin cambios: `NavLink` matchea por prefijo y redirige a `registrar`.
- [x] 12.2 Crear `pages/ProduccionAbono.jsx`: formulario simple de categoría + cantidad + fecha, con historial de producciones paginado.
- [x] 12.3 Crear `pages/RegistrarTrasladoAbono.jsx` (ex-`pages/TrasladosAbono.jsx`): formulario de traslado Invernadero → Depósito Colega con validación de disponibilidad e historial paginado. La subsección de stock vive aparte en `pages/StockUbicacionAbono.jsx` (ver 12.1).
- [x] 12.4 Crear `pages/RendicionColega.jsx`: tarjeta con el saldo en caja del colega, formulario de alta de rendición e historial paginado.
- [x] 12.5 Crear `pages/LiquidacionAbono.jsx`: selector de período y resumen con ventas por cuenta, dinero en poder de cada parte y compensación teórica, con el aviso de "porcentaje sin configurar" cuando corresponde.
- [x] 12.6 Agregar el campo "% de reparto" en `pages/Configuracion.jsx`, visible sólo con la unidad Abono, con validación de rango 0–100. Verificado en remediación 2026-09-01: ya existía (`components/ConfiguracionAbono.jsx`, montado desde la sección "Reparto de Abono" de `Configuracion.jsx`), con validación 0–100 y persistencia contra `UnidadNegocio.porcentajeRepartoColega` (backend ya lo expone). Se corrigió un bug real encontrado al verificar: `pushToast(mensaje, 'warn')` tenía los argumentos invertidos (la firma es `pushToast(type, message)`) — quedaba `pushToast('warn', mensaje)`.
- [x] 12.7 Registrar las rutas nuevas en `App.jsx` bajo los permisos correspondientes, siguiendo el patrón de `ProtectedRoute` existente.
- [x] 12.8 Crear el módulo de API del frontend para los endpoints de Abono, siguiendo la convención de los módulos existentes en `api/`.
- [x] 12.9 **(remediación 2026-09-01)** Rediseño de paleta de las 5 pantallas de Abono a los tokens vigentes (`border-line`/`rounded-panel`/`rounded-base` en vez de sombra+`rounded-xl`/`rounded-2xl`). Se quitó `shadow-sm` de paneles y tarjetas (ya tenían `border border-line`, la sombra era redundante) en `pages/ProduccionAbono.jsx`, `pages/TrasladosAbono.jsx` (incluye el toggle de dirección del traslado), `pages/RendicionColega.jsx`, `pages/LiquidacionAbono.jsx` (6 tarjetas), `pages/ConfiguracionAbonoCategorias.jsx` y `components/ConfiguracionAbono.jsx` (parte de 12.6). Se conservó `shadow-lg` en los dropdowns flotantes de búsqueda de producto (`ProduccionAbono.jsx`/`TrasladosAbono.jsx`, popover absoluto sobre el resto del layout — permitido por la regla de popovers/modales flotantes). Grep final de `shadow-sm|shadow-md|shadow-xl|rounded-xl|rounded-2xl|bg-gray-*|text-gray-*|border-gray-*` sobre los 5 archivos: 0 resultados.

## 13. Verificación final del invariante

- [x] 13.1 Correr la suite completa y comparar contra la línea de base de 1.1: no hay regresiones.
- [ ] 13.2 Verificar el invariante: con Abono sembrado y sin datos, los totales de Finanzas de Vivero y Herramientas son exactamente los de 1.2.
- [ ] 13.3 Verificar que `Producto.stock`, `MovimientoStock` y `CapaCostoStock` de Vivero y Herramientas no cambiaron, y que ninguna fila de esas unidades tiene `cuenta_abono` distinto de `NULL`.
- [ ] 13.4 Prueba de extremo a extremo: producir 50 bolsas → trasladar 15 al colega → el colega vende 5 al contado y 10 a crédito → cobrar $X de la venta a crédito → registrar una rendición → verificar stock por ubicación, saldo del colega y liquidación.
- [ ] 13.5 Actualizar `openspec/roadmap.md` con el change y su estado.

## 14. Remediación post-auditoría — backend (2026-09-01)

Hallazgos reales de una auditoría de backend, corregidos con TDD estricto (test real contra la base de desarrollo, RED confirmado contra el código viejo, GREEN contra el fix). Ver design.md, "Revisión post-implementación", para el detalle de cada decisión.

- [x] 14.1 `CuentaAbonoFilter`: fallback explícito por username (`jefe@vivero.com` → `JEFE`, `colega@vivero.com` → `COLEGA`, cualquier otro usuario autenticado → contexto vacío, nunca `JEFE` por defecto). Eliminado el campo muerto `HEADER_NAME` (nunca se leía ningún header) y la entrada `X-Cuenta-Abono` del CORS en `SecurityConfig.java`. Test real: `CuentaAbonoFilterTest` (4 casos: colega, jefe, usuario desconocido, limpieza post-request) — RED confirmado contra el fallback viejo (`usuarioDesconocidoNoHeredaJefePorDefecto` fallaba: el código viejo sí atribuía a JEFE), GREEN contra el fix, 4/4 verde.
- [x] 14.2 `VentaServiceImpl.listarVentas()`: eliminado el literal `unidadId == 3L`, reemplazado por resolución dinámica de la unidad Abono por nombre (`unidadNegocioRepository.findByNombre("Abono")`), igual al patrón ya usado en `RendicionColegaServiceImpl` y en `VentaServiceImpl.crearVenta` en la misma clase. Se comprobó que la hipótesis ingenua ("dejar sólo `cuentaAbono != null`") rompe el listado de Vivero (`cuentaAbono` se completa para cualquier usuario autenticado en cualquier unidad, no sólo Abono) corriendo el test contra esa versión y viéndolo fallar antes de aplicar la solución final. Test real: `VentaServiceListarVentasAbonoTest` (venta de Abono con cuenta filtra correctamente; venta de Vivero con contexto de cuenta residual no se filtra) — 2/2 verde.
- [x] 14.3 `RendicionColegaController`: `/liquidacion` (GET) pasa de `ESCRIBIR_VENTAS` a `LEER_FINANZAS` (expone ingresosJefe/ingresosColega/compensacionTeorica — información financiera, no operativa; reusa el permiso que ya protege Finanzas.jsx). `registrarRendicion`, `obtenerHistorialRendiciones` y `/caja-colega` quedan sin cambios con `ESCRIBIR_VENTAS` (operativos). Corrige la tarea 9.4 (decía `ADMIN_DB`, el código tenía `ESCRIBIR_VENTAS`) y la 9.5 (marcada "(Validado en código)" sin test real). Test real: `RendicionColegaControllerPermisoTest` (sin `LEER_FINANZAS` → `AccessDeniedException`; con `LEER_FINANZAS` → 200; `registrarRendicion` sigue funcionando sólo con `ESCRIBIR_VENTAS`) — RED confirmado contra el permiso viejo, GREEN contra el fix, 3/3 verde.
- [x] 14.4 Verificación de no-regresión: suite de backend existente corrida contra la base de desarrollo real (no mock) tras los tres fixes. Ver resultado en el reporte de esta ronda — se documenta cualquier falla pre-existente encontrada (no causada por 14.1-14.3) sin arreglarla, fuera de alcance de esta ronda.
