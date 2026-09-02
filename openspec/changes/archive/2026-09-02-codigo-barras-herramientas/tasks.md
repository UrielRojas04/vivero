## 1. Checkpoint de dependencias (BLOQUEANTE)

- [x] 1.1 **CHECKPOINT DEL USUARIO** — pedir aprobación explícita para instalar `@zxing/browser` y `@zxing/library` (Decisión 2 de `design.md`). No ejecutar `npm install` sin ese OK. Si el usuario prefiere no sumar dependencias, el fallback es `BarcodeDetector` nativo, que deja sin escaneo a Safari iOS y Firefox — decisión suya, documentarla en `design.md` antes de seguir. Aprobación explícita recibida (instrucción del usuario relayada en el brief de esta tarea).
- [x] 1.2 Con la aprobación dada, instalar las dependencias en `frontend/` y verificar que quedaron en `frontend/package.json` como dependencias de producción. `npm install @zxing/browser @zxing/library` ejecutado; `git diff frontend/package.json` confirma `@zxing/browser: ^0.2.1` y `@zxing/library: ^0.23.0` en `dependencies` (no `devDependencies`).

## 2. Backend — modelo y DTO

- [x] 2.1 Leer el estado ACTUAL en disco de `backend/src/main/java/com/vivero/gestion/models/Producto.java` (Decisión 10: `negocio-abono` está aplicado y sin commitear sobre este archivo — se agrega al final, no se reescribe).
- [x] 2.2 Agregar en `Producto` el campo `@Column(name = "codigo_barra", length = 64) private String codigoBarra;` con su getter y setter, sin tocar ningún campo existente.
- [x] 2.3 Leer el estado actual de `backend/src/main/java/com/vivero/gestion/dto/ProductoDTO.java` y agregar `private String codigoBarra;` con getter y setter.
- [x] 2.4 Verificar por diff (`git diff` de ambos archivos) que el único cambio introducido es el campo nuevo y que nada de `negocio-abono` (`categoriaAbono`, `stockInvernadero`, `stockColega`) quedó alterado. Confirmado: diff muestra únicamente el bloque `codigoBarra` agregado en ambos archivos.

## 3. Backend — repositorio y consulta

- [x] 3.1 Agregar en `ProductoRepository` el método `Optional<Producto> findByCodigoBarraAndUnidadNegocioIdAndDeletedFalse(String codigoBarra, Long unidadNegocioId)`.
- [x] 3.2 Documentar en el repositorio el índice de base `idx_productos_codigo_barra` (no único, ver Decisión 3) y ejecutar `CREATE INDEX IF NOT EXISTS idx_productos_codigo_barra ON productos (codigo_barra);` contra la base de desarrollo. Ejecutado contra `vivero-postgres`/`vivero_db`; confirmado con `\d productos` (`"idx_productos_codigo_barra" btree (codigo_barra)`).
- [x] 3.3 Verificar que `ddl-auto` creó la columna `productos.codigo_barra` como `varchar(64)` nullable al arrancar el backend. Confirmado por el log de Hibernate (`alter table if exists productos add column codigo_barra varchar(64)`, sin error) y por `\d productos` (`codigo_barra | character varying(64)`).

## 4. Backend — service: persistencia y validación

- [x] 4.1 En `ProductoServiceImpl`, agregar un helper privado `normalizarCodigoBarra(String)` que devuelve `null` para `null`, cadena vacía o sólo espacios, y el valor `trim()`-eado en el resto de los casos (sin `toUpperCase()`, Decisión 3).
- [x] 4.2 Agregar un helper privado `validarCodigoBarraUnico(String codigo, Long unidadId, Long idActual)` que consulta el repositorio y lanza `IllegalArgumentException` con el nombre del producto en conflicto. El filtro por `idActual` es lo que permite re-guardar un producto sin cambiarle el código — no omitirlo.
- [x] 4.3 Cablear la normalización y la validación en `crearProducto`, dentro de la transacción existente, usando la unidad de `UnidadNegocioContextHolder`.
- [x] 4.4 Cablear lo mismo en `actualizarProducto`, pasando el id del producto que se está editando como `idActual` (usa la unidad del propio producto, `producto.getUnidadNegocio()`, no el contexto del hilo, para no depender de que ambos coincidan).
- [x] 4.5 Verificar que el cambio de `codigoBarra` NO se agrega a la detección de cambios de costo (`stockChanged`/`costChanged`/`ivaPropioChanged`/…): el identificador no es componente del costo y no debe generar un `MovimientoStock`. Confirmado por lectura del código: el bloque de `codigoBarra` en `actualizarProducto` vive fuera de los cinco booleans de cambio y del `if` que dispara `movimientoStockService.registrarMovimiento(...)`.
- [x] 4.6 Mapear `codigoBarra` en `mapToDTO`.
- [x] 4.7 Agregar a la interfaz `ProductoService` y a su implementación el método `ProductoDTO buscarPorCodigoBarra(String codigo)`, `@Transactional(readOnly = true)`, acotado a la unidad activa, que lanza la excepción de no encontrado cuando no hay coincidencia.

