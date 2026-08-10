## Context

Las plantas del vivero tienen su propio catálogo (`Producto`), pero la empresa comercializa otras unidades de negocio como herramientas y sustratos. Necesitamos una entidad análoga al `Producto` que funcione como el catálogo base de los demás elementos vendibles, que llamaremos `Insumo`.

## Goals / Non-Goals

**Goals:**
- Implementar el CRUD de Insumos protegido por autoridades dinámicas.
- Extender el modelo de sesión unificada para soportar unidades de negocio diferentes al Vivero en el mismo sistema.

**Non-Goals:**
- No se implementarán las ventas o las transacciones que deduzcan el stock en este change. Solo el ABM del catálogo.

## Decisions

1. **Entidad `Insumo` Independiente**: Se decidió crear la entidad `Insumo` y no reutilizar `Producto` para mantener la separación lógica entre seres vivos (plantas) e inanimados (macetas, tierra), lo cual facilitará futuras métricas, campos específicos y comportamientos.
2. **Autoridades Dinámicas**: Se continuará usando `@PreAuthorize("hasAuthority('X_ESCRIBIR_STOCK')")`. En el caso del controlador de Insumos, al abarcar distintas unidades de negocio (Herramientas, Sustratos), la validación debe depender del `unidadNegocioId` del insumo específico. Se evaluará el uso de anotaciones como `@PreAuthorize("hasPermission(#insumoDto.unidadNegocioId, 'ESCRIBIR_STOCK')")` con un `PermissionEvaluator` personalizado, o bien, validar directamente en el `Service` si el usuario en sesión posee la autoridad `"[UNIDAD_ID]_ESCRIBIR_STOCK"` generada al cargar los roles.
   - *Alternativa Elegida*: Para mantener la simplicidad y seguir el patrón ya testeado, se validará a nivel Service: el controlador pasará la petición, y el Service buscará el nombre de la unidad de negocio para verificar `hasAuthority("NOMBRE_ESCRIBIR_STOCK")`, o se implementará un `CustomPermissionEvaluator`.

## Risks / Trade-offs

- **Riesgo**: La lógica de seguridad a nivel método puede volverse compleja si los Insumos pertenecen a N unidades de negocio distintas.
  - **Mitigación**: Implementar un `CustomPermissionEvaluator` de Spring Security para encapsular la lógica de autorización (`hasPermission(targetId, targetType, permission)`).
