## MODIFIED Requirements

### Requirement: Arquitectura de Persistencia de Permisos
El backend SHALL almacenar los permisos disponibles en memoria como constantes (Enums) y vincularlos a los roles utilizando colecciones de elementos nativos en lugar de entidades separadas.

#### Scenario: Suministro de permisos a la API
- **WHEN** un cliente hace un GET a `/api/roles/permisos`
- **THEN** el sistema devuelve una lista estandarizada de permisos desde el Enum de Java (ej. `[{id: 1, nombre: "LEER_STOCK"}, ...]`) sin consultar una tabla dedicada.
