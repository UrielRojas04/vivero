> Modo TDD estricto activo para el backend: cada grupo backend arranca con el test que falla (RED),
> después el código mínimo (GREEN), después casos adicionales (TRIANGULATE) y limpieza (REFACTOR).
> Los tests corren contra PostgreSQL real (`@SpringBootTest` + `@TestPropertySource` apuntando a
> `jdbc:postgresql://localhost:5433/vivero_db`, como en `ClienteControllerGetAllPermisoAmpliadoTest`).
> Prohibido mockear la base. El frontend no tiene runner de tests en este repo: se verifica a mano
> con los pasos del grupo 9.

## 1. Modelo: documentos en Cliente

- [x] 1.1 RED — escribir `ClienteDocumentosTest` en `backend/src/test/java/com/vivero/gestion/services/`: crear un cliente con `dni`, otro con `cuil`, otro con ambos y otro sin ninguno; verificar que se persisten y se leen correctamente, y que ausencia de documento queda en `null`
- [x] 1.2 GREEN — agregar `private String dni;` y `private String cuil;` (nullable) a `backend/src/main/java/com/vivero/gestion/models/Cliente.java`
- [x] 1.3 GREEN — agregar `dni` y `cuil` a `backend/src/main/java/com/vivero/gestion/dto/ClienteDTO.java` y mapearlos en el `toDTO` de `ClienteServiceImpl`
- [x] 1.4 GREEN — mapear `dni` y `cuil` en el `create` (≈línea 83) y en el `update` (≈línea 130) de `ClienteServiceImpl`, junto a `nombreRazonSocial` y `telefono`
- [x] 1.5 TRIANGULATE — agregar al test los casos de normalización: valor con espacios alrededor se guarda trimmeado, y valor vacío o solo espacios se guarda como `null` (Decisión 1 de design.md); implementar esa normalización en el service
- [x] 1.6 TRIANGULATE — agregar el caso de actualización: editar un cliente cambiando su documento y vaciándolo, verificando que los saldos de sus cuentas corrientes no se alteran
- [x] 1.7 REFACTOR — extraer la normalización de documento a un método privado reutilizable del service y confirmar que los tests siguen en verde

## 2. Modelo: documento puntual de la venta casual

- [x] 2.1 RED — escribir `VentaDocumentoCasualTest` en `backend/src/test/java/com/vivero/gestion/services/`: registrar una venta casual con tipo y valor de documento y verificar que la venta queda sin `Cliente` vinculado pero con el documento persistido
- [x] 2.2 GREEN — crear el enum `TipoDocumento { DNI, CUIL }` en `backend/src/main/java/com/vivero/gestion/models/`
- [x] 2.3 GREEN — agregar a `Venta.java` los campos `clienteDocumentoCasualTipo` (`@Enumerated(EnumType.STRING)`, columna `cliente_documento_casual_tipo`) y `clienteDocumentoCasualValor` (columna `cliente_documento_casual_valor`), con sus getters/setters, junto a los campos `*Casual` ya existentes
- [x] 2.4 GREEN — agregar `documentoTipo` y `documentoValor` a `backend/src/main/java/com/vivero/gestion/dto/ClienteAdHocDTO.java`
- [x] 2.5 GREEN — en `VentaServiceImpl.crearVenta`, en el bloque `casual == true` (≈línea 107), persistir el documento casual junto a `clienteNombreCasual` / `clienteTelefonoCasual`
- [x] 2.6 TRIANGULATE — agregar el caso `casual == false`: el documento cargado se escribe en el `dni` o el `cuil` del `Cliente` creado (≈línea 85) según el tipo, y la venta no guarda documento casual propio
- [x] 2.7 TRIANGULATE — agregar el caso de par inconsistente: valor vacío o en blanco guarda tipo y valor en `null`; implementar esa regla
- [x] 2.8 TRIANGULATE — agregar el caso de tipo no reconocido: un `documentoTipo` fuera de `DNI`/`CUIL` produce 400 Bad Request y no registra la venta
- [x] 2.9 REFACTOR — consolidar la resolución del documento ad-hoc en un método privado de `VentaServiceImpl` y confirmar los tests en verde