## 5. Backend — endpoint

- [x] 5.1 Leer el estado actual de `ProductoController.java` y agregar `GET /api/productos/codigo-barra/{codigo}` anotado `@PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")`, delegando en el service (el controller nunca toca el repositorio).
- [x] 5.2 Confirmar que el endpoint devuelve 404 (no 500) cuando el código no existe, y que la respuesta es siempre `ProductoDTO`, nunca la entidad. Implementado con un `try/catch` de `ResourceNotFoundException` DENTRO del método del controller (no un `@ExceptionHandler` de `@RestController`): los tests del grupo 6 invocan el bean del controller directamente, igual que `RendicionColegaControllerPermisoTest`, y ese camino nunca pasa por el resolver de excepciones de MVC — un `@ExceptionHandler` local no se habría disparado. Verificado por el test 6.9 (200/404/404).
- [x] 5.3 Verificar que no se agregó ningún valor a `PermisoEnum` (Decisión 9) y que `SecurityConfig` no necesita reglas nuevas para la ruta. `git diff --stat` de `PermisoEnum.java` y `SecurityConfig.java`: sin salida (cero cambios). `SecurityConfig.java` no tiene reglas por URL para `/api/productos/**` — la seguridad de esas rutas es 100% `@PreAuthorize` a nivel de método.

## 6. Backend — tests (base real, sin mocks de DB)

- [x] 6.1 Test: crear producto con `codigoBarra` lo persiste y lo devuelve en el DTO.
- [x] 6.2 Test: crear producto sin `codigoBarra` persiste `null` y no rompe nada existente.
- [x] 6.3 Test: `codigoBarra` con espacios o vacío se normaliza (`"  123  "` → `"123"`, `"   "` → `null`).
- [x] 6.4 Test: guardar un segundo producto con un código ya usado en la misma unidad falla, y el mensaje nombra al producto en conflicto.
- [x] 6.5 Test: editar un producto que ya tiene código, sin cambiar el código, guarda correctamente (no conflicto contra sí mismo).
- [x] 6.6 Test: dos productos con `codigoBarra` null en la misma unidad conviven sin error.
- [x] 6.7 Test: un código de un producto soft-deleted puede reutilizarse en un producto nuevo.
- [x] 6.8 Test: el mismo código en dos unidades de negocio distintas es aceptado.
- [x] 6.9 Test: `GET /api/productos/codigo-barra/{codigo}` devuelve 200 con el producto correcto, 404 con código inexistente, y 404 con código de otra unidad de negocio.
- [x] 6.10 Test: el endpoint responde 403 a un usuario sin `LEER_STOCK` ni `ESCRIBIR_PRODUCCION`.

**Evidencia real de ejecución** — `backend/src/test/java/com/vivero/gestion/services/ProductoCodigoBarraTest.java` (10 tests), base real `vivero-postgres`/`vivero_db` (localhost:5433), sin mocks:
- RED (antes de implementar el grupo 4/5, con `buscarPorCodigoBarra` como stub que lanza `UnsupportedOperationException`): `Tests run: 10, Failures: 6, Errors: 1, Skipped: 0` — sólo pasaban 6.2, 6.6 y 6.10 (comportamiento trivial que no dependía de la implementación nueva).
- GREEN (después de implementar el grupo 4/5 completo): `Tests run: 10, Failures: 0, Errors: 0, Skipped: 0` — confirmado en corrida aislada y de nuevo dentro de la suite completa del backend.
- Regresión: suite completa del backend (`mvn test`, 41 tests) corrida antes y después — sin regresiones nuevas. Dos fallas preexistentes e independientes de este change (no tocadas, no arregladas): `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly` (falla contra el estado actual de `DataInitializer.java`, archivo ya modificado por otro change en curso, `costeo-flexible-por-producto`, antes de que este trabajo empezara) y un error de DDL preexistente no fatal (`syntax error at or near "default"`) durante el `ddl-auto` de otra columna ajena a `codigoBarra`.

## 7. Frontend — componente de escaneo

