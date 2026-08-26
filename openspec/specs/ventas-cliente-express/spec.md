## ADDED Requirements

### Requirement: Ingreso manual de Cliente en Pantalla de Venta
El sistema SHALL permitir al usuario en la UI de "Nueva Venta" elegir entre seleccionar un cliente existente del listado, o ingresar los datos de un cliente manualmente de forma "express", exclusivamente cuando la unidad de negocio activa sea "Herramientas".

#### Scenario: Visualización del formulario express
- **WHEN** la unidad de negocio activa es "Herramientas"
- **THEN** la UI muestra una opción en la selección de clientes para "Ingresar datos manualmente" o "Cliente Express", solicitando Nombre y Teléfono, junto con un checkbox indicando si es un "Cliente casual".

#### Scenario: Ocultamiento en otras unidades de negocio
- **WHEN** la unidad de negocio activa es "Vivero" (o cualquier otra distinta a Herramientas)
- **THEN** la opción de ingresar un cliente manualmente de forma express no se muestra, permitiendo solo la selección de clientes existentes de la base de datos.

### Requirement: Preparación del payload de Venta con Cliente Express
El frontend SHALL estructurar el payload de creación de venta para incluir los datos ad-hoc en lugar del ID de cliente cuando se utiliza la carga manual.

#### Scenario: Envío de payload con cliente casual
- **WHEN** el usuario completa una venta utilizando los datos express y marca "Cliente casual", y presiona "Guardar Venta"
- **THEN** el frontend envía en el POST de `/api/ventas` el campo `clienteId: null` (o lo omite) y adjunta un objeto `clienteAdHoc` con el nombre, teléfono y `casual: true`.

#### Scenario: Envío de payload con creación express de cliente
- **WHEN** el usuario completa una venta utilizando los datos express, NO marca "Cliente casual", y presiona "Guardar Venta"
- **THEN** el frontend envía en el POST de `/api/ventas` el objeto `clienteAdHoc` con el nombre, teléfono y `casual: false`.
