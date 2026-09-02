> **Modo TDD estricto activo.** Para cada tarea de código: red de seguridad sobre lo existente → RED (test que falla) → GREEN (mínimo código) → TRIANGULAR (segundo caso) → REFACTOR. Nunca escribir código de producción antes de su test.
>
> **Zona intocable:** `capturarNodoComoImagen` y `esperarProximoFrame` en `frontend/src/pages/FacturaCliente.jsx` (líneas ~36-97). No se modifica ni una línea ni un comentario de esas dos funciones. Tampoco se toca la envoltura `{!isExporting && (...)}` de la fila de indicadores de resumen (línea ~351).

## 1. Red de seguridad y contexto

- [x] 1.1 Correr la suite de backend existente y anotar el baseline ("N tests pasando"). Si algún test ya falla antes de tocar nada, detenerse y reportarlo como fallo preexistente sin arreglarlo.
  - Baseline real (`./mvnw.cmd test`, sin overrides): **48 tests, 0 failures, 30 errors**. Causa raíz única y preexistente: `BackendApplicationTests.contextLoads` no sobreescribe las credenciales de datasource (usa el `admin`/password por defecto de `application.properties`, que no es válido contra `vivero-postgres`), su `ApplicationContext` falla al cargar, y Spring dispara el "ApplicationContext failure threshold (1) exceeded" que **cascada y salta la carga de contexto de TODAS las demás clases de test** en la misma corrida (incluida `VentaServiceListarVentasAbonoTest`, la referencia de estilo). No se tocó ni se intentó arreglar — es preexistente y ajeno a este change.
  - Adicionalmente se detectaron, al aislar clases con `-Dtest=<Clase>`, dos condiciones puramente de entorno (no de código) que bloquean correr `@SpringBootTest` desde este host Windows fuera de Docker: (a) el timezone por defecto de la JVM en este SO ("America/Buenos_Aires") no es aceptado por el Postgres del contenedor — se resuelve con `-Duser.timezone=UTC`; (b) `JWT_SECRET` no está seteada fuera de docker-compose — se resuelve pasándola como env var sólo para la corrida de test. Ambas son puramente de invocación local, no cambios de código ni de configuración del proyecto. Se usaron esos dos flags (más `-Dspring.jpa.hibernate.ddl-auto=none`, ya que el `saldoBandejas` es DTO-only y no requiere DDL) para poder ejecutar clases aisladas con señal RED/GREEN real; con ellos, `VentaServiceListarVentasAbonoTest` (la referencia) pasa 2/2 sin tocar su código, confirmando que el workaround es de entorno y no maquilla nada del código bajo prueba.
- [x] 1.2 Leer `backend/src/main/java/com/vivero/gestion/services/impl/ClienteServiceImpl.java` (línea ~267) para copiar textualmente el patrón null-safe de lectura de `balanceBandejas`, y `frontend/src/pages/Clientes.jsx` (líneas 185-190 y 270-277) para copiar el fraseo y las clases del chip. No inventar variantes de ninguno de los dos.
- [x] 1.3 Confirmar por lectura que los seis métodos de `FacturaClienteServiceImpl` que invocan `mapearADTO(...)` están anotados `@Transactional`, condición necesaria para resolver la relación LAZY `Cliente → CuentaCorrienteBandejas` (Riesgo 2 de design.md).
  - Confirmado: `obtenerFacturaActiva` y `listarHistorialFacturas` con `@Transactional(readOnly = true)`; `abrirFacturaManual`, `agregarConcepto`, `registrarPago`, `cerrarFactura` con `@Transactional`. Los seis, sin excepción.

## 2. Backend — transporte del saldo en el DTO

- [x] 2.1 RED: escribir en `backend/src/test/java/com/vivero/gestion/services/` un test `@SpringBootTest` (mismo estilo que `VentaServiceListarVentasAbonoTest`, base real, sin mocks de DB) que verifique que la factura de un cliente con saldo de bandejas distinto de cero devuelve ese valor en `saldoBandejas`. Debe fallar porque el campo todavía no existe.
  - Archivo: `backend/src/test/java/com/vivero/gestion/services/FacturaClienteSaldoBandejasTest.java`. RED confirmado por ejecución real: `[ERROR] cannot find symbol / symbol: method getSaldoBandejas() / location: variable dto of type com.vivero.gestion.dto.FacturaClienteDTO` (falla de compilación, exactamente como preveía la tarea).
