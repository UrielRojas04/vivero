## Context

Actualmente el vivero registra los cheques de forma manual en un cuaderno, lo que dificulta la trazabilidad y la integración con las ventas. El método de pago "CHEQUE" ya existe como enumerador/string en las ventas, pero no registra metadatos. Se requiere digitalizar este registro para integrarlo y facilitar su seguimiento (si fue cobrado, si está en cartera, si se entregó a un proveedor).

## Goals / Non-Goals

**Goals:**
- Crear la entidad `Cheque` con los campos necesarios (banco, monto, cliente, número serie, fechas, estado).
- Permitir cargar un cheque desde el modal de Venta cuando se selecciona CHEQUE como método de pago.
- Proveer un módulo (página frontend) de "Gestión de Cheques" para ver, editar y cambiar de estado los cheques (ej: de EN_CARTERA a ENTREGADO).

**Non-Goals:**
- No se creará una cuenta corriente bancaria automática para conciliaciones bancarias; el tracking es meramente del documento físico (el cheque).
- No se manejarán cheques electrónicos (echeqs) de forma diferente a los físicos por ahora.

## Decisions

### D1. Modelo de Datos: Entidad `Cheque`
- **Campos**: `id`, `fechaRecepcion` (LocalDate), `cliente` (ManyToOne, nullable), `venta` (ManyToOne, nullable), `numeroInterno` (String/Sequence), `monto` (BigDecimal), `banco` (String), `fechaCobro` (LocalDate), `numeroSerie` (String), `estado` (Enum: `EN_CARTERA`, `COBRADO`, `ENTREGADO`, `RECHAZADO`), `fechaEntrega` (LocalDate, nullable), `entregadoA` (String, nullable).
- **Razón**: Cubre todas las columnas del cuaderno manual provisto por el usuario. La vinculación a `Venta` y `Cliente` asegura trazabilidad del origen.

### D2. Integración con el Flujo de Ventas
- Al seleccionar "CHEQUE" en el frontend (`ModalPago`), si el monto ingresado en cheques es > 0, se desplegarán campos adicionales opcionales para capturar `banco`, `numeroSerie` y `fechaCobro`.
- **Razón**: Permite hacer el data entry al momento de la venta sin romper la UX rápida. Si el usuario no los carga, puede ir a la pantalla de Cheques y completarlo después.

### D3. Permisos
- La vista y gestión de cheques requerirá `ADMIN_DB` (o un permiso `LEER_CHEQUES`/`ESCRIBIR_CHEQUES` nuevo). Para este MVP y consistencia con Finanzas, usaremos `ADMIN_DB`.
- **Razón**: La gestión financiera recae en el dueño/administrador.

## Risks / Trade-offs

- **[R1] Cheques de múltiples ventas** → Un cliente podría pagar múltiples ventas con un solo cheque, o una venta con múltiples cheques. → **Mitigación**: `Venta` 1:N `Cheque` (un cheque pertenece a una venta en este modelo simple). Si un cheque cubre múltiples ventas, se puede cargar como un cheque suelto sin `venta_id` vinculado solo al `cliente`.
- **[R2] Ruptura de UX en ventas rápidas** → Pedir todos los datos del cheque en el mostrador puede lentificar la venta. → **Mitigación**: Hacer los campos del cheque opcionales en el modal de venta; solo el `monto` es estricto para cerrar el total.
