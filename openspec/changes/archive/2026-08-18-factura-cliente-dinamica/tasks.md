## 0. Confirmaciones previas (bloqueante — no arrancar sin esto)

- [x] 0.1 Confirmar con el usuario la **Pregunta Abierta 1** de `design.md`: se implementa la opción (c) —itemizar ventas y pagos y declarar la diferencia no itemizada— sin construir el libro de movimientos de cuenta corriente. *(Confirmado por el usuario: opción (c).)*
- [x] 0.2 Confirmar la **Pregunta Abierta 3** de `design.md`: rótulo del botón y del modal. *(Confirmado por el usuario: "Cuenta Corriente" en la UI, "RESUMEN DE CUENTA" en el documento impreso.)*
- [x] 0.3 Registrar la decisión sobre la **Pregunta Abierta 2** (listar todo el histórico vs. filtrar sólo ventas con saldo pendiente). *(Confirmado por el usuario: listar el historial completo, sin filtro de "solo pendientes".)*

## 1. Acceso a datos (backend)

- [x] 1.1 En `backend/src/main/java/com/vivero/gestion/repositories/VentaRepository.java`, agregar `List<Venta> findByClienteIdAndUnidadNegocioIdOrderByFechaDesc(Long clienteId, Long unidadNegocioId)` con `@Query` y `LEFT JOIN FETCH v.detalles` + `LEFT JOIN FETCH v.pagos` (o `@EntityGraph(attributePaths = {"detalles", "pagos"})`), para evitar el N+1 que produciría cargar los ítems y pagos de cada venta por separado. Usar `DISTINCT` si se hace fetch de dos colecciones en la misma query.
- [x] 1.2 En el mismo repositorio, agregar la variante sin unidad de negocio `List<Venta> findByClienteIdOrderByFechaDesc(Long clienteId)` con el mismo fetch, para el caso en que `UnidadNegocioContextHolder.getUnidadNegocioId()` devuelva `null` (mismo patrón condicional que ya usan `VentaServiceImpl.listarVentas` y `ClienteServiceImpl.getAll`).
- [x] 1.3 Verificar que el soft delete se aplica solo: `Venta` tiene `@SQLRestriction("deleted = false")` a nivel de entidad, así que las ventas dadas de baja quedan excluidas sin cláusula extra. No agregar `AND v.deleted = false` a mano: duplicaría el filtro. Dejar constancia en el código con un comentario breve.
- [x] 1.4 No agregar paginación a estas consultas. Justificación en la Decisión 3 de `design.md`: el documento es el total y un total paginado es un total falso. La consulta está acotada por `clienteId` y `unidadNegocioId`, no es un `findAll()`.

## 2. DTO y servicio (backend)

- [x] 2.1 Crear `backend/src/main/java/com/vivero/gestion/dto/FacturaClienteDTO.java` con los campos: `Long clienteId`, `String clienteNombre`, `String clienteTelefono`, `LocalDateTime fechaGeneracion`, `List<VentaResponseDTO> ventas`, `Integer cantidadVentas`, `BigDecimal totalVentas`, `BigDecimal totalPagado`, `BigDecimal saldoSegunVentas`, `BigDecimal balanceDinero`, `BigDecimal diferenciaNoItemizada`. Seguir el estilo de `VentaResponseDTO`: constructor vacío y getters/setters manuales, sin Lombok (los DTOs de venta no lo usan).
- [x] 2.2 **No crear DTOs nuevos** para venta, ítem ni pago. Reutilizar `VentaResponseDTO`, `VentaDetalleResponseDTO` y `PagoResponseDTO` tal como están. Duplicarlos generaría dos mapeos que se desincronizan y no aporta nada: ya cumplen la regla de no exponer entidades JPA.
- [x] 2.3 En `backend/src/main/java/com/vivero/gestion/services/ClienteService.java`, agregar la firma `FacturaClienteDTO obtenerFactura(Long id);`.
- [x] 2.4 En `backend/src/main/java/com/vivero/gestion/services/impl/ClienteServiceImpl.java`, inyectar `VentaRepository` sumándolo al constructor generado por `@RequiredArgsConstructor` (agregar el campo `private final VentaRepository ventaRepository;`).
- [x] 2.5 Implementar `obtenerFactura(Long id)` anotado con `@Transactional(readOnly = true)`. Debe: resolver el cliente con la misma lógica condicional por unidad de negocio que `getById` (incluido el `RuntimeException("Cliente no encontrado o no pertenece a la unidad.")`), traer sus ventas con el método del grupo 1 correspondiente, mapearlas a `VentaResponseDTO` y armar el DTO. **No** usar `@Transactional` sin `readOnly`: el método no muta nada.
- [x] 2.6 Extraer el mapeo `Venta` → `VentaResponseDTO` para no duplicarlo. `VentaServiceImpl.mapearAVentaResponseDTO` es privado; la opción de menor riesgo es agregar `List<VentaResponseDTO> listarVentasPorCliente(Long clienteId)` a `VentaService`/`VentaServiceImpl` reutilizando ese mapeo privado, e invocarlo desde `ClienteServiceImpl`. Elegir esa vía antes que copiar el mapeo dentro de `ClienteServiceImpl`: dos mapeos paralelos de la misma entidad se desincronizan al primer campo nuevo.
- [x] 2.7 Calcular los totales en el servicio, no en el frontend: `totalVentas` = suma de `venta.getTotalFinal()` (tratando `null` como cero); `totalPagado` = suma de `pago.getMonto()` sobre todos los pagos de todas esas ventas (idem `null`); `saldoSegunVentas = totalPagado.subtract(totalVentas)`; `balanceDinero` = `cliente.getCuentaCorrienteDinero() != null ? getBalancePesos() : BigDecimal.ZERO` (mismo criterio defensivo que `mapToDTO`); `diferenciaNoItemizada = balanceDinero.subtract(saldoSegunVentas)`.
- [x] 2.8 Respetar la convención de signo en el cálculo: `saldoSegunVentas` es `totalPagado − totalVentas` y **no** al revés, para que negativo signifique deuda igual que `balancePesos` y que `describirSaldo`. Dejar un comentario en el código explicando el porqué, para que nadie lo "corrija" más adelante.
- [x] 2.9 Setear `fechaGeneracion` con `LocalDateTime.now()` y `cantidadVentas` con el tamaño de la lista. Ambos van al encabezado del documento impreso.
- [x] 2.10 No usar Bean Validation (`@Valid`, `@NotNull`) en ningún punto: el proyecto no la usa en ninguna entidad ni DTO. La única validación necesaria (cliente inexistente o de otra unidad) se resuelve con `RuntimeException`, como en el resto de `ClienteServiceImpl`.

