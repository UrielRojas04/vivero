## Context

`RegistroSemilla` (libro de entradas de semilla, sin control de stock/saldo) y `Siembra` (proceso productivo con estados `EN_PROCESO` → `FINALIZADA` → `EN_STOCK`) son hoy dos tablas sin ninguna relación en el modelo de datos. `Siembra.codigoLote` es texto libre sin unicidad; `RegistroSemilla.lote` también. `Siembra.cantidad` no es "cantidad de semillas": es la etiqueta real del formulario "Cantidad Inicial (**Bandejas**)", y el total de plantas sale de `cantidad(bandejas) × VariedadBandeja.cantidadCeldas`.

`RegistroSemilla.unidadCantidad` puede ser `SEMILLAS`, `SOBRES` (con `contenidoPorSobre`) o `GRAMOS`. Sólo las dos primeras se pueden convertir a un conteo de semillas; `GRAMOS` no tiene forma de convertirse (no existe un campo de "peso por semilla" en el modelo) y queda explícitamente fuera de alcance de este change.

Este change fue acordado en conversación directa con el dueño (Sergio); las decisiones de abajo ya fueron confirmadas por él, no son propuestas abiertas.

## Goals / Non-Goals

**Goals:**
- Vincular opcionalmente una `Siembra` (origen `SOBRE`) con el `RegistroSemilla` del que salió la semilla.
- Sugerir (no forzar) una cantidad de bandejas en base a la conversión semillas → bandejas, dejando el campo siempre editable.
- Reflejar en `RegistroSemilla` si la semilla ya se usó (`SEMBRADAS`) o ya no queda utilizable (`CONSUMIDA`, acción manual).
- Permitir registrar una fecha futura en la que una semilla debe sembrarse, distinta de la fecha en que se recibió.
- Dar una forma rápida (dos filtros: quincena actual / próxima) de ver qué hay que sembrar pronto.

**Non-Goals:**
- NO se implementa conversión de `GRAMOS` a cantidad de semillas (no hay dato de peso por semilla). Los registros en gramos no ofrecen autocálculo de bandejas.
- NO se trackea cantidad remanente de semilla (no es un sistema de stock/saldo). El ciclo de vida es binario desde el punto de vista de disponibilidad: disponible (`SIN_SEMBRAR` o `SEMBRADAS`) vs no disponible (`CONSUMIDA`).
- NO se migran retroactivamente los `codigoLote` de texto libre ya cargados hacia la nueva FK (no hay forma confiable de hacer ese matching sin riesgo de vincular mal por typos).
- NO aplica a siembras de origen `SUELTO` (no tienen un registro de semilla del que provengan).

## Decisions

### 1. `estado` de `RegistroSemilla`: tres valores, no un booleano
`SIN_SEMBRAR` (default) → `SEMBRADAS` (automático) → `CONSUMIDA` (manual, terminal).
- **Por qué**: un registro puede vincularse a más de una siembra en la vida real (se reparte en tandas). Un booleano "usado sí/no" no distingue "ya se usó pero podría quedar más" de "ya no queda nada". El estado intermedio `SEMBRADAS` es puramente informativo (no bloquea reuso); `CONSUMIDA` es la única transición que saca al registro de la lista de opciones para vincular.
- **Alternativa descartada**: trackear cantidad restante (cantidad ingresada − suma de cantidades vinculadas). Se descartó explícitamente por el dueño: agrega complejidad de conciliación (unidades mixtas, pérdidas reales de semilla) para un beneficio marginal frente a un botón manual de "Consumir".

### 2. El estado pasa a `SEMBRADAS` al **vincular**, no al **finalizar** la siembra
La transición `EN_PROCESO → FINALIZADA` (método `finalizarSiembra`) puede ocurrir semanas o meses después de sembrar. Si el estado del registro esperara a esa transición, seguiría apareciendo como "pendiente de sembrar" en los filtros de quincena mucho después de haberse sembrado realmente — justo lo que el filtro busca evitar. El hook correcto es la creación/edición de la `Siembra` con `registroSemillaId` seteado, no `finalizarSiembra` ni `pasarAStock`.