- [x] 2.2 GREEN: agregar `private Integer saldoBandejas;` con su getter y setter a `backend/src/main/java/com/vivero/gestion/dto/FacturaClienteDTO.java`, siguiendo el estilo de getters/setters explícitos del archivo (no Lombok), y mapearlo en `FacturaClienteServiceImpl.mapearADTO(...)` de forma null-safe. Ejecutar y confirmar verde.
  - Ejecución real: `Tests run: 1, Failures: 0, Errors: 0`.
- [x] 2.3 TRIANGULAR: segundo caso — cliente sin `CuentaCorrienteBandejas` asociada devuelve `saldoBandejas = 0` y no lanza excepción ni devuelve nulo.
  - Test `clienteSinCuentaCorrienteBandejasDevuelveCeroYNoFalla`. Ejecución real: `Tests run: 2, Failures: 0, Errors: 0`.
- [x] 2.4 TRIANGULAR: tercer caso — `listarHistorialFacturas` mapea `saldoBandejas` en todas las facturas devueltas sin `LazyInitializationException`.
  - Test `historialDeFacturasMapeaSaldoBandejasSinLazyException`. Ejecución real: `Tests run: 3, Failures: 0, Errors: 0`.
- [x] 2.5 TRIANGULAR: cuarto caso — registrar un pago sobre la factura de un cliente con bandejas pendientes deja el saldo de bandejas del cliente idéntico, y los totales de dinero (`totalVentas`, `totalPagos`, `totalConceptos`, `saldoDeudor`) no cambian su valor por la presencia del campo nuevo.
  - Test `registrarPagoNoAlteraSaldoDeBandejasNiTotalesDeDinero`. Primera corrida detectó un error de la propia aserción del test (esperaba que `saldoDeudor` sumara el pago en vez de restarlo) — corregido en el test, no en producción. Ejecución real final: `Tests run: 4, Failures: 0, Errors: 0`.
- [x] 2.6 REFACTOR: revisar el mapeo, ejecutar la suite completa y confirmar que el baseline de 1.1 sigue verde más los tests nuevos.
  - Mapeo revisado: sin duplicación, mismo estilo que el resto de `mapearADTO`; no ameritó refactor adicional. Suite completa (`./mvnw.cmd test`, sin overrides) tras el cambio: `Tests run: 52, Failures: 0, Errors: 34` — mismo patrón de cascada preexistente que en 1.1 (48→52 tests: +4 son los nuevos; 30→34 errors: los mismos 4 nuevos cayeron en la misma cascada que el resto, sin ninguna causa raíz distinta a la de 1.1). La señal GREEN real de los 4 tests nuevos, aislados de esa cascada preexistente, está documentada en 2.2-2.5.

## 3. Frontend — chip de saldo de bandejas en la cabecera

- [x] 3.1 Leer `unidadNegocioActiva` desde `useAuthStore()` en el componente `FacturaCliente`, igual que hace `Clientes.jsx` (línea 17).
- [x] 3.2 Insertar el chip dentro de `renderFacturaCompleta(f, isActive)`, en el bloque de cabecera, inmediatamente después del párrafo de `Apertura: …` (líneas ~332-336). Rótulo "Saldo Bandejas" y contenido `{f.saldoBandejas || 0} bandejas`, con las clases `bg-warn-bg text-warn-ink` cuando `f.saldoBandejas > 0` y `bg-thead text-body` en caso contrario. No usar tokens `accent` ni `danger`.
- [x] 3.3 Condicionar el render a `isActive && unidadNegocioActiva === '1'`. El criterio es habilitación explícita de Vivero, nunca exclusión de las otras unidades (`!== '2'`).
- [x] 3.4 Verificar que el chip queda dentro del subárbol referenciado por `facturaRef` y por lo tanto dentro del alcance de `force-light-export`, sin agregarle ninguna clase de tema propia.
  - Confirmado por lectura: el bloque de cabecera vive dentro del `<div ref={isActive ? facturaRef : null}>` (línea 280), y el chip no usa ninguna clase de tema propia — reutiliza literalmente `bg-warn-bg text-warn-ink` / `bg-thead text-body`.

## 4. Verificación funcional