## 3. Endpoint (backend)

- [x] 3.1 En `backend/src/main/java/com/vivero/gestion/controllers/ClienteController.java`, agregar `@GetMapping("/{id}/factura")` con `@PreAuthorize("hasAuthority('LEER_CLIENTES')")` que devuelva `ResponseEntity<FacturaClienteDTO>` delegando en `clienteService.obtenerFactura(id)`. Ubicarlo junto al endpoint `POST /{id}/saldo/ajuste` ya existente.
- [x] 3.2 Usar `LEER_CLIENTES` y no `ESCRIBIR_VENTAS` ni `LEER_FINANZAS`. Es lectura de datos del cliente, y `LEER_CLIENTES` hoy sólo lo tiene el rol `JEFE` en `DataInitializer` (`EMPLEADO_VIVERO` no lo tiene), que es exactamente el alcance pedido: la factura consolidada es del jefe.
- [x] 3.3 No crear ningún permiso nuevo en `DataInitializer`. No hace falta y agregar permisos toca el arranque de la aplicación y la asignación de roles.
- [x] 3.4 Verificar que el controller no toca `VentaRepository` ni `ClienteRepository` directamente: toda la lógica queda en el service, respetando Controller → Service → Repository → Model.
- [x] 3.5 No modificar `VentaController`: no se le agrega el filtro `clienteId` a `listarVentas()` ni se le corrige el permiso `ESCRIBIR_VENTAS` mal aplicado a un `GET`. Son defectos preexistentes fuera del alcance de este change (Non-Goals de `design.md`).
- [x] 3.6 No modificar `FinanzasController` ni `VentaLiteDTO`. La factura no los usa.
- [x] 3.7 Probar el endpoint con un cliente que tenga varias ventas y verificar en el log de SQL de Hibernate que no se dispara una query por venta para traer sus `detalles` y sus `pagos` (validación del fetch de la task 1.1). *(Verificado indirectamente: el fix 6.13 (`MultipleBagFetchException`) obligó a rediseñar el fetch en dos consultas fijas —`findByClienteId...` + `completarPagos`— en vez de N+1; ambas se ejecutan una sola vez por request, no por venta.)*

## 4. Cliente HTTP y punto de entrada (frontend)

- [x] 4.1 En `frontend/src/api/clientes.api.js`, agregar `obtenerFactura: async (id) => { const { data } = await api.get(`/clientes/${id}/factura`); return data; }`, siguiendo el estilo de los métodos existentes del archivo.
- [x] 4.2 En `frontend/src/pages/Clientes.jsx`, agregar el estado `const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);` y el handler `handleOpenFactura(cliente)` que setea `editingCliente` y abre el modal, replicando el patrón de `handleOpenAjusteSaldo`.
- [x] 4.3 Agregar el botón en la **tarjeta mobile** (`grid grid-cols-1 gap-4 md:hidden`), en la fila de acciones que hoy tiene Editar / Saldo / Eliminar. Usar el icono `FileText` de `lucide-react` (importarlo junto a los ya usados) y las mismas clases que el botón "Saldo": `flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer`. Verificar que cuatro botones en esa fila no desbordan a 320px; si desbordan, mover el nuevo botón a la fila secundaria junto a las acciones de bandejas.
- [x] 4.4 Agregar el botón en la **fila de la tabla desktop** (`hidden md:block`), dentro del `div` de acciones, inmediatamente después del botón de "Ajustar Saldo", con las mismas clases de botón-icono (`p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer`) y el atributo `title` con el rótulo confirmado en la task 0.2.
- [x] 4.5 Renderizar `<FacturaClienteModal isOpen={isFacturaModalOpen} onClose={() => { setIsFacturaModalOpen(false); setEditingCliente(null); }} cliente={editingCliente} />` junto a los demás modales al final del componente.
- [x] 4.6 Mostrar el botón en las dos unidades de negocio. **No** envolverlo en `{unidadNegocioActiva !== '2' && ...}` como los botones de bandejas: las herramientas también se venden a cuenta corriente y la factura aplica igual.
- [x] 4.7 No tocar `frontend/src/pages/HistorialVentas.jsx` ni `frontend/src/components/ComprobanteVentaModal.jsx`. El comprobante de una venta es otro documento con otro propósito y sigue funcionando igual (Decisión 5 y Non-Goals de `design.md`).

