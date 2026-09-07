## Context

El dueño quiere una pantalla única en Abono que conteste "¿cuánto se cobró, quién lo cobró, y de qué venta salió?" sin recorrer venta por venta ni cliente por cliente. Hoy los cobros están repartidos entre el historial de cada venta, `CuentaCorrienteCliente.jsx` y `FacturaCliente.jsx`, y no existe ninguna vista que los junte.

### Estado real relevado (verificado sobre el código, no asumido)

1. **`Pago` (`models/Pago.java`) no tiene unidad de negocio ni usuario.** Sus campos son `id`, `venta` (`@ManyToOne`, nullable), `factura` (`@ManyToOne FacturaCliente`, nullable), `cuentaAbono` (`CuentaAbono` nullable), `monto`, `metodoPago` (String), `estado` (`EstadoPago`, default `ACREDITADO`) y `fecha`. La unidad de negocio de un pago **sólo se puede deducir** a través de `venta.unidadNegocio` o de `factura.unidadNegocio`.
2. **Un `Pago` se crea en exactamente 3 lugares y siempre queda ligado a una `Venta` o a una `FacturaCliente`, nunca a ninguna de las dos:**
   - `VentaServiceImpl.crearVenta()` — pago inicial de la venta (`pago.setCuentaAbono(venta.getCuentaAbono())`).
   - `VentaServiceImpl.registrarPago()` — pago posterior sobre una venta existente (botón "Registrar pago" de `CuentaCorrienteCliente.jsx`), también con `venta.getCuentaAbono()`.
   - `FacturaClienteServiceImpl.registrarPago()` — pago directo contra una `FacturaCliente` abierta, sin venta puntual detrás (`pago.setFactura(factura)`, `pago.setCuentaAbono(CuentaAbonoContextHolder.getCuentaAbono())`).
3. **No existe ningún campo `usuario` en `Pago`.** La única dimensión por persona es `cuentaAbono`. `CuentaAbonoFilter` deriva esa cuenta del `username` de la sesión con dos constantes privadas: `Sergio` → `JEFE`, `Pablo` → `COLEGA`; cualquier otro usuario autenticado deja el contexto vacío a propósito (no cae en `JEFE` por default).
4. **`PagoResponseDTO` expone sólo `id`, `monto`, `metodoPago`, `estado`, `fecha`, `ventaId`.** Se consume embebido en `VentaResponseDTO.pagos`. No expone cliente, ni factura, ni cuenta.
5. **`PagoRepository` tiene sólo dos métodos** (`findMetodoPagoPorVenta`, `sumarPagosPorCuentaYPeriodo`). Ninguno devuelve un listado paginado ni trae datos de cliente.
6. **`Venta` es soft-delete** (`@SQLDelete` + `@SQLRestriction("deleted = false")`), y `Pago.venta` es un `@ManyToOne` EAGER **sin** `@NotFound(NotFoundAction.IGNORE)` — a diferencia de `Venta.cliente` y `FacturaCliente.cliente`, que sí lo llevan justamente porque cargar la entidad con la fila filtrada por el soft delete rompe con `FetchNotFoundException` en Hibernate 6.
7. **El repo ya tiene precedente de proyección DTO paginada en JPQL**: `VentaRepository.listarVentasPorRango(...)` devuelve `Page<VentaLiteDTO>` con `SELECT new com.vivero.gestion.dto.VentaLiteDTO(...)`, `LEFT JOIN`s, filtros opcionales con el idioma `(:q IS NULL OR :q = '' OR ...)` y `Pageable`. `@EntityGraph` sólo se usa en `ClienteRepository` y `UsuarioRepository`, donde lo que se devuelve son entidades completas.
8. **`LEER_FINANZAS` ya es el permiso financiero del sistema** (`ChequeController`, `GastoController`, `FinanzasController`, `RendicionColegaController.obtenerLiquidacion`) y `UsuariosAdmin.jsx` lo oculta siempre del alta de roles: el acceso financiero queda reservado a los administradores de cada unidad.
9. **`VentaServiceImpl.listarVentas()` sigue particionando las ventas de Abono por `cuentaAbono`** (`findAllByUnidadNegocioIdAndCuentaAbonoOrderByFechaDesc`), resolviendo la unidad por nombre (`"Abono"`), no por id literal. Esa partición es intencional y no se toca.

## Goals / Non-Goals

