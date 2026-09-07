## Context

En el negocio Vivero, existen bandejas de plantines que se producen a partir de semillas propias y bandejas que se producen a partir de semillas traídas por los clientes (registradas en `RegistroSemilla`). El stock físico (`Producto.stock`) de Vivero cuenta todas las bandejas existentes, pero las bandejas producidas para clientes específicos no deberían ofrecerse a la venta general, ya que están "encargadas". El Jefe necesita visualizar el stock real disponible para la venta (Stock Físico - Bandejas Encargadas).

## Goals / Non-Goals

**Goals:**
- Calcular y exponer por cada Variedad de Planta el stock físico actual en Vivero, la cantidad de bandejas encargadas (provenientes de `RegistroSemilla`) y el saldo real disponible.
- Exponer un endpoint `/api/estadisticas/bandejas-disponibles` (o en un controlador ad-hoc) que retorne esta información.

**Non-Goals:**
- No se creará una entidad nueva para rastrear las "entregas" de bandejas encargadas en esta iteración; se calculará dinámicamente sumando la `cantidadBandejas` de los `RegistroSemilla` vigentes.
- No se bloquearán las ventas si el stock disponible es menor al físico; es solo un reporte informativo (dashboard).

## Decisions

1. **Vínculo Variedad-Producto:** Como `Producto` no tiene un foreign key a `VariedadPlanta`, el vínculo lógico entre un producto en stock y las semillas encargadas es el **nombre**. Cuando una `Siembra` pasa a stock, el `Producto` hereda el nombre de la `VariedadPlanta` (ej. "Lechuga Mantecosa"). Por lo tanto, cruzaremos los datos agrupando por `nombre`.
2. **Cálculo de "Encargadas":** Se sumará el campo `cantidadBandejas` de los `RegistroSemilla` activos (no eliminados).
3. **Capa de procesamiento:** Para evitar una query SQL nativa muy compleja y difícil de mantener, el cálculo cruzado se hará en la capa de Servicio (`EstadisticasService` o similar):
   - A) Obtener todos los `Producto` de la unidad Vivero (id=1) que sean bandejas (por convención, si el nombre cruza con variedad).
   - B) Obtener la suma de `cantidadBandejas` de `RegistroSemilla` agrupada por `VariedadPlanta.nombre`.
   - C) Ensamblar el DTO `BandejasDisponiblesDTO(variedad, stockFisico, encargadas, disponible)`.

## Risks / Trade-offs

- **Riesgo:** Si un `Producto` cambia de nombre manualmente, se rompe el vínculo semántico con la `VariedadPlanta` y el reporte no restará correctamente las encargadas.
  - **Mitigación:** Es un riesgo aceptado por el modelo actual (donde el producto es agnóstico del origen una vez en stock). Se documentará la asunción de que el nombre debe coincidir.
