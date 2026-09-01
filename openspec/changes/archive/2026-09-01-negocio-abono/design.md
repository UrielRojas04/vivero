## Context

El sistema hoy corre dos unidades de negocio en producción: **Vivero** (id 1) y **Herramientas** (id 2). El jefe suma un tercer negocio de venta de bolsas de abono que hasta ahora se llevaba en cuadernos, y que tiene tres particularidades que ninguna unidad existente resuelve:

1. **Dos ubicaciones físicas de stock** — el invernadero del jefe y el depósito del colega. `Producto.stock` es un único entero agregado; no alcanza.
2. **Dos operadores, un solo login** — el colega es socio, no empleado. Vende a sus propios clientes desde su depósito, pero no tiene ni tendrá usuario del sistema. Sus ventas y traslados tienen que quedar atribuidos a él sin preguntarle nada por operación.
3. **Una relación financiera interna** — el colega retiene plata y de a ratos rinde. Eso no es una cuenta corriente de cliente; es una deuda entre socios.

Estado del código relevante y sus restricciones:

- **`UnidadNegocioContextHolder` + `UnidadNegocioFilter`** ya implementan el patrón "contexto de sesión propagado por header HTTP a un `ThreadLocal`" (`X-Unidad-Negocio`). Es el molde exacto para la cuenta activa.
- **`useAuthStore`** ya persiste `unidadNegocioActiva` en `localStorage` y **`api/axios.js`** ya lo inyecta como header en cada request. Mismo molde para la cuenta activa.
- **`FinanzasServiceImpl.resumen()` decide por ID literal**: `if (unidadId == null || unidadId == 1L)` suma insumos, `if (unidadId == 2L)` suma costo de mercadería vendida. Una tercera unidad cae fuera de las dos ramas y devolvería costos en cero.
- **`Insumo` no tiene `unidadNegocio`** — la capacidad `catalogo-insumos` fue explícitamente modificada en su momento para hacerlos globales, y `InsumoRepository.sumarGastosInsumos` no filtra por unidad. Sin scoping, cada camionada de abono comprada aparecería como gasto del Vivero.
- **`Pago` puede tener `venta` en `null`** — hay dos rutas de alta: `VentaServiceImpl` (pago atado a la venta) y `FacturaClienteServiceImpl` (pago directo contra factura, sin venta). Esto condiciona cómo se calcula la caja del colega.
- **El frontend asume dos unidades**: `DashboardLayout` calcula `isHerramientas = activeBusinessId === 2` y de ahí deriva logo, `data-unidad` y filtrado de navegación; `Finanzas.jsx` compara contra los literales `'1'` y `'2'` en once lugares.

**Restricción dura del change**: Vivero y Herramientas están en producción con datos reales. Ninguna tarea puede alterar sus números ni su comportamiento. El invariante es verificable: con Abono sembrado pero sin datos, todo dashboard, listado y cálculo de las dos unidades existentes devuelve exactamente lo mismo que antes.

## Goals / Non-Goals

**Goals:**
- Operar el negocio de abono en el sistema, reutilizando al máximo lo que ya existe (clientes, ventas, pagos, facturas, cuenta corriente, insumos, finanzas).
- Saber cuántas bolsas de cada categoría hay en el invernadero y cuántas en el depósito del colega, en todo momento.
- Atribuir automáticamente ventas, cobros y traslados a la cuenta que los carga, sin un solo campo extra en los formularios.
- Saber cuánta plata debería tener el colega y registrar cuánto ya rindió.
- Ver una liquidación informativa según un porcentaje de reparto configurable.
- Eliminar las dos ramificaciones por ID literal que hoy bloquean sumar unidades (Finanzas backend y frontend), reemplazándolas por capacidades declaradas en `UnidadNegocio`.

