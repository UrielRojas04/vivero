# Knowledge Base: Sistema Vivero

Bienvenido a la Base de Conocimiento oficial del proyecto. Esta documentación define las reglas, arquitectura y alcance del sistema ERP **Sistema Vivero** (Java + Spring Boot + React).

> ⚠️ **Documentación actualizada al estado real del proyecto (2026-08-10).** Si detectás una inconsistencia, actualizá este archivo y los canónicos — no los dejes stale.

## Índice de Documentos Canónicos

| Archivo | Contenido Principal |
|---------|---------------------|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito, objetivos, alcance, out-of-scope |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack tecnológico, arquitectura general, integraciones |
| [03_actores_y_roles.md](03_actores_y_roles.md) | Actores, tabla RBAC, permisos planos reales |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | Entidades reales (9 modelos JPA), ERD lógico |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | Reglas codificadas por dominio (Stock, Deudas, Finanzas) |
| [06_funcionalidades.md](06_funcionalidades.md) | Épicas e Historias de Usuario para el roadmap de desarrollo |
| [07_flujos_principales.md](07_flujos_principales.md) | Flujos E2E (Autenticación, Ventas SSE, Devoluciones) |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Estructura real del repo, patrones, convenciones |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | Decisiones (ADRs) de diseño documentadas |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | Inconsistencias y riesgos pendientes de resolver |

## Estado de implementación (OPSX)

Ver el detalle en [`openspec/roadmap.md`](../openspec/roadmap.md). Resumen:

- **Completados y archivados** (al 2026-08-10): `infra-001-db-viewer`, `us-000`…`us-012`, `docker-full-stack`, `ui-rbac-profile`, `ui-feedback-modals`.
- **Próximo change**: `us-013-ventas-core` (Venta, VentaDetalle, MovimientoStock).

---
*Documentación actualizada vía OPSX Knowledge Base (2026-08-10).*
