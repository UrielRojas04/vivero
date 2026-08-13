## 1. Backend Data Model Updates

- [ ] 1.1 Add `porcentajeGanancia` field (BigDecimal) to `Producto.java` model and corresponding `@Column` mapping.
- [ ] 1.2 Update `ProductoDTO.java` to include `porcentajeGanancia`.
- [ ] 1.3 Add a flyway migration or let Hibernate auto-ddl update the PostgreSQL schema to include the new column.

## 2. Backend Services Logic

- [ ] 2.1 Update `ProductoServiceImpl.java` mapToDTO and `crearProducto` / `actualizarProducto` methods to map `porcentajeGanancia`.
- [ ] 2.2 In `ProductoServiceImpl.java`, implement logic to calculate `precio` based on the provided `costoProducto`, `descuentoProveedor`, the unit's `costoEnvioPorcentaje`, and the `porcentajeGanancia`.

## 3. Frontend UI Updates

- [ ] 3.1 Update `ProductoForm.jsx` to include a new numeric input field for `Porcentaje de Ganancia (%)`.
- [ ] 3.2 Change the `Precio` field in `ProductoForm.jsx` to be a calculated/readonly field (or auto-updated field) that updates in real-time as the user types the `costoProducto` or `porcentajeGanancia`.
- [ ] 3.3 Ensure the math in `ProductoForm.jsx` matches the backend calculation: `Costo Final = (Costo Base - Descuento) + Envío`, then `Precio = Costo Final * (1 + Margen / 100)`.
- [ ] 3.4 (Optional but recommended) Update `Catalogo.jsx` table columns to display the Profit Margin alongside the cost and price, if space permits.
