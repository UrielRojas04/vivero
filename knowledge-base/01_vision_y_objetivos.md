# Visión y Objetivos

## Propósito del Proyecto
El "Sistema Vivero" evoluciona de un software monolítico de gestión básica a una plataforma ERP (Enterprise Resource Planning) modular. El propósito es centralizar la gestión operativa, logística y financiera de tres unidades de negocio separadas lógicamente (Plantas, Sustratos y Perlitas, Herramientas), permitiendo un control granular de stock, trazabilidad de deudas físicas (bandejas), y márgenes de ganancia. 

## Objetivos por Actor
- **El Jefe (Administrador Global):** Tener visibilidad financiera exacta (costo vs venta) de las 3 unidades de negocio por separado, gestionar usuarios y permisos granulares.
- **Operario de Invernadero:** Descontar stock y registrar ventas/movimientos en tiempo real desde el celular (online).
- **Encargado de Logística:** Controlar las devoluciones y deudas de bandejas de los clientes.
- **El jefe va a crear estos roles y asignarles permisos**
- **Cliente:** Recibir comprobantes/remitos de sus compras de manera digital (PDF/Imagen) por canales informales (ej. WhatsApp).

## Alcance (In Scope)
- Soporte Multi-Tenant lógico (3 negocios separados en la interfaz y finanzas, operando bajo la misma plataforma).
- Sistema RBAC (Role-Based Access Control) modular por permisos (Stock, Finanzas, Bandejas).
- Sincronización de UI en tiempo real vía Server-Sent Events (SSE) y React Query.
- Generación de Remitos en formato PDF/Imagen desde el cliente (Frontend).
- Sistema exclusivo de funcionamiento Online.

## Fuera de Alcance (Out of Scope)
- **Facturación Electrónica:** No hay integración con AFIP ni entes gubernamentales.
- **Modo Offline:** El sistema bloqueará operaciones si no hay conexión a internet; no habrá resolución de conflictos asíncrona.
- **Reportes Financieros Cruzados:** Las finanzas de los 3 negocios no se cruzan ni se consolidan en un balance único.
