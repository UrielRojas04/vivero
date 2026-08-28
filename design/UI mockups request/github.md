repo: UrielRojas04/vivero
branch: main
path: frontend/src

## Last sync
date: 2026-08-27T21:31:24Z

### Updated in this project
- Logo Serhan (logos/logo_herramientas_sin_fondo.png) integrado en el sidebar de Herramientas, sobre placa oscura.
- Acento de Herramientas cambiado al teal de la marca Serhan (#14666F).
- Turno 2: pares B y C aplicados a modo comparación + panel de tokens.
- vivero-tokens.css: tokens listos para reemplazar el bloque @theme de index.css.

## Sync history
### 2026-08-27T16:58:00Z
- Sistema de diseño nuevo (neutral cálido, IBM Plex, tokens) derivado del logo de marca.
- Identidad por unidad de negocio: acento + barra persistente.
- Mockups: Dashboard, Productos, Nueva venta, Facturación, Siembras, Pedidos, Login, Configuración y modo oscuro.

## Screen map
| Pantalla del mockup | Archivos del repo |
| --- | --- |
| Dashboard (1d) | frontend/src/layouts/DashboardLayout.jsx, frontend/src/pages/Dashboard.jsx |
| Productos (1e) | frontend/src/pages/Productos.jsx |
| Nueva venta (1f) | frontend/src/pages/NuevaVenta.jsx, frontend/src/components/FormattedNumberInput.jsx |
| Facturación (1g) | frontend/src/pages/FacturaCliente.jsx |
| Siembras (1h) | frontend/src/pages/Siembras.jsx |
| Pedidos (1h) | frontend/src/pages/Pedidos.jsx |
| Login (1i) | frontend/src/pages/Login.jsx |
| Selector de unidad (1i) | frontend/src/layouts/DashboardLayout.jsx, frontend/src/store/useAuthStore.js |
| Configuración / Proveedores (1i) | frontend/src/pages/Configuracion.jsx, frontend/src/pages/Proveedores.jsx |
| Tokens (1a–1c, 2c) | frontend/src/index.css, frontend/index.html, logos/IL_Marca.FINAL-01.png, logos/logo_herramientas_sin_fondo.png |
| Pares B y C (2a–2b) | frontend/src/index.css |
