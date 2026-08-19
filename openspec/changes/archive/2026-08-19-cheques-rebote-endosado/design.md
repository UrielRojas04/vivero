> ### ⚠️ Gobernanza: **CRÍTICA** — Billing / Finanzas
>
> Este change modifica lógica de deuda y saldos de clientes: `CuentaCorrienteDinero.balancePesos`, vía `agregarDeuda()` y `agregarSaldoAFavor()`. Según la política de gobernanza del proyecto, Billing/Finanzas es dominio **CRÍTICO**.
>
> **El análisis y el diseño avanzan sin bloqueo. La implementación NO.** Durante `/opsx:apply`, cada grupo de tareas que toque `agregarDeuda`/`agregarSaldoAFavor` o el guard de transición de estados del cheque requiere **checkpoint explícito del usuario antes de darse por cerrado**. No se escribe una línea de lógica que mueva plata sin que el usuario haya confirmado el signo, el orden y la cuenta destino de cada operación.
>
> El motivo es concreto: un error de signo acá no rompe una pantalla ni tira una excepción. Falsea la deuda de **dos** clientes a la vez, en direcciones opuestas, de forma silenciosa, y `CuentaCorrienteDinero` guarda sólo el balance acumulado — no hay libro de movimientos contra el cual reconciliar después. La única forma de detectarlo es que un cliente reclame.

## Context

### El caso de negocio, en palabras del usuario

> "Caso de rebotar un cheque endosado entonces significa que el primer cliente que me lo dió me debe ese dinero y ese dinero yo se lo debo al que lo endosé. A veces el jefe paga el cheque que endosó y que rebotó pero el cliente que le había dado ese cheque a él inicialmente no le paga así que eso también se lo debería aumentar a su deuda"

Traducido al modelo: el cheque tiene dos contrapartes. El **cliente original** (`cheque.cliente`) es quien se lo dio al vivero como pago. El **endosatario** es a quien el vivero se lo pasó después, también como pago. Si el cheque rebota, los dos pagos quedan sin efecto a la vez, y hay que deshacer los dos.

### Semántica de signos — verificada en código, no asumida

`CuentaCorrienteDinero` (`backend/src/main/java/com/vivero/gestion/models/CuentaCorrienteDinero.java`) es un balance único por cliente:

```java
public void agregarDeuda(BigDecimal monto) {
    this.balancePesos = this.balancePesos.subtract(monto);
}

public void agregarSaldoAFavor(BigDecimal monto) {
    this.balancePesos = this.balancePesos.add(monto);
}
```

| Signo de `balancePesos` | Significado |
|---|---|
| Negativo | El cliente le debe al vivero |
| Positivo | El vivero le debe al cliente (saldo a favor del cliente) |

`agregarDeuda(m)` mueve el balance hacia lo negativo. `agregarSaldoAFavor(m)` lo mueve hacia lo positivo. Son inversos exactos: `agregarDeuda(m)` seguido de `agregarSaldoAFavor(m)` deja el balance como estaba. Esa propiedad es la que hace que la reversa sea correcta y es la única aritmética de la que depende este change.

### Estado actual del flujo de cheques

Todo pasa por `ChequeServiceImpl.actualizarEstado(Long id, ChequeDTO dto)`, un único método `@Transactional` detrás de `PUT /api/cheques/{id}` (`@PreAuthorize("hasAuthority('LEER_FINANZAS')")`). Su estructura hoy:

