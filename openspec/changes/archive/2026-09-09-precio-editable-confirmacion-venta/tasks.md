## 1. Preparación

- [x] 1.1 Leer `design.md` de este change (en particular las Decisiones 1 a 8 y el Non-Goal: `Producto.precio` NUNCA se modifica desde el flujo de venta) y las dos delta specs en `specs/ventas-core/spec.md` y `specs/finanzas-ui/spec.md`.
- [x] 1.2 Red de seguridad backend: correr los tests existentes que tocan `VentaServiceImpl` (`VentaDocumentoCasualTest`, `VentaResponseDocumentoTest`, `VentaServiceListarVentasAbonoTest`, `FinanzasBaselineTest`) contra la base real (Postgres `localhost:5433`) y anotar el baseline de tests en verde. Si alguno ya falla antes de tocar nada, reportarlo como falla preexistente y NO intentar arreglarlo dentro de este change.

## 2. Backend — tests primero (base real, sin mocks de DB)

- [x] 2.1 Crear el test de servicio para el precio ajustado siguiendo el patrón de `VentaDocumentoCasualTest` (`@SpringBootTest` + `@TestPropertySource` apuntando a `jdbc:postgresql://localhost:5433/vivero_db`, sin mocks de DB): archivo nuevo en `backend/src/test/java/com/vivero/gestion/services/`, con el setup de `UnidadNegocioContextHolder` y limpieza en `@AfterEach` como los tests existentes.
- [x] 2.2 Test (RED): venta en Vivero/Herramientas con `precioUnitario` **menor** al de lista → la `VentaDetalle` persiste ese precio en `precioUnitarioHistorico`, su `subtotal` es precio × cantidad, y el `subtotal`/`totalFinal` de la `Venta` reflejan el importe menor.
- [x] 2.3 Test (triangulación): mismo caso con `precioUnitario` **mayor** al de lista → se acepta y el `totalFinal` refleja el importe mayor.
- [x] 2.4 Test (triangulación): detalle **sin** `precioUnitario` (null) → sigue usando `producto.getPrecio()`, comportamiento idéntico al actual (regresión del contrato existente).
- [x] 2.5 Test (triangulación): venta con **varias líneas**, algunas con `precioUnitario` informado y otras sin informar → cada línea usa el precio que corresponde y el `subtotal` de la venta es la suma correcta.
- [x] 2.6 Test (borde): `precioUnitario` en **cero** → se acepta, línea con subtotal cero.
- [x] 2.7 Test (borde): `precioUnitario` **negativo** → `crearVenta` lanza `IllegalArgumentException` y NO se persiste la venta ni se descuenta stock.
- [x] 2.8 Test (Non-Goal, crítico): después de registrar una venta con precio ajustado, releer el `Producto` de la base y verificar que su `precio` de lista quedó **idéntico**; registrar una segunda venta del mismo producto sin `precioUnitario` y verificar que vuelve a usar el precio de lista.
- [x] 2.9 Test de la rama **Abono**: venta con la unidad Abono activa y `CuentaAbono` en el contexto (patrón de `VentaServiceListarVentasAbonoTest`), con `precioUnitario` distinto al de lista → descuenta stock de Abono como siempre Y persiste el precio ajustado con su subtotal. Esta rama es un camino de código separado; sin este test el bug pasa desapercibido.

## 3. Backend — implementación

- [x] 3.1 Agregar el campo opcional `private BigDecimal precioUnitario;` con su getter y setter a `backend/src/main/java/com/vivero/gestion/dto/VentaDetalleRequestDTO.java` (Decisión 1). No tocar `VentaDetalle` (el modelo ya tiene `precioUnitarioHistorico` y `subtotal`): no hay cambio de schema.
- [x] 3.2 Agregar en `VentaServiceImpl` el método privado `resolverPrecioUnitario(VentaDetalleRequestDTO detReq, Producto producto)` que: devuelve `producto.getPrecio()` (o `BigDecimal.ZERO` si es null) cuando `detReq.getPrecioUnitario()` es null; lanza `IllegalArgumentException("El precio unitario no puede ser negativo")` si el valor informado es `< 0`; y en caso contrario devuelve el valor normalizado con `setScale(2, RoundingMode.HALF_UP)` (Decisiones 3 y 4).
- [x] 3.3 Reemplazar en la rama **Abono** de `crearVenta` (~línea 177) el `BigDecimal precioHist = producto.getPrecio() != null ? ... : ZERO` por la llamada a `resolverPrecioUnitario(...)`. El resto de la rama (stock de Abono, costos en cero, cálculo de `subtotalLine`) queda igual.
- [x] 3.4 Reemplazar en la rama **Vivero/Herramientas** de `crearVenta` (~línea 209) el mismo cálculo por la llamada a `resolverPrecioUnitario(...)`. NO tocar `costoUnitarioHistorico`, `costoBaseHistorico`, `descuentoPorcentajeHistorico` ni `envioPorcentajeHistorico`: siguen viniendo del `MovimientoStock`.
- [x] 3.5 Verificar que el cálculo de `subtotal`, `descuento` y `totalFinal` de la venta (fuera del loop) queda **sin cambios**: el backend sigue siendo quien calcula los totales y no acepta subtotales ni totales del cliente (Decisión 2).
- [x] 3.6 Correr los tests de los grupos 1.2 y 2 → todos en verde. Confirmar que la red de seguridad de 1.2 sigue igual que el baseline.
- [x] 3.7 Refactor: revisar que no haya quedado duplicada la resolución del precio en ninguna de las dos ramas y que ningún otro punto del flujo de venta lea `producto.getPrecio()`. Volver a correr los tests después del refactor.

