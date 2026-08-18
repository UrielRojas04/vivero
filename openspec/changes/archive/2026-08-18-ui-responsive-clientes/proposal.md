## Why

Etapa 4 del mini-roadmap `openspec/roadmap_responsive.md`. Las Etapas 1 (layout), 2 (catálogos) y 3 (punto de venta) ya dejaron el patrón mobile-first establecido, pero la sección **Clientes y Cuentas Corrientes** quedó a mitad de camino: el listado ya tiene cards en mobile, sin embargo el saldo —el dato más consultado en el mostrador— se muestra como un chip diminuto (`text-xs`) sin decir si es **deuda** o **saldo a favor**, y los tres modales de cuenta corriente (`AjusteSaldoModal`, `DevolucionBandejasModal`, `HistorialBandejasModal`) siguen siendo diálogos centrados `max-w-md` que en un celular quedan flotando con botones de acción chicos, sin el shell fullscreen que ya usan `ProductoForm`, `InsumoForm` y `SiembraForm`.

## What Changes

- **Listado de clientes (`Clientes.jsx`)**: jerarquía mobile centrada en nombre + saldo. El chip de saldo pasa a un bloque destacado con tipografía grande, etiqueta explícita (`Debe` / `A favor` / `Sin saldo`) y color vivo (rojo / emerald / gris neutro). Se corrige el caso `balanceDinero === 0`, que hoy se pinta en verde como si fuera saldo a favor.
- **Semántica de saldo unificada**: se centraliza el mapeo `balanceDinero → { etiqueta, tono, monto }` en un helper compartido para que la card mobile, la tabla desktop y el modal de ajuste no diverjan.
- **`AjusteSaldoModal.jsx`**: shell fullscreen en mobile (`p-0 sm:p-4`, `rounded-none sm:rounded-2xl`, `h-full sm:h-auto`, `max-h-screen sm:max-h-[95vh]`), cuerpo scrolleable, footer fijo abajo con botones `flex-1` touch-friendly, y panel de "Saldo Actual" con tipografía grande y etiqueta Deuda/A favor.
- **`DevolucionBandejasModal.jsx` y `HistorialBandejasModal.jsx`**: mismo shell fullscreen mobile y botones touch-friendly. Son la cuenta corriente de bandejas del cliente y se abren desde la misma pantalla, por lo que comparten el tratamiento.
- **Sin cambios de backend, de contratos de API ni de lógica de negocio.** Es trabajo de presentación puro.

## Capabilities

### New Capabilities
<!-- Ninguna: esta etapa extiende la capability responsive existente. -->

### Modified Capabilities
- `ui-responsive`: el requisito **Layout Responsive** incorpora el comportamiento mobile de la sección Clientes / Cuentas Corrientes — listas priorizando identificador + saldo con estado (deuda / a favor) legible en tipografía grande y color, y modales de cuenta corriente en modo fullscreen con footer de acciones fijo.

## Impact

**Código afectado (solo frontend):**
- `frontend/src/pages/Clientes.jsx` — card mobile y celda de saldo en la tabla desktop.
- `frontend/src/components/AjusteSaldoModal.jsx` — shell del modal, panel de saldo, footer.
- `frontend/src/components/DevolucionBandejasModal.jsx` — shell del modal, footer.
- `frontend/src/components/HistorialBandejasModal.jsx` — shell del modal, listado interno.
- `frontend/src/utils/` — nuevo helper de presentación de saldo.

**Fuera de alcance:**
- `ClienteForm.jsx`: ya recibió los ajustes de teclado numérico / campos en `ui-responsive-ventas` (task 4.4); no se toca.
- Cheques y finanzas: son Etapa 5 (`ui-responsive-finanzas`).
- Backend (`CuentaCorrienteDinero`, `CuentaCorrienteBandejas`) y endpoints: sin cambios.

**Riesgo:** bajo. No hay migraciones, ni cambios de API, ni lógica de negocio nueva; la superficie es CSS/JSX sobre pantallas CRUD no críticas.