**Non-Goals:**
- **No** se toca `Producto.stock`, `MovimientoStock`, `CapaCostoStock` ni el costeo por capas como mecanismos: siguen sirviendo a Vivero y Herramientas sin cambios de esquema ni de comportamiento.
- **No** hay login, usuario, rol ni permiso nuevo para el colega.
- **No** hay selector de "quién vende" por operación — el usuario lo rechazó explícitamente.
- **No** hay Pedidos a Proveedores para esta unidad.
- **No** hay receta, conversión insumo→producto ni costo unitario por producto en Abono.
- **No** hay movimiento automático de dinero por la liquidación: es un reporte.
- **No** se reutiliza `HistorialBandejas` — es otro concepto (envases retornables de cliente), sólo sirve de referencia de espíritu.
- **No** se resuelve la tensión con `us-017-finanzas-ui` del roadmap: este change es independiente.

## Decisions

### Decisión 1 — Abono es una tercera `UnidadNegocio`, no un módulo aparte

Se siembra una tercera fila en `unidades_negocio` y se reutilizan `Cliente`, `Venta`, `VentaDetalle`, `Pago`, `FacturaCliente` y `CuentaCorrienteDinero` tal como están, alcanzados por `unidadNegocio` como ya ocurre con las dos unidades existentes.

*Alternativa descartada*: un módulo "Abono" con entidades propias de cliente y venta. Duplicaría toda la lógica de cuenta corriente y pagos parciales que ya funciona y está probada, y dejaría dos verdades sobre "qué es una venta".

*Consecuencia*: el 70% de la funcionalidad del negocio sale gratis. Lo que hay que construir es exactamente lo que no encaja: stock por ubicación, cuenta activa y rendición.

### Decisión 2 — Las 7 categorías son 7 `Producto`, sin campo "categoría"

Cada categoría de bolsa es una fila de `productos` de la unidad Abono con su `precio`. Es el mismo patrón que una variedad de planta en Vivero.

*Alternativa descartada*: un campo `categoria` en `Producto` más una entidad `CategoriaAbono`. Agrega una columna a una tabla compartida con dos negocios en producción, para modelar algo que la tabla ya modela: un ítem vendible con precio propio.

*Consecuencia*: el CRUD de Productos, el buscador de la venta y la grilla de precios funcionan sin cambios. `costoProducto`, `porcentajeGanancia` y `monedaCosto` quedan sin usar en esta unidad, lo cual es correcto: Abono no cotiza costo por producto.

### Decisión 3 — Stock por ubicación en tablas NUEVAS y exclusivas de Abono

Dos entidades nuevas:

```
StockAbono            producto_id + ubicacion + cantidad     (único por producto+ubicacion)
MovimientoStockAbono  producto_id, ubicacion, cantidad, tipo, cuenta, usuario, fecha, venta_id?
```

con `tipo ∈ {PRODUCCION, TRASLADO_SALIDA, TRASLADO_ENTRADA, VENTA, AJUSTE}`.

*Alternativa descartada A*: agregar `ubicacion` a `MovimientoStock` y derivar el stock por ubicación de la suma de movimientos. Toca la tabla de movimientos de las dos unidades en producción, obliga a definir qué ubicación tienen los millares de movimientos históricos, y mete a Abono en el camino del costeo por capas del que quiere quedar afuera. El riesgo sobre Vivero y Herramientas no se justifica por reutilizar tres columnas.

*Alternativa descartada B*: un producto por categoría-y-ubicación (14 productos). Rompe el catálogo, duplica precios y hace que un traslado sea una venta interna. Inaceptable.

*Consecuencia*: cero superficie compartida con los negocios existentes. `MovimientoStockServiceImpl` y `CosteoPorCapasCalculator` no se tocan.

### Decisión 4 — `UbicacionAbono` y `CuentaAbono` son enums, no tablas

Ambos son conjuntos cerrados de dos valores, sin ABM en la interfaz, sin atributos propios y sin ciclo de vida. El repo ya usa este patrón para conjuntos cerrados (`TipoMovimientoStock`, `EstadoCheque`, `EstadoSiembra`, `MonedaCosto`), persistidos con `@Enumerated(EnumType.STRING)`.

