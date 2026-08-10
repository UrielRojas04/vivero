## Context

El vivero ya cuenta con el núcleo transaccional de ventas (`us-013-ventas-core`): `Venta` con `VentaDetalle` (precio unitario histórico), `Pago`, estados de pago y descuentos. El frontend lista las ventas en `HistorialVentas.jsx` vía `ventasApi.listarVentas()`, cuyo `VentaResponseDTO` ya incluye `detalles[]` y `pagos[]` embebidos — suficientes para construir el comprobante. El único cambio backend requerido por este change es exponer `clienteTelefono` (ver D5).

La regla de negocio (ADR-005, `knowledge-base/09_decisiones_y_supuestos.md`) fija: comprobante informal, **generado en el cliente (browser)**, sin requisitos fiscales/AFIP. El vendedor necesita entregarlo al cliente por canales informales (WhatsApp).

Hallazgos del repositorio que condicionan el diseño:
- `frontend/package.json` **no tiene** librería de generación de PDF ni de rasterización. Sí figura `puppeteer` como dependencia de producción, pero **no se importa en ningún source file** (dependencia residual y server-side, inapta para correr en el browser). **No se agregan dependencias en este change de proposición**; la instalación es tarea de la fase de implementación (tasks).
- `VentaResponseDTO` NO expone `clienteId`, CUIT ni dirección del cliente. `bandejasEntregadas` se setea a `null` en `VentaServiceImpl.mapearAVentaResponseDTO`. El remito se arma con los datos disponibles; lo que falte para WhatsApp se documenta como Open Question. Nota: el teléfono del cliente NO estaba expuesto y fue la única brecha backend; se resolvió en este change exponiendo `clienteTelefono` (ver D5).
- La UX de modales del proyecto (ver `HistorialBandejasModal.jsx`) y el feedback global `useUIStore` (`pushToast`/`askConfirm`) definen las convenciones a seguir. Reglas duras del repo: iconos `lucide-react`, `cursor-pointer` en botones, componentes PascalCase, NUNCA `alert`/`confirm` nativos.

## Goals / Non-Goals

**Goals:**
- Generar en memoria (client-side) un comprobante de venta (remito) a partir de una venta existente, con: cabecera (nº remito/venta, fecha, cliente, vendedor), tabla de ítems (producto, cantidad, precio histórico, subtotal), descuento, total final, pagos y estado de pago.
- Permitir al vendedor **descargar** el remito como **PDF**, **exportarlo como imagen (PNG)**, e **imprimirlo** (si el navegador lo permite).
- **Preparar la integración con WhatsApp**: al pulsar "Enviar por WhatsApp" se arma el mensaje con un resumen del remito y se abre `https://web.whatsapp.com/send?phone={telefono}` — con el número del cliente registrado cuando existe (abre directo al chat si hay sesión de WhatsApp Web), o sin número (el usuario elige contacto) como fallback.
- Cambio backend mínimo: 1 campo nuevo en `VentaResponseDTO` (`clienteTelefono`) + su populate en el mapper, sin lógica de negocio ni repositorios (ver D5).

**Non-Goals:**
- NO generar el PDF en el servidor ni persistir `remitoUrl` en base de datos (el campo ya existe en `Venta`/`VentaResponseDTO` pero queda sin uso, siempre `null`).
- NO hacer el envío automático del archivo por WhatsApp (el entregable es abrir el chat con el resumen; el archivo PNG se comparte vía Web Share API SOLO en dispositivos táctiles, no en desktop) — ver D5. El envío directo server-side y la normalización AR del teléfono quedan para future changes.
- NO implementar comprobantes fiscales (factura electrónica AFIP).
- NO refactor de `NuevaVenta.jsx` ni del flujo de creación de venta.

## Decisions

### D1 — Generación client-side, con cambio backend mínimo
El remito se renderiza y serializa íntegramente en el navegador usando el `VentaResponseDTO` ya existente. El campo `remitoUrl` se deja `null` (no se escribe); no hay endpoint nuevo. El único cambio backend es exponer `clienteTelefono` en el DTO (ver D5) — 1 campo + populate, sin tocar repositorios ni transacciones, y compatible con los consumers JSON existentes (campo aditivo opcional).
*Alternativa descartada:* generación server-side (Puppeteer) + persistencia de URL (`remitoUrl`). Requería backend, almacenamiento y pasos de red adicionales; contradice ADR-005 ("orientada a uso interno/informal, renderizada del lado del cliente").

