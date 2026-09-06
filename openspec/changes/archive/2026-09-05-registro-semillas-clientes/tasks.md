## 1. Modelo y persistencia (backend)

- [x] 1.1 Crear `models/UnidadCantidadSemilla.java`: enum con `SEMILLAS`, `SOBRES`, `GRAMOS`.
- [x] 1.2 Crear `models/RegistroSemilla.java` (`@Entity`, `@Table(name = "registros_semillas")`, `@Data`) con: `id`, `fechaRecepcion` (`LocalDate`), `lote` (`String`), `cliente` (`@ManyToOne` nullable a `Cliente`), `nombreQuienTrajo` (`String`), `telefonoContacto` (`String` nullable), `descripcionSemilla` (`String`), `cantidad` (`BigDecimal`), `unidadCantidad` (`@Enumerated(EnumType.STRING)`), `contenidoPorSobre` (`Integer` nullable), `observaciones` (`String` nullable), `usuarioRecibe` (`@ManyToOne` a `Usuario`), `fechaRegistro` (`LocalDateTime`), `deleted` (`boolean`, default false). Sin restricción de unicidad sobre `lote` (Decisión 5).
- [x] 1.3 Agregar borrado lógico a la entidad: `@SQLDelete(sql = "UPDATE registros_semillas SET deleted = true WHERE id=?")` y `@SQLRestriction("deleted = false")`, siguiendo el patrón de `Cliente.java`.
- [x] 1.4 Crear `repositories/RegistroSemillaRepository.java` extendiendo `JpaRepository<RegistroSemilla, Long>`, con `List<RegistroSemilla> findAllByOrderByFechaRecepcionDesc()` y la variante paginada `Page<RegistroSemilla> findAllByOrderByFechaRecepcionDesc(Pageable pageable)` (Decisión 10: la firma paginada existe desde el día uno aunque todavía no se use).

## 2. DTO y servicio (backend)

- [x] 2.1 Crear `dto/RegistroSemillaDTO.java` con todos los campos de la entidad más `clienteId`, `usuarioRecibeNombre` y `totalSemillas` (derivado). Nunca exponer la entidad JPA (regla dura 5).
- [x] 2.2 Crear `services/RegistroSemillaService.java` (interfaz): `obtenerTodos()`, `obtenerPorId(Long)`, `crear(RegistroSemillaDTO, Long usuarioId)`, `actualizar(Long, RegistroSemillaDTO)`, `eliminar(Long)`.
- [x] 2.3 Crear `services/impl/RegistroSemillaServiceImpl.java` (`@Service`, `@RequiredArgsConstructor`, `@Transactional` en escrituras) con el `mapToDTO` privado y la resolución de `cliente` y `usuarioRecibe` desde sus repositorios.
- [x] 2.4 Implementar `validarYNormalizar(RegistroSemillaDTO)` en el servicio, siguiendo el estilo de `validarYNormalizarOrigen()` de `SiembraServiceImpl`: rechazar `lote`, `descripcionSemilla`, `cantidad`, `unidadCantidad` y `fechaRecepcion` nulos o en blanco; rechazar `nombreQuienTrajo` en blanco cuando no hay `clienteId`; forzar `contenidoPorSobre = null` cuando `unidadCantidad != SOBRES`.
- [x] 2.5 Implementar el snapshot de cliente: cuando llega `clienteId`, copiar `nombreRazonSocial` y `telefono` del `Cliente` a `nombreQuienTrajo` y `telefonoContacto` del registro (Decisión 2).
- [x] 2.6 Calcular `totalSemillas` en `mapToDTO` como `cantidad × contenidoPorSobre` sólo cuando `unidadCantidad == SOBRES` y `contenidoPorSobre != null`; dejarlo nulo en cualquier otro caso. No persistirlo.
- [x] 2.7 Setear `fechaRegistro` con `LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires"))` en el alta, misma zona que usa `SiembraServiceImpl.finalizarSiembra()`.

