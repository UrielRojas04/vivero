## Context

`Producto` hoy no tiene ningún identificador externo: se distingue por `nombre` dentro de su `UnidadNegocio` (`findByNombreAndUnidadNegocioIdAndDeletedFalse`). El catálogo se carga completo al frontend (`GET /api/productos`, filtrado por unidad vía `UnidadNegocioContextHolder`) y la búsqueda de `Productos.jsx` es 100% client-side sobre esa lista (`filteredProductos`, filtra por `nombre`, `descripcion`, `numeroSiembra`, `lote`).

El frontend no tiene ninguna librería de escaneo (`frontend/package.json` verificado: sin `zxing`, `quagga`, `html5-qrcode`). El backend no tiene ningún campo de código de barras (`Producto.java` verificado: sin `codigoBarra`, `barcode`, `ean`, `sku`).

Restricciones del proyecto que este diseño hereda como contrato:
- **DTOs siempre**: ningún endpoint devuelve una entidad JPA cruda.
- **Controller → Service → Repository → Model**: el controller nunca toca el repositorio; la lógica va en `@Service` con `@Transactional`.
- **Sin `findAll()` sin límite** en listados nuevos.
- **Feedback UX vía `useUIStore`** (`pushToast`, `askConfirm`, `denyAccess`) — nunca `alert`/`confirm` nativos.
- **PascalCase** en componentes React nuevos (nombre del componente y del archivo), `cursor-pointer` en todos los botones, iconos de `lucide-react`.

Contexto operativo: el usuario final es un vendedor con un celular o tablet en el mostrador del local de Herramientas. La compatibilidad real del dispositivo pesa más que el tamaño del bundle.

## Goals / Non-Goals

**Goals:**
- Guardar el código de barras de fábrica de un producto de Herramientas escaneándolo con la cámara del dispositivo.
- Encontrar un producto ya cargado escaneando el envase que el cliente trae en la mano, y ver su ficha completa.
- Que el código sea un identificador confiable: un código apunta a un solo producto dentro de la unidad de negocio.
- Que nada de esto altere el comportamiento actual del catálogo para Vivero ni para Abono.

**Non-Goals:**
- **No** se genera ni se imprime código de barras propio (etiquetas para productos sin código de fábrica). Fuera de alcance.
- **No** se agrega escaneo al flujo de venta (`NuevaVenta.jsx`) — el pedido fue explícitamente "cuando el cliente pregunta por un producto". Queda como extensión natural para un change posterior.
- **No** se soporta lector físico USB/Bluetooth (no hay ninguno en el local). Un lector USB actúa como teclado y llenaría el campo de texto sin necesitar código nuevo, así que no queda bloqueado, pero tampoco se diseña ni se prueba para eso.
- **No** hay escaneo en Vivero ni en Abono.
- **No** se cambia el modelo de permisos.

## Decisions

### Decisión 1 — El código vive en `Producto.codigoBarra`, no en una entidad aparte

Un producto tiene un código de barras de fábrica, y uno solo: el que trae el envase de esa referencia. Una tabla `producto_codigos` (1:N) resolvería el caso de un producto vendido en dos presentaciones con dos códigos distintos, pero eso en el modelo actual ya son dos `Producto` distintos (tienen precio y stock propios). Un campo escalar es suficiente y no agrega un join a `mapToDTO`, que se ejecuta por cada producto del listado.

```java
@Column(name = "codigo_barra", length = 64)
private String codigoBarra;
```

`length = 64` con margen deliberado: EAN-13 usa 13 dígitos y UPC-A 12, pero Code128 (que algunos proveedores usan en etiquetas internas) es de longitud variable. No se usa `unique = true` a nivel de anotación JPA — ver Decisión 3.

**Alternativa descartada**: `@OneToMany List<CodigoBarra>`. Más flexible, pero paga un join en el listado completo del catálogo para resolver un caso que hoy no existe.