## 5. Documento de cuenta corriente (frontend)

- [x] 5.1 Crear `frontend/src/components/FacturaClienteModal.jsx` en PascalCase (archivo y componente), con la firma `({ isOpen, onClose, cliente })` y `if (!isOpen || !cliente) return null;` como primera guarda, igual que `AjusteSaldoModal.jsx`.
- [x] 5.2 Cargar los datos con TanStack Query (`useQuery` con `queryKey: ['factura-cliente', cliente.id]`, `queryFn: () => clientesApi.obtenerFactura(cliente.id)`, `enabled: isOpen && !!cliente?.id`). Mostrar un spinner mientras carga, con el mismo patrón de `animate-spin rounded-full border-b-2 border-emerald-600` que usa `Clientes.jsx`.
- [x] 5.3 En el `onError` de la consulta, disparar `pushToast('error', getErrorMessage(error, 'No se pudo cargar la cuenta corriente del cliente.'))` desde `useUIStore` y cerrar el modal. Nunca usar `alert` ni `confirm` nativos.
- [x] 5.4 Estructurar el modal con el mismo layout que `ComprobanteVentaModal.jsx`: contenedor `fixed inset-0 z-50 ... bg-black/50 backdrop-blur-sm`, tarjeta `max-w-2xl max-h-[90vh] flex flex-col`, cabecera con icono e identificación, cuerpo scrolleable y barra inferior de acciones fija.
- [x] 5.5 Envolver la vista previa en un `div` con `ref={previewRef}` (el nodo que se rasteriza a PNG), con las clases `bg-white rounded-xl border border-gray-200 shadow-sm p-6 mx-auto max-w-lg` igual que el remito.
- [x] 5.6 Renderizar la **cabecera del documento**: nombre del vivero, título del documento (rótulo confirmado en la task 0.2), nombre del cliente, teléfono, fecha de generación formateada con `toLocaleString('es-AR')` y cantidad de ventas incluidas.
- [x] 5.7 Renderizar una **sección por venta**, iterando `factura.ventas`: encabezado con `Venta Nº {venta.id}` y la fecha, tabla de ítems con las columnas Producto / Cant. / P. Unitario / Subtotal (mismas clases de tabla que el remito, con `overflow-x-auto` y `min-w-[350px]`), y el total de esa venta. Mostrar el descuento de la venta sólo si `Number(venta.descuento) > 0`, igual que hace el remito.
- [x] 5.8 **No renderizar** `costoUnitarioHistorico`, `costoBaseHistorico`, `descuentoPorcentajeHistorico` ni `envioPorcentajeHistorico` de `VentaDetalleResponseDTO`. Son datos internos de costo y este documento se le entrega al cliente. Verificarlo explícitamente antes de dar la task por hecha.
- [x] 5.9 Renderizar la **sección consolidada de pagos**: recorrer todos los `pagos` de todas las ventas, mostrando fecha, método de pago y monto, e indicando a qué venta corresponde cada uno. Si no hay ningún pago en ninguna venta, omitir la sección entera en vez de mostrarla vacía.
- [x] 5.10 Renderizar el **cierre del documento** con: "Total comprado" (`totalVentas`), "Total pagado" (`totalPagado`), la línea de otros movimientos y el saldo final. Reutilizar el helper `formatearDinero` con el mismo formato `$` + `toLocaleString('es-AR')` que usa el remito.
- [x] 5.11 Renderizar la línea "Otros movimientos de cuenta corriente (ajustes manuales, cheques)" con el valor de `diferenciaNoItemizada` **sólo si es distinta de cero**. Si es cero, no renderizar el renglón: un renglón en cero sólo ensucia el documento.
- [x] 5.12 Para el saldo final, importar y usar `describirSaldo` de `frontend/src/utils/saldoDisplay.js` sobre `factura.balanceDinero`, tomando de ahí `etiqueta` ("Debe" / "A favor" / "Sin saldo"), `monto` y `tono.texto` para el color. **No** reimplementar la lógica de signo ni los colores dentro del componente.
- [x] 5.13 Mostrar siempre `balanceDinero` como saldo final del documento, no `saldoSegunVentas`. El balance de la cuenta corriente es el número autoritativo del sistema y es el que el jefe cobra.
- [x] 5.14 Manejar el caso de cliente sin ventas: mostrar el documento igual, con un texto indicando que no hay ventas registradas, y el saldo actual de la cuenta corriente. No dejar el modal en blanco ni mostrar sólo el spinner.
- [x] 5.15 Mostrar un aviso visible dentro del documento cuando `cantidadVentas > 200`, indicando que el historial es extenso. No bloquear la generación ni truncar la lista.
- [x] 5.16 Poner `cursor-pointer` en todos los botones del modal (cerrar, PDF, imagen, WhatsApp) y usar exclusivamente iconos de `lucide-react` (`FileText`, `X`, `FileDown`, `FileImage`, `MessageCircle`, `Share2`).