- [x] 7.1 Crear `frontend/src/components/EscanerCodigoBarra.jsx` (PascalCase) con la interfaz `{ isOpen, onClose, onDetectado }` — no sabe nada de productos, sólo devuelve un string (Decisión 7).
- [x] 7.2 Chequear `navigator.mediaDevices?.getUserMedia` ANTES de montar el `<video>`; si falta, renderizar el mensaje de contexto no seguro (HTTPS) explicando que el código puede escribirse a mano (Decisión 6).
- [x] 7.3 Importar `@zxing/browser` de forma dinámica (`await import(...)`) dentro del componente, para que Vivero y Abono no descarguen la librería. También `@zxing/library` (hints/formatos) se importa dinámicamente en el mismo bloque, mismo criterio.
- [x] 7.4 Restringir los formatos del decoder a `EAN_13`, `EAN_8`, `UPC_A`, `UPC_E` y `CODE_128` vía `DecodeHintType.POSSIBLE_FORMATS` (reduce falsos positivos).
- [x] 7.5 Manejar `NotAllowedError` (permiso denegado) y `NotFoundError` (sin cámara / ocupada) con mensajes distintos entre sí y distintos del de contexto no seguro.
- [x] 7.6 Implementar el cleanup tanto en el retorno del `useEffect` como al detectar un código (tarea crítica). **Nota de implementación**: la versión instalada (`@zxing/browser@0.2.1` + `@zxing/library@0.23.0`) es el paquete moderno, separado del combinado viejo — `BrowserMultiFormatReader` de esta versión NO tiene un método `.reset()` (ese método era de una API anterior); el cleanup real de esta API es el objeto `controls` devuelto por `decodeFromVideoDevice(...)`, cuyo `controls.stop()` ya detiene internamente el loop de decodificación Y los tracks del `MediaStream` (verificado leyendo `BrowserCodeReader.js` del paquete instalado: `finalizeCallback` llama a `disposeMediaStream(stream)`, que hace `stream.getVideoTracks().forEach(t => t.stop())`). `detenerCamara()` llama a `controlsRef.current?.stop()` y, como red de seguridad adicional exigida por el brief, TAMBIÉN detiene explícitamente cualquier track que haya quedado en `videoRef.current.srcObject` por las dudas — se ejecuta en el cleanup del `useEffect` (cierre del modal/desmontaje) y dentro del callback de detección, antes de `onDetectado`/`onClose`. También cubre la carrera "se cerró el modal mientras esperaba el permiso de cámara" (`cancelado` + `controls.stop()` post-await).
  - **Ajuste post-verificación, pedido por el usuario**: reportó un código que no se leía, "no sé si por chiquito". Causa real: `decodeFromVideoDevice(undefined, ...)` internamente sólo pide `{ facingMode: 'environment' }` — cero hint de resolución, así que el navegador elige la que quiere (a veces baja, insuficiente para distinguir barras finas de un código chico o denso). Se cambió a `reader.decodeFromConstraints({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }, ...)` — mismo método interno (`decodeFromVideoDevice` llama a `decodeFromConstraints` con el mismo objeto `controls` de retorno, confirmado leyendo el código fuente del paquete instalado), así que el cleanup de arriba no cambia. `ideal` (no `exact`): si el dispositivo no soporta esa resolución, cae a la mejor que pueda sin romper nada.
  - **Otro ajuste relacionado**: el input de carga manual del escáner tenía `inputMode="numeric"` (teclado numérico forzado en el celular) — bug real, porque el formato `CODE_128` (ya soportado por el decoder) es alfanumérico y puede tener letras, no sólo EAN/UPC que sí son sólo números. Sacado.
  - **Investigación puntual**: el usuario compartió una foto de un código que no lograba escanear (`frontend/public/img/codigo.jpg`). Se probó a decodificarla offline, fuera de la app, con la misma librería (`@zxing/library`) en más de 15 combinaciones de rotación/contraste/escala — ninguna lo leyó. Causa real de esa foto puntual: algo de desenfoque + el código pegado sobre la curva de un envase cilíndrico (deforma las barras), no un defecto del componente. De ahí surgieron dos mejoras generales, aplicadas: (a) `DecodeHintType.TRY_HARDER` en los hints del decoder (no estaba activado); (b) botón de linterna dentro del modal de escaneo, usando `controls.switchTorch` de `@zxing/browser` (sólo aparece si el dispositivo lo soporta — `torchDisponible` se confirma recién con la cámara ya corriendo, no antes). Ninguna de las dos garantiza leer una foto ya de por sí borrosa/curva, pero bajan la tasa de fallo en el caso general (poca luz, códigos marginales).
- [x] 7.7 Estilar el modal siguiendo las convenciones del proyecto: tokens de color existentes (`bg-paper`, `border-line`, `text-ink`, `text-muted`), `cursor-pointer` en todos los botones, iconos de `lucide-react`. `npx oxlint src/components/EscanerCodigoBarra.jsx` limpio (sin warnings/errores).
- [x] 7.8 (Post-verificación en dispositivo, pedido del usuario) Agregar un input de carga manual **dentro del propio `EscanerCodigoBarra.jsx`**, siempre visible (no sólo en los estados de error), que llama al mismo `onDetectado`. Motivo: el fallback manual que ya existía (tarea 7.2/8.4) vive en el campo de `ProductoForm.jsx`, pero `Productos.jsx` (búsqueda desde el catálogo) no tiene ningún campo propio — si la cámara fallaba ahí, no había forma de seguir. Ahora el modal es autosuficiente en los dos usos. `npx oxlint` limpio.

## 8. Frontend — formulario de producto

