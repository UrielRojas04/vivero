## ADDED Requirements

### Requirement: Alternancia de tema con dos estados, sin opción de sistema

La aplicación MUST ofrecer al usuario un control que alterne el esquema de color entre exactamente dos valores posibles: claro y oscuro. No existe un tercer valor "sistema" seleccionable: el sistema operativo del dispositivo sólo determina el esquema **inicial**, nunca una opción elegible dentro de la aplicación.

> Revisión post-implementación: este requisito reemplaza la versión original ("Preferencia de
> tema con tres estados"). El usuario probó la versión de tres estados y pidió, cita textual,
> "que sea un switch que directamente cambie de modo entre oscuro y claro, sin sistema".

Al cargar la aplicación (o recargar la página), el esquema activo MUST resolverse consultando la preferencia de esquema de color del sistema operativo (`prefers-color-scheme`). A partir de ahí, cada interacción con el control MUST invertir el esquema activo (de claro a oscuro o de oscuro a claro), sin pasar por ningún estado intermedio ni menú de opciones.

#### Scenario: Valor inicial sin interacción previa

- **WHEN** un usuario abre la aplicación en una pestaña donde todavía no interactuó con el control de tema
- **THEN** la aplicación se muestra en el esquema que indica el sistema operativo del dispositivo

#### Scenario: El control alterna directamente entre los dos esquemas

- **WHEN** un usuario en modo claro hace clic en el control de tema
- **THEN** la aplicación pasa a modo oscuro con un solo clic, sin abrir ningún menú ni mostrar una tercera opción

#### Scenario: Alternar de vuelta reproduce el esquema original

- **WHEN** un usuario en modo oscuro hace clic en el control de tema
- **THEN** la aplicación vuelve a modo claro, conservando el acento correspondiente a su unidad de negocio activa

### Requirement: La preferencia de tema vive en memoria, sin persistencia

La elección del usuario MUST vivir únicamente en memoria durante la sesión de la pestaña actual. La aplicación NO debe escribir la preferencia de tema en ningún almacenamiento persistente del navegador (`localStorage`, `sessionStorage`, cookies) ni enviarla al backend ni asociarla a la cuenta.

> Revisión post-implementación: este requisito reemplaza "Persistencia de la preferencia por
> navegador". El usuario pidió explícitamente, cita textual, "Además no debería guardar" — el
> sistema operativo ya es la fuente de verdad por defecto en cada carga, sin nada que el usuario
> deba recordar o desconfigurar.

#### Scenario: La elección no sobrevive a una recarga de página

- **WHEN** un usuario cambia el tema a oscuro con el sistema operativo en modo claro, y luego recarga la página (F5)
- **THEN** la aplicación vuelve a mostrarse en el esquema que indica el sistema operativo (claro), no en el esquema elegido antes de recargar

#### Scenario: La elección no sobrevive al cierre de sesión

- **WHEN** un usuario cambia el tema a oscuro y luego cierra sesión
- **THEN** la pantalla de login se muestra según el esquema del sistema operativo, no según la elección hecha antes de cerrar sesión (salvo que ambos coincidan)

### Requirement: El tema se aplica desde el primer pintado, sin parpadeo

El esquema inicial MUST quedar aplicado al documento antes del primer pintado de la página, resuelto contra la preferencia del sistema operativo. En ninguna carga ni recarga puede mostrarse un fotograma con la paleta clara si el sistema operativo indica oscuro.

#### Scenario: Carga con el sistema operativo en oscuro

- **WHEN** un usuario abre o recarga la aplicación con su sistema operativo en modo oscuro
- **THEN** la aplicación aparece en oscuro desde el primer fotograma, sin destello claro intermedio

### Requirement: Control de tema accesible en las pantallas autenticadas

Toda pantalla autenticada MUST ofrecer un control de tema, disponible para cualquier usuario con independencia de su rol o de su unidad de negocio activa. El control MUST ser un único botón que alterna el esquema al hacer clic, sin menú ni panel de opciones.

El control NO se muestra en la pantalla de login, aunque el esquema resuelto sí se aplica allí.

#### Scenario: Un usuario sin rol administrativo puede cambiar el tema

- **WHEN** un usuario autenticado sin permisos administrativos abre cualquier pantalla de la aplicación
- **THEN** ve el control de tema y puede alternar entre claro y oscuro con un clic

#### Scenario: El cambio se aplica sin recargar

- **WHEN** un usuario hace clic en el control de tema
- **THEN** toda la interfaz visible cambia de paleta de inmediato, sin recargar la página y sin perder el estado de la pantalla en la que está

### Requirement: El tema no altera el acento por unidad de negocio ni los colores semánticos

El cambio de tema MUST preservar la distinción de unidad de negocio y el significado de los colores semánticos. Cambiar de claro a oscuro NO puede alterar qué unidad de negocio está activa ni convertir un estado de negocio en otro.

#### Scenario: El acento sigue diferenciando las unidades en oscuro

- **WHEN** un usuario en la unidad Herramientas cambia la aplicación a oscuro
- **THEN** el acento sigue siendo el de Herramientas y no el de Vivero, en su variante oscura

#### Scenario: Un estado de negocio conserva su lectura en oscuro

- **WHEN** una factura en estado "PAGADO" se visualiza en tema claro y luego en tema oscuro
- **THEN** en ambos casos el chip se lee como estado favorable, con la variante correspondiente de la escala `ok`, y en ningún caso queda con contraste insuficiente para leerse