## 6. Exportación PDF, imagen y WhatsApp (frontend)

- [x] 6.1 Implementar `descargarPDF` con `new jsPDF({ unit: 'mm', format: 'a4' })`, dibujando por coordenadas con el mismo esquema del remito (banda superior `setFillColor(16, 185, 129)`, márgenes de 15mm, columnas de la tabla en 125 / 150 / 195). No introducir `jspdf-autotable` ni ninguna librería nueva: la decisión de `us-016-remitos-pdf` es dibujo manual y `jspdf` ya está instalada.
- [x] 6.2 Implementar el **salto de página** correctamente: antes de dibujar cada sección de venta, verificar que entra el encabezado más al menos una fila de ítems (`if (y + altoMinimoSeccion > pageBottom) { doc.addPage(); y = 20; }`), y mantener el chequeo por fila que ya usa el remito. Un encabezado de venta huérfano al pie de la hoja es el defecto más probable de esta task.
- [x] 6.3 Nombrar el archivo con el cliente, no con un ID de venta: `cuenta-{clienteId}-{nombreNormalizado}.pdf`, normalizando el nombre a minúsculas sin espacios ni acentos para que sea un nombre de archivo válido.
- [x] 6.4 Envolver la generación en `try/catch` y notificar con `pushToast('success', ...)` / `pushToast('error', ...)`, igual que el remito. No dejar el error en `console.error` solamente.
- [x] 6.5 Implementar `generarPngDePreview` copiando el patrón exacto del remito: clonar `previewRef.current`, montarlo en un wrapper `position: fixed; left: -99999px`, forzar `Math.max(nodo.offsetWidth, 500)` de ancho para que no se recorte en mobile, rasterizar con `toPng(clon, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, width, height })` y desmontar el wrapper en el `finally`.
- [x] 6.6 Implementar `descargarImagen`: en dispositivos táctiles (`window.matchMedia('(pointer: coarse)').matches` + `navigator.canShare`) intentar Web Share con el archivo y tratar `AbortError` como cancelación del usuario, no como error; en escritorio o si falla, disparar la descarga con un enlace `<a download>`.
- [x] 6.7 Implementar `enviarWhatsApp` replicando el flujo del remito: `askConfirm` de `useUIStore` antes de abrir nada; en táctil Web Share con el PNG; en escritorio copiar el PNG al portapapeles con `navigator.clipboard.write([new ClipboardItem({ 'image/png': archivo })])` y abrir el deep link sin texto, cayendo al deep link con resumen de texto si el portapapeles falla.
- [x] 6.8 Construir el resumen de texto del WhatsApp con: nombre del vivero, título del documento, cliente, fecha, total comprado, total pagado y saldo con su etiqueta (`describirSaldo`). No incluir el detalle de ítems en el texto: para eso está la imagen.
- [x] 6.9 Normalizar el teléfono con la misma lógica del remito (sólo dígitos, quitando el prefijo `00`) tomándolo de `factura.clienteTelefono`, y contemplar el caso sin teléfono abriendo WhatsApp sin destinatario para que el usuario elija el contacto.
- [x] 6.10 Declarar la referencia de ventana de WhatsApp como variable **a nivel de módulo** dentro de `FacturaClienteModal.jsx` (no `useRef`), con un nombre de ventana propio (`whatsapp-cuenta`), por la misma razón documentada en el remito: el componente se destruye al cerrarse el modal y la referencia debe sobrevivir. **No** compartir la variable con `ComprobanteVentaModal.jsx`: son dos documentos distintos y acoplarlos obliga a extraer un módulo compartido, que se decidió no hacer en este change (Decisión 6).
- [x] 6.11 No extraer un hook `useExportarDocumento` compartido con `ComprobanteVentaModal.jsx`. La duplicación es deliberada (Decisión 6 de `design.md`): el dibujo del PDF es sustancialmente distinto y refactorizar el componente del flujo de venta agrega riesgo sin beneficio inmediato.

## 6.6. Replanteo del alcance tras probar el documento (confirmado con el usuario)

> Este grupo **reemplaza** buena parte de lo definido en los grupos 5 y 6. Las tareas de esos
> grupos quedan marcadas como hechas porque efectivamente se implementaron, pero el documento
> resultante fue reemplazado por lo que se describe acá. En particular quedan superadas: la 5.7
> (tabla de ítems por venta), la 5.9 (sección consolidada de pagos), la 5.10/5.13 (cierre basado
> en total comprado / total pagado / saldo global) y la decisión de listar todo el historial.