**Goals:**
- Una sola pantalla de Abono que liste **todos** los pagos de la unidad, de **ambas** cuentas juntas, paginada, con búsqueda por cliente y filtro por rango de fechas.
- Cada fila responde las tres preguntas del pedido: **cuánto** (monto + método + estado), **quién cobró** (nombre real derivado de `cuentaAbono`) y **de qué salió** (venta con su cliente y su fecha, o "pago a cuenta corriente" con el cliente de la factura).
- Cambio 100% aditivo: ni una línea de comportamiento existente cambia. Sin migraciones, sin campos nuevos en el modelo, sin tocar los servicios de venta y facturación.
- Que una fila con datos incompletos (cuenta nula, cliente eliminado, venta anulada) **se muestre degradada, nunca rompa el listado**.

**Non-Goals:**
- **No** se agrega un campo `usuario` a `Pago` ni ninguna otra columna. No hay migración de esquema ni backfill.
- **No** se toca la partición por `CuentaAbono` de Ventas, Stock ni Rendición de Colega. `VentaServiceImpl.listarVentas()` queda exactamente como está — el guard de regresión de la sección de tests existe justamente para eso.
- **No** se modifica `PagoResponseDTO`, `VentaResponseDTO`, `VentaServiceImpl` ni `FacturaClienteServiceImpl`.
- **No** se agrega edición, anulación ni registro de cobros desde esta pantalla: es sólo lectura.
- **No** se agregan totales/agregados financieros (suma cobrada por período, por cuenta, etc.). Eso ya lo cubre `LiquidacionAbono.jsx` vía `sumarPagosPorCuentaYPeriodo`; duplicarlo acá sería otro cálculo que mantener sincronizado.
- **No** se extiende este historial a Vivero ni Herramientas. El endpoint es explícitamente de Abono.

## Decisions

### Decisión 1 — "Quién cobró" se resuelve con un mapeo único y compartido: `CuentaAbonoNombres`

Se crea `com.vivero.gestion.security.CuentaAbonoNombres`, una clase final sin estado con constructor privado, dueña **única** del conocimiento "`Sergio` ↔ `JEFE`, `Pablo` ↔ `COLEGA`":

- `Optional<CuentaAbono> cuentaDe(String username)` — el sentido que hoy vive hardcodeado en `CuentaAbonoFilter`.
- `String nombreVisible(CuentaAbono cuenta)` — el sentido inverso, que necesita este change: `JEFE` → `"Sergio"`, `COLEGA` → `"Pablo"`, `null` → `"Sin cuenta asignada"`.

`CuentaAbonoFilter` se refactoriza para delegar en `cuentaDe(...)` y sus dos constantes privadas (`USERNAME_JEFE`, `USERNAME_COLEGA`) se mudan ahí. El comportamiento del filtro no cambia en nada — incluido el caso explícito "cualquier otro usuario autenticado NO cae en `JEFE`", que sigue siendo el `Optional.empty()`. `CuentaAbonoFilterTest` ya cubre los tres casos (`Pablo`, `Sergio`, tercer usuario) y es la red de seguridad de ese refactor.

*Alternativa considerada: dejar el mapa de nombres como constante privada del nuevo servicio de cobros.* Rechazada: los nombres quedarían escritos en dos archivos que nadie obliga a mantener sincronizados. Este proyecto **ya renombró** esos usuarios una vez (`jefe@vivero.com` → `Sergio`, `colega@vivero.com` → `Pablo`, 2026-09-04, ver comentarios en `DataInitializer`); repetir el literal es sembrar exactamente el bug de la próxima vez. Con `CuentaAbonoNombres` un futuro renombre toca un archivo.

*Alternativa considerada: resolver el nombre consultando `UsuarioRepository`.* Rechazada: `Pago` no tiene FK a `Usuario`, así que la consulta necesitaría igualmente el username hardcodeado para encontrar la fila — agrega una query por request y no elimina ni un literal. Además el nombre que se quiere mostrar es el de la **cuenta operativa**, no el de la identidad que ejecutó el request (que puede no existir: los pagos históricos son anteriores al campo).

*Alternativa considerada: resolver el nombre en el frontend.* Rechazada por el mismo motivo: duplicaría el mapeo en un tercer lugar, esta vez cruzando la frontera del lenguaje.

*Dónde se aplica:* en el **servicio**, no en la query ni en el getter del DTO. `nombreVisible` es una función pura y por eso se puede testear sin base (ver `tasks.md`, grupo 2).

### Decisión 2 — DTO nuevo y dedicado (`PagoHistorialAbonoDTO`), no extender `PagoResponseDTO`

