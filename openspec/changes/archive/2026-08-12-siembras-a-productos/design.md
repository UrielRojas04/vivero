# Design Document: Siembras a Productos

## 1. Arquitectura de Base de Datos
- **Entidad `Producto`**:
  - Agregar `lote` (String, nullable).
  - Agregar `dueno` (String, nullable).
  - Estos campos serán opcionales para permitir la convivencia con productos cargados manualmente.
- **Entidad `Siembra`**:
  - Actualizar el Enum de Estados. Agregar el estado `EN_STOCK` (o usar una flag, pero un estado es más limpio en la máquina de estados: `EN_PROCESO` -> `LISTA` -> `EN_STOCK`).

## 2. Lógica Backend
- **Nuevo Endpoint (`SiembraController`)**:
  - `POST /api/siembras/{id}/pasar-a-stock`
  - Body: `PasarStockRequestDTO` conteniendo `stock` (Integer) y `precioVenta` (BigDecimal).
  - Logica de Servicio (`SiembraServiceImpl`):
    1. Validar que la siembra esté en estado `LISTA`.
    2. Crear un nuevo `Producto` utilizando la `VariedadPlanta.nombre` como nombre del producto.
    3. Asignar el `precioVenta`, el `stock`, la `descripcion` (puede ser la descripción de la variedad o concatenar siembra), el `lote` y el `dueno` desde la siembra.
    4. Guardar el Producto en BD.
    5. Actualizar el estado de la Siembra a `EN_STOCK` y guardar.
- **Notificaciones (API)**:
  - En lugar de crear una tabla completa de notificaciones, podemos exponer un endpoint ligero `GET /api/siembras/alertas` que devuelva las siembras que están `EN_PROCESO` y cuya `fechaEstimada` es menor o igual a `Hoy + 5 días`, o siembras que están `LISTA`.

## 3. Arquitectura Frontend
- **Barra de Progreso (`Siembras.jsx`)**:
  - Para cada siembra `EN_PROCESO`, calcular el porcentaje transcurrido:
    `progress = (hoy - fechaSiembra) / (fechaEstimada - fechaSiembra) * 100`
  - Renderizar un `<progress>` nativo o un div de Tailwind superpuesto (ej. `w-[${progress}%]`) debajo de la información principal de la celda.
- **Botón "Pasar a Stock"**:
  - Habilitado solo si `estado === 'LISTA'`.
  - Abre un modal `PaseStockModal.jsx` pidiendo `Precio de Venta` y `Stock Inicial`.
  - Llama al endpoint de backend, cierra modal, pushea Toast de éxito, y refresca la lista.
- **Panel de Notificaciones**:
  - En `DashboardLayout.jsx` (header superior), agregar un ícono de campana `Bell`.
  - Un badge rojo mostrará la cantidad de alertas pendientes (Siembras listas o por vencer).
  - Al clickear, despliega un Popover con la lista de siembras que requieren atención.
- **Catálogo de Productos**:
  - Actualizar `Productos.jsx` y `ProductoForm.jsx` para mostrar e ingresar Lote y Dueño (opcionales).
