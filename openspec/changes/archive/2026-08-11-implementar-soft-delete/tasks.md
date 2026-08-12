## 1. Modificación de Entidades (Modelos)

- [x] 1.1 Agregar `private boolean deleted = false;` a `Producto.java` y configurar `@SQLDelete` y `@SQLRestriction("deleted = false")`.
- [x] 1.2 Agregar `private boolean deleted = false;` a `Cliente.java` y configurar las anotaciones correspondientes.
- [x] 1.3 Agregar `private boolean deleted = false;` a `Venta.java` y `VentaDetalle.java` (si aplica borrado independiente), junto a las anotaciones.
- [x] 1.4 Agregar `private boolean deleted = false;` a `Gasto.java` y configurar las anotaciones.
- [x] 1.5 Agregar `private boolean deleted = false;` a `Insumo.java` y configurar las anotaciones.
- [x] 1.6 Agregar `private boolean deleted = false;` a `Cheque.java` y `MovimientoStock.java` y configurar las anotaciones.

## 2. Actualización de Base de Datos

- [x] 2.1 Verificar que el esquema de base de datos se actualice correctamente (o actualizar el script `DataInitializer.java` si se estuviesen creando datos semilla, asegurando que `deleted = false`).

## 3. Revisión de Repositorios (Native Queries)

- [x] 3.1 Auditar `VentaRepository`, `ProductoRepository`, `GastoRepository`, y demás repositorios en búsqueda de `@Query` nativas.
- [x] 3.2 Añadir `AND deleted = false` a las consultas nativas encontradas, ya que `@SQLRestriction` no aplica a native queries.
