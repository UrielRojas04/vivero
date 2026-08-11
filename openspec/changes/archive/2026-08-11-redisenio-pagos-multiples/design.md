# Design: Rediseño de Pagos Múltiples

## Arquitectura de Estado Frontend
En `NuevaVenta.jsx`, el estado transitorio del modal actual (`pagoMonto`, `pagoMetodo`, `pagos`, etc.) será reemplazado por un único estado array:
```javascript
const [pagosLineas, setPagosLineas] = useState([]);
```

Cada línea de pago tendrá la estructura:
```javascript
{
  id: "uuid-o-timestamp",
  monto: 0,
  metodoPago: 'EFECTIVO', // EFECTIVO, TRANSFERENCIA, CHEQUE
  // Datos opcionales para cheques:
  banco: '',
  numeroSerie: '',
  fechaCobro: '',
  fechaRecepcion: ''
}
```

Al abrir el modal (`isModalOpen = true`), si el array está vacío, se inicializa con una línea que contiene el `totalFinal` y método `EFECTIVO`. Esto optimiza el caso de uso más común (pago único en efectivo).

## Flujo de UI
1. **Renderizado de Líneas:** En la sección "Agregar Pago", se mapeará `pagosLineas`. Por cada línea, se renderizan:
   - Un input de número (Monto).
   - Un select de método (Efectivo, Transf, Cheque).
   - Un botón (X o ícono Basurero) para eliminar la línea (deshabilitado si es la única línea).
   - Si se selecciona Cheque, se renderiza un recuadro indentado debajo de la línea con los inputs del cheque.
2. **Actualización:** Las funciones `updateLineaPago(id, field, value)` actualizarán inmutablemente el array.
3. **Botón Añadir Pago:** Debajo del mapeo, un botón ancho `+ Agregar otro pago parcial` agregará un nuevo objeto al array con monto inicial 0.
4. **Resumen y Cálculos:** 
   - `totalPagado` = Suma de todos los `monto` de `pagosLineas` mayores a 0.
   - `saldoFinal` = `totalPagado - totalFinal`.

## Submission (Confirmación)
Al hacer click en "Confirmar Venta", se filtrarán las líneas de `pagosLineas` donde `monto > 0`. Ese array limpio se pasará en el payload de la API al key `pagos`. Se elimina el "auto-añadido" de inputs sueltos que generaba ambigüedad.