Se crea `com.vivero.gestion.dto.PagoHistorialAbonoDTO` con exactamente los campos que la pantalla necesita:

| Campo | Origen |
|---|---|
| `id` | `p.id` |
| `fecha` | `p.fecha` (fecha del cobro) |
| `monto` | `p.monto` |
| `metodoPago` | `p.metodoPago` |
| `estado` | `p.estado` |
| `cuentaAbono` | `p.cuentaAbono` (crudo, nullable — para badge/filtro en la UI) |
| `cobradoPor` | derivado en el servicio con `CuentaAbonoNombres.nombreVisible(...)` |
| `origen` | derivado en el servicio: `"VENTA"` si hay `ventaId`, si no `"CUENTA_CORRIENTE"` |
| `ventaId` | `v.id` (nullable) |
| `fechaVenta` | `v.fecha` (nullable) |
| `facturaId` | `f.id` (nullable) |
| `clienteNombre` | `COALESCE(cv.nombreRazonSocial, v.clienteNombreCasual, cf.nombreRazonSocial, '(eliminado)')` |

*Por qué no extender `PagoResponseDTO`:* hoy se serializa embebido dentro de `VentaResponseDTO.pagos` en todo el circuito de ventas y cuenta corriente. Agregarle cliente, cuenta y "cobradoPor" engordaría cada respuesta de venta con datos redundantes (el cliente ya está en el nivel de arriba), obligaría a que quien construye esos pagos hoy resuelva campos que no necesita, y convertiría un cambio prometido como "sin impacto en `VentaServiceImpl` ni `FacturaClienteServiceImpl`" en un cambio con radio de alcance abierto. Un DTO propio deja el riesgo en cero y el contrato de la pantalla explícito.

*Alternativa considerada: reusar `PagoResponseDTO` tal cual y que el frontend cruce los datos de cliente con otra llamada.* Rechazada: es un N+1 movido al navegador.

### Decisión 3 — El N+1 se evita con proyección JPQL a DTO, no con `@EntityGraph`

El repositorio expone un único método:

```java
@Query("""
        SELECT new com.vivero.gestion.dto.PagoHistorialAbonoDTO(
            p.id, p.fecha, p.monto, p.metodoPago, p.estado, p.cuentaAbono,
            v.id, v.fecha, f.id,
            COALESCE(cv.nombreRazonSocial, v.clienteNombreCasual, cf.nombreRazonSocial, '(eliminado)')
        )
        FROM Pago p
        LEFT JOIN p.venta v
        LEFT JOIN v.cliente cv
        LEFT JOIN v.unidadNegocio uv
        LEFT JOIN p.factura f
        LEFT JOIN f.cliente cf
        LEFT JOIN f.unidadNegocio uf
        WHERE (uv.id = :unidadId OR uf.id = :unidadId)
          AND (CAST(:desde AS timestamp) IS NULL OR p.fecha >= :desde)
          AND (CAST(:hasta AS timestamp) IS NULL OR p.fecha <= :hasta)
          AND (:q IS NULL OR :q = '' OR LOWER(COALESCE(cv.nombreRazonSocial, v.clienteNombreCasual, cf.nombreRazonSocial, '')) LIKE LOWER(CONCAT('%', :q, '%')))
        ORDER BY p.fecha DESC, p.id DESC
        """)
Page<PagoHistorialAbonoDTO> listarHistorialCobros(...);
```

Motivos, en orden de peso:

1. **Una sola consulta, sin N+1 y sin sorpresas de fetch.** Todo lo que la pantalla muestra viaja en la proyección; no queda ninguna asociación que Hibernate tenga que resolver después.
2. **Esquiva el soft delete de `Venta`.** `Pago.venta` es EAGER y no tiene `@NotFound(IGNORE)`: cargar entidades `Pago` cuya venta fue anulada es exactamente el escenario que ya rompió con `FetchNotFoundException` en `Venta.cliente`. Arreglarlo requeriría anotar el modelo `Pago`, que está fuera de alcance. La proyección no materializa la asociación y por lo tanto no puede caer en ese error.
3. **Es la convención vigente del repo para listados paginados de lectura** (`VentaRepository.listarVentasPorRango` → `Page<VentaLiteDTO>`), incluido el idioma de filtros opcionales `(:q IS NULL OR :q = '' OR ...)`. `@EntityGraph` en este repo se usa cuando se devuelven **entidades** (`ClienteRepository`, `UsuarioRepository`), que no es el caso.