1. **Guard de inmutabilidad** (línea ~99). Si el estado actual es `RECHAZADO`, `ENTREGADO` o `COBRADO`, lanza excepción y no se hace nada más. **Este es el bloqueo que hace imposible el caso de negocio.**
2. **Rama de rechazo**. Si el estado nuevo es `RECHAZADO`, impacta la cuenta corriente de `cheque.getCliente()`: `agregarDeuda(monto)` si el cheque es de tercero (`esEmisionPropia = false`), `agregarSaldoAFavor(monto)` si es de emisión propia.
3. **Asignación del estado nuevo.**
4. **Rama de endoso.** Si el estado nuevo es `ENTREGADO`: si viene `dto.getEndosadoAClienteId()`, busca ese `Cliente`, le hace `agregarDeuda(monto)` en su cuenta y copia su nombre a `cheque.entregadoA`. Si no viene, guarda el texto libre `dto.getEntregadoA()`. En ambos casos setea `fechaEntrega`.
5. **Rama `else`** (estado nuevo distinto de `ENTREGADO`): **borra** `fechaEntrega` y `entregadoA`, poniéndolos en `null`.

Tres hechos verificados que condicionan el diseño entero:

**(a) El endosatario no se persiste.** `Cheque.java` tiene `@Column(length = 150) private String entregadoA` y nada más. `endosadoAClienteId` existe sólo en `ChequeDTO`, viaja en el request del endoso, se usa para mover el saldo y se descarta. El nombre queda copiado en `entregadoA` como texto. **Sin la relación persistida no hay forma de saber a quién devolverle el saldo cuando el cheque rebota semanas después**, y buscar al cliente por nombre sobre un campo de texto de 150 caracteres no es una opción aceptable en lógica de dinero: hay homónimos, el cliente puede haber cambiado de razón social, y el mismo campo se usa para proveedores que no son clientes.

**(b) La rama `else` destruye el rastro del endoso.** Al pasar un cheque a `RECHAZADO`, el paso 5 pone `entregadoA` y `fechaEntrega` en `null`. Hoy es inofensivo, porque a `RECHAZADO` sólo se llega desde `EN_CARTERA`, donde esos campos ya están vacíos. En cuanto se habilite `ENTREGADO → RECHAZADO`, **esa misma rama borraría exactamente la información que el usuario necesita ver**: a quién le habíamos endosado el cheque que acaba de rebotar. Es un bug latente que este change destapa y debe corregir en el mismo movimiento.

**(c) Un cheque de emisión propia nunca puede estar `ENTREGADO`.** `ChequeEstadoModal.jsx` sólo ofrece la opción `ENTREGADO` cuando `!cheque.esEmisionPropia`. Un cheque emitido por el vivero se cobra o se rechaza, no se endosa. Por lo tanto, en la transición `ENTREGADO → RECHAZADO` se puede asumir `esEmisionPropia = false`, y la pata del cliente original es siempre `agregarDeuda`. Aun así el código no debe asumirlo tácitamente — ver Decisión 3.

### El pago del jefe al endosatario ya está resuelto

El usuario confirmó que cuando el jefe le paga en efectivo o por transferencia al endosatario para cubrir el cheque rebotado, eso usa un flujo que **ya existe**. Investigado: hay dos mecanismos de pago en el sistema y el aplicable es el segundo.

| Mecanismo | Endpoint | Requiere `Venta` | Aplica |
|---|---|---|---|
| Pago de venta (`VentaServiceImpl.registrarPago`, crea un `Pago`) | `POST /api/ventas/{id}/pagos` | **Sí** | No |
| Ajuste manual de saldo (`ClienteServiceImpl.ajustarSaldo`) | `POST /api/clientes/{id}/saldo/ajuste` | No | **Sí** |

`registrarPago` exige un `ventaId` en la ruta y suma el monto a los pagos de esa venta para recalcular su `estadoPago`. El pago al endosatario no corresponde a ninguna venta, así que ese camino no sirve. El que sirve es `ajustarSaldo`, que hace `balancePesos = balancePesos.add(monto)` directo sobre la cuenta del cliente, con monto negativo para aumentar deuda y positivo para acreditar (capability `ajustes-cuenta-cte`).

Concretamente: después de que el cheque rebota, el endosatario queda con saldo a favor por el monto del cheque (el vivero le debe). Cuando el jefe le paga, el jefe registra un ajuste **negativo** por ese monto sobre la cuenta del endosatario, y el saldo vuelve a cero. La deuda del cliente original **no se toca**: sigue debiendo, y sólo baja cuando él pague. Esto es exactamente lo que describe la segunda mitad del pedido del usuario.

