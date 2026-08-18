## Why

Etapa 5 del mini-roadmap `openspec/roadmap_responsive.md`. Las Etapas 1 (layout), 2 (catálogos), 3 (punto de venta) y 4 (clientes) ya dejaron canonizado el patrón mobile-first del repo: tarjetas `md:hidden` + tabla `hidden md:block`, shell de modal fullscreen con prefijo `sm:`, y `askConfirm` para toda acción irreversible. **Finanzas y Cheques quedó fuera de ese barrido y hoy es la peor sección del sistema en un celular**: `Cheques.jsx` es una tabla cruda de 6 columnas (Fecha/Cliente, Banco/N° Serie, Cobro, Monto, Estado, Acciones) dentro de un `overflow-x-auto`, sin ninguna tarjeta mobile; `Finanzas.jsx` tiene dos tablas más (Detalle de Ventas de 8-9 columnas y Cheques en Cartera de 7 columnas) con el mismo tratamiento; y los tres modales del módulo (`ChequeEstadoModal`, `NuevoChequeModal`) son diálogos centrados `max-w-md`/`max-w-lg` sin shell fullscreen, con radio buttons de área táctil mínima y un dropdown de clientes en `position: absolute` que en pantalla chica queda fuera de alcance del pulgar.

Además, el dato que el usuario realmente busca cuando abre la cartera —**cuánto es y cuándo se cobra**— hoy vive en la penúltima columna de una tabla que hay que scrollear horizontalmente para ver.

## What Changes

- **`Cheques.jsx` — conversión completa tabla → tarjetas en mobile**: se agrega el patrón dual ya canonizado (`grid grid-cols-1 gap-4 md:hidden` para tarjetas + `hidden md:block` para la tabla actual). La tarjeta prioriza **monto** (tipografía grande) y **días restantes para cobro** derivados de `fechaCobro`, con banco / cliente / N° serie como datos secundarios y el chip de estado siempre visible. La acción "Editar estado" pasa a botón de ancho completo y área táctil amplia; el estado bloqueado (`RECHAZADO` / `ENTREGADO` / `COBRADO`) se comunica igual que en desktop.
- **Semántica de cheque unificada en un helper compartido**: se centraliza el mapeo `estado + esEmisionPropia → { etiqueta, tono }` (hoy duplicado como ternarios anidados en `Cheques.jsx`) y el cálculo `fechaCobro → { díasRestantes, urgencia, textoRelativo }` en un helper puro, consumido por la tarjeta mobile, la tabla desktop, la tabla de cartera de Finanzas y el encabezado de `ChequeEstadoModal`.
- **`ChequeEstadoModal.jsx` — shell fullscreen mobile + endoso touch-friendly**: overlay `p-0 sm:p-4`, panel `h-full sm:h-auto rounded-none sm:rounded-2xl max-h-screen sm:max-h-[95vh] flex flex-col`, header fijo, cuerpo scrolleable y footer fijo con botones `flex-1`. Los radio buttons de "Endosar a" (Tercero / Cliente) pasan de `flex gap-4` con inputs nativos chicos a tarjetas de selección apiladas de área táctil amplia, y el dropdown de búsqueda de clientes deja de depender de `overflow-visible` del panel para no quedar recortado dentro del cuerpo scrolleable.
- **`NuevoChequeModal.jsx` — mismo shell fullscreen + apilado de campos**: las dos grillas `grid-cols-2` (Banco / N° Serie y Fecha Emisión / Fecha Cobro) y el selector de tipo de cheque pasan a `grid-cols-1 sm:grid-cols-2` para no comprimir inputs por debajo de 360px; footer fijo con botones `flex-1`.
- **`Finanzas.jsx` — tarjetas mobile en los dos drill-downs tabulares**: "Detalle de Ventas" y "Cheques en Cartera" reciben el patrón dual tarjeta/tabla; la lista de gastos y el formulario inline de "Nuevo Gasto" (hoy `flex-row` fijo con un input de 32px de ancho) se apilan en mobile.
- **Fix incidental de datos**: la tabla "Cheques en Cartera" de `Finanzas.jsx` renderiza `cheque.emisor`, campo que **no existe** en `ChequeDTO` — hoy imprime una celda vacía. Se corrige a `clienteNombre || 'Suelto'`, coherente con `Cheques.jsx`.
- **Verificación de `askConfirm`**: se confirma que toda transición de estado consecuente de cheque (hoy solo `RECHAZADO`, que dispara reversa contable) siga pasando por `askConfirm({ variant: 'danger' })`, y se extiende la confirmación a `ENTREGADO` (endoso), que también mueve saldos de cuenta corriente y no se puede deshacer.
- **Sin cambios de backend, de DTOs, de endpoints ni de lógica de negocio.** Es trabajo de presentación puro sobre el frontend.

## Capabilities

### New Capabilities
<!-- Ninguna: esta etapa extiende la capability responsive existente. -->

### Modified Capabilities
- `ui-responsive`: el requisito **Layout Responsive** incorpora el comportamiento mobile del módulo Finanzas / Cheques — listados tabulares densos presentados como tarjetas y modales de cheque en modo fullscreen con footer de acciones fijo. Se agregan dos requisitos nuevos: **Cartera de Cheques Priorizada en Mobile** (jerarquía monto + vencimiento de cobro, semántica de estado unificada) y **Confirmación de Transiciones de Estado de Cheque** (endoso y rechazo vía modal de peligro).

## Impact

**Código afectado (solo frontend):**
- `frontend/src/pages/Cheques.jsx` — tarjetas mobile nuevas, tabla desktop intacta, botonera touch.
- `frontend/src/pages/Finanzas.jsx` — tarjetas mobile para "Detalle de Ventas" y "Cheques en Cartera", apilado del formulario de gasto, fix de `cheque.emisor`.
- `frontend/src/components/ChequeEstadoModal.jsx` — shell fullscreen, selector de endoso, dropdown de clientes, footer, confirmación de `ENTREGADO`.
- `frontend/src/components/NuevoChequeModal.jsx` — shell fullscreen, apilado de grillas, footer.
- `frontend/src/utils/` — nuevo helper de presentación de cheque (estado + vencimiento), en la línea de `saldoDisplay.js` de la Etapa 4.

**Fuera de alcance:**
- Backend (`Cheque.java`, `EstadoCheque`, `ChequeDTO`, `ChequeService`) y endpoints: sin cambios. Los "días restantes para cobro" se derivan en el cliente a partir de `fechaCobro`, que el DTO ya expone.
- Los KPI cards y los gráficos de Recharts de `Finanzas.jsx`: ya son responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` y `ResponsiveContainer`); no se tocan.
- `HistorialVentas.jsx`: es Etapa 3, ya archivada.
- No se migra `Cheques.jsx` a un layout con buscador/filtros nuevos; la paginación server-side actual se conserva tal cual.

**Riesgo:** bajo (governance LOW). No hay migraciones, ni cambios de API, ni lógica de negocio nueva. La única modificación de comportamiento es agregar una confirmación adicional antes del endoso, que es estrictamente más segura que el estado actual. Todos los cambios de shell son aditivos con prefijo `sm:`/`md:`, por lo que el render de escritorio queda idéntico.
