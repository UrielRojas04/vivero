## Context

Al cerrar una venta, el precio por unidad que se cobra no siempre es el precio de lista del producto: hay descuentos puntuales, redondeos y ajustes de último momento acordados con el cliente. Hoy ese ajuste es imposible sin salir a editar el producto en el catálogo, lo que cambiaría el precio para todas las ventas futuras.

**Estado actual del código (auditado para este change):**

- `VentaDetalleRequestDTO` sólo acepta `productoId` + `cantidad`. No hay forma de que el cliente HTTP proponga un precio.
- `VentaServiceImpl.crearVenta()` tiene **dos ramas** dentro del mismo `for` sobre `request.getDetalles()`:
  - rama **Abono** (`esAbono == true`, ~líneas 170-187): descuenta de `StockAbono`, y hace `precioHist = producto.getPrecio()`.
  - rama **Vivero / Herramientas** (`else`, ~líneas 188-220): valida stock, registra `MovimientoStock` con costo congelado, y hace el mismo `precioHist = producto.getPrecio()`.
  - Ambas ramas calculan `subtotalLine = precioHist * cantidad` y acumulan en `subtotal`. Después, fuera del loop: `venta.subtotal = subtotal`, `descuento = subtotal * porcentajeDescuento / 100`, `venta.totalFinal = subtotal - descuento`.
- `VentaDetalle` **ya tiene** `precioUnitarioHistorico` y `subtotal` persistidos por línea. Son un snapshot, no una referencia viva al producto: nada los recalcula después de la venta. **No hace falta ningún campo nuevo en el modelo ni migración de schema.**
- Frontend: el carrito vive en `useCartStore` (Zustand + `sessionStorage`). Cada línea es `{ productoId, nombre, precio, cantidad, stock }`, donde `precio` se copia de `producto.precio` en `agregarProducto()`. `totalCalculado` se deriva de `d.precio * d.cantidad`, y el payload de `handleSubmit()` manda **sólo** `{ productoId, cantidad }` — el `precio` del carrito hoy es puramente visual, el backend lo ignora y lo re-deriva del producto.

**Restricciones del proyecto (CLAUDE.md, reglas duras):** DTOs siempre en backend (nunca entidades JPA en endpoints); `Controller → Service → Repository → Model`; tests contra base real (Postgres `localhost:5433`, sin mocks de DB — patrón de `VentaDocumentoCasualTest`); componentes React en PascalCase; feedback vía `useUIStore` (nunca `alert`/`confirm`); iconos `lucide-react`; `cursor-pointer` en botones.

### Auditoría de Finanzas (resultado)

Se auditó el camino completo de Finanzas, no sólo `FinanzasServiceImpl`, buscando cualquier punto que recalcule importes desde `Producto.precio` en vez de leer el histórico de la línea. **Resultado: no hay ninguno. Finanzas no requiere cambios de código en este change.**

Evidencia:

| Punto | Fuente del importe | ¿Afectado por el ajuste? |
|---|---|---|
| `FinanzasServiceImpl.resumen()` → `totalVentas` | `VentaRepository.sumarTotalVentas` = `SUM(v.totalFinal)` | Sí, correctamente: `totalFinal` se persiste al crear la venta a partir de los subtotales de línea |
| `resumen()` → `totalCostos` / `costoMercaderiaVendida` | `VentaDetalleRepository.sumarCostoMercaderiaVendida` = `SUM(vd.cantidad * vd.costoUnitarioHistorico)` | No, y así debe ser: el costo no cambia porque se haya ajustado el precio de venta |
| `resumen()` → `gananciaNeta` / `margen` | derivados de los dos anteriores | Sí, correctamente y de forma automática |
| `listarVentas()` → `gananciaNeta` por venta | subquery JPQL en `VentaRepository.listarVentasPorRango`: `SUM((d.precioUnitarioHistorico - d.costoUnitarioHistorico) * d.cantidad)` | Sí, correctamente: usa el **precio histórico de la línea**, no el del producto |
| `listarVentas()` → `totalFinal` por venta | `v.totalFinal` | Sí, correctamente |
| `listarDetalleCogs()` | `d.getPrecioUnitarioHistorico()`, `d.getSubtotal()`, `d.getCostoUnitarioHistorico()` | Sí, correctamente |

