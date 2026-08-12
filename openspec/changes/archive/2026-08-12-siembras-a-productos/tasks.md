## 1. Backend: Modelos y Base de Datos
- [x] 1.1 Agregar campos `lote` y `dueno` a la entidad `Producto` y su DTO.
- [x] 1.2 Agregar estado `EN_STOCK` al enum de la entidad `Siembra`.
- [x] 1.3 Reiniciar/compilar backend para aplicar DDL-AUTO.

## 2. Backend: Lógica de Siembras
- [x] 2.1 Crear `PasarStockRequestDTO` (precioVenta, stock).
- [x] 2.2 En `SiembraService`, implementar `pasarAStock(id, request)`: validar estado, crear Producto con lote y dueño, guardar producto, y marcar siembra como `EN_STOCK`.
- [x] 2.3 Exponer el endpoint `POST /api/siembras/{id}/pasar-a-stock` en `SiembraController`.
- [x] 2.4 Exponer endpoint `GET /api/siembras/alertas` que retorne DTOs ligeros con siembras por vencer o listas.

## 3. Frontend: Productos
- [x] 3.1 Actualizar `Productos.jsx` para mostrar Lote y Dueño en la grilla/tarjetas.
- [x] 3.2 Actualizar `ProductoForm.jsx` con campos opcionales para Lote y Dueño (por si cargan manual).

## 4. Frontend: UI de Siembras
- [x] 4.1 En `Siembras.jsx`, calcular y renderizar la barra de progreso usando `fechaEstimada`.
- [x] 4.2 Crear componente `PaseStockModal.jsx` para solicitar stock y precio.
- [x] 4.3 Integrar el botón "Pasar a Stock" en las acciones de la tabla, invocando a la API y refrescando la vista.

## 5. Frontend: Notificaciones
- [x] 5.1 En `DashboardLayout.jsx`, agregar un ícono de Campana (Bell) con un badge contador.
- [x] 5.2 Al montar el Layout, invocar `siembrasApi.getAlertas()` y mantener el estado de alertas.
- [x] 5.3 Mostrar un dropdown o modal pequeño al clickear la campana con el listado de siembras listas o próximas a vencer (mostrando Lote y Días restantes).
