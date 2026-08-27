## Context

El RBAC de Sistema Vivero es plano: `Usuario ↔ Rol ↔ Permiso`, donde `Permiso` no es una tabla sino el enum `PermisoEnum` (16 valores, IDs estables que el frontend consume vía `GET /api/roles/permisos`). El JWT lleva las autoridades y `hasAuthority(...)` / `hasPermission(...)` las evalúan en backend y frontend respectivamente.

**Estado actual de Facturación (`/facturas`), verificado en código:**

| Punto de control | Regla hoy | Archivo |
|---|---|---|
| Item de sidebar | `['ESCRIBIR_VENTAS','LEER_CLIENTES']` evaluado con `.some()` (OR) | `DashboardLayout.jsx:22` |
| Ruta protegida | `requiredPermission={['ESCRIBIR_VENTAS','LEER_CLIENTES']}`, también OR (`ProtectedRoute.jsx:16`) | `App.jsx:72-75` |
| Endpoints lectura | `hasAuthority('ESCRIBIR_VENTAS') or hasAuthority('LEER_CLIENTES')` | `FacturaClienteController.java:29,39` |
| Endpoints escritura | `hasAuthority('ESCRIBIR_VENTAS')` | `FacturaClienteController.java:23,45,51,57,63` |
| Modal de roles | sin grupo "Facturación" | `UsuariosAdmin.jsx:38-48` |

Resultado: cualquier empleado de ventas (que necesita `ESCRIBIR_VENTAS` para trabajar) entra a Facturación sí o sí, y no hay ninguna palanca — ni siquiera en la base — para separarlos. Además el `.some()` (OR) hace que un solo permiso alcance, así que ni siquiera se puede endurecer combinando los dos existentes.

**Restricciones que condicionan el diseño:**
- `PermisoEnum` documenta en su javadoc que los IDs son estables y que los valores nuevos van **al final**. Reordenar rompe la UI.
- `DataInitializer` reasigna `EnumSet.allOf(PermisoEnum.class)` a `JEFE` en **cada** arranque (`DataInitializer.java:82-87`), no sólo al crearlo. Ese `setPermisos` fuera del `crearRol` es la razón por la que `JEFE` absorbe permisos nuevos sin migración.
- `Facturas.jsx` obtiene su listado con `GET /clientes`, que exige `LEER_CLIENTES` (`ClienteController.java:24`). Un usuario con `LEER_FACTURACION` a secas vería la pantalla vacía.
- Dominio de gobernanza **CRÍTICO** (auth/seguridad): el cambio de `@PreAuthorize` requiere aprobación humana explícita antes de escribirse.

## Goals / Non-Goals

**Goals:**
- Que el acceso a Facturación sea otorgable y revocable de forma independiente de `ESCRIBIR_VENTAS`.
- Que el jefe pueda hacerlo desde el panel de Usuarios (Admin), sin tocar la base ni el código.
- Que el gate sea real en las tres capas (menú, ruta, API), no sólo cosmético en el menú.
- Que `JEFE` no pierda acceso en ningún momento del despliegue.

**Non-Goals:**
- No se separa lectura de escritura dentro de Facturación con dos permisos distintos (`LEER_` + `ESCRIBIR_FACTURACION`). Un solo permiso alcanza para lo que el usuario pidió; la escritura sigue apoyándose en `ESCRIBIR_VENTAS`.
- No se migra ni reasigna ningún rol existente.
- No se corrige el filtrado por unidad de negocio de Finanzas/Cheques en el modal de roles (fuera de alcance, ver proposal).
- No se toca `LEER_PEDIDOS` / `ESCRIBIR_PEDIDOS`.
- No se modifica el contenido ni el layout de `Facturas.jsx` / `FacturaCliente.jsx`.

## Decisions

### Decisión 1 — Un permiso nuevo, `LEER_FACTURACION(17L)`, agregado al final del enum

Se agrega como último valor de `PermisoEnum`, tomando el ID 17. No se reordena nada.

*Alternativas descartadas:*
- **Reutilizar `LEER_FINANZAS`**: gatea Finanzas y Cheques, dos secciones con otra semántica (caja, gastos, cheques del negocio) y hoy visibles sólo en Herramientas. Acoplaría Facturación a Finanzas, cambiando un acoplamiento por otro.
- **Permiso dinámico por unidad de negocio** (estilo `HERRAMIENTAS_LEER_FACTURACION`): el sistema ya tiene autoridades dinámicas por unidad para stock, pero Facturación existe idéntica en ambas unidades y el usuario no pidió granularidad por unidad. Sería complejidad sin demanda.
- **Par `LEER_FACTURACION` + `ESCRIBIR_FACTURACION`**: agrega una casilla más al modal para una distinción que nadie pidió; `ESCRIBIR_VENTAS` ya cubre bien la escritura.

