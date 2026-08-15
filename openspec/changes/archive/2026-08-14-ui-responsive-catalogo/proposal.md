## Why

Siguiendo el roadmap de adaptación a celulares, la Etapa 2 corresponde a los catálogos (Productos, Insumos, Siembras). Las tablas actuales son anchas y requieren hacer zoom out o scroll horizontal en pantallas pequeñas, lo que hace incómodo su uso. Los modales de ABM (Alta/Baja/Modificación) y búsqueda quedan apretados. Es necesario rediseñar las vistas de catálogo en una presentación que favorezca el uso en dispositivos móviles sin afectar el diseño en escritorio.

## What Changes

- Transformar las tablas de listado de `ProductoForm.jsx` y `InsumoForm.jsx` (o componentes asociados de vista) para que en anchos menores a `md` (768px) se visualicen de manera vertical, o asegurando que tengan un contenedor con desbordamiento (`overflow-x-auto`) elegante.
- Adaptar los modales de agregar/editar para que en mobile ocupen el 100% de la pantalla (`w-full h-full rounded-none`), eliminando márgenes innecesarios para ganar espacio de lectura y teclado.
- Modificar la botonera superior (buscador y botón "Nuevo") para que en móviles pasen a ocupar todo el ancho, apilándose verticalmente o utilizando botones flotantes (FAB) para acciones primarias.

## Capabilities

### Modified Capabilities
- `ui-responsive`: Extender las reglas de responsividad al nivel de página para los listados de catálogo y sus respectivos modales de ABM.

## Impact

- `frontend/src/pages/Productos.jsx` (o donde se listen los productos).
- `frontend/src/pages/Insumos.jsx`
- Modales base del frontend (si existen componentes compartidos) o componentes de formulario específicos (`ProductoForm.jsx`, `InsumoForm.jsx`).
