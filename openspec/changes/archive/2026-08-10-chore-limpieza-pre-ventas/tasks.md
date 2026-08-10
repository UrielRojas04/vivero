## 1. Eliminar UnidadNegocio (Backend Backend)

- [x] 1.1 Eliminar clase `UnidadNegocio` de `models` y `UnidadNegocioRepository`
- [x] 1.2 Remover campo `unidadNegocio` de `Insumo` y `Producto`, actualizar constructores/getters
- [x] 1.3 Remover referencias a `UnidadNegocio` en `InsumoDTO`, `ProductoDTO` y `UsuarioDTO`
- [x] 1.4 Remover referencias a `UnidadNegocio` en `InsumoServiceImpl` y `ProductoServiceImpl`
- [x] 1.5 Limpiar `SecurityService` (dead code) o purgar sus validaciones atadas a `unidadNegocio`

## 2. Configuración y Secretos
- [x] 2.1 Crear archivo `.env.example` en la raíz con variables dummy (DB, JWT_SECRET, JWT_EXP)
- [x] 2.2 Agregar `.env` al `.gitignore`
- [x] 2.3 Modificar `docker-compose.yml` para pasar variables de entorno (usando `env_file` o vars) a `vivero-backend` y `vivero-db`
- [x] 2.4 Actualizar `application.properties` con expresiones `${VAR:fallback}` para db y jwt

## 3. Seguridad JWT
- [x] 3.1 Refactorizar `JwtUtils` para inyectar secreto por `@Value("${jwt.secret}")` y eliminar la clave quemada
- [x] 3.2 Cambiar `System.out.println` por `@Slf4j` (log.error) en `JwtFilter` y `JwtUtils`
- [x] 3.3 Remover cualquier claim asociado a `tenantId` en la generación del token JWT si lo hubiere

## 4. Frontend
- [x] 4.1 Modificar `Productos.jsx` para dejar de enviar `unidadNegocioId` en los requests POST/PUT
- [x] 4.2 Modificar `Insumos.jsx` para dejar de enviar `unidadNegocioId` en los requests POST/PUT
- [x] 4.3 Quitar cualquier uso residual de `unidadNegocioId` en el payload del Login si estuviera configurado
- [x] 4.4 Probar login, creación de producto y creación de insumo para confirmar que funciona de forma global

## 5. Limpieza Final y DB Rebuild

- [x] 5.1 Eliminar el volumen local de DB en caso de incompatibilidad de schema (`docker compose down -v`)
- [x] 5.2 Levantar el proyecto desde cero con la BD reseteada y data generada vía initializer (`docker compose up --build -d`)
