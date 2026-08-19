## Context

El sistema maneja autorización con un RBAC plano `Usuario ↔ Rol ↔ Permiso`. Los permisos son cadenas que viajan en el JWT como autoridades y se verifican en dos lugares: en el backend con `@PreAuthorize` sobre los controllers, y en el frontend con `useAuthStore.hasPermission()`, que alimenta tanto el filtrado del menú lateral en `DashboardLayout.jsx` como el guard de rutas `ProtectedRoute.jsx`.

Los permisos existentes hoy, dados de alta en `DataInitializer.run()`, son nueve: `LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`, `ADMIN_DB`, `LEER_CLIENTES`, `ESCRIBIR_CLIENTES`, `LEER_INSUMOS`, `ESCRIBIR_INSUMOS` y `LEER_FINANZAS`. El rol `JEFE` los recibe todos; el rol `EMPLEADO_VIVERO` recibe únicamente `LEER_STOCK`, `ESCRIBIR_STOCK` y `ESCRIBIR_VENTAS`.

El circuito de bandejas vive hoy enteramente dentro de la página de clientes. `Clientes.jsx` importa `DevolucionBandejasModal.jsx` e `HistorialBandejasModal.jsx` y los dispara desde dos botones por fila, condicionados por `unidadNegocioActiva !== '2'` (la unidad 2 es "Herramientas", donde las bandejas no aplican). Ambos modales consumen `BandejasController`, que expone `GET /api/clientes/{id}/bandejas/historial` y `POST /api/clientes/{id}/bandejas/devolucion`.

Dos hechos verificados en código condicionan todo el diseño:

1. **`BandejasController` no tiene ninguna anotación `@PreAuthorize`**, ni en la clase ni en sus dos métodos. La única protección efectiva es `JwtFilter`, que exige estar autenticado. Cualquier usuario logueado —incluido un `EMPLEADO_VIVERO` que ni siquiera puede abrir `/clientes`— puede hoy consultar el historial de bandejas y registrar devoluciones de cualquier cliente con una llamada HTTP directa. Es un hueco preexistente que este change cierra, y que existiría igual aunque no se agregara ninguna funcionalidad nueva.

2. **`ClienteDTO` expone `balanceDinero` y `telefono`** además de `id`, `nombreRazonSocial` y `balanceBandejas`. Es el DTO que devuelve `GET /api/clientes`, el único listado de clientes disponible hoy. Reutilizarlo para la pantalla nueva anularía el propósito del change: el empleado vería el saldo de dinero de cada cliente en el mismo payload que necesita para elegir a quién asentarle una devolución.

Sobre la lectura real de los modales: `DevolucionBandejasModal.jsx` usa `cliente.id` para armar la URL del POST, `cliente.nombreRazonSocial` para la leyenda y `cliente.balanceBandejas` para mostrar la deuda actual. `HistorialBandejasModal.jsx` usa `cliente.id` para el GET y `cliente.nombreRazonSocial` para el subtítulo. Ninguno de los dos lee `balanceDinero` ni `telefono`. Los tres campos alcanzan.

## Goals / Non-Goals

**Goals:**

- Permitir que el jefe habilite a un empleado a registrar devoluciones de bandejas y consultar el historial, sin exponerle el balance de dinero, el teléfono, la cuenta corriente ni la posibilidad de crear, editar o eliminar clientes.
- Cerrar el hueco de autorización de `BandejasController`, de modo que las dos rutas dejen de estar abiertas a cualquier usuario autenticado.
- Que el circuito actual del jefe siga funcionando exactamente igual, sin tocar `Clientes.jsx`.
- Que otorgar el acceso sea una acción explícita del jefe desde la pantalla de administración de roles, no un permiso que aparezca asignado solo.

**Non-Goals:**

- No se modifican los botones "Devolver Bandejas" e "Historial Bandejas" de `Clientes.jsx`. El jefe los sigue usando como hasta ahora.
- No se cambia ninguna regla de negocio de bandejas: ni el cálculo de `balanceBandejas`, ni `CuentaCorrienteBandejas`, ni el asiento en `HistorialBandejas`, ni la validación de cantidad. Este change es sobre acceso, no sobre comportamiento.
- No se reescriben los modales `DevolucionBandejasModal.jsx` ni `HistorialBandejasModal.jsx`. Se reutilizan tal cual.
- No se aplica este patrón de permiso acotado a otras pantallas con datos sensibles (Cheques, Finanzas, Cuenta Corriente). Queda anotado como patrón reutilizable para un change futuro, pero fuera de alcance acá.
- No se agrega paginación ni búsqueda server-side al listado nuevo. Se sigue el patrón vigente en el proyecto.

