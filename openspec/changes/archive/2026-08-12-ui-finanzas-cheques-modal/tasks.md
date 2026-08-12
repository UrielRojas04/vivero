## 1. Modificaciones en UI (Finanzas)

- [x] 1.1 Importar dependencias necesarias en `Finanzas.jsx`.
- [x] 1.2 Agregar estado para la vista drill-down (`showCheques`, `setShowCheques`).
- [x] 1.3 Al clickear la tarjeta, alternar `showCheques` y ocultar las demás vistas (Ventas, Gastos).

## 2. Creación de vista de Detalle

- [x] 2.1 Implementar la sección JSX al final de `Finanzas.jsx`, oculta tras `showCheques` (similar a ventas).
- [x] 2.2 Usar `useQuery` o fetch manual (`chequesApi.getAll`) al abrir para buscar los cheques y filtrar `EN_CARTERA`.
- [x] 2.3 Renderizar una tabla simple dentro del bloque (Fecha, Emisor, Banco, Monto).
- [x] 2.4 Asegurar que si la lista está vacía, se muestre un mensaje de "No hay cheques en cartera".