- [x] 8.1 En `ProductoForm.jsx`, agregar el estado `codigoBarra` y precargarlo en modo edición desde el producto recibido.
- [x] 8.2 Renderizar el campo "Código de barras" con su botón de escaneo (icono `ScanBarcode`) sólo bajo `unidadNegocioActiva === '2'`, siguiendo el patrón de los bloques condicionales que ya existen en el formulario.
- [x] 8.3 Cablear `EscanerCodigoBarra`: el `onDetectado` escribe en el estado del campo y cierra el modal. No dispara guardado (Decisión 4).
- [x] 8.4 Dejar el input editable a mano, para carga manual cuando la cámara no está disponible.
- [x] 8.5 Incluir `codigoBarra` en el payload de `handleSubmit`, sólo cuando la unidad es Herramientas.
- [x] 8.6 Aceptar un `codigoBarra` inicial vía prop (`codigoBarraInicial`), para el alta precargada desde el resultado "no encontrado" (tarea 9.5). `npx oxlint` sobre `ProductoForm.jsx` y `EscanerCodigoBarra.jsx`: sin warnings nuevos (el único warning presente, `handlePrecioChange` sin usar, es preexistente — confirmado con `git stash`).

## 9. Frontend — búsqueda por escaneo en el catálogo

- [x] 9.1 En `Productos.jsx`, agregar el botón de escaneo dentro del contenedor de la barra de búsqueda, condicionado a `unidadNegocioActiva === '2'` (mismo patrón que los botones `Todo`/`Sólo Nº Siembra` de Vivero). Verificado por grep: `pages/Productos.jsx:274`.
- [x] 9.2 Al detectar un código, llamar a `GET /api/productos/codigo-barra/{codigo}` vía `api` — no filtrar la lista en memoria (Decisión 5). Implementado en `handleCodigoDetectado`.
- [x] 9.3 Crear `frontend/src/components/ProductoEncontradoModal.jsx` con la ficha del producto: nombre, descripción, precio, stock y proveedor cuando corresponda.
- [x] 9.4 Manejar el 404 mostrando el modal en estado "no encontrado" con el código leído visible.
- [x] 9.5 En ese estado, ofrecer "Cargar producto con este código" (sólo si `!isColega`, misma condición que gobierna "Nuevo Producto"), que abre `ProductoForm` en modo alta con el código precargado.
- [x] 9.6 Manejar el 403 con `denyAccess` y cualquier otro error con `pushToast('error', getErrorMessage(...))`. Cero `alert` y cero `confirm` nativos. `npx oxlint` sobre `Productos.jsx` y `ProductoEncontradoModal.jsx`: sin warnings nuevos (único warning en `Productos.jsx`, `Sparkles` sin usar, preexistente — confirmado con `git diff`).

## 10. Verificación manual en dispositivo

> Probado por el usuario en un celular real, vía un túnel HTTPS temporal (ngrok) armado
> específicamente para esta prueba, ya cerrado y con los cambios de `vite.config.js`/`axios.js`
> revertidos (confirmado por `git diff` vacío). El usuario confirmó en general "funciona
> perfecto" — no se pidió confirmación ítem por ítem, así que se marcan todas juntas sobre esa
> base.

- [x] 10.1 Verificar en un celular real, sobre `localhost` o HTTPS, que el escaneo lee un EAN-13 de un envase real y carga el código en el formulario.
- [x] 10.2 Verificar que al cerrar el modal (por detección y por cancelación) el indicador de cámara del dispositivo se apaga.
- [x] 10.3 Verificar el flujo completo: guardar un producto con código → escanear ese envase desde el catálogo → aparece la ficha correcta.
- [x] 10.4 Verificar el camino de "no encontrado" con un envase cualquiera no cargado, incluido el alta con código precargado.
- [x] 10.5 Verificar que en Vivero y en Abono no aparece ni el campo ni ninguno de los botones de escaneo.
- [x] 10.6 Verificar por HTTP sobre IP de red local que aparece el mensaje de HTTPS y que la carga manual del código funciona igual.

## 11. Cierre

- [x] 11.1 Confirmar por `git diff` que los cuatro archivos compartidos con `negocio-abono` (`Producto.java`, `ProductoDTO.java`, `ProductoController.java`, `ProductoRepository.java`) tienen sólo adiciones de este change, sin regresiones del otro. `git diff --stat`: `4 files changed, 53 insertions(+), 1 deletion(-)`. La única "deleción" es cosmética: una línea en blanco con espacios finales en `ProductoRepository.java` quedó reemplazada por una línea en blanco limpia al insertar el nuevo método justo ahí — no borra ni modifica ningún carácter de código de `negocio-abono` (`categoriaAbono`, `stockInvernadero`, `stockColega` intactos, verificado leyendo el diff completo de los 4 archivos).
- [x] 11.2 Registrar en `design.md` el estado de la Open Question de HTTPS en la red local: sin resolverla, el escaneo no funciona en el celular del vendedor en producción. Reemplazado el texto de la Open Question por la resolución confirmada por el usuario (ver debajo).