### Decisión 2 — `@zxing/browser` para decodificar, no la Web API `BarcodeDetector`

`BarcodeDetector` es la opción sin dependencia y sería la elegante, pero su soporte real es Chrome/Edge en Android y Chrome de escritorio. **Safari en iOS no la implementa, y Firefox tampoco.** Un vendedor con un iPhone no podría escanear nada — es decir, la función simplemente no existiría para una parte de los dispositivos del local, y ni siquiera fallaría de forma visible: el botón estaría ahí y no haría nada.

`@zxing/browser` (con `@zxing/library`) decodifica en JS puro sobre los frames de un `<video>` alimentado por `getUserMedia`, que sí está en todos los navegadores móviles modernos incluido Safari iOS. Cuesta ~200 KB gzip de bundle. Ese costo se paga una vez y sólo en Herramientas — el import va **dinámico** (`await import('@zxing/browser')`) dentro del componente del escáner, igual que `Productos.jsx` ya hace con `abonoApi` para el consolidado de Abono. Así el catálogo de Vivero y Abono no descarga un byte de la librería.

Ganchos de la decisión: la única razón para preferir `BarcodeDetector` sería el bundle size, y la premisa del proyecto es la inversa (compatibilidad de dispositivo > peso). Si en el futuro el soporte de `BarcodeDetector` se generaliza, el reemplazo queda contenido en un solo archivo (`EscanerCodigoBarra.jsx`), que es precisamente por qué toda la interacción con la librería vive ahí y en ningún otro lugar.

**Formatos habilitados**: se restringe el decoder a `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E` y `CODE_128` vía `DecodeHintType.POSSIBLE_FORMATS`. Restringir formatos acelera el decode y, más importante, reduce los falsos positivos — un decoder "todo formato" puede leer basura de un patrón cualquiera de la imagen.

> ⚠️ **Checkpoint**: `@zxing/browser` y `@zxing/library` son dependencias npm nuevas. El proyecto no instala dependencias sin pedido explícito. La tarea 1.1 de `tasks.md` está marcada como bloqueante y requiere el OK del usuario antes de correr `npm install`.

### Decisión 3 — Unicidad validada en el service, no con `@Column(unique = true)`

Un código de barras identifica una mercadería: dos productos con el mismo código romperían la búsqueda por escaneo (¿cuál de los dos devuelve?). Se valida unicidad. Pero la unicidad correcta es **por unidad de negocio y sobre no borrados**, no global:

- Un producto soft-deleted (`deleted = true`) conserva su fila y su código. Un `UNIQUE` de base impediría volver a cargar ese mismo producto después de borrarlo — un bug garantizado el día que alguien borre un producto por error y lo quiera recargar.
- `null` debe poder repetirse libremente: casi todos los productos de Vivero y Abono lo tendrán en `null`.

Por eso la validación va en `ProductoServiceImpl`, dentro de la misma transacción del alta/edición:

```java
if (codigo != null && !codigo.isBlank()) {
    productoRepository.findByCodigoBarraAndUnidadNegocioIdAndDeletedFalse(codigo, unidadId)
        .filter(existente -> !existente.getId().equals(idQueSeEstaGuardando))
        .ifPresent(existente -> { throw new IllegalArgumentException(
            "El código de barras ya está asignado al producto \"" + existente.getNombre() + "\"."); });
}
```

El `filter` por id es lo que permite **re-guardar un producto sin cambiarle el código** — sin él, editar el precio de un producto que ya tiene código fallaría contra sí mismo.

El mensaje de error nombra al producto en conflicto: "ya existe" a secas obliga al vendedor a buscar cuál es. `getErrorMessage` en el frontend ya propaga el mensaje del backend al toast, así que el vendedor lo lee tal cual.

