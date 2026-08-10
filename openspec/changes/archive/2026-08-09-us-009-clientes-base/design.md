## Context

La aplicación actualmente maneja operaciones aisladas por Unidad de Negocio (tenant). Sin embargo, el dominio de `Cliente` es de alcance global: un cliente no le pertenece a una unidad en particular, le pertenece al Vivero en su conjunto. Se necesita crear la entidad base para poder registrar quién compra qué y, posteriormente, poder asociarle deudas o saldos a favor (en cambios futuros).

## Goals / Non-Goals

**Goals:**
- Implementar la entidad JPA `Cliente` (global, sin `unidad_id`).
- Implementar su ciclo de vida CRUD básico (DTO, Repository, Service, Controller).
- Crear la pantalla `Clientes.jsx` en el frontend, siguiendo la estética de tarjetas para mobile y tabla para desktop (similar a Insumos).
- Utilizar el formulario modal (`ClienteForm`) para creación y edición.

**Non-Goals:**
- No se implementarán las cuentas corrientes de dinero o bandejas en este change (eso corresponde a `us-010-cuentas-ctes`).
- No se vincularán los clientes a ventas todavía.

## Decisions

- **Global Scope (Sin Tenant):** A diferencia de `Producto` o `Insumo` que filtran por unidad de negocio del usuario actual, el `ClienteController` devolverá todos los clientes de la base de datos, independientemente de qué unidad esté operando el empleado. Esto permite que el cajero de "Herramientas" vea al mismo cliente que creó ayer el cajero de "Plantas".
- **Teléfono como String:** El campo `telefono` será guardado como String limpio para facilitar, a futuro, la generación de links a WhatsApp API (`wa.me/numero`).
- **Mobile-first en Frontend:** Al igual que Insumos, la lista se renderizará como tarjetas (`cards`) en dispositivos móviles para una mejor lectura y botones de acción accesibles con el dedo.

## Risks / Trade-offs

- **Privacidad de datos:** Al ser global, cualquier empleado de cualquier unidad puede ver los datos de todos los clientes.
  *Mitigación*: En este modelo de negocio es aceptable, ya que los vendedores rotan y necesitan identificar a los clientes recurrentes sin importar qué estén comprando.
- **Borrado Físico vs Lógico:** Si permitimos borrar clientes físicamente (`DELETE`), más adelante cuando haya ventas, saltarán errores de Foreign Key (violación de integridad).
  *Mitigación*: Por ahora implementaremos borrado físico porque no hay relaciones. En `us-012-ventas-core` agregaremos borrado lógico o impediremos borrar clientes con historial de compras.
