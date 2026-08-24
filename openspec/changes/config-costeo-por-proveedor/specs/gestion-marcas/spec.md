## ADDED Requirements

### Requirement: La Marca Deja de Ser el Vínculo de Catálogo de Herramientas
El sistema SHALL dejar de utilizar la marca como vínculo de catálogo de los productos de la unidad de negocio Herramientas, reemplazada por el proveedor. Ninguna ruta de alta ni de edición de producto de esa unidad de negocio SHALL escribir la marca de un producto.

El vínculo de marca existente de cada producto SHALL conservarse en la base de datos sin modificarse, de modo que la unificación sea reversible revirtiendo únicamente el código.

#### Scenario: Alta de producto en Herramientas sin marca
- **WHEN** un usuario da de alta un producto en la unidad de negocio Herramientas seleccionando un proveedor
- **THEN** el producto queda vinculado a ese proveedor y el sistema no le asigna ninguna marca

#### Scenario: El vínculo de marca anterior se conserva
- **WHEN** se consulta en la base de datos un producto que antes de la unificación tenía una marca asignada
- **THEN** su vínculo de marca original permanece almacenado sin cambios, aunque el sistema ya no lo lea ni lo muestre

### Requirement: La Administración de Marcas Deja de Ofrecerse en la Configuración del Negocio
El sistema SHALL dejar de ofrecer la sección de administración de marcas dentro de la pantalla de configuración de la unidad de negocio, para evitar que se cargue una marca que ninguna pantalla utiliza.

El sistema SHALL conservar operativos los servicios de consulta y administración de marcas. La eliminación definitiva de la entidad, de su administración y de sus servicios SHALL NOT formar parte de este cambio.

#### Scenario: La sección de marcas no se ofrece
- **WHEN** un usuario habilitado abre la configuración de la unidad de negocio Herramientas
- **THEN** la pantalla ofrece la sección de proveedores y no ofrece ninguna sección de administración de marcas

#### Scenario: Los servicios de marcas siguen operativos
- **WHEN** se consulta el listado de marcas de la unidad de negocio activa a través de los servicios existentes
- **THEN** el sistema responde con las marcas vivas de esa unidad, exactamente como antes de este cambio