En base se agrega un índice **no único** `idx_productos_codigo_barra` para que la búsqueda por escaneo no haga sequential scan. No un `UNIQUE`, por las razones de arriba. (Un índice único parcial `WHERE deleted = false AND codigo_barra IS NOT NULL` sería la solución de base correcta, pero `ddl-auto` de Hibernate no genera índices parciales; queda documentado como mejora futura si alguna vez se migra a Flyway.)

**Normalización**: el código se guarda `trim()`-eado y se descarta a `null` si queda vacío. Sin `toUpperCase()`: EAN/UPC son numéricos y Code128 es case-sensitive.

### Decisión 4 — El escaneo llena el campo; el guardado lo confirma el usuario

En el formulario, el escáner **no persiste nada**. Lee el código, lo escribe en el input de texto, cierra el modal y deja el foco visible sobre el valor detectado. El producto se guarda cuando el usuario aprieta Guardar, como cualquier otro campo.

Es la diferencia entre un error detectable y uno silencioso. Si el escaneo captura el código de la caja de al lado — algo perfectamente posible con dos cajas juntas en el mostrador — con confirmación el usuario lo ve en pantalla antes de guardar; con guardado automático el producto queda con un código ajeno y el error recién aparece meses después, cuando alguien escanee ese envase y salga el producto equivocado.

El campo además es **editable a mano**: si la cámara no coopera (envase arrugado, poca luz, código dañado) el vendedor tipea los 13 dígitos y sigue. Esto es también la red de seguridad del riesgo de HTTPS de la Decisión 6.

### Decisión 5 — El botón de búsqueda va en la barra de búsqueda de `Productos.jsx`

`Productos.jsx` ya tiene el patrón exacto: una barra de búsqueda con un modo alternativo, los botones `Todo` / `Sólo Nº Siembra` que aparecen sólo para `unidadNegocioActiva === '1'`. El botón de escaneo es la misma idea para `unidadNegocioActiva === '2'`: un botón con icono `ScanBarcode` de `lucide-react` a la derecha del input, en el mismo contenedor.

Es donde el vendedor ya está cuando quiere buscar un producto, y no agrega una entrada de menú nueva para una acción que es "buscar".

**Búsqueda server-side, no client-side sobre la lista cargada.** Aunque `Productos.jsx` ya tiene todos los productos en memoria y filtrar ahí sería una línea, se usa el endpoint nuevo:
1. La lista en memoria puede estar desactualizada (otro usuario cargó ese producto hace 30 segundos), y el caso de uso es justamente "¿existe este producto?" — una respuesta "no existe" basada en datos viejos es una respuesta equivocada.
2. El endpoint es reutilizable desde el flujo de venta el día que se extienda, sin duplicar lógica.

El endpoint es una consulta puntual por índice, no un listado, así que la regla de paginación no aplica.

### Decisión 6 — Cámara: contexto seguro requerido, con degradación explícita

`navigator.mediaDevices.getUserMedia` sólo existe en **contexto seguro**: HTTPS, o `localhost`. Si el vendedor entra al sistema por la IP de la red local (`http://192.168.x.x:5173`, que es exactamente como funciona hoy el `vite --host` del proyecto), `navigator.mediaDevices` es `undefined` y la cámara no abre.

Esto no es algo que se pueda arreglar desde el código de la app — es política del navegador. El diseño lo trata como caso de primera clase en vez de dejarlo explotar:

- Antes de intentar abrir la cámara, `EscanerCodigoBarra` chequea `navigator.mediaDevices?.getUserMedia`. Si no está, **no monta el video**: muestra un mensaje que explica que el escaneo necesita HTTPS y que el código se puede escribir a mano, y el input de texto queda ahí para tipearlo.
- Lo mismo si `getUserMedia` rechaza por permiso denegado (`NotAllowedError`) o cámara ocupada/inexistente (`NotFoundError`): cada caso tiene su mensaje, no un "error al escanear" genérico.
- El botón de escaneo **no se oculta** cuando falta el contexto seguro. Ocultarlo dejaría al usuario sin saber por qué la función que le prometieron no aparece; mostrarlo y explicar el motivo al tocarlo es información, no fricción.

