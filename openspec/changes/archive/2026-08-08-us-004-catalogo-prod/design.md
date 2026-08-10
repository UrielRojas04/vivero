## Context

El sistema ya cuenta con la estructura base de seguridad (JWT) y el modelo de negocio para soportar Multi-Tenancy mediante roles asociados a unidades de negocio (sesión unificada global). Ahora se necesita empezar a registrar el inventario del Vivero. Los productos (plantas) pertenecen a la Unidad de Negocio principal (Vivero). Para cumplir con las reglas arquitectónicas (Domain Object Security), los controladores deben usar un evaluador de permisos o validaciones que garanticen que el usuario que intenta crear o leer un producto tiene los permisos adecuados en el Vivero.

## Goals / Non-Goals

**Goals:**
- Implementar el CRUD básico (Create, Read, Update, Delete) de productos de forma segura.
- Asegurar los endpoints utilizando las autoridades pre-cargadas en el token (ej. `VIVERO_ESCRIBIR_VENTAS` o `VIVERO_LEER_STOCK`).
- Mantener la separación de responsabilidades: DTOs para el Controller, y Entidades para Repository/Service.

**Non-Goals:**
- Implementar transacciones de compra/venta o manejo de inventario avanzado en este scope.
- Implementar subida de imágenes (se manejará a futuro).

## Decisions

- **Domain Object Security (Prefixed Authorities)**: Para verificar los permisos sin ensuciar los controllers, usaremos Spring Security `@PreAuthorize`. Dado que el nombre de la unidad es estático para productos (Vivero), podemos verificar la autoridad prefijada directamente: `@PreAuthorize("hasAuthority('VIVERO_ESCRIBIR_VENTAS')")`.
- **Relación con UnidadNegocio**: Aunque por ahora los productos sean solo del vivero, se agregará un campo `unidadNegocio` al producto, para mantener el modelo limpio y permitir un filtrado dinámico en el futuro.
- **Service Layer**: Toda validación de negocio y mapeo Entidad <-> DTO ocurrirá dentro de la capa `@Service`.

## Risks / Trade-offs

- **Acoplamiento de Strings de Permisos** → Mitigación: Usaremos constantes estáticas (ej. `SecurityConstants.VIVERO_WRITE`) en lugar de strings sueltas para evitar errores de tipeo en las anotaciones `@PreAuthorize`.
