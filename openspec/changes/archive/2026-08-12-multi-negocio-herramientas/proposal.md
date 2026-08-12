## Why

El negocio del vivero ha crecido y el jefe necesita administrar otras unidades de negocio secundarias dentro de la misma plataforma (empezando por un negocio de Herramientas). En lugar de crear sistemas separados, reviviremos y completaremos la funcionalidad de `UnidadNegocio` que había quedado vestigial en la base de datos para soportar múltiples negocios bajo el mismo login, centralizando así la gestión.

## What Changes

- **Activación de UnidadNegocio**: Revivir la entidad `UnidadNegocio` y agregar las unidades base (Vivero, Herramientas, etc.).
- **Selector de Negocio en UI**: Agregar un menú desplegable en el perfil de usuario (DashboardLayout) para cambiar la unidad de negocio activa.
- **Estado Global**: Guardar la `unidadNegocioActiva` en el `useAuthStore` o en un nuevo `useBusinessStore`.
- **Filtro de Datos**: Modificar consultas y endpoints clave para filtrar por `UnidadNegocio` (productos, siembras, ventas), o crear entidades específicas para el negocio de herramientas si la estructura es diferente.
- **Gestión de Herramientas**: Crear CRUD básico para el negocio de herramientas.

## Capabilities

### New Capabilities
- `multi-negocio-core`: Soporte centralizado para múltiples unidades de negocio (selector de contexto, filtrado de datos básicos).
- `negocio-herramientas`: Gestión específica para el negocio de herramientas (stock, productos/herramientas).

### Modified Capabilities
- `auth-model`: Adaptar los tokens o el estado global para incluir el contexto de la unidad de negocio activa.

## Impact

- **Frontend**: DashboardLayout, Zustand Stores, Axios interceptors (para enviar `X-Unidad-Negocio` header o query param).
- **Backend**: Entity `UnidadNegocio`, Filtros en JPA Repositories para asociar y separar los datos del Vivero de los otros negocios.
