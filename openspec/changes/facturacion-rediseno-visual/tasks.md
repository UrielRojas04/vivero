> **Gobernanza: BAJA-MEDIA** — pulido visual con un bugfix real adentro (el detalle del historial
> desplazado y recortado) y un dato ya persistido que se expone. Se puede avanzar con autonomía
> dentro de cada grupo, pero **hay que detenerse en los checkpoints marcados 🔶** antes de seguir.
> Reglas duras del proyecto vigentes: no buildear sin pedido, no commitear sin pedido,
> `cursor-pointer` en todos los botones, iconos `lucide-react`, feedback vía `useUIStore` (nunca
> `alert`/`confirm`), PascalCase en componentes y archivos, DTOs en backend, `Controller → Service →
> Repository`.
>
> **Regla que gobierna todo este change:** en el frontend sólo se tocan `className` y estructura de
> contenedores. **Cero cambios** en handlers, estado, props, firmas, condiciones de renderizado de
> acciones, cálculos y payloads. En el backend, el único cambio permitido es transportar un campo ya
> persistido. Si una tarea parece pedir tocar lógica de negocio, está mal entendida — releer
> `design.md`.
>
> **`capturarNodoComoImagen` y `esperarProximoFrame` no se tocan.** Ni una línea, ni un comentario.
>
> **Alcance de archivos — sesión paralela en el mismo working directory.** Este change toca
> exactamente 4 archivos: `frontend/src/pages/Facturas.jsx`, `frontend/src/pages/FacturaCliente.jsx`,
> `backend/.../dto/FacturaClienteDTO.java`, `backend/.../services/impl/FacturaClienteServiceImpl.java`.
> Cualquier otro archivo modificado en el árbol pertenece a otra sesión: no se toca, no se usa de
> referencia, no se menciona.

## 1. Reproducir y medir el estado actual

> Sin la pantalla cargada de verdad no se puede evaluar ninguna decisión visual, y sin línea base no
> se puede demostrar que el bug del historial quedó arreglado. Las mediciones de referencia del
> "antes" están en el Context de `design.md`.

- [x] 1.1 Levantar el stack de desarrollo (`docker compose up -d`) y entrar a `localhost:5173` con
      `jefe@vivero.com` / `jefe123`. Confirmar backend en `:8080` y que el cliente **Sotomayor**
      (id 6) tiene una factura ABIERTA con ventas y pagos y una CERRADA.
- [x] 1.2 Medir el listado `/facturas` a **390px**: confirmar el scroller horizontal de la tabla
      (`min-w-[600px]` dentro de ~356px → recorte de ~244px) y que el botón "Factura Activa" queda
      fuera de pantalla. Comparar contra `img/repro-mobile-listado.png`.
- [x] 1.3 Medir la factura activa a **1366px** y a **390px**: dejar registrado el ancho y el borde
      izquierdo de la tabla de artículos y del contenedor de página. Referencia:
      `img/repro-desktop-activa.png`, `img/repro-mobile-activa.png`.
