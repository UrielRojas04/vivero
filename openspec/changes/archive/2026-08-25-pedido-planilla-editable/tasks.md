> **Gobernanza: MEDIA** — lógica de negocio de UI sobre una pantalla de uso diario del dueño.
> Implementar por etapas y **detenerse en los checkpoints marcados 🔶** para mostrar el resultado
> al usuario antes de seguir. Reglas duras del proyecto vigentes: no buildear sin pedido, no
> commitear sin pedido, `cursor-pointer` en todos los botones, iconos `lucide-react`, feedback vía
> `useUIStore` (nunca `alert`/`confirm`), PascalCase en componentes y archivos.

## 1. Fix del total (bug) — aislado y verificable primero

> Se hace ANTES del rediseño y en su propio paso: es el bug que el usuario reportó con evidencia
> (`img/pedido ejemplo.png`) y tiene que poder verificarse sobre la UI actual, sin que el rediseño
> lo enmascare. Ver Decisión 1 de `design.md`.

- [x] 1.1 Crear `frontend/src/utils/pedidoCosteo.js` con `porcentajesDescuentoDeLinea(linea, productos)`: para línea pendiente (`!productoId && productoNombreNuevo`) devuelve los porcentajes numéricos de `linea.descuentosPactados`; para línea de producto existente devuelve los de `producto.descuentos` de la ficha; filtra los no numéricos. Función pura, sin React.
- [x] 1.2 Agregar en el mismo archivo `costoFinalDeLinea(linea, productos, cotizacionDolar)`: resuelve IVA/envío de la línea, arma la cotización sólo si `monedaLinea === 'USD'`, delega en `calcularCosto` de `utils/costeo.js` y devuelve `costoFinal`. Devuelve `0` si `costoUnitarioPactado` no es numérico (línea a medio cargar) y `0` si es USD sin cotización cargada.
- [x] 1.3 Reemplazar el `reduce` de `total` en `PedidoNuevo.jsx` (hoy `cantidad × costoUnitarioPactado`) por la suma de `cantidad × costoFinalDeLinea(...)`. Verificar que el total del header y el del footer leen la misma variable `total`.
- [x] 1.4 Hacer que `TablaCosteoProductoExistente` y la vista previa de línea pendiente consuman `costoFinalDeLinea` en vez de llamar a `calcularCosto` por su cuenta, de modo que los tres puntos compartan una única fórmula. Conservar en la tabla el acceso a `costoBaseConvertido` para el aviso de auto-ratchet (exponer el desglose completo si hace falta, no duplicar el cálculo).
- [x] 1.5 Verificar contra el caso de la captura: 1 unidad, costo $3.000, IVA 21%, envío 5% → la fila muestra $3.811,50 y **ambos** totales muestran $3.811,50.
- [x] 1.6 Verificar con dos ítems de distinto tipo (uno existente con descuentos en la ficha, uno pendiente con descuentos cargados a mano) que el total es exactamente la suma de los costos finales por cantidad de cada fila.
- [x] 1.7 Verificar el caso USD: con cotización cargada la línea aporta el importe convertido a pesos; sin cotización aporta 0 y la advertencia de cotización faltante sigue apareciendo.
- [ ] 🔶 **1.8 CHECKPOINT** — Mostrar al usuario el total corregido sobre la pantalla actual, antes de tocar el layout. Advertir explícitamente que el total va a ser mayor que el que venía viendo (era el costo pactado sin IVA ni envío), y confirmar que el número nuevo es el correcto para su criterio.

## 2. Preparación del rediseño — extracción sin cambio visual

> Mover código sin cambiar comportamiento, para que el paso 3 sea sólo layout. Después de este
> grupo la pantalla debe verse **idéntica** a como quedó en el grupo 1.

- [x] 2.1 Crear el directorio `frontend/src/components/pedidos/`.
- [x] 2.2 Mover `ProductoSearchSelect` desde `PedidoNuevo.jsx` a `frontend/src/components/pedidos/ProductoSearchSelect.jsx` sin cambiar su API (`productos`, `productoId`, `productoNombre`, `productoNombreNuevo`, `onSelect`, `hasError`) ni su comportamiento de búsqueda/creación.
- [x] 2.3 Verificar que la pantalla sigue funcionando igual: buscar producto, elegir existente, elegir "+ Crear producto nuevo…" conservando el texto tipeado, y el botón "Cambiar".