**Nada de esto requiere código nuevo.** Se documenta acá porque es la parte del pedido que se resuelve *no* construyendo nada, y porque conviene que quede escrito que las dos cuentas corrientes son independientes: nadie debe "sentir la tentación" durante la implementación de encadenar el pago al endosatario con una baja de deuda del cliente original.

## Goals / Non-Goals

**Goals:**

- Que el jefe pueda registrar en el sistema que un cheque ya endosado rebotó, hoy imposible.
- Que ese registro genere los dos movimientos de cuenta corriente correctos —deuda al cliente original, saldo a favor al endosatario— de forma atómica: o los dos o ninguno.
- Que el cheque persista a quién fue endosado, como relación al cliente, para que la reversa sea posible y auditable.
- Que el resto de la inmutabilidad contable del cheque siga intacta: `ENTREGADO → RECHAZADO` es la única puerta que se abre.
- Que el rastro del endoso sobreviva al rechazo, en lugar de borrarse como haría el código actual.
- Que la confirmación en pantalla nombre a las dos personas afectadas y el monto, antes de ejecutar.

**Non-Goals:**

- **No se construye ningún registro de "cheque cubierto por el jefe".** Descartado explícitamente por el usuario. El pago al endosatario se hace con el ajuste de saldo existente.
- **No se toca el flujo de ajuste manual de saldo** (`ClienteServiceImpl.ajustarSaldo`) ni el de pagos de venta (`VentaServiceImpl.registrarPago`).
- No se agrega un libro de movimientos ni historial itemizado de cuenta corriente. `CuentaCorrienteDinero` sigue siendo un balance acumulado. Es una carencia real del modelo (ver Riesgos) pero excede este change.
- No se permite deshacer un rechazo. `RECHAZADO` sigue siendo terminal e inmutable.
- No se permiten otras transiciones desde `ENTREGADO` (por ejemplo `ENTREGADO → COBRADO`, o cambiar el destinatario de un endoso ya hecho).
- No se hace backfill automático de `endosado_a_cliente_id` para los cheques ya `ENTREGADO` (ver Open Question 1).
- No se toca la autorización: `PUT /api/cheques/{id}` sigue detrás de `LEER_FINANZAS`, igual que hoy.

## Decisions

### Decisión 1 — Persistir el endosatario como relación `@ManyToOne` a `Cliente`

