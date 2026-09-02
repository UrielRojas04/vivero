## Context

**Estado actual del dato.** El saldo de bandejas de un cliente vive en `CuentaCorrienteBandejas.balanceBandejas` (`Integer`, default `0`), relación `@OneToOne(mappedBy = "cliente", fetch = LAZY)` desde `Cliente.cuentaCorrienteBandejas`. Ya se expone en dos DTOs (`ClienteDTO`, `ClienteBandejasDTO`) y se muestra en dos pantallas (`Clientes.jsx` y la pantalla dedicada de devolución de bandejas). **No** se expone en `FacturaClienteDTO`.

**Estado actual del documento.** `frontend/src/pages/FacturaCliente.jsx` renderiza la factura mediante `renderFacturaCompleta(f, isActive)`, llamada dos veces: `renderFacturaCompleta(factura, true)` para la factura activa (línea 622) y `renderFacturaCompleta(h, false)` para cada factura cerrada del historial (línea 722). El documento tiene tres zonas:

1. **Cabecera** (`bg-thead/60 p-6`) — título `Factura #N - Cliente`, chip de estado, botonera (oculta al exportar), teléfono y fechas de apertura/cierre.
2. **Fila de indicadores de resumen** — Total Ventas / Total Conceptos / Pagos Recibidos / Saldo Deudor. Envuelta en `{!isExporting && (...)}`: **desaparece en la imagen exportada**.
3. **Desglose** de ventas, pagos y conceptos, y el pie "Total a Pagar".

El nodo exportado es el `div` con `ref={facturaRef}`, que lleva la clase `force-light-export` durante la captura: todo lo que se agregue dentro hereda los tokens claros sin trabajo adicional.

**Restricciones duras.**
- `capturarNodoComoImagen` y `esperarProximoFrame` (líneas ~36-97) son intocables — lógica de clonado/medición blindada en changes anteriores.
- Regla dura 5 del proyecto: nunca devolver entidades JPA; el dato viaja por DTO.
- Decisión 3 del sistema de diseño (`sistema-diseno-acento-por-unidad`): un color que depende de un dato de negocio es semántico (`ok`/`warn`/`danger`), nunca `accent`.

**Alcance de negocio.** Las bandejas son un concepto exclusivo de Vivero. Herramientas y Abono no las manejan. Sin embargo, `VentaServiceImpl` (líneas 132-144) crea facturas para **todas** las unidades de negocio, no sólo Vivero — así que la pantalla de factura sí se abre en Herramientas y en Abono, y el gating es genuinamente necesario, no una consecuencia estructural gratuita.

## Goals / Non-Goals

**Goals:**
- Que el documento de factura declare cuántas bandejas debe el cliente, con la misma claridad en pantalla y en la imagen exportada.
- Reutilizar exactamente la semántica visual y el fraseo que este mismo dato ya tiene en `Clientes.jsx`, sin inventar una segunda convención para el mismo número.
- Que el dato no aparezca fuera de Vivero, con un criterio de gating que siga siendo correcto cuando exista una cuarta unidad de negocio.
- Cambio aditivo: ningún consumidor existente del DTO se rompe, ningún dato se escribe.

**Non-Goals:**
- No se registra ni se modifica ningún movimiento de bandejas desde la factura. Es lectura pura; entregas y devoluciones siguen viviendo en su circuito (`flujo-bandejas`, `acceso-bandejas`).
- No se agrega el saldo de bandejas al PDF ni a los mensajes de WhatsApp más allá de lo que ya se rasteriza del nodo del documento.
- No se migran los gatings de bandejas que ya existen en otras pantallas (ver Decisión 2, alternativa rechazada).
- No se toca la fila de indicadores de resumen ni su comportamiento en exportación.
- No se muestra el saldo de bandejas en el estado vacío "Sin Factura Activa" (ver Riesgos).

## Decisions

### Decisión 1 — El dato viaja en el `FacturaClienteDTO` existente; no se crea endpoint nuevo

`FacturaClienteServiceImpl.mapearADTO(FacturaCliente factura)` (línea 208) es el único punto de construcción del DTO y ya tiene el `Cliente` completo en la mano — de hecho ya lo desreferencia tres veces (`factura.getCliente().getId()`, `.getNombreRazonSocial()`, `.getTelefono()`). La relación `cuentaCorrienteBandejas` es `LAZY`, pero `mapearADTO` se ejecuta siempre dentro de un método `@Transactional`, así que la inicialización perezosa resuelve sin `LazyInitializationException`.

