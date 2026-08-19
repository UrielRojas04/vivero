## ADDED Requirements

### Requirement: Permisos granulares de bandejas
El sistema SHALL exponer dos permisos independientes, `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, que habilitan exclusivamente el circuito de bandejas —consultar el historial de un cliente y registrar una devolución— sin conceder acceso a ningún otro dato ni operación sobre el cliente. Ambos permisos SHALL darse de alta en la inicialización del sistema y SHALL quedar incluidos en el conjunto de permisos del rol `JEFE`. Ningún otro rol semilla SHALL recibirlos por defecto.

#### Scenario: Alta de los permisos en la inicialización
- **WHEN** el backend arranca y ejecuta la inicialización de datos
- **THEN** existen en la base los permisos `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, y ambos figuran entre los permisos asignados al rol `JEFE`

#### Scenario: El rol de empleado no recibe los permisos por defecto
- **WHEN** el backend arranca y ejecuta la inicialización de datos
- **THEN** el rol `EMPLEADO_VIVERO` conserva únicamente `LEER_STOCK`, `ESCRIBIR_STOCK` y `ESCRIBIR_VENTAS`, sin ningún permiso de bandejas

#### Scenario: El acceso a bandejas no arrastra acceso a clientes
- **WHEN** un usuario cuyo rol tiene `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`, pero no tiene `LEER_CLIENTES` ni `ESCRIBIR_CLIENTES`, solicita `GET /api/clientes`
- **THEN** el sistema responde 403 Forbidden

### Requirement: Listado de clientes acotado al circuito de bandejas
El sistema SHALL exponer un listado de clientes específico para el circuito de bandejas que devuelva únicamente el identificador, el nombre o razón social y el saldo de bandejas de cada cliente. Ese listado SHALL NOT incluir el balance de dinero, el teléfono ni ningún otro dato del cliente. El acceso SHALL requerir `LEER_CLIENTES` o `LEER_BANDEJAS`, y el listado SHALL respetar el filtro por unidad de negocio activa que ya aplica el listado general de clientes.

#### Scenario: Consulta con permiso acotado de bandejas
- **WHEN** un usuario con `LEER_BANDEJAS` y sin `LEER_CLIENTES` solicita el listado de clientes del circuito de bandejas
- **THEN** el sistema responde 200 con una lista donde cada elemento contiene exactamente el identificador, el nombre o razón social y el saldo de bandejas

#### Scenario: El listado no filtra datos financieros
- **WHEN** se inspecciona la respuesta del listado de clientes del circuito de bandejas
- **THEN** ningún elemento contiene el balance de dinero ni el teléfono del cliente, cualesquiera sean los permisos del solicitante

#### Scenario: Consulta sin ningún permiso de lectura habilitante
- **WHEN** un usuario autenticado que no tiene `LEER_CLIENTES` ni `LEER_BANDEJAS` solicita el listado de clientes del circuito de bandejas
- **THEN** el sistema responde 403 Forbidden

#### Scenario: Filtrado por unidad de negocio activa
- **WHEN** un usuario solicita el listado con una unidad de negocio activa en el contexto de la petición
- **THEN** el sistema devuelve únicamente los clientes de esa unidad de negocio

### Requirement: Pantalla dedicada de devolución de bandejas
El sistema SHALL ofrecer una pantalla propia para el circuito de bandejas, accesible mediante una ruta protegida, que permita buscar un cliente por nombre, registrar una devolución de bandejas y consultar su historial de movimientos. La pantalla SHALL reutilizar los mismos componentes de devolución e historial que ya usa la pantalla de clientes, y SHALL ser accesible tanto con `LEER_CLIENTES` como con `LEER_BANDEJAS`.

#### Scenario: Acceso de un empleado habilitado
- **WHEN** un usuario con `LEER_BANDEJAS` navega a la ruta de devolución de bandejas
- **THEN** la pantalla se muestra con el buscador de clientes, sin redirigir al dashboard

#### Scenario: Acceso del jefe
- **WHEN** un usuario con `LEER_CLIENTES` navega a la ruta de devolución de bandejas
- **THEN** la pantalla se muestra, sin necesidad de tener los permisos de bandejas

#### Scenario: Acceso denegado sin permisos habilitantes
- **WHEN** un usuario autenticado sin `LEER_CLIENTES` ni `LEER_BANDEJAS` navega directamente a la ruta de devolución de bandejas por URL
- **THEN** el sistema lo redirige al dashboard

#### Scenario: Búsqueda y selección de cliente
- **WHEN** el usuario escribe parte del nombre de un cliente en el buscador de la pantalla
- **THEN** la pantalla muestra los clientes cuyo nombre o razón social contiene ese texto, junto con su saldo de bandejas, y permite seleccionar uno para operar

#### Scenario: Registro de devolución desde la pantalla dedicada
- **WHEN** el usuario selecciona un cliente y registra una devolución de bandejas
- **THEN** el sistema asienta el movimiento y la pantalla refleja el saldo de bandejas actualizado del cliente

### Requirement: Protección de rutas y navegación por alternativa de permisos
El guard de rutas y el filtro del menú de navegación SHALL admitir que un destino declare más de un permiso habilitante, otorgando el acceso cuando el usuario posee al menos uno de ellos. Los destinos que declaran un único permiso SHALL conservar exactamente su comportamiento actual.

#### Scenario: Acceso por cualquiera de los permisos declarados
- **WHEN** una ruta declara los permisos `LEER_CLIENTES` y `LEER_BANDEJAS` como habilitantes y el usuario posee sólo uno de los dos
- **THEN** el sistema le permite el acceso a la ruta

#### Scenario: Destinos con un único permiso no cambian
- **WHEN** un usuario navega a una ruta que declara un único permiso habilitante
- **THEN** el acceso se resuelve igual que antes de este cambio: se concede si el usuario tiene ese permiso y se redirige al dashboard si no lo tiene

#### Scenario: Item de menú visible con cualquiera de los permisos
- **WHEN** un usuario con `LEER_BANDEJAS` y sin `LEER_CLIENTES` visualiza el menú lateral
- **THEN** el menú muestra el item de devolución de bandejas y no muestra el item de clientes

#### Scenario: Ocultamiento en la unidad de negocio de herramientas
- **WHEN** el usuario tiene como unidad de negocio activa "Herramientas"
- **THEN** el menú lateral no muestra el item de devolución de bandejas, del mismo modo que ya oculta los items de siembras e insumos

### Requirement: Otorgamiento del acceso por el jefe
El sistema SHALL permitir que un usuario con `ADMIN_DB` otorgue el acceso al circuito de bandejas a un rol, desde la pantalla de administración de usuarios y roles, mediante un bloque de asignación por sección que agrupe los permisos de bandejas.

#### Scenario: Asignación por sección
- **WHEN** el administrador crea o edita un rol y marca la sección de devolución de bandejas
- **THEN** el rol queda guardado con los permisos `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS`

#### Scenario: Asignación individual en modo avanzado
- **WHEN** el administrador crea o edita un rol usando el modo avanzado de permisos
- **THEN** `LEER_BANDEJAS` y `ESCRIBIR_BANDEJAS` figuran en la lista de permisos disponibles y pueden marcarse de forma independiente
