## ADDED Requirements

### Requirement: Borrado Lógico (Soft Delete)
El sistema SHALL implementar un mecanismo de borrado lógico para todas las entidades principales (Producto, Cliente, Venta, etc.) agregando un campo `deleted`. Al eliminar un registro, en lugar de un DELETE físico en la base de datos, el sistema SHALL realizar un UPDATE estableciendo `deleted = true`.

#### Scenario: Usuario elimina una entidad
- **WHEN** un usuario con permisos ejecuta la acción de borrar un registro
- **THEN** el sistema realiza un UPDATE en la base de datos marcando el registro como `deleted = true` y responde con éxito, conservando la integridad referencial.

### Requirement: Ocultamiento de Registros Borrados
El sistema SHALL ocultar por defecto todos los registros marcados como eliminados lógicamente en todas las consultas de lectura (`findAll`, consultas personalizadas que retornen listas).

#### Scenario: Listado de entidades no muestra borrados
- **WHEN** el cliente solicita un listado paginado o total de una entidad (ej. Productos)
- **THEN** el sistema devuelve únicamente aquellos registros donde `deleted = false` sin requerir parámetros adicionales explícitos en la petición.
