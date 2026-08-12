## Context

El sistema actualmente implementa "hard deletes" para todas las entidades mediante Spring Data JPA `deleteById()`. Esto puede causar problemas de integridad si una entidad eliminada estaba referenciada en tablas históricas o de reportes. En Spring Boot 3.4 con Hibernate 6, la recomendación estándar para "soft delete" es usar la columna discriminadora `@SQLDelete` y el filtrado global mediante `@SQLRestriction` (reemplazando al deprecado `@Where`).

## Goals / Non-Goals

**Goals:**
- Implementar la columna `deleted` (boolean, valor por defecto `false`) en todas las entidades persistentes críticas (`Producto`, `Cliente`, `Gasto`, `Venta`, `VentaDetalle`, `Insumo`, `Cheque`, `MovimientoStock`).
- Asegurar que todos los métodos de los repositorios que buscan colecciones excluyan registros eliminados automáticamente.
- Asegurar que la eliminación de un registro mediante el frontend ejecute el "soft delete" en lugar de eliminar la fila.

**Non-Goals:**
- No se implementará un endpoint para restaurar registros borrados en este change. Se deja para una posible iteración futura si el negocio lo requiere.
- No se modificarán entidades puramente transaccionales o pivot/relacionales simples si no tienen ciclo de vida independiente.

## Decisions

- **Mecanismo de Filtro Global**: Se usará `@SQLRestriction("deleted = false")` a nivel de clase en cada entidad.
  - *Rationale*: Hibernate lo inyecta automáticamente en todas las consultas generadas (SELECT, JOINs), asegurando que la lógica no requiera parchar cada método del repositorio.
- **Mecanismo de Borrado**: Se usará `@SQLDelete(sql = "UPDATE table_name SET deleted = true WHERE id=?")`.
  - *Rationale*: Permite que un llamado estándar a `repository.deleteById(id)` realice el update de la columna sin modificar los controllers o services.

## Risks / Trade-offs

- **Consultas Nativas Personalizadas**: Si un repositorio tiene una `@Query(value = "...", nativeQuery = true)`, `@SQLRestriction` NO se aplicará automáticamente.
  - *Mitigación*: Revisar todas las consultas nativas (si existen) y añadir manualmente `AND deleted = false`.
- **Relaciones Uniques**: Los constraint `UNIQUE` en base de datos (por ejemplo, nombre de producto único) fallarían si el usuario intenta crear un producto nuevo con el mismo nombre de uno "borrado".
  - *Mitigación*: Si el negocio requiere reutilizar nombres, el índice único debería incluir `deleted` (e.g., `UNIQUE(nombre, deleted)` o remover el constraint en base a nombre). Por ahora, el usuario deberá usar otro nombre o se dejará el constraint original.
