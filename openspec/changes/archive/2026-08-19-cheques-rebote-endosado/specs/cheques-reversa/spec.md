## ADDED Requirements

### Requirement: Reversa doble por rebote de cheque endosado
El sistema SHALL, cuando un cheque que fue endosado a un cliente del sistema pasa al estado `RECHAZADO`, ejecutar dos movimientos de cuenta corriente de signo opuesto y por el monto del cheque: MUST aumentar la deuda del cliente original que entregó el cheque al vivero, y MUST acreditar saldo a favor al cliente endosatario, porque el pago que se le realizó con ese cheque quedó sin efecto y el vivero le sigue debiendo ese dinero.

Ambos movimientos SHALL ejecutarse dentro de una misma transacción, de modo que o se aplican los dos junto con el cambio de estado del cheque, o no se aplica ninguno. El sistema SHALL resolver las dos contrapartes antes de modificar el balance de cualquiera de las dos cuentas, de manera que un fallo de resolución no deje una sola de las dos patas aplicada.

Las dos cuentas corrientes SHALL permanecer independientes: un pago posterior a una de ellas no SHALL modificar el saldo de la otra.

#### Scenario: Rebote de un cheque endosado a un cliente
- **WHEN** un usuario marca como `RECHAZADO` un cheque que está en estado `ENTREGADO` y fue endosado a un cliente del sistema
- **THEN** el balance del cliente original disminuye exactamente en el monto del cheque, es decir aumenta su deuda con el vivero
- **AND** el balance del cliente endosatario aumenta exactamente en el monto del cheque, es decir queda con saldo a su favor
- **AND** el cheque queda en estado `RECHAZADO`

#### Scenario: Atomicidad de los dos movimientos
- **WHEN** la operación de rechazo de un cheque endosado falla en cualquier punto posterior a haber modificado la primera de las dos cuentas
- **THEN** ninguna de las dos cuentas corrientes queda modificada
- **AND** el cheque permanece en estado `ENTREGADO`

#### Scenario: El endosatario no es un cliente del sistema
- **WHEN** un usuario marca como `RECHAZADO` un cheque en estado `ENTREGADO` que fue endosado a un tercero de texto libre, sin cliente asociado
- **THEN** el balance del cliente original disminuye exactamente en el monto del cheque
- **AND** ninguna otra cuenta corriente resulta modificada
- **AND** la operación se completa con éxito, sin error

#### Scenario: Las dos cuentas son independientes tras el rebote
- **WHEN** después de un rebote de cheque endosado el vivero le paga al cliente endosatario mediante un ajuste de saldo, cancelando el saldo a favor de éste
- **THEN** el balance del cliente endosatario refleja ese pago
- **AND** la deuda del cliente original permanece sin cambios, y sólo se reduce cuando ese cliente efectivamente le paga al vivero

#### Scenario: El rebote no se aplica dos veces
- **WHEN** se intenta marcar como `RECHAZADO` un cheque que ya está en estado `RECHAZADO`
- **THEN** el sistema rechaza la operación y ninguna cuenta corriente resulta modificada