### 3. La cantidad de bandejas sugerida es un default editable, no una validación
Fórmula: `bandejasSugeridas = floor(cantidadSemillas(registro) / variedadBandeja.cantidadCeldas)`, donde `cantidadSemillas(registro) = SOBRES ? cantidad × contenidoPorSobre : cantidad` (sólo si `unidadCantidad` ∈ {`SEMILLAS`, `SOBRES`}).
- Se autocompleta en el campo `cantidad` del formulario de Siembra al elegir el registro y la bandeja, igual que ya hace `handleBandejaChange` con `cantidadCeldas` hoy — mismo patrón, no un campo nuevo de sólo lectura.
- El usuario puede sobrescribirlo libremente. **Por qué**: en la práctica se pierden semillas o se ponen varias por celda; forzar el cálculo exacto generaría fricción y valores incorrectos que el usuario no podría corregir.
- **Riesgo aceptado**: la "sugerencia" puede quedar desactualizada si el usuario cambia la bandeja después de tocar el campo a mano. Se resuelve igual que hoy: recalcular sólo dispara en el evento `onChange` de bandeja/registro, nunca sobre-escribe un valor que el usuario ya tocó manualmente en la misma sesión de edición.

### 4. Selector de `RegistroSemilla` en el formulario de Siembra (origen `SOBRE`)
Reemplaza el input de texto libre de `codigoLote`. Busca por `lote`, `cliente.nombre` o `nombreQuienTrajo`, y excluye del listado los registros en estado `CONSUMIDA`. Al elegir uno, autocompleta `codigoLote` (con el valor de `RegistroSemilla.lote`, editable igual que hoy) y dispara el cálculo de bandejas (Decisión 3).

### 5. Filtros de quincena: sólo dos, calculados por fecha de hoy — sin tocar el backend
"Quincena actual" y "Próxima quincena" (convención estándar: días 1–15 y 16–fin de mes). `RegistroSemillas.jsx` ya trae la lista completa sin paginar y filtra en cliente (`registroSemillasApi.getAll()` + `.filter()`) — el filtro de quincena se suma como un filtro más sobre el array ya cargado, comparando `fechaSiembraProgramada` contra el rango de la quincena calculada en el momento de renderizar. No requiere cambios de query en el backend.
- **Alternativa descartada**: lista dinámica de todas las quincenas con registros pendientes (cubriría el caso "en 3 meses" que mencionó el dueño). Se descartó explícitamente: el dueño sólo quiere ver la quincena actual y la próxima: lo que esté más lejos simplemente no aparece filtrado todavía (sigue visible en la lista general, sin filtro aplicado).

### 6. FK opcional `Siembra.registroSemillaId`, sin restricción de unicidad
Muchas `Siembra` pueden apuntar al mismo `RegistroSemilla` (Decisión 1). Nullable: las siembras `SUELTO` y las `SOBRE` sin vínculo (registros viejos, o el jefe elige no vincular) siguen funcionando exactamente igual que hoy.

## Risks / Trade-offs

- [Un registro `SEMBRADAS` pero no `CONSUMIDA` puede olvidarse sin marcar nunca] → Mitigación: no es un bloqueo funcional (sigue disponible para vincular, no rompe nada); es un recordatorio de higiene de datos, no una garantía del sistema.
- [El cálculo de bandejas sugerido puede confundir si el usuario no entiende que es editable] → Mitigación: mismo patrón visual que ya usa `handleBandejaChange` hoy (un valor pre-cargado en un input normal), no un campo bloqueado ni de solo lectura.
- [Registros con `unidadCantidad = GRAMOS` no tienen autocálculo] → Mitigación: se documenta como fuera de alcance; el campo de bandejas queda en blanco/manual para esos casos, igual que el comportamiento actual.
- [Este change depende de `registro-semillas-clientes`, todavía no archivado] → Mitigación: no hay dependencia de código bloqueante (el modelo `RegistroSemilla` ya existe y es funcional, 46/47 tareas), sólo una dependencia de proceso en OpenSpec (sus specs no están aún en `openspec/specs/`). Conviene archivar ese change antes o en paralelo con este.

## Migration Plan

1. Backend: agregar columnas nullable `registro_semilla_id` (FK en `siembras`) y `estado` (default `SIN_SEMBRAR`) + `fecha_siembra_programada` (nullable, en `registros_semillas`). Ninguna es `NOT NULL` sin default — cero impacto en filas existentes.
2. Endpoint nuevo para "consumir" un registro (transición `estado → CONSUMIDA`), con validación de que no se pueda revertir desde el frontend (una vez `CONSUMIDA`, sin botón para volver atrás — si hace falta revertir, es un caso manual por base de datos, no un flujo de UI).
3. Frontend: selector de registro + autocálculo en `SiembraForm.jsx`; campo de fecha programada en `RegistroSemillaForm.jsx`; filtros de quincena + badge de estado + botón "Consumir" en `RegistroSemillas.jsx`.
4. Sin rollback especial: todas las columnas nuevas son opcionales, no hay migración de datos existentes que revertir.

## Open Questions

Ninguna pendiente — todas las decisiones de diseño fueron confirmadas por el dueño antes de escribir este documento.
