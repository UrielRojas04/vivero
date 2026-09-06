## Context

`Cliente` es hoy un registro mínimo: `nombreRazonSocial` + `telefono` (más `unidadNegocio`, `cuentaAbono` y las dos cuentas corrientes). No hay ningún identificador formal de la persona. El dueño lo necesita en los 3 negocios (Vivero, Herramientas, Abono), que comparten la misma entidad `Cliente`.

Estado actual de las piezas que toca este change:

- **`Cliente` / `ClienteDTO`**: sin campos de documento. `ClienteServiceImpl` mapea a mano `nombreRazonSocial` y `telefono` en create (línea ~83) y update (línea ~130).
- **`ClienteController`**: `POST /api/clientes` exige `hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_SIEMBRAS', 'ESCRIBIR_REGISTRO_SEMILLAS')`. El `GET` ya incluye `ESCRIBIR_VENTAS` (Ventas ya lista clientes, pero no puede crearlos).
- **`Venta`**: ya tiene el patrón "casual" para ventas sin `Cliente` real vinculado — `clienteNombreCasual` y `clienteTelefonoCasual`, que `VentaServiceImpl.crearVenta` llena desde `ClienteAdHocDTO` cuando `casual == true`. Cuando `casual == false`, el mismo flujo crea un `Cliente` real. `VentaServiceImpl` (línea ~427) proyecta ambos casos a los mismos campos del DTO: `clienteNombre` / `clienteTelefono`, agregando el sufijo `" (Casual)"` al nombre.
- **`NuevaVenta.jsx`**: dos modos excluyentes. Modo Agenda = buscador que filtra `clientes` por nombre y setea `clienteSeleccionado` en el cart store; si no hay coincidencia, no ofrece nada. Modo Express (solo Herramientas) = nombre + teléfono + checkbox "cliente casual", que viaja como `clienteAdHoc`.
- **`SiembraForm.jsx` / `RegistroSemillaForm.jsx`**: ya resolvieron el problema de "crear cliente sin salir de la pantalla" con `crearClienteRapido()` — `clientesApi.create({ nombreRazonSocial, telefono: '' })` + `queryClient.invalidateQueries({ queryKey: ['clientes'] })` + toast vía `useUIStore`/`getErrorMessage`, expuesto como un botón "Crear cliente \"X\"" al final del dropdown cuando el filtro no da resultados. Crean con nombre y nada más.
- **`HistorialVentas.jsx`**: trae todas las ventas con `ventasApi.listarVentas()` y filtra **client-side** en un `useMemo` sobre `clienteNombre`, `estadoPago` y la fecha formateada, normalizando acentos (NFD).
- **`ComprobanteVentaModal.jsx`**: el remito se arma 100% client-side (jsPDF + PNG + texto de WhatsApp) a partir del `VentaResponseDTO` que ya tiene el historial. No hay generación server-side. La cabecera arma una lista `meta` con pares `['Cliente', ...]`, `['Teléfono', ...]`.

Restricciones del proyecto que condicionan el diseño: DTOs siempre (nunca entidades JPA en endpoints), Controller → Service → Repository → Model, tests contra base real (nunca mock de DB), componentes React en PascalCase, feedback UX solo por `useUIStore`.

## Goals / Non-Goals

**Goals:**

- `Cliente` puede guardar DNI y/o CUIL, ambos opcionales, en los 3 negocios.
- Desde el buscador de cliente de Nueva Venta se puede crear un cliente al vuelo, con teléfono y un documento opcionales, sin abandonar la pantalla.
- Una venta a cliente Express (Herramientas, sin `Cliente` real) puede llevar un documento puntual, que queda impreso en el remito de esa venta.
- El buscador del Historial de Ventas encuentra ventas por DNI o CUIL además de por nombre, en los 3 negocios.
- El ABM completo de clientes permite ver y corregir esos documentos (si no, un dato mal tipeado al vuelo quedaría inmutable).

**Non-Goals:**

