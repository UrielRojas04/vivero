## Context

Actualmente el sistema permite la autenticación mediante JWT y almacena el token, pero la interfaz (Frontend) no restringe de forma dinámica los elementos del menú principal en base a los permisos o el rol del usuario. Tampoco existe un feedback visual sobre qué usuario se encuentra utilizando la sesión actual. 
Con el refactor de RBAC a roles planos (`us-012`), los permisos están definidos globalmente. Queremos aprovechar esta nueva estructura para modularizar la UI.

## Goals / Non-Goals

**Goals:**
- Mostrar u ocultar pestañas/enlaces (Productos, Insumos, Admin) dependiendo de si el rol del usuario cuenta con los permisos necesarios.
- Renderizar un componente "Perfil" (avatar circular con inicial, username y nombre del rol) en la barra superior.
- Proteger las rutas de React (React Router o condicionales) para evitar accesos manuales por URL a secciones prohibidas.

**Non-Goals:**
- No se modificarán los endpoints del backend en este change, ya que la validación de `@PreAuthorize` ya es robusta tras el refactor.

## Decisions

1. **Gestión del estado de Permisos**: 
   El backend ya incluye los permisos dentro del DTO del usuario al hacer GET `/api/usuarios/{id}` o `/api/auth/me`? Actualmente, en el payload del JWT solo viajan el `sub` (username). Necesitamos exponer los roles/permisos al frontend, o decodificarlos del JWT si están ahí, o hacer un request a `/api/auth/me` al cargar la app.
   *Decisión*: Se asume que usaremos la API `/api/usuarios` o el store actual (Zustand `useAuthStore`) para determinar el rol, idealmente con un request inicial para obtener los datos del perfil y sus permisos.

2. **Componente Profile**:
   Será un pequeño badge en la esquina superior derecha del `App.jsx` o Layout principal. Mostraremos la primera letra del email en un círculo colorido, acompañado del nombre de usuario y su rol principal en texto.

3. **Mapeo Permisos -> Secciones**:
   - Sección Admin -> Permiso `ADMIN_DB`
   - Sección Insumos -> Permiso `LEER_INSUMOS` o superior
   - Sección Productos -> Permiso `LEER_PRODUCTOS` o superior
   Si el usuario no tiene permisos para una sección, no se renderiza el botón.

## Risks / Trade-offs

- **Risk**: Desincronización del JWT con la base de datos (por ejemplo, si el admin cambia los permisos de un usuario mientras está logueado).
  - *Mitigación*: El frontend restringirá la visualización, pero si intentan una acción y el backend da 403, el usuario verá una alerta. Es aceptable.
