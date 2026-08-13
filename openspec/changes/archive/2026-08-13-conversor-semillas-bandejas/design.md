## Context

Actualmente en el sistema, la planificación y registro de siembras y productos se maneja muchas veces en "Bandejas", pero el jefe necesita tener control sobre la cantidad de "Semillas" utilizadas, ya que las semillas son el insumo real. Dado que cada tipo de bandeja (según el proveedor o el cultivo) tiene una cantidad distinta de celdas (ej. 128, 200, 288), es tedioso hacer el cálculo a mano constantemente.

## Goals / Non-Goals

**Goals:**
- Proveer un conversor "standalone" (widget) en la vista de Siembras que permita calcular `Bandejas ↔ Semillas` de forma bidireccional, seleccionando el tipo de bandeja.
- Integrar este cálculo en los formularios de registro de lote/producto, de forma tal que si el usuario carga "10 bandejas de 288 celdas", el sistema le muestre al lado "(Equivale a 2880 semillas)".

**Non-Goals:**
- No se modificará el modelo de datos backend de `Siembra` o `MovimientoStock` para forzar el registro del campo `semillas` si no es necesario (se prioriza calcularlo en el frontend a modo informativo, al menos en esta iteración).

## Decisions

- **Widget Conversor:** Será un componente React (`ConversorBandejas.jsx`) que se podrá incrustar en la vista de Siembras y posiblemente en otras partes en el futuro. Manejará su propio estado interno (`cantidad`, `modo: 'semillas' | 'bandejas'`, `tipoBandeja`).
- **Opciones de Bandejas:** Se usarán las constantes de bandejas predefinidas en el frontend (ej. 128, 200, 288 celdas) o se obtendrán del backend si están persistidas en base de datos.
- **Formulario de Registro:** Se usará el patrón "helper text" de Tailwind para mostrar el texto de conversión de manera sutil pero clara debajo o al costado del input de cantidad de bandejas.

## Risks / Trade-offs

- **Risk:** Falta de algún tipo de bandeja poco común que el cliente use. → **Mitigación:** Asegurar que el select de "tipo de bandeja" permita ingresar una cantidad personalizada de celdas si la bandeja no está en la lista estándar.