- **No** se valida el formato del documento: ni longitud de DNI, ni dígito verificador de CUIL, ni que el CUIL derive del DNI. Son campos opcionales de conveniencia, cargados al mostrador contra un papel; un validador estricto bloquearía ventas por un dato que ni siquiera es obligatorio.
- **No** se impone unicidad de DNI/CUIL a nivel base ni de aplicación (ver Riesgos).
- **No** se agrega el filtro por DNI/CUIL al listado paginado de Finanzas (`VentaRepository.listarVentasPorRango`, consumido solo por `FinanzasServiceImpl`). Es otra pantalla, con búsqueda server-side y JPQL; el pedido es sobre el Historial de Ventas.
- **No** se migran `SiembraForm.jsx` ni `RegistroSemillaForm.jsx` al componente extraído (ver Decisión 6).
- **No** se agrega documento al `Proveedor` ni a ninguna otra entidad.
- **No** se hace backfill ni normalización de datos existentes: las columnas nuevas nacen y quedan en NULL para todo lo ya cargado.

## Decisions

### Decisión 1 — `Cliente` lleva dos columnas independientes, `dni` y `cuil`, no un par tipo+valor

`Cliente` gana `private String dni;` y `private String cuil;`, ambos nullable.

**Por qué.** El `Cliente` es un registro durable que puede acumular los dos identificadores: un monotributista tiene DNI *y* CUIL, y el dueño puede cargar primero uno y después el otro. Modelarlo como `tipoDocumento` + `numeroDocumento` impondría una exclusividad que el dominio no tiene, y obligaría a una migración de datos el día que quiera guardar ambos. Además, la búsqueda del historial tiene que matchear "cualquiera de los dos" sin interpretar un discriminador: con dos columnas el predicado es un OR trivial e indexable.

**Alternativa considerada:** `tipoDocumento` (enum) + `numeroDocumento` en `Cliente`, por simetría con lo que se guarda en `Venta` (Decisión 2). Rechazada por lo anterior. La asimetría entre las dos entidades es deliberada y está justificada en la Decisión 2.

El "elegí DNI o CUIL" del formulario de creación rápida es una **afordancia de esa UI puntual** (una carga rápida, un documento), no una restricción del modelo: se resuelve escribiendo el valor en una de las dos columnas. El ABM completo expone los dos campos por separado.

### Decisión 2 — `Venta` lleva `clienteDocumentoCasualTipo` (enum) + `clienteDocumentoCasualValor`

`Venta` gana `@Enumerated(EnumType.STRING) private TipoDocumento clienteDocumentoCasualTipo;` y `private String clienteDocumentoCasualValor;`, ambos nullable, con nombres de columna `cliente_documento_casual_tipo` / `cliente_documento_casual_valor`.

**Por qué el sufijo `Casual`.** Es la convención ya establecida por `clienteNombreCasual` / `clienteTelefonoCasual`: campos que existen únicamente para la venta sin `Cliente` vinculado. Un nombre nuevo (`documentoAdHoc`, `docExpress`) rompería la lectura del modelo.

**Por qué acá sí es tipo+valor y no dos columnas.** Una venta casual es una transcripción de un solo papel, una sola vez, y el remito tiene que imprimir la etiqueta correcta ("DNI: …" vs "CUIL: …"). El par etiquetado es el modelo fiel de ese hecho. Las dos entidades responden preguntas distintas: `Cliente` = *qué identificadores tiene esta persona en ficha* (un conjunto, posiblemente ambos); `Venta` casual = *qué documento mostró quien compró en este mostrador, esta vez* (uno, con su etiqueta). Modelos distintos para preguntas distintas es correcto, no inconsistente.

**Por qué un enum Java y no un String libre.** `TipoDocumento { DNI, CUIL }` como enum persistido con `@Enumerated(EnumType.STRING)` sigue el patrón que ya usan `CuentaAbono` y `EstadoPago` en este backend. Da una lista cerrada al frontend, evita typos (`"dni"` vs `"DNI"`) y hace que agregar un tipo futuro (p.ej. `CUIT`) sea un cambio de un solo lugar.

**Invariante de consistencia:** el par se guarda completo o vacío. Si `clienteDocumentoCasualValor` viene en blanco, se persisten los dos en `null`; nunca queda un tipo sin valor.

### Decisión 3 — `VentaResponseDTO` expone `clienteDni` y `clienteCuil` como proyección unificada

El DTO de respuesta de venta gana `clienteDni` y `clienteCuil` (Strings). `VentaServiceImpl` los llena en el mismo bloque donde ya resuelve `clienteNombre` / `clienteTelefono`:

- venta con `Cliente` real → se copian `cliente.dni` y `cliente.cuil`;
- venta casual → se escribe el valor en el campo que corresponda según `clienteDocumentoCasualTipo`, y el otro queda `null`;
- cliente eliminado → ambos `null`.

