## Context

Estado real relevado en el código **antes** de proponer (no se asumió nada del roadmap):

| Archivo | Estado responsive actual |
|---------|--------------------------|
| `pages/Cheques.jsx` (187 líneas) | ❌ **Sin patrón dual.** Una única `<table>` de 6 columnas dentro de `overflow-x-auto`. No hay `md:hidden` / `hidden md:block` en ningún lado. Es el caso opuesto a `Clientes.jsx` en la Etapa 4: acá hay que **construir** la vista de tarjetas desde cero. Los ternarios anidados de color de estado y de etiqueta (`EMITIDO`/`DEBITADO` vs `estado.replace('_',' ')`) están inline en el JSX de la tabla. ✅ `askConfirm` está desestructurado del store (aunque no se usa en esta página). |
| `pages/Finanzas.jsx` (830 líneas) | ⚠️ Parcial. ✅ KPI cards `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5` y gráficos Recharts con `ResponsiveContainer`: ya responsive. ✅ Header y buscadores con `flex-col sm:flex-row`. ✅ Lista de gastos es `<ul>` (no tabla), pero el `<form>` de nuevo gasto es `flex-row` fijo con un input de `w-32`. ❌ Dos `<table>` crudas en `overflow-x-auto`: "Detalle de Ventas" (8-9 columnas) y "Cheques en Cartera" (7 columnas). 🐛 La tabla de cartera pinta `cheque.emisor`, campo inexistente en `ChequeDTO` → celda vacía. ✅ Ya usa `askConfirm` para borrar gastos. |
| `components/ChequeEstadoModal.jsx` (267 líneas) | ❌ Diálogo centrado `max-w-md p-6 my-8` con `overflow-visible`, sin `h-full` / `rounded-none` / `max-h-screen`, sin bandas `flex-none`/`flex-1`. Radios nativos en `flex gap-4` (target ~16px). Dropdown de clientes `absolute z-10` que depende del `overflow-visible` del panel. Footer `justify-end` con botones `px-5 py-2`. ✅ Ya usa `askConfirm({ variant: 'danger' })` para `RECHAZADO`. |
| `components/NuevoChequeModal.jsx` (303 líneas) | ❌ Mismo shell centrado `max-w-lg my-8 overflow-visible`. Dos grillas `grid-cols-2` de inputs (Banco/N° Serie, Fecha Emisión/Fecha Cobro) y selector de tipo `grid-cols-2` que a 320-360px comprime el texto. Footer `justify-end`. ✅ El monto ya usa `FormattedNumberInput` (aporta `inputMode` numérico). |
| Backend `ChequeDTO` | Campos disponibles para la tarjeta: `id, fechaRecepcion, clienteId, clienteNombre, ventaId, numeroInterno, monto, banco, fechaCobro, numeroSerie, estado, fechaEntrega, entregadoA, esEmisionPropia, endosadoAClienteId`. `EstadoCheque` = `EN_CARTERA | COBRADO | ENTREGADO | RECHAZADO`. **No existe** `emisor`, ni ningún campo de "días restantes". |

Patrones ya canonizados en el repo que este change debe **reutilizar, no reinventar**:

```
# Listado dual (Etapas 2 y 4 — Clientes.jsx, Productos.jsx, Insumos.jsx)
cards:  <div className="grid grid-cols-1 gap-4 md:hidden"> ... </div>
tabla:  <div className="hidden md:block"> ...tabla actual sin tocar... </div>

# Shell de modal fullscreen (Etapa 2 — ProductoForm.jsx / InsumoForm.jsx; Etapa 4 — AjusteSaldoModal.jsx)
overlay: fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm
panel:   w-full h-full sm:h-auto max-w-* rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[95vh]
header:  flex-none
body:    flex-1 overflow-y-auto
footer:  flex-none (botones flex-1 en mobile, sm:flex-none sm:justify-end en desktop)

# Helper puro de presentación (Etapa 4 — utils/saldoDisplay.js)
describirSaldo(balance) -> { estado, etiqueta, monto, tono: { texto, fondo, chip } }
```

## Goals / Non-Goals

