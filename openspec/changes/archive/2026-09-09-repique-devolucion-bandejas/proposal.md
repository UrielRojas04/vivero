## Why

Actualmente el sistema permite la devolución de bandejas vacías (plásticos), pero no contempla el caso en el que un cliente devuelve bandejas llenas (plantines que le sobraron o que se repican). Esta falta obliga a hacer ajustes manuales tanto en el stock físico como en la cuenta corriente del cliente. Implementar esta funcionalidad permite reflejar la realidad del vivero: reingresar las bandejas sobrantes al stock disponible y descontar el costo/ganancia correspondiente al cliente de manera automática y trazable.

## What Changes

- Se agregará una opción para registrar la "Devolución de Bandejas Llenas" (Repique/Sobrante).
- Se registrará un movimiento de ingreso de stock por la cantidad de bandejas devueltas.
- Se generará un movimiento de crédito (o ajuste negativo de venta) en la cuenta corriente del cliente equivalente al valor de las bandejas devueltas.
- Se creará una interfaz específica (modal o pantalla) accesible desde el perfil del cliente o historial de ventas para registrar esta devolución.

## Capabilities

### New Capabilities
- `devolucion-repique-bandejas`: Gestión integral de la devolución de bandejas llenas por parte de los clientes, abarcando el reingreso al stock físico y la nota de crédito/ajuste monetario.

### Modified Capabilities
- `movimientos-stock`: Soporte para un nuevo concepto de movimiento de ingreso (ej. "DEVOLUCIÓN_SOBRANTE") con asociación al cliente.
- `backend-cuentas-ctes`: Capacidad para registrar notas de crédito o ajustes por devolución de productos (bandejas llenas), afectando el saldo del cliente.

## Impact

- **Frontend**: Nueva UI para la gestión de devoluciones de productos en la sección de Clientes/Ventas.
- **Backend/DB**: Nuevos tipos de movimientos en `MovimientoStock` y `MovimientoCuentaCorriente`.
- **Negocio**: Impactará directamente en el saldo de los clientes y en la disponibilidad de stock, corrigiendo el desfasaje actual.
