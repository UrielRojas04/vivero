## Context

Actualmente el sistema está altamente acoplado al dominio de un Vivero (Siembras, Variedades, Productos). Sin embargo, la base de datos conserva la entidad `UnidadNegocio`, la cual no está siendo utilizada activamente. El objetivo es permitir al administrador gestionar diferentes ramas comerciales (Vivero, Herramientas, etc.) bajo la misma sesión de usuario, separando lógicamente los catálogos y operaciones según el negocio activo.

## Goals / Non-Goals

**Goals:**
- Implementar un selector de Unidad de Negocio en la interfaz.
- Establecer un contexto de negocio global en el frontend (Zustand).
- Propagar la unidad de negocio activa al backend mediante un Header HTTP (`X-Unidad-Negocio`) o inyectándola en el JWT.
- Filtrar entidades core (Productos, Ventas) por la unidad de negocio activa.
- Crear una sección básica para el negocio de Herramientas.

**Non-Goals:**
- Reescribir las siembras para ser "multi-negocio" (Siembras es un dominio exclusivo del Vivero).
- Implementar contabilidad/finanzas segregada (por ahora el módulo finanzas se mantendrá unificado o filtrado de forma simple).
- Crear un RBAC avanzado por negocio (el usuario tendrá acceso a todo o a nada según el rol general).

## Decisions

1. **Contexto de Negocio en API Calls**: 
   - *Decisión*: Usar un header HTTP `X-Unidad-Negocio` enviado desde el frontend mediante un Axios interceptor.
   - *Rationale*: Evita tener que modificar todos los DTOs y firmas de controladores para incluir la `unidadNegocioId`. El backend (mediante un filtro o interceptor) puede leer el header y aplicarlo a las consultas, o inyectarlo en el contexto de seguridad/ThreadLocal. Alternativa considerada: incluirlo en el JWT (más difícil de cambiar dinámicamente sin re-autenticar).

2. **Asociación en Base de Datos**:
   - *Decisión*: Agregar la columna `unidad_negocio_id` a `productos` y `ventas`. Entidades como `Siembra`, `VariedadPlanta`, etc., pertenecen implícitamente al Vivero.
   - *Rationale*: El negocio "Herramientas" solo vende productos. No siembra. Por tanto, `productos` será la tabla compartida y filtrada por negocio.

## Risks / Trade-offs

- **Riesgo**: Fuga de datos cruzada (mostrar herramientas en la sección de vivero).
  - *Mitigación*: Implementar Hibernate `@Filter` o aplicar estrictamente el filtrado por JPA en los repositorios utilizando el contexto inyectado.
- **Trade-off**: Complejidad en la UI.
  - El menú lateral deberá cambiar dependiendo del negocio activo, o bien ocultar opciones irrelevantes (ej. no mostrar "Siembras" si el negocio es Herramientas).