**Goals:**
- Que en un celular la cartera de cheques se lea sin scroll horizontal, con **monto** y **cuándo se cobra** como los dos datos de mayor jerarquía.
- Que los dos modales del módulo usen el mismo shell fullscreen mobile ya canonizado, con footer de acciones fijo alcanzable con el pulgar.
- Que el selector de endoso (Tercero / Cliente) y el buscador de clientes de `ChequeEstadoModal` sean operables con el dedo sin zoom.
- Eliminar la duplicación del mapeo `estado → etiqueta/color` de cheque, hoy escrito como ternarios anidados dentro del JSX de la tabla y a punto de duplicarse en la tarjeta.
- Que las dos tablas densas de `Finanzas.jsx` dejen de requerir scroll horizontal en mobile.

**Non-Goals:**
- No se toca backend: ni `Cheque.java`, ni `EstadoCheque`, ni `ChequeDTO`, ni `ChequeService`, ni endpoints. Los días restantes se derivan en el cliente desde `fechaCobro`.
- No se agregan filtros, buscador ni ordenamiento a `Cheques.jsx` — la página hoy no los tiene y agregarlos es alcance de producto, no de responsive.
- No se rediseñan los KPI cards ni los gráficos Recharts de `Finanzas.jsx`: ya son responsive.
- No se refactoriza `Finanzas.jsx` (830 líneas) a subcomponentes. Es tentador, pero es un refactor ajeno al objetivo responsive y multiplicaría el riesgo de regresión en una pantalla con drill-downs y estado compartido.
- No se toca `HistorialVentas.jsx` (Etapa 3, ya archivada) ni la lógica de reversa contable del rechazo.

## Decisions

### D1 — `Finanzas.jsx` SÍ entra en alcance

El título de la etapa es "Finanzas y Cheques", pero el cuerpo del roadmap solo describe trabajo sobre cheques. Había que decidir si `Finanzas.jsx` era una página futura (el change `us-017-finanzas-ui` figura en el roadmap principal) o una superficie real.

Relevamiento: `us-017-finanzas-ui` **ya está archivado** (`openspec/changes/archive/2026-08-11-us-017-finanzas-ui`), junto con `redisenio-finanzas`, `gastos-finanzas` y `us-019-gastos-saldos`. `Finanzas.jsx` existe, tiene 830 líneas y **dos tablas crudas de 7-9 columnas** en `overflow-x-auto`, además de montar `ChequeEstadoModal` en su propio drill-down de cartera.

**Decisión:** entra en alcance, con tratamiento acotado a lo tabular:
- "Detalle de Ventas" y "Cheques en Cartera" → patrón dual tarjeta/tabla.
- Formulario inline de nuevo gasto y lista de gastos → apilado en mobile.
- KPIs, gráficos y drill-down de COGS → **no se tocan** (ya responsive).

*Alternativa descartada:* dejar `Finanzas.jsx` para una etapa futura. Rompía la etapa por la mitad: el usuario abre `ChequeEstadoModal` desde **las dos** páginas, y arreglar el modal sin arreglar la tabla que lo invoca deja la mitad del flujo en scroll horizontal. Además, "Cheques en Cartera" de Finanzas es literalmente el mismo dato que la etapa manda a convertir en tarjetas.

### D2 — Helper compartido `utils/chequeDisplay.js`

Cuatro consumidores necesitan el mismo mapeo: tarjeta mobile de `Cheques.jsx`, tabla desktop de `Cheques.jsx`, tabla/tarjeta de cartera de `Finanzas.jsx` y el encabezado de resumen de `ChequeEstadoModal`. Hoy el mapeo vive como ternarios anidados dentro del `<td>` de la tabla, y construir la tarjeta sin extraerlo lo duplicaría de entrada.

**Decisión:** crear `frontend/src/utils/chequeDisplay.js` con **dos funciones puras**, siguiendo la convención camelCase de `utils/` (no PascalCase — no son componentes, igual que `saldoDisplay.js` y `errorMessage.js`):

```js
describirEstadoCheque(cheque) -> { estado, etiqueta, tono: { chip, texto }, editable }
describirVencimientoCheque(fechaCobro, hoy?) -> { dias, etiqueta, urgencia, tono }
```

- `describirEstadoCheque` absorbe la regla `esEmisionPropia`: `EN_CARTERA` → `"EMITIDO"`, `COBRADO` → `"DEBITADO"`; en caso contrario `estado.replace('_', ' ')`. Colores existentes preservados: `EN_CARTERA` ámbar, `COBRADO` azul, `ENTREGADO` emerald, `RECHAZADO` rojo. `editable` centraliza la regla hoy inline `!['RECHAZADO','ENTREGADO','COBRADO'].includes(estado)`.
- `describirVencimientoCheque` recibe `hoy` inyectable (default `new Date()`) para ser determinista y testeable.

