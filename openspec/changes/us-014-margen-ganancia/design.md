## Context

Actualmente, el sistema permite registrar productos ingresando el "Costo" y el "Precio" (precio de venta final) de manera manual. Sin embargo, no hay una relación matemática automática entre los costos indirectos (envío, descuento de proveedor) y el precio final deseado. El usuario solicitó cambiar la forma en la que se fijan los precios para guiarse por porcentajes de margen de ganancia: se ingresa el costo base ("costo catálogo"), el sistema calcula el costo real integrando envíos y descuentos, y luego el usuario define un porcentaje de ganancia. El sistema se encargará de calcular y aplicar el precio final.

## Goals / Non-Goals

**Goals:**
- Implementar cálculo automático del Precio de Venta basado en un Margen de Ganancia.
- Agregar columna de base de datos para almacenar el `porcentaje_ganancia` en `Producto`.
- Modificar la UI de creación/edición de productos para ingresar el Margen de Ganancia y que el Precio de Venta sea derivado automáticamente, o sugerido.

**Non-Goals:**
- Actualizar o recalcular retroactivamente el margen de ganancia en productos ya existentes con precio fijo, a menos que el usuario lo edite.
- Implementar listas de precios múltiples (eso es otra épica distinta si se llegara a pedir).

## Decisions

1. **Mantener `precio` como columna física vs calcularlo al vuelo**
   - *Decisión*: Se mantendrá el campo `precio` en la base de datos como valor absoluto, y se agregará la nueva columna `porcentaje_ganancia`. Cuando se crea/edita el producto, el backend calcula el precio en base al costo y margen, y lo guarda en `precio`.
   - *Razón*: Mantener el precio absoluto guardado facilita reportes y búsquedas sin tener que hacer divisiones o multiplicaciones en SQL en cada query. Además, la lógica de redondeo (ej. redondear a múltiplos de 10) podría ser añadida al frontend antes de enviar, lo que haría útil tener el valor físico guardado.
   
2. **Cálculo de Costo Real como base del Margen**
   - *Decisión*: El margen se aplicará sobre el Costo Unitario Histórico o Costo Real = `(Costo Catálogo - Descuento) + (Subtotal * % Envío)`.
   - *Razón*: Para asegurar rentabilidad real, el margen no debe aplicarse solo sobre el costo del catálogo, sino sobre lo que realmente costó traer la mercadería.

## Risks / Trade-offs

- [Risk] Si el usuario cambia el porcentaje de envío global de la Unidad de Negocio, los costos reales cambian, lo que desfasaría el precio de venta (pues está guardado fijo). 
  - *Mitigación*: Se puede notificar o proveer una herramienta futura de "Actualización Masiva de Precios" que re-aplique los porcentajes de ganancia a todos los productos según los costos vigentes.
- [Risk] Los productos actuales en la BD no tienen `porcentajeGanancia`.
  - *Mitigación*: En el frontend, si `porcentajeGanancia` es null o 0, se puede dejar el cálculo manual o autocalcular el margen en base al costo y precio actuales para mostrarlo en el formulario.
