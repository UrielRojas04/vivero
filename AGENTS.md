# Sistema Vivero — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado a partir de `knowledge-base/` y `openspec/roadmap.md`. No editar a mano sin re-sincronizar.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 · Vite 7 · Tailwind CSS v4 (plugin en vite.config) · Zustand (estado global) · TanStack Query (estado servidor) · Axios |
| Backend | Java 21 · Spring Boot 3.4 · Spring Security + JWT · JPA (Hibernate) |
| Base de datos | PostgreSQL 15 (schema con `ddl-auto` + seed en `DataInitializer`) |
| Infraestructura | Docker Compose: `frontend` (Vite dev :5173) · `frontend-prod` (nginx :80) · `backend` (:8080) · `vivero-db` (PostgreSQL + pgAdmin) |
| Autenticación | JWT (`JwtFilter`) + BCrypt (password) — RBAC plano `Usuario ↔ Rol ↔ Permiso` |

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/`. **Leé el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---------|---------------|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Entender propósito y alcance |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Auth, RBAC, permisos reales |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades, ERD, modelo real |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas codificadas (RN-01..06) |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias de usuario por épica |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos E2E |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Estructura real del repo, convenciones |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | ⚠️ Inconsistencias a resolver ANTES de codear |

> ⚠️ Resolver las preguntas de prioridad **Alta** de `10_preguntas_abiertas.md` antes de arrancar `us-013-ventas-core`.

---

## Skills Disponibles

Cargá la skill correspondiente al contexto ANTES de escribir código.

| Agente | Rol | Skills que carga |
|--------|-----|------------------|
| **Orquestador OPSX** | SDD / OPSX / docs | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-archive-change`, `kb-creator`, `roadmap-generator`, `agents-md-generator`, `skill-creator` |
| **Backend Core** | Java/Spring/seguridad | (sin skill dedicada — seguir `knowledge-base/08_arquitectura_propuesta.md` y las reglas duras) |
| **Frontend** | React / Zustand / Tailwind | `frontend-design`, `tailwind-design-system` |
| **General** | Utilidades / búsquedas | `find-skills`, `skill-creator` |

Skills instaladas en el repo: `.opencode/skills/` (flujo OPSX) y `.agents/skills/`. **Nota:** `fastapi-python` existe en el repo pero es residual de otro proyecto — **NO aplica** a este stack (Java/Spring).

---

## Roadmap de Changes

El plan de implementación completo está en [openspec/roadmap.md](openspec/roadmap.md). Resumen:

- **Completados y archivados** (al 2026-08-10): `infra-001-db-viewer`, `us-000`…`us-012`, `docker-full-stack`, `ui-rbac-profile`, `ui-feedback-modals`.
- **Próximo change**: `us-013-ventas-core` (Venta, VentaDetalle, MovimientoStock).
- **Siguientes**: `us-013-ventas-pagos`, `us-014-bandejas-flujo`, `us-015-realtime-sse`, `us-016-remitos-pdf`, `us-017-finanzas-ui`.

**Antes de cualquier `/opsx:propose`**: leé [openspec/roadmap.md](openspec/roadmap.md) e identificá las dependencias del change.

---

## Reglas Duras (no negociables)

Estas reglas son **contrato**. Romperlas es un defecto, no una decisión de estilo.

1. **No buildear automático.** Nunca ejecutar build/compile/bundle sin pedido explícito del usuario.
2. **No commitear sin pedido explícito.** `git add`/`commit`/`push` SOLO cuando el usuario lo pide. **Única excepción:** el auto-commit al ejecutar el comando de archive de un change (regla del proyecto, ver `.opencode/skills/openspec-archive-change/SKILL.md`). El archivado NUNCA se dispara solo — solo con comando explícito del usuario — pero al tirar ese comando, el commit del archivado es automático. NUNCA se pushea sin pedido.
3. **Conventional Commits sin `Co-Authored-By`.** Formato `tipo(scope): mensaje` (feat, fix, chore, refactor, test, docs). JAMÁS agregar atribución a IA ni `Co-Authored-By`.
4. **Tests sin mocks de DB.** Usar base real o contenedor de test (Testcontainers / PostgreSQL). Mockear la base de datos invalida el test.
5. **DTOs siempre en backend.** NUNCA devolver entidades JPA directo en endpoints (fuga de datos, ej. password). Usar DTOs para request/response.
6. **Controller → Service → Repository → Model.** Los Controllers NUNCA llaman Repositories; toda la lógica de negocio va en `@Service` (con `@Transactional`). Sin `findAll()` sin límite: usar paginación.
7. **PascalCase en componentes React.** Nombre del componente y del archivo (`ProductoForm.jsx`). `cursor-pointer` en todos los botones; iconos con `lucide-react`. Feedback UX SIEMPRE vía `useUIStore` (NUNCA `alert`/`confirm` nativos).

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)        → entender el dominio
2. Identificar el change en openspec/roadmap.md  → respetar dependencias
3. /opsx:propose <change>                        → proposal + design + specs + tasks
4. Implementar las tasks (cargando skills)       → respetando las reglas duras
5. /opsx:archive <change>                        → synca specs + archiva + AUTO-COMMIT (no push)
```

Aplicar TODAS las reglas duras en cada paso. Ante conflicto entre la KB y este archivo, las reglas duras prevalecen.