## Context

El Vivero crecerá para incluir otros rubros (Sustratos). Para no tener un backend por cada rubro, usaremos Multi-Tenancy lógico.
Ya tenemos roles y permisos. Ahora necesitamos que esa relación dependa del Tenant.

## Goals / Non-Goals

**Goals:**
- Crear la entidad `UnidadNegocio` (tenant).
- Crear una entidad puente `UsuarioUnidadRol` que relacione: `Usuario` + `UnidadNegocio` + `Rol`.
- Modificar el sistema JWT para que el usuario, al hacer login, especifique la unidad de negocio a la que entra.
- Agregar el `tenantId` a los claims del JWT.
- Eliminar la relación directa `@ManyToMany` que teníamos entre `Usuario` y `Rol` porque ahora pasa a ser gestionada por la nueva tabla puente con la unidad de negocio.

**Non-Goals:**
- Implementar filtros automáticos de hibernate por Tenant en las demás tablas (eso se hará cuando creemos Productos e Insumos). Solo armamos la arquitectura base de seguridad.

## Decisions

- **Modelo de Datos:**
  - `Usuario` (1) -> (N) `UsuarioUnidadRol`
  - `UnidadNegocio` (1) -> (N) `UsuarioUnidadRol`
  - `Rol` (1) -> (N) `UsuarioUnidadRol`
- **Login Request:** El DTO de Auth deberá cambiar para recibir `username`, `password`, y opcionalmente `unidadNegocioId`. Si el usuario pertenece a una sola, se puede auto-seleccionar. Si no envía nada y pertenece a varias, devolver error pidiendo que seleccione. Por simplicidad inicial: obligaremos a mandar el `unidadNegocioId` en el Request (o un endpoint previo para listarle sus unidades).
- **JWT:** El token tendrá un claim custom: `"tenant_id": 1`. 

## Risks / Trade-offs

- **[Risk]** Refactorizar la tabla puente antigua romperá datos existentes.
  - **Mitigation**: Como estamos en la fase inicial (us-003), simplemente borramos las tablas y que Hibernate/DataInitializer las recree con la nueva estructura.
