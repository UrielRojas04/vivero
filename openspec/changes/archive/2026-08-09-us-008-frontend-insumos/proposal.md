## Why

Se requiere proveer una interfaz de usuario que permita la visualización y gestión (alta, baja y modificación) del catálogo de insumos del sistema (sustratos, perlitas, herramientas, etc.). Esta pantalla permitirá a los administradores mantener un control preciso del inventario y de los precios de venta de estos insumos.

## What Changes

- Creación de una nueva vista o página para listar los insumos disponibles.
- Implementación de un formulario modal (alta/edición) similar al de plantas, con los mismos lineamientos estéticos (glassmorphism).
- Interacción completa con los endpoints del backend (`/api/insumos`) para el CRUD, reutilizando el cliente HTTP ya configurado (Axios con JWT).
- **IMPORTANTE:** Se priorizará el diseño responsive para celulares (mobile-first) de acuerdo a lo solicitado.

## Capabilities

### New Capabilities
- `frontend-insumos`: Especifica los requerimientos funcionales, flujos y escenarios para la gestión (CRUD) de los Insumos en la UI de React.

### Modified Capabilities
- `frontend-core`: Modificaremos la especificación del sidebar y de la base para incluir la nueva ruta `/insumos`.

## Impact

- **Frontend:** Archivos de rutas en `App.jsx`, nuevo componente `Insumos.jsx`, nuevo (o reutilizado) modal de edición de insumo, y la navegación en `DashboardLayout.jsx`.
- **Backend/APIs:** El frontend consumirá `GET`, `POST`, `PUT` y `DELETE` sobre `/api/insumos`. No se esperan cambios en la lógica del backend si ya funciona correctamente.
