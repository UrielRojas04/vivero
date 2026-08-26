## Context

Actualmente el sistema de ventas requiere seleccionar un cliente existente de la base de datos para poder registrar una venta. Esto es un problema para la unidad de negocio "Herramientas" (venta al mostrador), donde muchos clientes son casuales. El usuario solicitó poder ingresar los datos del cliente (Nombre y Teléfono) directamente desde la pantalla de nueva venta. Si el cliente es casual, sus datos se usan solo para la factura; si no lo es, se crea en la base de datos y se usa para la venta.

## Goals / Non-Goals

**Goals:**
- Permitir la carga de clientes "express" desde la UI de creación de Venta.
- Soportar el concepto de "cliente casual" (no se persiste en la tabla `clientes`, pero su información queda en el comprobante).
- Limitar esta funcionalidad exclusivamente a la unidad de negocio "Herramientas".
- Reutilizar el endpoint actual de ventas para minimizar el impacto.

**Non-Goals:**
- Modificar el módulo completo de clientes.
- Permitir cargar más datos que Nombre y Teléfono desde la vista "express".
- Aplicar esta lógica a la unidad de negocio "Vivero".

## Decisions

**1. Representación del Cliente Casual en el JSON de Venta**
*Decisión*: En lugar de enviar un `clienteId` en el payload de creación de venta, el frontend enviará un objeto `clienteAdHoc` con los datos `{ nombre, telefono, casual (boolean) }`. 
*Rationale*: Evita romper la estructura de la base de datos de clientes para guardar "basura". El backend, al recibir `clienteAdHoc`:
- Si `casual == true`: no crea el cliente. Guarda el nombre y teléfono en un campo nuevo en la entidad `Venta` (ej. `clienteNombreCasual` y `clienteTelefonoCasual`) o los embebe en la `Factura`.
- Si `casual == false`: el backend primero crea el `Cliente`, lo persiste, obtiene su ID, y luego asigna ese cliente real a la `Venta`.

**2. Adaptación del Modelo Venta**
*Decisión*: Agregar campos `clienteNombreCasual` (String) y `clienteTelefonoCasual` (String) a la entidad `Venta`, y hacer que la relación `cliente` sea nullable (o manejada según si hay ID o datos casuales).
*Rationale*: Las ventas a clientes casuales no tendrán un `Cliente` asociado en la base de datos (clave foránea nula), pero conservarán la info del cliente para el remito o factura.

**3. Restricción por Unidad de Negocio en Frontend**
*Decisión*: El botón o formulario de cliente express en la UI de ventas solo se renderizará si la unidad de negocio actual seleccionada (en Zustand) es "Herramientas".

## Risks / Trade-offs

- [Risk] Claves foráneas nulas: La base de datos actualmente podría exigir que una venta siempre tenga un `cliente_id` no nulo.
  - → Mitigación: Actualizar el schema de la base de datos para permitir `cliente_id` nulo en la tabla `ventas` SI la venta tiene los campos casuales llenos.
- [Risk] Búsqueda de ventas: Al listar ventas, el nombre del cliente puede venir de la tabla `clientes` o de los campos casuales.
  - → Mitigación: El backend (o un getter de la entidad `Venta`) debe unificar esto, devolviendo el nombre casual si el `cliente` es nulo.
