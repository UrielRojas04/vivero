## 1. Implementación de PermisoEnum

- [x] 1.1 Crear el enum `PermisoEnum.java` en `com.vivero.gestion.models` con todos los permisos actualmente en uso, y asignarle un ID estable (Long id, String nombre) a cada uno.
- [x] 1.2 Agregar un método estático `fromId(Long id)` en el Enum para facilitar la búsqueda.

## 2. Refactor Entidades y Repositorios

- [x] 2.1 Eliminar la entidad `Permiso.java`.
- [x] 2.2 Eliminar `PermisoRepository.java`.
- [x] 2.3 Modificar `Rol.java`: Reemplazar `@ManyToMany` con `@ElementCollection(fetch = FetchType.EAGER)` y `@Enumerated(EnumType.STRING)` apuntando al `PermisoEnum`.

## 3. Actualización de Servicios y Componentes

- [x] 3.1 Actualizar `RolServiceImpl.java`: 
  - `getAllPermisos()` debe iterar `PermisoEnum.values()` y devolver `PermisoDTO`.
  - `create` y `update` de Rol deben mapear los IDs recibidos desde `dto.getPermisoIds()` a los valores del `PermisoEnum`.
  - Eliminar inyección de `PermisoRepository`.
- [x] 3.2 Actualizar `DataInitializer.java`: 
  - Eliminar lógica de `crearPermiso()`.
  - Agregar directamente los valores de `PermisoEnum` a `permisosJefe` y `permisosEmpleado`.
- [x] 3.3 Actualizar cualquier otro lugar que referenciara a `Permiso` o `PermisoRepository` (revisar `JwtFilter` o services).

## 4. Validación y Pruebas

- [x] 4.1 Reiniciar el backend para asegurar que la DB se migre sin errores.
- [x] 4.2 Validar que el login y los endpoints protegidos con permisos sigan funcionando.
- [x] 4.3 Validar que la interfaz de creación/edición de roles en el frontend reciba y envíe correctamente los IDs como antes.
