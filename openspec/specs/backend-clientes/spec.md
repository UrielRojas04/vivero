## Purpose
Definir los requerimientos para la gestión global de clientes en el backend.

## Requirements

### Requirement: CRUD Global de Clientes
El sistema MUST proveer endpoints REST para crear, leer, actualizar y eliminar clientes. La entidad Cliente MUST ser global, es decir, no filtrada por la `UnidadNegocio` del usuario que realiza la petición. Además, todo nuevo cliente MUST inicializar sus Cuentas Corrientes con saldo 0.

La entidad Cliente MUST además admitir dos identificadores formales opcionales e independientes entre sí, `dni` y `cuil`, ambos representados como texto y ambos nulables. Un cliente MUST poder existir sin ninguno de los dos, con uno solo, o con los dos a la vez. El sistema MUST NOT exigir ni validar formato, longitud ni dígito verificador sobre esos valores, y MUST NOT imponer unicidad sobre ellos. El DTO de cliente MUST exponer ambos campos tanto en las respuestas de lectura como aceptarlos en los payloads de creación y actualización; el sistema MUST NOT devolver la entidad JPA directamente.

Un valor de documento recibido en blanco o compuesto solo por espacios MUST persistirse como nulo, de modo que la ausencia de dato se represente de una única manera.

El endpoint de creación MUST estar disponible además para los roles habilitados a registrar ventas, para permitir el alta de un cliente desde la pantalla de venta sin depender de otro rol.

#### Scenario: Listar clientes
- **WHEN** un usuario autenticado hace `GET /api/clientes`
- **THEN** el sistema devuelve una lista JSON con todos los clientes de la base de datos, incluyendo los saldos de sus cuentas corrientes a través del DTO, y el `dni` y `cuil` de cada cliente cuando estén cargados.

#### Scenario: Crear cliente
- **WHEN** un usuario autenticado envía un `POST /api/clientes` con un JSON válido
- **THEN** el sistema persiste el nuevo cliente e instancia automáticamente en 0 sus respectivas `CuentaCorrienteDinero` y `CuentaCorrienteBandejas`, devolviendo `201 Created` con los datos del cliente.

#### Scenario: Crear cliente con documento
- **WHEN** un usuario envía un `POST /api/clientes` con `nombreRazonSocial` y además un `dni`, un `cuil`, o ambos
- **THEN** el sistema persiste esos valores tal como fueron enviados y los devuelve en la respuesta junto con el resto de los datos del cliente

#### Scenario: Crear cliente sin ningún documento
- **WHEN** un usuario envía un `POST /api/clientes` sin `dni` ni `cuil`, o con esos campos vacíos
- **THEN** el sistema crea el cliente igualmente y ambos documentos quedan nulos, sin error de validación

#### Scenario: Alta de cliente desde un rol de ventas
- **WHEN** un usuario cuyo rol tiene permiso de escritura de ventas pero no permiso de escritura de clientes envía un `POST /api/clientes`
- **THEN** el sistema autoriza la operación y crea el cliente

#### Scenario: Actualizar cliente
- **WHEN** un usuario envía un `PUT /api/clientes/{id}`
- **THEN** el sistema actualiza los datos del cliente, incluidos `dni` y `cuil` si vienen en el payload, asegurando mantener la referencia a sus cuentas corrientes, y devuelve `200 OK`.

#### Scenario: Corregir el documento de un cliente ya existente
- **WHEN** un usuario envía un `PUT /api/clientes/{id}` cambiando el valor de `dni` o de `cuil`, o vaciándolo
- **THEN** el sistema persiste el nuevo valor, o lo deja nulo si se envió vacío, sin alterar los saldos de las cuentas corrientes del cliente

#### Scenario: Eliminar cliente (Temporal)
- **WHEN** un usuario envía un `DELETE /api/clientes/{id}`
- **THEN** el sistema borra físicamente al cliente de la base de datos junto con sus cuentas corrientes (Cascade Delete). *(Nota: este comportamiento cambiará en futuras features cuando se asocien ventas).*

