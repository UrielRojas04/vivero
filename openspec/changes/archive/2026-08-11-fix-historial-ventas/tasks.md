## 1. Backend: Ordenamiento de Ventas

- [x] 1.1 Modificar el método en `VentaRepository` para que retorne ventas ordenadas por fecha descendente (por ej. `findAllByOrderByFechaDesc` o modificando la Pageable).
- [x] 1.2 Actualizar `VentaServiceImpl` para que utilice el nuevo método de búsqueda ordenada.

## 2. Frontend: UI del Historial

- [x] 2.1 En `HistorialVentas.jsx`, eliminar la columna de encabezado `<th>ID</th>`.
- [x] 2.2 En `HistorialVentas.jsx`, eliminar la celda `<td>{venta.id}</td>` del mapeo de las filas.
- [x] 2.3 Verificar que el orden en que se visualizan coincide con la respuesta ordenada de la API.