## 3. Proyección del documento en la respuesta de venta

- [x] 3.1 RED — escribir `VentaResponseDocumentoTest`: consultar una venta con `Cliente` que tiene `dni` y `cuil`, y verificar que el DTO de respuesta los expone en `clienteDni` y `clienteCuil`
- [x] 3.2 GREEN — agregar `clienteDni` y `clienteCuil` con sus getters/setters a `backend/src/main/java/com/vivero/gestion/dto/VentaResponseDTO.java`
- [x] 3.3 GREEN — llenar esos campos en el bloque de mapeo de `VentaServiceImpl` (≈línea 427), en la misma rama donde ya se resuelven `clienteNombre` / `clienteTelefono`
- [x] 3.4 TRIANGULATE — agregar el caso de venta casual: el valor del documento puntual aparece en `clienteDni` o en `clienteCuil` según su tipo, y el otro campo queda `null`
- [x] 3.5 TRIANGULATE — agregar los casos sin documento y con cliente eliminado: ambos campos vienen en `null` y la consulta no falla (requirió además anotar `Venta.cliente` y `FacturaCliente.cliente` con `@NotFound(action = NotFoundAction.IGNORE)`: sin eso, Hibernate 6 lanzaba `FetchNotFoundException` al listar ventas de un cliente soft-eliminado en vez de dejar la asociación en `null` — bug preexistente, no introducido por este change, pero bloqueaba el escenario pedido)

## 4. Permiso de alta de cliente desde Ventas

- [x] 4.1 RED — escribir `ClienteControllerCrearPermisoVentasTest` en `backend/src/test/java/com/vivero/gestion/controllers/`, siguiendo el patrón de `ClienteControllerGetAllPermisoAmpliadoTest`: un contexto de seguridad con solo `ESCRIBIR_VENTAS` debe poder invocar la creación de cliente
- [x] 4.2 GREEN — sumar `'ESCRIBIR_VENTAS'` al `@PreAuthorize` del `POST /api/clientes` en `backend/src/main/java/com/vivero/gestion/controllers/ClienteController.java` (línea 48), documentando el criterio en un comentario como se hizo con los permisos anteriores
- [x] 4.3 TRIANGULATE — agregar al test que un contexto sin ninguno de los cuatro permisos sigue recibiendo `AccessDeniedException`, y que los tres permisos previos siguen autorizados
- [x] 4.4 Verificar que `DataInitializer.java` no requiere cambios (no se crea ningún permiso nuevo)

## 5. Componente reutilizable de creación rápida de cliente

- [x] 5.1 Crear `frontend/src/components/CrearClienteRapido.jsx` (PascalCase) que reciba el nombre tipeado, un callback `onCreado(cliente)` y un flag para mostrar u ocultar los campos opcionales
- [x] 5.2 Implementar dentro del componente el formulario opcional: input de teléfono, `<select>` de tipo de documento con opciones *(ninguno) / DNI / CUIL* e input de valor habilitado solo cuando hay tipo elegido (Decisión 7 de design.md)
- [x] 5.3 Implementar el alta: `clientesApi.create({ nombreRazonSocial, telefono, dni | cuil })` mapeando el tipo elegido al campo correspondiente, más `queryClient.invalidateQueries({ queryKey: ['clientes'] })`, replicando el patrón de `crearClienteRapido` en `SiembraForm.jsx` (≈línea 209)
- [x] 5.4 Implementar el feedback: toasts de éxito y de error vía `useUIStore` + `getErrorMessage`, sin `alert`/`confirm` nativos, y estado de "creando" que deshabilita el botón para impedir un alta doble
- [x] 5.5 Usar `cursor-pointer` en todos los botones e iconos de `lucide-react`, siguiendo el estilo del dropdown ya existente en `SiembraForm.jsx`

## 6. Nueva Venta: alta de cliente al vuelo

