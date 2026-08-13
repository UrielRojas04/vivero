## Context

Tras una revisión de arquitectura, se determinó que mantener "Marca" como un simple campo de texto (String) libre en la entidad `Producto` es propenso a errores (inconsistencias por tipeo, mayúsculas, espacios) que rompen la experiencia de filtrado. Por ende, la entidad Marca debe ser relacional y fuertemente tipada.

## Goals / Non-Goals

**Goals:**
- Crear la entidad `Marca` con su respectivo CRUD (asociada a la Unidad de Negocio).
- Reemplazar el campo texto `marca` en `Producto` por una relación `@ManyToOne` hacia la entidad `Marca`.
- Permitir la gestión de Marcas desde la sección "Configuración" del frontend.
- Usar un `<select>` en el formulario de Producto para elegir marcas preexistentes.
- Asegurar que el filtrado de marcas en la tabla de Stock funcione de forma robusta e idéntica, ahora sobre los datos de la base.

**Non-Goals:**
- Asignar marcas a "Plantas". Las marcas son exclusivas (por ahora) de "Herramientas" (unidad 2).

## Decisions

- **Marca como Entidad**: Se crea la tabla `marcas` (`id`, `nombre`, `unidad_negocio_id`, `deleted`).
- **Relación**: `Producto` tendrá una FK `marca_id`. Al mapear al DTO, expondremos `marcaId` y `marcaNombre`.
- **Configuración Frontend**: Se añadirá una pestaña o sección dentro de `Configuracion.jsx` para el ABM de marcas.

## Risks / Trade-offs

- **[Risk]** Migración de datos actuales: Como ya había productos cargados con marca string, al cambiar a FK pueden perderse si se dropea la columna en lugar de migrar.
  - **Mitigation**: Dado que estamos en fase temprana y el catálogo de herramientas recién se arma, se aceptará el reinicio de las marcas cargadas, requiriendo volver a asignarlas vía UI.
