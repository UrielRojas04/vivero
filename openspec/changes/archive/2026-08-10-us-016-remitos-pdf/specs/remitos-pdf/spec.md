## ADDED Requirements

### Requirement: Generar comprobante de venta (remito) desde el historial
El sistema SHALL permitir al vendedor generar en memoria (client-side) el comprobante de venta de una venta existente, accionando desde cada fila del historial de ventas. El comprobante SHALL mostrar como mínimo: número de venta/remito, fecha, cliente, vendedor, tabla de ítems (producto, cantidad, precio unitario histórico, subtotal), subtotal, descuento, total final, pagos y estado de pago. La generación no persiste archivos en el servidor ni genera el PDF server-side; el DTO de venta expone ahora `clienteTelefono` para el chat de WhatsApp.

#### Scenario: Vendedor abre el comprobante desde el historial
- **WHEN** el vendedor pulsa el botón de comprobante en la fila de una venta listada
- **THEN** el sistema abre el modal de comprobante con todos los datos de la venta (cabecera, ítems, descuento, total, pagos y estado) renderizados en una vista previa, sin consultas adicionales a la API.

#### Scenario: Ventas vacías en el historial
- **WHEN** el historial no tiene ventas registradas
- **THEN** no se muestra ningún botón de comprobante por fila (la fila no existe) y no hay acción para generar un remito.

### Requirement: Descargar el comprobante como PDF
El sistema SHALL permitir descargar el comprobante de venta como un archivo PDF generado en memoria, con el mismo contenido que la vista previa, usando la librería de generación de PDFs seleccionada (`jspdf`).

#### Scenario: Descarga exitosa de PDF
- **WHEN** el vendedor pulsa "Descargar PDF" con una venta válida
- **THEN** el sistema genera el PDF en memoria y dispara la descarga del archivo con nombre `remito-{nroVenta}.pdf`, mostrando un toast de éxito.

#### Scenario: Error al generar el PDF
- **WHEN** la generación del PDF falla (p. ej. datos de venta incompletos)
- **THEN** el sistema muestra un toast de error por `useUIStore` y no deja un archivo parcial.

### Requirement: Exportar el comprobante como imagen
El sistema SHALL permitir exportar el comprobante de venta como imagen (PNG) generada desde la vista previa del modal, usando la librería de rasterización seleccionada (`html-to-image`).

#### Scenario: Exportación exitosa de imagen
- **WHEN** el vendedor pulsa "Descargar imagen" con una venta válida
- **THEN** el sistema rasteriza la vista previa del comprobante a PNG en memoria y dispara la descarga con nombre `remito-{nroVenta}.png`, mostrando un toast de éxito.

### Requirement: Preparar el envío del comprobante por WhatsApp
El sistema SHALL abrir el chat de WhatsApp del número de teléfono del cliente registrado (expuesto como `clienteTelefono` en `VentaResponseDTO`) cuando esté disponible, con el comprobante listo para enviar. En escritorio (sin `pointer: coarse`) el sistema SHALL copiar el PNG del remito al portapapeles (`navigator.clipboard.write` con `ClipboardItem`) y abrir el deep link `https://web.whatsapp.com/send?phone={telefono}` SIN texto, para que el vendedor pegue la imagen con Ctrl+V; si el portapapeles no está disponible, cae al deep link con el resumen de texto. En dispositivos táctiles (móvil/tablet, `pointer: coarse`) el sistema SHALL intentar compartir el PNG vía Web Share API; si no hay soporte, abre el deep link con el resumen de texto. El fallback sin teléfono SHALL abrir `https://wa.me/?text=...` para que el usuario elija contacto (web.whatsapp.com/send con `phone` vacío no navega). El sistema SHALL mantener una única ventana de WhatsApp con nombre fijo (`whatsapp-remito`) y reutilizarla entre pulsaciones vía `window.open(url, nombre)` en lugar de abrir pestañas nuevas.

#### Scenario: Vendedor pulsa "Enviar por WhatsApp" en escritorio
- **WHEN** el vendedor pulsa "Enviar por WhatsApp" desde el modal de comprobante en un equipo de escritorio (sin `pointer: coarse`) y el portapapeles está disponible
- **THEN** el sistema copia el PNG del remito al portapapeles, abre WhatsApp Web vía deep link con el chat del teléfono del cliente (si está registrado, sin texto precargado), reutilizando la ventana con nombre fijo, y muestra un toast indicando que pegue la imagen con Ctrl+V.

#### Scenario: Vendedor pulsa "Enviar por WhatsApp" en escritorio sin portapapeles
- **WHEN** el portapapeles no está disponible o falla la escritura (API bloqueada, permiso denegado)
- **THEN** el sistema abre el deep link de WhatsApp Web con el resumen de texto precargado como fallback, sin copiar la imagen.

#### Scenario: Compartir archivo por Web Share (solo móvil)
- **WHEN** el dispositivo es táctil (`pointer: coarse`), soporta compartir archivos (Web Share API con `files`) y el vendedor pulsa "Enviar por WhatsApp"
- **THEN** el sistema abre el share sheet del dispositivo con el PNG del remito generado en memoria (y el resumen de texto), mostrando un toast de éxito y sin abrir el deep link de WhatsApp.

#### Scenario: WhatsApp no disponible en el dispositivo
- **WHEN** el dispositivo no puede abrir WhatsApp (ni Web Share está disponible)
- **THEN** el sistema muestra un toast de error sin interrumpir el resto de acciones del modal.