*Alternativa considerada: `Page<Pago>` con `@EntityGraph(attributePaths = {"venta", "venta.cliente", "factura", "factura.cliente"})` + mapeo en el servicio.* Rechazada por el punto 2 (queda expuesta al soft delete de `Venta`) y porque devuelve columnas que nadie usa. La ganancia sería reusar un DTO que igual hay que escribir.

*Consecuencia asumida y explícita:* como `@SQLRestriction("deleted = false")` de `Venta` también aplica al `LEFT JOIN`, **un pago de una venta anulada queda con `v` en null**. Si ese pago tiene factura, aparece como "pago a cuenta corriente" del cliente de la factura; si no tiene ninguna de las dos referencias vivas, el `WHERE` lo descarta y no aparece en el historial. Es el comportamiento correcto: un cobro de una venta anulada no es plata cobrada en el circuito vivo.

*Sobre la filtración por unidad:* `Pago` no tiene `unidadNegocio`, así que la pertenencia a Abono se deduce por `venta.unidadNegocio` **o** `factura.unidadNegocio`. Los `LEFT JOIN` a `uv`/`uf` son explícitos a propósito: escribir `v.unidadNegocio.id` en el `WHERE` genera un join implícito que degrada el `LEFT JOIN` a `INNER` y haría desaparecer los pagos directos a factura.

### Decisión 4 — El listado es GLOBAL: no se filtra por `CuentaAbono`, y eso se blinda con un test

La query **no** recibe ni consulta `CuentaAbonoContextHolder`. Sea quien sea el que abra la pantalla (Sergio o Pablo), ve los cobros de las dos cuentas juntos; la cuenta sólo se usa para la columna "quién cobró".

Es el mismo criterio ya aplicado en `clientes-compartidos-abono`: la partición operativa se conserva donde representa el negocio real (cada uno vende de su stock y rinde por separado), y las vistas de auditoría/reporte se construyen **encima**, sin partición. Como esta es una diferencia de comportamiento sutil y fácil de "corregir" por error en un cambio futuro, `specs/` incluye un escenario normativo explícito de no-partición y `tasks.md` un test que lo verifica.

*Alternativa considerada: filtrar por la cuenta en contexto, con un toggle "ver todo".* Rechazada: el pedido es auditar la caja completa de Abono; abrir la pantalla y ver la mitad de la plata es exactamente el problema que este change viene a eliminar. Un toggle además reintroduce el código de partición que queremos que no exista acá.

### Decisión 5 — Ruta, permiso y ubicación en el menú

| Pieza | Valor | Motivo |
|---|---|---|
| Endpoint | `GET /api/abono/cobros` | Todas las secciones de Abono cuelgan de `/api/abono/...` (`/api/abono/stock`, `/api/abono/rendiciones`). El `GET /api/pagos/abono/historial` que sugería el `proposal.md` inventaría un prefijo `/api/pagos` que hoy no existe (no hay `PagoController`). |
| Controller | `HistorialCobrosAbonoController` (nuevo) | No hay controller de pagos donde colgarlo, y `VentaController` / `FacturaClienteController` no son su lugar. |
| Query params | `page` (def. `0`), `size` (def. `20`), `desde`, `hasta` (ISO, opcionales), `q` (opcional) | Mismo idioma que `RendicionColegaController.obtenerHistorialRendiciones` y `abonoApi.getHistorial`. |
| Permiso | `@PreAuthorize("hasAuthority('LEER_FINANZAS')")` | Es el permiso financiero ya vigente (Cheques, Gastos, Finanzas, Liquidación de Abono) y `UsuariosAdmin.jsx` lo mantiene fuera del alta de roles, o sea reservado a administradores. Crear un permiso nuevo obligaría a tocar `PermisoEnum`, `DataInitializer` y la asignación de roles, sin ganar ninguna distinción real: quien puede ver la liquidación de Abono ya ve estos mismos montos agregados. |
| Ruta frontend | `/abono/cobros` | Consistente con `/abono/produccion`, `/abono/rendiciones`, `/abono/liquidacion`. No colisiona por prefijo con ninguna ruta existente (relevante por el guard `location.pathname.startsWith(item.to)` de `DashboardLayout`). |
| Página | `frontend/src/pages/HistorialCobrosAbono.jsx` | PascalCase, regla dura #7. |
| Cliente HTTP | método nuevo en `frontend/src/api/abono.api.js` | Es el módulo de la unidad Abono; no hace falta un archivo nuevo para un solo GET. |
| Menú | grupo **Gestión**, `{ to: '/abono/cobros', label: 'Historial de Cobros', icon: Wallet, permission: 'LEER_FINANZAS', unidades: ['abono'] }` | Queda junto a "Finanzas" y "Cheques", que es su familia conceptual. `Wallet` de `lucide-react` está libre (no importado hoy) y no se pisa con `HandCoins` (Rendiciones) ni `TrendingUp` (Finanzas de Abono). |