## 12. Escaneo en la recepción de pedidos (extensión pedida por el usuario, post-cierre)

> Idea del usuario: capturar el código de barras en el momento de confirmar que llegó un pedido
> de un proveedor — mientras ya se está mirando cada producto para poner la cantidad recibida —
> en vez de tener que ir después, producto por producto, al catálogo. Cubre TANTO productos ya
> existentes que todavía no tienen código guardado COMO productos nuevos que se crean recién al
> confirmar la recepción (líneas "pendiente de crear"). `Pedidos` ya está acotado a Herramientas
> en el sidebar (`unidades: ['herramientas']` en `DashboardLayout.jsx`) — no hace falta agregar
> ningún gating nuevo por unidad en este modal.

### Backend

- [x] 12.1 Agregar `private String codigoBarra;` (+ getter/setter) a `RecepcionItemDTO` — opcional, uno por ítem de la confirmación.
- [x] 12.2 Agregar `private String codigoBarra;` (+ getter/setter) a `PedidoDetalleDTO`, mapeado desde `detalle.getProducto().getCodigoBarra()` cuando el producto ya existe (null en líneas pendientes) — así el frontend sabe si ya hay uno guardado y puede ocultar el botón de escaneo en esas líneas.
- [x] 12.3 En `ProductoServiceImpl`, exponer (en la interfaz `ProductoService` y su implementación) un método público reutilizable, ej. `void asignarCodigoBarra(Long productoId, String codigoBarra)`, que reutilice `normalizarCodigoBarra`/`validarCodigoBarraUnico` ya existentes (no duplicar esa lógica) — para que `PedidoServiceImpl` no tenga que reimplementar la validación de unicidad.
- [x] 12.4 En `PedidoServiceImpl.confirmarRecepcion`, para cada `item` con `codigoBarra` no vacío:
  - Línea existente (`detalle.getProducto() != null`): llamar `productoService.asignarCodigoBarra(producto.getId(), item.getCodigoBarra())` **antes** de `productoRepository.save(producto)` en el mismo bloque, para que quede en la misma transacción que el ingreso de stock.
  - Línea pendiente (se crea `nuevoProductoDTO`): `nuevoProductoDTO.setCodigoBarra(item.getCodigoBarra())` antes de `productoService.crearProducto(nuevoProductoDTO)` — ya pasa por la validación de unicidad que ese método ya aplica internamente.
  - Si la validación de unicidad falla para algún ítem, la transacción completa de `confirmarRecepcion` debe abortar (ningún ingreso de stock a medias) — confirmar que el `@Transactional` del método ya cubre esto sin cambios adicionales. Confirmado por el test 12.5c: ninguna excepción se captura dentro del loop, se propaga y el `@Transactional` de clase hace rollback real (verificado contra la base, no sólo que el loop no llega al segundo ítem — ver evidencia abajo).
- [x] 12.5 Tests reales (base de datos real, sin mocks): (a) confirmar recepción con código nuevo en una línea existente lo persiste; (b) confirmar recepción de una línea pendiente con código la crea con ese código; (c) un código ya usado por otro producto de la misma unidad hace fallar toda la confirmación, sin ingresar stock de ningún ítem (transacción abortada); (d) confirmar sin mandar `codigoBarra` en ningún ítem sigue funcionando exactamente igual que antes (regresión).

### Frontend

- [x] 12.6 En `RecepcionPedidoModal.jsx`, agregar estado `codigosBarra` (mapa `detalleId → string`, análogo a `cantidades`).
- [x] 12.7 Por cada línea, si `esPendiente` (recepción, no vista de sólo lectura) Y la línea todavía no tiene código guardado (`!d.codigoBarra`), mostrar un botón de escaneo (ícono `ScanBarcode`, mismo componente `EscanerCodigoBarra` reutilizado) al lado de la cantidad recibida. Si la línea YA tiene `d.codigoBarra`, mostrar el código como texto de sólo lectura (chip chico) en vez del botón — no se reemplaza un código ya cargado desde acá. **Ajuste pedido por el usuario tras probarlo**: el chip de "ya tiene código" no muestra el número — muestra sólo un ícono (`BadgeCheck`) + el texto "Ya tiene código", con el número real disponible únicamente en el `title` (tooltip). El chip del código recién escaneado en esta sesión (`codigosBarra[d.id]`, todavía no guardado) sí sigue mostrando el número visible — es feedback de confirmación de lo que se acaba de leer, no una etiqueta permanente.
  - **Nota operativa importante descubierta en esta ronda**: `vivero-backend` NO tiene hot-reload — corre una imagen Docker compilada, sin montar el código fuente como volumen. Cualquier cambio de backend (como el campo `codigoBarra` en `PedidoDetalleDTO` de este mismo grupo) requiere `docker compose up -d --build backend` para reflejarse en el contenedor en ejecución; si no, la API sigue sirviendo el JAR viejo sin el cambio, aunque el código fuente y los tests locales estén actualizados. Esto causó que el primer intento de probar el chip de "Vinagre ya tiene código" fallara — no era un bug de lógica, era el contenedor desactualizado.
