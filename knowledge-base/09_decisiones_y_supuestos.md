# Decisiones de Diseño y Supuestos

## Decisiones Arquitectónicas (ADRs)

### ADR-001: Sincronización en Tiempo Real
- **Decisión:** Utilizar Server-Sent Events (SSE) desde Spring Boot hacia el frontend (React), combinado con invalidación de caché usando React Query.
- **Razón:** El enfoque B (SSE) provee notificaciones push ultralivianas desde el servidor (ej. cuando se descuenta stock) sin la complejidad bidireccional de WebSockets. El cliente reacciona al evento invalidando la caché correspondiente y haciendo un fetch HTTP normal.
- **Alternativas descartadas:** WebSockets (excesivo para updates simples), Short Polling (ineficiente, consume mucha red y batería).

### ADR-002: Estrategia de Multi-Tenancy (Unidades de Negocio)
- **Decisión:** Implementar "Logical Isolation" en una única base de datos usando una columna discriminadora (ej. `negocio_id` o enum `UNIDAD_NEGOCIO`) en las tablas principales (Productos, Ventas, Finanzas).
- **Razón:** Permite que las 3 unidades operen de forma totalmente independiente a nivel de interfaz de usuario y reportes financieros (como solicitó el cliente), sin la sobrecarga de mantener 3 esquemas de base de datos o 3 deployments distintos.
- **Alternativas descartadas:** Múltiples bases de datos (Database-per-tenant), esquemas separados (Schema-per-tenant).

### ADR-003: Manejo de Conectividad (Online-Only)
- **Decisión:** La aplicación es estrictamente dependiente de una conexión a internet activa.
- **Razón:** Evitar la altísima complejidad de implementar una estrategia "Local-First" y resolución de conflictos asíncrona cuando múltiples operarios modifican stock desde zonas sin cobertura.
- **Alternativas descartadas:** Sincronización Offline First.

### ADR-004: Generación de Remitos
- **Decisión:** Generación de PDFs orientada a uso interno/informal, renderizada preferentemente del lado del cliente (Frontend).
- **Razón:** No hay requisitos legales/fiscales (AFIP) que exijan firmas digitales pesadas o trazabilidad gubernamental en el backend.

## Supuestos (Assumptions)
1. **Suposición:** Los "colaboradores" (usuarios) están atados a una unidad de negocio, o bien los roles que se les asignan tienen un scope por negocio (ej. "Admin de Stock - Solo Perlitas").
2. **Suposición:** "Precio Costo" y "Precio Venta" en Finanzas implica que se registrarán compras de insumos para calcular el margen neto real.