Habilitar HTTPS en la red local es una tarea de infraestructura fuera del alcance de este change; queda anotada en Open Questions.

### Decisión 7 — `EscanerCodigoBarra` es un componente único, usado por los dos flujos

Un solo componente `EscanerCodigoBarra.jsx` con la interfaz mínima:

```jsx
<EscanerCodigoBarra
  isOpen={boolean}
  onClose={() => {}}
  onDetectado={(codigo) => {}}   // string ya normalizado
/>
```

No sabe nada de productos ni de formularios: abre la cámara, decodifica, devuelve un string. `ProductoForm` lo usa para llenar su input; `Productos.jsx` lo usa para disparar la búsqueda. Toda la interacción con `@zxing/browser` queda encapsulada acá (y por eso el reemplazo por `BarcodeDetector` en el futuro tocaría un solo archivo).

**Liberación de la cámara**: el `BrowserMultiFormatReader` debe detenerse (`reset()`) y el `MediaStream` cerrarse (`stream.getTracks().forEach(t => t.stop())`) en el cleanup del `useEffect` **y** al detectar un código. Sin eso el LED de la cámara queda encendido y el stream retenido después de cerrar el modal — el bug clásico de este tipo de componente.

### Decisión 8 — Producto no encontrado: modal con opción de cargarlo

Cuando el escaneo no matchea ningún producto, no alcanza un toast de error: el vendedor está parado frente al cliente con el producto en la mano y el paso siguiente obvio es cargarlo.

Se muestra el modal de resultado en estado "no encontrado", con el código leído visible y un botón "Cargar producto con este código" que abre `ProductoForm` en modo alta **con el campo de código de barras ya completo**. El botón sólo aparece si el usuario no es `isColega` (misma condición que ya gobierna el botón "Nuevo Producto" en `Productos.jsx`); un usuario sin permiso de escritura ve sólo el mensaje.

Todo el feedback pasa por `useUIStore` / componentes propios. Cero `alert` y cero `confirm` nativos.

### Decisión 9 — Permisos: se reutilizan los existentes, no se crea ninguno

Verificado contra `PermisoEnum.java` (18 permisos, IDs estables, "agregar nuevos siempre al final") y `ProductoController`:

| Acción | Permiso | Ya existe |
|---|---|---|
| Guardar/editar el código de barras de un producto | `ESCRIBIR_STOCK` | sí — es el mismo `PUT`/`POST /api/productos` de siempre |
| Buscar un producto por código de barras | `LEER_STOCK` | sí — mismo permiso que `GET /api/productos` |

El endpoint nuevo se anota `@PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")`, alineado con los otros `GET` del controller. Agregar un `ESCANEAR_CODIGO` sería un permiso sin significado propio: quien puede ver el catálogo ya puede ver toda esta información escribiendo el nombre en el buscador. El escáner es un método de entrada, no un nivel de acceso.

### Decisión 10 — Aditivo sobre el working tree de `negocio-abono`

`negocio-abono` está aplicado pero sin commitear ni archivar, y tiene modificados en el árbol de trabajo los cuatro archivos que este change toca del lado backend. La convivencia es segura porque las superficies no se cruzan: `negocio-abono` agrega `categoriaAbono`, `stockInvernadero` y `stockColega`; este change agrega `codigoBarra`. Ningún campo, método ni endpoint se comparte.

Regla operativa para la implementación: **leer el estado actual en disco** de `Producto.java`, `ProductoDTO.java`, `ProductoController.java` y `ProductoRepository.java` antes de editarlos, y agregar al final de lo que ya está. Nunca reconstruir un archivo desde una versión anterior ni desde memoria — eso borraría el trabajo de `negocio-abono` sin dejar rastro en el diff.

## Risks / Trade-offs

