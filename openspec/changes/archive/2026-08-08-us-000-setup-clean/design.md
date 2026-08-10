## Context

El backend actual fue construido con una arquitectura acoplada a un modelo de negocio simple (un solo negocio, sin capas de seguridad avanzadas ni multi-tenancy). Para soportar el nuevo diseño (ERP Multi-Negocio, Cuentas Corrientes Globales, JWT), el código antiguo es un lastre. Necesitamos limpiar la base para empezar a aplicar Clean Architecture / Hexagonal Architecture como dictan las reglas del proyecto.

## Goals / Non-Goals

**Goals:**
- Eliminar el paquete `models` actual y cualquier código que dependa de él y rompa la compilación al eliminarlo.
- Establecer la estructura de paquetes base: `controllers`, `services`, `dto`, `repositories`, `security`, `exceptions`, `config`.
- Asegurar que `pom.xml` tenga las dependencias necesarias para los siguientes pasos (Spring Security, JJWT, PostgreSQL, JPA, Lombok, Validation).
- Mantener el contenedor de Docker levantando exitosamente tras la limpieza.

**Non-Goals:**
- No se escribirá lógica de negocio ni entidades JPA en este change.
- No se configurará la seguridad JWT (eso pertenece a `us-001-auth-jwt`).

## Decisions

1. **Borrado completo de `models`**: En lugar de refactorizar las clases existentes (`Variedad`, `Bandeja`, etc.), las borramos por completo. 
   - *Rationale*: Las nuevas entidades tendrán relaciones diferentes (ej: atadas a `unidad_id`) y usarán UUIDs en lugar de IDs secuenciales en algunos casos. Es más rápido y seguro escribir desde cero que adaptar.
2. **Estructura de paquetes por capa (Layered Architecture)**: 
   - *Rationale*: Aunque la arquitectura hexagonal pura (puertos y adaptadores) es ideal, una arquitectura en capas estricta (Controller -> Service -> Repository) con uso estricto de DTOs es suficiente para mantener el código limpio en Spring Boot y es más rápida de implementar.
3. **Manejo global de excepciones**: Se preparará un paquete `exceptions` para alojar un `@ControllerAdvice`.
   - *Rationale*: Estandarizar las respuestas de error desde el día 1 evita refactorizaciones masivas después.

## Risks / Trade-offs

- **[Risk] Código roto por borrado masivo** → *Mitigation*: Se borrarán o comentarán temporalmente los controllers y servicios antiguos que dependan de `models`. El objetivo es que el proyecto compile y pase `./mvnw clean verify`.
- **[Risk] Pérdida de lógica de negocio útil** → *Mitigation*: La lógica de negocio real residía en la Knowledge Base (ahora actualizada). El código viejo era solo un CRUD básico, no hay pérdida real de valor.
