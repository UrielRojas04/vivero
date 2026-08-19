## Context

El pedido del jefe es una "factura dinámica" por cliente: un papel donde figure todo lo que el cliente se fue llevando a lo largo del tiempo, todo lo que fue pagando y lo que le falta pagar. No es un comprobante fiscal —el proyecto declara explícitamente que no hay integración con AFIP (`knowledge-base/01_vision_y_objetivos.md`)— sino el equivalente digital de la libreta de fiado del vivero.

**Estado actual del sistema, verificado sobre el código:**

- `Venta` tiene `cliente`, `subtotal`, `porcentajeDescuento`, `descuento`, `totalFinal`, `estadoPago` (`PAGADO`/`PARCIAL`/`DEBE`), `fecha`, y en cascada `List<VentaDetalle> detalles` y `List<Pago> pagos`. Todo lo que el jefe quiere ver **ya está persistido**, pero atomizado en una venta por vez.
- `ComprobanteVentaModal.jsx` ya resuelve el documento de **una** venta: vista previa en un nodo `previewRef`, PDF con `jsPDF` (`unit: 'mm'`, `format: 'a4'`, dibujado por coordenadas), PNG con `html-to-image` sobre un clon off-screen forzado a 500px de ancho mínimo, y envío por WhatsApp con Web Share en táctil / portapapeles + deep link en escritorio, reutilizando la pestaña vía la referencia de módulo `ventanaWhatsAppAbierta`. El change `us-016-remitos-pdf` dejó asentado que **no hay librería de PDF en el backend** (`backend/pom.xml` no tiene `itextpdf` ni `jasper`) y que toda la generación es client-side.
- `CuentaCorrienteDinero` es el único saldo consolidado que existe: un solo `BigDecimal balancePesos` mutable, sin libro de movimientos. Se expone como `ClienteDTO.balanceDinero`.
- `saldoDisplay.js` fija la convención de signo vigente: `balance < 0` → DEBE (rojo), `balance > 0` → A_FAVOR (emerald), `0`/null → NEUTRO (gris).

**Los dos huecos que este change tiene que atravesar:**

1. **No hay forma de traer las ventas de un cliente por ID.** `VentaController` sólo tiene `POST /api/ventas` y `GET /api/ventas` (sin filtros, sin paginación), y `VentaResponseDTO` no expone `clienteId` —sólo `clienteNombre`, que no es único—. `HistorialVentas.jsx` filtra por nombre en el cliente, lo cual alcanza para una búsqueda visual pero no para construir un documento contable de un cliente concreto. `FinanzasController` sí tiene un `GET /finanzas/ventas` paginado y filtrable, pero devuelve `VentaLiteDTO` (sin `detalles[]` ni `pagos[]`, con un `resumenProductos` en texto) y está protegido por `LEER_FINANZAS`.
2. **`balancePesos` se mueve por caminos que no dejan rastro itemizado.** Además de las ventas y sus pagos, lo modifican el ajuste manual de saldo (`ClienteServiceImpl.ajustarSaldo` suma el monto directo al balance; `AjusteSaldoDTO` es sólo `{ monto }`, no hay entidad ni tabla que registre el ajuste), los cheques sueltos (`us-021-registrar-cheque-manual`) y las reversas de cheques rechazados (`us-021-reversa-cheques`). Una venta dada de baja por soft delete (`@SQLRestriction("deleted = false")`) desaparece del listado sin que su impacto en el saldo se revierta.

## Goals / Non-Goals

**Goals:**

- Que desde la ficha de un cliente se pueda abrir un documento único que muestre, en orden cronológico, todas sus ventas con sus ítems, todos sus pagos y el saldo pendiente.
- Que ese documento se pueda descargar como PDF, exportar como imagen y mandar por WhatsApp con la misma experiencia que ya tiene el remito de venta.
- Que los totales del documento sean calculados en el backend, en un solo lugar, y no reconstruidos a mano en el frontend.
- Que cuando el saldo real de la cuenta corriente no coincida con la suma de lo itemizado, el documento lo diga en vez de disimularlo.
- Reutilizar sin excepción lo que ya existe: `VentaResponseDTO`, `PagoResponseDTO`, `VentaDetalleResponseDTO`, `describirSaldo`, `jspdf`, `html-to-image`.

**Non-Goals:**

