## Why

El sistema requiere gestionar el inventario de productos (plantas, árboles, etc.) que pertenecen a la unidad de negocio principal (Vivero). Este es el primer paso funcional core tras haber establecido la arquitectura de seguridad y multi-tenancy. Permite a los administradores y empleados registrar y visualizar el catálogo.

## What Changes

- Creación del modelo JPA `Producto` con sus atributos básicos (nombre, descripción, precio, stock).
- Creación del `ProductoDTO` para transferencia de datos y validaciones.
- Implementación de `ProductoRepository` para la persistencia.
- Implementación de `ProductoService` con la lógica de negocio (CRUD).
- Creación de `ProductoController` exponiendo los endpoints REST.
- Integración con el sistema de seguridad basado en `PermissionEvaluator` o validaciones de la unidad de negocio para proteger los endpoints.

## Capabilities

### New Capabilities
- `catalogo-productos`: Gestión CRUD del inventario de plantas y productos propios del Vivero.

### Modified Capabilities
- `user-rbac`: Se agregarán los permisos específicos para lectura y escritura de productos en el `DataInitializer` y se comenzará a validar la seguridad a nivel de recurso (Domain Object Security).

## Impact

- **Backend**: Se introduce un nuevo dominio completo.
- **Base de Datos**: Nueva tabla `productos`.
- **Seguridad**: Primer caso de uso real donde los permisos de unidad de negocio se pondrán a prueba para proteger endpoints REST de negocio.
