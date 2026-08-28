## MODIFIED Requirements

### Requirement: Adaptación automática a esquema de color oscuro

El sistema MUST redefinir los tokens neutrales, semánticos y de acento para el esquema oscuro bajo el selector `[data-theme="dark"]` del elemento raíz del documento, y NO bajo una consulta `@media (prefers-color-scheme: dark)`. Los valores oscuros de cada token MUST estar declarados una sola vez en `frontend/src/index.css`, para que no puedan desincronizarse entre distintas vías de activación.

El elemento raíz MUST llevar siempre un valor concreto en `data-theme` —`"light"` o `"dark"`, nunca un valor que represente «automático»—. La resolución entre la preferencia del usuario y la del sistema operativo ocurre antes de escribir el atributo, no dentro de la hoja de estilos.

La preferencia de esquema de color del sistema operativo MUST seguir siendo el comportamiento por defecto, aplicable a todo usuario que no haya elegido explícitamente un tema; deja de ser la única fuente de la decisión. La aplicación MUST proveer un control manual de tema, especificado en la capacidad `tema-claro-oscuro`.

La propiedad `color-scheme` MUST acompañar al tema efectivamente aplicado, de modo que los controles nativos del navegador —el desplegable de `<option>`, las barras de desplazamiento— se pinten en el mismo esquema que la interfaz y no en el del sistema operativo.

#### Scenario: El usuario tiene el sistema operativo en modo oscuro

- **WHEN** un usuario que nunca eligió un tema y tiene preferencia de esquema oscuro en su sistema operativo abre la aplicación
- **THEN** la interfaz se muestra con la paleta oscura y mantiene el acento correspondiente a su unidad de negocio activa

#### Scenario: Los valores oscuros están declarados una sola vez

- **WHEN** se inspecciona `frontend/src/index.css` buscando el valor oscuro de cualquier token neutral, semántico o de acento
- **THEN** ese valor aparece en una única declaración de token oscuro, y el archivo no contiene ninguna regla `@media (prefers-color-scheme: dark)`

#### Scenario: Los controles nativos acompañan al tema de la aplicación

- **WHEN** un usuario con el sistema operativo en oscuro elige el tema claro en la aplicación y despliega un `<select>`
- **THEN** el desplegable nativo se muestra en claro, a juego con la interfaz

## ADDED Requirements

### Requirement: Los documentos exportados a imagen se renderizan siempre en esquema claro

Todo nodo destinado a exportarse como imagen o a imprimirse MUST renderizarse con los tokens del esquema claro, con independencia del tema activo en la aplicación y de la preferencia del sistema operativo. Un documento exportado no debe depender de las condiciones de visualización del dispositivo que lo generó. Esto aplica a todo documento exportable de la aplicación, no sólo a la factura de cliente — incluye, entre otros, el remito de venta exportado desde el historial de ventas.

El mecanismo MUST operar redeclarando los tokens sobre el subárbol exportado, de modo que la herencia de propiedades personalizadas le dé prioridad sobre cualquier valor definido en el elemento raíz. El acento aplicado MUST seguir siendo el de la unidad de negocio activa, en su variante clara.

> Revisión post-implementación: el bug se reprodujo también en el remito de venta
> (`ComprobanteVentaModal.jsx`), que nunca había recibido el fix aplicado a la factura de cliente
> — texto claro sobre fondo blanco, encabezado de tabla oscuro con texto verde brillante y píldora
> de estado ilegible. Se corrigió con el mismo mecanismo (clase `force-light-export`), y los
> escenarios de abajo se generalizaron para cubrir cualquier documento exportado, no sólo la
> factura.

#### Scenario: Exportación con la aplicación puesta en oscuro por el usuario

- **WHEN** un usuario que puso el tema oscuro dentro de la aplicación exporta una factura de cliente o un remito de venta como imagen
- **THEN** la imagen resultante sale íntegramente en esquema claro —tarjeta y fondo—, sin zonas oscuras ni marcos que desentonen, y con texto y números perfectamente legibles

#### Scenario: Exportación con el sistema operativo en oscuro sin interacción previa

- **WHEN** un usuario abre la aplicación con su dispositivo en modo oscuro (esquema inicial resuelto por `matchMedia`, sin haber tocado el toggle) y exporta una factura de cliente o un remito de venta como imagen
- **THEN** la imagen resultante sale íntegramente en esquema claro

#### Scenario: El acento de la unidad se conserva en el documento exportado

- **WHEN** se exporta una factura o un remito estando en la unidad Herramientas y con el tema oscuro activo
- **THEN** el documento exportado usa el acento claro de Herramientas, no el de Vivero ni la variante oscura