- No es un comprobante fiscal ni electrónico. No hay CUIT, ni tipo de comprobante, ni numeración fiscal, ni AFIP.
- No se genera el PDF en el backend ni se persiste ningún archivo en el servidor. Se mantiene la decisión de `us-016-remitos-pdf`.
- No se agrega una nueva forma de registrar pagos ni de ajustar saldos. El documento es de **sólo lectura**: no muta ninguna venta, ningún pago y ningún saldo.
- No se construye el libro de movimientos de cuenta corriente en este change (ver Decisión 4 y Pregunta Abierta 1).
- No se toca `HistorialVentas.jsx` ni `ComprobanteVentaModal.jsx`. El comprobante de una venta sigue siendo un documento distinto, con otro propósito, y sigue funcionando igual.
- No se agrega paginación ni filtros a `GET /api/ventas`, ni se corrige el permiso `ESCRIBIR_VENTAS` mal aplicado a ese endpoint de lectura. Son defectos preexistentes, ajenos a este change.

## Decisions

### Decisión 1 — Endpoint nuevo `GET /api/clientes/{id}/factura`, no reutilizar los existentes

Se agrega un endpoint dedicado en `ClienteController`, protegido por `LEER_CLIENTES`, que devuelve un `FacturaClienteDTO`.

**Alternativas evaluadas:**

| Opción | Por qué se descarta |
|---|---|
| Agregar `?clienteId=` a `GET /api/ventas` | Quedaría bajo `ESCRIBIR_VENTAS`, un permiso de escritura mal usado como lectura, que además tiene el rol `EMPLEADO_VIVERO`. La factura consolidada de un cliente es información del jefe, no del vendedor de mostrador. Reusar ese endpoint arrastra el defecto de permisos a una funcionalidad nueva. |
| Reutilizar `GET /finanzas/ventas` de `FinanzasController` | Devuelve `VentaLiteDTO`, que no trae `detalles[]` ni `pagos[]` —justamente lo que la factura necesita ítem por ítem—. Su filtro `q` es una búsqueda de texto libre sobre `nombreRazonSocial`, no un filtro estricto por ID: dos clientes con nombres parecidos se mezclarían. Y está bajo `LEER_FINANZAS`, un permiso de otra pantalla. |
| Exponer `clienteId` en `VentaResponseDTO` y filtrar en el frontend | Obliga a traerse todas las ventas del sistema al navegador para quedarse con las de un cliente. No escala y deja el cálculo de totales en el cliente. |
| Endpoint dedicado (**elegida**) | Permiso correcto (`LEER_CLIENTES`, que hoy sólo tiene `JEFE`), forma de DTO correcta, filtro estricto por ID, totales calculados en el servidor. |

Se elige `GET /api/clientes/{id}/factura` y no `GET /api/clientes/{id}/ventas` porque lo que se devuelve no es una lista de ventas sino un documento completo: cliente + ventas + totales agregados + saldo + conciliación. Devolver una lista pelada obligaría al frontend a recalcular los totales, que es exactamente lo que se quiere evitar.

**Ubicación en la arquitectura**: `ClienteController` → `ClienteService.obtenerFactura(Long id)` → `ClienteServiceImpl` (que pasa a inyectar también `VentaRepository`) → `VentaRepository`. Se respeta Controller → Service → Repository → Model: el controller no toca repositorios.

### Decisión 2 — Forma del `FacturaClienteDTO` y convención de signo

```
FacturaClienteDTO
├── clienteId            Long
├── clienteNombre        String
├── clienteTelefono      String
├── fechaGeneracion      LocalDateTime   (momento de la consulta)
├── ventas               List<VentaResponseDTO>   (desc por fecha; incluye detalles[] y pagos[])
├── cantidadVentas       Integer
├── totalVentas          BigDecimal      Σ venta.totalFinal
├── totalPagado          BigDecimal      Σ pago.monto de todas esas ventas
├── saldoSegunVentas     BigDecimal      totalPagado − totalVentas
├── balanceDinero        BigDecimal      CuentaCorrienteDinero.balancePesos (autoritativo)
└── diferenciaNoItemizada BigDecimal     balanceDinero − saldoSegunVentas
```

`saldoSegunVentas` se define como `totalPagado − totalVentas` —y no al revés— **a propósito**: así queda en la misma convención de signo que `balancePesos` y que `describirSaldo` (negativo = debe, positivo = a favor). Mezclar dos convenciones de signo en el mismo documento es la forma más rápida de mostrarle al cliente un número con el signo cambiado. Todos los montos del documento se leen con la misma regla.

Se reutilizan `VentaResponseDTO`, `VentaDetalleResponseDTO` y `PagoResponseDTO` tal como están. No se crean DTOs paralelos de venta, ítem ni pago: la regla del proyecto de no filtrar entidades JPA ya está cumplida por esos DTOs, y duplicarlos generaría dos mapeos que se desincronizan.

