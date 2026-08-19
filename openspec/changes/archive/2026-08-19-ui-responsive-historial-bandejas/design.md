## Context

Estado real relevado en el código **antes** de proponer (no se asumió nada del roadmap).

### `frontend/src/components/HistorialBandejasModal.jsx` (103 líneas)

| Aspecto | Estado actual | Veredicto |
|---------|---------------|-----------|
| Overlay | `fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm` | Ya es el shell canónico de la Etapa 4. No se toca. |
| Panel | `w-full h-full sm:h-auto max-w-2xl rounded-none sm:rounded-2xl ... max-h-screen sm:max-h-[90vh] flex flex-col` | Fullscreen mobile correcto, pero `max-w-2xl` (672px) es angosto para 5 columnas. |
| Bandas | header `flex-none p-6 border-b`, cuerpo `p-0 overflow-y-auto flex-1 bg-gray-50/50` | Correctas. Sin footer: el modal es de solo lectura, cierra por la X del header. |
| Listado | `<div className="overflow-x-auto"><table className="w-full min-w-[560px] ...">` | **La causa del scroll horizontal.** `min-w-[560px]` fuerza 560px de ancho mínimo en un viewport de 320-390px. |
| Columnas | Fecha, Tipo, Cantidad (der.), Detalle (centro), Usuario (der.) | 5 columnas, todas con `whitespace-nowrap` salvo la del chip. |
| Mapeo de tipo | Ternario inline: `mov.tipo === 'ENTREGA' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'` | A punto de duplicarse al construir la tarjeta. |
| Detalle | Ternario inline: `mov.ventaId ? 'Venta #' + mov.ventaId : 'Devolución directa'` | Mismo caso. |
| Loading / vacío | Spinner `p-12` centrado y mensaje `p-12 text-center` | Agnósticos al viewport. No se tocan. |
| Feedback | `pushToast('error', ...)` desde `useUIStore` en el catch del fetch | Cumple la regla dura 7. No se toca. |

### Contrato de datos

`HistorialBandejasDTO` (backend, sin cambios) expone exactamente:

```java
Long id; Long clienteId; String clienteNombre; Long ventaId;
Integer cantidad; String tipo; LocalDateTime fecha; String usuarioNombre;
```

No hay ningún campo adicional disponible: la tarjeta se construye con **estos ocho campos y nada más**. `tipo` es un `String` y en el código actual solo se discrimina `ENTREGA` contra "todo lo demás" (en la práctica, `DEVOLUCION`).

### Call sites

`Clientes.jsx:374` y `DevolucionBandejas.jsx:128`, ambos con las props `isOpen` / `onClose` / `cliente`. La firma no cambia, así que **ningún call site se edita**.

### Patrones ya canonizados que este change reutiliza, no reinventa

```
# Listado dual (Etapas 2, 4 y 6 - Clientes.jsx, Productos.jsx, Insumos.jsx, Cheques.jsx)
cards:  <div className="grid grid-cols-1 gap-4 md:hidden"> ... </div>
tabla:  <div className="hidden md:block"> ...tabla actual sin tocar... </div>

# Helper puro de presentación (Etapa 4 - utils/saldoDisplay.js; Etapa 6 - utils/chequeDisplay.js)
describirX(valor) -> { etiqueta, tono: { chip, texto } }
Convención de nombre de archivo: camelCase (NO PascalCase - no son componentes).
```

## Goals / Non-Goals

**Goals:**

- Que el historial de bandejas se lea completo en un celular de 320-390px **sin un solo pixel de scroll horizontal**.
- Que en la tarjeta mobile los dos datos de mayor jerarquía sean **qué pasó** (entrega o devolución) y **cuántas bandejas**, que es la pregunta que el operario le hace a esta pantalla.
- Que en escritorio el modal use un ancho acorde a sus 5 columnas, dejando de comprimir la fecha con hora y el nombre de usuario.
- Que el mapeo `tipo -> etiqueta/color` y `ventaId -> detalle` exista en **un solo lugar**, consumido tanto por la tarjeta como por la tabla.
- Que el render en escritorio quede visualmente equivalente al actual salvo por el ancho mayor.

**Non-Goals:**