### D2 — Librería de generación del archivo: `jspdf` (PDF) + `html-to-image` (PNG)
- **PDF**: `jspdf` con las tablas armadas programáticamente (opcional addon `jspdf-autotable`). Produce un blob descargable real, con control de layout (A4, márgenes, encabezado del vivero).
- **Imagen**: `html-to-image` clona el nodo DOM del remito — ya renderizado como vista previa en el modal — a un `dataURL` PNG. Tiene mejor soporte de Tailwind v4 que `html2canvas` (que falla con `oklch`/`color-mix` que Tailwind v4 emite). La vista previa DOM como única fuente de verdad garantiza que pantalla, PNG y PDF muestren el mismo contenido.
- **¿Por qué no `window.print()` con CSS `@media print` solo?** Es la opción de cero dependencias y el navegador permite "Guardar como PDF", pero (a) no permite exportar PNG/imagen directamente (requisito del change: "PDF **o Imagen**") y (b) abre el diálogo nativo de impresión, poco mobile-friendly y dependiente del dispositivo. Se conserva opcionalmente como acción de conveniencia dentro del modal, no como generador principal.

### D3 — UX: botón por fila en `HistorialVentas` → `ComprobanteVentaModal`
- En cada fila de la tabla de ventas se agrega una columna de acción con un botón de icono (lucide-react, `cursor-pointer`) que abre el modal del comprobante de esa venta pasándole la `venta` completa.
- `ComprobanteVentaModal.jsx` (PascalCase, patrón visual de `HistorialBandejasModal.jsx`): vista previa del remito + barra de acciones [Descargar PDF] [Descargar imagen] [Enviar por WhatsApp] [Cerrar]. Feedback de éxito/error con `pushToast`, y confirmación de envío WhatsApp con `askConfirm` si corresponde — nunca `alert`/`confirm` nativos.

### D4 — Datos del comprobante
Se consumen los campos ya provistos por `VentaResponseDTO`: `id`, `fecha`, `clienteNombre`, `clienteTelefono`, `usuarioNombre` (vendedor), `subtotal`, `porcentajeDescuento`, `descuento`, `totalFinal`, `estadoPago`, `detalles[]` (productoNombre, cantidad, precioUnitarioHistorico, subtotal), `pagos[]` (monto, metodoPago). Todos ya llegan en `ventasApi.listarVentas()`; no se agrega ningún endpoint.

### D5 — Chat por número del cliente + Web Share API
- **Backend**: `VentaResponseDTO` expone `clienteTelefono`, poblado en `mapearAVentaResponseDTO` desde `venta.getCliente().getTelefono()`. Cambio mínimo y aditivo: no rompe los consumers JSON existentes ni requiere migraciones.
- **Frontend**: el botón "Enviar por WhatsApp" arma `web.whatsapp.com/send?phone={telefono}` con el teléfono del cliente registrado (normalizado conservadoramente a dígitos; ver supuesto en "Open Questions / Supuestos"). Usar la URL de WhatsApp Web (`web.whatsapp.com/send`) permite entrar directo al chat del número si ya hay una sesión de WhatsApp Web iniciada, en vez de las pantallas intermedias de `wa.me`.
- **Web Share (solo móvil)**: Web Share con archivos solo se intenta en dispositivos táctiles (detección `window.matchMedia('(pointer: coarse)').matches`). En escritorio el share sheet nativo (Windows/macOS) lista apps genéricas (Gmail, WhatsApp app, etc.) y NO navega a WhatsApp Web — por eso en desktop el deep link es SIEMPRE la vía. Si se detecta `navigator.canShare({ files })`, se intenta el share sheet con el PNG del remito (`navigator.share`), reutilizando el helper de captura PNG (`generarPngDePreview`). Si no hay soporte, el usuario cancela el share (`AbortError`) o falla, hace fallback al deep link de WhatsApp.
- **Portapapeles (solo escritorio)**: los deep links de WhatsApp Web solo precargan texto, no pueden adjuntar archivos. Para dejar la imagen "lista para enviar" en desktop, el flujo copia el PNG al portapapeles (`navigator.clipboard.write` + `ClipboardItem` de tipo `image/png`) y abre el chat SIN texto; el vendedor pega la imagen con Ctrl+V. Si el portapapeles no está disponible o falla, cae al deep link con el resumen de texto.
- **Reutilización de pestaña**: se mantiene la referencia DIRECTA de la ventana abierta en una variable a nivel de módulo `let ventanaWhatsAppAbierta` (no `useRef`: el componente se desmonta al cerrar el modal y perdería la referencia). En cada pulsación, si la referencia sigue viva se navega la misma pestaña con `location.href` (permitido cross-origin para una ventana abierta por el propio script) y se enfoca; solo si no existe o fue cerrada se crea con `window.open(url, NOMBRE_VENTANA_WHATSAPP)`. NO se usa `window.open('', NOMBRE)` para recuperarla: el nombre de ventana se pierde cuando WhatsApp redirige cross-origin (`web.whatsapp.com/send` → `web.whatsapp.com/`), lo que causaba pestañas duplicadas.
- **Supuesto documentado**: la normalización del teléfono NO aplica prefijo de país por ahora (fix conservador: extrae dígitos y quita el prefijo `00`). La normalización AR completa (agregar `549` para móviles, etc.) queda para el future change `us-017-finanzas-ui`.
- **Riesgo de fallback sin número**: `web.whatsapp.com/send` con `phone` vacío NO navega; por eso, sin teléfono el sistema usa `https://wa.me/?text=...` (el usuario elige contacto). Con teléfono usa la URL de WhatsApp Web directa.
- **Riesgo de rasterización**: el PNG se captura sobre un clon del nodo inyectado en un wrapper off-screen (`position: fixed; left: -99999px`) con `height: auto; max-height: none; overflow: visible` y `width`/`height` explícitos, para evitar que el contenedor `overflow-y-auto`/`max-h-[90vh]` del modal recorte la imagen larga.

