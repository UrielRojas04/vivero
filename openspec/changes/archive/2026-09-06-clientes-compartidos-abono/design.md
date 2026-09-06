## Context

La unidad de negocio **Abono** (`unidadNegocio.id == 3`) es operada por dos personas que trabajan bajo dos "cuentas operativas" del dominio (`CuentaAbono`: `JEFE` y `COLEGA`). Esa cuenta no es una identidad de autenticación: `CuentaAbonoFilter` la deriva del `username` de la sesión (`Sergio` → `JEFE`, `Pablo` → `COLEGA`) y la deja en un `ThreadLocal` (`CuentaAbonoContextHolder`) durante la petición, limpiándola en el `finally`.

Sobre ese contexto, hoy `ClienteServiceImpl` particiona **la agenda de clientes**: cuando `unidadId == 3L` y hay cuenta en contexto, `getAll()`, `getById()`, `update()`, `delete()`, `ajustarSaldo()` y `obtenerFactura()` usan `findAllByUnidadNegocioIdAndCuentaAbono(...)` / `findByIdAndUnidadNegocioIdAndCuentaAbono(...)` en vez del camino normal `findAllByUnidadNegocioId(...)` / `findByIdAndUnidadNegocioId(...)` que usan Vivero y Herramientas. `create()` estampa `cliente.setCuentaAbono(cuentaAbono)` en el alta. Resultado: cada uno de los dos usuarios ve sólo los clientes que él mismo cargó, y si el otro ya cargó a ese cliente tiene que volver a crearlo de su lado — duplicando el registro y, con él, la cuenta corriente.

El dueño quiere una **única agenda compartida** para Abono, igual a como ya funciona en Vivero y Herramientas.

### Estado real relevado (verificado sobre el código, no asumido)

1. **`Cliente.cuentaAbono` no se lee en ningún otro lado.** El único consumidor es `ClienteServiceImpl` (el filtrado y el `create`). No lo lee `FacturaClienteServiceImpl`, ni `FinanzasServiceImpl`, ni `BandejasServiceImpl`, ni `ChequeServiceImpl`, ni `SiembraServiceImpl`, ni `RegistroSemillaServiceImpl`, ni `VentaServiceImpl`.
2. **`ClienteDTO` no expone `cuentaAbono`.** `mapToDTO` no lo incluye en el `builder()`, así que el frontend nunca lo recibió ni lo pudo filtrar. Un `grep` sobre `frontend/src` no encuentra ninguna referencia a `cuentaAbono` en componentes de clientes.
3. **Facturación no re-filtra por cuenta.** `FacturaClienteServiceImpl.abrirFacturaManual` resuelve el cliente con `clienteRepository.findById(clienteId)` sin criterio de cuenta; el resto del servicio (registrar pago, cerrar factura, mapear DTO) trabaja sobre `factura.getCliente()`, nunca vuelve a consultar el cliente con filtro. Lo único que sí usa la cuenta es `pago.setCuentaAbono(CuentaAbonoContextHolder.getCuentaAbono())`, que es atribución del **pago**, no del cliente, y queda fuera de alcance.
4. **Finanzas no toca `Cliente` con filtro de cuenta.** `FinanzasServiceImpl` no consulta `ClienteRepository`; su única referencia a cliente es leer `v.getClienteNombre()` de un DTO ya armado.
5. **La partición actual ya está rota en dos casos reales**, lo que confirma que no es una regla de negocio sino un accidente de implementación:
   - Un tercer usuario autenticado de Abono (que no sea `Sergio` ni `Pablo`) no tiene cuenta en contexto, cae en el `else`, y **ve la lista completa** — o sea, la "privacidad" de la agenda ya no se sostiene hoy.
   - El alta de **cliente express desde la venta** (`VentaServiceImpl`, rama `clienteAdHoc` no casual) crea el `Cliente` sin setear `cuentaAbono`: queda en `NULL` y por lo tanto **invisible para los dos** en la pantalla de Clientes, aunque tenga ventas y saldo. Es un bug latente que este cambio elimina de raíz.
6. **No hay herramienta de migraciones.** `spring.jpa.hibernate.ddl-auto=update` y `backend/pom.xml` sin Flyway ni Liquibase. Hibernate en modo `update` **agrega** columnas pero **nunca las elimina**.
7. **`ClienteServiceImpl` resuelve Abono con el literal `unidadId == 3L`.** `VentaServiceImpl` ya migró a resolver la unidad "Abono" por nombre; `ClienteServiceImpl` quedó con el literal. Este cambio hace desaparecer la comparación entera, así que la deuda se salda por eliminación, no por refactor.

## Goals / Non-Goals

**Goals:**
- Que los dos usuarios de Abono vean, editen, borren y ajusten el saldo de **la misma lista de clientes**, sin importar quién lo dio de alta.
- Que un cliente creado por uno quede inmediatamente utilizable por el otro para vender, facturar y cobrar, sin recrearlo.
- Que el código deje de tener un camino capaz de re-particionar clientes por cuenta (no basta con dejar de llamarlo: hay que borrarlo).
- Cero cambios en Frontend y cero cambios en el contrato HTTP (mismas rutas, mismo `ClienteDTO`).

