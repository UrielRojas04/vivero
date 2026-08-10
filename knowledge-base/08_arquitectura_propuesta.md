# Arquitectura Propuesta

> **Estado real (2026-08-10):** Este documento describe la **estructura real del repo** y los patrones vigentes (no una arquitectura ideal).

## Backend (Spring Boot) — package `com.vivero.gestion`

Estructura feature-first por capas (Controller → Service → Repository → Model):

- **`/controllers`**: Magros. Solo manejan ruteo HTTP, validación de DTOs y llamadas a servicios. Actuales: `AuthController`, `ClienteController`, `InsumoController`, `ProductoController`, `RolController`, `UsuarioController`.
- **`/services`**: Contienen toda la lógica de negocio y reglas de validación. NUNCA devuelven entidades — mapean a DTOs. Las transacciones se gestionan con `@Transactional`.
- **`/repositories`**: Interfaces JPA para persistencia.
- **`/models`**: Entidades JPA (8): `Usuario`, `Rol`, `Permiso`, `Producto`, `Insumo`, `Cliente`, `CuentaCorrienteDinero`, `CuentaCorrienteBandejas`.
- **`/dto`**: Objetos de transferencia request/response. Previenen fuga de datos sensibles (ej. password).
- **`/security`**: `JwtFilter`, `JwtUtils`, `CustomUserDetailsService`.
- **`/config`**: `SecurityConfig` (CORS abierto `allowedOriginPatterns("*")`), `DataInitializer` (seed: 8 permisos, roles JEFE/VENDEDOR/OPERARIO, usuario demo).
- **`/exceptions`**: Manejo centralizado de errores.

## Frontend (React) — estructura real

```
frontend/src/
├── api/          → axios.js (baseURL http://localhost:8080/api, interceptores JWT)
├── components/   → UI reutilizable: ConfirmDialog, ToastContainer, PermissionDeniedModal,
│                   ProductoForm, InsumoForm, ClienteForm, ProtectedRoute
├── layouts/      → DashboardLayout (sidebar + <Outlet /> + feedback global)
├── pages/        → Login, Dashboard, Productos, Insumos, Clientes, UsuariosAdmin
├── store/        → Zustand: useAuthStore (sesión/token), useUIStore (toasts/confirm/deny)
├── utils/        → errorMessage.js (getErrorMessage)
└── App.jsx / main.jsx → router React Router
```

Convenciones de frontend:
- `cursor-pointer` en todos los botones; iconos con `lucide-react`.
- Estado del servidor con **TanStack Query**; estado del cliente con **Zustand**.
- Modal estándar: `fixed inset-0 z-50 flex items-end sm:items-center ... bg-gray-900/60 backdrop-blur-sm animate-fadeIn` + tarjeta `bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl p-6 animate-scaleIn` (bottom-sheet mobile / centered desktop).

## Despliegue y Orquestación (Docker Compose)
- `frontend` (Vite dev, puerto 5173) — `Dockerfile.dev`, volumen `./frontend:/app`, sin rebuild por cambio.
- `frontend-prod` (Nginx, puerto 80) — build de producción.
- `backend` (Spring Boot, puerto 8080).
- `vivero-db` (PostgreSQL) + pgAdmin (`infra-001-db-viewer`).

## Patrones de seguridad vigentes
- JWT en header `Authorization: Bearer`; `@PreAuthorize`/checks de permiso en services/controllers.
- BCrypt (cost ≥ 12) para passwords; JWT secret y credenciales en `.env` / variables de entorno.
- Sin `System.out.println` en producción (usa logger).