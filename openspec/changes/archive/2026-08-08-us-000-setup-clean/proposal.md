## Why

El proyecto actual contiene clases y modelos Java (como `Variedad.java`, `Bandeja.java`, `Ubicacion.java`) que pertenecen a un diseño arquitectónico antiguo y limitado (monocapa y sin control de acceso granular). El nuevo diseño de la Knowledge Base establece un sistema ERP multi-negocio. Tratar de adaptar el código viejo generará deuda técnica, por lo que es necesario limpiar la base del backend y preparar el esqueleto para la nueva arquitectura limpia antes de escribir lógica de negocio.

## What Changes

- **BREAKING**: Se eliminará el paquete `models` actual y todo su contenido.
- Se configurará el archivo `pom.xml` para asegurar que dependencias críticas como JJWT y Spring Security estén presentes.
- Se creará la estructura de directorios canónica para la nueva arquitectura (`controllers`, `services`, `dto`, `repositories`, `security`, `exceptions`).

## Capabilities

### New Capabilities
- `backend-foundation`: Base estructural y dependencias listas para soportar la arquitectura multi-negocio y JWT.

### Modified Capabilities
- (Ninguna)

## Impact

- Todo el código backend antiguo dejará de compilar temporalmente (si había controladores o repositorios acoplados a esos modelos).
- Se preparará un entorno limpio para el change `us-001-auth-jwt`.
