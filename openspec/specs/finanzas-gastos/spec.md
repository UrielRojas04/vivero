### Requirement: Registro de Gastos Financieros
El sistema SHALL permitir al usuario crear, listar y visualizar registros de gastos de forma independiente a las ventas. Cada gasto debe tener un concepto, un monto y una fecha asociada.

#### Scenario: Creación de nuevo gasto
- **WHEN** un usuario con permiso `ADMIN_DB` completa el formulario de nuevo gasto y lo envía
- **THEN** el sistema registra el gasto, recalcula los totales financieros y actualiza la lista de gastos mostrándolo al inicio (orden descendente).

#### Scenario: Listado de gastos por fecha descendente
- **WHEN** un usuario con permiso `ADMIN_DB` visualiza la sección de gastos
- **THEN** el sistema devuelve la lista paginada de gastos del período, ordenados por fecha de creación o ID en orden descendente.