**Non-Goals:**
- **No** se unifica nada más que la agenda de clientes. `Venta.cuentaAbono`, `Pago.cuentaAbono`, `MovimientoStockAbono` / `StockAbonoServiceImpl` y `RendicionColegaServiceImpl` quedan **exactamente como están**: jefe y colega siguen con stock, ventas, pagos y rendición separados. Eso es el modelo de negocio real (cada uno vende de su propio stock y rinde cuentas por separado) y tocarlo sería una regresión, no una mejora.
- No se deduplican los clientes que hoy ya estén cargados dos veces (uno por cuenta). Después del cambio aparecerán ambos en la lista y el usuario los depurará a mano desde la UI. No se escribe ningún script de merge de cuentas corrientes.
- No se cambia `CuentaAbonoFilter` ni `CuentaAbonoContextHolder`: siguen existiendo y sirviendo a ventas/stock/rendición.
- No se toca Vivero ni Herramientas, que nunca tuvieron el concepto de `CuentaAbono`.
- No se agrega paginación a `getAll()` (deuda preexistente, fuera de alcance).

## Decisions

### Decisión 1 — Eliminar la rama de partición, no volverla configurable

`ClienteServiceImpl` pasa a usar **un solo camino**, el mismo de Vivero y Herramientas: `findAllByUnidadNegocioId(unidadId)` y `findByIdAndUnidadNegocioId(id, unidadId)`. Desaparecen las seis ramas `if (unidadId == 3L && cuentaAbono != null)` y el `setCuentaAbono` de `create()`. Con eso, `ClienteServiceImpl` queda sin referencias a `CuentaAbonoContextHolder` ni a `CuentaAbono` (se quitan los dos imports).

*Alternativa considerada:* dejar la partición detrás de un flag configurable (`app.abono.clientes-compartidos=true`). Rechazada: el dueño quiere una sola agenda, no dos modos; un flag deja vivo el código muerto, obliga a testear las dos ramas para siempre, y el propio relevamiento (punto 5 del contexto) muestra que la partición ya no se cumple de forma consistente ni hoy. Un comportamiento que no se va a volver a activar no merece un flag.

*Efecto colateral deseado:* el mensaje de error `"Cliente no encontrado o no pertenece a tu cuenta."` desaparece; queda el genérico `"Cliente no encontrado o no pertenece a la unidad."`, que es el correcto ahora que el único criterio de pertenencia es la unidad de negocio.

### Decisión 2 — El campo `cuentaAbono` se borra de la entidad `Cliente`; la columna `cuenta_abono` se deja intacta en la base

Esta es la decisión abierta que planteaba el `proposal.md`, y se resuelve así: **código sin el campo, base con la columna.**

- Se elimina `private CuentaAbono cuentaAbono;` (con su `@Enumerated` y su `@Column(name = "cuenta_abono")`) de `Cliente.java`.
- Se eliminan `findAllByUnidadNegocioIdAndCuentaAbono` y `findByIdAndUnidadNegocioIdAndCuentaAbono` de `ClienteRepository` (dejan de compilar al borrar el campo, lo cual es exactamente la señal buscada).
- **No** se ejecuta ningún `ALTER TABLE clientes DROP COLUMN cuenta_abono`.

*Por qué no se dropea la columna:* el proyecto no tiene Flyway ni Liquibase y corre con `ddl-auto=update`, que nunca elimina columnas. Dropearla exigiría un SQL manual, fuera de banda, sin versionar, sin revisión en el diff y sin rollback — una operación destructiva e irreversible sobre producción, a cambio de recuperar una columna nullable de un enum. La columna sobrante no cuesta nada: es `nullable`, Hibernate la ignora si no está mapeada, y conserva el rastro histórico de quién cargó cada cliente por si alguna vez hay que auditarlo. El riesgo de la operación es mucho mayor que el beneficio.

*Por qué sí se borra el campo de la entidad (alternativa considerada: dejar el campo, simplemente no usarlo).* Rechazada por tres motivos: (a) un campo mapeado que nadie escribe hace que cada `save()` persista `NULL`, ensuciando la columna que dijimos que íbamos a preservar como rastro histórico; (b) mientras el campo y los métodos de repositorio existan, nada impide que un cambio futuro vuelva a filtrar clientes por cuenta "sin querer" — borrarlos convierte el invariante en un error de compilación; (c) deja código muerto que el próximo lector tiene que investigar para descubrir que no se usa. Borrar el campo tiene **el mismo riesgo cero** que dejarlo (bajo `ddl-auto=update` la base no cambia en ninguno de los dos casos) y mucho mejor resultado.