- **No se toca backend.** Ni `BandejasController`, ni `BandejasService`, ni `HistorialBandejasDTO`, ni el endpoint `GET /clientes/{id}/bandejas/historial`. Ningún campo nuevo, ninguna proyección nueva.
- **No se agrega paginación, filtros ni ordenamiento** al historial. Hoy no los tiene (`response.data` es una lista plana) y agregarlos es alcance de producto, no de responsive.
- **No se toca el shell del modal** (overlay, bandas header/cuerpo, animación, cierre): ya cumple el patrón fullscreen mobile canonizado y el spec vigente lo declara así.
- **No se tocan `DevolucionBandejasModal.jsx` ni `ConversorBandejas.jsx`.** Son componentes hermanos de la misma feature pero fuera del pedido del usuario.
- **No se edita `DevolucionBandejas.jsx`**: está siendo modificada por el change activo `bandejas-acceso-limitado` y no hay razón para tocarla acá.
- **No se agrega feedback nuevo** (`askConfirm`, toasts extra): el modal es de solo lectura, no ejecuta acciones destructivas.

## Decisions

### D1 - Breakpoint: `md` (768px) para el switch tarjeta/tabla

Precedente vigente y explícito en el repo, establecido en la decisión D4 de `ui-responsive-clientes` y sostenido por `ui-responsive-finanzas`: **los listados conmutan en `md` (768px), los shells de modal en `sm` (640px)**. Los escenarios del spec `ui-responsive` están redactados literalmente sobre "menor a 768px" / "mayor a 768px".

**Decisión:** `md:hidden` para el bloque de tarjetas y `hidden md:block` para el contenedor de la tabla. Sin excepciones ni breakpoints intermedios.

*Alternativa descartada:* usar `sm` (640px) para alinear el switch del listado con el switch del shell del modal, y así tener un único punto de quiebre en el archivo. Se descarta porque una tabla de 5 columnas con fecha+hora completa y nombre de usuario sigue siendo ilegible a 700px, y porque romper el precedente en un solo componente hace inconsistente el sistema entero. La asimetría `sm` para shell / `md` para listado es intencional y ya está canonizada.

**Matiz importante para este componente:** el modal es fullscreen hasta `sm` (640px) y centrado a partir de ahí, pero el switch tarjeta/tabla ocurre en `md` (768px). Es decir, en la franja **640-767px** el modal ya está centrado y **todavía muestra tarjetas**. Es correcto y deliberado: el ancho útil de contenido ahí sigue sin alcanzar para 5 columnas.

### D2 - Ancho de escritorio: `max-w-2xl` a `max-w-4xl`

El usuario reporta que "se ve muy chico". Hay que elegir un salto concreto, no un "más grande".

Relevamiento de anchos en los modales del repo: `max-w-lg` (512px) para formularios de un campo por fila (`InsumoForm`, `NuevoChequeModal`, `SiembraForm`), `max-w-2xl` (672px) para formularios de dos columnas (`ProductoForm`) y para el comprobante de venta. No existe hoy ningún modal de listado tabular, así que no hay precedente que copiar.

**Decisión:** `max-w-4xl` (896px).

Racional cuantitativo: las 5 columnas tienen un ancho natural mínimo estimado de `Fecha ~180px` (formato `es-AR` con hora: `19/8/2026, 14:32:05`), `Tipo ~110px` (chip), `Cantidad ~90px`, `Detalle ~150px` (`Devolución directa`) y `Usuario ~140px` = **~670px de contenido**, con el `p-4` de cada celda ya incluido en esas estimaciones. A 672px (`max-w-2xl`) el contenido queda exactamente en el límite y por eso hoy se ve apretado; a 896px sobran ~220px que se reparten entre columnas, que es el "respiro" que el usuario pide. `max-h-[90vh]` se mantiene: el crecimiento es horizontal, no vertical.

*Alternativas descartadas:*
- `max-w-3xl` (768px): son solo 96px más que hoy. Es un cambio que el usuario probablemente no percibiría, y volver a pedir el mismo ajuste es peor que pasarse un poco.
- `max-w-5xl` (1024px) o `max-w-6xl`: un modal de lectura de 1024px+ deja de leerse como diálogo y compite con la página de fondo; además en un notebook de 1366px de ancho con sidebar visible el overlay quedaría casi sin margen. 896px es el punto donde el modal sigue siendo un diálogo.
- Ancho fluido (`w-[90vw] max-w-4xl`): el `w-full` actual dentro de un overlay con `p-4` ya da ese comportamiento; agregar `w-[90vw]` no aporta y rompe el fullscreen mobile.

### D3 - Se elimina `min-w-[560px]` y el `overflow-x-auto` que lo envuelve

El `min-w-[560px]` existía como muleta: garantizaba que en mobile la tabla no se comprimiera hasta romperse, a costa de forzar el scroll horizontal que el usuario reporta.

**Decisión:** al pasar la tabla a `hidden md:block`, el mínimo deja de tener función y se elimina junto con el `<div className="overflow-x-auto">` que lo contenía. A partir de 768px de viewport, dentro de un panel de hasta 896px, las 5 columnas entran sin comprimirse (ver el cálculo de D2), así que no hay escenario donde el scroll horizontal sea necesario.