*Alternativa descartada:* un componente `<ChequeCard />` compartido entre `Cheques.jsx` y `Finanzas.jsx`. Los dos listados muestran subconjuntos distintos (Finanzas filtra a `EN_CARTERA` y muestra tipo Propio/Tercero; Cheques muestra todos los estados y el `entregadoA`) y tienen handlers distintos; un componente único terminaría con props condicionales que ocultan más de lo que comparten. Se comparte el **mapeo semántico**, no el layout.

### D3 — Cálculo de "días restantes para cobro" en el cliente

`ChequeDTO` expone `fechaCobro: LocalDate` (string `YYYY-MM-DD` en JSON) y nada más. No hay campo derivado en backend.

**Decisión:** derivar en el frontend, normalizando ambas fechas a medianoche local antes de restar, para que el resultado sea una diferencia de **días de calendario** y no de milisegundos (evita el clásico off-by-one por husos y por hora del día).

Bandas de presentación:

| Condición | Etiqueta | Urgencia | Tono |
|-----------|----------|----------|------|
| `fechaCobro` ausente | `"Sin fecha de cobro"` | `SIN_FECHA` | gris |
| `dias < 0` | `"Vencido hace N días"` | `VENCIDO` | rojo |
| `dias === 0` | `"Se cobra hoy"` | `HOY` | rojo |
| `1 ≤ dias ≤ 7` | `"En N días"` | `PROXIMO` | ámbar |
| `dias > 7` | `"En N días"` | `LEJANO` | gris |

El umbral de 7 días es el corte de "esta semana", que es la unidad con la que se maneja la cartera en el mostrador. Se documenta como constante nombrada en el helper para que sea ajustable de un solo lugar.

*Nota:* la urgencia solo se muestra cuando el cheque sigue pendiente (`EN_CARTERA`). Un cheque `COBRADO`, `ENTREGADO` o `RECHAZADO` no tiene vencimiento accionable; en esos casos la tarjeta muestra la fecha de cobro plana, sin badge de urgencia, para no gritar "Vencido" sobre un cheque ya cobrado.

### D4 — Breakpoint: `md` para listados, `sm` para shells de modal

Precedente establecido en la Etapa 4 (decisión D4 de `ui-responsive-clientes`) y sostenido por los escenarios del spec `ui-responsive`, que están redactados sobre **768px**:
- **Listados** (tarjeta vs tabla): `md:hidden` / `hidden md:block` — 768px. El roadmap escribe literalmente `sm:`, pero el precedente vigente en `Clientes.jsx`, `Productos.jsx` e `Insumos.jsx` y los escenarios del spec mandan `md`. Se sigue el precedente, no el texto literal del roadmap.
- **Shells de modal**: prefijo `sm:` (640px), replicando exactamente `ProductoForm.jsx` / `InsumoForm.jsx` / `AjusteSaldoModal.jsx`.

Esta asimetría es intencional y ya está canonizada: una tabla de 7 columnas sigue siendo ilegible a 700px, mientras que un modal centrado ya es cómodo a 640px.

### D5 — El dropdown de clientes dentro de un panel scrolleable

`ChequeEstadoModal` y `NuevoChequeModal` usan hoy un dropdown `absolute z-10` que funciona porque el panel tiene `overflow-visible`. Al pasar el cuerpo a `flex-1 overflow-y-auto` (requisito del shell fullscreen), un `absolute` dentro del cuerpo **se recorta** contra el borde del área scrolleable.

**Decisión:** mantener el dropdown `absolute` respecto de su contenedor `relative` (sin portal), pero:
1. Acotar su altura (`max-h-60 overflow-y-auto`, ya presente) para que quepa dentro del viewport del cuerpo.
2. Al abrirse en mobile, asegurar que el campo de búsqueda quede visible haciendo scroll del cuerpo hacia el input activo.
3. Verificar explícitamente en viewport de 320-390px que la lista no queda cortada; si lo queda, el fallback es renderizar la lista **en flujo** (debajo del input, empujando el contenido) en mobile en vez de flotante — solución más simple y robusta que un portal, y coherente con un cuerpo ya scrolleable.

*Alternativa descartada:* mover el dropdown a un portal con posicionamiento calculado. Introduce complejidad de reposicionamiento en scroll/resize desproporcionada para dos usos.

