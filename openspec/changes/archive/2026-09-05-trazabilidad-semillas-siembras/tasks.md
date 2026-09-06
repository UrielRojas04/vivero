## 1. Backend: modelo de datos

- [x] 1.1 Crear enum `EstadoRegistroSemilla` (`SIN_SEMBRAR`, `SEMBRADAS`, `CONSUMIDA`)
- [x] 1.2 Agregar columna `estado` a `RegistroSemilla` (`@Enumerated(STRING)`, default `SIN_SEMBRAR`, `nullable = false`)
- [x] 1.3 Agregar columna `fecha_siembra_programada` (LocalDate, nullable) a `RegistroSemilla`
- [x] 1.4 Agregar columna `registro_semilla_id` (FK opcional, `@ManyToOne`, nullable) a `Siembra`
- [x] 1.5 Actualizar `RegistroSemillaDTO` y `SiembraDTO`/`SiembraRequestDTO` con los campos nuevos

## 2. Backend: lógica de negocio (TDD)

- [x] 2.1 Test + implementación: al crear o editar una `Siembra` de origen `SOBRE` con `registroSemillaId`, el `RegistroSemilla` vinculado pasa a `SEMBRADAS` si estaba en `SIN_SEMBRAR` (no espera a `finalizarSiembra`)
- [x] 2.2 Test + implementación: vincular una `Siembra` a un `RegistroSemilla` ya en `SEMBRADAS` no rompe nada y no cambia el estado (idempotente)
- [x] 2.3 Test + implementación: el sistema rechaza vincular una `Siembra` a un `RegistroSemilla` en estado `CONSUMIDA`
- [x] 2.4 Test + implementación: cambiar el origen de una `Siembra` existente de `SOBRE` a `SUELTO` limpia `registroSemillaId` (además del código de lote, comportamiento ya existente)
- [x] 2.5 Test + implementación: endpoint/acción para marcar un `RegistroSemilla` como `CONSUMIDA`; rechaza si ya está `CONSUMIDA`
- [x] 2.6 Test + implementación: el listado/búsqueda de registros para vincular en el formulario de Siembra excluye los `CONSUMIDA` (filtrado en frontend sobre el DTO ya expuesto, sin endpoint nuevo)

## 3. Frontend: formulario de Siembra

- [x] 3.1 `SiembraForm.jsx`: con origen `SOBRE`, agregar buscador de `RegistroSemilla` (por lote, cliente o quién lo trajo) junto al input de código de lote
- [x] 3.2 Al seleccionar un registro, autocompletar el código de lote con `registro.lote`
- [x] 3.3 Calcular cantidad de semillas del registro (`SEMILLAS` directo, `SOBRES × contenidoPorSobre`; `GRAMOS` sin cálculo) y, si hay una `VariedadBandeja` seleccionada, sugerir `cantidad = floor(semillas / cantidadCeldas)` en el campo de cantidad inicial, dejándolo editable
- [x] 3.4 No sobrescribir el valor de cantidad si el usuario ya lo editó a mano en la misma sesión (mismo criterio que hoy usa `handleBandejaChange`)
- [x] 3.5 Al cambiar el origen a `SUELTO`, limpiar el registro vinculado además del código de lote

## 4. Frontend: Ingresos de Semillas

- [x] 4.1 `RegistroSemillaForm.jsx`: agregar campo opcional "Fecha de siembra programada"
- [x] 4.2 `RegistroSemillas.jsx`: mostrar el estado del registro (`SIN_SEMBRAR` / `SEMBRADAS` / `CONSUMIDA`) como badge en la lista
- [x] 4.3 `RegistroSemillas.jsx`: botón "Consumir" en cada registro no `CONSUMIDA`, con confirmación vía `useUIStore` (nunca `confirm()` nativo) explicando que es una acción terminal
- [x] 4.4 `RegistroSemillas.jsx`: agregar filtros "Quincena actual" / "Próxima quincena" junto a la barra de búsqueda, calculados en cliente a partir de la fecha de hoy (sin tocar el backend, la lista ya se trae completa); excluir de ambos filtros los registros en estado `CONSUMIDA` (los `SEMBRADAS` sí se muestran)
- [x] 4.5 Combinar el filtro de quincena con el filtro de texto existente (ambos aplican a la vez)

## 5. Verificación

- [x] 5.1 Correr la suite de tests backend existente como red de seguridad antes de tocar `SiembraServiceImpl`/`RegistroSemillaServiceImpl` (capturar baseline)
- [x] 5.2 Correr la suite completa en verde al finalizar (tests nuevos + existentes) — 36/36 verdes (RegistroSemilla*, Siembra*, ProductoCodigoBarraTest, PedidoRecepcionCodigoBarraTest)
- [ ] 5.3 Prueba manual end-to-end (pendiente para el dueño, según preferencia de testear UI manualmente): dar de alta un registro con fecha de siembra programada → aparece en el filtro de quincena correspondiente → vincularlo desde una siembra nueva de origen SOBRE → confirmar que pasa a `SEMBRADAS`, que sigue apareciendo en el filtro de quincena y que sigue disponible para vincular en otra siembra → apretar "Consumir" → confirmar que desaparece tanto del filtro de quincena como de las opciones para vincular en una siembra nueva