*Alternativa descartada*: tablas `ubicaciones_abono` y `cuentas_abono` con dos filas fijas cada una. Suma dos joins, dos repositorios y dos seeds idempotentes para modelar algo que nunca va a crecer desde la UI. Si el día de mañana aparece una tercera ubicación, migrar de enum a tabla es un change acotado; anticiparlo hoy es costo sin beneficio.

*Consecuencia*: `String` legible en la base (`'INVERNADERO'`, `'COLEGA'`), no ordinales frágiles.

### Decisión 5 — La cuenta activa se propaga como contexto de petición, clonando el patrón de la unidad de negocio

La cadena es literalmente la misma que ya existe para la unidad:

```
useAuthStore.cuentaAbonoActiva  (Zustand + localStorage)
        ↓
axios interceptor  →  header  X-Cuenta-Abono: JEFE | COLEGA
        ↓
CuentaAbonoFilter (OncePerRequestFilter)  →  CuentaAbonoContextHolder (ThreadLocal)
        ↓
VentaServiceImpl / StockAbonoServiceImpl / PagoService  →  atribución automática
```

El filtro sólo envía el header cuando la unidad activa es Abono. Un valor no reconocido deja el contexto vacío: **nunca** cae en un default silencioso, porque atribuirle plata al jefe por un header roto es peor que fallar. Las operaciones de Abono que requieren cuenta rechazan la petición con error de validación si el contexto está vacío.

*Alternativa descartada A*: un `Usuario` real "colega" con login propio. El usuario lo descartó — el colega no quiere ni va a manejar credenciales — y arrastraría RBAC, permisos y auditoría de sesión.

*Alternativa descartada B*: un dropdown "¿quién vende?" en el formulario de venta. **Rechazado explícitamente por el usuario.** Además es frágil: un olvido atribuye plata a la persona equivocada.

*Alternativa descartada C*: guardar la cuenta activa en el servidor, atada al usuario. Requiere endpoint y persistencia para un dato que es puramente de sesión del cliente, y rompe si el jefe abre dos pestañas.

*Consecuencia*: el `ThreadLocal` debe limpiarse en el `finally` del filtro, igual que `UnidadNegocioFilter`, o el pool de threads de Tomcat arrastra la cuenta de una petición a la siguiente. Es la falla silenciosa más peligrosa del change y va con test explícito.

### Decisión 6 — La atribución de dinero va en `Pago`, no se deriva de `Venta`

`Venta` recibe `cuentaAbono` (nullable) para atribuir la venta. Pero la caja del colega **no** se calcula recorriendo ventas: se calcula sobre `Pago`, que también recibe `cuentaAbono` (nullable), asignado desde el contexto en el momento del alta.

El motivo es concreto: `Pago.venta` puede ser `null`. `FacturaClienteServiceImpl.registrarPago()` crea pagos directos contra la factura, sin venta asociada. Si la caja se derivara de `pago.venta.cuentaAbono`, todo cobro de cuenta corriente hecho por el colega contra su factura quedaría invisible — justo el caso que el jefe más necesita ver.

Atribuir el `Pago` al portador del contexto también es más fiel al negocio: la plata la tiene quien la recibió, no quien hizo la venta original.

*Alternativa descartada*: derivar de `pago.venta.cuentaAbono` con fallback a `pago.factura.cliente` → última venta. Frágil, indirecto, y falla exactamente en el caso de uso central.

*Consecuencia*: dos columnas nullable nuevas (`ventas.cuenta_abono`, `pagos.cuenta_abono`), en `NULL` para todo lo histórico y para todo lo de Vivero y Herramientas. `NULL` se lee como "no aplica cuenta", nunca como `JEFE`.

### Decisión 7 — El saldo del colega se calcula, no se materializa

```
caja_colega = Σ Pago.monto  [cuenta = COLEGA, estado = ACREDITADO]
            − Σ RendicionColega.monto
```

