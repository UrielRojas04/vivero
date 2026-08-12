## Why

Actualmente, el borrado de registros en el sistema se realiza de forma física (hard delete), lo que puede romper la integridad referencial, perder el historial de datos financieros y de inventario, y complicar futuras auditorías. Implementar un mecanismo de borrado lógico (soft delete) asegura que los datos sigan existiendo en la base de datos pero sean invisibles para la lógica de negocio diaria, garantizando trazabilidad y seguridad sin afectar la experiencia del usuario.

## What Changes

- Agregar un campo `boolean deleted = false;` (o equivalente) en las entidades de la base de datos que requieren preservación histórica (por ejemplo: `Producto`, `Cliente`, `Venta`, `Gasto`, `Cheque`, `Insumo`, `Usuario`).
- Incorporar anotaciones de Hibernate (`@SQLDelete` y `@SQLRestriction`) a nivel de clase en las entidades afectadas. Esto interceptará automáticamente los comandos de eliminación para realizar un UPDATE (`deleted = true`) y filtrará los SELECT por defecto para ignorar los registros marcados como eliminados.
- Actualizar consultas personalizadas (Query methods, JPQL) en los repositorios donde sea necesario forzar o sobreescribir el filtro de soft delete.

## Capabilities

### New Capabilities
- `data-persistence-soft-delete`: Mecanismo centralizado de borrado lógico (Soft Delete) para proteger la integridad referencial y mantener historial de datos, utilizando anotaciones de Hibernate.

### Modified Capabilities

## Impact

- **Modelos JPA**: Se modificarán las clases del paquete `models` para incluir el atributo y las anotaciones correspondientes.
- **Base de Datos**: Se añadirá la columna `deleted` a las tablas. (Con `ddl-auto=update` se reflejará automáticamente, o se ajustará el script `DataInitializer`).
- **Frontend**: El cambio será totalmente transparente para la UI, ya que los endpoints dejarán de devolver los elementos eliminados lógicamente, comportándose igual que con un borrado físico.
