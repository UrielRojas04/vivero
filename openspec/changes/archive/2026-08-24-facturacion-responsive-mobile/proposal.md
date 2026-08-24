## Why

Actualmente, la interfaz de Facturación (tanto el listado `FacturasPage` como el detalle `FacturaClientePage`) presenta problemas de visualización en dispositivos móviles. Los usuarios reportan que algunos componentes quedan cortados, hay desbordes horizontales no controlados en las tablas y los botones no se ajustan correctamente a resoluciones menores. Se requiere mejorar la experiencia de uso en celulares dado que gran parte del trabajo operativo se realiza desde el teléfono.

## What Changes

- Adaptar `FacturasPage` para mostrar tarjetas en formato apilado o con scroll horizontal óptimo en móvil.
- Modificar el layout de `FacturaClientePage` para que los resúmenes financieros (tarjetas superiores) fluyan hacia abajo o en un grid de dos columnas según el ancho.
- Mejorar el modo móvil de las tablas (Ventas, Pagos y Conceptos), usando scroll interno o cambiando a vista de cards si aplica.
- Ajustar márgenes, tamaños de texto y espaciado de los botones flotantes de acción en toda la sección.

## Capabilities

### New Capabilities

### Modified Capabilities
- `facturacion-cliente`: Adaptar los requisitos de UI para que sean compatibles con pantallas móviles de forma fluida y sin cortes.
- `ui-responsive`: Aplicar lineamientos generales de adaptabilidad móvil a la nueva sección de Facturas.

## Impact

- `frontend/src/pages/Facturas.jsx`
- `frontend/src/pages/FacturaCliente.jsx`
- Componentes y modales asociados a la Facturación.
- Backend intacto (100% UI).