### Requirement: Agenda de Clientes Compartida en Abono
El directorio de clientes de una unidad de negocio MUST estar delimitado únicamente por la unidad de negocio. En la unidad Abono, donde las operaciones se atribuyen a una cuenta operativa (`JEFE` o `COLEGA`), el sistema MUST NOT usar esa cuenta como criterio de visibilidad, pertenencia ni filtrado de clientes: ambos usuarios MUST ver y operar sobre la misma agenda, exactamente igual que en las unidades que no tienen cuentas operativas.

En consecuencia, el listado de clientes, la lectura de un cliente por id, su actualización, su baja, el ajuste manual de su saldo y la generación de su resumen de cuenta corriente MUST resolverse con el mismo criterio en Abono que en el resto de las unidades. Un cliente dado de alta por cualquiera de los dos usuarios MUST quedar inmediatamente disponible para el otro, sin recrearlo, tanto para vender como para facturar y cobrar. El sistema MUST NOT persistir en el cliente ninguna atribución de cuenta operativa al momento del alta.

Esta unificación aplica **solo al directorio de clientes**. La atribución de ventas, pagos, movimientos de stock de Abono y rendición del colega a la cuenta operativa MUST permanecer intacta: cada cuenta sigue teniendo sus propias ventas, su propio stock y su propia rendición.

#### Scenario: Listado compartido entre las dos cuentas
- **WHEN** existe un cliente de la unidad Abono y se solicita el listado de clientes, primero con la cuenta `JEFE` activa y luego con la cuenta `COLEGA` activa
- **THEN** el cliente aparece en ambos listados, y ambos listados contienen el mismo conjunto de clientes de la unidad

#### Scenario: Lectura por id desde la otra cuenta
- **WHEN** un cliente de Abono fue dado de alta con la cuenta `JEFE` activa y luego se lo consulta por su id con la cuenta `COLEGA` activa
- **THEN** el sistema devuelve el cliente con sus datos y saldos, sin error de pertenencia

#### Scenario: Alta sin atribución de cuenta
- **WHEN** se crea un cliente en la unidad Abono con una cuenta operativa activa en el contexto de la petición
- **THEN** el cliente queda asociado únicamente a la unidad de negocio Abono y el sistema no le asigna ninguna cuenta operativa

#### Scenario: Operar sobre un cliente cargado por el otro usuario
- **WHEN** un cliente de Abono fue creado con la cuenta `JEFE` activa y, con la cuenta `COLEGA` activa, se lo actualiza, se le ajusta el saldo y se le abre una factura
- **THEN** las tres operaciones se aplican sobre ese mismo cliente y su cuenta corriente, sin necesidad de crear un cliente duplicado

#### Scenario: Cliente creado desde una venta express queda visible
- **WHEN** en Abono se registra una venta con alta de cliente express (no casual) y luego se solicita el listado de clientes con cualquiera de las dos cuentas activas
- **THEN** ese cliente aparece en el listado para ambas cuentas

#### Scenario: Aislamiento entre unidades de negocio intacto
- **WHEN** se solicita el listado de clientes con una unidad de negocio distinta de Abono en contexto
- **THEN** el sistema devuelve únicamente los clientes de esa unidad y ningún cliente de Abono

#### Scenario: Ventas, stock y rendición siguen particionados por cuenta (guarda de regresión)
- **WHEN** con la agenda de clientes ya compartida se registran ventas de Abono bajo la cuenta `JEFE` y bajo la cuenta `COLEGA` sobre el mismo cliente, y luego se listan las ventas con una de las dos cuentas activa
- **THEN** el listado devuelve únicamente las ventas de la cuenta activa, y el stock de Abono y la rendición del colega siguen calculándose por cuenta, sin verse afectados por que el cliente sea compartido

