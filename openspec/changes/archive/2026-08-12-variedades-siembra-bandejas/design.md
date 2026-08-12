## Context

El módulo de siembras actual permite ingresar el nombre de la variedad como texto libre. Esto complica la estandarización, la predicción de fechas y el control de capacidades. El usuario desea poder parametrizar qué planta se va a sembrar (con sus días de crecimiento) y en qué tipo de bandeja (con su capacidad en celdas).

## Goals / Non-Goals

**Goals:**
- Crear los modelos `VariedadPlanta` (nombre, descripción, diasCrecimiento) y `VariedadBandeja` (nombre, cantidadCeldas).
- Modificar el modelo `Siembra` para reemplazar el texto `variedad` por referencias ManyToOne a `VariedadPlanta` y `VariedadBandeja`.
- Exponer endpoints CRUD para las dos nuevas entidades.
- Actualizar el frontend para que el modal de "Nueva Siembra" permita elegir estas variedades desde listas desplegables en lugar de un input de texto.

**Non-Goals:**
- Control estricto de inventario físico de las bandejas (no llevaremos stock de bandejas vacías por ahora, solo son tipos de molde).
- Refactorización de siembras pasadas que ya tienen texto libre (el sistema puede manejar nulos o hacer una migración simple si es necesario, pero no es el foco hacer un histórico retroactivo complejo).

## Decisions

- **Relaciones JPA:** En `Siembra`, las relaciones hacia `VariedadPlanta` y `VariedadBandeja` serán `@ManyToOne`.
- **Modificación de Siembra:** El campo original `variedad` se mantendrá momentáneamente o se eliminará para dar paso a `variedadPlanta`. Dado que `Siembra` recién se creó, podemos simplemente eliminar la columna `variedad` String y agregar los nuevos IDs.
- **Cálculo de Fecha Estimada:** En el frontend, al seleccionar una `VariedadPlanta`, se puede auto-completar la `fechaEstimada` sumando `diasCrecimiento` a la fecha de hoy, dándole al usuario un excelente UX. La cantidad inicial sembrada puede ser el múltiplo de la cantidad de celdas de la bandeja (o simplemente el usuario lo escribe a mano, pero la bandeja ayuda de referencia).
- **Seguridad:** El ABM de estas variedades requerirá rol de `ADMIN_DB` o permisos específicos configurados en el perfil del jefe.

## Risks / Trade-offs

- **Migración de Siembras Existentes:** Ya existen siembras cargadas con el campo string.
  - *Mitigación:* Como el módulo es extremadamente nuevo, podemos borrar/modificar la tabla y arrancar limpio, o bien permitir que el ID sea nulo para siembras viejas y mantener el string viejo como fallback. Optaremos por requerir los nuevos campos y limpiar datos de prueba.
