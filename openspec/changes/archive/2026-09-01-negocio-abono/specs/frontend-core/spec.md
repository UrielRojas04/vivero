## MODIFIED Requirements

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

## ADDED Requirements

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