## 3. Endpoint REST (backend)

- [x] 3.1 Crear `controllers/RegistroSemillaController.java` con `@RequestMapping("/api/registro-semillas")` y `@PreAuthorize("hasAuthority('LEER_SIEMBRAS')")` a nivel de clase.
- [x] 3.2 Implementar `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `DELETE /{id}` delegando siempre al servicio, nunca al repositorio (regla dura 6).
- [x] 3.3 Anotar `POST`, `PUT` y `DELETE` con `@PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")` (Decisión 8 — no se agregan permisos nuevos a `PermisoEnum`).
- [x] 3.4 En el `POST`, extraer el `Usuario` del `Authentication` y pasar su id al servicio como `usuarioRecibe`, ignorando cualquier usuario que venga en el body. Replicar el patrón de `SiembraController.finalizarSiembra()`.

## 4. Tests de backend

- [x] 4.1 Crear `backend/src/test/java/com/vivero/gestion/services/RegistroSemillaValidacionTest.java` sobre base real / Testcontainers (regla dura 4 — prohibido mockear la DB): alta válida mínima, y rechazo por `lote` en blanco, por `descripcionSemilla` en blanco, por `unidadCantidad` nula y por `nombreQuienTrajo` en blanco sin cliente.
- [x] 4.2 Agregar al mismo test la normalización de `contenidoPorSobre`: se conserva con `unidad = SOBRES` y se fuerza a `null` con `unidad = GRAMOS`.
- [x] 4.3 Crear `backend/src/test/java/com/vivero/gestion/services/RegistroSemillaTotalSemillasTest.java`: `7 SOBRES × 1000 → 7000`; `9 SOBRES` sin contenido → total nulo; `12.5 GRAMOS` → total nulo y cantidad decimal preservada sin redondeo.
- [x] 4.4 Crear `backend/src/test/java/com/vivero/gestion/services/RegistroSemillaSnapshotClienteTest.java`: al vincular un cliente se copian nombre y teléfono al registro; al eliminar (lógicamente) ese cliente, el registro sigue devolviendo el nombre y el teléfono capturados.
- [x] 4.5 Agregar test de persistencia de `lote` como texto: `043` conserva el cero inicial y `FP12.5H526` se guarda sin normalizar; dos registros pueden compartir el mismo lote sin error de unicidad.

**Evidencia TDD (base real Postgres, localhost:5433, sin mocks):**

| Test | Archivo | RED (antes de validarYNormalizar/snapshot/totalSemillas) | GREEN (después) |
|------|---------|---|---|
| Alta válida mínima | `RegistroSemillaValidacionTest.altaValidaMinimaSePersisteCorrectamente` | passed ya en RED (CRUD básico sin validar) | passed |
| Rechazo lote en blanco | `.rechazaLoteEnBlanco` | **FAILED** (`Expecting code to raise a throwable`) | passed |
| Rechazo descripción en blanco | `.rechazaDescripcionSemillaEnBlanco` | **FAILED** | passed |
| Rechazo unidad nula | `.rechazaUnidadCantidadNula` | **FAILED** | passed |
| Rechazo nombreQuienTrajo en blanco sin cliente | `.rechazaNombreQuienTrajoEnBlancoSinCliente` | **FAILED** | passed |
| Conserva contenidoPorSobre con SOBRES | `.conservaContenidoPorSobreCuandoUnidadEsSobres` | passed ya en RED | passed |
| Fuerza contenidoPorSobre a null con GRAMOS | `.fuerzaContenidoPorSobreANuloCuandoUnidadEsGramos` | **FAILED** (`expected: null but was: 1250`) | passed |
| Lote `043` conserva cero inicial | `.loteConCeroInicialSePersisteTalCual` | passed ya en RED | passed |
| Lote `FP12.5H526` sin normalizar | `.loteAlfanumericoSePersistaSinNormalizar` | passed ya en RED | passed |
| Dos registros comparten lote | `.dosRegistrosPuedenCompartirElMismoLoteSinErrorDeUnicidad` | passed ya en RED | passed |
| 7 SOBRES × 1000 = 7000 | `RegistroSemillaTotalSemillasTest.sieteSobresPorMilCalculaTotalSieteMil` | **FAILED** (`Expecting actual not to be null`) | passed |
| 9 SOBRES sin contenido → total nulo | `.nueveSobresSinContenidoPorSobreDejaTotalNulo` | passed ya en RED (siempre nulo) | passed |
| 12.5 GRAMOS → total nulo, decimal preservado | `.doceComaCincoGramosDejaTotalNuloYPreservaDecimalSinRedondear` | passed ya en RED | passed |
| Snapshot al vincular cliente | `RegistroSemillaSnapshotClienteTest.alVincularClienteSeCopianNombreYTelefonoAlRegistro` | **FAILED** (`expected: "Gustavo Aleo" but was: null`) | passed |
| Snapshot sobrevive borrado lógico del cliente | `.trasBorrarLogicamenteElClienteElRegistroConservaNombreYTelefono` | **FAILED** (`expected: "Ismael Test Snapshot" but was: null`) | passed |

