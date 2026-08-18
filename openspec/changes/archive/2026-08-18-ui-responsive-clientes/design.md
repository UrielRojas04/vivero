## Context

Estado real relevado en el código antes de proponer:

| Archivo | Estado responsive actual |
|---------|--------------------------|
| `pages/Clientes.jsx` | ✅ Ya tiene patrón dual: `grid grid-cols-1 gap-4 md:hidden` (cards) + `hidden md:block` (tabla). ✅ Ya usa `askConfirm` en **ambas** vistas. ⚠️ El saldo se muestra como chip `text-xs` sin etiqueta de estado; `balanceDinero === 0` cae en la rama verde ("a favor"). |
| `components/AjusteSaldoModal.jsx` | ⚠️ Diálogo centrado `max-w-md` con `p-4` fijo, `rounded-2xl` siempre, sin `h-full`/`max-h-screen`, footer con botones chicos alineados a la derecha. ✅ El input de monto ya usa `FormattedNumberInput` (`type="number" inputMode="numeric"`). |
| `components/DevolucionBandejasModal.jsx` | ⚠️ Mismo shell centrado `max-w-md`, footer `justify-end`. ✅ Input ya numérico vía `FormattedNumberInput`. |
| `components/HistorialBandejasModal.jsx` | ⚠️ `max-w-2xl max-h-[90vh] flex flex-col` con scroll interno — mejor que los otros dos, pero no fullscreen en mobile. |
| `components/ClienteForm.jsx` | ✅ Fuera de alcance: solo tiene campos `text` y `tel`; ya fue revisado en `ui-responsive-ventas` task 4.4. |

El patrón fullscreen ya canonizado en el repo (Etapa 2, `ui-responsive-catalogo`) es el de `ProductoForm.jsx` / `InsumoForm.jsx`:

```
overlay: fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm
panel:   w-full h-full sm:h-auto max-w-* rounded-none sm:rounded-2xl flex flex-col max-h-screen sm:max-h-[95vh]
header:  flex-none
body:    flex-1 overflow-y-auto
footer:  flex-none  (botones flex-1 en mobile)
```

## Goals / Non-Goals

**Goals:**
- Que en un celular el saldo del cliente se lea de un vistazo: monto grande, etiqueta explícita (`Debe` / `A favor` / `Sin saldo`) y color vivo.
- Que los tres modales de cuenta corriente usen el mismo shell fullscreen mobile que ya usan los formularios de catálogo, con footer de acciones fijo y botones alcanzables con el pulgar.
- Eliminar la divergencia de criterio de color/etiqueta del saldo entre card mobile, tabla desktop y modal de ajuste.

**Non-Goals:**
- No se rediseña la lógica de ajuste de saldo ni el flujo de devolución de bandejas.
- No se toca `ClienteForm.jsx` (ya cubierto en Etapa 3).
- No se toca cheques ni finanzas (Etapa 5).
- No se cambia nada de backend, DTOs, endpoints ni entidades `CuentaCorriente*`.
- No se migra `Clientes.jsx` a TanStack Query (hoy usa `api.get` + `useState`); es refactor ajeno a lo responsive.

## Decisions

### D1 — Qué cuenta como "UI de Cuentas Corrientes" en este código

El roadmap nombra explícitamente solo el modal de "Ajustar Saldo". En el código no existe una página `CuentasCorrientes`: la cuenta corriente vive **dentro de la pantalla Clientes**, desplegada en tres modales que se abren desde la misma fila/card:

- `AjusteSaldoModal` → cuenta corriente de **dinero** (el que nombra el roadmap).
- `DevolucionBandejasModal` + `HistorialBandejasModal` → cuenta corriente de **bandejas**.

**Decisión:** los tres entran en alcance, pero con tratamientos distintos:
- `AjusteSaldoModal` recibe tratamiento completo (shell fullscreen + rediseño del bloque de saldo).
- Los dos de bandejas reciben **solo** el shell fullscreen + touch targets, sin rediseño de contenido.