`diferenciaNoItemizada` es el punto donde la Decisión 4 se hace visible: si da distinto de cero, hay plata que movió el saldo y que este documento no puede desglosar.

### Decisión 3 — Sin paginación en la consulta, con orden descendente y justificación

La regla dura del proyecto dice "sin `findAll()` sin límite: usar paginación". Acá se devuelve la lista completa de ventas del cliente, sin paginar, y la justificación es la siguiente:

- No es un `findAll()`: es `findByClienteIdAndUnidadNegocioIdOrderByFechaDesc`, acotado a un cliente y a una unidad de negocio. El conjunto está limitado por definición del dominio, no por un `LIMIT`.
- El documento **es** el total. Una factura consolidada paginada no tiene sentido: si se muestran sólo las primeras 20 ventas, los totales no son los totales y el papel que se le entrega al cliente miente.
- La escala real del vivero es de decenas de ventas por cliente, no de miles.

Se agrega igualmente una salvaguarda operativa: si un cliente supera las **200 ventas**, el documento muestra un aviso indicando que conviene generar la factura por rango de fechas, y se deja anotado como disparador para revisar esta decisión en un change posterior. No se implementa el filtro por rango ahora: agregarlo sin necesidad real complica la UI y la conciliación (un rango parcial nunca podría conciliar contra el saldo total, que es acumulado).

La consulta usa `@EntityGraph` o `JOIN FETCH` sobre `detalles` y `pagos` para evitar el N+1 que produciría cargar los ítems de cada venta por separado.

### Decisión 4 — Alcance de los movimientos itemizados: conciliar y declarar, sin construir el libro de movimientos

**Esta es la decisión de fondo del change y está sujeta a la Pregunta Abierta 1.**

El jefe pide ver "lo que va pagando". Los pagos asociados a una venta (`Pago`) están itemizados y se muestran. Pero hay plata que mueve `balancePesos` sin dejar ningún renglón:

- **Ajuste manual de saldo** (`AjusteSaldoModal.jsx` → `POST /api/clientes/{id}/saldo/ajuste`): `ClienteServiceImpl.ajustarSaldo` hace `balancePesos.add(monto)` y guarda. No queda fecha, ni motivo, ni registro. Si el jefe cobró $50.000 en mano y lo cargó por acá, ese pago **no puede aparecer** en ninguna factura itemizada, porque no existe en ningún lado.
- **Cheques sueltos y reversas de cheques rechazados**: mueven el saldo sin pasar por `Pago`.
- **Ventas dadas de baja**: el soft delete las saca del listado, pero su efecto sobre el saldo quedó asentado.

Opciones evaluadas:

| Opción | Qué entrega | Costo | Veredicto |
|---|---|---|---|
| (a) Itemizar sólo ventas y pagos, mostrar el saldo actual como una línea suelta | La factura pedida | Bajo | **Insuficiente**: si el jefe alguna vez ajustó el saldo de ese cliente, el total de arriba y el saldo de abajo no cierran, sin explicación. Es peor que no mostrar el saldo. |
| (b) Crear una entidad `MovimientoCuentaCorriente` y retroalimentar `ajustarSaldo`, cheques y reversas para que registren cada movimiento | Trazabilidad del 100% del saldo | Alto: entidad nueva, migración, retrofit de tres flujos existentes que hoy funcionan, y **sin datos históricos** —los ajustes ya hechos son irrecuperables, la factura seguiría sin cerrar para el pasado— | **Correcto, pero es otro change.** Toca flujos de dinero ya productivos; mezclarlo con una vista de lectura infla el riesgo de un change que hoy no muta nada. |
| (c) Itemizar ventas y pagos, y **declarar explícitamente la diferencia** cuando el saldo no coincida | La factura pedida, con los números cerrando o explicando por qué no | Bajo | **Elegida.** |

Se elige **(c)**: el backend calcula `diferenciaNoItemizada` y el documento, cuando no es cero, muestra un renglón del tipo *"Otros movimientos de cuenta corriente (ajustes manuales, cheques): $X"* antes del saldo final. El total sigue cerrando contra el saldo real de la cuenta corriente, que es el número autoritativo y el que el jefe cobra. Lo que no se puede desglosar queda nombrado en vez de escondido.

Se recomienda proponer la opción (b) como change siguiente e independiente (nombre sugerido: `cuenta-corriente-movimientos`), que convertiría ese renglón agregado en renglones detallados sin cambiar la estructura del documento ni la forma del DTO —sólo se sumaría una lista más—.