- [x] 6.1 En `frontend/src/pages/NuevaVenta.jsx`, renderizar `CrearClienteRapido` con los campos opcionales visibles al final del dropdown del buscador de agenda cuando `clientesFiltrados` (≈línea 159) queda vacío y hay texto tipeado
- [x] 6.2 En el callback `onCreado`, setear el cliente recién creado como `clienteSeleccionado` del cart store y reflejar su nombre en `busquedaCliente`, cerrando el dropdown
- [x] 6.3 Verificar que la venta resultante sigue viajando como venta de agenda (`clienteId` con el id nuevo, `clienteAdHoc: null`, ≈líneas 296-297) y que el carrito no se altera ante un alta fallida
- [x] 6.4 Confirmar que la opción aparece en las tres unidades de negocio, independientemente del modo Express (que sigue siendo exclusivo de Herramientas)

## 7. Nueva Venta: documento en el formulario Express

- [x] 7.1 En `NuevaVenta.jsx`, extender `clienteExpressData` (≈línea 52) con `documentoTipo` y `documentoValor` inicializados vacíos
- [x] 7.2 Agregar al formulario Express (≈líneas 378-410) el `<select>` de tipo de documento y el input de valor, junto a nombre y teléfono, antes del checkbox de "Cliente casual"
- [x] 7.3 Al armar el payload (≈línea 297), incluir el documento en `clienteAdHoc` solo cuando hay tipo elegido y valor no vacío; omitir el par completo en caso contrario
- [x] 7.4 Verificar que una venta Express sin documento sigue funcionando exactamente igual que antes (revisión de código: el objeto `clienteAdHocPayload` sólo agrega `documentoTipo`/`documentoValor` cuando ambos están presentes; sin ellos el payload queda idéntico al de antes de este change — no pude ejercitar esto en un navegador real, ver sección de verificación manual)

## 8. ABM de clientes, historial y remito

- [x] 8.1 En `frontend/src/components/ClienteForm.jsx`, agregar dos inputs opcionales independientes para DNI y CUIL, precargados en edición y enviados tanto en el `POST` como en el `PUT`
- [x] 8.2 En `frontend/src/pages/HistorialVentas.jsx`, agregar al `useMemo` de `ventasFiltradas` (≈línea 28) la coincidencia por `clienteDni` y `clienteCuil`
- [x] 8.3 Implementar la normalización de documentos para la búsqueda: eliminar todo carácter no alfanumérico del texto buscado y del valor almacenado antes de comparar (Decisión 8 de design.md), sin tocar la normalización NFD ya existente para el nombre
- [x] 8.4 Actualizar el `placeholder` del buscador del historial (línea 60) para reflejar que también acepta DNI o CUIL
- [x] 8.5 En `frontend/src/components/ComprobanteVentaModal.jsx`, agregar las filas de DNI y CUIL a la lista `meta` de la cabecera (≈línea 130), condicionadas a que el valor exista, con la etiqueta correspondiente a cada uno
- [x] 8.6 Replicar esas líneas en la vista previa en pantalla (≈línea 364) y en el texto de WhatsApp (≈línea 272), de modo que las tres salidas muestren lo mismo

## 9. Verificación final

- [x] 9.1 Correr la suite de tests del backend completa y confirmar que no hay regresiones respecto del baseline previo al change (136 tests: 134 pasan, incluidos los 20 nuevos de este change; 2 fallas -- `GastoServiceInsumosPorUnidadTest.listarGastosDeAbonoIncluyeSusPropiosInsumos` y `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly` -- en dominios (Gasto/Insumo de Abono, ModeloCosto de UnidadNegocio) que este change no toca; se reproducen igual corriendo sólo esas dos clases en aislamiento, así que no son un efecto de orden de ejecución con el resto de la suite ni de los archivos que sí modificó este change -- se reportan como preexistentes, sin arreglarlas)
- [ ] 9.2 Verificar a mano el flujo de alta al vuelo desde Nueva Venta en Vivero, Herramientas y Abono: crear el cliente con y sin documento, confirmar la venta y ver el cliente en `/clientes`
- [ ] 9.3 Verificar a mano una venta Express casual con documento en Herramientas y comprobar que el remito lo muestra
- [ ] 9.4 Verificar a mano la búsqueda del historial por DNI y por CUIL, con y sin separadores de formato, y confirmar que la búsqueda por nombre, estado y fecha sigue funcionando
- [ ] 9.5 Confirmar que una venta y un remito sin ningún documento se ven exactamente igual que antes del change