Se agrega a `Cheque.java`:

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "endosado_a_cliente_id")
private Cliente endosadoACliente;
```

Mismo estilo que las tres relaciones que la entidad ya tiene (`cliente`, `venta`, `unidadNegocio`): `FetchType.LAZY` y `@JoinColumn` explícito. Nullable, porque el endoso a un tercero de texto libre y los cheques nunca endosados no tienen endosatario.

`entregadoA` **se mantiene** y no se deprecia. Los dos campos coexisten con roles distintos y ambos son necesarios:

| Campo | Rol | Cuándo se llena |
|---|---|---|
| `entregadoA` (String) | Nombre para mostrar. Único dato disponible cuando el endoso es a un proveedor o tercero que no es cliente del sistema | Siempre que hay endoso |
| `endosadoACliente` (relación) | Identidad contable. Es a quién se le revierte el saldo | Sólo cuando el endoso es a un cliente del sistema |

Se descartó reemplazar `entregadoA` por la relación: eliminaría la posibilidad de endosar a un proveedor, que es el caso por defecto del modal (`tipoEndoso = 'TERCERO'` es el valor inicial) y probablemente el más frecuente. Se descartó también resolver el endosatario buscando por nombre en `entregadoA` al momento del rechazo: es texto libre de 150 caracteres, admite homónimos, no distingue clientes de proveedores, y hacer *matching* difuso para decidir a qué cuenta corriente se le acredita dinero es inaceptable en este dominio.

Sobre el esquema: el proyecto corre con `spring.jpa.hibernate.ddl-auto=update` (`backend/src/main/resources/application.properties`). Hibernate agrega la columna `endosado_a_cliente_id` y su FK sola al arrancar. No hay migración manual ni script. La columna nace en `NULL` para todas las filas existentes, que es semánticamente correcto: de esos cheques efectivamente no sabemos el endosatario como entidad.

### Decisión 2 — El guard pasa de "estado bloqueado" a "transición permitida"

El guard actual bloquea por estado de origen, sin mirar el destino. Se reemplaza por una regla que evalúa el par (origen, destino), que es lo que realmente se quiere expresar. La matriz completa resultante:

| Estado actual | Transición a `EN_CARTERA` | a `COBRADO` | a `ENTREGADO` | a `RECHAZADO` |
|---|---|---|---|---|
| `EN_CARTERA` | permitida (sin efecto) | permitida | permitida | permitida |
| `COBRADO` | **bloqueada** | **bloqueada** | **bloqueada** | **bloqueada** |
| `ENTREGADO` | **bloqueada** | **bloqueada** | **bloqueada** | **PERMITIDA — lo único que cambia** |
| `RECHAZADO` | **bloqueada** | **bloqueada** | **bloqueada** | **bloqueada** |

Es decir: la fila `ENTREGADO` abre **una sola** celda. Todo lo demás queda exactamente como está hoy, incluida la inmutabilidad total de `COBRADO` y `RECHAZADO`.

La forma concreta es un guard temprano que preserva el mensaje de error actual y agrega la excepción:

```
esRechazoDeChequeEndosado = (estadoActual == ENTREGADO && estadoNuevo == RECHAZADO)

si estadoActual ∈ {RECHAZADO, ENTREGADO, COBRADO} y NO esRechazoDeChequeEndosado
    → lanzar la misma excepción de hoy