Se agrega a `FacturaClienteDTO` un campo `private Integer saldoBandejas;` con getter/setter (el DTO usa getters/setters explícitos, no Lombok — se sigue ese estilo), y una línea de mapeo null-safe calcada del precedente de `ClienteServiceImpl` (línea 267):

```
dto.setSaldoBandejas(factura.getCliente().getCuentaCorrienteBandejas() != null
        ? factura.getCliente().getCuentaCorrienteBandejas().getBalanceBandejas()
        : 0);
```

**Nombre del campo:** `saldoBandejas` y no `balanceBandejas`. En el DTO de factura los campos hermanos ya usan el prefijo `saldo`/`total` (`saldoDeudor`, `totalVentas`), y la columna de `Clientes.jsx` se rotula "Saldo Bandejas". `balanceBandejas` es el nombre de la columna de la entidad, no el del documento.

**Alternativas consideradas:**
- *Endpoint nuevo `GET /api/facturas/{id}/bandejas`*: rechazado. Agrega un round-trip, un controller, un `@PreAuthorize` y un estado de carga en el frontend para transportar un entero que ya está cargado en memoria en el mismo request.
- *Que el frontend lea el saldo del listado de clientes*: rechazado. La pantalla de factura se entra por `clienteId` en la URL y no carga el listado de clientes; obligaría a un fetch extra sólo para este número.

### Decisión 2 — El backend mapea el campo siempre; el gating de unidad es de presentación, en el frontend, con `unidadNegocioActiva === '1'`

El backend devuelve `saldoBandejas` en toda unidad de negocio. El frontend decide si lo pinta.

Este es **exactamente** el patrón que este mismo dato ya tiene una pantalla más allá: `ClienteServiceImpl` mapea `balanceBandejas` en `ClienteDTO` incondicionalmente para todas las unidades, y `Clientes.jsx` gatea el render con `unidadNegocioActiva === '1'` en tres lugares (card mobile línea 185, `<th>` línea 244, `<td>` línea 270). No hay fuga de información nueva: el número ya viaja hoy en `ClienteDTO` hacia usuarios de Herramientas y de Abono, y no es un dato sensible.

**Sobre el criterio exacto — allowlist, no denylist.** El criterio correcto es `unidadNegocioActiva === '1'` (allowlist: "sólo Vivero"), **no** `!== '2' && !== '3'` (denylist: "todas menos Herramientas y Abono"). Hoy las dos expresiones dan el mismo resultado, pero divergen en el momento en que exista una cuarta unidad: la allowlist falla cerrada (la unidad nueva no ve bandejas hasta que alguien lo decida explícitamente), la denylist falla abierta (la unidad nueva hereda una pantalla de bandejas que nadie diseñó para ella). El código de `Clientes.jsx` ya usa la allowlist; este change se alinea con eso.

`unidadNegocioActiva` se lee de `useAuthStore()`, es un `string` persistido en `localStorage`, y la comparación es contra el string `'1'` — igual que en `Clientes.jsx`.

**Alternativas consideradas:**
- *Gatear en el backend por `factura.getUnidadNegocio().getId() == 1L`, devolviendo `null` fuera de Vivero*: rechazado. Es un hardcode de ID en la capa de servicio, y `UnidadNegocio.java` (líneas 51-56) documenta explícitamente la convención contraria: "las lógicas de Finanzas y Dashboard NUNCA deben usar hardcodes de IDs (ej. id == 1L), sino que deben leer la capacidad declarada de la unidad de negocio".
- *Agregar un flag de capacidad `bandejasHabilitado` a `UnidadNegocio`, siguiendo el precedente de `costeoPorCapasHabilitado` y `modeloCosto`*: es la solución que más se ajusta a la convención declarada del proyecto, y es la respuesta correcta **a largo plazo**. Se rechaza **para este change** por desproporción: implica columna nueva, `columnDefinition` con default, semilla en `DataInitializer` para las tres unidades y exposición del flag en el DTO de unidad de negocio — todo para una pantalla de sólo lectura, y dejando además dos mecanismos de gating conviviendo para el mismo concepto (el flag acá, el `=== '1'` en `Clientes.jsx` y en el filtro del menú lateral). Queda anotado como **candidato a change futuro**: un `bandejas-por-capacidad-de-unidad` que migre de una sola vez *todos* los gatings de bandejas (listado de clientes, menú lateral, pantalla dedicada, y esta factura) al flag. Este change deja el gating consistente con el resto de la app, que es la precondición para que esa migración sea un cambio mecánico.