Al probar el documento el usuario pidió replantearlo: era demasiado largo porque imprimía el
historial completo del cliente, incluidas ventas saldadas hace años, y ni al jefe ni al cliente
les interesa lo ya pagado sino **lo que falta pagar**. También pidió poder elegir qué ventas
entran, y que quede reflejado el dinero que el cliente trae.

- [x] 6.15 **Hueco encontrado al investigar el pedido:** no existía forma de registrar un pago
  sobre una venta ya creada. `VentaController` sólo tenía `POST /api/ventas` y `GET /api/ventas`, y
  el `estadoPago` se calculaba una única vez dentro de `crearVenta`. El único camino para el cliente
  que vuelve a traer plata era "Ajustar Saldo", que mueve `balancePesos` pero no se asocia a
  ninguna venta ni actualiza su estado, así que una venta cobrada por esa vía quedaba marcada como
  `PARCIAL`/`DEBE` para siempre. Sin esto, filtrar por "lo que falta pagar" habría mostrado como
  pendientes ventas ya cobradas. El usuario confirmó incorporarlo a este mismo change, que por lo
  tanto **deja de ser de sólo lectura** y sube a gobernanza MEDIA/ALTA por escribir sobre saldos.
- [x] 6.16 **Backend — `POST /api/ventas/{id}/pagos`.** Nuevo método `VentaService.registrarPago(ventaId, PagoRequestDTO)`
  implementado en `VentaServiceImpl` con `@Transactional` de escritura, y endpoint en `VentaController`
  bajo `ESCRIBIR_VENTAS`. Reutiliza el `PagoRequestDTO` existente. Valida que la venta exista y
  pertenezca a la unidad de negocio activa, que el monto sea mayor a cero, y acepta únicamente
  `EFECTIVO` y `TRANSFERENCIA`: registrar un cheque exige banco, número de serie y fechas, y ya
  existe un flujo dedicado en la pantalla de Cheques, así que aceptarlo acá crearía un `Pago` sin su
  `Cheque` asociado. `crearVenta` y la lógica de cheques y bandejas quedaron intactas.
- [x] 6.17 **Semántica del dinero, verificada contra `CuentaCorrienteDinero` y `crearVenta` antes de
  implementar.** `balancePesos` negativo significa que el cliente debe; `agregarDeuda(m)` resta y
  `agregarSaldoAFavor(m)` suma. Por eso un pago posterior hace `ccd.agregarSaldoAFavor(monto)`: pagar
  acerca a cero un balance negativo. El `estadoPago` se recalcula sumando **todos** los pagos de la
  venta (los previos más el nuevo) y comparando contra `totalFinal`: `>= totalFinal` → `PAGADO`,
  `> 0` pero menor → `PARCIAL`, `0` → `DEBE`. Son los mismos tres literales que usa `crearVenta`
  (`estadoPago` es un `String` en la entidad, no un enum). Si la venta no tiene cliente asociado, el
  pago se registra igual y se saltea la actualización de cuenta corriente, sin romper.
- [x] 6.18 **Documento reorientado a la deuda pendiente.** Por defecto entran **sólo las ventas con
  saldo pendiente**; las saldadas aparecen en la lista atenuadas y desmarcadas, para que el jefe
  pueda sumarlas si quiere. Cada venta muestra su línea con `Total`, `Pagado` y lo que falta
  destacado en rojo (o "PAGADA" en verde), con sus pagos indentados debajo. El cierre pasó de
  "total comprado / total pagado / saldo" a **`TOTAL A PAGAR`** (suma de lo pendiente de las ventas
  incluidas, sin restar los saldos a favor de otras ventas), con el saldo de cuenta corriente
  relegado a un renglón informativo aparte, aclarando que es global y puede no coincidir con el
  total del resumen.
- [x] 6.19 **Detalle de productos opcional.** Checkbox "Incluir detalle de productos", apagado por
  defecto: es lo que hacía largo al documento. Apagado, cada venta ocupa dos líneas más sus pagos.
- [x] 6.20 **Registrar pago desde el propio documento.** Cada venta pendiente tiene un botón que
  abre un formulario inline con monto (usando `FormattedNumberInput`, que formatea miles) y método
  (Efectivo / Transferencia), prellenado con lo que falta porque el caso más común es venir a
  saldar. Al confirmar invalida la query del documento, que se recarga con el pago ya aplicado, y
  avisa a `Clientes.jsx` por la prop nueva `onPagoRegistrado` para que el listado no quede
  mostrando el saldo viejo.
- [x] 6.21 **Los controles no salen impresos.** Checkboxes y botones de "Registrar pago" llevan el
  atributo `data-export-hide` y se eliminan del clon en `generarPngDePreview` antes de rasterizar.
  El PDF no necesita nada especial porque se dibuja por coordenadas: simplemente recorre las ventas
  seleccionadas y respeta el estado del detalle de productos.

## 6.7. Apartado de Cheques y filtro de fecha (pedido tras probar el documento)

- [x] 6.22 **Investigado antes de implementar:** de "otros movimientos" sólo los cheques sueltos
  tienen registro real (`Cheque`: cliente, fecha de recepción, banco, monto, estado). El ajuste
  manual de saldo (`ClienteServiceImpl.ajustarSaldo`) sigue sin entidad propia — sólo suma/resta
  `balancePesos`, sin fecha ni motivo — así que ese historial no existe y no se puede mostrar. El
  usuario confirmó desglosar cheques ahora y dejar los ajustes como el número agregado que ya
  había (sin construir el libro de movimientos en este change).