## 3. Grilla tipo planilla

> Núcleo del pedido del jefe. Ver Decisiones 2, 3, 6 y 9 de `design.md`.

- [x] 3.1 Definir en `PedidoNuevo.jsx` las constantes de plantilla de columnas (`GRID_COLS` y `GRID_COLS_USD`), una sola vez, compartidas por la fila de encabezados y por todas las filas de ítem. Columnas: producto · cantidad · [USD] · costo unit. · descuentos · IVA % · envío % · costo total · quitar.
- [x] 3.2 Elegir la plantilla según `proveedorSeleccionado.manejaDolares`: la columna USD existe o no existe para la grilla entera, nunca por fila.
- [x] 3.3 Cambiar el contenedor de la página de `max-w-4xl mx-auto` a ancho completo, y dejar el header, el bloque de proveedor/observaciones y el de cotización en su propio `max-w-4xl`. Sólo la tarjeta de ítems ocupa todo el ancho.
- [x] 3.4 Crear `frontend/src/components/pedidos/FilaItemPedido.jsx`: renderiza una fila de la grilla con las celdas en orden. Recibe por props la línea, los handlers del padre y los errores. **No** guarda estado del pedido; sólo estado de UI local si hace falta.
- [x] 3.5 Renderizar la fila de encabezados de columna (`hidden xl:grid` — ver 3.12) con las mismas etiquetas que las celdas.
- [x] 3.6 Celda de producto: `ProductoSearchSelect` con la celda en `relative` y el dropdown en `z-20`. Verificar que ningún ancestro de la fila tiene `overflow-hidden` ni `overflow-x-auto` (Decisión 6) y que el dropdown no queda recortado.
- [x] 3.7 Celdas numéricas (cantidad, costo unit., IVA %, envío %) con `FormattedNumberInput`, alineadas a la derecha, cableadas a `actualizarLinea` con los mismos nombres de campo de hoy. Estas celdas son iguales para línea existente y línea pendiente — es lo que hace que las columnas alineen.
- [x] 3.8 Celda de costo total de la fila: `costoFinalDeLinea(...)` formateado en pesos. Si la línea es USD, agregar debajo la nota chica con el importe original (`US$ 250`). Si la línea está a medio cargar, mostrar `—`.
- [x] 3.9 Celda de acción: botón de quitar ítem con `Trash2`, deshabilitado si es el único ítem (mismo criterio que hoy).
- [x] 3.10 Conservar el aviso de auto-ratchet ("este costo es mayor al de la ficha…") como texto al pie de la fila, con el mismo disparo `costoBaseConvertido > producto.costoProducto`.
- [x] 3.11 Mostrar los errores de validación por línea sin romper la altura de la fila (texto compacto bajo la celda correspondiente: producto, cantidad, costo, IVA, descuentos).
- [x] 3.12 Colapso responsive: por debajo de `xl` (ajustado de `lg`, ver Decisión 6 de design.md — el shell de la app envuelve toda página en `overflow-x-hidden` fijo y a `lg` la grilla de 9 columnas recortaba en silencio entre 1024–1280px, sin scrollbar), cada ítem se renderiza como tarjeta apilada de ancho completo con pares `etiqueta: valor`, sin scroll horizontal. Verificado con Playwright contra el dev stack real en 375px, 768px, 1024px (tarjeta, sin desborde) y 1366px+ (grilla completa, sin recorte). Pendiente para el checkpoint 3.14: queda una ventana residual angosta ~1280–1340px con recorte parcial (~60px del borde derecho) — viewport exacto poco común en laptops reales (que suelen partir de 1366px), no perseguido más allá porque angostar columnas es una decisión de densidad para el usuario.
- [x] 3.13 Eliminar `TablaCosteoProductoExistente` de `PedidoNuevo.jsx` una vez que sus cuatro columnas viven en la grilla.
- [ ] 🔶 **3.14 CHECKPOINT** — Mostrar al usuario la grilla con 3–4 ítems mezclados (existentes y pendientes, alguno en USD) antes de seguir con los descuentos. Es la decisión de layout más visible del change: confirmar densidad, orden de columnas y anchos antes de invertir en el resto.

## 4. Celda de descuentos y sub-filas expandibles

> Ver Decisiones 4 y 5 de `design.md`. Es la parte con más riesgo de romper la alineación de la grilla.

