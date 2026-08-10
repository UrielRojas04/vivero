## 1. Setup de dependencias

- [x] 1.1 Instalar `jspdf` en `frontend/` (dependencia de producción) para generación de PDF client-side
- [x] 1.2 Instalar `html-to-image` en `frontend/` (dependencia de producción) para exportar PNG desde la vista previa DOM
- [x] 1.3 Verificar que `npm install` actualizó `package.json` y `package-lock.json` (sin eliminar otras dependencias)

## 2. Componente de comprobante

- [x] 2.1 Crear `frontend/src/components/ComprobanteVentaModal.jsx` (PascalCase) con patrón visual y de props de `HistorialBandejasModal.jsx` (`isOpen`, `onClose`, `venta`)
- [x] 2.2 Renderizar la vista previa del remito en el modal: cabecera (nº venta, fecha, cliente, vendedor), tabla de ítems (producto, cantidad, precio unitario histórico, subtotal), descuento, total final, pagos y estado de pago
- [x] 2.3 Implementar acción "Descargar PDF" con `jspdf` (layout A4: encabezado del vivero, tabla de ítems, totales) → download `remito-{nroVenta}.pdf`
- [x] 2.4 Implementar acción "Descargar imagen" con `html-to-image` sobre el nodo de la vista previa → download `remito-{nroVenta}.png`
- [x] 2.5 Implementar acción "Enviar por WhatsApp" armar mensaje resumen (nº venta, fecha, cliente, total, estado) y abrir `https://web.whatsapp.com/send?phone={telefono}` (sin envío automático del archivo)
- [x] 2.6 Feedback UX exclusivamente vía `useUIStore` (`pushToast` success/error; `askConfirm` si aplica) — nunca `alert`/`confirm` nativos; iconos `lucide-react`; `cursor-pointer` en todos los botones

## 3. Wiring en HistorialVentas

- [x] 3.1 Agregar columna de acción en la tabla de `HistorialVentas.jsx` con botón por fila (icono lucide, `cursor-pointer`) que abre `ComprobanteVentaModal` pasando la venta completa
- [x] 3.2 Mantener el estado local del modal (`ventaSeleccionada`/`isModalOpen`) sin romper el render existente (loading, tabla, fila vacía)
- [x] 3.3 Verificar que `listarVentas()` devuelve los datos requeridos y que el modal funciona con `detalles`/`pagos` embebidos sin llamadas extra

## 4. Verificación y prueba manual

- [ ] 4.1 Probar generación de PDF desde una venta real y validar contenido, formato y nombre del archivo
- [ ] 4.2 Probar exportación de imagen PNG y comparar visualmente con la vista previa (colores correctos con Tailwind v4)
- [ ] 4.3 Probar "Enviar por WhatsApp" (abre chat con resumen) y el caso de error si WhatsApp no abre
- [ ] 4.4 Probar historial de ventas vacío: sin botones de comprobante y sin errores en consola
- [x] 4.5 Correr `npm run lint` en `frontend/` y verificar cero errores (sin codegen de build)

## 5. Fixes de verificación manual (scope expandido por pedido del usuario)

- [x] 5.1 Exponer `clienteTelefono` en `VentaResponseDTO` y poblarlo en `mapearAVentaResponseDTO` (backend: 1 campo en DTO + getter/setter manuales + populate en `VentaServiceImpl`, sin tocar repositorios ni transacciones)
- [x] 5.2 Corregir exportación PNG para que capture el remito completo (clon del nodo en wrapper off-screen con `height: auto; max-height: none; overflow: visible` y `width`/`height` explícitos en `toPng`) — verificado por inspección y lint
- [x] 5.3 Reutilizar la misma pestaña de WhatsApp entre pulsaciones (nombre de ventana fijo `whatsapp-remito` + `useRef`, focus/reutilización en vez de `'_blank'`)
- [x] 5.4 Abrir el chat del cliente por `web.whatsapp.com/send?phone={telefono}` cuando existe (`clienteTelefono`); fallback sin número cuando no hay teléfono
- [x] 5.5 Intentar Web Share API con el archivo PNG SOLO en dispositivos táctiles (`pointer: coarse`); en desktop el deep link a WhatsApp Web es siempre la vía (el share sheet nativo de Windows lista apps genéricas y no abre WhatsApp Web)
- [x] 5.6 Copiar el PNG del remito al portapapeles en escritorio (`navigator.clipboard.write` + `ClipboardItem`) y abrir el chat SIN texto para pegar con Ctrl+V; fallback a resumen de texto si el portapapeles no está disponible
- [ ] 5.7 Prueba manual del usuario: verificar descarga de PNG completa (sin recorte) con una venta larga y con colores Tailwind v4 correctos
- [ ] 5.8 Prueba manual del usuario: verificar chat de WhatsApp al número del cliente, imagen copiada al portapapeles lista para pegar (Ctrl+V), reutilización de pestaña y fallback sin teléfono

Nota: las tareas 4.1–4.4 (prueba manual inicial) quedan **pendientes de validación manual del usuario**; no se marcan como completas en este cambio.