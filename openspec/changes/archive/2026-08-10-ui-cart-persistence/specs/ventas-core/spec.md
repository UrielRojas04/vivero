## ADDED Requirements

### Requirement: Persistencia del Carrito de Ventas en la UI
El sistema SHALL mantener el estado del carrito (cliente seleccionado, detalles, métodos de pago, notas, y descuento) persistente a través de la navegación entre distintas secciones de la aplicación mientras dure la sesión.

#### Scenario: Usuario cambia de sección sin perder el carrito
- **WHEN** el usuario agrega productos al carrito en la vista "Nueva Venta" y navega a la sección de "Insumos" y luego retorna a "Nueva Venta"
- **THEN** los datos previamente cargados (productos, cliente, etc.) se restauran automáticamente sin requerir interacción manual.