*Alternativa descartada:* limitarse literalmente a `AjusteSaldoModal` — dejaría dos modales hermanos, abiertos desde la misma card, con comportamiento visual inconsistente en el mismo dispositivo.

### D2 — Helper compartido para la presentación del saldo

Tres consumidores (card mobile, celda de tabla desktop, panel del modal de ajuste) repiten hoy la misma expresión `balanceDinero < 0 ? rojo : verde`, y los tres arrastran el mismo bug con el cero.

**Decisión:** crear `frontend/src/utils/saldoDisplay.js` exportando una función pura:

```js
describirSaldo(balance) -> { estado: 'DEUDA'|'A_FAVOR'|'NEUTRO', etiqueta, monto, tono: { texto, fondo, chip } }
```

Función pura, sin JSX, en `utils/` (no en `components/`), por lo que la regla de PascalCase de componentes no aplica — el archivo sigue la convención camelCase ya usada por `utils/errorMessage.js`.

*Alternativa descartada:* un componente `<SaldoBadge />`. Se necesitan tres presentaciones muy distintas (chip chico en tabla, bloque grande en card, panel destacado en modal); un componente único terminaría con un prop `variant` de tres valores que es peor que compartir solo el mapeo semántico.

### D3 — Convención de signo

Se conserva la semántica existente del backend, sin tocarla:
- `balanceDinero < 0` → el cliente **debe** (deuda) → rojo.
- `balanceDinero > 0` → el cliente tiene **saldo a favor** → emerald.
- `balanceDinero === 0` → **sin saldo** → gris neutro (hoy se pinta verde: es el bug a corregir).

El monto se muestra siempre en valor absoluto (`Math.abs`) acompañado de la etiqueta; mostrar `$ -15.000` junto a la palabra "Debe" es redundante y se lee peor en pantalla chica.

### D4 — Breakpoint: `md` en Clientes, no `sm`

`Clientes.jsx` corta en `md` (768px), mientras la regla del roadmap escribe `sm:`. Los escenarios del spec `ui-responsive` están redactados sobre **768px**, así que `md` es el correcto y ya está aplicado. **No se cambia el breakpoint del listado** para no generar churn. Para los modales sí se usa `sm:` en el shell, respetando literalmente el patrón de `ProductoForm`/`InsumoForm` ya canonizado.

### D5 — `askConfirm` ya cumplido, se verifica y no se rompe

`Clientes.jsx` ya tiene `handleConfirmDelete` con `askConfirm({ title, message, variant: 'danger', confirmLabel, onConfirm })` en card y tabla. Se verifica que siga así al final del change; no hay migración pendiente.

## Risks / Trade-offs

- **[Regresión visual en desktop al tocar el shell de los modales]** → Todos los cambios de shell son estrictamente aditivos con prefijo `sm:` restaurando el aspecto actual (`sm:rounded-2xl`, `sm:h-auto`, `sm:max-h-[95vh]`, `sm:p-4`). El render ≥640px queda idéntico.
- **[El helper de saldo introduce un archivo nuevo por tres usos]** → Es una función pura de ~20 líneas; el costo de mantenerla es menor que el de tener el mapeo duplicado tres veces (que ya produjo el bug del cero).
- **[Ambigüedad de "deuda" para el usuario final]** → Se usa vocabulario del mostrador ("Debe" / "A favor"), no términos contables ("saldo deudor"), coherente con el resto de la UI en español rioplatense.
- **[`HistorialBandejasModal` fullscreen podría ocultar el botón cerrar tras el scroll]** → El header se mantiene `flex-none` y el body `flex-1 overflow-y-auto`; el header nunca scrollea.

## Migration Plan

No aplica: cambios de presentación en frontend, sin datos ni contratos. Rollback = revertir el commit del change.

## Open Questions

- Ninguna bloqueante. Se validará en dispositivo real (< 360px de ancho) que los dos botones `Registrar Pago` / `Nueva Deuda` del `AjusteSaldoModal` sigan legibles en `grid-cols-2`; si no lo están, se apilan a `grid-cols-1 sm:grid-cols-2` (contemplado como sub-tarea).
