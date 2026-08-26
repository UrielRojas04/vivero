## Why

La pantalla de armado de pedido (`PedidoNuevo.jsx`) muestra un **total incorrecto**: el header ("N ítems · Total: $X") y el footer suman `cantidad × costoUnitarioPactado` crudo, sin pasar por la cadena de costeo. En el ejemplo real capturado (`img/pedido ejemplo.png`), una línea con costo pactado $3.000 + IVA 21% + envío 5% muestra "Costo final: $3.811,50" en su propia fila, mientras el total de arriba y el de abajo siguen diciendo **$3.000**. El usuario decide cuánto va a gastar mirando ese número, y el número miente.

Además, el layout actual desperdicia espacio (contenedor `max-w-4xl` centrado, campos apilados verticalmente por ítem) y no deja ver de un vistazo la composición del costo de cada línea. El pedido explícito del dueño es que la carga de ítems se parezca a **una planilla de Excel mejorada**: una fila por ítem, cada dato en su columna, agregando filas a medida que se arma el pedido. Y que **no se pueda empezar a cargar ítems sin haber elegido proveedor primero** — hoy la UI permite arrancar sin proveedor y sólo se entera al validar, con el agravante de que el perfil de costeo del proveedor (IVA/envío/descuentos por defecto) se precarga recién al elegirlo y pisa lo que ya se hubiera tipeado.

## What Changes

- **Fix del total (bug):** el total del header y el del footer SHALL calcularse sumando `calcularCosto(...).costoFinal × cantidad` de cada línea — la misma función que ya usa cada fila individualmente — en vez de `costoUnitarioPactado × cantidad`. El cálculo respeta la fuente de descuentos según el tipo de línea: ficha del producto para una línea de producto existente, `descuentosPactados` para una línea pendiente.
- **Rediseño a layout tipo planilla:** la carga de ítems pasa de una pila de bloques por ítem a una **grilla tabular de ancho completo**, una fila por ítem, con columnas: producto · cantidad · descuentos · IVA % · envío % · costo total de la línea. Se levanta el `max-w-4xl` de la página para aprovechar todo el ancho disponible.
- **Gate de proveedor obligatorio:** la grilla de ítems SHALL estar bloqueada hasta que haya un proveedor seleccionado, con un mensaje que explique por qué. Sin proveedor no se puede agregar la primera fila.
- **Sub-componentes nuevos** extraídos de `PedidoNuevo.jsx` para que la grilla sea legible y testeable, en reemplazo de `TablaCosteoProductoExistente` (que deja de tener sentido como tabla aparte cuando la fila entera ya es una fila de tabla).
- **NO cambia** nada de la lógica de costeo: cascada de descuentos, IVA sobre neto, envío en cadena sobre neto+IVA, conversión USD, auto-ratchet de costo al confirmar recepción y auto-ajuste de IVA/envío a la ficha siguen exactamente igual. **NO se toca el backend.**
- **NO reabre** la Decisión 6 más allá de lo ya reabierto: los descuentos de un producto **existente** siguen sin ser editables desde el pedido; sólo se muestran (en solo lectura) para que se entienda de dónde sale el costo final de esa fila.

## Capabilities

### New Capabilities
<!-- Ninguna: este change no introduce una capacidad nueva, corrige y rediseña la pantalla de una capacidad ya existente. -->

### Modified Capabilities
- `pedidos-proveedores`: el requirement "Pantallas del circuito de pedidos" cambia a nivel de comportamiento observable: (a) la pantalla de creación SHALL presentar los ítems como grilla tabular de ancho completo con el costo final por fila visible; (b) el total mostrado SHALL ser el costo real calculado con la cadena de costeo, no el costo pactado crudo; (c) elegir proveedor SHALL ser condición previa para cargar ítems.

## Impact

**Frontend (único alcance de código):**
- `frontend/src/pages/PedidoNuevo.jsx` — reescritura del bloque de render de ítems y del cálculo de `total`; el estado, los handlers (`actualizarLinea`, `seleccionarProducto`, `agregarLinea`, `eliminarLinea`, `agregarDescuentoLinea`, `quitarDescuentoLinea`, `actualizarDescuentoLinea`, `toggleMonedaLinea`, `recargarDefaultsProveedorLinea`), la persistencia del borrador y `handleSubmit` se conservan.
- Nuevos sub-componentes a nivel de módulo (`FilaItemPedido`, `CeldaDescuentos`) y retiro de `TablaCosteoProductoExistente`.
- `frontend/src/components/ProductoSearchSelect` (hoy inline en `PedidoNuevo.jsx`) se adapta al ancho de celda.

**Sin impacto en:**
- `frontend/src/utils/costeo.js` — se consume tal cual, no se modifica.
- `backend/**` — `PedidoServiceImpl`, `CostoCalculator`, `MovimientoStockServiceImpl`, DTOs y el contrato del payload quedan intactos.
- Persistencia del borrador en `localStorage` (clave `pedido-nuevo-borrador`) — mismo formato, mismo debounce; sólo se agrega el manejo del caso "borrador con ítems pero sin proveedor".

**Riesgo:** medio-bajo. Es UI sobre una pantalla de uso diario del dueño; el riesgo real es una regresión en el armado del payload o en el borrador, no en el cálculo (que se delega a una función ya probada).