### Decisión 2 — La regla de acceso es **conjuntiva** (AND), no disyuntiva

| Operación | Permisos exigidos |
|---|---|
| Ver la sección / leer facturas | `LEER_FACTURACION` **AND** `LEER_CLIENTES` |
| Abrir factura, agregar concepto, registrar/rechazar pago, cerrar | `LEER_FACTURACION` **AND** `ESCRIBIR_VENTAS` |

**Por qué `LEER_CLIENTES` sigue siendo requisito de lectura:** Facturación es intrínsecamente por cliente. `Facturas.jsx` arranca con `GET /clientes` (que ya exige `LEER_CLIENTES`), y toda factura se resuelve por `clienteId`. Un usuario con `LEER_FACTURACION` sin `LEER_CLIENTES` vería una pantalla vacía y un 403 del backend de clientes: sería un acceso roto, no un acceso restringido. Exigirlo explícitamente hace que el fallo sea coherente y evaluado en un solo lugar.

**Por qué `ESCRIBIR_VENTAS` deja de ser requisito de *lectura*:** ese es exactamente el acoplamiento que el change viene a romper. Un administrativo debe poder consultar facturación sin quedar habilitado a cargar ventas.

**Por qué `ESCRIBIR_VENTAS` sigue siendo requisito de *escritura*:** registrar pagos, cerrar facturas y agregar conceptos son operaciones de mutación comercial equivalentes en peso a cargar una venta. Bajarlas a `LEER_FACTURACION` a secas ampliaría el acceso de escritura, que es lo contrario de lo que se busca. Y mantener el AND con `LEER_FACTURACION` garantiza que revocar Facturación revoque también las mutaciones, no sólo la vista.

**Nota sobre el OR del frontend:** `ProtectedRoute` y el filtro del sidebar evalúan arrays con `.some()` (OR). Por eso, en el frontend, el gate de Facturación se expresa con el **string simple** `'LEER_FACTURACION'`, no con un array. La exigencia adicional de `LEER_CLIENTES` la hace cumplir el backend (403 en `/clientes` y en `/facturas/...`), que es la frontera que importa. No se toca la semántica de `ProtectedRoute` — cambiarla de OR a AND afectaría a Bandejas y a las demás pantallas que dependen del OR actual.

### Decisión 3 — El backend es la frontera real; el frontend sólo evita pantallas rotas

Los tres cambios de frontend (sidebar, rutas, modal) son UX. La autorización efectiva vive en las 7 anotaciones `@PreAuthorize` de `FacturaClienteController`. La verificación de aceptación por lo tanto se hace contra la API (403 real), no mirando si el link desaparece del menú.

### Decisión 4 — El grupo "Facturación" del modal asigna `LEER_FACTURACION` + `LEER_CLIENTES`

El array `SECTIONS` de `UsuariosAdmin.jsx` ya sigue el patrón de agrupar todos los permisos que una sección necesita (ej. Ventas agrupa tres). Coherente con la Decisión 2: marcar "Facturación" debe dejar el rol operativo de entrada, sin que el jefe tenga que deducir que además hace falta Clientes.

Se inserta **inmediatamente después de `ventas`**, para que el orden visual del modal espeje el orden del sidebar (Ventas → Facturación). Sin spread condicional por unidad: Facturación existe en Vivero y en Herramientas.

### Decisión 5 — Sin migración: nadie salvo `JEFE` arranca con el permiso

Decisión de negocio explícita del usuario. Consecuencia verificada en código: `DataInitializer.java:82-87` hace `crearRol("JEFE", allOf)` y **además** `rolJefe.setPermisos(permisosJefe); rolRepository.save(rolJefe);` en cada arranque — con lo cual `JEFE` recibe `LEER_FACTURACION` automáticamente al primer boot posterior al deploy, incluso existiendo ya en la base. **`JEFE` no pierde acceso a Facturación en ningún momento.**

Todos los demás roles (incluido el `Admin2` de Herramientas, creado a mano) quedan sin `LEER_FACTURACION` y pierden el acceso hasta que el jefe lo asigne. Es el efecto buscado, pero es visible para usuarios reales: requiere aviso previo (ver Migration Plan).

