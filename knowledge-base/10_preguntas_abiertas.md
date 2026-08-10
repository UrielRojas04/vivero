# Preguntas Abiertas e Inconsistencias

Este archivo documenta las dudas pendientes o temas a resolver en futuras iteraciones. Prioridad: **Alta** → resolver antes de codear, **Media** → planificar, **Baja** → informativo.

> **Estado real (2026-08-10):** Las preguntas originales sobre PIN y rate-limiting quedaron **resueltas** (auth pasó a password BCrypt). Las preguntas vigentes son las de abajo.

## PRIORIDAD ALTA

### 1. Seguridad: JWT secret y credenciales hardcodeadas
El `JwtSecret`/claves de firma JWT y credenciales de BD están **hardcodeadas en el código** (`JwtUtils`, `application.properties`). Con el sistema expuesto a internet, esto es un riesgo crítico.
- **Acción sugerida:** Mover a variables de entorno `.env` (ya cubiertas por `.gitignore`) y al `docker-compose`. Dejar `.env.example` como referencia.
- **Nota:** el CORS `allowedOriginPatterns("*")` está configurado pero no se usa de forma restrictiva — revisar.

### 2. Multi-negocio: ¿completar o abandonar?
`UnidadNegocio` sigue existiendo en BD y modelo, pero es **vestigial**: no hay controller, `SecurityService` es dead code, y el frontend hardcodea `unidadNegocioId=1`.
- **Opción A (completar):** reactivar la lógica de tenant (alto costo — contradice ADR-002 RBAC plano).
- **Opción B (abandonar):** eliminar `UnidadNegocio`/`unidadNegocioId` de Producto/Insumo y limpiar `SecurityService` (recomendado — simplifica el modelo).
- **Decisión necesaria antes de `us-013-ventas-core`** (la Venta incluye `unidadNegocioId`).

## PRIORIDAD MEDIA

### 3. Pruebas automatizadas (mínimas hoy)
El backend solo tiene el `contextLoads` de Spring Boot. Las reglas de negocio RN-01..RN-06 y los endpoints no tienen tests.
- **Acción sugerida:** Agregar tests de integración (Testcontainers con PostgreSQL) al implementar `us-013-ventas-core` (núcleo transaccional con RN-01/RN-04).

### 4. `docs/CHANGES.md` humano
El `AGENTS.md` global de la etapa inicial mencionaba un `docs/CHANGES.md` humano, pero **no existe en este proyecto**. El índice de cambios vive en `openspec/roadmap.md` + `openspec/changes/archive/`. Decidir si se crea uno humano o se mantiene solo OPSX.

### 5. `System.out.println` / logs en producción
Quedan prints de debug en `SecurityConfig`/`JwtFilter` que deben reemplazarse por logger (ver `08_arquitectura_propuesta.md`).

## PRIORIDAD BAJA / RESUELTAS

### Resuelta: Autenticación con PIN → password BCrypt
La pregunta original sobre fuerza bruta del PIN quedó obsoleta: la auth ahora usa username + password (BCrypt) (ADR-002). Rate limiting pendiente de confirmar (RN-05).

### Resuelta: `HERRAMIENTAS_ESCRIBIR_STOCK` en spec stale
Existía un requirement obsoleto en `openspec/specs/user-rbac/spec.md` que pedía permisos `HERRAMIENTAS_*`; los permisos reales son los planos (`LEER_*`, `ESCRIBIR_*`, `ADMIN_DB`) — la spec principal se actualizó en el archive de `ui-rbac-profile`/`ui-feedback-modals`.