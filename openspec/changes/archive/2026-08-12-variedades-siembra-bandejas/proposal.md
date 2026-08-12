## Why

El usuario necesita llevar un mejor control sobre qué tipo de bandeja se utiliza y qué planta específica se siembra. Actualmente la variedad de la siembra era texto libre, lo que impide analizar métricas como tiempos de crecimiento o estandarizar los nombres. Además, al conectar la siembra con el tamaño de la bandeja, se podrá saber la capacidad máxima de producción por siembra.

## What Changes

- Se crea la sección "Variedad de Bandejas" para registrar modelos de bandejas (nombre y cantidad de celdas).
- Se crea la sección "Variedad de Plantas" para estandarizar lo que se cultiva (nombre, descripción, días de crecimiento).
- Se modifica la entidad `Siembra` para que en vez de tener `variedad` como texto libre, referencie a una `VariedadPlanta` y a una `VariedadBandeja`.
- Se actualiza el modal de "Nueva Siembra" para seleccionar estas dos nuevas entidades mediante selectores.
- Todo esto estará bajo la vista del perfil "jefe" (requerirá permisos apropiados).

## Capabilities

### New Capabilities
- `variedades-plantas`: Gestión de variedades de plantas cultivables (CRUD, días de crecimiento estimados).
- `variedades-bandejas`: Gestión de tipos de bandejas para sembrar (CRUD, cantidad de celdas).

### Modified Capabilities
- `gestion-siembras`: Reemplazo del campo de texto libre "variedad" por referencias a las nuevas entidades Planta y Bandeja en la creación y visualización.

## Impact

- **Backend**: Nuevos modelos `VariedadPlanta` y `VariedadBandeja`, sus repositorios, servicios y controladores. Modificación del modelo `Siembra` y `SiembraDTO`.
- **Frontend**: Nuevas vistas o modales para los ABMs correspondientes, actualizando el formulario `SiembraForm.jsx`.
- **Base de Datos**: Migraciones/actualización de esquema en PostgreSQL para agregar nuevas tablas y foreign keys a `siembras`.