```

Se prefiere esta forma sobre reescribir el guard como una tabla de transiciones completa. La tabla sería más elegante y probablemente sea lo correcto a futuro, pero cambiaría el comportamiento de **todas** las celdas a la vez en un método que mueve dinero, cuando el pedido abarca una sola. En un dominio crítico, el cambio mínimo verificable gana sobre el refactor. Queda anotado como candidato para un change propio.

También se descartó exponer una operación separada (`POST /api/cheques/{id}/rebote`) en vez de tocar el guard. Sería más explícita y auditable, pero duplicaría la resolución de cliente, cuenta corriente y persistencia del estado en un segundo lugar, y el frontend ya tiene un único punto de cambio de estado (`ChequeEstadoModal`) que habría que bifurcar. Se prefirió una sola puerta.

### Decisión 3 — Orden exacto de las dos operaciones, y por qué van en la misma transacción

`actualizarEstado` ya es `@Transactional`. Las dos operaciones de cuenta corriente ocurren **dentro de esa misma transacción**, sin ningún `@Transactional(propagation = REQUIRES_NEW)`, sin ningún `flush` intermedio y sin ninguna llamada a un servicio externo entre medio.

La razón no es de rendimiento. Si la segunda operación falla —el endosatario fue borrado, la FK no resuelve, salta una `OptimisticLockException`— y la primera ya se hubiera confirmado por separado, el sistema quedaría en el peor estado posible: **el cliente original con la deuda aumentada y el endosatario sin su saldo restituido**, es decir, con el vivero cobrando dos veces el mismo rebote. Ese estado no dispara ninguna alarma, no queda registrado en ningún lado, y sólo se descubre cuando alguien reclama. En la misma transacción, cualquier fallo hace *rollback* de las dos patas y del estado del cheque, y el cheque sigue `ENTREGADO`: el usuario reintenta y no pasó nada.

Orden concreto de la secuencia dentro del método, para el caso `ENTREGADO → RECHAZADO`:

1. **Cargar el cheque** y determinar `estadoActual` y `estadoNuevo`.
2. **Evaluar el guard** de la Decisión 2. Si no aplica la excepción, cortar acá y no tocar ninguna cuenta.
3. **Resolver las dos contrapartes antes de mover un solo peso**: `cheque.getCliente()` y `cheque.getEndosadoACliente()`. Si alguna resolución tiene que fallar, que falle acá, con el balance de las dos cuentas todavía intacto. Es el principio de *fail before you touch*.
4. **Pata 1 — cliente original**: `agregarDeuda(cheque.getMonto())`. El cliente que dio el cheque vuelve a deber ese dinero. (Esta pata **ya existe** en el código: es la rama de rechazo del paso 2 del flujo actual, que para `esEmisionPropia = false` hace exactamente esto. No se reescribe, se reutiliza.)
5. **Pata 2 — endosatario**: `agregarSaldoAFavor(cheque.getMonto())`. Se deshace el `agregarDeuda` que se le había hecho al endosarle el cheque; el vivero vuelve a deberle esa plata. **Esta pata es lo único verdaderamente nuevo en materia de dinero.**
6. **Persistir** el estado `RECHAZADO` del cheque, preservando `entregadoA`, `fechaEntrega` y `endosadoACliente` (Decisión 4).

El orden 4→5 no tiene efecto aritmético: son cuentas distintas y la transacción es atómica, así que el resultado final es idéntico invirtiéndolas. Se fija de todos modos para que el código sea legible en el mismo orden en que el usuario describió el caso ("el primer cliente que me lo dió me debe ese dinero **y** ese dinero yo se lo debo al que lo endosé"), y para que cualquier lectura futura del método siga la misma narrativa que este documento.

Sobre `esEmisionPropia`: la pata 1 reutiliza la rama existente, que ramifica por ese flag. Como un cheque de emisión propia nunca llega a `ENTREGADO` (hecho (c) del Context), en la práctica siempre se toma `agregarDeuda`. No se agrega un `if` que lo asuma: se deja que la rama existente decida, y se agrega la verificación explícita en las tareas de que ningún cheque `ENTREGADO` tenga `esEmisionPropia = true` en la base real.

Sobre idempotencia y doble clic: no hace falta protección extra. Después del primer rechazo el cheque queda en `RECHAZADO`, y el guard de la Decisión 2 mantiene ese estado totalmente bloqueado — un segundo `PUT` con el mismo cuerpo rebota con la excepción de siempre y no mueve ninguna cuenta. La condición existente `nuevoEstado == RECHAZADO && cheque.getEstado() != RECHAZADO` refuerza lo mismo.

### Decisión 4 — La transición a `RECHAZADO` preserva los datos del endoso

La rama `else` actual (`cheque.setFechaEntrega(null); cheque.setEntregadoA(null);`) deja de aplicarse cuando el estado de origen es `ENTREGADO`. Los tres campos —`entregadoA`, `fechaEntrega` y `endosadoACliente`— sobreviven al rechazo.

Es una decisión de diseño, no un detalle: sin esos datos, un cheque rebotado que fue endosado es indistinguible de uno que nunca salió de la cartera. El jefe necesita ver en pantalla a quién le había pasado ese cheque, porque es exactamente la persona a la que le va a tener que pagar. Borrarlo convertiría el registro del rebote en un dato inútil.

La rama `else` **se mantiene para el resto de los casos**, donde sí tiene sentido: si un cheque vuelve de `ENTREGADO` a otro estado... lo cual el guard ya no permite. En la práctica la rama sólo actúa en transiciones desde `EN_CARTERA`, donde los campos ya están vacíos y limpiarlos no cambia nada. Se acota la condición en vez de eliminarla, para no ampliar el alcance del cambio.

### Decisión 5 — `ChequeDTO` expone el endosatario de salida, y el frontend lo usa para nombrarlo

`ChequeDTO` ya tiene `endosadoAClienteId`, pero hoy `toDTO()` no lo llena: es un campo de entrada solamente. Pasa a llenarse desde la relación nueva, junto con un campo nuevo `endosadoAClienteNombre`.

El motivo es la confirmación en pantalla. `ChequeEstadoModal` ya usa `useUIStore.askConfirm` para todas las transiciones sensibles, con textos que hoy dicen genéricamente "revertirá los saldos en la cuenta corriente del cliente". Para el rebote de un cheque endosado eso es insuficiente: hay dos clientes y los movimientos van en direcciones opuestas. La confirmación debe decir, con nombre y monto, que a *fulano* se le aumenta la deuda y que a *mengano* se le acredita a favor. Para eso el frontend necesita el nombre del endosatario, y el único lugar de donde puede salir es el DTO.

`toDTO()` debe leer la relación con el mismo criterio defensivo que ya usa para `cliente` y `venta`: envueltos en `try/catch (EntityNotFoundException)`, porque las entidades son *soft-deleted* (`@SQLRestriction("deleted = false")`) y una referencia *lazy* a un cliente borrado explota al desreferenciarla. El patrón ya está en el archivo y se replica.

**No se agrega ningún endpoint nuevo.** `PUT /api/cheques/{id}` sigue siendo la única puerta y sigue exigiendo `LEER_FINANZAS`.

### Decisión 6 — El frontend gana un indicador propio, sin tocar `editable`

`frontend/src/utils/chequeDisplay.js` expone hoy:

```js
const editable = !['RECHAZADO', 'ENTREGADO', 'COBRADO'].includes(estado);
```

Ese flag lo consumen `Cheques.jsx` (dos veces: tarjeta mobile y fila desktop) y `Finanzas.jsx` (tabla de cheques en cartera) para decidir si dibujan el botón de acción. Cambiar su definición para incluir `ENTREGADO` haría que un cheque entregado vuelva a ofrecer el menú completo de estados en los tres lugares, que es justo lo que no se quiere.

Se agrega en cambio un indicador separado, `rechazable`, verdadero cuando el estado es `EN_CARTERA` o `ENTREGADO`. `editable` **no cambia de definición** y sus tres usos actuales siguen comportándose igual. Las vistas pasan a dibujar el botón cuando `editable || rechazable`, y el modal usa el estado real del cheque para decidir qué ofrecer:

| Estado del cheque | Qué ofrece el selector del modal |
|---|---|
| `EN_CARTERA` | Las cuatro opciones de hoy, sin cambios |
| `ENTREGADO` | Únicamente `RECHAZADO`, con el resto deshabilitado y un texto que explica que el cheque está endosado |
| `COBRADO`, `RECHAZADO` | No se llega: el botón no se dibuja |

Se descartó la alternativa de un botón separado "Marcar rebotado" fuera del modal: duplicaría el disparo de la mutación y la confirmación en tres archivos distintos, y `ChequeEstadoModal` ya es el único lugar del frontend que cambia estados de cheque. La regla se concentra donde ya vive.

El texto de confirmación para este caso reemplaza al genérico de "Reversa Contable" y debe incluir, explícitamente: el nombre del cliente original y que se le **aumenta la deuda**; el nombre del endosatario y que se le **acredita saldo a favor**; el monto; y que la acción no se puede deshacer. Si el cheque fue endosado a un tercero de texto libre (sin `endosadoAClienteId`), el texto menciona una sola cuenta afectada y aclara que el destinatario no es un cliente del sistema.

### Decisión 7 — Endoso a un tercero de texto libre: una sola pata, sin error

Cuando el endoso fue a un proveedor o tercero (`tipoEndoso = 'TERCERO'` en el modal, sin `endosadoAClienteId`), no hay cuenta corriente que restituir: el sistema nunca le movió el saldo a nadie al endosar. El rechazo en ese caso ejecuta **sólo la pata 1** —aumentar la deuda del cliente original— y no falla.

Es el comportamiento correcto y además es simétrico: el endoso a un tercero no movió ninguna cuenta, así que su reversa tampoco tiene por qué mover ninguna. El cheque queda `RECHAZADO`, con `entregadoA` conservado como referencia de a quién se le había dado.

## Riesgos / Trade-offs

- **Error de signo en cualquiera de las dos patas** → Es el riesgo dominante y el que justifica la gobernanza CRÍTICA. Invertir `agregarDeuda` y `agregarSaldoAFavor` produce un error del **doble** del monto en cada cuenta y en la dirección contraria, sin excepción ni log. Mitigación: la Decisión 3 fija el signo de cada pata por escrito, cada pata tiene su propio escenario en la spec, hay checkpoint obligatorio con el usuario antes de escribir el código, y hay una tarea de verificación que anota los dos balances **antes** y **después** en la base real y comprueba el delta exacto (`−monto` en el original, `+monto` en el endosatario).

- **`CuentaCorrienteDinero` no tiene libro de movimientos** → Guarda sólo `balancePesos` acumulado. Si una reversa sale mal, no hay registro contra el cual reconciliar ni forma de revertirla salvo un ajuste manual calculado a mano. Es una carencia preexistente del modelo (ya señalada en la capability `ajustes-cuenta-cte`: "el ajuste manual no aparece como un movimiento individual"), no introducida por este change, pero eleva el costo de cada error. Mitigación: no hay una técnica dentro de este alcance. Se compensa con la verificación previa/posterior de balances y se anota como argumento para un change futuro de historial de cuenta corriente.

- **Los cheques ya `ENTREGADO` no tienen endosatario persistido** → Toda la cartera actual queda con `endosado_a_cliente_id` en `NULL`. Si uno de esos cheques rebota, la pata 2 no tiene destino. Mitigación: depende de la resolución de la Open Question 1; en cualquiera de las opciones el sistema debe comportarse de forma explícita y visible, nunca aplicar sólo la pata 1 en silencio dejando al endosatario sin restituir.

- **Relajar el guard puede relajarse de más durante la implementación** → El guard es una sola condición booleana y es fácil que quede admitiendo más de lo previsto (por ejemplo, cualquier transición desde `ENTREGADO`, o el rechazo de un cheque `COBRADO`). Mitigación: la matriz de la Decisión 2 es normativa, hay un escenario de spec por cada celda que debe seguir bloqueada, y hay una tarea de verificación que recorre la matriz completa contra la base real.

- **La preservación de los datos del endoso se olvida y la rama `else` los borra** → Es el bug latente (b) del Context. Silencioso: el rechazo funciona, los saldos quedan bien, y el usuario simplemente no ve a quién le había endosado el cheque. Mitigación: escenario dedicado en la spec y verificación explícita del contenido de las tres columnas en la base después de un rechazo real.

- **`entregadoA` y `endosadoACliente` pueden divergir** → Son dos representaciones del mismo hecho y nada garantiza que el nombre en texto siga coincidiendo con el nombre del cliente relacionado (por ejemplo si el cliente cambia de razón social). Mitigación: la relación es la fuente de verdad para todo lo contable; `entregadoA` es sólo presentación y sólo se usa como tal cuando no hay relación.

- **Cambiar el flag del frontend puede afectar pantallas no relacionadas** → `describirEstadoCheque` la consumen `Cheques.jsx` y `Finanzas.jsx`. Mitigación: la Decisión 6 **no modifica** `editable`; agrega un campo nuevo. Los usos existentes son compatibles hacia atrás. Igualmente hay tarea de recorrer las tres vistas con cheques en los cuatro estados.

## Migration Plan

No hay migración de datos ni script SQL manual.

1. **Antes de implementar** — inspeccionar la base real y registrar como línea de base: cuántos cheques hay en estado `ENTREGADO`, cuántos de ellos tienen un `entregadoA` que coincide con el nombre de un cliente existente (candidatos a la Open Question 1), y confirmar que ninguno tiene `esEmisionPropia = true`.
2. **Resolver la Open Question 1 con el usuario.** Bloquea el grupo de tareas del backend.
3. **Desplegar backend y frontend juntos.** Al arrancar, Hibernate agrega `endosado_a_cliente_id` a `cheques` con `ddl-auto=update`. El backend solo ya habilita la transición vía API; el frontend solo apuntaría a un campo de DTO inexistente.
4. **Verificar el camino que no cambió primero**: endosar un cheque nuevo a un cliente y confirmar que la cuenta del endosatario se mueve igual que antes y que ahora además queda persistida la relación.
5. **Verificar el camino nuevo con montos de prueba**, anotando los dos balances antes y después: rebotar ese cheque endosado y comprobar el delta exacto en las dos cuentas.
6. **Verificar el caso de tercero de texto libre**: endosar a un proveedor y rebotar; sólo se mueve la cuenta del cliente original.
7. **Recorrer la matriz de la Decisión 2** confirmando que todas las celdas bloqueadas siguen bloqueadas.
8. **Verificar el flujo completo del pedido del usuario de punta a punta**: rebote → el jefe le paga al endosatario con un ajuste de saldo negativo → confirmar que el endosatario vuelve a cero y que **la deuda del cliente original no se movió**.

**Rollback:** revertir el código. La columna `endosado_a_cliente_id` queda huérfana en la tabla, sin efecto — `ddl-auto=update` no borra columnas. Los movimientos de cuenta corriente que se hayan ejecutado **no se revierten solos**: `balancePesos` es acumulado y no hay libro de movimientos, así que cada rebote registrado antes del rollback tendría que deshacerse a mano con dos ajustes de saldo de signo contrario. Es una razón más para verificar en la base con montos de prueba antes de operar en serio.

## Open Questions

1. **¿Qué hacer al rebotar un cheque `ENTREGADO` que no tiene endosatario persistido?** Es el caso de toda la cartera actual: la columna nace en `NULL`. Tres opciones:
   - *(a)* Bloquear el rechazo con un mensaje claro. Seguro pero deja al usuario sin registrar un caso real.
   - *(b)* Permitirlo aplicando sólo la pata 1, con una advertencia visible. Registra el hecho pero deja al endosatario sin restituir, que es justo la mitad del problema que el change viene a resolver.
   - *(c)* **Recomendada:** permitirlo, y cuando el cheque está `ENTREGADO` sin `endosadoACliente` pero **sí** con `entregadoA`, que el modal pida seleccionar al endosatario en ese momento —con el mismo buscador de clientes que ya usa para endosar—, ofreciendo además la opción explícita "fue un tercero, no un cliente" que cae en el comportamiento de la Decisión 7. Cubre la cartera existente sin adivinar nada y sin *matching* por nombre.
   La opción elegida cambia el alcance del frontend y una tarea del backend. **Requiere confirmación del usuario antes de implementar el grupo de tareas de la lógica de rechazo.**

2. **¿El endoso a un cliente debería seguir copiando el nombre a `entregadoA`?** Hoy lo hace (`cheque.setEntregadoA(cliente.getNombreRazonSocial())`) y por eso el nombre aparece en las listas. Con la relación persistida el nombre podría derivarse siempre de ella, evitando la divergencia del riesgo correspondiente. Recomendación: **mantener la copia** en este change —quitarla cambiaría lo que muestran listas que no están en alcance— y anotar la unificación como limpieza posterior. No bloquea.

3. **¿Debería el cheque rebotado quedar visible en algún tablero de "rebotes pendientes de cobrar"?** El usuario describió que a veces el jefe paga y el cliente original nunca le paga, lo cual sugiere que querría verlos juntos. Fuera de alcance acá: se resuelve mirando la cuenta corriente del cliente, y una vista propia es un change de finanzas. No bloquea.

4. **¿Hace falta registrar la fecha del rebote?** El cheque no tiene un campo de fecha de rechazo; hoy sólo cambia el estado. Con `fechaCobro` y `fechaEntrega` disponibles alcanza para ubicarlo aproximadamente. Recomendación: no agregarlo en este change, para no ampliar el modelo más allá de lo necesario. Anotado por si el usuario lo pide. No bloquea.
