## 1. Backend: Nueva Entidad y CRUD Marca

- [x] 1.1 Crear entidad `Marca` (`id`, `nombre`, `deleted`, `UnidadNegocio unidadNegocio`).
- [x] 1.2 Crear `MarcaDTO`.
- [x] 1.3 Crear `MarcaRepository`, `MarcaService`, `MarcaServiceImpl` y `MarcaController` con operaciones CRUD básicas (GET, POST, PUT, DELETE lógico).

## 2. Backend: Actualización de Producto

- [x] 2.1 En `Producto.java`, reemplazar `private String marca;` por `@ManyToOne @JoinColumn(name = "marca_id") private Marca marca;`.
- [x] 2.2 En `ProductoDTO.java`, reemplazar `String marca` por `Long marcaId` y `String marcaNombre`.
- [x] 2.3 En `ProductoServiceImpl`, actualizar el mapeo para asignar la instancia de Marca correcta buscando por `marcaId` en la base de datos (y mapear de vuelta a `marcaNombre` al DTO).

## 3. Frontend: Configuración de Marcas

- [x] 3.1 Crear `marcas.api.js` para consumir los endpoints de `/api/marcas`.
- [x] 3.2 Modificar `Configuracion.jsx` para agregar una sección de "Marcas" (solo visible si `unidadNegocioActiva === '2'`), permitiendo crear, editar y eliminar marcas.

## 4. Frontend: Actualización Formulario Producto

- [x] 4.1 Modificar `ProductoForm.jsx` para hacer un fetching de las marcas disponibles (usando react-query).
- [x] 4.2 Reemplazar el input de texto de "Marca" por un `<select>` que cargue las opciones de la BD, enviando el `marcaId`.

## 5. Frontend: Actualización Listado Stock

- [x] 5.1 En `Productos.jsx`, actualizar la lógica de filtrado para usar `producto.marcaId` o `producto.marcaNombre`.
- [x] 5.2 Asegurar que los tabs superiores sigan mostrando las marcas de los productos actuales correctamente, sin repetirse, usando `marcaNombre`.
