## ADDED Requirements

### Requirement: Permisos de Insumos
El sistema MUST requerir permisos explícitos generados a partir de la Unidad de Negocio a la que pertenece el insumo para permitir su gestión.

#### Scenario: Autorización Dinámica de Escritura
- **WHEN** un usuario intenta modificar o crear un insumo asociado a la unidad de negocio "Herramientas"
- **THEN** el sistema verifica que el usuario en sesión contenga la autoridad dinámica `HERRAMIENTAS_ESCRIBIR_STOCK`

#### Scenario: Rechazo por Autoridad Inválida
- **WHEN** un usuario intenta modificar un insumo de "Sustratos y perlas" pero solo tiene permisos en "Vivero" y "Herramientas"
- **THEN** el sistema rechaza la petición HTTP con un estado 403 Forbidden
