## 1. Actualización de Layout

- [x] 1.1 Modificar `src/App.jsx` para incluir la ruta `/insumos` mapeada al componente `Insumos`.

## 2. Componente de Formulario (InsumoForm)

- [x] 2.1 Crear `src/components/InsumoForm.jsx` basándose en el diseño de `ProductoForm.jsx` (modal, glassmorphism, responsive).
- [x] 2.2 Configurar el estado interno del formulario (nombre, descripcion, precio, stock) y las validaciones correspondientes.
- [x] 2.3 Asegurar que el diseño del modal en mobile ocupe el mayor ancho posible y que los inputs sean touch-friendly.

## 3. Página de Insumos (Listado)

- [x] 3.1 Crear `src/pages/Insumos.jsx` para el listado principal, implementando `useState` (insumos, loading, error, modal state) y `useEffect` para el fetch inicial a `/api/insumos`.
- [x] 3.2 Implementar el diseño responsive del listado: usar diseño de tabla en desktop y adaptar a diseño de tarjetas (o lista compacta) en mobile para facilitar la lectura sin scroll horizontal.
- [x] 3.3 Agregar el buscador y los botones de acción principal en el header.
- [x] 3.4 Conectar el componente `InsumoForm` para creación y edición, enviando peticiones `POST` y `PUT` a la API de insumos.
- [x] 3.5 Implementar funcionalidad de eliminación con mensaje de confirmación previo.

## 4. Verificación y Testing

- [x] 4.1 Levantar la app con Docker Compose y verificar en `http://localhost:5173/insumos`.
- [x] 4.2 Probar el CRUD completo creando, editando y eliminando un insumo.
- [x] 4.3 Redimensionar la pantalla a resoluciones móviles y comprobar que la tabla/tarjetas y el modal se vean de manera óptima (responsive).
