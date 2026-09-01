## Purpose
Define contratos, componentes y estructura base del frontend (SPA React + Vite + Tailwind, DashboardLayout, estado global de autenticación y feedback UI), de modo que todas las capacidades de UI hereden un conjunto mínimo de reglas verificables.
## Requirements
### Requirement: Frontend Base SPA
El sistema MUST tener una SPA construida con Vite, React 19 y TailwindCSS v4 que maneje el estado de autenticación de forma global usando Zustand. El layout principal MUST usar un componente `DashboardLayout` con sidebar de navegación (usando `NavLink` de React Router) y `<Outlet />` para renderizar el contenido de cada ruta hija.

El sidebar MUST exhibir la identidad de la unidad de negocio activa: una barra vertical de acento, el logotipo de la unidad en su cabecera (sobre papel para Vivero, sobre placa oscura para Herramientas) y una placa rotulada "UNIDAD DE NEGOCIO" con el nombre de la unidad, que envuelve al control de cambio de unidad sin eliminarlo. El ítem de navegación activo MUST señalarse con fondo `accent-soft` y un filete izquierdo de acento, sin esquinas redondeadas.

#### Scenario: Acceso restringido sin autenticación
- **WHEN** un usuario no autenticado intenta acceder a la ruta `/dashboard`
- **THEN** el sistema lo redirige a la pantalla de `/login`

#### Scenario: Acceso permitido con autenticación
- **WHEN** un usuario autenticado y con JWT en el store global accede a `/dashboard`
- **THEN** el sistema le permite visualizar la página

#### Scenario: Navegación entre secciones
- **WHEN** un usuario autenticado hace click en "Productos", "Insumos" o "Clientes" del sidebar
- **THEN** el sistema navega a `/productos`, `/insumos` o `/clientes` respectivamente, sin recargar la página y resalta la opción activa con fondo `accent-soft` y filete izquierdo de acento

#### Scenario: Identidad visual de la unidad en el sidebar
- **WHEN** el usuario tiene activa la unidad Herramientas
- **THEN** el sidebar muestra el logotipo de Herramientas sobre su placa oscura, la barra vertical de acento en turquesa y la placa "UNIDAD DE NEGOCIO" con el nombre de la unidad

#### Scenario: El cambio de unidad sigue disponible
- **WHEN** el usuario abre la placa de unidad del sidebar
- **THEN** puede cambiar de unidad de negocio con el mismo control funcional que antes del rediseño

### Requirement: Diseño y UI
La interfaz gráfica MUST presentar un diseño editorial y plano, gobernado por el sistema de tokens definido en la capacidad `sistema-diseno-visual`, sin depender de librerías de componentes externas. La superficie MUST construirse con bordes de 1px (`border-line`) en lugar de sombras — las sombras quedan reservadas para elementos flotantes (popovers, menús desplegables) — y con radios chatos (`rounded-base` para inputs y botones, `rounded-panel` para paneles, esquina viva para tablas); `rounded-full` MUST conservarse únicamente en chips de estado.

El acento cromático de la interfaz MUST corresponder a la unidad de negocio activa, resuelto vía el atributo `data-unidad` del documento y no mediante props de tema ni condicionales por componente. La resolución de `data-unidad` MUST soportar N unidades: la identidad visual de cada unidad se declara por unidad y MUST NOT derivarse de una condición booleana entre dos unidades. Una unidad sin identidad visual propia declarada MUST caer en el acento neutral por defecto en lugar de heredar el de otra unidad.

#### Scenario: Carga de la aplicación
- **WHEN** el usuario ingresa al root `/`
- **THEN** puede ver la interfaz con la paleta neutral cálida, la tipografía IBM Plex Sans y los radios chatos definidos por los tokens de `frontend/src/index.css`

#### Scenario: Superficie sin sombras decorativas
- **WHEN** el usuario visualiza una tarjeta, un panel o una tabla
- **THEN** su separación del fondo está dada por un borde de 1px y no por una sombra