### D6 — `askConfirm` también para el endoso (`ENTREGADO`)

La regla de la Etapa 6 dice literalmente "toda acción de **eliminación**". Hoy `ChequeEstadoModal` confirma solo `RECHAZADO`.

Relevamiento del efecto real: pasar un cheque a `ENTREGADO` con `tipoEndoso === 'CLIENTE'` **suma el monto a la cuenta corriente del cliente endosatario** (lo dice la propia ayuda del modal: *"el monto del cheque se sumará a su deuda como si le hubieras realizado un pago a su favor"*), y además el cheque queda bloqueado para edición (`editable === false`), es decir, la operación no se puede deshacer desde la UI.

**Decisión:** extender `askConfirm({ variant: 'danger' })` a la transición hacia `ENTREGADO` cuando el estado previo no era `ENTREGADO`, con un mensaje que nombre explícitamente al destinatario y advierta que el cheque quedará bloqueado. Es coherente con el espíritu de la regla (confirmar lo irreversible y consecuente en saldos), no solo con su letra.

*Alternativa descartada:* dejarlo sin confirmación por ser "cambio de estado, no borrado". En un celular, con targets chicos, un endoso accidental mueve plata en la cuenta de un cliente equivocado y no tiene deshacer.

### D7 — Fix de `cheque.emisor` incluido en este change

`Finanzas.jsx:784` renderiza `{cheque.emisor}`, campo que no existe en `ChequeDTO` → celda vacía en producción hoy.

**Decisión:** corregirlo a `clienteNombre || 'Suelto'` como parte de la conversión a tarjetas. Racional: la tarjeta mobile tiene que mostrar *algo* en ese lugar, y trasladar el bug a la tarjeta sería propagarlo a una superficie nueva. El fix es de una línea, sin efecto en el contrato de API.

## Risks / Trade-offs

- **[Regresión visual en desktop al agregar el patrón dual]** → La tabla existente se envuelve tal cual en `<div className="hidden md:block">` sin editar su markup interno. Las tarjetas son un bloque nuevo con `md:hidden`. El render ≥768px queda byte-idéntico salvo el fix de D7.
- **[Regresión visual en desktop al tocar los shells de modal]** → Todos los cambios son aditivos con prefijo `sm:` restaurando el aspecto actual (`sm:rounded-2xl`, `sm:h-auto`, `sm:max-h-[95vh]`, `sm:p-4`, `sm:justify-end`). El render ≥640px queda idéntico.
- **[El dropdown de clientes se recorta dentro del cuerpo scrolleable]** → Riesgo real y específico (D5). Mitigación: verificación explícita en viewport chico como tarea, con fallback documentado a lista en flujo.
- **[Duplicación de la información en dos vistas que se desincronizan]** → Las tarjetas y la tabla se alimentan del **mismo** `data.content.map`, y la etiqueta/tono de estado sale del helper compartido; no hay dos fuentes de verdad de presentación.
- **[Cálculo de días con off-by-one por husos horarios]** → Normalización a medianoche local en el helper antes de restar, y `hoy` inyectable para poder verificar el borde exacto (hoy / mañana / ayer).
- **[La confirmación extra del endoso agrega fricción a un flujo frecuente]** → Se dispara una sola vez, únicamente en la transición hacia `ENTREGADO` desde otro estado; un cheque ya entregado no es editable, así que no hay repetición posible.
- **[`Finanzas.jsx` es un archivo grande y las ediciones se dispersan]** → Los cambios se acotan a tres bloques bien delimitados y ya identificados por línea (formulario de gasto ~417-445, tabla de ventas ~640-696, tabla de cartera ~761-815); no se toca el estado, ni las queries, ni los drill-downs.

## Migration Plan

No aplica: cambios de presentación en frontend, sin datos, sin migraciones y sin cambios de contrato. Rollback = revertir el commit del change.

## Open Questions

- Ninguna bloqueante. Dos puntos a resolver por verificación en dispositivo real (< 390px), ya contemplados como sub-tareas:
  1. Si el dropdown de clientes de `ChequeEstadoModal` queda recortado dentro del cuerpo scrolleable, se aplica el fallback de lista en flujo (D5).
  2. Si el umbral de 7 días para "próximo a cobrar" resulta demasiado corto en el uso real del mostrador, es una constante nombrada en el helper y se ajusta de un solo lugar.