### Decisión 6 — La pantalla es un historial puro, no el layout "formulario + historial"

`ProduccionAbono.jsx` y `RendicionColega.jsx` parten la pantalla en formulario de alta + historial, porque registran algo. Acá no se registra nada, así que el modelo de layout es `HistorialVentas.jsx`: título, buscador arriba, y un bloque único tarjetas-en-mobile / tabla-en-desktop.

Diferencia con `HistorialVentas.jsx`: ese filtra **en memoria** sobre la lista completa, algo que este listado no puede hacer porque viene paginado del servidor. Entonces se toma la mecánica de datos de `ProduccionAbono.jsx` (`useQuery` de TanStack con la página en el `queryKey`, controles Anterior/Siguiente) y la estructura visual de `HistorialVentas.jsx`. Búsqueda y rango de fechas viajan al backend como parámetros de la query (y resetean la página a 0 al cambiar), no se resuelven en el cliente.

Feedback de errores vía `useUIStore().pushToast`, nunca `alert`/`confirm` (regla dura #7).

## Risks / Trade-offs

- **[Un pago de una venta anulada desaparece del historial (o se re-etiqueta como "cuenta corriente")]** → Consecuencia directa del soft delete de `Venta` (Decisión 3). Se asume a conciencia y se documenta: la caja viva no debería contar cobros de ventas anuladas. Queda escrito acá para que no se lea como un bug si aparece.
- **["Quién cobró" es la cuenta operativa, no la persona que apretó el botón]** → Si algún día un tercer usuario opera Abono, sus pagos quedan con `cuentaAbono` nulo y se muestran como "Sin cuenta asignada" (nunca atribuidos por error a Sergio ni a Pablo — mismo criterio que ya sostiene `CuentaAbonoFilter`). Si el dueño llega a necesitar atribución por persona real, eso sí exige un campo `usuario` en `Pago` y es otro change.
- **[Pagos históricos con `cuentaAbono` nulo]** → Se muestran degradados ("Sin cuenta asignada"), no se ocultan ni rompen el render. Cubierto por escenario normativo y por test.
- **[Refactorizar `CuentaAbonoFilter` toca un componente de seguridad]** → Es una extracción de dos constantes sin cambio de comportamiento, y `CuentaAbonoFilterTest` (ya existente, con los tres casos) corre como red de seguridad antes y después. Si el baseline de ese test no está verde, la tarea se detiene y se reporta (paso 0 del módulo TDD).
- **[Que el cambio se desborde hacia la partición de Ventas/Stock/Rendición]** → Mitigado por alcance explícito (ningún archivo `Venta*`, `StockAbono*` ni `RendicionColega*` se modifica) y por el test de guard de la Decisión 4.
- **[Volumen del listado]** → Es paginado del lado del servidor desde el primer commit; no hay `findAll()` sin límite (regla dura #6). El `LIKE '%q%'` sobre el nombre del cliente no usa índice, igual que el buscador de `listarVentasPorRango`; con el volumen real de Abono es irrelevante y se acepta la misma deuda que ya existe.

## Migration Plan

No hay migración de datos ni de esquema: no se agregan ni se quitan columnas, y `ddl-auto=update` no tiene nada que hacer con este change.

1. Deploy del backend: aparece `GET /api/abono/cobros`. Ningún endpoint existente cambia de forma ni de contrato.
2. Deploy del frontend: aparece la ruta `/abono/cobros` y el ítem de menú, visible sólo con unidad Abono activa y permiso `LEER_FINANZAS`.
3. **Rollback:** revertir el commit y redesplegar. Al ser 100% aditivo y de sólo lectura, no queda ningún dato escrito por este change que haya que deshacer.

## Open Questions

Ninguna. Las dos decisiones que el `proposal.md` dejaba abiertas quedan cerradas acá: el mapeo de nombres vive en `CuentaAbonoNombres` (Decisión 1) y se usa un DTO nuevo y dedicado en vez de extender `PagoResponseDTO` (Decisión 2).