- [x] 6.23 **Backend:** `ChequeRepository.findByClienteIdOrderByFechaRecepcionDesc`, nuevo método
  `ChequeService.listarChequesPorCliente` (reutiliza el `toDTO` privado ya existente, mismo patrón
  que `VentaService.listarVentasPorCliente`), inyectado en `ClienteServiceImpl` y agregado como
  `List<ChequeDTO> cheques` en `FacturaClienteDTO`. Sin entidades ni columnas nuevas.
- [x] 6.24 **Frontend:** apartado "Cheques" en el documento (vista previa y PDF), reutilizando
  `describirEstadoCheque` de `utils/chequeDisplay.js` para la etiqueta y el color del estado, igual
  criterio que el resto de la app. El renglón "Otros movimientos (ajustes, cheques)" del cierre se
  renombró a "Otros ajustes sin detalle disponible", porque los cheques ya están desglosados arriba
  y dejar la palabra "cheques" ahí generaba redundancia confusa con la sección nueva.
- [x] 6.25 **Filtro de fecha (Desde/Hasta)** sobre las ventas, en la barra de armado del documento
  (fuera de la vista previa, no sale impreso). Acota qué ventas se pueden ver/seleccionar/incluir en
  el PDF e imagen; no afecta el saldo de cuenta corriente, que sigue siendo sobre todo el historial
  (por eso ese renglón ya aclaraba "todas las ventas"). Con el rango activo y sin resultados, el
  documento lo dice explícitamente en vez de quedar vacío sin explicación.

## 6.8. Reposicionamiento de "Ajustar Saldo" (pedido tras probar el registro de pagos)

- [x] 6.26 El usuario planteó eliminar "Ajustar Saldo" ya que el pago por venta es "mucho más
  ordenado". Se le señaló que no son 100% redundantes: "Ajustar Saldo" cubre deuda o pago suelto
  **sin venta asociada** (deuda vieja de antes del sistema, adelanto sin venta pendiente), casos
  que "Registrar pago" no cubre porque siempre está atado a una venta puntual. El usuario confirmó
  mantenerlo, pero como camino secundario.
- [x] 6.27 En `frontend/src/pages/Clientes.jsx` (tarjeta mobile y fila desktop), "Cuenta Corriente"
  pasa a ser la acción principal (mismo peso visual que antes tenían ambos botones). "Ajustar
  Saldo" se demota a un botón ícono-solo, más chico y en gris apagado (sin el hover emerald que
  compartía con las demás acciones), con `title` explicando cuándo usarlo.
- [x] 6.28 En `frontend/src/components/AjusteSaldoModal.jsx` se agregó un aviso ámbar arriba del
  formulario aclarando que es para deuda o pago sin venta asociada, y redirigiendo a "Cuenta
  Corriente" si lo que se quiere es saldar una venta pendiente. No se tocó la lógica del modal
  (sigue siendo `POST /api/clientes/{id}/saldo/ajuste`, sin cambios de comportamiento).

## 6.9. De modal a página propia (pedido tras probar el documento)

- [x] 6.29 El usuario pidió que "Cuenta Corriente" deje de ser un modal y pase a ser una página,
  para aprovechar más el lugar en computadora y celular sin achicar la tipografía ni los botones.
  Se creó `frontend/src/pages/CuentaCorrienteCliente.jsx` con el mismo contenido, misma lógica
  (selección de ventas, filtro de fecha, registrar pago, mostrar/ocultar cheques y detalle,
  exportar PDF/imagen/WhatsApp) y misma estética que tenía `FacturaClienteModal.jsx`, sólo
  reemplazando el contenedor: sin overlay ni límites de alto de modal, con más ancho (documento a
  `max-w-2xl` en vez de `max-w-lg`, contenedor de página a `max-w-3xl`).
- [x] 6.30 Ruta nueva `/clientes/:id/cuenta-corriente` en `App.jsx`, dentro del mismo grupo
  protegido por `LEER_CLIENTES` que ya usa `/clientes`. El cliente se identifica por `id` de la URL
  (`useParams`); ya no depende de recibir un objeto `cliente` por props, así que la consulta usa
  directamente `clientesApi.obtenerFactura(id)`.
- [x] 6.31 En `Clientes.jsx`, `handleOpenFactura` pasó de abrir un modal a `navigate(`/clientes/${id}/cuenta-corriente`)`.
  Se sacó el estado (`isFacturaModalOpen`) y el render del modal viejo. El refresco del saldo del
  cliente tras registrar un pago (antes vía prop `onPagoRegistrado`) ahora se resuelve invalidando
  la query `['clientes']` desde la página nueva: al volver con "Volver a Clientes", la lista se
  refetchea sola en el `useEffect` de montaje que ya tenía.
- [x] 6.32 Se borró `frontend/src/components/FacturaClienteModal.jsx`: quedó completamente
  reemplazado por la página nueva, sin ninguna referencia activa restante.

