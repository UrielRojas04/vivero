# Descripción General del Sistema

El "Sistema Vivero" es un ERP web para la gestión integral del vivero: stock de productos, insumos, clientes, cuentas corrientes y (próximamente) ventas con descontado de stock.

## Stack Tecnológico
- **Backend:** Java 21, Spring Boot 3.4.3
- **Persistencia:** JPA (Hibernate), PostgreSQL 15
- **Frontend:** React 19, Vite 7, Tailwind CSS v4 (plugin en vite.config, sin config file), Zustand (estado global), TanStack Query (estado servidor), Axios
- **Seguridad:** Spring Security + JWT (filtro `JwtFilter`, `JwtUtils`), BCrypt para passwords
- **Infraestructura:** Docker Compose
  - `frontend` → Vite dev con HMR (puerto 5173) usando `Dockerfile.dev` + volumen `./frontend:/app`
  - `frontend-prod` → build de producción servido por Nginx (puerto 80)
  - `backend` → Spring Boot (puerto 8080)
  - `vivero-db` → PostgreSQL + pgAdmin (`infra-001-db-viewer`)

## Arquitectura General
El sistema opera bajo un modelo Cliente-Servidor tradicional con una SPA (Single Page Application) en el frontend que se comunica mediante una API RESTful al backend (package `com.vivero.gestion`).

- **API base del frontend:** `http://localhost:8080/api` (hardcodeada en `frontend/src/api/axios.js` — el build arg `VITE_API_URL` no se usa).
- **CORS:** abierto (`allowedOriginPatterns("*")` en `SecurityConfig`) — configurado pero no bloqueante.
- La arquitectura sigue el patrón **Controller → Service → Repository → Model** (sin capa UoW; transacciones gestionadas por `@Transactional` en services).
- **Sin SSE implementado aún** (planificado en `us-015-realtime-sse`).

## Integraciones Externas
- Ninguna por el momento. (Sin integración con AFIP, pasarelas de pago o APIs externas).