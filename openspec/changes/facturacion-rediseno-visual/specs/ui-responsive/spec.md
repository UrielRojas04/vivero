## ADDED Requirements

### Requirement: Listado de Facturación Priorizado en Mobile
El frontend SHALL presentar el listado de Facturación en pantallas móviles como tarjetas apiladas de
ancho completo que prioricen el nombre o razón social del cliente y su saldo de cuenta corriente,
manteniendo la tabla completa en escritorio. El listado SHALL NOT requerir scroll horizontal en
ningún ancho de pantalla, y la acción de abrir la factura activa SHALL ser alcanzable sin desplazar
la vista lateralmente.

#### Scenario: Listado en pantalla móvil
- **WHEN** el listado de Facturación se visualiza en una pantalla menor a 768px
- **THEN** cada cliente se presenta como una tarjeta de ancho completo y la tabla permanece oculta
- **THEN** la tarjeta muestra el nombre o razón social y el saldo como los elementos de mayor jerarquía visual
- **THEN** la acción "Factura Activa" se presenta como un botón de ancho completo y área táctil amplia, íntegramente visible sin scroll horizontal

#### Scenario: Listado en pantalla de escritorio
- **WHEN** el listado de Facturación se visualiza en una pantalla mayor o igual a 768px
- **THEN** se presenta como tabla y las tarjetas permanecen ocultas
- **THEN** la tabla ocupa el ancho del contenedor sin necesidad de scroll horizontal

#### Scenario: Ausencia de desborde horizontal
- **WHEN** el listado de Facturación se visualiza en cualquier ancho entre 320px y 1920px
- **THEN** el ancho de scroll del documento no supera su ancho visible
- **THEN** ningún contenedor del listado habilita scroll horizontal

#### Scenario: Coherencia del saldo entre vistas
- **WHEN** el mismo cliente se observa en la tarjeta móvil y en la tabla de escritorio del listado de Facturación
- **THEN** ambas vistas derivan la etiqueta y el tono del saldo de la misma función de presentación compartida que ya usan los demás listados del sistema
- **THEN** ambas vistas muestran la misma etiqueta de estado para el mismo valor de saldo

### Requirement: Teléfono del Cliente en la Tarjeta Móvil de Facturación
El frontend SHALL mostrar el teléfono del cliente como dato secundario en la tarjeta móvil del
listado de Facturación cuando el cliente lo tenga cargado, y SHALL omitir la línea cuando no lo
tenga.

#### Scenario: Cliente con teléfono cargado
- **WHEN** un cliente con teléfono cargado aparece en el listado móvil de Facturación
- **THEN** su tarjeta muestra el teléfono como línea secundaria bajo el nombre

#### Scenario: Cliente sin teléfono cargado
- **WHEN** un cliente cuyo teléfono está vacío o nulo aparece en el listado móvil de Facturación
- **THEN** su tarjeta no muestra ninguna línea de teléfono ni un espacio reservado vacío