`RendicionColega` es una tabla de movimientos (monto, fecha, observación, usuario), append-only. No hay entidad "cuenta" con balance guardado.

*Alternativa descartada*: una `CuentaCorrienteInterna` con `balance` materializado, espejo de `CuentaCorrienteDinero`. El balance de un cliente se materializa porque cada venta y cada pago lo mueven desde un solo lugar. Acá el saldo depende de pagos que se crean en dos servicios distintos (`VentaServiceImpl` y `FacturaClienteServiceImpl`) más cheques que se acreditan después (`ChequeServiceImpl`); mantener un contador sincronizado desde tres rutas es cómo se corrompen los balances. El volumen es de decenas de operaciones por mes: la agregación es instantánea y siempre correcta por construcción.

*Consecuencia*: si un cheque del colega rebota y pasa a `NO ACREDITADO`, el saldo se corrige solo en la siguiente consulta. Con balance materializado habría que acordarse de revertirlo.

### Decisión 8 — Finanzas decide por capacidad declarada, no por ID de unidad

Se agrega a `UnidadNegocio` un campo `modeloCosto` con valores `INSUMOS` y `MERCADERIA_VENDIDA`, sembrado como: Vivero → `INSUMOS`, Herramientas → `MERCADERIA_VENDIDA`, Abono → `INSUMOS`. `FinanzasServiceImpl.resumen()` reemplaza `unidadId == 1L` / `unidadId == 2L` por la lectura de ese campo. El DTO de unidad de negocio expone `modeloCosto` para que `Finanzas.jsx` deje de comparar contra `'1'` y `'2'`.

Es el mismo precedente que ya existe en la casa: `costeoPorCapasHabilitado` fue introducido justamente para no leer por ID de unidad, y su comentario en el código lo dice textualmente ("NUNCA se lee por id de unidad — sólo por este flag").

*Alternativa descartada A*: agregar `|| unidadId == 3L` a la rama de insumos. Funciona hoy y deja la bomba armada para la cuarta unidad. Además no arregla el frontend, donde los literales están en once lugares.

*Alternativa descartada B*: un flag booleano `usaInsumosComoCosto`. Con dos modelos alcanza, pero un booleano no admite un tercer modelo sin volver a migrar. El enum es igual de barato y no cierra la puerta.

*Consecuencia*: el seed debe escribir `modeloCosto` en las dos unidades existentes antes de que Finanzas lo lea. Con el mapeo de arriba, los resultados de Vivero y Herramientas son idénticos a los actuales por construcción — es una refactorización de igual comportamiento, y así hay que testearla.

### Decisión 9 — `Insumo` pasa a estar alcanzado por unidad, con retrofit a Vivero

Se agrega `Insumo.unidadNegocio` (nullable en el esquema, obligatorio en la lógica), un paso de retrofit en `DataInitializer` que asigna a Vivero todo insumo sin unidad, y `sumarGastosInsumos` pasa a recibir el `unidadId`. El alta toma la unidad del contexto activo.

Esto revierte parcialmente una decisión previa de la capacidad `catalogo-insumos` ("de forma global, ya no se asocian a una Unidad de Negocio"). La reversión es necesaria y acotada: mientras hubo una sola unidad consumiendo insumos, "global" y "de Vivero" eran indistinguibles. Con Abono comprando camionadas, dejan de serlo — sin scoping, las camionadas de abono aparecerían como gasto del Vivero y le romperían la rentabilidad al jefe.

*Alternativa descartada*: una entidad `InsumoAbono` separada. Duplica un CRUD entero y su pantalla para esquivar una columna.

*Consecuencia*: es el punto de mayor riesgo del change sobre datos existentes. El retrofit debe ser idempotente y el total de gastos de insumos de Vivero antes y después tiene que ser bit a bit el mismo. Va como checkpoint explícito con el usuario.

### Decisión 10 — El frontend se generaliza a N unidades por identidad declarada