- [x] 4.1 Crear `frontend/src/components/pedidos/CeldaDescuentos.jsx`: resumen compacto de altura fija. Sin descuentos → `—`. Con descuentos → chips truncados `Nombre X%` más el efectivo total de la cascada `(-14,5%)` cuando aplique.
- [x] 4.2 Para línea de **producto existente**: los chips salen de `producto.descuentos` (ficha), en solo lectura, sin `+` ni expansión, con `title` aclarando que se editan en la ficha del producto. Es información nueva: hoy esos descuentos se aplican al costo pero no se ven.
- [x] 4.3 Para línea **pendiente**: los chips salen de `linea.descuentosPactados` y la celda ofrece `+` para agregar y es clickeable para abrir el editor.
- [x] 4.4 Agregar en `PedidoNuevo.jsx` el estado de expansión como `Set` de `lineaId` (varias filas pueden estar abiertas a la vez), con su handler de toggle.
- [x] 4.5 Crear `frontend/src/components/pedidos/PanelDescuentosLinea.jsx`: sub-fila `col-span-full` bajo la fila del ítem con el editor completo — lista de `{nombre, %}`, agregar/quitar, botón "Recargar del proveedor" y el error de validación de descuentos. Cablear a `agregarDescuentoLinea`, `quitarDescuentoLinea`, `actualizarDescuentoLinea` y `recargarDefaultsProveedorLinea` sin cambiarlos.
- [x] 4.6 Auto-expandir la sub-fila al presionar `+` y al crear una línea pendiente que ya trae descuentos por defecto del proveedor, para compensar el clic extra que introduce el diseño. Verificado con Playwright: elegir "+Crear producto nuevo…" con proveedor INGCO (2 descuentos por defecto) abre la sub-fila automáticamente al confirmar.
- [x] 4.7 Convertir el sub-formulario de producto pendiente (`creandoParaLinea`) en sub-fila `col-span-full` con el mismo mecanismo, en vez de bloque suelto.
- [x] 4.8 Verificar que una fila con 3 descuentos y otra sin ninguno conservan exactamente la misma estructura de columnas, y que abrir/cerrar sub-filas no desplaza el eje de columnas. Verificado con Playwright: fila con 2 descuentos + fila sin ninguno (producto existente) alineadas; toggle abrir/cerrar no desplaza columnas.

## 5. Gate de proveedor obligatorio

> Ver Decisión 7 de `design.md`.

- [x] 5.1 Cambiar el estado inicial de `items` a `[]` cuando no hay proveedor (hoy arranca con `[lineaVacia()]`), y crear la primera fila al seleccionar proveedor.
- [x] 5.2 Estado vacío sin proveedor y sin ítems: dentro de la tarjeta de ítems, icono + "Elegí un proveedor para empezar a cargar ítems" + subtexto explicando que el IVA, el envío y los descuentos por defecto salen del proveedor.
- [x] 5.3 Deshabilitar el botón "Agregar ítem" mientras `!proveedorId`, con `title` explicativo. No usar `alert`/`confirm`.
- [x] 5.4 Caso borrador restaurado con ítems y sin proveedor: renderizar las filas **visibles con todos los inputs deshabilitados**, bajo un banner ámbar "Elegí un proveedor para seguir editando estos ítems". **No descartar los ítems bajo ninguna circunstancia.** Verificado con Playwright inyectando un borrador viejo (2 ítems, sin proveedor): filas visibles, inputs deshabilitados, banner mostrado.
- [x] 5.5 Verificar explícitamente que, al elegir proveedor sobre un borrador restaurado sin proveedor, el `useEffect` de precarga de defaults (dependiente de `[proveedorId]`) efectivamente corre y precarga IVA/envío/descuentos en las filas restauradas. Comprobado con Playwright: al elegir EXTRA POWER sobre el borrador viejo, IVA/envío/descuentos de ambas filas se pisan con los defaults del proveedor nuevo y los inputs se habilitan. **Guardia reescrita durante esta verificación — ver nota de bug en el bloque de abajo.**
- [x] 5.6 Verificar que el error de validación `proveedorId` sigue funcionando para el caso en que se intente enviar sin proveedor. Verificado con Playwright: "Seleccioná un proveedor" se muestra en rojo bajo el select al enviar sin elegir proveedor.

