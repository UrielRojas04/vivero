## Why

Actualmente el sistema registra ventas y pagos sueltos y un único saldo de cuenta corriente por cliente. El negocio requiere agrupar estas transacciones en un documento ("Factura" o Ciclo de Facturación) que permita consolidar varias compras de siembras/plantas, sumar conceptos adicionales (fletes, recargos) y registrar los pagos a cuenta. Esto le da al jefe trazabilidad exacta de qué ventas y pagos corresponden a qué ciclo de cobro, pudiendo cerrar la factura cuando el cliente la salda por completo, y abriendo un ciclo nuevo limpio. Este flujo aplica SOLO para la unidad de negocio Vivero.

## What Changes

- **Nueva Entidad Factura:** Creación de un modelo que representa un ciclo de facturación. Todo cliente (de Vivero) tendrá siempre una "Factura Abierta".
- **Asignación Automática:** Las nuevas ventas de Vivero (`UnidadNegocio == 1`) y los pagos registrados se asocian automáticamente a la factura abierta del cliente.
- **Conceptos Libres:** Se agrega la posibilidad de ingresar conceptos manuales (en dinero) a la factura abierta que suman al total pero no alteran el stock físico.
- **Cierre de Factura:** Funcionalidad para "Cerrar" la factura. Una factura cerrada queda congelada (solo lectura) como registro histórico.
- **UI de Facturas:** Nueva pantalla/sección dedicada donde el jefe puede ver el estado de facturación de sus clientes, registrar pagos directos a la factura e imprimir el resumen de cuenta.

## Capabilities

### New Capabilities
- `facturacion-ciclos`: Gestión del ciclo de vida de la cuenta corriente agrupada por facturas. Apertura, asignación de comprobantes, carga de conceptos libres, y cierre (congelamiento) de la factura.

### Modified Capabilities
- `us-013-ventas-core`: Las ventas de Vivero ahora deben buscar la factura abierta del cliente y asociarse a ella en el momento de la confirmación.

## Impact

**Backend (`com.vivero.gestion`):**
- Nuevas entidades: `FacturaCliente` y `FacturaConcepto` (para los ítems libres).
- Modificación en `VentaServiceImpl` para enlazar la venta a la `FacturaCliente` activa.
- Nuevos endpoints para listar facturas, cerrarlas, y agregar conceptos libres.

**Frontend (`frontend/src/`):**
- Nueva página/sección `FacturasCliente.jsx` o similar.
- Componentes para agregar pagos y conceptos a la factura activa.
- Modificación visual para renderizar facturas cerradas (históricas) vs la factura actual abierta.
