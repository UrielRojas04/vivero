## ADDED Requirements

### Requirement: Database web GUI inspection
El sistema SHALL proveer una interfaz web gráfica (pgAdmin) expuesta en un puerto local para facilitar la administración y visualización de la base de datos PostgreSQL durante el ciclo de desarrollo.

#### Scenario: Acceso web a la interfaz gráfica
- **WHEN** el desarrollador ingresa a `http://localhost:5050`
- **THEN** visualiza la pantalla de login de pgAdmin4

#### Scenario: Acceso con credenciales por defecto
- **WHEN** el desarrollador ingresa las credenciales predefinidas (`admin@vivero.com` / `admin`)
- **THEN** accede al dashboard principal de pgAdmin4

#### Scenario: Registro del servidor PostgreSQL interno
- **WHEN** el desarrollador añade un nuevo servidor usando el hostname `vivero-db`
- **THEN** pgAdmin4 se conecta exitosamente a la base de datos PostgreSQL orquestada localmente