*Consecuencia asumida:* la columna queda con valores mixtos (`JEFE`/`COLEGA` en los clientes viejos, `NULL` en los nuevos y en los creados por venta express). Es irrelevante porque ningún código la lee.

### Decisión 3 — Facturación y Finanzas no requieren ningún cambio, y esto se verificó explícitamente

Relevado en los puntos 3 y 4 del contexto: ninguno de los dos servicios re-filtra el cliente por `cuentaAbono`. Al compartirse la lista, cualquiera de los dos usuarios puede abrir una factura, registrar un pago o ver la cuenta corriente del mismo cliente sin código nuevo. Se deja constancia acá para que quede claro que se investigó y no fue una omisión.

Lo único que sigue llevando cuenta en el flujo de facturación es `Pago.cuentaAbono` (quién cobró), y eso **se mantiene**: es atribución de la operación, no del cliente, y es justamente lo que alimenta la rendición del colega.

### Decisión 4 — Tests de regresión: el guard es sobre lo que NO cambia

Los tests nuevos cubren dos frentes:

1. **El comportamiento nuevo:** con el mismo cliente de Abono en la base, listarlo/leerlo con `CuentaAbono.JEFE` en contexto y con `CuentaAbono.COLEGA` en contexto devuelve el mismo resultado; y un cliente creado bajo una cuenta es legible, actualizable y ajustable de saldo desde la otra.
2. **El guard de no-regresión:** con la agenda ya compartida, `VentaService.listarVentas()` sigue devolviendo sólo las ventas de la cuenta en contexto. Esto es lo que impide que el cambio "se desborde" hacia ventas/stock/rendición. Ya existe `VentaServiceListarVentasAbonoTest` cubriendo ese caso; el guard nuevo lo replantea con clientes compartidos de por medio, que es el escenario que este cambio introduce.

Los tests usan el patrón vigente del repo: `@SpringBootTest` + `@TestPropertySource` apuntando a Postgres real en `localhost:5433`, `UnidadNegocioContextHolder` / `CuentaAbonoContextHolder` seteados a mano y limpiados en `@AfterEach`, sin mocks de base (regla dura #4). Referencias de estilo: `ClienteDocumentosTest` y `VentaServiceListarVentasAbonoTest`.

## Risks / Trade-offs

- **[Clientes duplicados aparecen de golpe en la lista]** → Si alguien ya está cargado dos veces (una por cuenta), después del cambio se ven los dos registros con sus saldos separados. Mitigación: es visible y corregible desde la UI de Clientes (editar/eliminar); no hay pérdida de datos y las ventas históricas siguen apuntando a su cliente original. Un merge automático de cuentas corrientes sería mucho más riesgoso que la depuración manual de unos pocos casos.
- **[Cada usuario ve ahora clientes que antes no veía]** → Es el objetivo explícito del pedido, no un efecto secundario. No hay dato sensible nuevo expuesto: `ClienteDTO` devuelve nombre, teléfono, documentos y saldos, y ambos usuarios ya operan sobre la misma unidad de negocio. Sigue vigente el aislamiento entre unidades (`unidadNegocioId`), que es la frontera de seguridad real.
- **[La columna `cuenta_abono` queda huérfana en la base]** → Aceptado a conciencia (Decisión 2). Queda documentado acá y en `tasks.md` para que quien algún día introduzca Flyway la incluya en la primera migración de limpieza.
- **[Alguien reintroduce el filtro más adelante]** → Mitigado por construcción: al borrar el campo de la entidad y los métodos del repositorio, volver a filtrar clientes por cuenta requiere reescribirlos, no simplemente llamarlos. El test de agenda compartida falla si eso ocurre.
- **[Que el cambio se desborde a ventas/stock/rendición]** → Mitigado por el guard de Decisión 4 y por el alcance explícito de `tasks.md`: ningún archivo de `Venta*`, `Pago*`, `StockAbono*` ni `RendicionColega*` se toca.

## Migration Plan

No hay migración de datos ni de esquema.

1. Deploy del backend con el código nuevo. Hibernate en `ddl-auto=update` no altera la tabla `clientes` (no agrega ni quita nada).
2. Efecto inmediato al primer request: la lista de clientes de Abono pasa a mostrar el conjunto completo de la unidad. No hace falta reindexar, recalcular saldos ni tocar el frontend.
3. **Rollback:** revertir el commit y redesplegar. Como la columna `cuenta_abono` nunca se borró y los valores históricos siguen ahí, el código anterior vuelve a particionar exactamente igual que antes. Los clientes creados durante la ventana del cambio tendrán `cuenta_abono = NULL` y, tras el rollback, no serían visibles para ninguna de las dos cuentas hasta asignarles un valor a mano — riesgo bajo y acotado a la ventana, y otra razón más para no haber dropeado la columna.

## Open Questions

Ninguna. La decisión sobre la columna `cuenta_abono` queda cerrada en la Decisión 2 (borrar el campo de la entidad, conservar la columna física) y la fase de implementación no tiene que elegir nada al respecto.
