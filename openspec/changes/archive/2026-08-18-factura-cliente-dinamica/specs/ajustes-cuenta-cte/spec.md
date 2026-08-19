## MODIFIED Requirements

### Requirement: Ajuste manual de Cuenta Corriente (Dinero)
El sistema SHALL permitir a los usuarios (con permisos de administración de finanzas/clientes) registrar ajustes manuales sobre el saldo (balance en pesos) de un cliente para reflejar pagos, correcciones o incrementos de deuda. El monto recibido SHALL sumarse al `balancePesos` del cliente, respetando la convención de signo vigente en el sistema y expuesta por `describirSaldo`: un balance negativo significa que el cliente debe, un balance positivo significa saldo a favor. En consecuencia, un ajuste de monto positivo reduce la deuda o aumenta el saldo a favor, y un ajuste de monto negativo aumenta la deuda. El ajuste manual SHALL registrarse únicamente como una mutación del balance: el sistema no persiste la fecha, el motivo ni ningún otro dato del ajuste individual, por lo que estos movimientos no son desglosables en documentos itemizados de cuenta corriente.

#### Scenario: Ajuste positivo (registrar un pago)
- **WHEN** el usuario registra un pago desde el modal de ajuste de saldo, lo que envía un monto positivo
- **THEN** el sistema suma dicho monto al `balancePesos` del cliente, reduciendo su deuda o aumentando su saldo a favor

#### Scenario: Ajuste negativo (aumentar la deuda)
- **WHEN** el usuario registra una nueva deuda desde el modal de ajuste de saldo, lo que envía un monto negativo
- **THEN** el sistema resta dicho monto del `balancePesos` del cliente, aumentando su deuda o reduciendo su saldo a favor

#### Scenario: El ajuste no deja rastro itemizado
- **WHEN** se consulta posteriormente el detalle de los movimientos que componen el saldo de ese cliente
- **THEN** el ajuste manual no aparece como un movimiento individual con fecha y motivo, y sólo se refleja de forma agregada como diferencia entre el saldo real y lo que suman las ventas y pagos registrados