### Decisión 3 — Ubicación: cabecera de la factura, debajo de la línea de fechas. **No** en la fila de indicadores de resumen

La fila de indicadores (Total Ventas / Conceptos / Pagos / Saldo Deudor) es el lugar que a primera vista parece natural, y es el lugar **equivocado**: está envuelta en `{!isExporting && (...)}` (línea 351) y por lo tanto **no aparece en la imagen exportada**. Poner ahí el saldo de bandejas haría que el dato fuese invisible exactamente en el artefacto donde el usuario más lo quiere: la imagen que se le manda al cliente.

El chip va en la **cabecera**, en el bloque de la izquierda, inmediatamente después de la línea de `Apertura: …` (líneas 332-336). Esa cabecera se renderiza siempre, en pantalla y en exportación, y está dentro del nodo referenciado por `facturaRef`.

Además es el lugar semánticamente correcto: el saldo de bandejas es un atributo **del cliente**, no un renglón de la factura. Vive junto al nombre y al teléfono, que también son datos del cliente. Ponerlo entre los totales de dinero sugeriría que suma al "Total a Pagar", que es precisamente lo que no hace: son dos deudas de naturaleza distinta —una en pesos, una en unidades físicas— y el documento debe mantenerlas separadas.

Por la misma razón **no** se agrega una segunda aparición en el pie "Total a Pagar": duplicar el dato al lado del total en pesos invita a leerlo como parte de ese total.

**Alternativas consideradas:**
- *Quinta tarjeta en la fila de indicadores*: rechazado por invisibilidad en la exportación (motivo principal) y porque rompería la grilla `lg:grid-cols-4`.
- *Renglón propio en el desglose, como si fuera un concepto*: rechazado. Un concepto es un monto en pesos que suma al saldo deudor; las bandejas no son dinero y no deben entrar en ninguna suma.

### Decisión 4 — Sólo en la factura activa, no en las facturas cerradas del historial

`renderFacturaCompleta` está compartida entre la factura activa (`isActive = true`) y cada factura cerrada del historial (`isActive = false`). El saldo de bandejas es un **saldo vigente del cliente**, no una foto congelada al momento de cerrar esa factura: pintarlo sobre una factura cerrada hace tres meses afirmaría, falsamente, que ese era el saldo entonces.

El chip se condiciona a `isActive` (el parámetro que la función ya recibe), no a `f.estado === 'ABIERTA'`. Motivo: `isActive` expresa "esta es la factura vigente que se está mostrando y exportando", que es la pregunta real; `estado` podría coincidir hoy pero es una propiedad del registro, no del contexto de render.

### Decisión 5 — Formato y semántica de color calcados de `Clientes.jsx`

**Texto:** el número seguido del sustantivo, `{f.saldoBandejas || 0} bandejas`, con la etiqueta "Saldo Bandejas". Es literalmente el fraseo que ya usa la card mobile de `Clientes.jsx` (línea 189: `{cliente.balanceBandejas || 0} bandejas`) y el encabezado de columna (línea 244: `Saldo Bandejas`). Se descarta redactar "Debe X bandejas" o "X bandejas pendientes": introduciría un tono nuevo para un dato que ya tiene fraseo establecido, y el color del chip ya comunica el "debe" sin necesidad de decirlo con palabras.

**Color:** semántico, no de acento, porque depende de un dato de negocio (Decisión 3 del sistema de diseño). Se copia la condición exacta de `Clientes.jsx`:

```
f.saldoBandejas > 0 ? 'bg-warn-bg text-warn-ink' : 'bg-thead text-body'
```

`warn` y no `danger`: una bandeja pendiente es un recordatorio de devolución, no una mora. `danger` ya está reservado en esta pantalla para el saldo deudor en pesos, y usarlo también acá diluiría esa señal.

