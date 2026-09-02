## Why

En el local de Herramientas los clientes preguntan por productos que traen el envase en la mano. Hoy el vendedor tiene que adivinar el nombre con el que fue cargado el producto y buscarlo a mano en el catálogo: si lo cargaron como "Amoladora Bosch 4-1/2" y el cliente pregunta por "la amoladora chica", la búsqueda por texto falla. La mercadería de Herramientas viene de fábrica con código de barras impreso (EAN-13 / UPC-A), que es el único identificador que el vendedor y el envase comparten sin ambigüedad.

Con la cámara del celular alcanza: escaneás el envase y el sistema te dice exactamente qué producto es, con su precio y su stock. Vivero no entra en este alcance — las plantas e insumos de vivero no traen packaging con código de fábrica, así que un escáner ahí no tendría nada que leer.

## What Changes

- **Nuevo campo `codigoBarra` en `Producto`** (nullable, único cuando tiene valor). Se agrega de forma puramente aditiva al modelo: ningún campo existente cambia de tipo, nombre ni semántica.
- **Escaneo al cargar/editar un producto**: en `ProductoForm`, un botón junto a un campo de texto "Código de barras" abre la cámara del dispositivo, lee el código y lo carga en el campo. El usuario ve el código detectado y lo confirma guardando el formulario — nunca se persiste solo.
- **Escaneo para buscar un producto**: en la pantalla de Productos, un botón de escaneo abre la cámara y, al leer un código, muestra la ficha completa del producto que lo tiene guardado (nombre, precio, stock, proveedor, descripción).
- **Endpoint de búsqueda por código**: `GET /api/productos/codigo-barra/{codigo}`, acotado a la unidad de negocio activa, devuelve `ProductoDTO` o 404.
- **Ambas funciones sólo en Herramientas** (`unidadNegocioActiva === '2'`). En Vivero y Abono el campo y los botones no se renderizan.
- **Código no encontrado**: mensaje claro vía `useUIStore` (nunca `alert`/`confirm` nativos) que ofrece cargar el producto con ese código ya precargado en el formulario.
- **NUEVA DEPENDENCIA NPM — requiere aprobación explícita del usuario antes de instalarse**: `@zxing/browser` + `@zxing/library` para decodificar códigos de barra desde la cámara del navegador. No se instala en este change de propuesta; la tarea de instalación está marcada como checkpoint bloqueante en `tasks.md`. Fundamento de la elección en `design.md` (Decisión 2).
- **Sin cambios de permisos**: se reutilizan `ESCRIBIR_STOCK` (guardar el código) y `LEER_STOCK` (buscar por código). No se agrega ningún valor a `PermisoEnum`.

## Capabilities

### New Capabilities
- `codigo-barras-productos`: identificación de un producto por su código de barras de fábrica — persistencia del código en el producto, unicidad del código dentro de la unidad de negocio, y consulta de un producto a partir de un código escaneado.

### Modified Capabilities
- `catalogo-productos`: el producto gana un identificador opcional adicional (`codigoBarra`) que el registro de producto acepta, valida y expone en su DTO.
- `frontend-productos`: el formulario de producto suma el campo de código de barras con escaneo por cámara, y el listado suma la búsqueda por escaneo — ambos condicionados a la unidad de negocio Herramientas.

## Impact

**Backend**
- `models/Producto.java` — campo `codigoBarra` + getter/setter (aditivo).
- `dto/ProductoDTO.java` — campo `codigoBarra` + getter/setter (aditivo).
- `repositories/ProductoRepository.java` — `findByCodigoBarraAndUnidadNegocioIdAndDeletedFalse(...)`.
- `services/ProductoService.java` + `services/impl/ProductoServiceImpl.java` — persistencia del campo en `crearProducto`/`actualizarProducto`, validación de formato y unicidad, mapeo en `mapToDTO`, y el nuevo método `buscarPorCodigoBarra`.
- `controllers/ProductoController.java` — endpoint `GET /api/productos/codigo-barra/{codigo}` protegido con `LEER_STOCK`.
- Schema PostgreSQL: columna `productos.codigo_barra VARCHAR(64)` nullable, creada por `ddl-auto`. Índice único parcial documentado en `design.md` (Decisión 3).

**Frontend**
- `components/ProductoForm.jsx` — campo + botón de escaneo (sólo Herramientas).
- `pages/Productos.jsx` — botón de escaneo en la barra de búsqueda (sólo Herramientas).
- `components/EscanerCodigoBarra.jsx` (nuevo) — modal con la cámara, encapsula toda la interacción con la librería.
- `components/ProductoEncontradoModal.jsx` (nuevo) — ficha del producto escaneado.
- `frontend/package.json` — dependencias nuevas (checkpoint del usuario).

**Riesgos / consideraciones**
- La cámara del navegador exige contexto seguro (HTTPS o `localhost`). En la red local del vivero por IP plana (`http://192.168.x.x:5173`) la cámara queda bloqueada por el navegador. Mitigación y alternativa de entrada manual en `design.md` (Decisión 6).
- **Contexto de working tree**: el change `negocio-abono` está aplicado pero todavía sin commitear ni archivar, y tiene modificados `Producto.java`, `ProductoDTO.java`, `ProductoController.java` y `ProductoRepository.java` en el árbol de trabajo. Este change toca los mismos cuatro archivos, pero de forma **puramente aditiva** (un campo nuevo, un método de repositorio nuevo, un endpoint nuevo) y sin superposición con la lógica de abono (`categoriaAbono`, `stockInvernadero`, `stockColega`). Al implementar hay que leer el estado **actual en disco** de esos archivos, nunca el estado previo a `negocio-abono`.

**Gobernanza: LOW-MEDIA.** Agrega un campo opcional a un catálogo existente y una consulta de sólo lectura. No toca autenticación, dinero, cuentas corrientes, facturación ni datos financieros. El único punto de atención es la validación de unicidad, que puede rechazar un alta previamente válida (ver Decisión 3).