RED: `mvn test -Dtest=RegistroSemillaValidacionTest,RegistroSemillaTotalSemillasTest,RegistroSemillaSnapshotClienteTest` → **Tests run: 15, Failures: 8** (contra la versión mínima del servicio, sin `validarYNormalizar`, sin snapshot de cliente y con `totalSemillas` siempre nulo).
GREEN: mismo comando tras implementar `validarYNormalizar`, el snapshot en `aplicarCamposBasicos` y el cálculo de `totalSemillas` en `mapToDTO` → **Tests run: 15, Failures: 0**.
Regresión completa del backend: `mvn test` → **67 tests, 65 passed** (los 2 fallos son preexistentes y no relacionados: `BackendApplicationTests.contextLoads` requiere `DB_PASS`/`DB_USER` reales no seteados en este shell local — el resto de los tests, incluidos los 15 nuevos, usan `@TestPropertySource` con credenciales propias; `UnidadNegocioConfigTest.testModeloCostoSeededCorrectly` toca `UnidadNegocio.java`, archivo con cambios pendientes ajenos a este change según el `git status` inicial).

## 5. Helpers compartidos de comprobante (frontend)

- [x] 5.1 Crear `frontend/src/utils/comprobanteExport.js` y **mover** (sin reescribir la lógica) desde `ComprobanteVentaModal.jsx`: `normalizarTelefonoWhatsApp`, `generarPngDeNodo(nodo)` (clon fuera de pantalla con ancho mínimo 500px), los flags `esDispositivoTactil` / `soportaCompartirArchivos`, y `abrirWhatsApp(...)` incluyendo la variable **a nivel de módulo** `ventanaWhatsAppAbierta` y sus comentarios explicativos (Decisión 7 — compartir esa variable es el motivo de la extracción).
- [x] 5.2 Migrar `frontend/src/components/ComprobanteVentaModal.jsx` para consumir los helpers de `comprobanteExport.js`, eliminando las copias locales. Sin cambios de comportamiento ni de textos.
- [ ] 5.3 **Verificación de regresión del remito de venta** (única task de gobernanza MEDIA): comprobar manualmente que el comprobante de venta sigue descargando PDF, descargando/compartiendo PNG y abriendo WhatsApp reutilizando la misma pestaña. Si falla, revertir sólo las tasks 5.1–5.2. **(Pendiente — verificación manual del usuario, no realizada por el agente.)**

## 6. Comprobante de semillas (frontend)