### Decisión 6 — Eliminar el seed de `EMPLEADO_VIVERO`, conservar el de `JEFE`

Se borra el bloque `DataInitializer.java:89-96` (`permisosEmpleado` + `crearRol("EMPLEADO_VIVERO", ...)` + `setPermisos` + `save`). El bloque de `JEFE` (líneas 82-87) queda intacto: es el rol de arranque que garantiza que siempre haya alguien que pueda administrar el sistema.

**Es una eliminación de código, no un `DELETE`.** No se agrega ninguna sentencia de borrado. Si `EMPLEADO_VIVERO` ya existe en una base real, sobrevive con sus permisos y sus usuarios asignados; lo único que cambia es que el arranque deja de re-imponerle el set `{LEER_STOCK, ESCRIBIR_STOCK, ESCRIBIR_VENTAS}`. Efecto colateral **deseado**: hasta hoy, si el jefe editaba `EMPLEADO_VIVERO` desde el panel, el siguiente reinicio del backend le pisaba los permisos. Sacando el seed, la edición manual pasa a ser durable.

## Risks / Trade-offs

- **Usuarios reales pierden acceso a Facturación en el momento del deploy** → Es el comportamiento pedido, no un bug. Mitigación: avisar al jefe antes de desplegar y dejar listo el paso de reasignación (panel → Roles → editar → marcar "Facturación"). El propio `JEFE` conserva acceso, así que siempre hay quien pueda reasignar.
- **`LEER_FACTURACION` sin `LEER_CLIENTES` produce una pantalla vacía si el jefe arma un rol a mano en modo "Avanzado (Permisos)"** → Mitigado por el grupo del modal, que asigna los dos juntos, y por el `@PreAuthorize` de lectura que exige ambos (403 explícito en vez de listado vacío silencioso).
- **Frontend OR vs backend AND**: el sidebar mostrará "Facturación" a alguien que tenga `LEER_FACTURACION` pero no `LEER_CLIENTES`, y la pantalla fallará contra el backend → Caso de borde de configuración manual incorrecta; el backend nunca filtra datos de más. Se acepta antes que reescribir la semántica de `ProtectedRoute`, que impactaría otras pantallas.
- **El ID 17 queda quemado en la base** (`rol_permisos` guarda el enum) → Riesgo estándar del patrón ya existente; mitigado respetando la regla "agregar al final, nunca reordenar" del javadoc de `PermisoEnum`.
- **Colisión con el change activo `facturacion-rediseno-visual`** → Ese change toca `FacturaCliente.jsx` (sólo visual); este change no modifica ese archivo. Sin solapamiento de líneas, pero conviene aplicar este después o coordinar el orden.
- **Tests con base real (regla dura del proyecto: sin mocks de DB)** → La verificación de los 403 se hace contra el backend levantado y la base real, con usuarios de prueba creados desde el panel, no con mocks de `SecurityContext`.

## Migration Plan

1. Aplicar los cambios de backend y frontend (sin desplegar).
2. Avisar al jefe: "tras el deploy, Facturación queda visible sólo para JEFE hasta que reasignes el permiso".
3. Desplegar. En el primer arranque, `DataInitializer` agrega `LEER_FACTURACION` a `JEFE` automáticamente.
4. El jefe entra al panel → Roles → edita cada rol que deba ver Facturación → marca la sección "Facturación" → guarda.
5. Verificar con un usuario no-JEFE sin el permiso: el item no aparece, `/facturas` redirige y la API responde 403.

**Rollback:** revertir el commit. `LEER_FACTURACION` desaparece del enum; las filas de `rol_permisos` con ese valor quedan huérfanas — **verificar en el rollback** que `Rol` no falle al deserializar un valor de enum inexistente (si se persiste como `STRING`/`ORDINAL` puede lanzar excepción al leer). Si el rollback es urgente, el camino seguro es primero desmarcar Facturación en todos los roles desde el panel y recién después revertir.

## Open Questions

- Ninguna bloqueante. Las tres decisiones de negocio (permiso independiente, grupo en el modal, sin migración) fueron cerradas por el usuario en la exploración previa.
- A confirmar durante el apply (no bloquea el diseño): si `EMPLEADO_VIVERO` existe en la base productiva y sigue asignado a usuarios activos — sólo para saber si hay que avisar de algún efecto sobre ellos. La respuesta no cambia el diseño: el rol no se toca de ninguna manera.