## Decisions

### Decisión 1 — Dos permisos separados, `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`

Se agregan dos permisos y no uno solo.

La convención de nombres del proyecto es `VERBO_SUSTANTIVO` con los verbos `LEER` y `ESCRIBIR`, y el par completo existe en tres de los cuatro dominios: `LEER_STOCK`/`ESCRIBIR_STOCK`, `LEER_CLIENTES`/`ESCRIBIR_CLIENTES`, `LEER_INSUMOS`/`ESCRIBIR_INSUMOS`. Las dos excepciones son `LEER_FINANZAS`, que no tiene contraparte de escritura, y `ADMIN_DB` y `ESCRIBIR_VENTAS`, que son permisos sueltos. El patrón dominante es el par, y las excepciones son dominios donde la operación inversa directamente no existe (finanzas es de sólo consulta) o donde la lectura no tiene sentido separada.

En bandejas las dos operaciones sí son distintas y separables: consultar el historial es una lectura pura y registrar una devolución modifica el saldo del cliente. Separarlas permite el caso "que mire el historial pero no asiente nada", que es plausible en un vivero con más de un empleado y distinta antigüedad. El costo es un permiso más en la lista de la pantalla de administración, que ya maneja nueve.

Se descartó un único `GESTIONAR_BANDEJAS`: es más corto pero introduce un verbo nuevo (`GESTIONAR`) que no existe en ningún otro permiso, y colapsa lectura y escritura en un solo interruptor justo en el dominio donde el change nace de querer permisos más finos.

### Decisión 2 — Autorización de `BandejasController` con `hasAnyAuthority`

Los dos endpoints existentes pasan a llevar anotación explícita:

| Método | Ruta | Anotación |
|---|---|---|
| `obtenerHistorial` | `GET /api/clientes/{id}/bandejas/historial` | `@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")` |
| `registrarDevolucion` | `POST /api/clientes/{id}/bandejas/devolucion` | `@PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_BANDEJAS')")` |

La forma `hasAnyAuthority(...)` ya se usa en el proyecto: `UsuarioController` lleva `@PreAuthorize("hasAnyAuthority('ADMIN_DB', 'LEER_FINANZAS')")` y `RolController` lleva `@PreAuthorize("hasAnyAuthority('ADMIN_DB')")`. No se está inventando una construcción nueva. Las anotaciones van a nivel de método y no de clase, porque los dos métodos exigen permisos distintos, siguiendo el estilo de `ClienteController`.

La disyunción es lo que garantiza que el jefe no pierda nada: `JEFE` tiene `LEER_CLIENTES` y `ESCRIBIR_CLIENTES`, con lo cual satisface la primera rama de ambas expresiones sin necesitar los permisos nuevos. Un empleado habilitado satisface la segunda.

**Consecuencia a revisar antes de implementar:** un rol que hoy tuviera `LEER_CLIENTES` pero no `ESCRIBIR_CLIENTES` puede, en este momento, registrar devoluciones (llega a la página de clientes, ve los botones —que no están condicionados por permiso— y el endpoint no valida nada). Después de este change, ese rol podrá consultar el historial pero recibirá 403 al intentar registrar la devolución. En la instalación actual ningún rol está en esa situación: `JEFE` tiene ambos permisos, `EMPLEADO_VIVERO` no tiene ninguno, y el atajo de sección "Clientes" de `UsuariosAdmin.jsx` asigna `LEER_CLIENTES` y `ESCRIBIR_CLIENTES` juntos. Sólo un rol armado a mano en el modo "Avanzado (Permisos)" podría quedar así. Ver Open Question 1.

### Decisión 3 — Endpoint y DTO nuevos, con la lista de campos como decisión de seguridad

Se crea `ClienteBandejasDTO` en `backend/src/main/java/com/vivero/gestion/dto/`, con exactamente tres campos:

```
Long id
String nombreRazonSocial
Integer balanceBandejas
```

