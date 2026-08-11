## Context

Históricamente, la entidad `Producto` en el sistema (Spring Boot / PostgreSQL) incluye un campo `precio_costo` (`precioCosto` en Java) de tipo `numeric(10,2)`. Por otro lado, recientemente se estandarizó que los costos operativos e insumos (tierra, semillas, etc.) se cargan directamente como `Gasto` y se impactan en el cálculo de finanzas.
Tener un costo unitario por producto duplica la representación del costo en el sistema: por un lado se carga la compra del insumo, y por el otro se calcula un costo irreal asociado a cada producto vendido. Para evitar cálculos erróneos y simplificar la gestión y la interfaz, el campo `precioCosto` debe ser completamente eliminado del sistema.

## Goals / Non-Goals

**Goals:**
- Eliminar la columna `precio_costo` de la tabla `productos` en PostgreSQL.
- Quitar la propiedad `precioCosto` del modelo JPA `Producto`, `ProductoDTO` y de cualquier mapper asociado.
- Ajustar `FinanzasService` para que ignore cualquier costo que provenga de productos (actualmente podría estar calculando `costo_total` multiplicando cantidad por `precioCosto`). Todo el `totalCostos` debe venir únicamente de los Gastos.
- Remover la UI de `precioCosto` del frontend (`ProductoForm.jsx` o las tablas donde se liste el producto).

**Non-Goals:**
- No se migrarán datos de `precio_costo` a ningún otro lado; se considera que los costos reales ya están cubiertos por el módulo de gastos o insumos.

## Decisions

1. **Estrategia de eliminación del campo:**
   Se procederá a borrar el atributo `precioCosto` de la clase `Producto.java`. Debido a que Spring Boot está configurado con `ddl-auto: update` (según las reglas del proyecto), Spring *no eliminará* la columna automáticamente en producción, pero lo ignorará. Para mantener la base limpia, se recomienda proveer un script SQL manual de ALTER TABLE o simplemente dejar que Hibernate lo ignore si la política actual no exige migraciones estrictas (Flyway). Como la tabla es `productos`, si es necesario, se documentará la sentencia SQL para eliminar la columna en el entorno productivo.
   *Alternativa descartada*: Mantener el campo pero dejarlo obsoleto (deprecated). Alarga la deuda técnica innecesariamente.

2. **Cálculo de rentabilidad en `FinanzasService`:**
   Actualmente, el `FinanzasServiceImpl` calcula `totalCostos`. Si actualmente estaba sumando `producto.getPrecioCosto() * cantidad` para las ventas, ese código se elimina. El `totalCostos` pasará a ser simplemente la suma de todos los `Gasto` en el rango de fechas.
   *Alternativa considerada*: Mantener una relación entre producto y los insumos que lo componen (BOM - Bill of Materials). Se descartó por ser excesivamente complejo para la operación actual.

## Risks / Trade-offs

- [Risk] Puede haber registros de `precioCosto` en la base de datos que se pierdan.
  - Mitigation: Se asume que no son necesarios porque el usuario (jefe) acordó que los insumos ya están registrados como gastos.

- [Risk] Romper queries nativas o JPQL que referencien `precioCosto`.
  - Mitigation: Realizar una búsqueda exhaustiva (grep) de `precioCosto` en `backend/src/main/java` y eliminar/actualizar todas las referencias, especialmente en repositorios y servicios.
