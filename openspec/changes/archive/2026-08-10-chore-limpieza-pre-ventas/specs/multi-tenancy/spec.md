## REMOVED Requirements

### Requirement: Soporte para Múltiples Negocios (Tenants)
**Reason**: El sistema aplanó su modelo de RBAC (ADR-002) y ya no requiere separar la data por sucursal de manera aislada en la base de datos a través de UnidadNegocio.
**Migration**: Eliminar la tabla y modelo `UnidadNegocio` y sus Foreign Keys. Todo opera en un único entorno global (Single Tenant).