Y nada más. En particular **no** lleva `balanceDinero` ni `telefono`, que son los dos campos que hacen inutilizable a `ClienteDTO` para este propósito. El nombre no colisiona con ningún DTO existente (los actuales de bandejas son `DevolucionBandejasDTO` e `HistorialBandejasDTO`). Se construye con el mismo estilo Lombok que `ClienteDTO`: `@Data @NoArgsConstructor @AllArgsConstructor @Builder`.

Esta lista de tres campos es el punto exacto donde el change cumple o incumple su objetivo. Agregarle un cuarto campo "por si acaso" durante la implementación anula el propósito del change. Debe revisarse explícitamente antes de dar por cerrada la tarea.

El endpoint vive en un controller nuevo, `BandejasClientesController`, con `@RequestMapping("/api/bandejas")` y un `@GetMapping("/clientes")`, protegido con `@PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")`. No se agrega a `BandejasController` porque su `@RequestMapping` de clase es `/api/clientes/{id}/bandejas`, anclado a un cliente concreto, y Spring no permite que un método escape del prefijo de su clase. Tampoco se agrega a `ClienteController`, porque ese controller es precisamente el que queremos que siga cerrado detrás de `LEER_CLIENTES`. Un controller propio deja la superficie del circuito acotado visible de un vistazo, que es deseable en un cambio de control de acceso.

Del lado del servicio, se agrega `List<ClienteBandejasDTO> listarClientesParaBandejas()` a `BandejasService` y su implementación en `BandejasServiceImpl`, que ya tiene `clienteRepository` inyectado. La implementación replica el filtro multi-negocio de `ClienteServiceImpl.getAll()`: lee `UnidadNegocioContextHolder.getUnidadNegocioId()` y usa `clienteRepository.findAllByUnidadNegocioId(unidadId)` cuando hay unidad activa, o `findAll()` cuando no la hay. Omitir ese filtro haría que la pantalla nueva muestre clientes de otra unidad de negocio, contradiciendo el comportamiento del resto del sistema.

### Decisión 4 — Filtrado del buscador en el cliente, no en el servidor

El endpoint devuelve la lista completa y el filtrado por nombre ocurre en el navegador. Es exactamente lo que hace hoy `NuevaVenta.jsx`: trae todos los clientes con `clientesApi.getAll()` y filtra con `clientes.filter(c => c.nombreRazonSocial.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 5)`.

Se sigue ese patrón por consistencia y porque el volumen de clientes de un vivero no lo justifica de otro modo. Agregar búsqueda server-side sólo en esta pantalla introduciría un segundo patrón para el mismo problema. Si en algún momento el volumen lo exige, habrá que resolverlo en las dos pantallas a la vez, no sólo en esta.

### Decisión 5 — `ProtectedRoute` acepta una lista de permisos

Hoy `ProtectedRoute` recibe `requiredPermission` como una sola cadena y evalúa `hasPermission(requiredPermission)`. La ruta nueva necesita semántica de "alguno de", para reflejar en el frontend la misma disyunción que el backend expresa con `hasAnyAuthority`: el jefe debe entrar por `LEER_CLIENTES` y el empleado habilitado por `LEER_BANDEJAS`.

Se extiende `requiredPermission` para que acepte tanto una cadena como un arreglo, normalizando internamente a arreglo y verificando con `.some(hasPermission)`. Es retrocompatible: los ocho usos actuales pasan cadenas y siguen funcionando sin tocarse.

Se descartó anidar dos `ProtectedRoute` (daría conjunción, no disyunción) y se descartó crear un guard aparte para esta ruta, que duplicaría lógica de autorización en dos archivos, algo indeseable en general y más aún en un change de control de acceso.

### Decisión 6 — El item de menú se muestra con cualquiera de los dos permisos de lectura

`DashboardLayout.jsx` filtra los items con `if (item.permission && !hasPermission(item.permission)) return false;`. Ese filtro se extiende con el mismo criterio que la Decisión 5, aceptando cadena o arreglo, y el item nuevo declara `permission: ['LEER_CLIENTES', 'LEER_BANDEJAS']`.

Se evaluó gatear el item sólo por `LEER_BANDEJAS`, con el argumento de que el jefe ya llega al circuito desde la página de clientes y no necesita una segunda entrada en el menú. Se descartó: el jefe es quien va a verificar que la pantalla nueva funciona antes de habilitar a un empleado, y una pantalla que el administrador del sistema no puede ver desde su propio menú es una pantalla que nadie va a revisar. El costo es un item más en el grupo "Gestión" para el jefe.

