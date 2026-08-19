## ADDED Requirements

### Requirement: Autorización de las operaciones de bandejas
Las operaciones sobre el circuito de bandejas de un cliente SHALL exigir autorización explícita, y no SHALL quedar accesibles por el solo hecho de estar autenticado. La consulta del historial de bandejas de un cliente SHALL requerir `LEER_CLIENTES` o `LEER_BANDEJAS`. El registro de una devolución SHALL requerir `ESCRIBIR_CLIENTES` o `ESCRIBIR_BANDEJAS`. La verificación SHALL realizarse en el backend, de modo que ocultar el control en la interfaz no sea el único mecanismo de protección.

#### Scenario: Consulta de historial sin permisos habilitantes
- **WHEN** un usuario autenticado que no tiene `LEER_CLIENTES` ni `LEER_BANDEJAS` invoca directamente el endpoint de historial de bandejas de un cliente
- **THEN** el sistema responde 403 Forbidden y no devuelve ningún movimiento

#### Scenario: Registro de devolución sin permisos habilitantes
- **WHEN** un usuario autenticado que no tiene `ESCRIBIR_CLIENTES` ni `ESCRIBIR_BANDEJAS` invoca directamente el endpoint de devolución de bandejas
- **THEN** el sistema responde 403 Forbidden y no asienta ningún movimiento ni modifica el saldo de bandejas del cliente

#### Scenario: Consulta de historial con permiso de clientes
- **WHEN** un usuario con `LEER_CLIENTES` consulta el historial de bandejas de un cliente
- **THEN** el sistema responde 200 con la lista de movimientos, igual que antes de este cambio

#### Scenario: Registro de devolución con permiso de escritura de clientes
- **WHEN** un usuario con `ESCRIBIR_CLIENTES` registra una devolución de bandejas
- **THEN** el sistema asienta el movimiento y actualiza el saldo, igual que antes de este cambio

#### Scenario: Consulta de historial con permiso acotado de bandejas
- **WHEN** un usuario con `LEER_BANDEJAS` y sin ningún permiso de clientes consulta el historial de bandejas de un cliente
- **THEN** el sistema responde 200 con la lista de movimientos

#### Scenario: Registro de devolución con permiso acotado de bandejas
- **WHEN** un usuario con `ESCRIBIR_BANDEJAS` y sin ningún permiso de clientes registra una devolución
- **THEN** el sistema asienta el movimiento y actualiza el saldo de bandejas del cliente

#### Scenario: Permiso de lectura de bandejas no habilita la escritura
- **WHEN** un usuario que tiene `LEER_BANDEJAS` pero no `ESCRIBIR_BANDEJAS` ni `ESCRIBIR_CLIENTES` intenta registrar una devolución
- **THEN** el sistema responde 403 Forbidden