Además se hizo un barrido de `getPrecio()` sobre todo `backend/src/main/java`: los **únicos** dos consumos de `Producto.getPrecio()` en el flujo de ventas son las líneas 177 y 209 de `VentaServiceImpl` — exactamente los dos que este change modifica. El resto de los usos son de `Insumo.getPrecio()` o del CRUD de `Producto`. Los otros consumidores de importes de venta (`FacturaClienteServiceImpl`, `ClienteServiceImpl`, `VentaServiceImpl.toResponseDTO`) también leen `getSubtotal()` / `getTotalFinal()` persistidos.

**Conclusión explícita (decisión, no omisión):** la delta de `finanzas-ui` de este change **no cambia comportamiento ni código**. Documenta como requisito normativo la garantía de que Finanzas informa lo efectivamente cobrado, para que quede cubierta por spec y una futura refactorización no la rompa en silencio.

## Goals / Non-Goals

**Goals:**

- Permitir ajustar el precio por unidad de cada línea al confirmar la venta, desde el modal "Liquidar Venta" de `NuevaVenta.jsx`.
- Recalcular en vivo el subtotal de esa línea y el total de la venta al cambiar el precio, tanto si el precio nuevo es **menor** como si es **mayor** al de lista.
- Persistir el precio ajustado como `VentaDetalle.precioUnitarioHistorico` y su `subtotal` de esa línea, de modo que la venta, sus comprobantes y Finanzas informen lo efectivamente cobrado.
- Que funcione igual en los 3 negocios: Vivero, Herramientas y Abono (las dos ramas de `crearVenta`).

**Non-Goals:**

- **NO se modifica el precio de lista del producto.** Aclaración textual del dueño: *"No me refiero a que se modifique el precio venta [de lista, del producto] sino que el total de la venta se modifica"*. El ajuste es **siempre puntual a esa venta**. `Producto.precio` NUNCA se escribe, ni se sobrescribe, ni se propaga hacia atrás al catálogo desde este flujo. Una implementación que actualice `Producto.precio` al confirmar una venta es un **defecto**, no una interpretación alternativa.
- No se toca el descuento porcentual global de la venta (`porcentajeDescuento`), que ya existe y sigue aplicándose sobre el subtotal resultante.
- No se agrega un campo nuevo al modelo `VentaDetalle` ni migración de schema.
- No se permite editar el precio de una venta **ya registrada** (no hay edición retroactiva de ventas históricas).
- No se cambia el costo (`costoUnitarioHistorico`, `costoBaseHistorico`): ajustar el precio de venta no altera lo que costó la mercadería.
- No se agrega control de permisos diferenciado para ajustar precio (ver Decisión 6).

## Decisions

### Decisión 1 — Campo nuevo: `precioUnitario` opcional en `VentaDetalleRequestDTO`

Se agrega `private BigDecimal precioUnitario;` (con su getter/setter) a `VentaDetalleRequestDTO`. Es **opcional**: si viene `null`, el backend cae al comportamiento actual (`producto.getPrecio()`).

*Nombre*: `precioUnitario` y no `precioUnitarioHistorico` — "histórico" describe lo que el campo es **después** de persistido; en el request es simplemente el precio unitario propuesto para esa línea. Tampoco `precioAjustado`, porque el request no distingue si el cliente mandó el de lista o uno tocado a mano: manda el precio efectivo, y punto.

*Por qué opcional y no obligatorio*: mantiene compatibilidad con cualquier consumidor existente de `POST /api/ventas` (tests actuales, integraciones, el propio frontend antes de desplegarse) y evita un cambio incompatible de contrato. El fallback a `producto.getPrecio()` preserva exactamente la semántica de hoy.

*Alternativa descartada*: mandar el **subtotal** de la línea en vez del precio unitario. Se descartó porque `VentaDetalle.precioUnitarioHistorico` es el dato primario del modelo y el subtotal es derivado; aceptar el subtotal obligaría al backend a dividir por la cantidad y arrastraría error de redondeo hacia el precio unitario persistido.