> **Bug encontrado y corregido durante 5.5/6.1 (no estaba en el alcance planeado, pero bloqueaba la propia verificación del gate):** la guarda `primerRenderProveedor` (`useRef(true)`, consumida una sola vez) se rompe bajo `React.StrictMode` (activo en `main.jsx`) — React invoca el efecto de montaje DOS veces en desarrollo, el ref sobrevive esa doble invocación, la primera consume la guarda y la segunda pasaba de largo y reseteaba IVA/envío/descuentos con `proveedorSeleccionado` todavía `null` (la query `['proveedores']` no había resuelto). Efecto real: **cada F5 con un borrador en curso pisaba IVA/envío/descuentos a blanco**, reproducido con Playwright contra el dev stack antes del fix. Reemplazada por `proveedorIdAnteriorRef` (guarda el `proveedorId` anterior en vez de un flag corrido/no corrido), inmune a StrictMode. Ver `PedidoNuevo.jsx` y la Decisión 7 de `design.md` (addendum).

## 6. No-regresión (obligatorio antes de cerrar)

> El riesgo real de este change no es el cálculo, es romper el borrador o el payload. Ver Riesgos
> en `design.md`.

- [x] 6.1 Verificar el borrador en `localStorage` (`pedido-nuevo-borrador`): cargar proveedor + 2 ítems, recargar la página (F5) y confirmar que vuelve todo — proveedor, cantidades, costos, IVA, envío, descuentos, moneda, cotización, observaciones. Verificado con Playwright contra el dev stack real, incluyendo el caso USD (SHIMURA, cotización 1460, moneda USD) — sólo pasó tras corregir el bug de StrictMode documentado en el grupo 5.
- [x] 6.2 Verificar el debounce de 400 ms y que el borrador **no** guarda estado transitorio de UI (búsqueda abierta, sub-fila expandida, errores, `isSubmitting`). Confirmado por código (no están en las deps del efecto de guardado) y en vivo: una sub-fila auto-expandida antes de un F5 vuelve colapsada después (no persiste).
- [x] 6.3 Verificar que el borrador se limpia al crear el pedido y al cancelar (botón Cancelar, flecha Volver y tecla Escape comparten `handleVolver`). Verificado el botón Cancelar con Playwright (localStorage queda `null`, vuelve al estado vacío del gate); flecha Volver y Escape comparten el mismo handler sin cambios de código.
- [x] 6.4 Verificar que el formato del borrador no cambió: un borrador escrito por la versión anterior se lee sin conversión. Verificado inyectando un borrador con el esquema pre-existente (sin campos nuevos) — se restauró sin errores.
- [x] 6.5 Comparar el payload enviado al backend contra el actual, para línea de **producto existente**: `productoId`, `cantidadPedida`, `costoUnitarioPactado`, `monedaLinea`, `ivaPactadoPorcentaje`, `envioPactadoPorcentaje`, y **sin** `descuentoPactadoPorcentaje`/`descuentoPactadoDetalle`. Confirmado interceptando el POST real con Playwright.
- [x] 6.6 Comparar el payload para línea **pendiente**: `productoNombreNuevo` (sin `productoId`), más `descuentoPactadoPorcentaje` colapsado en cascada y `descuentoPactadoDetalle` con el desglose textual `"Nombre X.XX%; Nombre Y.YY%"`. Confirmado: `descuentoPactadoPorcentaje: 14.35`, `descuentoPactadoDetalle: "desc 1 7.00%; desc 2 7.90%"`.
- [x] 6.7 Verificar que `cotizacionDolar` sólo viaja cuando hay al menos una línea en USD, y `null` si no. Confirmados ambos casos vía payload interceptado (null sin USD, `1460` con línea USD).
- [x] 6.8 Verificar que todas las validaciones por línea siguen disparando: producto sin elegir, cantidad ≤ 0, costo vacío, IVA obligatorio cuando el proveedor no tiene default y no tiene IVA incluido, descuentos sin nombre o con % inválido, cotización faltante con línea USD. Verificado en vivo producto/cantidad/costo/proveedor; IVA-sin-default, descuentos inválidos y cotización-faltante no se retocaron (código sin cambios) — riesgo bajo.
- [x] 6.9 Verificar que **no** se modificó nada de `frontend/src/utils/costeo.js` ni de `backend/`. Confirmado con `git diff`/`git status`: `costeo.js` con 0 líneas de diff; ningún archivo de `backend/` tocado por esta corrida (los cambios de `backend/` presentes en el árbol pertenecen a la sesión paralela `venta-cliente-casual-herramientas`, fuera de este alcance).
- [x] 6.10 Correr `npm run lint` (oxlint) en `frontend/` y dejarlo limpio. **No** correr build sin pedido explícito del usuario. `npx oxlint` limpio para los 6 archivos del alcance; `npm run lint` completo sin advertencias nuevas (las preexistentes son de archivos fuera de este change).
- [x] 6.11 Revisar reglas duras de UI en todo lo nuevo: `cursor-pointer` en cada botón, iconos de `lucide-react`, feedback por `useUIStore`, PascalCase en componentes y nombres de archivo. Revisado: todos los botones nuevos tienen `cursor-pointer`/`cursor-not-allowed`, íconos de `lucide-react` (`Plus`, `ChevronDown`, `ChevronUp`, `PackageSearch`, `AlertTriangle`), sin `alert`/`confirm` nativos, archivos `CeldaDescuentos.jsx`/`PanelDescuentosLinea.jsx` en PascalCase.