- [x] 12.8 Al detectar/tipear un código en el escáner de una línea, guardarlo en `codigosBarra[detalleId]` (no dispara ningún guardado individual — viaja junto con la confirmación general, mismo patrón que `cantidades`).
  - **Bug real reportado por el usuario, corregido en dos pasos**: cerrar el modal sin querer (Escape, click afuera, la X, "Cancelar") borraba todos los códigos ya escaneados y cantidades ya tocadas, sin avisar — el `useEffect` de precarga reinicia `codigosBarra`/`cantidades` cada vez que el modal se vuelve a abrir.
    - Primer intento (revertido): confirmar antes de cerrar (`askConfirm`) si había progreso sin guardar.
    - **Solución final, pedida por el usuario en vez de la anterior**: `frontend/src/store/useRecepcionDraftStore.js` (Zustand + `persist` en `sessionStorage`, mismo patrón que `useCartStore`), un borrador por `pedidoId` con `{ cantidades, codigosBarra }`. Se guarda en cada cambio, se precarga al reabrir el modal para ese mismo pedido (gana sobre la precarga por defecto), y se limpia sólo cuando la recepción se confirma con éxito. Con esto, cerrar el modal —a propósito o sin querer— ya no pierde nada; se sacó la confirmación de cierre, que quedaba redundante.
- [x] 12.9 En `enviarConfirmacion`, incluir `codigoBarra: codigosBarra[d.id] || undefined` en cada ítem del payload sólo cuando el usuario cargó uno.
- [x] 12.10 Reglas duras de UI: `cursor-pointer`, tokens del sistema de diseño ya vigentes en este archivo (`bg-accent`, `border-line`, etc.), sin literales viejos.
- [x] 12.11 `npx oxlint src/components/RecepcionPedidoModal.jsx` limpio. Confirmado: `npx oxlint src/components/RecepcionPedidoModal.jsx` sin salida, exit code 0.

**Evidencia real de ejecución (12.5)** — `backend/src/test/java/com/vivero/gestion/services/PedidoRecepcionCodigoBarraTest.java` (4 tests: a/b/c/d), base real `vivero-postgres`/`vivero_db` (localhost:5433), sin mocks:
- RED (con la validación de unicidad y el seteo de `codigoBarra` de `confirmarRecepcion` deshabilitados temporalmente vía dos ediciones puntuales, revertidas antes de GREEN): `Tests run: 4, Failures: 3, Errors: 0, Skipped: 0` — fallan (a) `confirmarRecepcionConCodigoEnLineaExistenteLoPersiste` (`expected: "REC-..." but was: null`), (b) `confirmarRecepcionDeLineaPendienteConCodigoLaCreaConEseCodigo` (mismo motivo) y (c) `codigoDuplicadoAbortaTodaLaConfirmacionSinIngresarStockDeNingunItem` (`Expecting code to raise a throwable` — no lanzaba porque `asignarCodigoBarra` estaba deshabilitado); pasa (d) `confirmarSinCodigoBarraEnNingunItemFuncionaIgualQueAntes` (no depende de la wiring nueva, mismo patrón que 6.2/6.6/6.10 del grupo 6).
- GREEN (wiring restaurada): `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0`.
- Regresión: suite completa del backend (`mvn test`, 45 tests: 41 previos + 4 nuevos) corrida después de GREEN — sin regresiones nuevas. Dos fallas preexistentes e independientes de este trabajo (no tocadas, no arregladas, confirmado por `git diff --stat` vacío sobre los archivos involucrados): `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly` (mismo defecto preexistente ya documentado en la evidencia del grupo 6, contra `DataInitializer.java` del change `costeo-flexible-por-producto` en curso) y `BackendApplicationTests.contextLoads` (falla de autenticación contra Postgres al cargar el `application.properties` de producción sin overrides — variante del entorno local de esta sesión, no relacionada con código de este change; los 4 tests nuevos y los 10 de `ProductoCodigoBarraTest` sí corrieron con overrides de `@TestPropertySource` y pasaron limpio).

### Verificación manual (usuario)

- [ ] 12.12 Recibir un pedido con una línea de producto existente sin código: escanearlo ahí mismo, confirmar, y verificar en `/productos` que quedó guardado.
- [ ] 12.13 Recibir un pedido con una línea "nueva" (producto que se crea al confirmar): escanear un código para esa línea, confirmar, y verificar que el producto nace con ese código ya cargado.
- [ ] 12.14 Confirmar una recepción sin tocar ningún escáner (flujo de siempre) y verificar que no cambió nada del comportamiento previo.

## 13. Aviso de código duplicado al escanear (extensión pedida por el usuario)