Se conserva `w-full text-left border-collapse` en la `<table>`, `sticky top-0` en el `<thead>` (el cuerpo del modal sigue siendo el contenedor scrolleable vertical) y todo el markup interno de filas y celdas **sin editar**, salvo el reemplazo de los dos ternarios inline por las llamadas al helper (D4).

*Alternativa descartada:* dejar el `overflow-x-auto` "por las dudas" en el contenedor de escritorio. Sería código muerto que oculta regresiones: si algún día una columna crece de más, preferimos que se note en desktop a que se esconda tras un scroll que nadie descubre.

### D4 - Helper compartido `frontend/src/utils/bandejasDisplay.js`

Dos consumidores necesitan el mismo mapeo: la tarjeta mobile y la tabla desktop. Hoy vive como dos ternarios inline dentro de `<td>`; construir la tarjeta sin extraerlo lo duplicaría de entrada, que es exactamente el error que la decisión D2 de `ui-responsive-finanzas` ya identificó para cheques.

**Decisión:** crear `frontend/src/utils/bandejasDisplay.js` con **dos funciones puras**, en camelCase (no PascalCase: no son componentes), siguiendo el molde de `chequeDisplay.js` y `saldoDisplay.js`:

```js
describirTipoMovimiento(tipo) -> { etiqueta, tono: { chip, texto } }
describirDetalleMovimiento(mov) -> { etiqueta, esVenta }
```

- `describirTipoMovimiento` preserva **exactamente** los colores actuales: `ENTREGA` produce `bg-orange-50 text-orange-700`; cualquier otro valor (`DEVOLUCION`, `null`, `undefined`) produce `bg-emerald-50 text-emerald-700`. La etiqueta es el propio `tipo` (como hoy), con fallback a cadena vacía si viene nulo. Se agrega `tono.texto` (`text-orange-700` / `text-emerald-700`) porque la tarjeta necesita colorear texto suelto, no solo un chip.
- `describirDetalleMovimiento` absorbe `mov.ventaId ? 'Venta #' + mov.ventaId : 'Devolución directa'`, exponiendo además `esVenta` para que la tarjeta pueda decidir si mostrar un icono de venta.
- Ambas son puras y sin dependencias de React, así que son verificables leyendo el archivo, sin navegador.

*Alternativa descartada:* un componente `<MovimientoBandejasCard />` en `components/`. Tiene un único consumidor (este modal) y su markup son ~20 líneas; extraerlo agrega un archivo y un salto de indirección sin ganancia. Lo que se comparte entre tarjeta y tabla es el **mapeo semántico**, no el layout: mismo criterio que la decisión D2 de `ui-responsive-finanzas`.

*Alternativa descartada:* un `switch` exhaustivo sobre todos los valores posibles de `tipo`. El backend expone `tipo` como `String` libre y el código actual solo discrimina `ENTREGA`; replicar esa lógica binaria mantiene el comportamiento idéntico y evita inventar estados que el DTO no garantiza.

### D5 - Jerarquía de la tarjeta mobile: tipo + cantidad arriba, resto abajo

La tabla trata a las 5 columnas como iguales. Una tarjeta no puede: tiene que decidir qué se lee de un vistazo.

**Decisión:** estructura en tres bandas, análoga a la tarjeta de cheque de la Etapa 6 (dato principal grande + chip de estado arriba, secundarios en `text-xs` abajo):

```
+-----------------------------------------+
|  [chip ENTREGA/DEVOLUCION]        28    |  <- banda 1: tipo (chip color) + cantidad (text-2xl font-bold)
|                              bandejas   |
|-----------------------------------------|
|  19/08/2026, 14:32                      |  <- banda 2: fecha corta (text-xs text-gray-500)
|  Venta #142                             |  <- banda 3: detalle + usuario (text-xs text-gray-500)
|  por: Juan Perez                        |
+-----------------------------------------+
```

- **Banda 1:** `flex items-start justify-between`. El chip de tipo a la izquierda (mismo `tono.chip` que la tabla), la cantidad a la derecha en `text-2xl font-bold text-gray-900` con la palabra "bandejas" debajo en `text-xs text-gray-500`. Cantidad y tipo son la respuesta a "qué pasó y por cuántas".
- **Bandas 2 y 3:** `mt-3 space-y-1 text-xs text-gray-500`, con la fecha en formato **corto** (ver D6), el detalle y el usuario prefijado con `por:` para que se entienda sin encabezado de columna.
- Contenedor: `bg-white border border-gray-200 rounded-2xl p-4 shadow-sm`, idéntico al de la tarjeta de cheque, sobre el `bg-gray-50/50` que el cuerpo del modal ya tiene.
- El bloque de tarjetas necesita padding propio (`p-4`) porque el cuerpo del modal es `p-0` (la tabla lo aportaba por celda).

