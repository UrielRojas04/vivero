## 1. Modelo de Dominio

- [x] 1.1 Crear entidad `Producto` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `ManyToOne unidadNegocio`).
- [x] 1.2 Crear interfaz `ProductoRepository` extendiendo `JpaRepository`.

## 2. DTOs y Servicios

- [x] 2.1 Crear `ProductoDTO` (para request y response).
- [x] 2.2 Crear interfaz `ProductoService` y su implementación `ProductoServiceImpl` con métodos para crear, obtener todos, obtener por ID, actualizar y eliminar.
- [x] 2.3 Implementar mapeo de Entidad a DTO y viceversa en el servicio.

## 3. Seguridad y Controladores

- [x] 3.1 Habilitar Method Security (`@EnableMethodSecurity`) en `SecurityConfig` si no está habilitado.
- [x] 3.2 Modificar `DataInitializer` para agregar permisos `ESCRIBIR_STOCK` y `LEER_STOCK` al Jefe (y potencialmente al empleado) si no existen.
- [x] 3.3 Crear `ProductoController` con endpoints REST mapeados (GET, POST, PUT, DELETE).
- [x] 3.4 Proteger los endpoints usando `@PreAuthorize("hasAuthority('VIVERO_ESCRIBIR_STOCK')")` para escrituras y `VIVERO_LEER_STOCK` para lecturas.

## 4. Verificación

- [x] 4.1 Verificar compilación con `./mvnw clean compile`.
- [x] 4.2 Probar iniciar el backend.