## 4. Frontend — estado del carrito

- [x] 4.1 En `frontend/src/store/useCartStore.js`, agregar la acción `updateDetallePrecio(productoId, precio)` siguiendo el mismo estilo que `updateDetalleCantidad` (actualiza sólo el campo `precio` de la línea que coincide).
- [x] 4.2 En `frontend/src/pages/NuevaVenta.jsx`, en `agregarProducto()`, guardar también `precioLista: producto.precio` al crear la línea del carrito, manteniendo `precio` como el precio **efectivo** editable (Decisión 7). Toda lectura del precio de lista debe usar el fallback `d.precioLista ?? d.precio` para no romper carritos ya persistidos en `sessionStorage`.
- [x] 4.3 Agregar en `NuevaVenta.jsx` el handler `modificarPrecio(productoId, valor)`: convierte el valor a número, ignora/limpia valores inválidos, rechaza negativos avisando con `pushToast('error', ...)` de `useUIStore` (nunca `alert`/`confirm`), y llama a `updateDetallePrecio`.
- [x] 4.4 Agregar el handler para restaurar el precio de lista de una línea (`updateDetallePrecio(productoId, d.precioLista ?? d.precio)`).

## 5. Frontend — modal "Liquidar Venta"

- [x] 5.1 En el modal `Liquidar Venta` de `NuevaVenta.jsx` (bloque que arranca en `<h2>Liquidar Venta</h2>`), agregar en la columna izquierda, **arriba** del bloque de Subtotal/Descuento/Total, un bloque que liste cada línea de `detalles` con: nombre del producto, cantidad, input de precio por unidad y subtotal de la línea (`d.precio * d.cantidad`, con `formatCurrency`). Hoy el modal no lista las líneas: hay que agregarlas.
- [x] 5.2 Usar `FormattedNumberInput` para el input de precio por unidad (mismo componente que ya usan Descuento y Bandejas en ese modal), cableado a `modificarPrecio`.
- [x] 5.3 Marcar visualmente la línea cuyo `precio` difiere de `precioLista`: mostrar el precio de lista como referencia y un botón de restaurar con icono de `lucide-react` y `cursor-pointer`.
- [x] 5.4 Verificar que `totalCalculado`, `descuentoMonto`, `totalFinal` y `saldoFinal` se recalculan en vivo al editar el precio — deberían salir gratis por derivarse de `d.precio`, pero confirmarlo explícitamente en el render (incluido el badge del FAB de mobile y el subtotal del panel del carrito).
- [x] 5.5 Implementar la re-sincronización del pago auto-completado (Decisión 8): si hay **exactamente una** línea de pago y su `monto` sigue siendo igual al `totalFinal` anterior (el usuario no lo editó), actualizarla al nuevo `totalFinal` cuando cambia el precio. Si hay más de una línea de pago o el monto fue editado a mano, NO tocar nada.
- [x] 5.6 En `handleSubmit()`, incluir `precioUnitario: d.precio` en el mapeo de `payload.detalles` (hoy manda sólo `productoId` y `cantidad`).
- [x] 5.7 Bloquear la confirmación si alguna línea quedó con precio vacío o negativo, avisando con `pushToast`.
- [x] 5.8 Revisar el layout responsive del bloque nuevo dentro del modal (el modal es `max-w-6xl` con grid de 2 columnas en `md:`) para que no rompa en mobile ni empuje contenido fuera del modal.

## 6. Finanzas — verificación (sin cambios de código esperados)

- [x] 6.1 Confirmar contra el código que se mantiene lo auditado en `design.md`: `FinanzasServiceImpl` y las queries de `VentaRepository` / `VentaDetalleRepository` derivan los importes de `v.totalFinal`, `d.precioUnitarioHistorico`, `d.costoUnitarioHistorico` y `d.subtotal`, y ningún punto de Finanzas recalcula desde `Producto.precio`. Si se confirma, **no se toca código de Finanzas** en este change.
- [x] 6.2 Agregar al test de backend (o a `FinanzasBaselineTest`, según dónde encaje mejor con el patrón existente) un caso que registre una venta con precio ajustado y verifique que el resumen del período y el listado de ventas de `FinanzasService` informan el importe efectivamente cobrado, y que el costo de mercadería vendida NO cambia por el ajuste. Esto convierte la garantía auditada en una spec ejecutable, para que una refactorización futura la rompa ruidosamente.
- [x] 6.3 Si (y sólo si) 6.1 detecta algún punto que sí recalcule desde `Producto.precio`, corregirlo para que use el histórico de la línea y documentar el hallazgo en el resumen final.

## 7. Verificación de extremo a extremo

- [x] 7.1 Correr la suite de tests del backend completa y confirmar que no hay regresiones contra el baseline de 1.2. (2 fallas preexistentes no relacionadas encontradas y reportadas, no corregidas — ver resumen de la sesión de apply.)
- [x] 7.2 Preparar el resumen de verificación manual para el dueño (el testeo de UI lo hace él): en cada uno de los tres negocios (Vivero, Herramientas y Abono) — armar un carrito, abrir "Liquidar Venta", bajar el precio de una línea y ver el total bajar en vivo, subirlo y ver el total subir, confirmar la venta, y verificar que (a) el comprobante/historial muestra el importe cobrado, (b) Finanzas → Ventas muestra ese mismo total, y (c) el producto en el catálogo conserva su precio de lista original.
- [x] 7.3 NO ejecutar build/compile ni commitear nada sin pedido explícito del usuario (reglas duras 1 y 2 de `CLAUDE.md`).
