## MODIFIED Requirements

### Requirement: Generar comprobante de venta (remito) desde el historial
El sistema SHALL permitir al vendedor generar en memoria (client-side) el comprobante de venta de una venta existente, accionando desde cada fila del historial de ventas. El comprobante SHALL mostrar como mínimo: número de venta/remito, fecha, cliente, vendedor, tabla de ítems (producto, cantidad, precio unitario histórico, subtotal), subtotal, descuento, total final, pagos y estado de pago. La generación no persiste archivos en el servidor ni genera el PDF server-side; el DTO de venta expone ahora `clienteTelefono` para el chat de WhatsApp.

El comprobante SHALL mostrar además el DNI y/o el CUIL del comprador cuando la venta tenga alguno, identificado con la etiqueta que corresponde a cada uno. El dato SHALL tomarse indistintamente de la ficha del cliente vinculado o del documento puntual cargado en una venta a cliente casual, de modo que el remito de una venta express de Herramientas exhiba el documento anotado para esa venta aunque no exista un `Cliente` real. Cuando la venta no tiene ningún documento, el comprobante SHALL omitir por completo esas líneas, sin dejar rótulos ni espacios vacíos.

Esta información SHALL aparecer de manera consistente en la vista previa en pantalla y en todas las salidas derivadas del comprobante.

#### Scenario: Vendedor abre el comprobante desde el historial
- **WHEN** el vendedor pulsa el botón de comprobante en la fila de una venta listada
- **THEN** el sistema abre el modal de comprobante con todos los datos de la venta (cabecera, ítems, descuento, total, pagos y estado) renderizados en una vista previa, sin consultas adicionales a la API.

#### Scenario: Comprobante de una venta con cliente que tiene documento
- **WHEN** el vendedor abre el comprobante de una venta cuyo cliente vinculado tiene cargado un DNI, un CUIL, o ambos
- **THEN** la cabecera del comprobante muestra cada documento con su etiqueta correspondiente, junto al nombre y al teléfono del cliente

#### Scenario: Comprobante de una venta express con documento puntual
- **WHEN** el vendedor abre el comprobante de una venta a cliente casual de Herramientas que se registró con un documento puntual
- **THEN** la cabecera del comprobante muestra ese documento con la etiqueta del tipo con que fue cargado, aunque la venta no tenga un cliente vinculado

#### Scenario: Comprobante de una venta sin documento
- **WHEN** el vendedor abre el comprobante de una venta que no tiene ningún documento asociado
- **THEN** el comprobante se muestra completo sin ninguna línea de documento, tal como antes de esta funcionalidad

#### Scenario: Consistencia entre la vista previa y las salidas del comprobante
- **WHEN** el vendedor genera el comprobante en cualquiera de sus formatos de salida a partir de una venta con documento
- **THEN** el documento aparece con la misma etiqueta y el mismo valor que en la vista previa en pantalla

#### Scenario: Ventas vacías en el historial
- **WHEN** el historial no tiene ventas registradas
- **THEN** no se muestra ningún botón de comprobante por fila (la fila no existe) y no hay acción para generar un remito.