## Risks / Trade-offs

- **[jspdf + html-to-image] Costo de 2 dependencias nuevas** → Mitigación: son las opciones client-side estándar y livianas; se instalan en la fase de implementación y se declaran. Trade-off frente a `window.print()`: más control y PNG real a cambio de dependencias.
- **[html2canvas/oklch] La rasterización DOM puede alterar colores** → Mitigación: se elige `html-to-image` (usa SVG foreignObject, mejor con Tailwind v4); se verifica visualmente en la prueba manual.
- **[Cliente sin teléfono] El botón WhatsApp puede quedar sin número** → Ya no aplica en el mismo grado: el teléfono del cliente se expone vía `clienteTelefono` (D5) y el chat abre directo al número registrado. El fallback sin número queda solo cuando el cliente no tiene teléfono cargado (`web.whatsapp.com/send` sin número, el usuario elige contacto).
- **[Web Share no soportado / desktop] El dispositivo no comparte archivos o muestra share sheet genérico** → Mitigación: la Web Share API se usa SOLO en dispositivos táctiles (`pointer: coarse`) donde lista WhatsApp app correctamente; en escritorio nunca se abre el share sheet (el deep link de WhatsApp Web es la vía). Si `navigator.canShare({ files })` es false o falla en móvil, se hace fallback al deep link con resumen de texto.
- **[Sin CUIT/domicilio] Remito incompleto para fines formales** → Mitigación: es aceptado por ADR-005 (comprobante informal); se documenta como hallazgo para `us-017-finanzas-ui` o future change.

## Migration Plan

- Backend (mínimo y aditivo): 1 campo nuevo en `VentaResponseDTO` (`clienteTelefono`) + populate en `mapearAVentaResponseDTO`. Compatible con los consumers JSON existentes (campo opcional; no rompe respuestas). Sin migración de datos ni cambios de schema.
- Frontend: dependencias ya instaladas (`jspdf`, `html-to-image`) y componente `ComprobanteVentaModal.jsx` con fixes de captura PNG completa, reutilización de pestaña WhatsApp y chat por número del cliente. Rollback: quitar el botón y el componente + el campo extra del DTO; no afecta el registro de ventas existente.

## Open Questions

- ¿Se debe persistir `remitoUrl` (generación server-side) en algún momento, o el client-side lo reemplaza definitivamente? (ADR-005 apunta a client-side; el campo queda como residuo).
- ~~¿El botón WhatsApp debe incluir el número del cliente? Requiere exponer `clienteId` (o el teléfono) en `VentaResponseDTO` — fuera de alcance de este change; decisión en el future change de integración WhatsApp.~~ → **RESUELTA en este change (D5)**: por pedido del usuario se expone `clienteTelefono` en `VentaResponseDTO` y el botón abre el chat del cliente.

## Supuestos

- **Normalización del teléfono**: conservadora y sin prefijo de país por ahora. Se extraen solo dígitos; si el número arranca con `00` se quita ese prefijo (equivalente a prefijo internacional). NO se agrega el prefijo país AR (`549`) en este change — la normalización AR completa queda para `us-017-finanzas-ui` (documentado en D5).