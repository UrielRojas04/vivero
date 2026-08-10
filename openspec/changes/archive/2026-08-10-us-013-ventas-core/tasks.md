## 1. Backend: Modelos y Repositorios

- [x] 1.1 Crear entidad `Venta` y `VentaRepository`
- [x] 1.2 Crear entidad `VentaDetalle` y `VentaDetalleRepository`
- [x] 1.3 Crear entidad `MovimientoStock` y `MovimientoStockRepository`
- [x] 1.4 Configurar relaciones (OneToMany) en JPA

## 2. Backend: DTOs y Servicios

- [x] 2.1 Crear DTOs de Request y Response para Ventas
- [x] 2.2 Implementar lógica en `VentaService` (`@Transactional`) para asentar Venta y Detalle
- [x] 2.3 Incluir la generación automática de `MovimientoStock` y actualización de `stockActual` en Producto

## 3. Backend: Controladores

- [x] 3.1 Crear `VentaController` (POST `/api/ventas` y GET `/api/ventas`)
- [x] 3.2 Proteger endpoints con permisos `ESCRIBIR_VENTAS` y `LEER_VENTAS`

## 4. Frontend: Nueva Venta (POS)

- [x] 4.1 Crear store/servicio en `api/` para Ventas
- [x] 4.2 Crear página `NuevaVenta.jsx` (selección de cliente y productos, cálculo de totales)
- [x] 4.3 Integrar POST Venta y manejar estados/toasts al finalizar con éxito
- [x] 4.4 Crear página de historial de ventas (opcional, o listado básico) y agregar al menú lateral