El item va en el grupo `Gestión`, junto a "Clientes", con la etiqueta "Devolución de Bandejas" y el ícono `PackageMinus` de `lucide-react`, que es el mismo que ya usa `DevolucionBandejasModal.jsx` en su encabezado.

### Decisión 7 — La unidad de negocio "Herramientas" oculta la pantalla completa

En `Clientes.jsx` todo lo relativo a bandejas está condicionado por `unidadNegocioActiva !== '2'`, y `DashboardLayout.jsx` ya oculta items completos cuando la unidad activa es Herramientas (lo hace hoy con "Siembras" e "Insumos"). La pantalla nueva es enteramente bandejas, así que la condición se aplica al item de menú completo, con el mismo mecanismo que ya usa el layout, y no campo por campo dentro de la página.

La ruta sigue existiendo y respondiendo aunque el item esté oculto, igual que ocurre hoy con `/siembras` e `/insumos` en Herramientas. No se agrega un bloqueo extra por unidad de negocio en la ruta, porque sería un comportamiento nuevo que ninguna otra pantalla del sistema tiene.

### Decisión 8 — Los permisos nuevos van al rol `JEFE`, no a `EMPLEADO_VIVERO`

`DataInitializer` arma `permisosJefe` enumerando los nueve permisos existentes uno por uno y después hace `rolJefe.setPermisos(permisosJefe)` en cada arranque, con el comentario explícito de "asegurar que el jefe siempre tenga todos los permisos". La intención declarada es que `JEFE` tenga el conjunto completo, así que los dos permisos nuevos se agregan a `permisosJefe`. No hacerlo dejaría al rol `JEFE` incompleto respecto de esa intención, aunque en la práctica siga llegando a bandejas por la rama `LEER_CLIENTES`/`ESCRIBIR_CLIENTES` de la Decisión 2.

`permisosEmpleado` **no se toca**. El acceso del empleado a bandejas es una decisión del jefe, tomada desde `UsuariosAdmin.jsx`, no un default del sistema. Esto es lo que pidió el usuario de forma explícita y es además la postura correcta para un permiso que se agrega en un change de seguridad: se crea apagado.

Hay que tener presente que `rolEmpleado.setPermisos(permisosEmpleado)` se ejecuta en **cada arranque** del backend, no sólo en la creación. Si el jefe agrega `ESCRIBIR_BANDEJAS` al rol `EMPLEADO_VIVERO` desde la pantalla de administración, el próximo reinicio se lo saca. Es un comportamiento preexistente que afecta a todos los permisos por igual y no lo introduce este change, pero conviene que el jefe lo sepa: para un acceso duradero conviene crear un rol nuevo (por ejemplo "MOSTRADOR") en lugar de editar `EMPLEADO_VIVERO`. Ver Open Question 2.

### Decisión 9 — Se agrega la sección "Bandejas" al arreglo `SECTIONS`

`UsuariosAdmin.jsx` ofrece dos modos para armar un rol: por secciones (un checkbox por bloque funcional, que asigna un paquete de permisos) o "Avanzado (Permisos)" (un checkbox por permiso individual). Se agrega `{ id: 'bandejas', name: 'Devolución de Bandejas', permNames: ['LEER_BANDEJAS', 'ESCRIBIR_BANDEJAS'] }` al arreglo.

Es un cambio de una línea y es precisamente el flujo que el usuario describió cuando dijo que el acceso lo da el jefe. Sin esta entrada, habilitar a un empleado obliga a entrar al modo avanzado y buscar dos permisos entre once, que es la clase de fricción que hace que la función quede sin usar. La entrada se coloca inmediatamente después de la sección `clientes`, que es donde el jefe la va a buscar.

A diferencia de las secciones `siembras`, `insumos`, `finanzas` y `cheques`, no se condiciona por `isHerramientas`. La sección se sigue ofreciendo, porque el jefe puede estar administrando roles con la unidad Herramientas activa y aun así querer habilitar bandejas para el vivero.

### Quién puede hacer qué, antes y después

Referencia obligada para revisar el impacto real de seguridad. "Vía HTTP directa" significa llamar al endpoint con el token, sin pasar por la interfaz.