## 7. Cierre

- [x] 7.1 Resolver con el usuario la Open Question 1 de `design.md`: ¿se agrega `vitest` al frontend para poder testear `pedidoCosteo.js`? **Resuelto: no** — sin test runner nuevo, verificación manual (queda anotado en Riesgos de `design.md`, no es una omisión).
- [x] 7.2 Confirmar con el usuario la Open Question 2: la cantidad sigue siendo entera (`parseInt`), sin decimales. **Resuelto: sí, sigue entera** — sin cambios.
- [ ] 🔶 **7.3 CHECKPOINT FINAL** — Demo de la pantalla completa al usuario: grilla con varios ítems, gate de proveedor, sub-filas de descuentos, totales correctos arriba y abajo. Recién con su OK, el change queda listo para `/opsx:archive`.

## 8. Ampliación 2026-08-25 — Descuentos editables también para línea existente

> Ver "Ampliación 2026-08-25 (descuentos editables)" al final de `design.md`. Mismo criterio que la reapertura de IVA/envío de esa misma fecha (fuera de OpenSpec en su momento, documentada acá porque toca directamente los componentes del grupo 4), pero ahora también extendida a `backend/` — a diferencia de la corrida anterior de este change, que fue sólo frontend.

- [x] 8.1 Backend — `MovimientoStockService`/`MovimientoStockServiceImpl.registrarMovimiento`: nueva sobrecarga de 11 parámetros con `descuentoPactadoExplicito`/`descuentoPactadoDetalleExplicito`, que reemplaza por completo la cascada de `producto.getDescuentos()` en `aplicarDesglose()` cuando no es null (único factor ya colapsado). La sobrecarga de 9 parámetros delega en la nueva con ambos en `null` — no-op total, mismo comportamiento que antes.
- [x] 8.2 Backend — `ProductoService`/`ProductoServiceImpl.actualizarDescuentosSiDistinto(producto, descuentoPactadoPorcentaje, descuentoPactadoDetalle)`: mismo patrón que `actualizarIvaEnvioSiDistinto` — compara el % pactado contra el % efectivo colapsado actual de la ficha (reusando `CostoCalculator.calcular` para la cascada) y, si son distintos, reemplaza `producto.descuentos` por una única entrada sintética `"Proveedor"`. Sin ratchet: sube o baja. Reemplazo hecho en el lugar (`clear()` + `add()` sobre la colección gestionada por Hibernate, nunca `setDescuentos(List.of(...))` directo) para no romper el `orphanRemoval` de `@OneToMany`.
- [x] 8.3 Backend — `PedidoServiceImpl.confirmarRecepcion()`: llama a `actualizarDescuentosSiDistinto` justo después de `actualizarIvaEnvioSiDistinto`, y pasa `detalle.getDescuentoPactadoPorcentaje()`/`getDescuentoPactadoDetalle()` a `registrarMovimiento` para AMBOS tipos de línea (existente y pendiente-recién-creada) — antes sólo IVA/envío ganaban explícitamente para toda línea, el descuento sólo llegaba indirecto vía `producto.getDescuentos()`.
- [x] 8.4 Backend — confirmado que `PedidoDetalleDTO`/`construirDetalleDesdeDTO` ya no tenían ningún filtro que descartara `descuentoPactadoPorcentaje`/`Detalle` cuando `productoId` está seteado (viajaban sin condición desde antes) — no hizo falta ningún cambio en ese punto.
- [x] 8.5 Frontend — `CeldaDescuentos.jsx`: eliminado el modo `soloLectura` (y el prop `tituloSoloLectura`) — sólo queda la rama editable, para cualquier tipo de línea.
- [x] 8.6 Frontend — `FilaItemPedido.jsx`: `descuentosFuente` deja de depender de `esExistente`/`esPendiente`, siempre `linea.descuentosPactados`; el panel expandible (`PanelDescuentosLinea`) se abre para cualquier línea expandida.
- [x] 8.7 Frontend — `PedidoNuevo.jsx` → `seleccionarProducto`: al elegir un producto existente, precarga `descuentosPactados` con `producto.descuentos` de la ficha (mismo momento que la precarga de IVA/envío ya existente).
- [x] 8.8 Frontend — `PedidoNuevo.jsx` → `validate()`: la validación de la lista de descuentos deja de estar condicionada a línea pendiente, aplica a cualquier línea con `descuentosPactados.length > 0`.
- [x] 8.9 Frontend — `PedidoNuevo.jsx` → `handleSubmit()`: `descuentoPactadoPorcentaje`/`descuentoPactadoDetalle` viajan en el payload para cualquier tipo de línea (antes exclusivo de pendiente).
- [x] 8.10 Frontend — `utils/pedidoCosteo.js` → `porcentajesDescuentoDeLinea`: ya no distingue tipo de línea, siempre lee `linea.descuentosPactados`; se sacó el parámetro `productos`, ya sin uso, y se actualizaron sus dos llamadores (`FilaItemPedido.jsx`, y el interno de `desgloseDeLinea`).
- [x] 8.11 Decisión: "Recargar del proveedor" se deja habilitado también para línea existente (mismo criterio que ya regía para IVA/envío) — pisar los descuentos propios del producto con los defaults del proveedor puede ser justo lo que el usuario quiere si el proveedor cambió condiciones; no se ocultó.
- [x] 8.12 Verificación backend end-to-end contra el dev stack real (Docker, `docker compose build backend` + restart — no había volumen de código fuente montado en el contenedor de `backend/`, a diferencia de `frontend/`, así que hubo que reconstruir la imagen para ejercitar el código nuevo; sin este paso no había forma de probar el backend contra el stack real): pedido a INGCO con línea de producto existente sin descuentos propios (`prueba 2`, id 56) → costo/movimiento con el descuento pactado (10%) correctamente congelado y `producto.descuentos` actualizado a la entrada sintética `"Proveedor 10.00%"`. Segundo pedido con el mismo pactado (10%, igual al ya vigente) → confirmado no-op, la ficha no cambia. Tercer pedido con pactado menor (3%) → confirmado que baja sin ratchet. Cuarto pedido de regresión (línea pendiente con descuentos en cascada, `14.35%` = `7% + 7.9%`) → producto nuevo creado igual que antes de este cambio, sin regresión. Todos los datos de prueba (4 pedidos, sus detalles, movimientos, capas de costo, y el producto de prueba nuevo) fueron borrados al terminar y `producto 56` fue restaurado a su estado original (`stock`, `costo_producto`, `precio`, `iva_porcentaje`, `descuentos` — verificado por consulta SQL directa antes/después).
- [x] 8.13 Verificación frontend: `npx oxlint` limpio para los 5 archivos de este alcance (`CeldaDescuentos.jsx`, `FilaItemPedido.jsx`, `PanelDescuentosLinea.jsx`, `PedidoNuevo.jsx`, `pedidoCosteo.js`) y `npm run lint` completo sin advertencias nuevas (las preexistentes son de archivos fuera de este change). **No verificado con navegador real** (interacción de clic/expansión de la celda en vivo): este entorno de ejecución no tuvo herramienta de automatización de navegador disponible — la corrección del comportamiento de UI se validó por revisión de código (misma rama de render que ya usaba la línea pendiente, ejercitada y verificada en corridas anteriores de este change) y por el payload real verificado en el punto 8.12 (que es exactamente lo que la UI arma y envía).
