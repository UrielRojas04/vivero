## 1. Backend: Modelo Gasto y Persistencia

- [x] 1.1 Crear la entidad JPA `Gasto` (con `id`, `concepto`, `monto`, `fecha`).
- [x] 1.2 Crear `GastoRepository` que extienda `JpaRepository`.
- [x] 1.3 Crear `GastoDTO` con las propiedades requeridas.
- [x] 1.4 Crear `GastoService` con los métodos `crearGasto()` y `listarGastos()` (con Paginación ordenada por defecto DESC).
- [x] 1.5 Crear `GastoController` con endpoints `POST /api/gastos` y `GET /api/gastos`, protegidos con `@PreAuthorize("hasAuthority('ADMIN_DB')")`.

## 2. Backend: Finanzas Controller

- [x] 2.1 Verificar y modificar si corresponde el controlador de Finanzas / Ingresos para que los listados o reportes ya devueltos ordenen por fecha/id DESC de forma predeterminada usando `Sort.by(Sort.Direction.DESC, "id")`.

## 3. Frontend: Servicios API y Estado

- [x] 3.1 Crear el archivo `src/api/gastos.api.js` con los métodos GET paginados y POST usando `axiosInstance`.
- [x] 3.2 Si es necesario, configurar los queries de TanStack Query para fetching/mutating de gastos.

## 4. Frontend: Pantalla de Finanzas

- [x] 4.1 Modificar `Finanzas.jsx` para cambiar el layout de la sección principal a un grid de 2 columnas (ej: `md:grid-cols-2`).
- [x] 4.2 Lado izquierdo: Renderizar la UI actual de ganancias/ingresos (Ventas vs Costos) tal cual está.
- [x] 4.3 Lado derecho: Crear un componente de subsección para "Gastos" (o renderizarlo in-line).
- [x] 4.4 Implementar el formulario rápido dentro de la subsección Gastos para crear uno nuevo (concepto + monto) e integrarlo con la mutación.
- [x] 4.5 Implementar el listado paginado/scrolleable de Gastos en esa misma subsección, alimentado por el endpoint.
- [x] 4.6 Asegurar que el cálculo de `gananciaNeta` global o del período descuente también el total de gastos obtenidos, si el alcance del dashboard lo requiere. (Validar con el usuario o specs si se unifica el cálculo).
