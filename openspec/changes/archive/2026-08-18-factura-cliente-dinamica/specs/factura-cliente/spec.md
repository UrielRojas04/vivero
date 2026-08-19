## ADDED Requirements

### Requirement: Consulta consolidada de la cuenta de un cliente
El sistema SHALL exponer el endpoint `GET /api/clientes/{id}/factura`, protegido por el permiso `LEER_CLIENTES`, que devuelve un `FacturaClienteDTO` con los datos del cliente, la lista completa de sus ventas ordenada por fecha descendente (cada una con sus ítems y sus pagos), los totales agregados y el saldo de su cuenta corriente. La consulta SHALL filtrar por la unidad de negocio activa (`UnidadNegocioContextHolder`) del mismo modo que el resto de las consultas del sistema, y SHALL excluir las ventas dadas de baja por soft delete. El endpoint SHALL ser de sólo lectura: no modifica ventas, pagos ni saldos.

#### Scenario: Cliente con ventas registradas
- **WHEN** un usuario con permiso `LEER_CLIENTES` consulta la factura de un cliente que tiene ventas en la unidad de negocio activa
- **THEN** el sistema devuelve `200` con el `FacturaClienteDTO` conteniendo todas esas ventas ordenadas de la más reciente a la más antigua, cada una con su lista de ítems y su lista de pagos, junto con los totales agregados y el saldo de la cuenta corriente.

#### Scenario: Cliente sin ventas registradas
- **WHEN** se consulta la factura de un cliente que existe pero todavía no tiene ninguna venta en la unidad de negocio activa
- **THEN** el sistema devuelve `200` con la lista de ventas vacía, `totalVentas` y `totalPagado` en cero, y el `balanceDinero` real de la cuenta corriente del cliente.

#### Scenario: Cliente inexistente
- **WHEN** se consulta la factura de un ID de cliente que no existe o que no pertenece a la unidad de negocio activa
- **THEN** el sistema responde con error, sin devolver un documento vacío que pueda confundirse con un cliente sin movimientos.

#### Scenario: Usuario sin permiso de lectura de clientes
- **WHEN** un usuario cuyo rol no incluye `LEER_CLIENTES` intenta consultar la factura de un cliente
- **THEN** el sistema deniega el acceso y no devuelve ningún dato de la cuenta del cliente.

### Requirement: Cálculo de totales y conciliación contra el saldo de cuenta corriente
El `FacturaClienteDTO` SHALL incluir `totalVentas` (suma de los `totalFinal` de las ventas listadas), `totalPagado` (suma de los montos de todos los pagos de esas ventas), `saldoSegunVentas` (calculado como `totalPagado − totalVentas`), `balanceDinero` (el `balancePesos` de la `CuentaCorrienteDinero` del cliente) y `diferenciaNoItemizada` (calculada como `balanceDinero − saldoSegunVentas`). Todos los montos SHALL respetar la convención de signo vigente en el sistema: negativo significa que el cliente debe, positivo significa saldo a favor. Los totales SHALL calcularse en el backend, no en el frontend.

#### Scenario: Cliente cuyo saldo se explica íntegramente por sus ventas y pagos
- **WHEN** el cliente nunca tuvo ajustes manuales de saldo, cheques sueltos, reversas de cheques ni ventas dadas de baja
- **THEN** `diferenciaNoItemizada` es cero y el saldo mostrado coincide exactamente con la resta entre lo pagado y lo comprado.

#### Scenario: Cliente con movimientos de saldo que no provienen de una venta
- **WHEN** el saldo de la cuenta corriente del cliente fue modificado por un ajuste manual, un cheque suelto, una reversa de cheque rechazado o una venta dada de baja
- **THEN** `diferenciaNoItemizada` refleja esa diferencia con un valor distinto de cero, de modo que el documento pueda declararla en lugar de mostrar un total que no cierra.

#### Scenario: Cliente con saldo a favor
- **WHEN** el cliente pagó más de lo que compró
- **THEN** `saldoSegunVentas` y `balanceDinero` son positivos, y el documento los presenta como saldo a favor y no como deuda.

### Requirement: Documento de cuenta corriente del cliente en la interfaz
El sistema SHALL ofrecer, desde el listado de clientes, una acción que abre un documento consolidado del cliente. El documento SHALL mostrar: cabecera con el nombre del cliente, su teléfono, la fecha de generación y la cantidad de ventas incluidas; una sección por cada venta con su fecha, su número, la tabla de ítems (producto, cantidad, precio unitario histórico y subtotal) y el total de esa venta; el detalle consolidado de los pagos recibidos con su fecha, método y venta asociada; y un cierre con el total comprado, el total pagado, los otros movimientos de cuenta corriente cuando existan, y el saldo final. El saldo final SHALL presentarse usando la función compartida `describirSaldo` para su etiqueta y su color, sin reimplementar la lógica de deuda o saldo a favor.

#### Scenario: Apertura del documento desde el listado de clientes
- **WHEN** el usuario pulsa la acción de cuenta corriente sobre un cliente del listado
- **THEN** el sistema consulta la factura de ese cliente y abre el documento con todas sus ventas, ítems, pagos y totales renderizados en la vista previa.

