## Why

Se requiere implementar el modelo de negocio base para los Clientes (`us-009-clientes-base`). El Cliente es una entidad central y global dentro del sistema (no está atada a una Unidad de Negocio específica) ya que una misma persona puede comprar Plantas hoy e Insumos mañana, y su cuenta corriente y deudas deben unificarse. Es el paso previo y bloqueante para poder gestionar cuentas corrientes y realizar ventas.

## What Changes

- Creación de la entidad `Cliente` en JPA con los campos `nombreRazonSocial` y `telefono`.
- Implementación del DTO, Repository, Service y Controller correspondientes (`GET`, `POST`, `PUT`, `DELETE` en `/api/clientes`).
- Creación de una interfaz gráfica (SPA Frontend) para gestionar el ABM de clientes, reutilizando los patrones de diseño establecidos (DashboardLayout, glassmorphism modals, mobile-first).
- **BREAKING**: Ninguno. Es una adición pura de la entidad principal.

## Capabilities

### New Capabilities
- `backend-clientes`: Capacidad del backend para gestionar y persistir la información global de los clientes.
- `frontend-clientes`: Interfaz de usuario para listar, buscar, crear y modificar clientes desde el Dashboard.

### Modified Capabilities
- `frontend-core`: Modificación del escenario de navegación para incluir la ruta `/clientes`.

## Impact

- **Base de Datos**: Se creará la tabla `clientes` de forma global (sin `tenant_id`).
- **Backend API**: Nuevo endpoint `/api/clientes`.
- **Frontend**: Nueva vista `Clientes.jsx` y su modal de formulario, adaptados para su uso en móviles, consumidos desde el menú principal.