`isHerramientas` desaparece como concepto. En su lugar, un mapa de identidad por unidad (slug, logo, clase de placa) y entradas de navegación que declaran a qué unidades pertenecen, en vez de listas de exclusión por etiqueta. `data-unidad` sale del slug de la unidad activa; una unidad sin identidad declarada cae en el acento neutral.

*Alternativa descartada*: agregar `isAbono` junto a `isHerramientas`. Con tres unidades ya hay seis combinaciones booleanas y la lógica de navegación (que hoy filtra por nombre de etiqueta con condiciones anidadas) se vuelve ilegible.

*Consecuencia*: es una refactorización de igual comportamiento para Vivero y Herramientas. Hay que verificar visualmente que logos, placas y entradas de menú de esas dos unidades quedan idénticos.

### Decisión 11 — `Producto.stock` de Abono se mantiene como espejo derivado

Para los productos de la unidad Abono, `Producto.stock` se actualiza en la misma transacción como la suma de sus `StockAbono`. La verdad vive en `StockAbono`; `Producto.stock` es una proyección de sólo lectura.

*Alternativa descartada*: dejar `Producto.stock` en 0 para Abono. La grilla de Productos, el buscador de la venta y las alertas de stock bajo mostrarían cero para todas las categorías, con un "sin stock" mentiroso en pantallas compartidas.

*Consecuencia*: es escritura sobre una columna compartida, pero **sólo** en filas cuya `unidad_negocio_id` es Abono. Ninguna fila de Vivero ni de Herramientas se toca. La validación de disponibilidad de la venta de Abono se hace contra `StockAbono` de la ubicación, nunca contra el espejo.

## Risks / Trade-offs

- **El retrofit de insumos altera las finanzas de Vivero** → Es el riesgo #1. Mitigación: capturar el total de gastos de insumos de Vivero por período ANTES de tocar nada, retrofit idempotente que sólo escribe donde `unidad_negocio_id IS NULL`, y comparar el total después. Checkpoint obligatorio con el usuario antes de continuar.

- **La refactorización de Finanzas cambia números de Vivero o Herramientas** → Mitigación: tratarla como refactorización de igual comportamiento. Test con los tres modelos y aserción explícita de que Vivero (`INSUMOS`) y Herramientas (`MERCADERIA_VENDIDA`) devuelven los mismos valores que con las ramas por ID.

- **El `ThreadLocal` de la cuenta se filtra entre peticiones** → Atribuiría plata a la cuenta equivocada de forma silenciosa, sin error visible. Mitigación: `clear()` en el `finally` del filtro, igual que `UnidadNegocioFilter`, más un test que encadene una petición con cuenta y otra sin, verificando contexto vacío en la segunda.

- **Traslado o venta parcialmente aplicados dejan stock inconsistente** → Mitigación: `@Transactional` en el servicio, validación de disponibilidad antes de escribir, y la restricción de no-negatividad como red final en la base.

- **La generalización del frontend rompe visualmente Vivero o Herramientas** → Mitigación: repaso visual de las dos unidades (logo, placa, acento, navegación completa) antes de dar por cerrado el grupo.

- **`ddl-auto` y el `UNIQUE (producto_id, ubicacion)`** → Hibernate puede no crear la restricción compuesta si el esquema ya existe. Mitigación: declararla en la anotación de la tabla y verificarla en la base de desarrollo; si no aparece, agregarla explícitamente.

- **Dos columnas nullable nuevas en `ventas` y `pagos`** → Tablas compartidas con negocios en producción. Trade-off aceptado: son nullable, sin default, no leídas por ninguna ruta de Vivero ni Herramientas, y `NULL` significa "no aplica cuenta". La alternativa (tablas de atribución aparte) agrega un join a la ruta caliente de la venta para ahorrar una columna nula.

- **El colega no tiene login: cualquiera puede fingir ser él cambiando el selector** → No es una frontera de seguridad, es una comodidad operativa, y así lo quiso el usuario. Mitigación: cada movimiento y cada venta guarda **también** el `Usuario` que lo registró, además de la cuenta. La trazabilidad real queda en el usuario; la cuenta es atribución contable.