- [x] 6.1 Crear `frontend/src/components/ComprobanteSemillaModal.jsx` con el layout definido en la Decisión 7 (encabezado con acento, datos de entrega, bloque de semilla, receptor, leyenda "No constituye comprobante de venta"), estructurado como `ComprobanteVentaModal.jsx`.
- [x] 6.2 Aplicar la clase `force-light-export` al nodo de preview referenciado por `previewRef` — sin ella el PNG hereda los tokens de `[data-theme="dark"]` y sale ilegible (regresión ya sufrida en `FacturaCliente.jsx` y `ComprobanteVentaModal.jsx`).
- [x] 6.3 Implementar el botón de PDF con `jsPDF` (mismo formato A4 y encabezado con banda de color que el remito), nombrando el archivo `comprobante-semillas-<id>.pdf`.
- [x] 6.4 Implementar los botones de imagen y WhatsApp consumiendo `comprobanteExport.js`; el resumen de texto lleva número, fecha, quien entregó, lote, semilla y cantidad.
- [x] 6.5 Mostrar el total derivado (`cantidad × contenidoPorSobre`) en el comprobante sólo cuando el backend lo devuelve; ocultar la línea cuando es nulo.

## 7. Pantalla de registro (frontend)

- [x] 7.1 Crear `frontend/src/api/registroSemillas.api.js` con `getAll`, `getById`, `create`, `update`, `delete`, siguiendo el estilo de `siembras.api.js`.
- [x] 7.2 Crear `frontend/src/components/RegistroSemillaForm.jsx`: fecha precargada en hoy, lote, buscador de cliente con opción de nombre libre, descripción de semilla, cantidad, selector de unidad, contenido por sobre (visible sólo con unidad `SOBRES`) y observaciones. Botones con `cursor-pointer` e iconos de `lucide-react`.
- [x] 7.3 Crear `frontend/src/pages/RegistroSemillas.jsx`: listado ordenado por fecha descendente, buscador en cliente por nombre / lote / semilla, acciones de editar, eliminar y "Ver comprobante". Feedback exclusivamente con `useUIStore` (`pushToast`, `askConfirm`, `denyAccess`) — nunca `alert` ni `confirm` nativos (regla dura 7).
- [x] 7.4 Manejar los estados de carga, error y lista vacía con el mismo patrón de `Siembras.jsx` (`Loader2`, `AlertCircle`, `Inbox`), incluyendo el mensaje específico para respuestas 403.

## 8. Integración en la navegación (frontend)

- [x] 8.1 Registrar la ruta `/registro-semillas` en `App.jsx` dentro de un `ProtectedRoute` con `requiredPermission="LEER_SIEMBRAS"`.
- [x] 8.2 Agregar el ítem al grupo `Catálogo` de `navGroups` en `DashboardLayout.jsx`, debajo de `Siembras`: `{ to: '/registro-semillas', label: 'Registro de Semillas', icon: PackagePlus, permission: 'LEER_SIEMBRAS', unidades: ['vivero'] }`.
- [x] 8.3 Verificar que el guard de unidad de negocio ya existente en `DashboardLayout.jsx` redirige a `/dashboard` al cambiar la unidad activa a Herramientas o Abono estando parado en `/registro-semillas`, sin escribir código nuevo para eso. **Verificado por lectura**: `todosLosNavItems` se deriva de `navGroups.flatMap(...)` (línea ~85), y el efecto de guard (línea ~119-126) filtra por `location.pathname.startsWith(item.to)` y redirige si ningún item de esa ruta permite la unidad activa — el nuevo item de la task 8.2 queda cubierto automáticamente, sin tocar el guard.

## 9. Cierre