*Alternativa descartada*: un endpoint aparte de "venta con precios ajustados". Duplicaría toda la lógica de stock, costos, pagos, cuenta corriente y bandejas por un solo campo.

### Decisión 2 — El backend recalcula el subtotal; nunca confía en un total enviado por el cliente

El cliente propone el **precio unitario** de cada línea. El backend sigue calculando `subtotalLine = precioEfectivo * cantidad`, el `subtotal` de la venta como suma de líneas, el `descuento` y el `totalFinal`, exactamente como hoy. El frontend nunca manda subtotales ni totales, y si los mandara serían ignorados.

*Por qué*: el total de una venta es un dato contable; que lo determine el cliente HTTP haría que un payload manipulado pudiera declarar un total arbitrario desacoplado de sus líneas. Con este diseño, la peor manipulación posible sigue produciendo un total internamente consistente con las líneas persistidas — que es justamente lo que el dueño ya puede hacer legítimamente desde la UI.

### Decisión 3 — Validación: `precioUnitario >= 0`, rechazando negativos; normalizado a 2 decimales

Si `precioUnitario` viene informado:

- `< 0` → `IllegalArgumentException` (`400 Bad Request`), mensaje del estilo `"El precio unitario no puede ser negativo"`. Un precio negativo generaría un subtotal negativo que restaría del total de la venta y del total de Finanzas — una corrupción silenciosa de los números contables.
- `== 0` → **se acepta**. Una línea bonificada / de regalo dentro de una venta es un caso real del negocio, y el dueño pidió explícitamente poder bajar el precio; poner un piso arbitrario mayor a cero le sacaría un caso legítimo sin ganar nada.
- **Sin límite superior**: el requerimiento incluye explícitamente subir el precio.
- Se normaliza con `setScale(2, RoundingMode.HALF_UP)` antes de persistir, porque la columna es `numeric(...,2)` y el valor llega desde aritmética de punto flotante de JavaScript. Normalizar en el backend evita que la precisión de la DB y la del cálculo del subtotal difieran.

*Alternativa descartada*: `@Positive` / `@NotNull` con Bean Validation en el DTO. El campo es opcional (`null` es válido) y la validación de "no negativo sólo si viene informado" queda más clara junto al resto de las validaciones de negocio de `crearVenta` (que ya lanza `IllegalArgumentException` para cantidad `<= 0` y stock insuficiente), manteniendo un único estilo de error en el flujo.

### Decisión 4 — Un solo helper para el precio efectivo, aplicado a las DOS ramas

Se extrae en `VentaServiceImpl` un método privado del estilo:

```
private BigDecimal resolverPrecioUnitario(VentaDetalleRequestDTO detReq, Producto producto)
```

que valida, normaliza y devuelve `detReq.getPrecioUnitario()` si viene informado, o `producto.getPrecio()` (o `ZERO` si es `null`) en caso contrario. Las líneas 177 (rama **Abono**) y 209 (rama **Vivero/Herramientas**) pasan ambas a llamarlo.

*Por qué*: hoy la misma expresión está duplicada en las dos ramas. Aplicar el cambio "a mano" en cada una es exactamente el error que el dueño anticipó — que Abono quede afuera. Un único punto de resolución hace estructuralmente imposible que las ramas diverjan.

### Decisión 5 — NO se agrega un flag ni nota de "precio ajustado manualmente"

No se agrega ningún campo booleano tipo `precioAjustado` a `VentaDetalle`, ni una nota de auditoría.

*Por qué*:
1. Lo que importa para auditoría y contabilidad — **cuánto se cobró realmente por unidad en esa venta** — ya queda persistido en `precioUnitarioHistorico`, inmutable, con el usuario vendedor y la fecha en la `Venta`.
2. Un flag así sería **poco confiable como señal**: comparar contra `Producto.precio` no dice si hubo ajuste, porque el precio de lista cambia con el tiempo; una venta vieja al precio de lista de entonces aparecería hoy como "ajustada".
3. Requiere migración de schema y no tiene ningún consumidor: ninguna pantalla ni reporte actual lo mostraría.

*Reversible*: si más adelante hace falta un reporte de "ventas con precio fuera de lista", se agrega ahí con su propio change. La información necesaria (precio cobrado por línea) ya está guardada; no se pierde nada por no agregar el flag ahora.