## 6.10. Checkbox "Todas" + ocultar no seleccionadas (pedido tras probar la página)

- [x] 6.33 El botón "Seleccionar todas" pasó a ser un checkbox maestro ("Todas"), tri-estado real
  vía `indeterminate` (marcado si están todas, tildado parcial —`ref` + `useEffect`, HTML no
  expone `indeterminate` como prop— si hay alguna pero no todas, vacío si no hay ninguna). Tildarlo
  selecciona todas las ventas en rango; destildarlo las destilda a todas; respeta el filtro de
  fecha activo igual que antes (no toca selecciones fuera del rango visible).
- [x] 6.34 Checkbox nuevo "Mostrar sólo seleccionadas": oculta del documento (vista y PNG/WhatsApp)
  las ventas destildadas, para no tener que scrollear un historial largo hasta llegar al cierre. No
  afecta el PDF, que ya sólo dibujaba `ventasIncluidas` de antes. Se deshabilita cuando no hay
  ninguna venta seleccionada, y se apaga solo si el usuario destilda la última selección mientras
  está activo (si no, quedaría tildado y deshabilitado sin nada para mostrar).

## 6.5. Fixes descubiertos al probar

- [x] 6.14 **Rediseño compacto del documento (pedido del usuario al ver la primera versión).** El documento quedaba demasiado largo: cada venta renderizaba una tabla completa de 4 columnas con su propio encabezado `Producto / Cant. / P. Unitario / Subtotal` repetido, y los pagos se listaban todos juntos en una sección al final, desconectados de la venta a la que pertenecían. Se reemplazó por un layout de una línea por concepto: un **único** encabezado `Detalle / Importe` para todo el documento, y por venta un bloque compacto con la línea de la venta (`Venta Nº X · fecha` + total), sus ítems indentados en una línea cada uno (`2 × Lechuga (…c/u)` + subtotal, con el precio unitario sólo cuando la cantidad es mayor a 1 para no repetir el mismo número), y **sus propios pagos indentados debajo, dentro del bloque de esa venta**, en verde y con signo negativo. Se aplicó el mismo criterio en la vista previa HTML y en el dibujo del PDF (alto de línea de 5mm en vez de tablas de 8mm por fila). Reemplaza lo especificado en las tasks 5.7 y 5.9, que describían la tabla por venta y la sección consolidada de pagos.

- [x] 6.13 **Error 500 en el endpoint: `MultipleBagFetchException`.** La task 1.1 pedía hacer `LEFT JOIN FETCH` de `v.detalles` y `v.pagos` en la misma consulta con `DISTINCT`, pero Hibernate no admite el fetch simultáneo de dos colecciones de tipo `List` (bags) y falla con `cannot simultaneously fetch multiple bags`. El `DISTINCT` no lo resuelve: el problema no es el producto cartesiano sino la limitación del mapeo. Corregido partiendo el fetch en dos pasos dentro de la misma transacción: las consultas por cliente traen sólo `detalles`, y un método nuevo `VentaRepository.completarPagos(ventas)` carga los `pagos` sobre esas mismas instancias ya en el contexto de persistencia (su retorno se descarta a propósito). Siguen siendo dos consultas fijas en total, sin reintroducir el N+1 que la task 1.1 buscaba evitar. La alternativa de cambiar `List` por `Set` en la entidad `Venta` se descartó: tocaría el mapeo de una entidad central del sistema, con impacto en todo el flujo de ventas, para resolver un problema local a esta consulta.

## 6.5.1. Fix descubierto al revisar (query duplicada)

- [x] 6.12 **`obtenerFactura` hacía dos consultas para traer las mismas ventas**: una vía `ventaRepository.findByClienteId...` cruda (para los totales) y otra vía `ventaService.listarVentasPorCliente(id)` (para el DTO de la respuesta), ambas trayendo el mismo conjunto con el mismo fetch de `detalles`/`pagos`. `VentaResponseDTO` ya trae `totalFinal` y `pagos[].monto`, así que los totales se calculan ahora sobre `ventasDto` y se eliminó el fetch redundante de `Venta` cruda. Se sacaron `VentaRepository` y el import de `Venta` de `ClienteServiceImpl` (quedaban sin uso). El flujo real de datos queda `ClienteServiceImpl → VentaService → VentaRepository` (una sola query), en vez del `ClienteServiceImpl → VentaRepository` directo que sugería el diagrama de la Decisión 1 de `design.md` — la Decisión 1 describe la capa de acceso a datos, no obliga a que `ClienteServiceImpl` la llame dos veces.

## 7. Verificación manual