### Decisión 5 — Punto de entrada en `Clientes.jsx`, no en `HistorialVentas.jsx`

La acción "Ver Factura" se agrega en `Clientes.jsx`, en la tarjeta mobile y en la fila de la tabla desktop, junto al botón de "Ajustar Saldo" que ya vive ahí.

El criterio es que el documento se identifica por **cliente**, no por venta. En `HistorialVentas.jsx` la unidad de trabajo es la venta, y ya hay un botón de comprobante por fila; agregar ahí una acción que abre un documento de todas las otras ventas del mismo cliente confunde los dos documentos. Además, `Clientes.jsx` ya tiene a mano lo que la factura necesita: el `cliente.id`, el `balanceDinero` y el patrón de modales por cliente (`AjusteSaldoModal`, `HistorialBandejasModal`, `DevolucionBandejasModal`). El paralelo natural es "Historial de Bandejas": la factura es el historial de dinero.

### Decisión 6 — El modal replica el patrón de `ComprobanteVentaModal.jsx`, sin extraerlo a un componente compartido

`FacturaClienteModal.jsx` se escribe siguiendo la misma estructura probada: nodo `previewRef` con la vista previa, `descargarPDF` con `jsPDF` dibujando por coordenadas, `generarPngDePreview` con clon off-screen a 500px mínimo, `descargarImagen` con Web Share en táctil, y `enviarWhatsApp` con `askConfirm` + portapapeles + deep link.

Se evaluó extraer esa lógica a un hook compartido (`useExportarDocumento`) y se descarta **para este change**: el dibujo del PDF es sustancialmente distinto (la factura tiene N secciones de venta con paginación multipágina, el remito tiene una sola tabla), y refactorizar un componente que hoy funciona y que se usa en el flujo de venta agrega riesgo a cambio de nada inmediato. La duplicación queda anotada como deuda técnica consciente.

Diferencias reales de contenido respecto del remito:
- Cabecera: cliente + teléfono + fecha de generación + cantidad de ventas, en vez de número de venta + vendedor.
- Cuerpo: una sección por venta (fecha, `Nº {venta.id}`, tabla de ítems, total de la venta), en orden descendente por fecha.
- Pagos: consolidados al final, con fecha, método y venta a la que corresponden.
- Cierre: "Total comprado", "Total pagado", "Otros movimientos" (si aplica) y "Saldo" con `describirSaldo` para el color y la etiqueta.
- El PDF necesita salto de página real: `if (y > pageBottom) { doc.addPage(); y = 20; }` ya está en el remito, pero acá hay que aplicarlo también al abrir cada sección de venta para no cortar un encabezado al pie de la hoja.

### Decisión 7 — Multi-unidad de negocio

La consulta filtra por `UnidadNegocioContextHolder.getUnidadNegocioId()` igual que `ClienteServiceImpl.getById` y que `VentaServiceImpl.listarVentas`. La factura de un cliente en la unidad "Vivero" no mezcla ventas de la unidad "Herramientas". El saldo `balancePesos`, en cambio, es global al cliente (`CuentaCorrienteDinero` es 1:1 con `Cliente`, sin unidad de negocio), lo cual es una asimetría preexistente del modelo: se contempla en la conciliación, porque una venta de la otra unidad aparecerá dentro de `diferenciaNoItemizada`.

## Risks / Trade-offs

- **[El documento muestra un saldo que no cierra con lo itemizado]** → Mitigado por la Decisión 4: la diferencia se calcula en el backend y se declara en un renglón propio. El saldo final que se muestra es siempre `balanceDinero`, el número autoritativo.
- **[N+1 al cargar `detalles` y `pagos` de cada venta]** → Mitigado con `@EntityGraph`/`JOIN FETCH` en la consulta del repositorio. Verificable activando el log de SQL de Hibernate.
- **[Un cliente con muchísimas ventas genera un PDF enorme o una consulta pesada]** → Mitigado con el aviso a partir de 200 ventas (Decisión 3) y el disparador de revisión anotado. No se paginan los totales porque paginar un total lo invalida.
- **[Duplicación de la lógica de exportación entre `ComprobanteVentaModal` y `FacturaClienteModal`]** → Aceptada conscientemente (Decisión 6). Si aparece un tercer documento exportable, corresponde extraer el hook compartido en ese momento.
- **[La asimetría unidad de negocio / saldo global confunde en negocios con dos unidades]** → Queda visible dentro de `diferenciaNoItemizada` en vez de producir un total silenciosamente equivocado. Corregir el modelo de cuenta corriente por unidad excede este change.
- **[La factura se le entrega al cliente y expone datos de costo]** → `VentaDetalleResponseDTO` incluye `costoUnitarioHistorico`, `costoBaseHistorico` y los porcentajes de descuento y envío históricos. Esos campos **no se renderizan** en la vista previa, el PDF ni la imagen. El DTO los transporta porque se reutiliza tal cual, pero mostrar el costo interno en un papel que va al cliente sería una filtración comercial. Queda como tarea explícita de verificación.
- **[Sin cobertura automatizada]** → El proyecto no tiene runner de tests en el frontend y en el backend sólo está `BackendApplicationTests`. La verificación es manual. Si se agregan tests para el cálculo de totales, deben correr contra base real o Testcontainers, nunca mocks de base de datos.

