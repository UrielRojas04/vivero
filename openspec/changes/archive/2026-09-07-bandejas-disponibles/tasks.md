## 1. Backend

- [x] 1.1 Crear DTO `BandejasDisponiblesDTO` (String variedad, int stockFisico, int encargadas, int disponible).
- [x] 1.2 Agregar método en `RegistroSemillaRepository` para obtener la suma de `cantidadBandejas` agrupada por `VariedadPlanta.nombre` para registros activos.
- [x] 1.3 Implementar `obtenerBandejasDisponibles` en `EstadisticasService` que cruce el stock de `Producto` (unidadId=1) con las bandejas encargadas y ensamble el DTO.
- [x] 1.4 Agregar endpoint `GET /api/estadisticas/bandejas-disponibles` en `EstadisticasController`.

## 2. Frontend

- [x] 2.1 Agregar función `getBandejasDisponibles` en `frontend/src/api/estadisticas.js`.
- [x] 2.2 Crear componente `BandejasDisponiblesList.jsx` que muestre una tabla o lista con las variedades y sus columnas (Stock Físico, Encargadas, Disponible).
- [x] 2.3 Condicionar el componente en `Dashboard.jsx` para que solo se muestre si la unidad de negocio activa es Vivero (id='1').
- [x] 2.4 Ajustar el layout del Dashboard para acomodar la nueva tarjeta.
