## 1. Listado de Facturas (FacturasPage)

- [x] 1.1 Modificar la tabla principal de `FacturasPage` para agregar un contenedor padre con `overflow-x-auto`.
- [x] 1.2 Revisar y ajustar los márgenes laterales (paddings) en pantallas pequeñas (`px-4` vs `px-8`) para maximizar el uso de pantalla.
- [x] 1.3 Adaptar los botones de acción superior (crear, buscar, filtrar) para que se apilen correctamente en resoluciones menores (usar `flex-wrap` o `flex-col` en móvil).

## 2. Detalle de Factura (FacturaClientePage)

- [x] 2.1 Ajustar las tarjetas de resumen financiero ("Total Ventas", "Saldo Deudor", etc.) de la cabecera para que colapsen de `grid-cols-4` a `grid-cols-2` o `grid-cols-1` en `md` y `sm`.
- [x] 2.2 Agregar `overflow-x-auto` en las tres tablas de detalles (Ventas, Pagos y Conceptos), garantizando que el diseño de cada tabla no se rompa horizontalmente.
- [x] 2.3 Refinar el contenedor principal de exportación, aislando las clases dinámicas de responsividad de aquellas que `html-to-image` usa para capturar los 1000px fijos.
- [x] 2.4 Corregir la disposición del botón flotante "Agregar Concepto" para que no se superponga con la tabla en modo móvil.
