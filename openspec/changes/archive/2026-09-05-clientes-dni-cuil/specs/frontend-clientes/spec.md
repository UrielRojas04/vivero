## MODIFIED Requirements

### Requirement: Interfaz ABM de Clientes
El sistema MUST proporcionar una interfaz gráfica para listar y gestionar clientes, adaptándose a pantallas móviles. Adicionalmente, MUST incluir de forma clara la visibilidad de los saldos financieros y físicos del cliente.

El formulario de alta y edición de cliente MUST exponer además dos campos de documento opcionales e independientes, DNI y CUIL, de modo que un cliente creado rápidamente desde otra pantalla con un documento mal tipeado pueda corregirse, y de modo que un mismo cliente pueda tener cargados ambos documentos. Ninguno de los dos MUST ser obligatorio para guardar.

#### Scenario: Visualización responsiva de la lista con saldos
- **WHEN** un usuario navega a `/clientes`
- **THEN** el sistema hace un fetch a `GET /api/clientes` y muestra una tabla (en pantallas grandes) o una grilla de tarjetas (en pantallas chicas) con la información del cliente, incluyendo columnas o etiquetas indicando los valores actuales de `balancePesos` y `balanceBandejas`.

#### Scenario: Creación de cliente
- **WHEN** un usuario completa el formulario modal de cliente y presiona guardar
- **THEN** el sistema envía `POST /api/clientes`, actualiza la lista exhibiendo los nuevos balances en 0 y cierra el modal con feedback visual positivo.

#### Scenario: Creación de cliente con DNI y CUIL
- **WHEN** un usuario completa el formulario modal cargando nombre y además DNI y/o CUIL, y presiona guardar
- **THEN** el sistema envía esos campos en el `POST /api/clientes` y el cliente queda guardado con los documentos cargados

#### Scenario: Edición de cliente
- **WHEN** un usuario edita un cliente existente
- **THEN** el sistema envía `PUT /api/clientes/{id}` y refresca la UI manteniendo los saldos intactos.

#### Scenario: Corrección del documento de un cliente
- **WHEN** un usuario abre en edición un cliente que tiene un documento cargado, modifica o borra ese valor y guarda
- **THEN** el formulario aparece precargado con el documento que tenía, y al guardar el sistema envía el nuevo valor en el `PUT /api/clientes/{id}`

## ADDED Requirements

### Requirement: Creación rápida de cliente reutilizable desde cualquier buscador
El sistema SHALL proveer un componente reutilizable de creación rápida de cliente que se ofrezca dentro del desplegable de un buscador de clientes cuando el texto tipeado no arroja coincidencias, evitando que el usuario tenga que abandonar la pantalla en la que está trabajando.

El componente SHALL tomar el nombre directamente del texto tipeado en el buscador, SHALL permitir opcionalmente cargar un teléfono y un documento, y SHALL poder configurarse para ocultar esos campos opcionales en los flujos donde solo interesa el nombre. Al crear el cliente SHALL invalidar la caché de clientes para que el nuevo registro esté disponible en toda la aplicación, SHALL seleccionar automáticamente el cliente recién creado en el buscador que lo originó, y SHALL informar el resultado —éxito o error— exclusivamente mediante el sistema de feedback de la aplicación, nunca con diálogos nativos del navegador.

Mientras la creación está en curso el componente SHALL impedir que se dispare una segunda alta con el mismo texto.

#### Scenario: El buscador no encuentra coincidencias
- **WHEN** un usuario escribe un nombre en un buscador de clientes que usa este componente y ningún cliente existente coincide
- **THEN** el desplegable ofrece la acción de crear un cliente con ese nombre exacto

#### Scenario: Alta rápida exitosa
- **WHEN** el usuario confirma la creación desde el desplegable
- **THEN** el sistema crea el cliente vía `POST /api/clientes`, lo deja seleccionado en el buscador, refresca el listado de clientes de la aplicación y muestra un mensaje de éxito

#### Scenario: Falla el alta rápida
- **WHEN** la petición de creación devuelve un error
- **THEN** el sistema muestra el mensaje de error correspondiente mediante el sistema de feedback de la aplicación, no se selecciona ningún cliente, y el texto tipeado permanece en el buscador para poder reintentar

#### Scenario: Doble confirmación durante la creación
- **WHEN** el usuario vuelve a accionar el botón de crear mientras la petición anterior sigue en curso
- **THEN** el sistema no emite una segunda petición de alta y el control permanece deshabilitado hasta que la primera termine
