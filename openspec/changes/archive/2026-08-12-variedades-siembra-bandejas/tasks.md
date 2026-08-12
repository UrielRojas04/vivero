## 1. Backend: Modelos y Repositorios

- [x] 1.1 Crear entidad `VariedadPlanta` (`id`, `nombre`, `descripcion`, `diasCrecimiento`).
- [x] 1.2 Crear entidad `VariedadBandeja` (`id`, `nombre`, `cantidadCeldas`).
- [x] 1.3 Modificar entidad `Siembra` (eliminar campo `variedad` String, agregar relaciones `@ManyToOne` a `VariedadPlanta` y `VariedadBandeja`).
- [x] 1.4 Crear `VariedadPlantaRepository` y `VariedadBandejaRepository`.
- [x] 1.5 Actualizar `SiembraDTO` para reflejar las nuevas relaciones (devolver IDs o nombres según convenga para el front).
- [x] 1.6 Crear `VariedadPlantaDTO` y `VariedadBandejaDTO`.

## 2. Backend: Servicios y Controladores

- [x] 2.1 Crear `VariedadPlantaService` y su implementación (ABM).
- [x] 2.2 Crear `VariedadBandejaService` y su implementación (ABM).
- [x] 2.3 Actualizar `SiembraServiceImpl` para manejar la creación y actualización con las nuevas entidades (guardar y mapear correctamente los DTOs).
- [x] 2.4 Crear `VariedadPlantaController` y `VariedadBandejaController`.

## 3. Frontend: API y Configuración

- [x] 3.1 Crear `variedades-plantas.api.js` y `variedades-bandejas.api.js`.
- [x] 3.2 Actualizar `siembras.api.js` si hay cambios en los endpoints o payload (solo verificar).
- [x] 3.3 Agregar las nuevas rutas en `App.jsx` bajo el menú de perfil del jefe (`/variedades-plantas`, `/variedades-bandejas`).
- [x] 3.4 Agregar los accesos en el menú o donde corresponda (ej. "Catálogo de Variedades" en `Sidebar.jsx`).

## 4. Frontend: Vistas y Componentes (ABMs)

- [x] 4.1 Crear `VariedadesPlantas.jsx` y su modal `VariedadPlantaForm.jsx`.
- [x] 4.2 Crear `VariedadesBandejas.jsx` y su modal `VariedadBandejaForm.jsx`.
- [x] 4.3 Actualizar `SiembraForm.jsx` para reemplazar el input de texto por dos desplegables que consuman las APIs de Plantas y Bandejas.
- [x] 4.4 Lógica de `SiembraForm.jsx`: al seleccionar una Planta, auto-calcular la fecha estimada de entrega usando la fecha actual + `diasCrecimiento`. Al seleccionar una bandeja, mostrar la capacidad como sugerencia de cantidad inicial.
- [x] 4.5 Actualizar `Siembras.jsx` (tabla principal) para renderizar el nombre de la planta y la bandeja en lugar del string plano.
