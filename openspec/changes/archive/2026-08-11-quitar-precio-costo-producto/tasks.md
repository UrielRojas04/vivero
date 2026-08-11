## 1. Backend: Entidad Producto y DTO

- [x] 1.1 Eliminar el campo `precioCosto` y sus getters/setters de la clase `Producto.java`.
- [x] 1.2 Eliminar el campo `precioCosto` del `ProductoDTO.java`.
- [x] 1.3 Eliminar cualquier referencia a `precioCosto` en `ProductoService`, `ProductoController` o constructores/mappers si aplica.

## 2. Backend: Finanzas y Costos

- [x] 2.1 Modificar `FinanzasServiceImpl.java` para que el cálculo de `totalCostos` no dependa de `precioCosto` de los productos vendidos.
- [x] 2.2 Asegurar que `totalCostos` retornado por `FinanzasService` sume única y exclusivamente los montos de la entidad `Gasto` del período correspondiente.

## 3. Frontend: Catálogo de Productos

- [x] 3.1 Remover el input/columna de "Precio Costo" en `Productos.jsx` y `ProductoForm.jsx` o donde sea que se esté pidiendo ese dato al crear/editar un producto.
- [x] 3.2 Remover el renderizado de la columna de precio costo en las tablas visuales del catálogo si existiese.