**[La cámara no abre por HTTP en la red local]** → Tratado como caso de primera clase (Decisión 6): mensaje explícito que nombra la causa, e input manual siempre disponible como camino alternativo. La función degrada, no se rompe. HTTPS en la red local queda como tarea de infraestructura separada.

**[Falso positivo: el decoder lee el código del envase de al lado]** → El escaneo nunca persiste solo (Decisión 4). En el formulario el usuario confirma; en la búsqueda, el peor caso es que aparezca la ficha de otro producto, que el vendedor detecta al instante porque no es lo que tiene en la mano. Formatos restringidos (Decisión 2) para reducir la tasa de lectura espuria.

**[Bundle +200 KB gzip]** → Import dinámico dentro de `EscanerCodigoBarra`, que sólo se monta en Herramientas. Vivero y Abono no descargan la librería. El costo real lo paga sólo quien usa la función.

**[Dos productos legítimamente con el mismo código]** → Rechazado por validación, con el nombre del producto en conflicto en el mensaje. Si algún día aparece un caso real (mismo código de fábrica para dos referencias distintas), la restricción se relaja en un solo lugar — el service. Es la decisión reversible; permitir duplicados desde el arranque y descubrir después que la búsqueda es ambigua no lo es.

**[Códigos ya cargados a mano en `descripcion` por vendedores]** → No se migra nada automáticamente: intentar parsear números de un campo de texto libre generaría asignaciones equivocadas silenciosas. Los productos existentes arrancan con `codigoBarra` en `null` y se van completando al escanearlos.

**[Cámara que queda tomada al cerrar el modal]** → Cleanup explícito del `MediaStream` y del reader en el `useEffect` y en el detectado (Decisión 7). Es la parte del componente que hay que verificar a mano en el dispositivo, no sólo por código.

## Migration Plan

1. **Schema**: `ddl-auto` agrega `productos.codigo_barra VARCHAR(64)` nullable en el próximo arranque del backend. Nada que backfillear — `null` es el estado inicial correcto y significa "todavía no se escaneó".
2. **Índice**: `CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos (codigo_barra);` — no único, ver Decisión 3.
3. **Dependencias frontend**: checkpoint del usuario antes de `npm install @zxing/browser @zxing/library`.
4. **Orden de despliegue**: backend primero (el campo y el endpoint son aditivos, el frontend viejo los ignora sin romperse), frontend después.
5. **Rollback**: el campo es nullable y ningún flujo existente lo lee. Revertir el frontend deja el sistema exactamente como estaba; la columna puede quedar en base sin efecto, igual que `marca_id` y `descuento_proveedor` ya quedaron como red de rollback de changes anteriores.

## Open Questions

- ~~**HTTPS en la red local del vivero.**~~ **Resuelta (2026-09-01, decisión del usuario):** no es una Open Question de este change. La app en producción corre desplegada con HTTPS real (no sobre la IP plana de la red local) — la limitación de `getUserMedia` en HTTP que describe la Decisión 6 es exclusivamente un problema del entorno de **desarrollo** actual (`vite --host` por `http://192.168.x.x:5173`), no algo a resolver acá. El manejo defensivo de la Decisión 6 (chequeo de `navigator.mediaDevices?.getUserMedia`, mensaje explícito, input manual siempre disponible) se mantiene igual: sigue siendo la red de seguridad correcta para cualquier entorno sin contexto seguro (incluido el propio dev local), independientemente de que producción ya lo tenga resuelto por infraestructura.
- **¿Extender el escaneo a `NuevaVenta.jsx`?** Es la extensión obvia — escanear para agregar al carrito. Deliberadamente fuera de alcance acá porque el pedido fue sobre consulta, no sobre venta. El endpoint queda diseñado para soportarlo sin cambios.
- **Etiquetas propias para productos sin código de fábrica.** Requeriría generar e imprimir códigos. Change aparte si aparece la necesidad.