| Actor | Operación | Antes | Después |
|---|---|---|---|
| `JEFE` (`LEER_CLIENTES` + `ESCRIBIR_CLIENTES` + resto) | Ver historial de bandejas | Sí, desde `Clientes.jsx` | Sí, sin cambios. Además desde `/bandejas` |
| `JEFE` | Registrar devolución | Sí, desde `Clientes.jsx` | Sí, sin cambios. Además desde `/bandejas` |
| `JEFE` | Ver `balanceDinero`, teléfono, cuenta corriente, editar y eliminar clientes | Sí | Sí, sin cambios |
| `EMPLEADO_VIVERO` por defecto (`LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`) | Entrar a `/clientes` | No | No |
| `EMPLEADO_VIVERO` por defecto | Ver historial de bandejas vía HTTP directa | **Sí — hueco de seguridad** | **No — 403** |
| `EMPLEADO_VIVERO` por defecto | Registrar devolución vía HTTP directa | **Sí — hueco de seguridad** | **No — 403** |
| `EMPLEADO_VIVERO` por defecto | Ver el item "Devolución de Bandejas" en el menú | No existía | No |
| Empleado con `LEER_BANDEJAS` + `ESCRIBIR_BANDEJAS` otorgados por el jefe | Ver el item y entrar a `/bandejas` | No existía | Sí |
| Idem | Ver la lista de clientes con nombre y saldo de bandejas | No existía | Sí, sólo `id`, `nombreRazonSocial` y `balanceBandejas` |
| Idem | Ver `balanceDinero` o teléfono de un cliente | No existía | **No.** El DTO no los incluye y `GET /api/clientes` le devuelve 403 |
| Idem | Ver historial de bandejas de un cliente | No existía | Sí |
| Idem | Registrar devolución | No existía | Sí |
| Idem | Entrar a `/clientes`, ver la cuenta corriente, crear, editar o eliminar clientes | No existía | **No.** Sigue requiriendo `LEER_CLIENTES`/`ESCRIBIR_CLIENTES` |
| Empleado con sólo `LEER_BANDEJAS` | Ver historial | No existía | Sí |
| Empleado con sólo `LEER_BANDEJAS` | Registrar devolución | No existía | **No — 403** |
| Rol hipotético con `LEER_CLIENTES` pero sin `ESCRIBIR_CLIENTES` | Registrar devolución | Sí (endpoint sin protección) | **No — 403.** Ver Decisión 2 y Open Question 1 |
| Cualquier usuario autenticado sin permisos de bandejas ni de clientes | Ambas operaciones vía HTTP directa | **Sí — hueco de seguridad** | **No — 403** |

Las tres filas en negrita que pasan de "Sí" a "No" son el cierre del hueco. No son una regresión funcional: son accesos que nunca debieron existir y que la interfaz nunca ofreció.

## Risks / Trade-offs

- **Un rol existente con `LEER_CLIENTES` y sin `ESCRIBIR_CLIENTES` pierde la capacidad de registrar devoluciones** → En la instalación actual no existe ningún rol así (`JEFE` tiene ambos, `EMPLEADO_VIVERO` ninguno, y el atajo de sección los asigna juntos). Antes de implementar, verificar la tabla `rol_permisos` en la base real. Si apareciera un rol en esa situación, la corrección es un clic: agregarle `ESCRIBIR_BANDEJAS` desde `UsuariosAdmin.jsx`.

- **El DTO nuevo se "engorda" durante la implementación** → Es el riesgo más probable y el que anularía el change entero: alcanza con que alguien agregue `telefono` "para mostrarlo en la tarjeta" para volver a filtrar datos del cliente. Mitigación: la lista de campos de la Decisión 3 es normativa, está reflejada en un escenario de la spec, y hay una tarea de verificación explícita al cierre.

- **Dos caminos hacia la misma operación pueden divergir con el tiempo** → El jefe entra por `Clientes.jsx` y el empleado por `/bandejas`. Mitigación: ambos disparan los mismos dos modales sin modificarlos y ambos pegan a los mismos endpoints. La lógica está en los modales y en el servicio, no duplicada en las páginas.

- **`ProtectedRoute` y el filtro de `DashboardLayout` cambian de firma y los usan todas las pantallas** → Un error acá saca del sistema a alguien en cualquier pantalla, no sólo en bandejas. Mitigación: el cambio es aditivo y retrocompatible (una cadena se normaliza a arreglo de un elemento), y hay una tarea dedicada a recorrer las ocho rutas protegidas y los siete items de menú existentes con un usuario `JEFE` y confirmar que ninguno cambió de comportamiento.

