## Purpose
Definir los requerimientos para la gestión global de clientes en el frontend.
## Requirements
### Requirement: Interfaz ABM de Clientes
El sistema MUST proporcionar una interfaz gráfica para listar y gestionar clientes, adaptándose a pantallas móviles. Adicionalmente, MUST incluir de forma clara la visibilidad de los saldos financieros y físicos del cliente.

#### Scenario: Visualización responsiva de la lista con saldos
- **WHEN** un usuario navega a `/clientes`
- **THEN** el sistema hace un fetch a `GET /api/clientes` y muestra una tabla (en pantallas grandes) o una grilla de tarjetas (en pantallas chicas) con la información del cliente, incluyendo columnas o etiquetas indicando los valores actuales de `balancePesos` y `balanceBandejas`.

#### Scenario: Creación de cliente
- **WHEN** un usuario completa el formulario modal de cliente y presiona guardar
- **THEN** el sistema envía `POST /api/clientes`, actualiza la lista exhibiendo los nuevos balances en 0 y cierra el modal con feedback visual positivo.

#### Scenario: Edición de cliente
- **WHEN** un usuario edita un cliente existente
- **THEN** el sistema envía `PUT /api/clientes/{id}` y refresca la UI manteniendo los saldos intactos.

