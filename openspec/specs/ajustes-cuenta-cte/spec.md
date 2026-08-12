### Requirement: Ajuste manual de Cuenta Corriente (Dinero)
El sistema SHALL permitir a los usuarios (con permisos de administración de finanzas/clientes) registrar ajustes manuales sobre el saldo (balance en pesos) de un cliente para reflejar pagos, correcciones o incrementos de deuda.

#### Scenario: Ajuste positivo (aumentar deuda)
- **WHEN** el usuario ingresa un monto positivo en el modal de ajuste de saldo
- **THEN** el sistema incrementa el `balancePesos` del cliente por dicho monto

#### Scenario: Ajuste negativo (registrar pago o descuento)
- **WHEN** el usuario ingresa un monto negativo en el modal de ajuste de saldo
- **THEN** el sistema decrementa el `balancePesos` del cliente (resta el monto)