El caso de saldo negativo (el cliente devolvió más bandejas de las que se llevó) cae en la rama neutral `bg-thead text-body`, igual que en `Clientes.jsx`. Es coherente: no hay nada que reclamar.

**Herencia de tokens en la exportación:** el chip queda dentro del nodo con `force-light-export`, así que `bg-warn-bg` / `text-warn-ink` se resuelven a los tokens claros durante la captura sin ninguna intervención extra.

## Risks / Trade-offs

- **[El chip no se ve si el cliente no tiene factura activa]** → Cuando `getFacturaActiva` devuelve `null`, la pantalla muestra el estado vacío "Sin Factura Activa" y `renderFacturaCompleta` retorna temprano (línea 263), así que el saldo de bandejas no aparece. Se acepta: el dato es una anotación *sobre el documento*, y sin documento no hay dónde anotarlo. El saldo sigue siendo consultable en `Clientes.jsx` y en la pantalla dedicada de bandejas. Ampliar el estado vacío queda explícitamente fuera de alcance.

- **[La relación `cuentaCorrienteBandejas` es LAZY y `mapearADTO` se invoca desde varios métodos]** → Todos los invocadores (`obtenerFacturaActiva`, `abrirFacturaManual`, `listarHistorialFacturas`, `agregarConcepto`, `registrarPago`, `cerrarFactura`) están anotados `@Transactional`, así que la sesión está abierta y la inicialización perezosa resuelve. Riesgo real pero cubierto; la verificación entra como tarea explícita.

- **[Una query extra por factura en `listarHistorialFacturas`]** → El mapeo desreferencia la relación LAZY una vez por factura mapeada, lo que suma un SELECT por factura del historial. Es el mismo costo que ya paga `ClienteServiceImpl` por cliente en el listado, sobre volúmenes chicos (facturas de un solo cliente) y en un endpoint de sólo lectura. Mitigación si alguna vez molesta: el `join fetch` correspondiente en el repositorio. No se optimiza preventivamente.

- **[El gating por `unidadNegocioActiva` es de cliente, no de servidor]** → Un usuario de Herramientas que inspeccione la respuesta de la API verá el número. Aceptado: es idéntico a lo que ya ocurre hoy con `ClienteDTO`, y el saldo de bandejas no es información sensible ni está protegido por permiso propio de lectura en ese contexto.

- **[Riesgo de tocar código blindado por proximidad]** → El chip se inserta en la cabecera, a ~200 líneas de `capturarNodoComoImagen`. La tarea correspondiente declara la restricción de forma explícita y la verificación final incluye confirmar por diff que ninguna de las dos funciones de captura fue modificada.

- **[Deuda consciente: dos criterios de gating conviviendo a futuro]** → Este change agrega un cuarto lugar con `unidadNegocioActiva === '1'` hardcodeado. Se asume deliberadamente para mantener consistencia con los tres que ya existen, en lugar de introducir un quinto mecanismo distinto. Ver la alternativa rechazada de la Decisión 2 y el change futuro que ahí se propone.

## Migration Plan

No hay migración. El cambio es aditivo en el DTO y en el render:

1. Desplegar backend con el campo nuevo. Los clientes viejos del frontend ignoran un campo JSON que no conocen.
2. Desplegar frontend. Si por orden de despliegue el frontend llegara antes que el backend, `f.saldoBandejas` es `undefined` y `{f.saldoBandejas || 0}` renderiza `0 bandejas` con el chip neutral — degradación silenciosa, sin error.

**Rollback:** revertir el commit. No hay estado persistido que limpiar, ninguna columna que dropear, ningún dato escrito.

## Open Questions

Ninguna bloqueante. Las tres preguntas abiertas al arrancar el change quedaron resueltas en las Decisiones 3 (ubicación), 2 (criterio de gating), 5 (formato del dato) y 1 (no hace falta endpoint nuevo).

Queda anotada, fuera de alcance, la propuesta de un change futuro `bandejas-por-capacidad-de-unidad` que reemplace todos los `unidadNegocioActiva === '1'` relacionados con bandejas por un flag de capacidad en `UnidadNegocio`, alineando el circuito con la convención declarada en `UnidadNegocio.java`.