### Decisión 6 — Sin permiso diferenciado para ajustar el precio

Ajustar el precio queda disponible para cualquier usuario que ya pueda registrar una venta.

*Por qué*: quien puede registrar una venta ya determina qué productos y qué cantidades se cobran, y ya puede aplicar el descuento porcentual global de la venta sin ningún permiso extra. Agregar un permiso sólo para el precio por línea protegería una puerta al lado de otra que queda abierta. El dueño no pidió una restricción por rol. Si en el futuro hace falta acotarlo (por ejemplo, un tope de descuento por vendedor), es un change propio de la capability de permisos.

### Decisión 7 — Frontend: el modal lista las líneas con precio editable; `precio` es el efectivo y `precioLista` el original

**Hallazgo de la auditoría del frontend:** el modal "Liquidar Venta" (`NuevaVenta.jsx`, `<h2>Liquidar Venta</h2>`) **hoy no lista las líneas de la venta**: sólo muestra `Subtotal`, `Descuento (%)`, `Bandejas prestadas` y `Total a Pagar` en su columna izquierda, y el desglose de pagos en la derecha. La lista con `${d.precio} x ud.` está en el panel del carrito ("Detalle de Venta"), fuera del modal.

Por lo tanto se **agrega al modal**, en la columna izquierda arriba del bloque de totales, un bloque de productos que lista cada línea con: nombre, cantidad, un input editable de precio por unidad y el subtotal de la línea. Es donde el dueño pidió el ajuste (el momento de cerrar la venta), y evita que un precio se toque por accidente mientras se arma el carrito.

**Modelo de datos del carrito** (`useCartStore`): cada línea pasa a tener dos campos de precio:
- `precio` → el precio **efectivo** de esa línea (lo editable, lo que se manda al backend, lo que alimenta `totalCalculado`). Sigue siendo el mismo campo que usa toda la UI hoy, así que el carrito, el FAB de mobile y los totales reflejan el ajuste **sin cambios adicionales**.
- `precioLista` → snapshot del `producto.precio` al agregar al carrito. Sólo se usa para mostrar la referencia y para el botón de restaurar.

Se agrega la acción `updateDetallePrecio(productoId, precio)` al store, en el mismo estilo que la ya existente `updateDetalleCantidad`.

*Por qué reutilizar `precio` como el efectivo, en vez de agregar `precioAjustado` aparte*: todos los cálculos y renders del archivo (`totalCalculado`, el subtotal por línea del carrito, el badge del FAB) ya leen `d.precio`. Reutilizarlo hace que el recálculo en vivo del total salga solo, sin tocar cinco lugares distintos ni arriesgar que uno quede leyendo el precio viejo.

*Compatibilidad con carritos ya persistidos*: `useCartStore` persiste en `sessionStorage`, así que puede haber carritos abiertos sin `precioLista`. Toda lectura usa el fallback `d.precioLista ?? d.precio`.

*Componente del input*: se reutiliza `FormattedNumberInput` (ya usado para el descuento y las bandejas en el mismo modal), que formatea en es-AR y emite el valor numérico crudo en `onChange`. Coherente con el resto del modal y con el formato de moneda del sistema.

*Feedback*: cualquier aviso (por ejemplo, precio inválido) va por `pushToast` de `useUIStore`, nunca por `alert`/`confirm`, según la regla dura del proyecto.

### Decisión 8 — Al cambiar el precio se re-sincroniza el monto del pago sólo si sigue siendo el auto-completado

Hoy, al abrir el modal, un `useEffect` pre-carga una única línea de pago con `monto = totalFinal` (guardado por `pagosLineas.length === 0`, así que **no** se actualiza si el total cambia después). El saldo (`saldoFinal = totalPagado - totalFinal`) se recalcula en vivo y muestra "Deuda a CC" / "A favor en CC".

Sin ninguna acción, bajar el precio de una línea dejaría el monto del pago en el total viejo y generaría un saldo a favor en cuenta corriente que el usuario no pidió. Por eso: si hay **exactamente una** línea de pago y su `monto` sigue siendo igual al `totalFinal` anterior (es decir, el usuario no la editó a mano), se la actualiza al nuevo `totalFinal`. Si hay varias líneas de pago, o el usuario ya tocó el monto, **no se toca nada** — un pago parcial deliberado es un caso válido y pisarlo sería peor que el problema original.