## Migration Plan

No hay migración de base de datos: no se crean ni modifican entidades, tablas ni columnas. El change es aditivo sobre código.

Despliegue: backend y frontend juntos. Si sólo se despliega el frontend, el botón "Ver Factura" devuelve 404 y el modal muestra el toast de error de `useUIStore` sin romper la pantalla de Clientes.

Rollback: revertir el commit. Al no haber cambios de esquema ni de datos, no hay nada que deshacer en la base.

## Open Questions

> Las 3 preguntas de abajo ya fueron confirmadas por el usuario: opción (c) en la Pregunta 1, listar historial completo en la Pregunta 2, y "Cuenta Corriente" / "RESUMEN DE CUENTA" en la Pregunta 3. Se dejan documentadas con su razonamiento original para que quede registro de las alternativas evaluadas.

### Pregunta Abierta 1 — ¿Se construye el libro de movimientos de cuenta corriente en este change? **(RESUELTO: opción (c))**

La Decisión 4 recomienda la opción **(c)**: itemizar ventas y pagos, y declarar la diferencia no itemizada en un renglón agregado, dejando el libro de movimientos (opción **b**) para un change posterior.

Hay que confirmarlo explícitamente porque cambia el tamaño del change de forma drástica:

- Si se confirma **(c)** (recomendado): el change es de sólo lectura, no toca ningún flujo de dinero existente y se implementa tal como está descripto en `tasks.md`.
- Si se elige **(b)**: hay que sumar la entidad `MovimientoCuentaCorriente` con su migración, retroalimentar `ClienteServiceImpl.ajustarSaldo`, el alta de cheques sueltos y la reversa de cheques rechazados, y asumir que **los ajustes ya realizados no son recuperables** —no existen en ningún registro—, con lo cual la factura seguiría sin conciliar para el histórico anterior al change. Además el nivel de gobernanza sube a ALTO por tocar escritura sobre saldos.

Pregunta concreta para el usuario: **¿alguna vez se usó "Ajustar Saldo" para registrar pagos de clientes?** Si la respuesta es no, la diferencia no itemizada será cero en la práctica y (c) es suficiente sin discusión. Si es sí y con frecuencia, hay que evaluar en serio adelantar (b).

### Pregunta Abierta 2 — ¿Qué hacer con las ventas totalmente pagadas de hace mucho tiempo?

Tal como está diseñado, la factura lista **todo** el histórico del cliente, incluidas ventas cerradas hace meses con estado `PAGADO`. Para un cliente antiguo eso puede ser un documento de varias páginas donde lo relevante —lo que debe hoy— queda al final.

Opciones: (1) listar todo, que es lo más fiel a "cargue todo lo que se llevó" y es lo que se asume por defecto; (2) agregar un filtro visual en el modal, del tipo "sólo ventas con saldo pendiente", que no altere los totales sino sólo lo que se imprime.

Se asume la opción (1) para la primera implementación. Si el usuario prefiere la (2), es un agregado chico y localizado en `FacturaClienteModal.jsx` que no cambia el backend.

### Pregunta Abierta 3 — Nombre del documento en la interfaz

La palabra "factura" tiene connotación fiscal y el sistema explícitamente no emite comprobantes fiscales. Alternativas: "Cuenta Corriente", "Resumen de Cuenta", "Estado de Cuenta".

Se propone rotular el botón y el modal como **"Cuenta Corriente"** y titular el documento impreso como **"RESUMEN DE CUENTA"**, manteniendo `factura-cliente-dinamica` como nombre interno del change y `factura-cliente` como nombre de la capability. Queda a confirmación del usuario: si prefiere que diga "Factura" porque es como se le llama en el vivero, es un cambio de dos cadenas de texto.