- **Las cuentas fijas Jefe/Colega no escalan a un segundo socio** → Trade-off aceptado: el negocio tiene dos socios y no hay indicio de un tercero. Migrar el enum a tabla sería un change acotado si aparece.

## Migration Plan

1. **Línea de base**: correr la suite existente y capturar el resultado. Registrar totales de Finanzas de Vivero y Herramientas para un período conocido.
2. **Capacidades en `UnidadNegocio`**: agregar `modeloCosto` y `porcentajeRepartoColega`, sembrar las dos unidades existentes (`INSUMOS` / `MERCADERIA_VENDIDA`, reparto 0.00). Sin cambios de comportamiento todavía.
3. **Refactorizar `FinanzasServiceImpl`** para leer `modeloCosto`. Verificar contra los totales del paso 1. **Checkpoint.**
4. **Alcanzar `Insumo` por unidad** + retrofit a Vivero. Verificar el total de gastos de insumos de Vivero contra el paso 1. **Checkpoint.**
5. **Sembrar la unidad Abono** y sus 7 categorías, idempotente.
6. **Construir lo nuevo** — enums, `StockAbono`, `MovimientoStockAbono`, `RendicionColega`, filtro de cuenta, servicios y endpoints. Sin superficie compartida: bajo riesgo.
7. **Atribución**: `Venta.cuentaAbono` y `Pago.cuentaAbono` desde el contexto, con bifurcación de stock en `VentaServiceImpl` cuando la unidad es Abono.
8. **Frontend**: generalizar layout y Finanzas, agregar el segundo switcher y las pantallas nuevas.
9. **Verificación final**: con Abono sembrado y sin datos, los dashboards de Vivero y Herramientas devuelven exactamente los valores del paso 1.

**Rollback**: los pasos 2, 5, 6 son aditivos y reversibles quitando el seed. Los pasos 3 y 4 son los únicos que tocan rutas compartidas y son los que van con checkpoint; su reversión es revertir el commit correspondiente, ya que las columnas nuevas quedan sin leerse.

## Revisión post-implementación

Ronda de remediación (2026-09-01) sobre hallazgos reales de una auditoría de backend. Documenta decisiones tomadas *después* de este design.md original que lo dejan parcialmente desactualizado, más el detalle de tres bugs corregidos. Alcance: backend solamente.

### El colega tiene login real — reemplaza el mecanismo de header/switcher de la Decisión 5

La Decisión 5 (`La cuenta activa se propaga como contexto de petición, clonando el patrón de la unidad de negocio`) asumía explícitamente que "el colega no tiene ni tendrá usuario del sistema" y descartaba un login real como Alternativa A ("el usuario lo descartó"). Esa premisa cambió: `colega@vivero.com` es hoy un usuario real, sembrado en `DataInitializer.java` con su propio rol (`COLEGA`) y contraseña. Con login propio, la cuenta activa ya no necesita viajar en un header (`X-Cuenta-Abono`) alimentado por un selector de frontend — se deriva directamente de `auth.getName()` en `CuentaAbonoFilter`, exactamente como ya se deriva la identidad de cualquier otro usuario autenticado del sistema.

Consecuencia práctica:
- El header `X-Cuenta-Abono` (mencionado en la Decisión 5, tareas 5.3/5.4/10.2 y en `specs/cuenta-abono-activa/spec.md`) nunca llegó a inyectarse desde el frontend (tarea 10.2 no se implementó) y se eliminó como capacidad allowlisteada en el CORS de `SecurityConfig.java`. El campo muerto `HEADER_NAME` en `CuentaAbonoFilter.java` se eliminó junto con él.
- Las tareas 10.1–10.4 (switcher de cuenta activa en el frontend) quedan obsoletas/supersedidas — ver `tasks.md`.
- El resto de la Decisión 5 sigue vigente sin cambios: el `ThreadLocal` vía `CuentaAbonoContextHolder`, la limpieza obligatoria en el `finally`, y el principio de "nunca cae en un default silencioso" (ver más abajo).

