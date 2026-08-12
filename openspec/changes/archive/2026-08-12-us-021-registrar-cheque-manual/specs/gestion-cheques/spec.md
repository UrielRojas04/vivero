## ADDED Requirements

### Requirement: Registro manual de cheques
El sistema SHALL permitir a los usuarios registrar cheques manualmente desde el módulo de Cheques, independientemente de una liquidación de venta.

#### Scenario: Registro exitoso con impacto en cuenta corriente
- **WHEN** el usuario completa el formulario de nuevo cheque seleccionando un cliente y un monto
- **THEN** el sistema persiste el cheque con estado `EN_CARTERA`
- **AND** el saldo (`balanceDinero`) del cliente seleccionado se incrementa por el monto del cheque (se abona a su cuenta)

#### Scenario: Registro sin cliente asociado
- **WHEN** el usuario completa el formulario pero no especifica un cliente (si se permite cheques anónimos)
- **THEN** el sistema persiste el cheque con estado `EN_CARTERA` sin afectar saldos de clientes