- **El reinicio del backend revierte los permisos otorgados a `EMPLEADO_VIVERO`** → Comportamiento preexistente de `DataInitializer`, que reescribe los permisos de los dos roles semilla en cada arranque. No lo introduce este change. Mitigación: documentarlo y recomendar crear un rol nuevo en vez de editar los roles semilla. Ver Open Question 2.

- **El endpoint nuevo devuelve la lista completa de clientes sin paginar** → Consistente con `GET /api/clientes`, que hace lo mismo, y con el volumen del negocio. Se acepta a sabiendas. Si algún día se pagina el listado de clientes, hay que paginar los dos juntos.

## Migration Plan

No hay migración de datos ni `ALTER TABLE`. El alta de los permisos es idempotente: `DataInitializer.crearPermiso()` inserta sólo si el permiso no existe, y `rolJefe.setPermisos(permisosJefe)` se reescribe en cada arranque.

1. Antes de implementar, inspeccionar `rol_permisos` en la base real y confirmar que ningún rol tiene `LEER_CLIENTES` sin `ESCRIBIR_CLIENTES` (riesgo 1).
2. Desplegar backend y frontend juntos. El backend por sí solo ya cierra el hueco de autorización; el frontend por sí solo apuntaría a un endpoint inexistente.
3. Al primer arranque, `DataInitializer` da de alta `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS` y los suma al rol `JEFE`. Ningún otro rol se ve afectado.
4. Verificar con el usuario `jefe@vivero.com` que los botones de `Clientes.jsx` siguen funcionando y que la pantalla nueva aparece en el menú.
5. Crear un rol de prueba con únicamente `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, asignarlo a un usuario de prueba y confirmar los dos lados del contrato: que llega a `/bandejas` y registra una devolución, y que recibe 403 en `GET /api/clientes` y no ve el item "Clientes" en el menú.

Rollback: revertir el código. Los dos permisos quedan huérfanos en la tabla `permisos`, sin ningún efecto salvo aparecer en la lista del modo avanzado de `UsuariosAdmin.jsx`. Si molestan, se borran a mano de `permisos` y `rol_permisos`. Revertir reabre el hueco de autorización, así que un rollback parcial debería conservar de todos modos las anotaciones `@PreAuthorize` de `BandejasController`.

## Open Questions

1. **¿Registrar una devolución debe exigir `ESCRIBIR_CLIENTES`, o alcanza con `LEER_CLIENTES` por el camino del jefe?** La Decisión 2 propone exigir `ESCRIBIR_CLIENTES` o `ESCRIBIR_BANDEJAS`, que es lo semánticamente correcto: registrar una devolución modifica el saldo del cliente y es una escritura. La alternativa —aceptar `LEER_CLIENTES` en el endpoint de escritura— preservaría el comportamiento actual bit a bit, pero consagraría que un permiso de lectura habilite una escritura. Recomendación: mantener la Decisión 2 y verificar en la base que ningún rol quede afectado. **Requiere confirmación del usuario antes de implementar el grupo de tareas de autorización.**

2. **¿El jefe va a habilitar bandejas editando el rol `EMPLEADO_VIVERO` o creando un rol nuevo?** Si edita `EMPLEADO_VIVERO`, el próximo reinicio del backend le revierte el cambio, porque `DataInitializer` reescribe los permisos de ese rol en cada arranque. Recomendación: crear un rol nuevo (por ejemplo "MOSTRADOR") con los permisos de empleado más los de bandejas. Si el usuario prefiere editar `EMPLEADO_VIVERO` directamente, hay que hacer que `DataInitializer` deje de sobreescribir los permisos de los roles ya existentes, lo cual excede el alcance de este change y debería ser un change propio.

3. **¿La pantalla nueva debe listar todos los clientes o solamente los que tienen bandejas pendientes?** El diseño propone listar todos, porque el balance puede ser cero y aun así haber que consultar el historial, y porque filtrar por saldo mayor a cero escondería clientes válidos. Una alternativa razonable es listar todos pero ordenar primero los que tienen saldo pendiente. Se deja para definir durante la implementación de la página; no afecta al contrato del endpoint.