### `CategoriaAbono` es una entidad real — reemplaza la Decisión 2 ("7 categorías son 7 `Producto`")

La Decisión 2 original modelaba cada categoría de bolsa como una fila de `productos` sin campo `categoria`, descartando explícitamente una entidad `CategoriaAbono` por agregar una columna a una tabla compartida con dos negocios en producción. Esa decisión fue revertida por el usuario: `CategoriaAbono` existe hoy como entidad completa (`models/CategoriaAbono.java`, `CategoriaAbonoRepository`, `CategoriaAbonoService`/`Impl`, `CategoriaAbonoController`, `CategoriaAbonoDTO`), y `Producto` tiene `categoria_abono_id`. La Decisión 2 queda documentada aquí como registro histórico de *por qué* se descartó originalmente, pero el código real sigue el modelo con entidad propia — no la alternativa "categoría = Producto".

### Fallback de `CuentaAbonoFilter`: explícito por username, nunca "cualquier no-colega = jefe"

Antes de esta ronda, el filtro resolvía: `colega@vivero.com` → `COLEGA`, **cualquier otro usuario autenticado** → `JEFE`. Con el colega usando login propio (arriba), ese `else` genérico dejó de ser un simple "usuario legado sin cuenta explícita" y pasó a ser una superficie real: un tercer empleado futuro con su propio login heredaría silenciosamente la cuenta del jefe.

Criterio elegido: mapeo explícito por los dos únicos usernames de referencia reales (`jefe@vivero.com` y `colega@vivero.com`, los mismos sembrados en `DataInitializer.java`). Cualquier otro usuario autenticado deja el contexto **vacío** (no cae en `JEFE`), siguiendo el mismo principio que ya declaraba la Decisión 5 para el header: "nunca cae en un default silencioso [...] atribuirle plata al jefe por un header roto es peor que fallar". Los servicios de Abono que necesitan una cuenta definida (`VentaServiceImpl.crearVenta`, que ya validaba esto) siguen rechazando con error de validación si el contexto está vacío; los que sólo filtran opcionalmente (`listarVentas`) simplemente no aplican el filtro por cuenta si no hay una.

Se optó por **no** rechazar la petición completa a nivel de filtro (para cualquier request de un tercer usuario) porque el filtro corre en *todas* las peticiones del sistema, no sólo las de Abono: un tercer empleado debe poder seguir operando Vivero/Herramientas con normalidad. El rechazo explícito, si hace falta, vive en el punto de uso (el servicio de Abono que requiere la cuenta), no en el filtro global.

El campo `HEADER_NAME` (declarado pero nunca leído — no había ningún `request.getHeader(...)` en el filtro) se eliminó como código muerto.

Test real: `backend/src/test/java/com/vivero/gestion/security/CuentaAbonoFilterTest.java` (colega → `COLEGA`, jefe → `JEFE`, usuario desconocido → contexto vacío, limpieza post-request).

### Por qué se sacó el literal `unidadId == 3L` de `VentaServiceImpl.listarVentas()` (y por qué no se dejó sólo `cuentaAbono != null`)

Mismo anti-patrón que la Decisión 8 ya había eliminado de `FinanzasServiceImpl` (branch por ID literal de unidad). La primera hipótesis de arreglo — dejar sólo `cuentaAbono != null`, asumiendo que las ventas de Vivero/Herramientas nunca tienen cuenta seteada — es **incorrecta** y se descartó tras comprobarlo con un test real: `CuentaAbonoContextHolder` se completa para *cualquier* usuario autenticado (jefe o colega) en *cualquier* unidad que esté consultando, no sólo en Abono. Con esa hipótesis, un jefe navegando el listado de ventas de Vivero dispara `findAllByUnidadNegocioIdAndCuentaAbono(vivero, JEFE)`, y como las ventas de Vivero tienen `cuenta_abono IS NULL` en la base, la consulta devuelve **vacío** — rompiendo el listado de Vivero para cualquier jefe o colega autenticado.