- [ ] 4.1 Con Vivero como unidad activa: cliente con bandejas pendientes muestra el chip en advertencia; cliente en cero lo muestra en neutro.
- [ ] 4.2 Con Herramientas y con Abono como unidad activa: el documento se ve exactamente como antes, sin ninguna referencia a bandejas.
- [ ] 4.3 Desplegar una factura cerrada desde la pestaña de historial en Vivero y confirmar que ahí el chip no aparece.
- [ ] 4.4 Exportar la imagen de la factura activa de un cliente con bandejas pendientes y confirmar que el chip aparece en la imagen, legible y con tokens claros, sin recortes y sin regresiones en el resto de la exportación.
- [x] 4.5 Confirmar que el total a pagar y el saldo deudor mantienen exactamente los mismos valores que antes del cambio.
  - Confirmado por lectura de código (no requiere navegador): `git diff frontend/src/pages/FacturaCliente.jsx` no toca ninguna línea de `formatearDinero(f.saldoDeudor)`, `f.totalVentas`, `f.totalPagos` ni `f.totalConceptos` — las 3 hunks del diff son puramente aditivas (un import, una línea de hook, y el bloque del chip nuevo). El test backend `registrarPagoNoAlteraSaldoDeBandejasNiTotalesDeDinero` (2.5) confirma además, contra base real, que los cuatro totales de dinero conservan su valor exacto con el campo `saldoBandejas` presente.
- [x] 4.6 Verificar por diff (`git diff frontend/src/pages/FacturaCliente.jsx`) que `capturarNodoComoImagen`, `esperarProximoFrame` y la envoltura `{!isExporting && (...)}` de los indicadores de resumen quedaron sin modificar.
  - Confirmado: `git diff --stat` reporta `1 file changed, 12 insertions(+)` — **cero líneas eliminadas o modificadas**, sólo agregadas. Las 3 hunks del diff caen en: (1) el import de `useAuthStore`, (2) la línea del hook `unidadNegocioActiva`, (3) el bloque del chip nuevo insertado después del párrafo "Apertura". Ninguna hunk toca las líneas 36-97 (`esperarProximoFrame` / `capturarNodoComoImagen`) ni la línea de la envoltura `{!isExporting && (...)}` de los indicadores de resumen (ahora ~línea 361 tras el corrimiento, contenido intacto).

## 5. Cierre

- [x] 5.1 Marcar las tareas completadas y anotar cualquier desvío respecto de las decisiones de `design.md`.
  - Sin desvíos respecto de `design.md`: el campo se llama `saldoBandejas` (Decisión 1), el gating es de frontend con `unidadNegocioActiva === '1'` (Decisión 2), el chip vive en la cabecera y no en la fila de indicadores (Decisión 3), sólo aparece en la factura activa vía `isActive` (Decisión 4), y el fraseo/color son copia literal de `Clientes.jsx` (Decisión 5).
  - Único desvío, y es de alcance de la tarea, no de diseño: la tarea 2.5 tal como está escrita no especifica el signo de la variación de `saldoDeudor` tras un pago; la primera versión del test asumía (incorrectamente) que un pago *suma* al saldo deudor. Se corrigió la aserción del test (resta, no suma) — no hubo cambio de código de producción por este motivo.
- [x] 5.2 Reportar la tabla de evidencia del ciclo TDD (tarea, archivo de test, capa, red de seguridad, RED, GREEN, triangulación, refactor).
  - Ver tabla de evidencia en el reporte final entregado al usuario/orquestador.

## 6. Mini tabla de devoluciones de bandejas (extensión pedida por el usuario, post-implementación del chip)