**Por qué.** Es exactamente el mismo movimiento que el backend ya hace con nombre y teléfono: el frontend no debe saber si la venta tiene `Cliente` real o datos casuales. Con esta proyección, tanto el filtro del historial como el remito se escriben **una sola vez** y funcionan para los dos casos y para los 3 negocios, sin ramas. La alternativa (exponer los campos casuales crudos y que el frontend haga el fallback) duplicaría esa lógica en `HistorialVentas.jsx` y en `ComprobanteVentaModal.jsx`.

### Decisión 4 — Se suma `ESCRIBIR_VENTAS` al `@PreAuthorize` del `POST /api/clientes`

`@PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_SIEMBRAS', 'ESCRIBIR_REGISTRO_SEMILLAS', 'ESCRIBIR_VENTAS')")`.

**Por qué.** Mismo criterio con el que ya se sumaron `ESCRIBIR_SIEMBRAS` y `ESCRIBIR_REGISTRO_SEMILLAS`: un rol que tiene permiso para registrar la operación necesita poder dar de alta al cliente de esa operación sin depender de otro rol. El `GET /api/clientes` ya venía incluyendo `ESCRIBIR_VENTAS` — Ventas ya podía *leer* la agenda; esto cierra la asimetría. No se crea ningún permiso nuevo, así que `DataInitializer` no se toca y los roles existentes no cambian.

**Alternativa considerada:** un endpoint dedicado `POST /api/clientes/rapido` con su propio permiso. Rechazada: sería un segundo camino de creación de `Cliente` a mantener en paralelo (cuentas corrientes en 0, unidad de negocio, soft delete) por una diferencia que es de permisos, no de comportamiento.

### Decisión 5 — La creación al vuelo desde Ventas usa `POST /api/clientes`, no el `clienteAdHoc` con `casual: false`

`VentaServiceImpl` ya sabe crear un `Cliente` cuando llega `clienteAdHoc` con `casual: false`. **No** se usa ese camino para esta feature: el botón "Crear cliente" del buscador llama a `clientesApi.create` en el momento y guarda el `id` devuelto en `clienteSeleccionado` del cart store.

**Por qué.**
1. El modo Express (y por lo tanto `clienteAdHoc`) es exclusivo de Herramientas; la creación al vuelo se pidió para los 3 negocios.
2. El usuario ve el cliente creado y seleccionado al instante, con su feedback; con `clienteAdHoc` el alta recién ocurriría al confirmar la venta, y un error de alta haría fallar la venta entera.
3. La venta sigue viajando como cualquier otra venta de agenda (`clienteId` + `clienteAdHoc: null`): cero ramas nuevas en `VentaServiceImpl`.

El camino `clienteAdHoc` queda intacto para el modo Express, que es su razón de ser.

### Decisión 6 — Se extrae `CrearClienteRapido.jsx`, y Siembra / Registro de Semillas **no** se migran en este change

Se crea `frontend/src/components/CrearClienteRapido.jsx` (PascalCase), un panel que se renderiza dentro del dropdown del buscador cuando no hay coincidencias. Encapsula: los inputs opcionales (teléfono, selector DNI/CUIL + valor), la llamada a `clientesApi.create`, el `invalidateQueries({ queryKey: ['clientes'] })`, y los toasts de éxito/error por `useUIStore` + `getErrorMessage`. Props: el nombre tipeado, un callback `onCreado(cliente)` y un flag para mostrar u ocultar los campos extra. `NuevaVenta.jsx` lo consume con los campos extra visibles.

**Por qué no migrar los otros dos call sites.** En `SiembraForm.jsx` y `RegistroSemillaForm.jsx` la creación es de un click y sin campos — es una decisión de UX deliberada para flujos donde el dato relevante es el lote/la siembra, no la ficha del cliente. Migrarlos ahora significa tocar dos formularios que nadie reportó como problema y arriesgar regresiones fuera del alcance del pedido. El componente queda listo para que los adopten (con el flag de campos extra en `false`) cuando haya un motivo real.

### Decisión 7 — El selector de documento es un control de dos partes con "sin documento" como estado inicial

En la creación rápida, un `<select>` con opciones *(ninguno) / DNI / CUIL* y un `<input>` de valor que solo se habilita cuando hay un tipo elegido. Nada obligatorio: se puede crear el cliente con solo el nombre, como hoy.