*Por qué no auto-sincronizar siempre*: el pago parcial contra cuenta corriente es funcionalidad existente y deseada; sobrescribir un monto tipeado a mano rompería ese flujo.

*Por qué no dejarlo sin resolver*: el indicador de saldo ya avisa visualmente, pero un asiento silencioso en la cuenta corriente del cliente causado por un ajuste de precio es un efecto contable no intencionado, no un detalle de UX.

## Risks / Trade-offs

- **[Se interpreta como "actualizar el precio de lista"]** → Es el riesgo principal de este change. Está declarado como Non-Goal en el proposal y repetido arriba con la cita textual del dueño. Además, la spec de `ventas-core` incluye un escenario normativo explícito de que `Producto.precio` queda intacto después de una venta con precio ajustado, con su test correspondiente en la lista de tasks.

- **[La rama de Abono queda sin el cambio]** → Mitigado estructuralmente por la Decisión 4 (un único helper llamado por ambas ramas) y por un test dedicado sobre la rama de Abono, además del de Vivero/Herramientas.

- **[Diferencia de redondeo entre el total mostrado en el modal y el persistido]** → El frontend calcula con números de punto flotante de JS y el backend con `BigDecimal` a escala 2. Mitigación: el backend normaliza el precio unitario a 2 decimales (Decisión 3) y recalcula todo (Decisión 2); el total del backend es la única fuente de verdad. La diferencia posible queda por debajo del centavo por línea.

- **[Un vendedor baja precios sin control y erosiona el margen]** → Aceptado conscientemente (Decisión 6): es exactamente la capacidad que el dueño pidió. Queda trazable: `precioUnitarioHistorico` por línea, con vendedor y fecha en la `Venta`, y el listado de Finanzas ya muestra la ganancia neta por venta calculada con el precio histórico — o sea, una venta con precio bajado **ya se ve** con menor ganancia en Finanzas, sin ningún desarrollo extra.

- **[Precio ajustado que sobrevive en el carrito persistido]** → El carrito vive en `sessionStorage`; un precio ajustado sobrevive a un refresh dentro de la misma sesión. Es coherente con cómo ya se comportan la cantidad y el descuento, y se mitiga en la UI marcando visualmente la línea cuyo precio difiere del de lista, con la opción de restaurarlo.

- **[Finanzas: falso sentido de "no hay nada que hacer"]** → La auditoría concluyó que no hay cambios de código, pero eso es una propiedad del código actual, no una garantía. Mitigación: la delta de `finanzas-ui` convierte esa propiedad en un requisito normativo con escenarios, para que una futura refactorización que recalcule desde `Producto.precio` viole una spec en vez de pasar inadvertida.

## Migration Plan

No hay migración de datos ni cambio de schema: `VentaDetalle.precioUnitarioHistorico` y `subtotal` ya existen y ya están poblados.

- **Ventas históricas**: intactas. Sus valores congelados no se recalculan ni se reinterpretan.
- **Compatibilidad de API**: el campo nuevo del request es opcional; un cliente que no lo mande obtiene el comportamiento idéntico al actual (precio de lista). Backend y frontend pueden desplegarse en cualquier orden.
- **Rollback**: revertir el código alcanza. Las ventas registradas con precio ajustado durante la ventana quedan válidas y correctas — el precio ajustado ya está persistido en las mismas columnas que usa una venta normal, así que ningún consumidor las distingue ni se rompe con ellas.

## Open Questions

Ninguna bloqueante. Decisiones tomadas y documentadas arriba: nombre del campo (D1), validación y redondeo (D3), sin flag de auditoría (D5), sin permiso diferenciado (D6), ubicación de la edición en la UI (D7) y re-sincronización del pago auto-completado (D8).

Para revisar más adelante, fuera del alcance de este change: un tope de ajuste o de descuento por rol de vendedor, y un reporte de "ventas cerradas fuera del precio de lista" (posible sin cambios de modelo, con el dato ya persistido).
