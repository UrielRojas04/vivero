## Context

Se implementó exitosamente la separación multi-negocio para Productos, Ventas y Movimientos de Stock en el change anterior. El objetivo actual es extender este aislamiento al resto de las entidades clave: `Usuario`, `Cliente`, `Cheque` y `Gasto`.

## Goals / Non-Goals

**Goals:**
- Añadir un mapeo N:M entre `Usuario` y `UnidadNegocio`.
- Aislar los registros de `Cliente`, `Cheque` y `Gasto` agregando `unidad_negocio_id`.
- Modificar el controlador de Auth para devolver al frontend las unidades de negocio disponibles por usuario.
- Modificar el frontend (`useAuthStore` y `DashboardLayout`) para cargar el listado de negocios habilitados para el usuario logueado en lugar de hacer un `GET /api/negocios` global abierto.

**Non-Goals:**
- No se va a rediseñar la vista de finanzas o clientes en el frontend, solo se van a filtrar los datos por la cabecera `X-Unidad-Negocio` que ya existe.
- No aislar entidades puras de inventario y siembra como `VariedadBandeja` y `VariedadPlanta` (son transversales/maestras).

## Decisions

**1. Usuarios Muchos-a-Muchos con UnidadNegocio**
- **Decisión**: Se agregará una tabla intermedia `usuario_unidad_negocio` para que un usuario pueda tener acceso a múltiples negocios (ej. "Vivero" y "Herramientas").
- **Rationale**: Es el modelo más flexible. El dueño puede cambiar entre Vivero y Herramientas sin reloguearse, mientras que un vendedor solo verá su unidad y ni siquiera se le mostrará el dropdown.

**2. Aislamiento de Clientes**
- **Decisión**: El `Cliente` tendrá `unidad_negocio_id`. Como `CuentaCorrienteDinero` y `CuentaCorrienteBandejas` tienen una relación 1:1 con el Cliente, automáticamente quedan aisladas por transitividad.
- **Rationale**: Un cliente de Herramientas no tiene por qué mezclarse con la libreta del Vivero. 

**3. Autenticación y Negocios**
- **Decisión**: El `AuthResponseDTO` devolverá un array `negociosDisponibles`. El endpoint `/api/negocios` ya no será responsable de cargar los negocios del dropdown; en su lugar, se cargarán directo del payload de login.
- **Rationale**: Ahorra requests y evita exponer unidades a usuarios no autorizados.

## Risks / Trade-offs

- **Risk**: Usuarios existentes sin unidad de negocio asignada.
  - *Mitigation*: Al iniciar la migración (DataInitializer), asignar la unidad "Vivero" (ID 1) por defecto a todos los usuarios, clientes, cheques y gastos preexistentes.
- **Risk**: Venta a un cliente que está en otro negocio.
  - *Mitigation*: Al cargar el listado de clientes en `VentaForm`, el backend debe asegurar que solo se envían los clientes de la unidad actual, validando que el ID pertenezca al negocio activo del ContextHolder.
