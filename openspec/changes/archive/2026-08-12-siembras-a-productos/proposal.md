# Proposal: Siembras a Productos y Notificaciones

## 1. Description
Esta propuesta aborda una evolución conceptual clave en el módulo de Siembras: **una siembra y un producto son la misma entidad en diferentes estados**. Cuando una siembra madura y está lista, se "pasa a stock" convirtiéndose en un Producto vendible de forma independiente. Además, se mejora la experiencia de usuario agregando seguimiento visual (barras de progreso) y notificaciones de proximidad de entrega.

## 2. Motivation
- **Trazabilidad Continua**: Actualmente, el ciclo de vida de una siembra terminaba al marcarse como finalizada, y el stock de productos crecía desconectado. Al convertir la siembra directamente en un producto, arrastramos metadatos valiosos como el **Número de Lote** y el **Dueño** original de la siembra hacia el catálogo de ventas.
- **Ventas Personalizadas**: Al tener productos generados por lote y dueño, se pueden realizar ventas mucho más específicas (ej. "Te vendo el lote 45 de Juan").
- **Visibilidad y UX**: Los usuarios necesitan saber de un vistazo cuánto falta para que una siembra esté lista (barra de progreso) y recibir alertas (notificaciones) para las siembras que están a punto de completarse, evitando demoras en la logística.

## 3. Scope
- **UI de Siembras**:
  - Agregar barra de progreso visual calculada entre `fechaSiembra` y `fechaEstimada`.
  - Acción de "Pasar a Stock" para siembras en estado `LISTA`.
  - Formulario/Modal de "Pase a Stock" que solicite el `stock` final útil y el `precio` de venta.
- **Entidad Producto**:
  - Agregar campos `lote` (String) y `dueno` (String), ambos opcionales para soportar productos manuales.
  - Modificar UI de Productos para mostrar Lote y Dueño.
- **Notificaciones**:
  - Implementar un sistema de alertas en el frontend (ej. un ícono de campana en el header o un panel superior en la vista de siembras) que avise qué siembras están a N días de su fecha estimada o ya están listas pero no pasadas a stock.
