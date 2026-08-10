# Arquitectura Propuesta

Este documento detalla la estructura del código y los patrones arquitectónicos adoptados.

## Backend (Spring Boot) - Clean Architecture Simplificada
- **Controllers (`/controller`)**: Magros. Solo manejan ruteo HTTP, validación de DTOs y llamadas a servicios.
- **Services (`/service`)**: Contienen toda la lógica de negocio (reglas de validación, orquestación). NUNCA devuelven entidades, mapean a DTOs.
- **Repositories (`/repository`)**: Interfaces JPA para persistencia.
- **DTOs (`/dto`)**: Objetos de transferencia para request/response. Previenen fuga de datos sensibles (ej. passwords).
- **Security (`/security`)**: Filtros JWT y lógica de RBAC (`@PreAuthorize("hasAuthority('STOCK_EDITAR')")`).
- **Events (`/sse`)**: Manejo de emisores Server-Sent Events (SseEmitter) para notificaciones push a clientes.

## Frontend (React) - Feature-Sliced Design Simplificado
- **`/components`**: Componentes UI reutilizables (Botones, Tablas, Modales) sin estado global.
- **`/features`**: Lógica agrupada por dominio (ej. `/features/ventas`, `/features/bandejas`). Cada feature contiene sus propios componentes específicos y llamadas a API.
- **`/api`**: Configuración de Axios, interceptores JWT y hooks de React Query (`useQuery`, `useMutation`).
- **`/store`**: Manejador de estado global mínimo (Zustand o Context API) solo para datos transversales (Usuario logueado, Unidad de Negocio activa).
- **`/routes`**: React Router dom, definiendo Layouts y protegiendo rutas según los roles del JWT.

## Despliegue y Orquestación
- Gestionado vía Docker Compose (ver change `docker-full-stack`).
- Backend (port 8080) encapsulado. Frontend (port 80) expuesto vía Nginx, que a su vez actúa como Reverse Proxy para `/api` previniendo problemas de CORS.