> Hoy el duplicado sólo se descubre al GUARDAR (toast de error genérico desde `validarCodigoBarraUnico`).
> El usuario pidió que se avise apenas se ESCANEA, mostrando qué producto ya tiene ese código, con
> dos opciones: descartar el código nuevo (no hacer nada) o quedarse con el código nuevo
> (reasignarlo, sacándoselo al producto viejo).

### Backend

- [x] 13.1 `ProductoService`/`ProductoServiceImpl`: nuevo método `void liberarCodigoBarra(String codigoBarra)`. Normaliza el código (reusar `normalizarCodigoBarra`), busca quién lo tiene hoy en la unidad activa (`UnidadNegocioContextHolder`) vía `productoRepository.findByCodigoBarraAndUnidadNegocioIdAndDeletedFalse`, y si existe alguien, le pone `codigoBarra = null` y guarda. Si nadie lo tiene, no hace nada (idempotente, no es un error). `@Transactional`.
- [x] 13.2 `ProductoController`: `DELETE /api/productos/codigo-barra/{codigo}`, `@PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")`, delega en `liberarCodigoBarra`. Devuelve 204 sin body.
- [x] 13.3 Tests reales (base real, sin mocks): (a) liberar el código de un producto que lo tenía lo deja en `null` y no toca ningún otro campo del producto; (b) liberar un código que nadie tiene no lanza error; (c) después de liberar, un `crearProducto`/`actualizarProducto` con ese mismo código en OTRO producto ya no falla por duplicado (regresión positiva del flujo completo).

### Frontend

- [x] 13.4 Nuevo archivo `frontend/src/utils/verificarCodigoBarraDuplicado.js`: función async `verificarCodigoBarraDuplicado(codigo)` que llama a `GET /api/productos/codigo-barra/{codigo}` (ya existe, se reusa) y devuelve el producto encontrado o `null` si da 404. Se centraliza acá para no duplicar la llamada en `ProductoForm.jsx` y `RecepcionPedidoModal.jsx` — `EscanerCodigoBarra.jsx` sigue sin saber nada de productos (no se toca, sigue devolviendo sólo el string).
- [x] 13.5 Nuevo componente `frontend/src/components/CodigoBarraDuplicadoModal.jsx`: modal simple (mismas convenciones visuales que el resto — `bg-paper`, `border-line-strong`, `rounded-panel`) que muestra el código escaneado y el nombre del producto que ya lo tiene, con dos botones: "Descartar código nuevo" (secundario) y "Quedarme con este código" (primario, `bg-accent`). Sin lógica propia de red — sólo llama a los callbacks `onDescartar`/`onQuedarme` que le pasen.
- [x] 13.6 En `ProductoForm.jsx`, en el handler que recibe el código de `EscanerCodigoBarra` (`onDetectado`): antes de escribirlo en el estado del campo, llamar a `verificarCodigoBarraDuplicado`. Si devuelve un producto CON ID DISTINTO al que se está editando (en alta, cualquier resultado es distinto; en edición, comparar contra `producto.id`), abrir `CodigoBarraDuplicadoModal` con ese producto en vez de escribir el código todavía. Si no hay conflicto (404, o es el mismo producto), escribirlo directo como hoy.
  - "Descartar código nuevo": cierra el modal, no cambia nada del campo.
  - "Quedarme con este código": llama a `DELETE /api/productos/codigo-barra/{codigo}`, y si sale bien, ahí sí escribe el código en el campo del formulario (el guardado real sigue pasando cuando el usuario aprieta "Guardar", como siempre — acá sólo se liberó el código de quien lo tenía).
  - Implementado como `handleCodigoEscaneado` (nuevo, reemplaza el `onDetectado={(codigo) => setCodigoBarra(codigo)}` inline anterior), con `handleDescartarCodigoDuplicado`/`handleQuedarmeConCodigoDuplicado` como callbacks del modal — los tres agregados junto a `handleBackdropClick`, y nuevo estado `conflictoCodigoBarra` (`{ codigo, producto } | null`) junto a `codigoBarra`/`escanerAbierto`.
- [x] 13.7 Mismo patrón en `RecepcionPedidoModal.jsx`, en `handleCodigoDetectado`: verificar antes de escribir en `codigosBarra[detalleId]`. Ojo con las líneas "pendiente de crear" (sin `productoId` todavía) — cualquier producto encontrado ahí es por definición un conflicto (no hay "soy el mismo producto" posible). En líneas existentes, comparar contra `d.productoId`.
  - `handleCodigoDetectado` pasó a ser async; guarda `detalleId`/limpia `escanerDetalleId` al toque (mismo comportamiento visual que antes) y recién después resuelve la verificación. Estado `conflictoCodigoBarra` lleva también `detalleId` (a diferencia de `ProductoForm.jsx`, acá hay más de una línea en juego a la vez).