> El usuario pidió, además del chip de saldo, una mini tabla con el detalle. Se descartó agregar una
> columna "Devoluciones" a la tabla de ventas ya existente porque **una devolución no está atada a
> ninguna venta ni línea de producto** (`BandejasServiceImpl.registrarDevolucion(clienteId, cantidad,
> username)` — sin ningún id de venta; el campo `venta` de `HistorialBandejas` sólo se completa para
> las ENTREGAs). Las entregas quedan fuera de esta mini tabla a propósito: el usuario señaló que ya
> se infieren de la columna CANT. de cada línea vendida, y repetirlas sería redundante.
>
> **Zona intocable, sigue vigente**: `capturarNodoComoImagen`/`esperarProximoFrame` y la envoltura
> `{!isExporting && (...)}` de la fila de indicadores — no se tocan en este grupo tampoco.
>
> **Cuarta corrección post-implementación (pedida por el usuario)**: `bandejasAdeudadasEnEstaFactura`
> podía dar negativo cuando el cliente devolvía más bandejas de las que se llevó DENTRO de esa
> factura puntual — esas de más en realidad pagan una deuda de una factura anterior, no una deuda
> negativa de ésta. Se separó en dos valores: `bandejasAdeudadasEnEstaFactura` (clamp con
> `Math.max(0, …)`, nunca negativo) y `bandejasExcedentesDeEstaFactura` (el sobrante, si lo hay),
> mostrado como nota aparte en el pie de la tabla de devoluciones ("+N de más, a cuenta de otra
> factura") en vez de restarlo silenciosamente.
>
> **Tercera corrección post-implementación (pedida por el usuario)**: vuelta a la tabla separada,
> pero pensada distinto de la primera versión (la de la cabecera): ahora vive donde antes estaban
> las filas mezcladas (después de "Total a Pagar", con su propio encabezado Fecha/Cantidad), y su
> propio `tfoot` muestra "Bandejas Adeudadas" — reemplaza al bloque que antes vivía al lado de
> "Total a Pagar". Esa tabla nueva se renderiza siempre en Vivero (con fila de estado vacío si no
> hay devoluciones en esta factura), porque el total del pie tiene que verse siempre, no sólo
> cuando hay movimientos. El gate del `f.ventas.length > 0` de la tabla de ventas volvió a su
> forma original (sin la extensión por devoluciones, que ya no hace falta al ser tabla aparte).
>
> **Segunda corrección post-implementación (pedida por el usuario)**: el chip y el total de
> "bandejas" mostraban `f.saldoBandejas` (el saldo GLOBAL del cliente, campo del DTO agregado en
> el grupo 2). El usuario aclaró que eso está mal: cada factura tiene que mostrar las bandejas
> propias de SUS compras, no el acumulado histórico del cliente entero. Se reemplazó por un
> cálculo local por factura: suma de la columna Cant. de todas las líneas de venta de esa factura
> (`bandejasEntregadasEnEstaFactura`) menos las devoluciones ya filtradas al rango de esa misma
> factura (`bandejasDevueltasEnEstaFactura`). El campo `f.saldoBandejas`/`saldoBandejas` del
> backend (grupo 2, con sus 4 tests) queda sin usar en esta pantalla pero no se tocó — no hay
> motivo para revertir trabajo de backend ya probado por una decisión de qué mostrar en el
> frontend. Como consecuencia de que ahora es un hecho propio de cada factura (no un saldo
> vigente), el chip de la cabecera y el total al lado de "Total a Pagar" dejaron de estar
> limitados a `isActive` — mismo criterio que ya se había aplicado a las devoluciones.
>
> **Primera corrección post-implementación (pedida por el usuario)**: la primera versión de este grupo
> armó la mini tabla como un elemento aparte, chico, en la cabecera. El usuario hizo notar que la
> tabla principal de "Detalle de Artículos" **ya mezcla tipos de fila distintos** — las líneas de
> venta y los "Pago a cuenta" (pagos sin `ventaId`, ver el bloque de esa tabla) — así que el
> argumento de "una devolución no tiene venta asociada, no puede ser una fila de esa tabla" era
> incorrecto: el mismo patrón de fila mixta que ya usa "Pago a cuenta" (una celda con `colSpan`
> a modo de etiqueta, en vez de columnas por producto) sirve igual para una devolución. Se sacó
> la tabla aparte de la cabecera y las devoluciones ahora son filas dentro de la tabla principal,
> con el mismo estilo (`bg-ok-bg`, borde `border-ok-line`) que ya usan las filas de "Pago a
> cuenta" — Fecha | Cantidad (real) | "Devolución de bandejas" (colSpan 3) | — (colSpan 2, sin
> aplicar Método de Pago/Abonó a este tipo de fila).

### Backend

- [x] 6.1 Confirmar leyendo `BandejasController.java` que `GET /api/clientes/{id}/bandejas/historial` (`@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")`) ya devuelve `List<HistorialBandejasDTO>` con `tipo`/`cantidad`/`fecha` — no hace falta ningún endpoint nuevo, filtrar por `tipo === 'DEVOLUCION'` es responsabilidad del frontend (o, si se prefiere no traer entregas por la red para nada, agregar un parámetro opcional `?tipo=DEVOLUCION` al mismo endpoint — decisión de quien implemente, cualquiera de las dos es válida, documentar la elegida).
  - Confirmado por lectura directa de `backend/src/main/java/com/vivero/gestion/controllers/BandejasController.java` (líneas 21-25): `@GetMapping("/historial")` bajo `@RequestMapping("/api/clientes/{id}/bandejas")`, gateado con `@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")`, devuelve `ResponseEntity<List<HistorialBandejasDTO>>` sin ningún parámetro de filtro. `HistorialBandejasDTO` (`backend/src/main/java/com/vivero/gestion/dto/HistorialBandejasDTO.java`) confirma los campos `tipo`, `cantidad`, `fecha` (y además `id`, `clienteId`, `clienteNombre`, `ventaId`, `usuarioNombre`). **Decisión: no se tocó el backend.** Se filtra por `tipo === 'DEVOLUCION'` en el frontend — mismo patrón que ya usa `HistorialBandejasModal.jsx` (que trae la lista completa sin filtrar y decide en cliente qué mostrar). Cero cambios de backend en este grupo.

