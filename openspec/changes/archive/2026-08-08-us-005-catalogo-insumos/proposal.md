## Why

El sistema requiere gestionar el inventario de insumos (sustratos, perlas, macetas, etc.) que pertenecen a sus respectivas unidades de negocio ("Herramientas", "Sustratos y perlas"). Esto es clave para poder vender bolsas de perlas o herramientas con control de stock, replicando el comportamiento que logramos con los productos (plantas) del Vivero.

## What Changes

- Creación del modelo JPA `Insumo` con sus atributos básicos (nombre, descripcion, precio, stock) y su relación con `UnidadNegocio`.
- Creación de `InsumoDTO`.
- Implementación de `InsumoRepository`, `InsumoService` y su implementación.
- Creación de `InsumoController` para exponer las operaciones CRUD.
- Protección de los endpoints verificando los permisos prefijados de Unidad de Negocio (ej. `HERRAMIENTAS_ESCRIBIR_STOCK`, `SUSTRATOS_Y_PERLAS_ESCRIBIR_STOCK`).

## Capabilities

### New Capabilities
- `catalogo-insumos`: Gestión CRUD del inventario de insumos para las diferentes unidades de negocio (excepto plantas que usan el catálogo de productos).

### Modified Capabilities
- `user-rbac`: Se usarán las autoridades dinámicas (ej: `HERRAMIENTAS_ESCRIBIR_STOCK`, `SUSTRATOS_Y_PERLAS_LEER_STOCK`) para proteger los recursos de insumos.

## Impact

- **Backend**: Se introduce el modelo `Insumo`.
- **Base de Datos**: Nueva tabla `insumos`.
- **Seguridad**: Se amplía el uso de `@PreAuthorize` o `PermissionEvaluator` a múltiples prefijos dependiendo del `unidadNegocioId` del insumo, demostrando la escalabilidad del modelo de Sesión Unificada.
