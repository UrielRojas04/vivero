## Context
El módulo de Roles y Permisos (`Configuracion.jsx` / `RolModal`) permite asignar permisos a los distintos roles. Actualmente, no se encuentra expuesta la sección para gestionar los permisos del módulo de Siembras, lo cual es necesario para la correcta delegación de acceso.

## Goals / Non-Goals

**Goals:**
- Agregar la categoría "Siembras" al listado de permisos del modal de creación/edición de roles.
- Mapear correctamente los permisos de lectura, escritura y administración de Siembras.

**Non-Goals:**
- Modificar el backend o la base de datos (se asume que los permisos ya están definidos en el backend).
- Refactorizar toda la lógica del RBAC.

## Decisions
- **Estructura del Estado**: Se agregará una nueva clave (ej. `Siembras`) en la constante de agrupamiento de permisos dentro del componente `RolModal` (o donde se defina la estructura de permisos agrupados).
- **Mapeo de Nombres**: Se utilizarán los nombres de permisos estándar del sistema (probablemente `LEER_SIEMBRAS`, `ESCRIBIR_SIEMBRAS`, `ADMIN_SIEMBRAS`) para alinear con el resto del RBAC.

## Risks / Trade-offs
- [Riesgo] Los permisos exactos de Siembras podrían tener un nombre distinto en el backend (ej. `GESTIONAR_SIEMBRAS`). → Mitigación: Se verificará el código del backend (`Permiso.java` o similar) si hay dudas sobre el nombre exacto antes de implementar.