- [x] 9.1 Verificar contra `specs/registro-semillas-clientes/spec.md` que cada escenario tiene cobertura: los de backend por test automatizado, los de comprobante y navegación por verificación manual documentada. **Verificado**: los 9 requirements y sus escenarios están cubiertos — alta/rechazos y snapshot/lote/cantidad por los 15 tests automatizados de la sección 4; usuario receptor y fecha por defecto por el controller/form (patrón replicado de `SiembraController`/`SiembraForm`, sin test dedicado por no estar pedido en la sección 4); listado/búsqueda/edición/borrado lógico por `RegistroSemillas.jsx` + `RegistroSemillaServiceImpl`; comprobante PDF/PNG/WhatsApp por `ComprobanteSemillaModal.jsx` (pendiente de verificación manual del usuario); acceso restringido por `@PreAuthorize` + gating de unidad ya verificado en 8.3.
- [x] 9.2 Confirmar los no-objetivos: el alta de un registro no crea `Siembra`, `Producto` ni `MovimientoStock`, y no se modificó `PermisoEnum` ni `DataInitializer`. **Confirmado en su momento** (2026-09-02): `RegistroSemillaServiceImpl.crear()` sólo persiste `RegistroSemilla`. **⚠️ Revisado 2026-09-03**: la mitad de este ítem sobre `PermisoEnum` quedó desactualizada por el grupo 10 de abajo — el dueño pidió permisos independientes para Registro de Semillas, y eso sí toca `PermisoEnum` (agrega `LEER_REGISTRO_SEMILLAS`/`ESCRIBIR_REGISTRO_SEMILLAS` al final, IDs 19/20). Los no-objetivos de `Siembra`/`Producto`/`MovimientoStock` (no se crean al registrar un sobre) siguen vigentes sin cambios. `DataInitializer` sigue sin tocarse (verificado de nuevo en la task 10.4).
- [x] 9.3 Actualizar `openspec/roadmap.md` con el change y su estado.

## 10. Independencia de permisos frente a Siembras (2026-09-03, pedido del dueño)

**Motivo del cambio de alcance:** la Decisión 8 original (grupo 3, ver `design.md`) reutilizaba `LEER_SIEMBRAS`/`ESCRIBIR_SIEMBRAS` para no inflar `PermisoEnum` sin necesidad real, razonando que ambos permisos ya se otorgaban juntos a todos (JEFE y COLEGA tienen `EnumSet.allOf`). El dueño pidió revertir esa decisión: quiere poder darle a una persona acceso a Registro de Semillas sin darle Siembras, y viceversa, para repartir el trabajo de mostrador sin exponer el circuito de producción. Ver la nota de revisión agregada a la Decisión 8 en `design.md`.

