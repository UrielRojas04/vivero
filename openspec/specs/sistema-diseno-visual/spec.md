## Purpose
Define el sistema de diseño transversal del frontend: los tokens de color, tipografía, espaciado y radio declarados en `frontend/src/index.css`, la regla de acento por unidad de negocio vía el atributo `data-unidad`, la separación normativa entre color de marca y color semántico, y la presentación de importes en tipografía monoespaciada tabular.
## Requirements
### Requirement: Tokens de diseño como única fuente de color, tipografía, espaciado y radio

El frontend MUST expresar color, tipografía, espaciado y radios exclusivamente a través de los tokens declarados en el bloque `@theme` de `frontend/src/index.css`. Ningún componente, página ni helper puede usar literales de la paleta por defecto de Tailwind (`emerald-*`, `gray-*`, `green-*`, `bg-white`) ni valores hexadecimales cableados para estos ejes.

Los tokens MUST incluir: la escala neutral cálida (`paper`, `paper-alt`, `canvas`, `line`, `line-strong`, `thead`, `faint`, `muted`, `body`, `ink`), la escala semántica (`ok`, `warn`, `danger`, cada una con sus variantes `-ink`, `-bg`, `-line`), la familia tipográfica (`--font-sans` IBM Plex Sans, `--font-mono` IBM Plex Mono) y los radios (`--radius-base` 2px, `--radius-panel` 4px).

#### Scenario: Una pantalla cualquiera no contiene literales de la paleta vieja

- **WHEN** se inspecciona el código de cualquier página o componente bajo `frontend/src/pages/`, `frontend/src/components/` o `frontend/src/utils/`
- **THEN** no aparece ninguna clase `emerald-*`, `green-<n>`, `gray-<n>`, `bg-white` ni `text-white` fuera de la allowlist justificada por escrito en el change

#### Scenario: Cambiar un token retiñe toda la aplicación

- **WHEN** se modifica el valor de un token neutral o semántico en `frontend/src/index.css`
- **THEN** el cambio se refleja en todas las pantallas que lo usan, sin necesidad de editar ningún componente

### Requirement: Acento cromático determinado por la unidad de negocio activa

El sistema MUST resolver el color de acento de forma indirecta: el token `--color-accent` referencia la variable `--accent`, cuyo valor concreto lo fijan los bloques `[data-unidad="vivero"]` y `[data-unidad="herramientas"]`. El `DashboardLayout` MUST proyectar la unidad de negocio activa al elemento raíz del documento mediante el atributo `data-unidad`.

La variable `--accent` (y sus derivadas `-ink`, `-soft`, `-hi`, `-label`, `-plate`) MUST tener siempre un valor resuelto: el documento arranca con `data-unidad="vivero"` y `:root` declara un juego de valores por defecto, de modo que ninguna pantalla —incluidas las previas a la autenticación— pueda renderizar un color inválido.

Los componentes NO deben recibir el tema por props ni por contexto, ni contener ramas condicionales de color según la unidad.

#### Scenario: El acento cambia al cambiar de unidad de negocio

- **WHEN** un usuario autenticado cambia la unidad de negocio activa de Vivero a Herramientas
- **THEN** el atributo `data-unidad` del elemento raíz pasa a `"herramientas"` y todos los elementos con acento (botones primarios, ítem de navegación activo, focus rings, barra de identidad del sidebar) pasan del verde de Vivero al turquesa de Herramientas, sin recargar la página

#### Scenario: El acento está definido antes de autenticarse

- **WHEN** el navegador carga la aplicación y muestra la pantalla de login, antes de que `DashboardLayout` se monte
- **THEN** el elemento raíz ya tiene un valor resuelto para `--accent` y ningún elemento se renderiza con un color inválido

#### Scenario: Un componente nuevo hereda el acento sin cablearlo

- **WHEN** se agrega un componente que usa la clase `bg-accent`
- **THEN** el componente muestra el acento correcto en ambas unidades sin recibir props de tema ni contener condicionales sobre la unidad activa

### Requirement: Separación normativa entre color de marca y color semántico

El sistema MUST distinguir dos usos del color que no pueden mezclarse:

- **Color semántico** (`ok`, `warn`, `danger`): todo color cuyo valor depende de un dato de negocio — un estado, un saldo, una fecha de vencimiento, un nivel de stock. Estos colores MUST ser idénticos en ambas unidades de negocio y NO deben usar `accent` bajo ninguna circunstancia.
- **Color de marca / interacción** (`accent`): affordances de interacción (acción primaria, link, ítem de navegación activo, tab activa, focus ring, selección, hover) y decoración de identidad sin condición de negocio detrás.

Todo color que no caiga en ninguna de las dos categorías MUST usar la escala neutral.

#### Scenario: Un chip de estado conserva su color en ambas unidades

- **WHEN** una factura en estado "PAGADO" se visualiza estando en la unidad Vivero, y luego la misma factura se visualiza estando en la unidad Herramientas
- **THEN** el chip "PAGADO" se muestra con el mismo verde `ok` en ambos casos

#### Scenario: Una acción destructiva no usa acento

- **WHEN** se renderiza un botón de eliminación
- **THEN** usa la escala `danger`, nunca `accent`, en ambas unidades

#### Scenario: Un botón de acción primaria sí cambia con la unidad

- **WHEN** se renderiza el botón "Guardar" de un formulario en la unidad Herramientas
- **THEN** se muestra con el acento turquesa de Herramientas, porque su color no depende de ningún dato de negocio

### Requirement: Importes en tipografía monoespaciada tabular

Todo valor numérico monetario mostrado al usuario MUST renderizarse con tipografía monoespaciada y cifras tabulares (`font-mono tabular-nums`), de modo que los importes de una misma columna alineen sus dígitos verticalmente.

#### Scenario: Columna de importes alineada

- **WHEN** se muestra una tabla con una columna de importes de distinta cantidad de dígitos
- **THEN** los dígitos alinean verticalmente porque todos ocupan el mismo ancho

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

