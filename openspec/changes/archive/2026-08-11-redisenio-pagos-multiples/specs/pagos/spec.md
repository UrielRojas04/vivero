## ADDED Requirements

### Requirement: Registro de Pagos Múltiples (Pagos Parciales)
El sistema SHALL permitir al usuario cargar múltiples métodos de pago (pagos parciales) que compongan el total de la venta de forma simultánea, a través de una interfaz de lista dinámica y auto-contenida.

#### Scenario: Visualización predeterminada de pago único
- **WHEN** el usuario abre el modal de liquidación
- **THEN** se precarga automáticamente una única línea de pago configurada en "EFECTIVO" y por el monto del total de la venta.

#### Scenario: Agregar un método de pago adicional
- **WHEN** el usuario presiona el botón "Agregar pago parcial"
- **THEN** el sistema añade una nueva línea de pago a la lista, permitiéndole al usuario distribuir los montos entre los distintos métodos y procesándolos todos de manera conjunta al confirmar la venta.