- [x] 13.8 Reglas duras de UI: `cursor-pointer`, tokens vigentes, sin literales de paleta vieja, `npx oxlint` limpio en los 4 archivos tocados/creados. `npx oxlint src/utils/verificarCodigoBarraDuplicado.js src/components/CodigoBarraDuplicadoModal.jsx src/components/ProductoForm.jsx src/components/RecepcionPedidoModal.jsx src/api/productos.api.js`: 1 warning preexistente y ajeno a este grupo (`ProductoForm.jsx:195` `handlePrecioChange` declarado sin usar — confirmado por `git diff` que esa línea no forma parte de este diff), cero hallazgos sobre código nuevo/tocado por el grupo 13.

**Evidencia real de ejecución (13.3)** — `backend/src/test/java/com/vivero/gestion/services/ProductoLiberarCodigoBarraTest.java` (3 tests: a/b/c), base real `vivero-postgres`/`vivero_db` (localhost:5433), sin mocks:
- RED (con `liberarCodigoBarra` deliberadamente como no-op, revertido antes de GREEN): `Tests run: 3, Failures: 2, Errors: 0, Skipped: 0` — fallan (a) `liberarCodigoDeProductoQueLoTeniaLoDejaEnNullSinTocarOtrosCampos` (`expected: null but was: "EAN-..."`) y (c) `tresLiberadoUnCodigoOtroProductoPuedeUsarloSinChocar` (`crearProducto` sigue chocando con `IllegalArgumentException` porque el código nunca se liberó); pasa (b) `liberarCodigoQueNadieTieneNoLanzaError` de forma trivial (un no-op también es idempotente, no distingue del comportamiento real para ese caso puntual).
- GREEN (implementación real restaurada): `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`.
- Regresión: suite completa del backend (`mvn test`, 48 tests: 45 previos + 3 nuevos) corrida después de GREEN — sin regresiones nuevas. Una sola falla preexistente e independiente de este trabajo (no tocada, no arreglada, confirmado por `git diff --stat` vacío sobre `DataInitializer.java`): `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly` (mismo defecto ya documentado en la evidencia de los grupos 6 y 12, contra el change `costeo-flexible-por-producto` en curso). Nota de entorno de esta sesión (no relacionada con el código de este grupo): la sesión de shell no tenía exportadas `JWT_SECRET`/`DB_PASS`, y el JVM de esta máquina resuelve su zona horaria por defecto al alias legado `America/Buenos_Aires` en vez de `America/Argentina/Buenos_Aires` — el `postgres:15` corriendo en Docker no reconoce ese alias como parámetro de sesión válido y rechaza la conexión. Se resolvió exportando `JAVA_TOOL_OPTIONS=-Duser.timezone=UTC`, `DB_PASS` y `JWT_SECRET` antes de correr Maven; no requirió tocar ningún archivo de configuración del repo.

### Verificación manual (usuario)

- [ ] 13.9 Escanear, desde `ProductoForm`, un código que ya tiene otro producto — confirmar que aparece el modal con el nombre correcto, y que "Descartar" no cambia nada.
- [ ] 13.10 Repetir y elegir "Quedarme con este código" — guardar el formulario, y verificar en `/productos` que el producto viejo se quedó sin código y el nuevo lo tiene.
- [ ] 13.11 Repetir el mismo flujo desde la recepción de pedidos (`RecepcionPedidoModal`), en una línea existente y en una línea "nueva".
- [ ] 13.12 Escanear, en edición, el código que el MISMO producto ya tiene guardado — confirmar que NO aparece el modal de conflicto (no es un duplicado real).

### Bug real reportado por el usuario, corregido tras la implementación inicial

La primera versión de 13.6/13.7 llamaba a `DELETE /api/productos/codigo-barra/{codigo}` (liberar) **inmediatamente** al elegir "Quedarme con este código" en el modal — antes de que el usuario guardara nada. Si el formulario/la recepción se cerraba sin guardar, el producto viejo ya había perdido el código (llamada real, irreversible) pero el nuevo nunca llegó a recibirlo (eso pasaba recién en el submit real) — resultado: el código quedaba sin dueño en ningún lado. Confirmado en la base (`SELECT` de códigos duplicados activos: cero filas, coincide con "no lo encuentra al buscar" que reportó el usuario).

**Fix aplicado** en `ProductoForm.jsx` y `RecepcionPedidoModal.jsx`: "Quedarme con este código" ya NO llama a `liberarCodigoBarra` — sólo escribe el código en el campo/línea y guarda la intención (`codigoALiberarAlGuardar` / `codigosALiberarAlConfirmar`, éste último acumula más de uno porque puede haber varias líneas). El `DELETE` real se dispara recién dentro de `guardar()` / `enviarConfirmacion()`, justo antes del submit de verdad — si falla, se corta ahí sin guardar nada a medias. En `RecepcionPedidoModal.jsx` la intención pendiente también se agregó al borrador de `useRecepcionDraftStore` (mismo mecanismo de la tarea 12.8): si no se persistía ahí también, reabrir el modal restauraba el código escaneado sin la intención de liberarlo, y confirmar hubiese chocado igual contra el producto viejo. Frontend únicamente, hot-reload — no requirió reconstruir el backend.
