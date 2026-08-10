## 1. Modelo de Dominio

- [x] 1.1 Crear entidad `Insumo` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `ManyToOne unidadNegocio`).
- [x] 1.2 Crear interfaz `InsumoRepository` extendiendo `JpaRepository`.

## 2. DTOs y Servicios

- [x] 2.1 Crear `InsumoDTO` (para request y response).
- [x] 2.2 Crear interfaz `InsumoService` y su implementación `InsumoServiceImpl` con métodos CRUD, mapeando la entidad a DTO y asegurando que se establezca la `UnidadNegocio`.

## 3. Seguridad y Controladores

- [x] 3.1 Crear un `CustomPermissionEvaluator` o método auxiliar en la capa de seguridad que exponga una forma sencilla de validar autoridades combinadas con el ID de Unidad de Negocio, por ejemplo `hasUnidadPermission(#dto.unidadNegocioId, 'ESCRIBIR_STOCK')`.
- [x] 3.2 Modificar `SecurityConfig` para registrar el `CustomPermissionEvaluator` si corresponde (creamos el SecurityService como Bean).
- [x] 3.3 Crear `InsumoController` con endpoints REST mapeados (GET, POST, PUT, DELETE).
- [x] 3.4 Proteger los endpoints usando el validador dinámico según la `unidadNegocioId` del payload o del objeto existente.

## 4. Verificación

- [x] 4.1 Verificar compilación con `./mvnw clean compile`.
- [x] 4.2 Probar iniciar el backend.
