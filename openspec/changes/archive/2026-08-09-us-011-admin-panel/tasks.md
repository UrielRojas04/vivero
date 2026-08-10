## 1. Backend: DTOs y Seguridad

- [x] 1.1 Crear `UsuarioResponseDTO` que incluya `id`, `username` y una lista de asignaciones `UsuarioUnidadRolDTO`.
- [x] 1.2 Crear `UsuarioRequestDTO` que incluya `username`, `password` (opcional) y lista de asignaciones.
- [x] 1.3 Crear `UsuarioUnidadRolDTO` que contenga el id de la Unidad de Negocio, su nombre y el id del Rol asignado.
- [x] 1.4 Agregar `@PreAuthorize("hasAuthority('GLOBAL_ADMIN')")` o la anotación pertinente a los nuevos endpoints.
- [x] 1.5 Crear `RolRequestDTO` que incluya `nombre` y lista de `permisoIds`.
- [x] 1.6 Crear `PermisoDTO` para enviar los permisos disponibles al frontend.

## 2. Backend: Controllers y Services

- [x] 2.1 Crear `UsuarioController` con endpoints de CRUD para usuarios y GET para roles/permisos.
- [x] 2.2 Crear `UsuarioService` con la lógica para listar y obtener usuarios transformados a DTOs.
- [x] 2.3 Implementar lógica en `UsuarioService.create()` para guardar usuario con su password hasheado y sus roles asignados por unidad.
- [x] 2.4 Implementar lógica en `UsuarioService.update()` para limpiar la colección `unidadRoles` (con orphanRemoval) y persistir la nueva lista de roles.
- [x] 2.5 Excluir "JEFE" del método `getRoles` en `UsuarioController` o en `RolService`.
- [x] 2.6 Crear `RolController` y `RolService` para CRUD de roles (sin editar/eliminar JEFE) y validación de nombres.
- [x] 2.7 Exponer `GET /api/roles/permisos` para obtener todos los permisos existentes de la tabla.

## 3. Frontend: Pantalla de Administración y Servicios

- [x] 3.1 Agregar los endpoints en `api/axios.js` o llamar a `/usuarios`, `/roles` directamente desde los componentes.
- [x] 3.2 Crear vista `/admin/usuarios` que renderice una tabla con la lista de usuarios y botón para crear/editar.
- [x] 3.3 Agregar la ruta `/admin/usuarios` en `App.jsx`, protegida por rol de administración.

## 4. Frontend: Gestión en Modal (Formulario)

- [x] 4.1 Crear componente `UsuarioForm` (Modal) que incluya inputs para username y password (si es nuevo o se quiere cambiar).
- [x] 4.2 Dentro del modal, iterar sobre la lista global de `UnidadesNegocio` (obtenida por API) y mostrar un `<select>` de `Rol` por cada una.
- [x] 4.3 Manejar el submit del formulario adaptando el estado local a la estructura de `UsuarioRequestDTO`.

## 5. Frontend: Pestaña de Roles

- [x] 5.1 Implementar sistema de Pestañas (Tabs) en `UsuariosAdmin.jsx` para cambiar entre "Usuarios" y "Roles".
- [x] 5.2 Obtener permisos disponibles en `UsuariosAdmin.jsx` con llamadas a la nueva API.
- [x] 5.3 Mostrar la tabla de Roles (nombre y lista de permisos).
- [x] 5.4 Crear un Modal para crear/editar Rol, listando checkboxes para los permisos disponibles. Al grabar enviar `RolRequestDTO`.

## 6. Integración

- [x] 6.1 Reconstruir backend para validar compilación.
- [x] 6.2 Ingresar al frontend como Jefe, ir a la pestaña "Roles", crear un rol "Administrador Sucursal" con permisos específicos.
- [x] 6.3 Asignar el nuevo rol a un empleado y validar que el JWT incluye las authorities correctas al loguearse.