*Alternativa descartada:* poner la fecha como dato principal. El historial ya viene ordenado y el usuario abre esta pantalla para saber *cuántas bandejas debe el cliente y por qué*, no para navegar una línea de tiempo.

### D6 - Formato de fecha corto en la tarjeta, formato completo en la tabla

`new Date(mov.fecha).toLocaleString('es-AR')` produce `19/8/2026, 14:32:05`: 19 caracteres con segundos, que en una tarjeta de 320px compiten con el resto del contenido.

**Decisión:** la tabla conserva `toLocaleString('es-AR')` **sin cambios** (es el render de escritorio, hoy correcto). La tarjeta usa `toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })`, que produce `19/08/2026, 14:32`. Los segundos no aportan información accionable en un historial de bandejas.

Esta diferencia es deliberada y es la única divergencia de contenido entre ambas vistas; todo lo demás muestra los mismos datos.

*Alternativa descartada:* unificar ambas al formato corto. Cambiaría el render de escritorio, que no es lo que el usuario pidió, y ampliaría innecesariamente la superficie de regresión visual.

## Risks / Trade-offs

- **[Regresión visual en escritorio al agregar el patrón dual]** -> La `<table>` y todo su markup interno se envuelven tal cual en `<div className="hidden md:block">` sin reordenar filas ni celdas; el único cambio dentro de la tabla es sustituir dos ternarios por dos llamadas al helper que devuelven **las mismas cadenas de clases y el mismo texto**. Verificable comparando el diff línea por línea.
- **[El modal más ancho desborda en notebooks chicos]** -> `max-w-4xl` (896px) más el `p-4` del overlay da 928px de huella. En el viewport más chico donde el modal ya está centrado (768px) el `max-w` no llega a activarse: manda `w-full` menos el padding. No hay escenario de desborde; sí hay menos margen visual alrededor del diálogo entre 900 y 1100px, que es el precio consciente de agrandar.
- **[Franja 640-767px muestra tarjetas dentro de un modal ya centrado]** -> Es el resultado esperado de la asimetría `sm`/`md` documentada en D1, no un bug. Se deja explícito acá y en las tasks para que no se "corrija" por error en una revisión futura.
- **[Duplicación de datos en dos vistas que se desincronizan]** -> Tarjetas y tabla se alimentan del **mismo** `historial.map` y del **mismo** helper de presentación. No hay dos fuentes de verdad; agregar un campo obliga a tocar los dos bloques, y eso es visible en el mismo archivo.
- **[La tarjeta rompe con `usuarioNombre` o `tipo` nulos]** -> El helper aplica el fallback binario (cualquier `tipo` que no sea `ENTREGA` cae en la rama esmeralda, incluido `null`) y la tarjeta usa `mov.usuarioNombre || '-'`. Ningún acceso encadenado sin guarda.
- **[Solapamiento con el change activo `bandejas-acceso-limitado`]** -> Ese change toca `DevolucionBandejas.jsx`, `BandejasController`, `BandejasService` y permisos; este change toca `HistorialBandejasModal.jsx` y un archivo nuevo en `utils/`. **Intersección vacía.** Se puede implementar en paralelo sin coordinación.
- **[Sin verificación en navegador]** -> No hay entorno de navegador disponible en esta sesión. Todas las tasks están redactadas para ser verificables por revisión de código (presencia o ausencia de clases concretas, pureza de funciones, equivalencia de cadenas). La verificación visual en dispositivo real queda como paso posterior explícito.

## Migration Plan

No aplica. Cambios de presentación en frontend: sin datos, sin migraciones de esquema, sin cambios de contrato de API y sin cambios en la firma de props del componente. Rollback = revertir el commit del change.

## Open Questions

Ninguna bloqueante.

Dos puntos quedan sujetos a verificación visual posterior en dispositivo real, ambos con la corrección acotada a un token de Tailwind en un solo archivo:

1. Si a 896px el modal resulta *demasiado* ancho para el gusto del usuario, el ajuste es cambiar `max-w-4xl` por `max-w-3xl` en la línea del panel (D2).
2. Si en la franja 640-767px las tarjetas dentro del modal centrado se sienten desaprovechadas, el ajuste es mover el switch de `md` a `lg`. **No** se hace preventivamente: rompería el precedente de D1 sin evidencia.
