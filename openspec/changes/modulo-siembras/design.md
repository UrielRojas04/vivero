## Context

El vivero necesita planificar su producción. Una "siembra" es un producto en etapa temprana de desarrollo. Tiene un ciclo de vida:
- **EN_PROCESO**: Recién sembrado.
- **LISTO_PARA_ENTREGAR**: Ya creció y está listo para ser vendido o entregado.

Cuando una siembra pasa a "Lista para entregar", se convierte conceptualmente en un `Producto` que ingresa al stock (si no estaba en el catálogo, se debe crear el producto, o bien la siembra simplemente suma stock a un producto existente).

## Goals / Non-Goals

**Goals:**
- Crear la entidad `Siembra` con: id, variedad (String o FK a Producto), fechaEstimadaEntrega (LocalDate), dueño (String o FK a Cliente), numeroLote (String), estado (Enum: EN_PROCESO, LISTA), cantidad (int).
- Crear un CRUD básico para administrar las siembras.
- Al cambiar el estado de la siembra a `LISTA`, se debe permitir "Ingresar a Stock" (asociándolo a un Producto existente del catálogo).

**Non-Goals:**
- Trazabilidad de insumos utilizados en cada siembra (se asume fuera de alcance por ahora).
- Control de mermas o pérdidas parciales (se asume que la cantidad inicial es la que finalmente ingresa a stock, o se puede editar la cantidad antes de ingresar a stock).

## Decisions

- **Dueño de la siembra**: El usuario mencionó que puede ser "del jefe o de un cliente". En lugar de forzar una FK a Cliente o Usuario, se usará un campo de texto libre `dueno` o una entidad ligera `DueñoSiembra`? Dado el requerimiento "nombre del dueño", un campo `String dueno` es la solución más flexible y rápida.
- **Conexión con Producto**: Las siembras tienen una `variedad`. Esto puede referirse al nombre genérico. Cuando la siembra finaliza, el usuario deberá seleccionar un `Producto` del catálogo para sumar el stock. Esto evita inconsistencias de nombres.
- **Data Model - Siembra**:
  - `id` (Long)
  - `variedad` (String)
  - `fechaEstimada` (LocalDate)
  - `dueno` (String)
  - `numeroLote` (String)
  - `cantidad` (Integer)
  - `estado` (Enum: EN_PROCESO, FINALIZADA)

- **Transición a Producto**: Al marcar como FINALIZADA en el frontend, se abrirá un modal pidiendo: "Seleccione a qué producto del catálogo sumar estas X unidades". Si no existe, el usuario primero debe crear el producto en el catálogo.

## Risks / Trade-offs

- **Risk:** Duplicidad de nombres (Variedad en siembra vs Nombre en Producto).
  **Trade-off/Mitigation:** Mantenerlos desconectados hasta la finalización permite registrar siembras de cosas que aún no tienen precio ni están tipificadas en el catálogo. La vinculación explícita al finalizar es el punto de control.