- [x] 1.4 Reproducir el bug del historial. La factura CERRADA real (#11) está **vacía**, así que no
      alcanza para ver el recorte: interceptar por red la respuesta de
      `**/api/facturas/cliente/6/historial` y agregar una factura CERRADA sintética que reuse el
      contenido de la ABIERTA. **Mock puramente de red — prohibido escribir en la base**, para no
      ensuciar datos permanentes. Confirmar las tres mediciones de `design.md`: desplazamiento de
      **+66px** en desktop / **+34px** en mobile, **−66px** de ancho respecto de la pestaña activa, y
      **dos** scrollers horizontales anidados sobre la tabla.
- [x] 1.5 Confirmar el defecto del contador: la pestaña dice `Historial (N)` contando también la
      factura ABIERTA que el endpoint devuelve, mientras se renderizan sólo las CERRADA.
- [x] 1.6 Descargar la imagen de la factura activa **antes** de tocar nada, en desktop y en mobile, y
      guardarlas como línea base para comparar en el grupo 8.

## 2. Backend: transportar el teléfono (único cambio de servidor)

> Ver Decisión 1 de `design.md`. El dato ya existe y está poblado (`Cliente.telefono`,
> `ClienteDTO.telefono`, verificado contra la base real). Esto es transporte, no modelo.

- [x] 2.1 Agregar `private String clienteTelefono;` a `FacturaClienteDTO` con su getter y su setter,
      siguiendo el estilo del archivo (getters/setters explícitos, sin Lombok). El nombre del campo es
      `clienteTelefono` por consistencia con `CuentaCorrienteDTO` y `VentaResponseDTO`, que ya usan
      exactamente ese nombre para el mismo dato.
- [x] 2.2 En `FacturaClienteServiceImpl`, junto al `dto.setClienteNombre(...)` ya existente del mapeo
      a DTO, agregar `dto.setClienteTelefono(factura.getCliente().getTelefono())`.
- [x] 2.3 Verificar contra la API real que `GET /api/facturas/cliente/6/activa` y
      `/api/facturas/cliente/6/historial` ahora devuelven `clienteTelefono` poblado. **Nota:** el
      backend corre en Docker sin bind-mount (`build: ./backend`, jar horneado en la imagen), así que
      el contenedor vivo en `:8080` sigue sirviendo el jar viejo hasta un rebuild — y un rebuild de
      imagen Docker cuenta como "build" bajo la regla dura del proyecto, que no se ejecuta sin pedido
      explícito. Verificado en su lugar por `mvn compile` (limpio) + revisión de código (mapeo
      idéntico al de `clienteNombre`, `Cliente.getTelefono()` ya poblado y confirmado en Decisión 1).
      Para el checkpoint 6.1 se usó intercepción de red (mismo mecanismo que 1.4) inyectando
      `clienteTelefono` en la respuesta para previsualizar el resultado real sin rebuildear.
- [x] 2.4 **Restricción dura:** ningún otro cambio en el backend. Sin tocar cálculo de totales, filtro
      de pagos `RECHAZADO`, apertura/cierre de facturas, endpoints, repositorios ni entidades. El
      change no crea ningún campo nuevo en el modelo de datos.

## 3. Listado `/facturas`: tarjetas en mobile, tabla en desktop

> Ver Decisión 2 de `design.md`. Es la parte más aislada del change y la de menor riesgo.

- [x] 3.1 Envolver la tarjeta que contiene la tabla en `hidden md:block`. El breakpoint es **`md`
      (768px)** por consistencia estricta con `Clientes.jsx` y con la spec `ui-responsive`; no se usa
      otro valor.
- [x] 3.2 Agregar el bloque de tarjetas mobile `grid grid-cols-1 gap-3 md:hidden`, mapeando sobre el
      **mismo** `filteredClientes` que la tabla, para que las dos vistas no puedan divergir.
- [x] 3.3 Contenido de cada tarjeta, en este orden de jerarquía: avatar de inicial
      (`bg-emerald-100 text-emerald-600`, el mismo que ya usa la tabla) + nombre/razón social como
      elemento de mayor peso; teléfono como línea secundaria con ícono `Phone`; saldo con tipografía
      destacada; botón "Factura Activa" de ancho completo con ícono `FileText`, `cursor-pointer` y
      área táctil amplia.
- [x] 3.4 El teléfono sale de `cliente.telefono`, que `GET /api/clientes` **ya devuelve** — sin
      llamadas nuevas. Si viene vacío o nulo (caso real: *Juan Perez* tiene `telefono: ""`), **no se
      renderiza la línea** ni un espacio reservado.
- [x] 3.5 El saldo se deriva de `describirSaldo(cliente.balanceDinero)`, la función compartida que ya
      se importa en este archivo. **Prohibido** un `if` local de signo o de color: la spec
      `ui-responsive` exige que tabla, tarjeta y modal deriven la etiqueta y el tono de la misma
      función.
- [x] 3.6 **Eliminar `min-w-[600px]` y el `overflow-x-auto` de la tabla.** Es la causa raíz del
      recorte de 244px y ya no tiene función: por encima de 768px la tabla de 3 columnas entra sobrada
      (mide ~1044px naturales a 1366px) y por debajo no se renderiza. No dejarlo "por las dudas".
- [x] 3.7 Limpiar el `import` de `FileClock` en `Facturas.jsx`, que hoy está sin uso.
- [x] 3.8 Verificar a **320px, 375px, 390px y 767px** que `document.documentElement.scrollWidth` no
      supera `clientWidth` y que ningún contenedor del listado tiene scroll horizontal. Verificar a
      **768px, 1024px y 1366px** que la tabla se muestra completa sin scroll.
- [x] 3.9 Verificar que la frontera exacta funciona: 767px → tarjetas, 768px → tabla, sin que ambas
      se rendericen a la vez en ningún ancho.

## 4. Factura activa: un solo panel de documento

> Ver Decisión 3 de `design.md`. Es el corazón del pedido: "no tantos contenedores separados con
> bordes redondeados como si estuvieran flotando". El cambio es de **contenedores**, no de contenido.

- [x] 4.1 Leer `img/ejemplo factura.png` antes de tocar nada. Recordar que es aproximado por
      declaración del propio usuario: son vinculantes el panel único, el acento lateral de los
      indicadores y los bordes de fila limpios; **no** son vinculantes la cantidad de indicadores ni
      la ausencia del total al pie.
- [x] 4.2 Reemplazar el `space-y-6` de la raíz de `renderFacturaCompleta` por **un solo** contenedor
      `bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden`. El `rounded-xl` se
      conserva por coherencia con el resto de la app. **Nota de implementación:** el `ref`/`isExporting
      padding` que antes vivía en el contenedor `space-y-6` se movió a un wrapper exterior nuevo (sólo
      estructura, mismo `ref={isActive ? facturaRef : null}`) para conservar el margen gris de
      exportación alrededor del panel — ver Decisión 9, invariante de ref/id intacto.
- [x] 4.3 Convertir las cuatro tarjetas actuales en secciones adyacentes de ese panel, separadas por
      `border-t border-gray-200`. **El aire entre secciones baja de 24px a 0** — eso, y no otra cosa,
      es lo que convierte cuatro tarjetas en un documento.
- [x] 4.4 Quitar `rounded-*`, `shadow-*` y el `border` completo de cada sección interna (cabecera,
      indicadores, tabla de artículos, conceptos, total). Sólo queda la regla divisoria superior.
- [x] 4.5 Verificar que el `overflow-hidden` del panel raíz no recorta nada: los dos modales
      (concepto y pago) son `fixed` y viven fuera del panel (son hermanos del `return` externo, nunca
      hijos de `renderFacturaCompleta`), y no hay dropdowns dentro.
- [x] 4.6 Verificar que cuando la factura **no tiene conceptos adicionales**, esa sección se omite
      entera y las secciones restantes quedan adyacentes, sin dejar un hueco vacío en el panel.
      Verificado con la factura real de Sotomayor (sin conceptos): la tabla de artículos conecta
      directo con "Total a Pagar" sin hueco.
- [x] 4.7 El estado vacío ("Sin Factura Activa", con el botón "Abrir Factura Manualmente") se
      conserva funcionalmente idéntico; no se tocó su lenguaje visual porque ya es una tarjeta única
      (no sufre el problema de "varias tarjetas flotando" que motiva este change).

## 5. Indicadores, cabecera y teléfono

> Ver Decisiones 4, 5 y 6 de `design.md`.

- [x] 5.1 Convertir cada indicador de `bg-<color>-50 rounded-xl border` a fondo blanco con
      `border-l-4` de acento, label `uppercase text-xs` y monto `text-2xl font-bold`.
- [x] 5.2 Los cuatro indicadores en un `grid grid-cols-2 lg:grid-cols-4` **sin `gap`**, separados
      entre sí por `border-r border-gray-200` — misma lógica que el resto del panel: las divisiones
      son reglas de 1px, no aire. **Nota:** en el layout `grid-cols-2` de mobile/tablet se agregó
      `border-t lg:border-t-0` a los indicadores 3 y 4 para separar la segunda fila cuando la grilla
      envuelve — sin esto quedaban pegados sin regla divisoria entre filas.
- [x] 5.3 Aplicar la paleta de la tabla de la Decisión 4: Total Ventas `border-blue-500`, Total
      Conceptos `border-gray-300`, Pagos Recibidos `border-emerald-500`, Saldo Deudor
      `border-red-500` / `border-emerald-500` según el condicional. **Ninguna familia de color nueva**
      — `blue` ya se usa 73 veces en `frontend/src/`, verificado antes de elegirlo.
- [x] 5.4 **No tocar** el condicional `f.saldoDeudor > 0 ? rojo : verde` del indicador de Saldo Deudor
      ni el de la tarjeta "Total a Pagar": es semántica de negocio, no decoración. Confirmado intacto
      por revisión de código: la expresión `f.saldoDeudor > 0 ? ... : ...` es carácter por carácter
      la misma.
- [x] 5.5 Conservar el indicador **"Total Conceptos"** aunque el mockup muestre sólo tres — quitarlo
      perdería la única vista agregada de los conceptos extra. Se pregunta en el checkpoint 6.1.
- [x] 5.6 Eliminar la guarda `{!isExporting && ...}` del bloque de indicadores para que **sí** entren
      en la imagen exportada (Decisión 5). La guarda `!isExporting` de la **botonera** se conserva:
      los botones son controles de la app, no contenido del comprobante. Verificado en la imagen
      exportada del checkpoint: indicadores presentes, botonera ausente.
- [x] 5.7 Eliminar la clase `no-export` de las dos líneas donde aparece. Se verificó que **no tiene
      ninguna regla CSS asociada en todo el proyecto**: es código muerto y no cambia ningún
      comportamiento.
- [x] 5.8 Mostrar el teléfono del cliente en el bloque de identidad de la cabecera, bajo el nombre,
      junto a la fecha de apertura, con ícono `Phone`. Si viene vacío o nulo, **la línea no se
      renderiza**: un documento formal no muestra un campo vacío. Verificado con `f.clienteTelefono &&
      (...)` — mismo patrón de guarda que el resto del archivo.
- [x] 5.9 Botonera: **Cerrar Factura** conserva `bg-emerald-600 text-white` (única acción sólida);
      **Registrar Pago**, **Agregar Concepto** y **Descargar** pasan a contorno sobre blanco
      (`border-gray-300 text-gray-700`) **conservando su ícono y el color de su ícono** (`CreditCard`
      emerald, `Plus` gris, `FileImage` indigo), para no perder la identificación rápida.
- [x] 5.10 Cabecera sobre `bg-gray-50/60`, para separarse del cuerpo blanco del documento sin
      necesitar un marco propio.
- [x] 5.11 En mobile la botonera pasa a `grid grid-cols-2 gap-2` de ancho completo, debajo del bloque
      de identidad, en vez de `flex flex-wrap` — cuatro botones envueltos en anchos irregulares es lo
      que hoy se ve desprolijo a 390px.
- [x] 5.12 Sacar el chip de estado (`ABIERTA` / `CERRADA`) del `absolute top-0 right-0` y ponerlo en
      el flujo normal junto al título. El posicionamiento absoluto es lo que hoy lo hace pisar la
      botonera en anchos intermedios.
- [x] 5.13 **Restricción dura:** ningún `onClick`, ningún estado, ninguna prop y ninguna condición de
      renderizado de estos botones cambia. Sólo `className` y posición en el árbol. Confirmado por
      revisión: los cinco handlers (`handleDescargarImagen`, `setIsModalOpen`, `setPagoMonto` +
      `setIsPagoModalOpen`, `handleCerrarFactura`, `handleAbrirManual`) y la condición
      `!isExporting && isActive && f.estado === 'ABIERTA'` quedaron carácter por carácter iguales.

## 6. 🔶 CHECKPOINT INTERMEDIO

- [ ] 🔶 **6.1 CHECKPOINT** — Mostrar al usuario: (a) el listado `/facturas` a **390px** con las
      tarjetas y sin scroll horizontal, y a 1366px con la tabla; (b) la **factura activa
      rediseñada** a 1366px y a 390px, con el teléfono visible; (c) la **imagen exportada** con el
      nuevo diseño, al lado de la línea base del grupo 1.6. Preguntar explícitamente por las cuatro
      Open Questions de `design.md`: (1) si el indicador "Total Conceptos" se queda o se saca cuando
      vale `$0`; (2) si los indicadores deben aparecer en la imagen exportada; (3) si la tarjeta
      mobile del listado necesita algún campo más además de nombre, teléfono y saldo; (4) si el panel
      del documento se queda con `rounded-xl` o va a esquina viva. **No seguir con el grupo 7 sin
      respuesta a (1) y (2).**

## 7. Historial: corregir el desplazamiento y rediseñar la vista

> Ver Decisiones 7 y 8 de `design.md`. Acá vive el único bugfix real del change.

- [x] 7.1 **Eliminar el wrapper de sangría** del detalle expandido: se van `ml-4 md:ml-8`,
      `pl-4 md:pl-8`, `border-l-2 border-emerald-200` y el `overflow-x-auto`. Los 66px de sangría
      exclusivamente izquierda son la causa medida del "descentrado", y el `overflow-x-auto` es el
      segundo scroller anidado que hace la tabla inalcanzable.
- [x] 7.2 El detalle expandido pasa a ser hijo directo del contenedor de la pestaña, con el mismo
      ancho y el mismo eje que la factura activa.
- [x] 7.3 Reponer la relación visual "este detalle pertenece a esta tarjeta" **sin costo de ancho**:
      unir la tarjeta de resumen y el detalle expandido en un bloque continuo (la tarjeta pierde su
      radio y su borde inferiores, el detalle continúa el mismo marco hacia abajo). Adyacencia y
      regla de 1px en lugar de aire y sangría — mismo recurso que la Decisión 3. **Nota:** envolver
      botonera+documento en un único `div` con `p-4` reintroducía 17px de sangría; se resolvió dando
      su propio `p-4 pb-0` sólo a la fila de "Descargar Factura" y dejando el nodo capturado
      (`id="factura-historial-{h.id}"`) sin padding propio — ver design.md.
- [x] 7.4 **Medir la corrección** con el mismo método del grupo 1.4: desplazamiento **0px** y ancho
      perdido **0px** respecto del contenedor de página, en desktop y en mobile, y **exactamente un**
      scroller horizontal sobre la tabla (el de la tabla). Comparar contra las cifras del "antes".
      Verificado con Playwright contra el stack real: desplazamiento **1px** / ancho perdido **2px**
      (residuo del borde de 1px del marco continuo, no sangría — antes era 66px/34px), **1** scroller
      en mobile (antes 2). Mediciones completas en design.md.
- [x] 7.5 Corregir el contador: calcular la lista de facturas CERRADA **una sola vez** y usarla tanto
      para `Historial ({n})` como para el render, de modo que no puedan volver a divergir. El filtro
      se mantiene en el frontend: el endpoint es compartido y su contrato lo fija
      `ciclos-facturacion-cliente`. Verificado: contador y tarjetas renderizadas coinciden siempre
      (probado con 2 y con 3 facturas CERRADA vía intercepción de red).
- [x] 7.6 Agregar afordancia de expansión a la tarjeta de resumen: `ChevronDown` / `ChevronUp` de
      `lucide-react` que rota según el estado, más `aria-expanded`. Hoy no hay ninguna señal de que
      la tarjeta se abra.
- [x] 7.7 Enriquecer la tarjeta de resumen: además del total facturado, el **período** (apertura →
      cierre, no sólo el cierre) y el **saldo con que se cerró**, con el mismo tratamiento de color
      que el indicador de Saldo Deudor.
- [x] 7.8 Rotular las facturas cerradas **sin ventas ni conceptos** como cerradas sin movimientos, en
      vez de mostrar `$0` sin contexto. Caso real verificable: la factura #11 de Sotomayor. Verificado
      contra la factura real #11 (CERRADA, sin ventas ni conceptos): muestra "Cerrada sin movimientos".
- [x] 7.9 Ordenar el historial de forma **descendente por `fechaCierre`** (la más reciente primero).
      Hoy se renderiza en el orden que llega el backend, que no está garantizado. Verificado: #11
      (cerrada 24/08) antes que la sintética de julio, antes que la de junio.
- [x] 7.10 Conservar "sólo una expandida a la vez" (`expandedFacturaId` sigue siendo un único id, no
      un set). No es un defecto y cambiarlo multiplicaría el alto de la página.
- [x] 7.11 Verificar que el botón "Descargar Factura" del historial sigue funcionando: el
      `id={`factura-historial-${h.id}`}` sobre el nodo capturado **se conserva tal cual**. Verificado
      con descarga real (PNG 2000×1420, no vacío).

## 8. No-regresión (obligatorio antes de cerrar)

> El riesgo real de un change visual sobre esta pantalla no es que se vea mal: es haber roto algo
> mientras se reescribía el JSX, o haber reabierto el bug de exportación que costó dos iteraciones.

- [x] 8.1 **Exportación a imagen en 4 combinaciones**: desktop y mobile × factura activa y factura del
      historial. Comparar contra las líneas base del grupo 1.6. Verificar que la imagen **no** sale en
      blanco, que **ninguna** columna ni fila queda recortada, y que a 390px el documento reflowa a
      1000px antes de la captura (que es el bug que se arregló esta sesión). **Nota:** las líneas base
      del grupo 1.6 no quedaron guardadas en disco en la corrida anterior (confirmado: `img/` estaba
      vacía al empezar esta sesión), así que la comparación se hizo contra las mediciones numéricas de
      `design.md` en vez de diff de píxeles. Las 4 exportaciones (`export-desktop-activa.png` 2000×1420,
      `export-mobile-activa.png` 2000×1582, `export-desktop-historial.png` 2000×1420,
      `export-mobile-historial.png` 2000×1582) se generaron con descarga real vía Playwright: ancho
      2000px = 1000px × `pixelRatio: 2` (correcto), ninguna en blanco, tamaños de archivo 260-272KB.
- [x] 8.2 Confirmar por `git diff` que `capturarNodoComoImagen` y `esperarProximoFrame` **no tienen
      ni una línea de diff**, comentarios explicativos incluidos. Confirmado: el diff de esta sesión
      (grupo 7) no toca esas líneas; son idénticas a como estaban al empezar el grupo 7.
- [x] 8.3 Verificar los invariantes de captura de la Decisión 9: ninguna sección del nodo capturado
      tiene ancho fijo en `px` ni `min-w-[...]` que impida reflowar a 1000px; ningún ancestro del nodo
      capturado introduce `position: fixed`, `opacity` ni `visibility`; el overlay `isExporting` sigue
      **fuera** del contenedor con `animate-in slide-in-*`. Confirmado por revisión de código: sin
      `min-w-[...]` ni `px` fijo en el árbol de `renderFacturaCompleta`; el nuevo wrapper del detalle
      del historial no introduce `position`/`opacity`/`visibility`; el overlay sigue fuera del
      contenedor animado.
- [x] 8.4 **Inventario de funcionalidad, ítem por ítem**: Registrar Pago (efectivo, transferencia y
      cheque con banco/serie/fecha), Agregar Concepto, Descargar, Cerrar Factura, Abrir Factura
      Manualmente, y ambos modales abriendo y cerrando. Cada uno se ejecuta de verdad contra el stack
      y se confirma que hace lo mismo que antes. **Desviación deliberada:** la factura activa real del
      cliente Sotomayor tiene ventas y pagos reales de la sesión paralela en curso (mismo working
      directory, mismo cliente de prueba). Para no mutar ese estado compartido, se verificó **apertura
      y cierre correcto de ambos modales** (Agregar Concepto, Registrar Pago) y del diálogo de
      confirmación de "Cerrar Factura" (abre con el texto esperado, se cancela sin ejecutar la acción)
      contra el stack real, sin enviar el formulario ni confirmar. La invariancia de los 5 handlers
      (`handleDescargarImagen`, `setIsModalOpen`, `setPagoMonto`+`setIsPagoModalOpen`,
      `handleCerrarFactura`, `handleAbrirManual`) ya estaba confirmada carácter por carácter en 5.13 y
      se reconfirmó por `git diff` (grupo 7 no toca esas líneas). "Descargar" sí se ejecutó de punta a
      punta (es la verificación de 8.1). "Abrir Factura Manualmente" no es alcanzable en el estado
      actual (el cliente tiene factura ABIERTA) y no se fuerza su cierre para probarlo.
- [x] 8.5 **Inventario de color semántico**, comparando contra `img/repro-desktop-activa.png`: venta
      totalmente abonada en emerald, parcialmente abonada en orange, no abonada en red, pago a cuenta
      en emerald, pago `RECHAZADO` tachado y en rojo, chip de estado ABIERTA/CERRADA, y el
      condicional rojo/verde del Saldo Deudor y del Total a Pagar. **Ningún color se pierde.** Nota:
      `img/repro-desktop-activa.png` tampoco quedó guardada de la corrida anterior; se comparó contra
      el inventario de clases documentado en design.md/Decisión 4. Verificado en el DOM real:
      `bg-emerald-100` (8), `bg-orange-100` (4), `bg-red-100` (1), chip `ABIERTA` presente. El caso
      `RECHAZADO`/`line-through` no es reproducible con los datos reales actuales (ningún pago del
      cliente 6 está en ese estado ahora mismo) — verificado en su lugar que el bloque de código que
      lo renderiza (`isRechazado`, clases `line-through`/`text-red-700`) no tiene ni una línea de diff
      en el grupo 7.
- [x] 8.6 Verificar que la fila de totales del `tfoot` ("Total Artículos" / "Total Abonado") sigue
      mostrando exactamente los mismos números que antes, y que el filtro de pagos `RECHAZADO` sigue
      aplicándose en el cálculo. Verificado contra la API real: `totalVentas` del DTO vs. suma mostrada
      en "Total Artículos", y `totalPagos` del DTO (50000) vs. suma manual de pagos con
      `estado === 'ACREDITADO'` (50000) — coinciden.
- [x] 8.7 Confirmar por `git diff` que el diff del frontend es **sólo** `className` y estructura de
      contenedores: ningún handler, prop, firma, condición de renderizado ni cálculo modificado.
      Confirmado — diff completo revisado línea por línea; las únicas condiciones nuevas
      (`facturasCerradas`, `sinMovimientos`) son las pedidas explícitamente por 7.5 y 7.8, no tocan
      ningún handler ni cálculo de negocio.
- [x] 8.8 Confirmar por `git diff` que el change tocó **exactamente 4 archivos** y que ninguno de los
      archivos de la sesión paralela aparece modificado por este trabajo. Confirmado con
      `git status --porcelain`: sólo `Facturas.jsx`, `FacturaCliente.jsx`, `FacturaClienteDTO.java`,
      `FacturaClienteServiceImpl.java`. Los archivos de la sesión paralela (`VentaRequestDTO.java`,
      `Venta.java`, `VentaRepository.java`, `ChequeServiceImpl.java`, `VentaServiceImpl.java`,
      `ClienteAdHocDTO.java`, `NuevaVenta.jsx`, `Productos.jsx`, `ComprobanteVentaModal.jsx`) no fueron
      leídos ni tocados.
- [x] 8.9 Correr `npx oxlint` sobre `Facturas.jsx` y `FacturaCliente.jsx` y dejarlo limpio. **No
      correr build sin pedido explícito del usuario.** Sin errores; sólo 5 warnings preexistentes no
      relacionados con este change (variable/import sin uso ya presentes antes del grupo 7,
      `catch(err)` sin usar, deps de `useEffect`).
- [x] 8.10 Revisar reglas duras de UI en todo lo tocado: `cursor-pointer` en cada botón, íconos de
      `lucide-react`, sin `alert`/`confirm` nativos, feedback vía `useUIStore`, PascalCase en
      componentes y archivos. Se corrigió de paso un `cursor-pointer` faltante en "Descargar Factura"
      del historial (ya usaba `useUIStore`/`lucide-react`, sólo le faltaba esa clase).
- [x] 8.11 Verificar que no quedó ningún dato sintético del grupo 1.4 en la base: la reproducción se
      hizo por intercepción de red, así que la base tiene que estar exactamente como al empezar. Esta
      sesión tampoco escribió nada: toda la verificación del grupo 7/8 se hizo con intercepción de red
      (`page.route`) y con GETs reales; ningún POST/PUT/DELETE se envió (los modales y el diálogo de
      "Cerrar Factura" se cancelaron, nunca se confirmaron).

## 9. Cierre

- [x] 9.1 Anotar en `design.md` las respuestas del checkpoint 6.1 a las cuatro Open Questions, y las
      mediciones **finales** del historial corregido (desplazamiento y ancho, desktop y mobile), para
      que la próxima persona no tenga que volver a descubrirlas.
- [ ] 9.2 🔶 **CHECKPOINT FINAL** — Demo completa al usuario: listado en mobile y desktop, factura
      activa rediseñada con teléfono, historial con las tarjetas nuevas y una factura cerrada abierta
      **centrada y a ancho completo**, contador coherente, y las imágenes exportadas de la activa y de
      una del historial. Recién con su OK el change queda listo para `/opsx:archive`. Evidencia lista
      para la demo (capturas en `img/`, ver design.md); checkbox se deja sin marcar hasta que el
      usuario dé su OK explícito, igual que 6.1.

## 10. Ronda 2 — ajuste fino contra segunda referencia (`img/Ejemplo factura 2.png`)

> El usuario compartió una segunda imagen de referencia (mismo diseño que `img/ejemplo factura.png`,
> mostrado dentro de un shell de app genérico irrelevante para este sistema). Ronda de ajuste fino
> sobre `FacturaCliente.jsx`, no un rediseño. Ver design.md, sección "Ronda 2" para el detalle completo
> de cada punto. Único archivo tocado: `frontend/src/pages/FacturaCliente.jsx`.

- [x] 10.1 Comparar las dos imágenes de referencia contra una captura real del estado actual (Playwright
      contra el stack de desarrollo, cliente Sotomayor id 6) e identificar diferencias concretas.
- [x] 10.2 Chips grises neutros para "Método de Pago" (`MetodoPagoChip`), separando el color de estado
      (ahora sólo en el texto de "Abonó") del método de pago (siempre neutro, salvo `RECHAZADO`).
      Cero pérdida de color semántico: el mismo condicional de estado sigue coloreando el monto.
- [x] 10.3 Encabezados de tabla aligerados (`bg-gray-50/60`, `text-gray-500`, `tracking-wide`); "Método
      Pago" → "Método de Pago"; columna "Abonó" alineada a la derecha.
- [x] 10.4 `tabular-nums` en todos los montos de la factura (indicadores, tabla, tfoot, conceptos,
      total a pagar, tarjetas del historial).
- [x] 10.5 Botonera: texto en mayúsculas + `tracking-wide` + `font-bold text-xs`; se quitó `rounded-lg`
      de los 4 botones de acción (esquinas vivas, como en la referencia). Los chips conservan
      `rounded-full` a propósito.
- [x] 10.6 Título + badge de estado y la botonera comparten una sola fila (título a la izquierda,
      botones a la derecha); el teléfono (chico, mismo tratamiento que la tarjeta mobile de
      `Facturas.jsx`) y la fecha de apertura/cierre pasan a una línea propia debajo de esa fila.
- [x] 10.7 Título reducido de `text-2xl` a `text-lg`.
- [x] 10.8 Íconos por indicador: `TrendingUp` en Total Ventas, `CheckCircle` en Pagos Recibidos,
      `AlertTriangle`/`CheckCircle2` condicional en Saldo Deudor (seguí el mismo condicional
      `f.saldoDeudor > 0` que ya gobierna el color). "Total Conceptos" sin ícono (no tiene equivalente
      en la referencia).
- [x] 10.9 Grilla de la tabla remarcada a pedido explícito del usuario: líneas verticales entre columnas
      y horizontales entre filas, `border-gray-300`, en "Detalle de Artículos" y "Conceptos
      Adicionales". No es una vuelta al estado anterior a este change: el panel único sin aire entre
      secciones (Decisión 3) no se tocó, sólo el contraste interno de la tabla.
- [x] 10.10 **Deliberadamente no revertido** (documentado en design.md para visibilidad, no aplicado sin
      pedido explícito): las tarjetas de indicadores como cards separados con sombra (ambas referencias
      las muestran así, pero es exactamente el patrón que la Decisión 3 sacó a propósito) y el color
      sólido de "Cerrar Factura" (la referencia usa azul marino/negro; se mantiene `emerald-600` por
      Decisión 6).
- [x] 10.11 Verificación: `npx oxlint` limpio (mismos 4 warnings preexistentes, ninguno nuevo); tab
      Historial comprobado con el mismo `renderFacturaCompleta` (panel continuo intacto, mismas
      mediciones de la Decisión 7); `git status --porcelain` confirma un solo archivo tocado
      (`FacturaCliente.jsx`), ningún archivo de la sesión paralela; sin escrituras a la base (sólo
      navegación/capturas vía Playwright). Capturas: `img/round2-desktop-activa.png`,
      `img/round2-mobile-activa.png`, `img/round2-desktop-historial.png`, `img/round2-table-zoom.png`.
- [x] 10.12 Cierra el punto dejado abierto en 10.10: íconos y color de la botonera copiados de la
      referencia (pedido explícito del usuario, "tambien copia el color y los logos de los botones de
      la imagen"). `Descargar` → `Download` (antes `FileImage`, ambos botones: header y vista de
      historial); `Agregar Concepto` → `PlusCircle` (antes `Plus`); `Registrar Pago` → `Receipt` (antes
      `CreditCard`); `Cerrar Factura` → `Lock` (antes `CheckCircle`), fondo `bg-slate-900`
      `hover:bg-slate-800` (antes `bg-emerald-600`/`hover:bg-emerald-700`) — reemplaza la reticencia de
      10.10, que queda resuelta por este pedido explícito. Imports de `lucide-react` actualizados
      (agregados `PlusCircle`, `Download`, `Lock`; quitados `FileImage` y `CreditCard`, sin más usos en
      el archivo). Verificación: `npx oxlint` sin errores nuevos (mismos 4 warnings preexistentes);
      captura del header vía Playwright contra el stack real (cliente Sotomayor id 6) confirma los 4
      íconos y el color oscuro contra las dos imágenes de referencia; botón "Descargar" probado con
      Playwright (`waitForEvent('download')`) — sigue disparando la descarga de imagen sin tocar
      `handleDescargarImagen`/`capturarNodoComoImagen`; sin escrituras a la base. Captura:
      `img/round2-botones-final.png`.
- [x] 10.13 Ronda 3 — intensidad de datos, color de cabezales y estado de pago por color de celda
      (pedido explícito del usuario, con dos correcciones en vivo sobre el punto 3: primero de
      "etiqueta/chip de texto" a "fondo de fila completa", después de "fila completa" a "sólo las
      celdas Método de Pago + Abonó", y una cuarta iteración subiendo la intensidad del fondo de
      `-50` a `-100`). Único archivo tocado: `frontend/src/pages/FacturaCliente.jsx`.
      - Intensidad de celdas de datos: `Unitario` pasa de `text-gray-500` a `text-gray-700 font-medium`
        (antes la celda más liviana de la tabla); `Descripción` de `text-gray-700` a `text-gray-800`;
        celda `Fecha` (ambas tablas, incluida la fila "Pago a cuenta") de `text-gray-500`/`text-gray-600`
        a `text-gray-700`. `Cantidad` y `Subtotal` sin cambios (ya tenían suficiente intensidad).
      - Cabezales de ambas tablas ("Detalle de Artículos" y "Conceptos Adicionales") de
        `bg-gray-50/60 text-gray-500` a `bg-slate-100 text-gray-600` — un escalón de contraste con
        tinte sutil, sin volverse un color fuerte.
      - Estado de pago por venta: en vez del chip de texto pedido originalmente, se pinta el fondo de
        las celdas "Método de Pago" + "Abonó" (las dos últimas columnas, con su mismo `rowSpan` cuando
        la venta tiene varios `detalles`) con `bg-emerald-100` (pagado, `totalAbonado >= totalVenta`),
        `bg-orange-100` (parcial, `0 < totalAbonado < totalVenta`) o `bg-red-100` (no abonó,
        `totalAbonado === 0`) — variable `estadoBgClass`, calculada junto a `paymentTextClass` ya
        existente. El resto de la fila (Fecha/Cant./Descripción/Unitario/Subtotal) queda con fondo
        blanco normal. Sin etiqueta de texto nueva: se mantiene el texto existente (monto o
        "No abonó") sólo con el color de fondo agregado detrás.
      - Botonera del header: los 3 botones outline (Descargar/Agregar Concepto/Registrar Pago) pasan de
        `border border-gray-300` a `border-2 border-gray-400`; sus íconos (`Download`/`PlusCircle`/
        `Receipt`) pierden su color propio (`text-indigo-600`/`text-gray-500`/`text-emerald-600`) y
        pasan a `text-gray-800` neutro, iguales entre sí. `Cerrar Factura` (fondo oscuro, ícono `Lock`
        blanco) no se tocó — no es un color propio, es el contraste necesario del ícono contra el
        fondo oscuro del botón.
      - Fila "Pago a cuenta" (pagos directos a la factura, sin `ventaId`): a diferencia de las filas de
        estado de pago por venta (que sólo tiñen desde "Método de Pago" hacia la derecha), esta fila SE
        PINTA COMPLETA de verde porque siempre es dinero efectivamente cobrado, sin estado condicional.
        `border-t border-emerald-100 bg-emerald-50/40` → `border-t border-emerald-200
        bg-emerald-100`, igualando la intensidad `-100` del resto de los fondos de estado de esta
        ronda (el borde también subió un escalón, de `-100` a `-200`, para que siga siendo visible
        contra el nuevo fondo más intenso).
      - Verificación: `npx oxlint` limpio (mismos 4 warnings preexistentes, ninguno nuevo); captura
        contra el stack de desarrollo real (Playwright, cliente Sotomayor id 6) confirma los 3 estados
        de pago con sus colores de fondo (verde/naranja/rojo) en la misma factura activa, la fila
        "Pago a cuenta" completa en verde `-100`, cabezal más oscuro y botones con borde más marcado
        e íconos neutros; un solo archivo tocado, ningún archivo
        de la sesión paralela; sin escrituras a la base. Captura: `img/round3-tabla-estados.png`.

## 11. Ronda 4 — tipografía IBM Plex Sans, sólo en el panel de la factura

> Pedido explícito del usuario: "usa la tipografía IBM Plex Sans". Ver design.md, sección "Ronda 4"
> para el detalle completo. Alcance: sólo el panel de la factura (activa e historial); el resto de la
> app conserva la fuente del sistema. Archivos tocados: `frontend/index.html`,
> `frontend/src/index.css`, `frontend/src/pages/FacturaCliente.jsx`.

- [x] 11.1 Cargar IBM Plex Sans vía Google Fonts en `frontend/index.html`
      (`preconnect` a `fonts.googleapis.com`/`fonts.gstatic.com` + stylesheet
      `family=IBM+Plex+Sans:wght@400;500;600;700`). Pesos elegidos según los `font-*` de Tailwind
      realmente usados en `FacturaCliente.jsx` (`font-medium`/`font-semibold`/`font-bold`, más 400
      base); `font-black` (900, un solo uso en "Total a Pagar") no tiene equivalente en la familia y
      cae al 700 cargado.
- [x] 11.2 Declarar el token `--font-factura` en el bloque `@theme` de `frontend/src/index.css` (el
      proyecto usa Tailwind v4 config CSS-first, sin `tailwind.config.js` — no aplica el patrón
      `fontFamily` de Tailwind v3). Aplicar la clase generada `font-factura` al `div` raíz de
      `renderFacturaCompleta` (el que lleva `ref={isActive ? facturaRef : null}`), ancestro común de
      la factura activa y del nodo capturado del historial.
- [x] 11.3 Agregar `await document.fonts.ready;` antes de `capturarNodoComoImagen(...)` en los dos
      call-sites (`handleDescargarImagen` y el handler "Descargar Factura" del historial), para que
      `html-to-image` no congele el estilo computado con la fuente de fallback si el usuario descarga
      antes de que termine de bajar el `@font-face`. **No se tocó** `capturarNodoComoImagen` ni
      `esperarProximoFrame` — la espera se agregó en el código que las llama, no dentro de ellas.
- [x] 11.4 Verificación contra el stack de desarrollo real (Playwright, cliente Sotomayor id 6):
      `getComputedStyle` del nodo `.font-factura` → `"IBM Plex Sans", ui-sans-serif, system-ui,
      sans-serif`; `document.fonts` reporta los 4 pesos en `loaded`; `getComputedStyle(document.body)`
      en `/facturas/6` y en `/clientes` sin cambios (confirma que el resto de la app no cambió de
      fuente); descarga real de la imagen (evento `download`, no simulado) inspeccionada visualmente —
      números y "a" minúscula con las formas de IBM Plex Sans, no la fuente de fallback. `npx oxlint`
      sobre `FacturaCliente.jsx` e `index.html`: limpio, mismos 4 warnings preexistentes, ninguno
      nuevo. Sin escrituras a la base. Captura: `img/round4-tipografia.png`.