Se comprobó el error concretamente: se aplicó la hipótesis ingenua, se corrió `VentaServiceListarVentasAbonoTest#unidadViveroNoFiltraPorCuentaAbonoAunConContextoResidual` y falló (lista vacía en vez de contener la venta de Vivero); se revirtió a la solución final y volvió a pasar.

Solución aplicada: seguir gateando por unidad, pero resolviendo "es la unidad Abono" por nombre (`unidadNegocioRepository.findByNombre("Abono")`) en vez de por ID literal — el mismo patrón que ya usa `RendicionColegaServiceImpl` en los cuatro métodos de ese servicio, y que `VentaServiceImpl.crearVenta` ya usaba en la misma clase (línea ~124, `"Abono".equals(unidad.getNombre())`) sin que `listarVentas()` lo replicara. No requiere agregar ningún campo nuevo a `UnidadNegocio`.

Test real: `backend/src/test/java/com/vivero/gestion/services/VentaServiceListarVentasAbonoTest.java` (venta de Abono con cuenta filtra correctamente por cuenta; venta de Vivero con contexto de cuenta residual no se filtra).

### Permiso de la liquidación: `LEER_FINANZAS`, no `ESCRIBIR_VENTAS`

`RendicionColegaController` (que sirve `/api/abono/rendiciones/**`, incluida la liquidación) protegía **todos** sus endpoints con `ESCRIBIR_VENTAS` — el mismo permiso que tiene cualquier empleado que carga una venta. `GET /liquidacion` devuelve `LiquidacionAbonoDTO`, que expone `ingresosJefe`, `ingresosColega` y `compensacionTeorica`: cuánto gana/tiene cada socio. Eso es información financiera, no operativa, y se protegió con `LEER_FINANZAS` — el mismo permiso que ya protege `Finanzas.jsx` en el resto de la app (`ChequeController`, `GastoController`, `FinanzasController`) — en vez de crear un permiso nuevo.

`registrarRendicion` (POST — "anotar que el colega entregó plata"), `obtenerHistorialRendiciones` y `/caja-colega` quedaron **sin cambios**, con `ESCRIBIR_VENTAS`: son operativos (registran o muestran un movimiento puntual, no un reparto de ganancias), no financieros en el sentido de "cuánto gana cada uno".

La tarea 9.4 de `tasks.md` decía "protegido por el permiso financiero (`ADMIN_DB`)" y la 9.5 marcaba el test como "(Validado en código)" — ninguna de las dos reflejaba el código real (`ESCRIBIR_VENTAS` en los cuatro endpoints, sin test). Corregido y con test real esta vez.

Test real: `backend/src/test/java/com/vivero/gestion/controllers/RendicionColegaControllerPermisoTest.java` (sin `LEER_FINANZAS` → `AccessDeniedException`; con `LEER_FINANZAS` → 200; `registrarRendicion` sigue funcionando sólo con `ESCRIBIR_VENTAS`).

## Open Questions

Ninguna bloqueante. Resueltas por criterio en este documento, para registro:

- **¿Qué pasa si el jefe vende desde el depósito del colega, o al revés?** No se contempla: la cuenta activa determina la ubicación. Si hiciera falta, se resuelve cambiando el selector antes de cargar la venta. Un traslado de corrección cubre el caso raro.
- **¿Los cheques recibidos por el colega cuentan en su caja?** Sí, cuando están `ACREDITADO`, porque el cálculo filtra por estado del pago. Un cheque rebotado sale del saldo automáticamente.
- **¿La liquidación arrastra saldo entre períodos?** No. Es un reporte de período, sin cierre ni acumulado. Si el jefe necesita un cierre formal, es un change posterior.
- **¿Se pueden anular producciones o traslados?** No en esta entrega. La bitácora es append-only; una corrección se registra como movimiento de `AJUSTE`.
