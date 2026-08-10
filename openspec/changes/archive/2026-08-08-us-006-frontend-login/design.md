## Context

Actualmente el sistema cuenta con una arquitectura de backend en Spring Boot basada en una "Sesión Unificada", donde un mismo JWT (JSON Web Token) le otorga al usuario todos los permisos combinados de todas sus unidades de negocio. El front-end anterior, además de no usar tecnologías modernas como Zustand, forzaba al usuario a seleccionar a qué unidad de negocio conectarse durante el login.

## Goals / Non-Goals

**Goals:**
- Bootstrapear un proyecto moderno con Vite + React 19 + TailwindCSS v4.
- Implementar Zustand para el manejo global del JWT y estado del usuario.
- Rediseñar la pantalla de Login con un diseño "premium" y moderno (glassmorphism, animaciones sutiles) enfocado solo en Username (Email) y PIN/Password.
- Proveer la estructura base de enrutamiento con React Router.

**Non-Goals:**
- No se implementarán pantallas para Productos o Insumos en este change, solo el Login y un layout de Dashboard vacío.
- No se implementará lógica compleja de validación de roles de frontend en este paso inicial (solo redirección si no hay token).

## Decisions

1. **Stack Tecnológico**: Se usará `Vite` con React 19 en lugar de Next.js. El ERP Vivero será consumido como una SPA (Single Page Application) en dispositivos internos y móviles de los empleados, no requiere Server-Side Rendering (SEO).
2. **Gestión de Estado (Zustand)**: En lugar de Context API o Redux, se utilizará Zustand. Es mucho más ligero, requiere menos boilerplate y permite acceso fácil a los tokens incluso fuera de los componentes de React (ideal para interceptores de Axios/Fetch).
3. **Tailwind CSS v4**: Se utilizará el motor de Tailwind CSS v4 para aprovechar el rendimiento y simplicidad (no requiere postcss config compleja).
4. **Login Simplificado**: La autenticación usará el endpoint `/api/auth/login`. Si el login es exitoso, el JWT se guarda en Zustand (y en `localStorage`) y se redirige a `/dashboard`.

## Risks / Trade-offs

- **Trade-off**: Usar `localStorage` para el JWT en lugar de cookies `HttpOnly` expone el token a posibles ataques XSS. Sin embargo, en esta etapa y dada la naturaleza de intranet/ERP de la aplicación, priorizamos la facilidad de implementación y manejo con Zustand.
- **Riesgo**: La dependencia de Tailwind v4 y React 19 (que son bastante nuevos) podría encontrar alguna incompatibilidad en librerías de terceros (UI). 
  - **Mitigación**: Se intentará usar componentes vanilla de Tailwind antes que librerías pesadas como Material UI o Chakra.
