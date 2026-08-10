# Descripción General del Sistema

El "Sistema Vivero" es un ERP modular web-based para la gestión integral de unidades de negocio agropecuarias e industriales (Plantas, Sustratos y Perlitas, Herramientas).

## Stack Tecnológico
- **Backend:** Java 21, Spring Boot 3.4
- **Persistencia:** JPA (Hibernate), PostgreSQL 15
- **Frontend:** React 19, Vite 7, Tailwind CSS v4, React Query, Zustand (estado global)
- **Infraestructura:** Docker Compose (Multi-stage builds)
- **Servidor Web:** Nginx (Proxy inverso y servido de estáticos)

## Arquitectura General
El sistema opera bajo un modelo Cliente-Servidor tradicional con una SPA (Single Page Application) en el frontend que se comunica mediante una API RESTful al backend. La arquitectura incluye:
- Sincronización Push unidireccional vía Server-Sent Events (SSE).
- Seguridad basada en JSON Web Tokens (JWT).
- Base de datos centralizada con discriminación lógica de *tenants* (Unidades de Negocio).

## Integraciones Externas
- Ninguna por el momento. (Sin integración con AFIP, pasarelas de pago o APIs externas).
