## Purpose
Esta especificación define el comportamiento de la gestión de marcas de herramientas.

## Requirements

### Requirement: CRUD de Marcas
El sistema MUST permitir la creación, lectura, actualización y borrado lógico de entidades "Marca" vinculadas a la unidad de negocio activa.

#### Scenario: Creación de Marca exitosa
- **WHEN** un usuario con permisos (ej. admin de unidad) envía un `POST /api/marcas` con el nombre de la nueva marca
- **THEN** el sistema persiste la marca asociada a la unidad de negocio actual y devuelve los datos creados.

#### Scenario: Edición de Marca
- **WHEN** un usuario envía un `PUT /api/marcas/{id}` con un nuevo nombre
- **THEN** el sistema actualiza la entidad si pertenece a la misma unidad de negocio.

#### Scenario: Listado de Marcas por Unidad
- **WHEN** el frontend pide `GET /api/marcas`
- **THEN** el backend devuelve solo las marcas asociadas a la unidad de negocio actual, excluyendo las marcadas como `deleted = true`.
