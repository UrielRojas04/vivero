## Context

El sistema actual tiene un modelo donde las `Ventas` y `Pagos` son entidades independientes asociadas a un `Cliente`, y el `Cliente` tiene un `balancePesos` global. El requerimiento de negocio es introducir un concepto de "Ciclo de Facturación" (Factura) **exclusivo para la Unidad de Negocio Vivero (ID 1)**, que agrupe las ventas, los pagos a cuenta y conceptos manuales, dándole al usuario la posibilidad de "cerrar" ese ciclo al cobrarlo y empezar uno nuevo.

## Goals / Non-Goals

**Goals:**
- Crear un contenedor lógico (`FacturaCliente`) para agrupar ventas, pagos y conceptos extra de un cliente en un período de tiempo.
- Asignar automáticamente cualquier venta nueva de Vivero a la Factura abierta del cliente.
- Permitir la carga de "Conceptos Libres" (flete, intereses) que sumen al total a pagar sin descontar stock.
- Permitir registrar pagos de dinero directamente contra la Factura.
- Mantener la integridad histórica congelando la factura al "Cerrarla".

**Non-Goals:**
- No se permite editar ítems (plantas) de ventas desde la vista de Factura. El stock no se toca desde acá.
- No se aplica este flujo a la Unidad de Negocio de Herramientas.
- No es una Factura Fiscal (AFIP). Es un comprobante interno.

## Decisions

### Decisión 1 — Modelo de Datos Principal
Se crearán las entidades:
- `FacturaCliente`: `id`, `clienteId`, `fechaApertura`, `fechaCierre` (nullable), `estado` (ABIERTA, CERRADA), `totalCalculado` (dinámico o consolidado).
- `FacturaConcepto`: `id`, `facturaId`, `descripcion`, `monto`, `fecha`. Para los fletes y recargos.
- `Venta` suma un nuevo campo nullable: `factura_id`.
- `Pago` suma un nuevo campo nullable: `factura_id`.

**Rationale:** Se eligió enlazar las transacciones físicas a una carpeta (`FacturaCliente`) en vez de crear una "mega-venta", para mantener intacto el sistema de stock actual.

### Decisión 2 — Ciclo de Vida Automático
Un cliente de Vivero siempre debe tener, a lo sumo, UNA factura `ABIERTA`.
- Al realizar una Venta, el `VentaServiceImpl` buscará si el cliente tiene una factura `ABIERTA`. Si la tiene, asocia la venta. Si no, crea una factura nueva automáticamente y la asocia.
- Al "Cerrar" la factura desde la UI (acción manual del jefe), el estado pasa a `CERRADA`. La próxima venta que haga el cliente disparará la creación de una nueva factura abierta.

### Decisión 3 — Manejo del Histórico
Las ventas existentes de Vivero (anteriores a este change) no tienen `factura_id`.
- **Alternativa 1:** Dejarlas huérfanas.
- **Alternativa 2:** Crear una migración (o hacerlo vía `DataInitializer`) que agrupe todas las ventas y pagos históricos de cada cliente en una única `FacturaCliente` inicial en estado `CERRADA`.
- **Selección:** **Alternativa 2**. Garantiza que el jefe pueda ver todo el historial de su cliente organizado bajo el nuevo formato de facturas desde el día 1.

## Risks / Trade-offs

- **[Riesgo de Divergencia de Saldos]** → Si se modifica el `balancePesos` manualmente (`ajustarSaldo`) por fuera de la factura, el total de las facturas no coincidirá con la cuenta corriente.
  *Mitigación:* Se declarará una "Diferencia no itemizada" en la cabecera del cliente, tal como se sugirió en el diseño archivado anterior.
- **[Riesgo de Ventas Concurrentes]** → Dos vendedores vendiendo a la vez al mismo cliente podrían intentar crear la factura abierta simultáneamente.
  *Mitigación:* Manejo transaccional en la capa Service con constraints de BD (`unique index` compuesto por `clienteId` y `estado='ABIERTA'`).