**Por qué.** Dos inputs siempre visibles (uno DNI, uno CUIL) en un panel que aparece dentro de un dropdown agrega ruido a un flujo cuya virtud es ser rápido; el 99% de los casos carga a lo sumo un documento. El ABM completo, que sí es la pantalla de la ficha, expone los dos campos por separado y permite tener ambos.

### Decisión 8 — La comparación de documentos ignora puntos, guiones y espacios

Tanto en el filtro del Historial de Ventas como en cualquier comparación de documentos, se normalizan **ambos lados** eliminando todo lo que no sea alfanumérico antes de comparar. Así `20123456` encuentra `20.123.456`, y `20123456789` encuentra `20-12345678-9`.

**Por qué.** Los documentos se cargan como vengan escritos en el papel, sin formato canónico (Non-Goal: no se valida ni se normaliza al guardar). Sin esta normalización en la búsqueda, el buscador fallaría contra datos perfectamente correctos y el dueño concluiría que el dato no se guardó. La normalización de acentos (NFD) que ya existe se mantiene para el nombre; la de documentos es adicional y se aplica solo a los campos de documento.

## Risks / Trade-offs

- **Documentos duplicados o mal tipeados** (no hay unicidad ni validación de formato) → Aceptado a conciencia. Un índice único sobre `dni`/`cuil` chocaría con el soft delete (`@SQLDelete` deja las filas borradas en la tabla, y colisionarían con altas nuevas del mismo documento) y con clientes legítimamente repetidos entre unidades de negocio. El dato es informativo, no una clave de negocio. Si en el futuro se necesita deduplicar, se hará con una validación de aplicación explícita, no con una restricción de base retroactiva.

- **Exponer documentos en `VentaResponseDTO` amplía la superficie de datos personales** que viaja al frontend en cada listado de ventas → Mitigación: el endpoint ya está detrás de JWT + permiso de lectura de ventas, y ya expone nombre y teléfono del cliente por la misma vía (`remitos-pdf` los agregó explícitamente). No se introduce un canal nuevo ni un nivel de exposición distinto del ya vigente.

- **`ddl-auto` sobre tablas con datos**: se agregan cuatro columnas nullable (dos en `clientes`, dos en `ventas`) → Riesgo bajo: Hibernate las crea como `ALTER TABLE ... ADD COLUMN` nullable, sin reescritura de filas ni default. Ningún dato existente cambia.

- **El filtro del historial es client-side sobre la lista completa de ventas** (`HistorialVentas.jsx` ya funciona así hoy) → Este change no cambia esa arquitectura: agrega dos términos al `useMemo` existente. El costo de escalabilidad ya existía y se sigue cobrando en `listarVentas()`, no en el filtro. Si el volumen lo exige, la conversión a búsqueda server-side es un change aparte que afectaría igual al filtro por nombre.

- **Asimetría de modelo entre `Cliente` (dos columnas) y `Venta` (tipo+valor)** → Un lector futuro puede leerla como inconsistencia. Mitigación: la Decisión 2 explica el porqué, y la Decisión 3 hace que esa asimetría **no se filtre** más allá del backend: hacia el frontend ambos casos llegan como `clienteDni` / `clienteCuil`.

## Migration Plan

1. Columnas nuevas por `ddl-auto` al levantar el backend: `clientes.dni`, `clientes.cuil`, `ventas.cliente_documento_casual_tipo`, `ventas.cliente_documento_casual_valor`. Todas nullable, sin default, sin backfill.
2. Backend desplegable de forma independiente: los campos nuevos son opcionales en request y nullable en response, así que el frontend viejo sigue funcionando sin cambios contra el backend nuevo.
3. Frontend desplegable después: todo lo que agrega se renderiza condicionalmente a que el dato exista (`null` → no se muestra la fila en el remito, no se muestra el documento en la ficha).
4. **Rollback**: revertir el código. Las columnas pueden quedar en la base sin efecto; ningún dato preexistente fue modificado, así que no hay pérdida al volver atrás. Los documentos cargados durante la ventana quedarían huérfanos en la base hasta un re-despliegue.

## Open Questions

- Ninguna bloqueante para implementar. Queda anotado como posible seguimiento: si el dueño empieza a usar DNI/CUIL como criterio habitual, evaluar (a) llevar el filtro por documento también al listado de ventas de Finanzas (`listarVentasPorRango`), hoy Non-Goal, y (b) mostrar el documento como columna en la ficha de cliente además de en el detalle.
