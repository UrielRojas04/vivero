## 1. Refactor de Estado Inicial

- [x] 1.1 En `NuevaVenta.jsx`, eliminar los estados escalares transitorios (`pagos`, `pagoMonto`, `pagoMetodo`, etc).
- [x] 1.2 Crear el nuevo estado `pagosLineas` inicializado como un array vacío.
- [x] 1.3 Implementar un `useEffect` sobre `isModalOpen` para que, si al abrir el modal `pagosLineas` está vacío, se auto-cargue con un objeto cuyo monto sea `totalFinal` y método `EFECTIVO`.

## 2. Refactor de Renderizado (UI de Pagos)

- [x] 2.1 Reemplazar la sección actual "Agregar Pago" y "Pagos Ingresados" por el mapeo del array `pagosLineas`.
- [x] 2.2 En cada iteración del map, renderizar los inputs (monto y select de método) bindeados a `updateLineaPago`.
- [x] 2.3 Agregar botón de eliminar fila en cada línea, oculto o deshabilitado si `pagosLineas.length === 1`.
- [x] 2.4 Renderizar inputs condicionales de cheque si el método de esa línea es `CHEQUE`.
- [x] 2.5 Agregar un botón ancho `+ Agregar otro pago parcial` debajo de la lista, que agregue un nuevo objeto vacío o en cero a `pagosLineas`.

## 3. Cálculos y Submit

- [x] 3.1 Actualizar el cálculo de `totalPagado` para que sea un `.reduce` sobre `pagosLineas`, sumando los montos (parseFloat o 0).
- [x] 3.2 Modificar `handleSubmit` para que en lugar de usar `pagos` y agarrar inputs sueltos, simplemente filtre `pagosLineas` descartando los montos vacíos o <= 0, y envíe el resto como el key `pagos` del payload.