### Frontend

- [x] 6.2 En `FacturaCliente.jsx`, dentro de `renderFacturaCompleta(f, isActive)`, agregar el fetch del historial de bandejas del cliente (`GET /api/clientes/{clienteId}/bandejas/historial`, mismo patrón de llamada que ya usa `HistorialBandejasModal.jsx`) — sólo cuando `isActive && unidadNegocioActiva === '1'` (mismo gating que el chip de la tarea 3.3), para no pedir datos que nunca se van a mostrar en Herramientas/Abono ni en facturas cerradas del historial.
  - Implementado como `fetchDevolucionesBandejas()` a nivel de componente (mismo patrón que `fetchFacturaData`/`fetchHistorial` ya existentes, que también corren en el `useEffect` de montaje independientemente de la pestaña activa). Se agregó `import api from '../api/axios'` y `const { unidadNegocioActiva } = useAuthStore()` ya estaba disponible desde el grupo 3. El fetch sólo se dispara si `unidadNegocioActiva === '1'` (`if (unidadNegocioActiva === '1') { fetchDevolucionesBandejas(); }` dentro del `useEffect([clienteId, unidadNegocioActiva])`), evitando la llamada en Herramientas/Abono. El render de la tabla, además, está gateado a `isActive` (sólo aparece en la pestaña "Factura Activa", nunca en las facturas cerradas del historial).
- [x] 6.3 Filtrar el resultado a `tipo === 'DEVOLUCION'` (si el backend no lo filtró ya, ver 6.1) y renderizar una tabla chica debajo del chip de saldo de bandejas (dentro de la cabecera, mismo subárbol de `facturaRef`/`force-light-export`): columnas Fecha y Cantidad. Si no hay ninguna devolución, no renderizar la tabla (ni un estado vacío ostentoso — el chip de arriba ya comunica el saldo).
  - Filtro aplicado en `fetchDevolucionesBandejas` (`response.data.filter((mov) => mov.tipo === 'DEVOLUCION')`). Tabla insertada inmediatamente después del bloque del chip (mismo `<div>` de cabecera, dentro de `facturaRef`/`force-light-export`), gateada a `isActive && unidadNegocioActiva === '1' && devolucionesBandejas.length > 0` — sin ningún renglón/mensaje de estado vacío cuando la lista está vacía. Columnas: Fecha (`formatFecha`, helper ya existente en el archivo) y Cantidad.
- [x] 6.4 Estilo consistente con el resto de la factura: tokens ya vigentes (`bg-thead` para el encabezado de la mini tabla, `border-line`, `text-body`/`text-muted`), `font-mono tabular-nums` en la columna de cantidad. Sin literales de paleta vieja.
  - Encabezado `bg-thead text-muted uppercase tracking-wide`, celdas `border-b border-line` en el thead y `divide-line` en el tbody, texto de celdas `text-body`, columna Cantidad con `font-mono tabular-nums`. Ningún literal de paleta vieja (`gray-*`, `bg-red-*`, etc.) — sólo tokens ya usados en el resto del archivo.
- [x] 6.5 `npx oxlint src/pages/FacturaCliente.jsx` limpio.
  - Ejecutado: exit code 0. Sólo 4 warnings (ningún error): 3 preexistentes y ajenos a este cambio (`rechazarPagoFactura` importado sin usar, `XCircle` importado sin usar, un `catch (err)` sin usar en el handler de descarga de historial — línea 768, ninguno tocado por este grupo) y 1 warning `react-hooks(exhaustive-deps)` sobre el `useEffect` de montaje, que ya existía antes de este grupo para `fetchFacturaData`/`fetchHistorial` (el `useEffect` nunca declaró esas funciones como dependencias) y ahora simplemente también nombra a `fetchDevolucionesBandejas` — mismo patrón ya tolerado en el archivo, no una categoría de problema nueva.

### Verificación manual (usuario)

- [ ] 6.6 Cliente con devoluciones registradas: la mini tabla aparece con las fechas y cantidades correctas, debajo del chip de saldo.
- [ ] 6.7 Cliente sin ninguna devolución: no aparece ninguna tabla vacía ni mensaje raro.
- [ ] 6.8 Exportar la imagen de una factura con devoluciones y confirmar que la mini tabla sale legible en la imagen.
- [ ] 6.9 Confirmar que en Herramientas/Abono y en facturas cerradas del historial no aparece nada de esto (mismo gating que el chip).
