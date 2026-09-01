## ADDED Requirements

### Requirement: Cuenta Operativa Jefe/Colega
El sistema SHALL definir dos cuentas operativas fijas para la unidad Abono — `JEFE` y `COLEGA` — como un conjunto cerrado de valores del dominio. El sistema MUST NOT crear un usuario, credencial, rol ni permiso nuevo para representar al colega: la cuenta operativa es contexto de sesión, no identidad de autenticación.

#### Scenario: Conjunto cerrado de cuentas
- **WHEN** el sistema evalúa las cuentas operativas disponibles para la unidad Abono
- **THEN** existen exactamente dos, `JEFE` y `COLEGA`, y no se pueden crear otras desde la interfaz

#### Scenario: El RBAC no cambia
- **WHEN** se instala el change y se listan usuarios, roles y permisos
- **THEN** el conjunto de usuarios, roles y permisos es idéntico al previo al change

### Requirement: Selección y Persistencia de la Cuenta Activa
El sistema SHALL permitir seleccionar una cuenta activa desde un segundo selector del sidebar, visible ÚNICAMENTE cuando la unidad de negocio activa es Abono. La selección SHALL persistirse en el cliente con el mismo mecanismo que la unidad de negocio activa (estado global + almacenamiento local), sobreviviendo recargas de página, y SHALL tener a `JEFE` como valor por defecto cuando no hay ninguna cuenta guardada.

#### Scenario: Selector visible sólo en Abono
- **WHEN** la unidad de negocio activa es "Abono"
- **THEN** el sidebar muestra el selector de cuenta activa con las opciones "Jefe" y "Colega"

#### Scenario: Selector oculto fuera de Abono
- **WHEN** la unidad de negocio activa es "Vivero" o "Herramientas"
- **THEN** el sidebar no muestra el selector de cuenta activa y ninguna petición lleva contexto de cuenta

#### Scenario: Persistencia entre sesiones
- **WHEN** el usuario selecciona la cuenta "Colega" y recarga la aplicación
- **THEN** la cuenta activa sigue siendo "Colega" sin volver a preguntar

#### Scenario: Valor por defecto
- **WHEN** el usuario entra por primera vez a la unidad "Abono" sin cuenta guardada
- **THEN** la cuenta activa es "Jefe"

#### Scenario: Limpieza al cerrar sesión
- **WHEN** el usuario cierra sesión
- **THEN** la cuenta activa se borra del almacenamiento local junto con el resto del contexto de sesión

### Requirement: Propagación de la Cuenta Activa al Backend
El sistema SHALL propagar la cuenta activa al backend en cada petición mediante un header HTTP dedicado (`X-Cuenta-Abono`), resuelto por un filtro que lo deja disponible como contexto de la petición, siguiendo exactamente el patrón ya usado por `X-Unidad-Negocio`. El contexto SHALL limpiarse al terminar cada petición.

#### Scenario: Header presente en Abono
- **WHEN** el frontend emite una petición con la unidad activa "Abono" y la cuenta activa "Colega"
- **THEN** la petición incluye el header de cuenta con el valor `COLEGA` y el backend lo expone como contexto de la petición

#### Scenario: Header ausente fuera de Abono
- **WHEN** el frontend emite una petición con la unidad activa "Vivero"
- **THEN** la petición no incluye el header de cuenta y el contexto de cuenta en el backend queda vacío

#### Scenario: Header con valor inválido
- **WHEN** llega una petición con un header de cuenta cuyo valor no es `JEFE` ni `COLEGA`
- **THEN** el contexto de cuenta queda vacío y las operaciones que requieren cuenta son rechazadas con un error de validación, sin caer en un valor por defecto silencioso

#### Scenario: Limpieza del contexto entre peticiones
- **WHEN** una petición con cuenta `COLEGA` termina y llega otra sin header de cuenta
- **THEN** la segunda petición ve el contexto de cuenta vacío, sin arrastrar el valor de la anterior

### Requirement: Atribución Automática de Operaciones a la Cuenta Activa
El sistema SHALL atribuir automáticamente toda venta y todo movimiento de stock de Abono a la cuenta activa de la petición. La interfaz MUST NOT presentar ningún selector, campo ni confirmación de "quién vende" por operación. Las ventas de las unidades Vivero y Herramientas MUST quedar sin cuenta atribuida.

#### Scenario: Venta atribuida al colega
- **WHEN** se registra una venta con la unidad activa "Abono" y la cuenta activa "Colega"
- **THEN** la venta queda persistida con la cuenta `COLEGA` sin que el formulario de venta haya pedido esa información

#### Scenario: Venta atribuida al jefe
- **WHEN** se registra una venta con la unidad activa "Abono" y la cuenta activa "Jefe"
- **THEN** la venta queda persistida con la cuenta `JEFE`

#### Scenario: Traslado atribuido a la cuenta activa
- **WHEN** se registra un traslado de bolsas con la cuenta activa "Colega"
- **THEN** el movimiento queda persistido con la cuenta `COLEGA` como responsable

#### Scenario: Venta de otra unidad sin cuenta
- **WHEN** se registra una venta con la unidad activa "Vivero" o "Herramientas"
- **THEN** la venta queda persistida sin cuenta atribuida y su comportamiento es idéntico al previo al change

#### Scenario: Venta de Abono sin contexto de cuenta
- **WHEN** llega una petición de venta con la unidad "Abono" pero sin contexto de cuenta válido
- **THEN** el sistema rechaza la venta con un error de validación explícito y no persiste nada
