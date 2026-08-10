## Why

El vivero registra ventas (us-013-ventas-core) pero no existe ningún comprobante entregable para el cliente: la venta queda confirmada solo en pantalla y por palabra. Para cerrar la transacción comercial, el vendedor necesita poder generar un remito/comprobante de venta en PDF o Imagen, renderizado en memoria (client-side), listo para compartir con el cliente por canales informales (WhatsApp) — sin carga de servidor ni requisitos fiscales (ver ADR-005 en `knowledge-base/09_decisiones_y_supuestos.md`).

## What Changes

- **Nueva capability `remitos-pdf`**: generación en memoria (client-side) del comprobante de venta (PDF o Imagen) con los datos de la venta (cliente, fecha, ítems, cantidades, precios históricos, descuento, total, pagos, estado).
- **Nuevo componente React** `ComprobanteVentaModal` (PascalCase): modal que muestra el remito y permite descargarlo/imprimirlo como PDF o exportarlo como imagen.
- **Wiring en `HistorialVentas.jsx`**: botón por fila de venta que abre el modal con el comprobante de esa venta.
- **Preparación para integración WhatsApp**: botón "Enviar por WhatsApp" que arma el mensaje con un resumen de la venta y abre `https://web.whatsapp.com/send?phone={telefono}` con el número del cliente (el envío real del archivo queda fuera de alcance; ver design.md).
- **Posible dependencia frontend nueva** (a evaluar en design.md): jsPDF (generación nativa de PDF) y/o html2canvas (renderizado de imagen). NO se agrega en este change de proposición — la decisión y su trade-off quedan registrados en design.md.

## Capabilities

### New Capabilities
- `remitos-pdf`: Generación en memoria (client-side) del comprobante de venta (PDF o Imagen) para una venta existente, incluida su preparación para envío por WhatsApp.

### Modified Capabilities
<!-- Sin cambios de requirements a nivel spec. `ventas-core` y `ventas-pagos` no cambian su contrato: la venta se crea y liquida igual; el remito es un consumo posterior y readonly de los datos ya expuestos. -->

## Impact

- **Frontend**:
  - `frontend/src/pages/HistorialVentas.jsx` — agrega botón por fila + estado del modal.
  - `frontend/src/components/ComprobanteVentaModal.jsx` — componente nuevo (UX basada en `HistorialBandejasModal.jsx`; feedback vía `useUIStore`, nunca `alert`/`confirm` nativos; iconos `lucide-react`; `cursor-pointer` en botones).
  - `frontend/src/api/ventas.api.js` — sin cambios funcionales: `listarVentas()` ya devuelve `detalles` y `pagos` embebidos en `VentaResponseDTO`.
  - `frontend/package.json` — **N/A en este change**: la dependencia de PDF (jsPDF/html2canvas) se propone para la fase de implementación (applicable tasks). Hallazgo: `puppeteer` ya figura como dependencia de producción del frontend, pero es server-side y no apta para generar PDFs en el navegador; no se usa.
- **Backend**: CAMBIO MÍNIMO (aditivo, sin lógica de negocio): expone `clienteTelefono` en `VentaResponseDTO` y lo puebla en `mapearAVentaResponseDTO` (necesario para abrir el chat del cliente en WhatsApp; ver design.md D5). El campo `remitoUrl` ya existe en `Venta`/`VentaResponseDTO` pero queda sin uso (se setea a `null`); este change no lo escribe.
- **Dependencias**: evaluar `jspdf` + `html2canvas` (opción nativa) vs `window.print()` con CSS `@media print` (cero dependencias, el navegador "guarda como PDF") — mercado de decisión en design.md.
- **Datos disponibles** (hallazgo): `VentaResponseDTO` expone `clienteNombre`, `clienteTelefono` (agregado en este change para el chat de WhatsApp), `usuarioNombre`, `fecha`, `detalles[]` (producto, cantidad, precio histórico, subtotal), `pagos[]` (monto, método), `subtotal`, `descuento`, `porcentajeDescuento`, `totalFinal`, `estadoPago`. **NO expone**: `clienteId`, CUIT ni dirección del cliente; `bandejasEntregadas` se setea siempre a `null` en `VentaServiceImpl.mapearAVentaResponseDTO`. El remito se construirá con los datos existentes; los faltantes se documentan para un future change (ver design.md).