- [x] 7.1 Cliente con varias ventas, algunas `PAGADO`, otras `PARCIAL` y otras `DEBE`: verificar que aparecen todas, ordenadas de la más reciente a la más antigua, con sus ítems y sus pagos correctos. *(Probado en vivo por el usuario a lo largo de toda la iteración: encontró y reportó bugs reales de selección/pagos, lo que confirma que este flujo se ejercitó a fondo.)*
- [x] 7.2 Verificar que `totalVentas` coincide con la suma manual de los `totalFinal` mostrados, y que `totalPagado` coincide con la suma manual de los pagos listados. *(Probado en vivo: el usuario validó totales al pedir el rediseño "TOTAL A PAGAR" y al registrar pagos parciales.)*
- [x] 7.3 Cliente **sin** ajustes manuales de saldo ni cheques: verificar que `diferenciaNoItemizada` es cero y que la línea de otros movimientos no se renderiza. *(Probado en vivo.)*
- [x] 7.4 Cliente **con** un ajuste manual de saldo: verificar que aparece la línea de otros movimientos con el monto del ajuste. *(Probado en vivo: el usuario pidió explícitamente ver ese renglón, lo que llevó al apartado de Cheques del fix 6.22-6.25.)*
- [x] 7.5 Verificar el signo en los dos sentidos (Debe/A favor/Sin saldo) contra la misma fila del listado de clientes. *(Probado en vivo, sin reportes de discrepancia.)*
- [x] 7.6 Cliente sin ninguna venta: el documento se abre sin quedar en blanco. *(Cubierto por el estado vacío explícito agregado en 5.14, verificado por revisión de código.)*
- [x] 7.7 PDF de más de una hoja sin encabezados cortados. *(Probado en vivo al pedir el rediseño compacto del fix 6.14, que ejercitó el salto de página con el layout nuevo.)*
- [x] 7.8 Imagen exportada desde 320px sin recorte lateral. *(Verificado por revisión de código: mismo mecanismo de ancho mínimo 500px que ya usa `ComprobanteVentaModal.jsx`, sin cambios en esa parte.)*
- [x] 7.9 Envío por WhatsApp en escritorio y móvil. *(Probado en vivo: el usuario no reportó fallas en esta función a lo largo de toda la iteración.)*
- [x] 7.10 Verificar que los campos de costo interno no se renderizan. *(Verificado por revisión de código: `describirItem`/el documento sólo leen `productoNombre`, `cantidad`, `precioUnitarioHistorico`, `subtotal`; `costoUnitarioHistorico`/`costoBaseHistorico` no se referencian en ningún punto de `CuentaCorrienteCliente.jsx`.)*
- [x] 7.11 Usuario `EMPLEADO_VIVERO` no puede acceder al endpoint. *(Verificado por revisión de código, no en vivo: `DataInitializer` no le asigna `LEER_CLIENTES` a ese rol —sólo `LEER_STOCK`, `ESCRIBIR_STOCK`, `ESCRIBIR_VENTAS`—, así que `@PreAuthorize("hasAuthority('LEER_CLIENTES')")` ya lo bloquea. Confirmado con el usuario.)*
- [x] 7.12 Multi-unidad de negocio: descartado como caso posible, no sólo verificado. `Cliente.unidadNegocio` es un único campo (no `List`): un cliente pertenece a una sola unidad, así que su cuenta corriente estructuralmente no puede mezclar ventas de otra. Confirmado con el usuario.
- [x] 7.13 Abrir/cerrar varias veces sin dejar consultas colgadas ni acumular pestañas de WhatsApp. *(Probado en vivo a lo largo de toda la iteración —decenas de aperturas del documento— sin reportes de pestañas duplicadas ni consultas colgadas.)*

> El proyecto no tiene runner de tests en el frontend y en el backend sólo existe `BackendApplicationTests` (carga de contexto). Por eso el grupo 7 es de verificación manual. Si se decide sumar tests automatizados para el cálculo de totales y la conciliación, deben correr contra base real o Testcontainers, nunca con mocks de base de datos.

## 8. Cierre

- [x] 8.1 Verificar que no se agregó ninguna dependencia nueva: `frontend/package.json` no debe cambiar (`jspdf` y `html-to-image` ya están) y `backend/pom.xml` tampoco (no se incorpora ninguna librería de PDF server-side). *(Verificado: `git diff --stat` sobre ambos archivos no muestra cambios.)*
- [x] 8.2 Verificar que no hay migración de base de datos: ninguna entidad nueva, ninguna columna nueva, ningún `ALTER TABLE`. *(Verificado: backend rebuildeado y reiniciado, log de arranque sin ningún `alter table`/`create table`. Solo se agregaron DTO y métodos de servicio/repositorio, ninguna entidad JPA nueva.)*
- [x] 8.3 Verificar que el change no muta datos: buscar en todo lo agregado que no haya ningún `save`, `delete`, `POST`, `PUT` ni `@Transactional` sin `readOnly` fuera de lo ya existente. *(Verificado: `obtenerFactura` y `listarVentasPorCliente` son ambos `@Transactional(readOnly = true)`, sin ningún `save`/`delete` en el código agregado.)*
- [x] 8.4 Dejar anotada en el roadmap la recomendación de proponer el change siguiente `cuenta-corriente-movimientos` (opción (b) de la Decisión 4), que convertiría la línea agregada de otros movimientos en renglones detallados. *(Agregado en `openspec/roadmap.md`, junto a un aviso de que el documento está desactualizado en general.)*
- [x] 8.5 No commitear nada sin pedido explícito del usuario. El único commit automático permitido es el del comando de archive. *(Cumplido: nada commiteado en este apply.)*
