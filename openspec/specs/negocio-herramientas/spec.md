## ADDED Requirements

### Requirement: Gestión de Herramientas
El sistema SHALL proveer una interfaz de administración (CRUD) para gestionar las herramientas como productos pertenecientes a la unidad de negocio "Herramientas".

#### Scenario: Alta de herramienta
- **WHEN** un usuario con permisos adecuados crea un producto estando en la vista del negocio "Herramientas"
- **THEN** el sistema guarda el producto asociándolo automáticamente a la `UnidadNegocio` "Herramientas".

### Requirement: Visibilidad de Menú Restringida
El sistema SHALL ajustar las opciones de navegación según el negocio activo, ocultando secciones irrelevantes (ej. Siembras) cuando el negocio no sea el Vivero.

#### Scenario: Cambio a negocio Herramientas
- **WHEN** la unidad de negocio activa es "Herramientas"
- **THEN** el menú principal no debe mostrar la opción de "Siembras" u otras específicas del Vivero.