#### Scenario: Acento coherente con la unidad activa
- **WHEN** el usuario trabaja en la unidad Herramientas
- **THEN** los botones primarios, el ítem de navegación activo y los focus rings se muestran con el acento turquesa de esa unidad, mientras los chips de estado conservan sus colores semánticos fijos

#### Scenario: Acento propio de la unidad Abono
- **WHEN** el usuario cambia la unidad activa a "Abono"
- **THEN** el documento expone `data-unidad="abono"` y la interfaz se retiñe con el acento propio de esa unidad, sin mostrar el acento de Vivero ni el de Herramientas

#### Scenario: Los acentos existentes no cambian
- **WHEN** el usuario alterna entre "Vivero" y "Herramientas"
- **THEN** los acentos, logotipos y placas de esas dos unidades son exactamente los mismos que antes del change

### Requirement: Pantalla de login sin marca de unidad
La pantalla de login MUST ser neutra respecto de las unidades de negocio: no puede mostrar el logotipo, el ícono ni el color de acento de Vivero ni de Herramientas, porque en ese momento la unidad activa todavía no se conoce. MUST identificarse con un nombre genérico del sistema y usar exclusivamente tokens neutrales.

#### Scenario: Login sin identidad de unidad
- **WHEN** un usuario no autenticado abre `/login`
- **THEN** ve el nombre genérico del sistema sin ícono ni logotipo de ninguna unidad, sobre fondo neutral, y el botón de ingreso no usa el color de acento

### Requirement: User Profile Indicator
The global UI layout SHALL display a visual indicator of the currently authenticated user at all times.

#### Scenario: User is logged in
- **WHEN** a user logs in successfully and views the dashboard or any other page
- **THEN** a profile component appears in the top right corner showing a circular avatar (with the first letter of their username), the username, and the primary role name (e.g. "JEFE")

### Requirement: Global Feedback Container
The main authenticated layout (`DashboardLayout`) SHALL mount a global feedback container that renders toasts and confirmation/permission dialogs on top of the page content, so feedback is visible in all authenticated pages without per-page wiring.

#### Scenario: Toast visible from any authenticated page
- **WHEN** a page triggers a toast through the UI store
- **THEN** the toast renders from the global container mounted in `DashboardLayout` without the page needing its own toast markup

#### Scenario: Dialog renders above page content
- **WHEN** a confirmation or permission denied dialog is triggered
- **THEN** it renders as a fixed overlay above the page content with the standard z-index stacking

### Requirement: Segundo Selector de Contexto en el Sidebar
El sidebar SHALL alojar, debajo del selector de unidad de negocio, un segundo selector de contexto que se muestre únicamente cuando la unidad activa lo declara. El segundo selector MUST usar el mismo tratamiento visual que la placa de unidad de negocio y MUST NOT desplazar ni alterar el selector de unidad existente cuando está oculto.

#### Scenario: Segundo selector visible en Abono
- **WHEN** la unidad activa es "Abono"
- **THEN** el sidebar muestra la placa de unidad y, debajo, la placa de cuenta activa con el mismo tratamiento visual

#### Scenario: Layout intacto fuera de Abono
- **WHEN** la unidad activa es "Vivero" o "Herramientas"
- **THEN** el sidebar se ve exactamente igual que antes del change, sin espacio reservado ni hueco para el segundo selector

### Requirement: Navegación Declarada por Unidad
La navegación principal SHALL resolver la visibilidad de cada entrada combinando el permiso del usuario con la pertenencia de la entrada a la unidad activa, declarada por entrada. La visibilidad MUST NOT resolverse mediante condiciones booleanas entre dos unidades ni listas de exclusión escritas por nombre de entrada.

#### Scenario: Entrada exclusiva de una unidad
- **WHEN** una entrada de navegación declara que pertenece únicamente a la unidad "Abono"
- **THEN** la entrada aparece sólo con esa unidad activa, y con las demás unidades no se muestra

#### Scenario: Navegación de Vivero y Herramientas sin cambios
- **WHEN** el usuario recorre la navegación con la unidad activa "Vivero" y luego "Herramientas"
- **THEN** ve exactamente el mismo conjunto de entradas, con las mismas etiquetas, que antes del change