#### Scenario: Cliente sin ventas
- **WHEN** el documento se abre para un cliente que no tiene ninguna venta registrada
- **THEN** el documento se muestra igualmente, indicando que no hay ventas registradas y presentando el saldo actual de la cuenta corriente del cliente.

#### Scenario: Error al consultar la factura
- **WHEN** la consulta al backend falla
- **THEN** el sistema informa el error mediante `useUIStore` y no deja el documento abierto con datos incompletos o parciales.

#### Scenario: El documento no expone información de costos
- **WHEN** se renderiza cualquier ítem de cualquier venta dentro del documento
- **THEN** no se muestran el costo unitario histórico, el costo base histórico ni los porcentajes históricos de descuento y envío, aunque el DTO los transporte, porque es un documento que se le entrega al cliente.

### Requirement: Declaración de los movimientos no itemizables
El documento SHALL mostrar una línea explícita de otros movimientos de cuenta corriente cuando `diferenciaNoItemizada` sea distinta de cero, indicando que el saldo incluye movimientos que no provienen de una venta y por lo tanto no pueden desglosarse ítem por ítem. El saldo final presentado SHALL ser siempre el `balanceDinero` de la cuenta corriente, por ser el valor autoritativo del sistema.

#### Scenario: Existen movimientos no itemizados
- **WHEN** `diferenciaNoItemizada` es distinta de cero
- **THEN** el documento incluye una línea con ese monto, rotulada de forma que quede claro que corresponde a ajustes manuales o cheques, y el saldo final sigue coincidiendo con el saldo real de la cuenta corriente.

#### Scenario: No existen movimientos no itemizados
- **WHEN** `diferenciaNoItemizada` es cero
- **THEN** la línea de otros movimientos no se renderiza, para no ensuciar el documento con un renglón en cero.

### Requirement: Descargar el documento como PDF
El sistema SHALL permitir descargar el documento de cuenta corriente como un archivo PDF generado en memoria en el navegador, con la librería `jspdf` ya presente en el proyecto, sin generar ni persistir el archivo en el servidor. El PDF SHALL contener el mismo contenido que la vista previa y SHALL manejar el salto de página de forma que ninguna sección de venta quede con su encabezado cortado al pie de la hoja.

#### Scenario: Descarga exitosa del PDF
- **WHEN** el usuario pulsa la acción de descargar PDF con un documento válido
- **THEN** el sistema genera el PDF en memoria y dispara la descarga con un nombre que identifica al cliente, mostrando un aviso de éxito.

#### Scenario: Documento con muchas ventas
- **WHEN** el documento incluye más ventas de las que entran en una hoja
- **THEN** el PDF continúa en las páginas siguientes sin cortar el encabezado de ninguna sección de venta y sin superponer contenido.

#### Scenario: Error al generar el PDF
- **WHEN** la generación del PDF falla
- **THEN** el sistema informa el error mediante `useUIStore` y no deja un archivo parcial descargado.

### Requirement: Exportar y compartir el documento como imagen
El sistema SHALL permitir exportar el documento como imagen PNG rasterizada desde la vista previa con la librería `html-to-image`, y SHALL permitir enviarlo por WhatsApp, replicando el comportamiento ya establecido para el comprobante de venta: en dispositivos táctiles intenta compartir el archivo mediante la Web Share API, y en escritorio copia la imagen al portapapeles y abre el chat de WhatsApp del teléfono del cliente, cayendo al resumen de texto si el portapapeles no está disponible.

#### Scenario: Exportación de la imagen sin recorte en pantallas chicas
- **WHEN** el usuario exporta la imagen desde un dispositivo con pantalla angosta
- **THEN** el sistema rasteriza el documento sobre un clon fuera de pantalla con un ancho mínimo suficiente, de modo que la imagen resultante no queda recortada.

#### Scenario: Envío por WhatsApp en dispositivo táctil
- **WHEN** el usuario pulsa la acción de WhatsApp en un dispositivo táctil que soporta compartir archivos
- **THEN** el sistema abre el panel nativo de compartir con la imagen del documento adjunta y el resumen de la cuenta como texto.

#### Scenario: Envío por WhatsApp en escritorio
- **WHEN** el usuario pulsa la acción de WhatsApp en un equipo de escritorio con portapapeles disponible
- **THEN** el sistema copia la imagen del documento al portapapeles, abre el chat de WhatsApp del teléfono del cliente registrado y avisa al usuario que pegue la imagen.

#### Scenario: Cliente sin teléfono registrado
- **WHEN** el cliente no tiene teléfono cargado y el usuario pulsa la acción de WhatsApp
- **THEN** el sistema abre WhatsApp sin destinatario preseleccionado para que el usuario elija el contacto, sin bloquear la acción.

### Requirement: Aviso ante un historial excesivamente largo
El documento SHALL mostrar un aviso cuando el cliente tenga más de 200 ventas registradas, indicando que el historial es extenso, sin impedir la generación del documento ni alterar los totales.

#### Scenario: Cliente con historial extenso
- **WHEN** el documento se genera para un cliente con más de 200 ventas
- **THEN** el documento incluye un aviso sobre la extensión del historial y aun así muestra todas las ventas y los totales completos.