- [x] 10.1 Agregar `LEER_REGISTRO_SEMILLAS(19L)` y `ESCRIBIR_REGISTRO_SEMILLAS(20L)` al final de `PermisoEnum.java` (los IDs son estables, nunca se reordenan ni se reusan — ver javadoc del enum).
- [x] 10.2 Cambiar `RegistroSemillaController.java`: `@PreAuthorize` de clase de `LEER_SIEMBRAS` a `LEER_REGISTRO_SEMILLAS`; los 3 `@PreAuthorize` de método (`crear`, `actualizar`, `eliminar`) de `ESCRIBIR_SIEMBRAS` a `ESCRIBIR_REGISTRO_SEMILLAS`. Comentario de clase actualizado para explicar la independencia.
- [x] 10.3 **Bug de seguridad encontrado y corregido de paso** (no estaba en el alcance original, se detectó al auditar `SiembraController.java` para este cambio): la clase sólo exigía `LEER_SIEMBRAS` y ningún método de escritura agregaba `ESCRIBIR_SIEMBRAS`, así que un usuario de solo lectura podía crear, editar, borrar y finalizar siembras. Se agregó `@PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")` a nivel de método en `crearSiembra`, `actualizarSiembra`, `eliminarSiembra`, `finalizarSiembra` y `pasarAStock`. Los GET quedan sin cambios.
- [x] 10.4 Verificar por lectura que `DataInitializer.java` no necesita cambios: JEFE usa `EnumSet.allOf(PermisoEnum.class)` y COLEGA usa `allOf` menos `ADMIN_DB`, así que los permisos nuevos llegan solos a ambos roles sembrados. **Confirmado, sin cambios.**
- [x] 10.5 Tests nuevos (TDD estricto, RED confirmado revirtiendo temporalmente los `@PreAuthorize` y viendo fallar los tests por la razón correcta, luego GREEN reaplicando el fix): `backend/src/test/java/com/vivero/gestion/controllers/SiembraControllerPermisoTest.java` (4 tests: rechazo de `crearSiembra`/`eliminarSiembra` sin `ESCRIBIR_SIEMBRAS`, éxito con ambos permisos, lectura no rota con solo `LEER_SIEMBRAS`) y `RegistroSemillaControllerPermisoTest.java` (4 tests: los permisos de Siembras ya NO alcanzan para leer ni escribir Registro de Semillas, `LEER_REGISTRO_SEMILLAS` solo permite leer, ambos permisos nuevos permiten crear). Los 8 tests corren contra Postgres real (localhost:5433), sin mocks. Suite completa del backend: 75 tests, 74 passed (1 falla preexistente y no relacionada, `UnidadNegocioConfigTest`, ya conocida de antes de este change).
- [x] 10.6 Frontend: `App.jsx` — `/registro-semillas` sale del bloque `ProtectedRoute` compartido con `/siembras` y pasa a su propio bloque con `requiredPermission="LEER_REGISTRO_SEMILLAS"`. `layouts/DashboardLayout.jsx` — el ítem de nav de Registro de Semillas cambia su `permission` a `LEER_REGISTRO_SEMILLAS`. `pages/RegistroSemillas.jsx` — los dos mensajes de `denyAccess` (crear/eliminar) pasan a nombrar `ESCRIBIR_REGISTRO_SEMILLAS`. `components/RegistroSemillaForm.jsx` no tiene chequeos de permisos propios (verificado por lectura, sin cambios).
- [x] 10.7 `pages/UsuariosAdmin.jsx`: sección "Registro de Semillas" nueva, independiente de "Siembras", contigua a ella, sólo Vivero. Además, en el mismo cambio (pedido explícito del dueño, fuera del alcance original de este change pero empaquetado junto por tocar el mismo archivo): se sacaron las casillas de Finanzas/Cheques de todas las unidades (ausencia deliberada, comentada en el código); se sacó `ADMIN_SIEMBRAS` de la casilla común "Siembras" (permiso que ningún `@PreAuthorize`/`hasPermission` del backend verifica, verificado por búsqueda); se reemplazaron los condicionales ad-hoc (`isHerramientas`/`isAbono`) por un campo `unidades: [...]` explícito por sección, con el mismo vocabulario que `navGroups` de `DashboardLayout.jsx`; se filtró también la pestaña "Avanzado (Permisos)" por unidad con un mapa `PERMISO_UNIDAD_MAP`, ocultando `LEER_FINANZAS` siempre. **Riesgo cubierto**: editar un rol existente con permisos ocultos por estos filtros (ej. `LEER_FINANZAS` ya otorgado) ya NO los pierde al guardar — `openRolModal` calcula `permisosOcultosPreservados` (ids del rol que no están en el catálogo visible de la unidad activa) y `handleRolSave` los reincorpora siempre al payload final, sin importar qué pestaña (Secciones o Avanzado) se use para guardar.
- [x] 10.8 Lint: `npx oxlint` sobre los 4 archivos de frontend tocados → 0 errores (sólo warnings preexistentes de `no-unused-vars`/`exhaustive-deps`, estilo ya existente del repo, no tocados).
- [x] 10.9 Actualizar `design.md` (nota de revisión sobre la Decisión 8, sin borrar la decisión original) y `openspec/roadmap.md` (párrafo del change) para reflejar que sí se tocó `PermisoEnum` y que los permisos ya no se reutilizan de Siembras.
