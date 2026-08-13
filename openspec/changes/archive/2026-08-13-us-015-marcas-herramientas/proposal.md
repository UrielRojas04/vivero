## Why

Actualmente, el cliente maneja su inventario de herramientas dividido en planillas por marca (Shimura, Total, Ingco, etc.). Para replicar y mejorar esta organización en el sistema, es necesario gestionar la entidad "Marca" y asignarla a los productos. Hacerlo como una entidad relacional evita errores de tipeo e inconsistencias, permitiendo una gestión sólida y un filtrado exacto en la grilla de stock.

## What Changes

- Crear la entidad `Marca` gestionable desde "Configuración".
- Reemplazar el campo texto `marca` por una relación `marca_id` en la entidad `Producto`.
- Modificar los DTOs y el formulario de Producto (`ProductoForm.jsx`) para usar un selector (`<select>`) de marcas precargadas.
- En la vista de Stock (`Productos.jsx`), utilizar la información relacionada de la marca para renderizar los tabs de filtro de herramientas.

## Capabilities

### New Capabilities

- `gestion-marcas`: Nuevo CRUD para gestionar las entidades de tipo Marca, asignadas a las unidades de negocio correspondientes (usualmente Herramientas).

### Modified Capabilities

- `catalogo-productos`: Se modifica la relación del producto para que apunte a la entidad Marca en lugar de un string suelto.
- `frontend-productos`: Se adapta el formulario para fetchear marcas y seleccionarlas, y la tabla para usar el nombre de la marca relacionada.

## Impact

- **Backend:** `Producto.java`, `ProductoDTO.java`, nueva clase `Marca.java` y todo su stack de repositorio/servicio/controlador.
- **Frontend:** `ProductoForm.jsx`, `Productos.jsx`, `Configuracion.jsx`, nuevo `marcas.api.js`.
