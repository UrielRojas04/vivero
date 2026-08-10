## MODIFIED Requirements

### Requirement: Rol Jefe
El Rol Jefe MUST tener acceso a la mayoría de las operaciones del sistema, pero su acceso está filtrado por los prefijos correspondientes de Unidad de Negocio.

#### Scenario: Jefe registra producto
- **WHEN** el usuario con rol Jefe intenta registrar un producto
- **THEN** se verifica que posea la autoridad correspondiente (ej. `VIVERO_ESCRIBIR_STOCK`)

## ADDED Requirements

### Requirement: Permisos de Producto
El sistema MUST requerir permisos explícitos para gestionar productos.

#### Scenario: Escritura y Lectura
- **WHEN** un rol se asigna
- **THEN** puede tener permisos de lectura (ej. `LEER_STOCK`) y escritura (ej. `ESCRIBIR_STOCK`) para productos.
