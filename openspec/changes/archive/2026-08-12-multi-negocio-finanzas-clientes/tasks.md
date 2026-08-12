## 1. Backend: Usuarios y Auth

- [x] 1.1 Modificar la entidad `Usuario` para agregar una relación `@ManyToMany` con `UnidadNegocio`.
- [x] 1.2 Actualizar `DataInitializer` para asignar al usuario jefe preexistente y a los nuevos usuarios la unidad "Vivero" por defecto (y "Herramientas" si aplica).
- [x] 1.3 Modificar `AuthResponseDTO` y el servicio de login para devolver un campo `negociosDisponibles` conteniendo la lista de negocios asignados al usuario logueado.

## 2. Backend: Aislamiento Clientes

- [x] 2.1 Modificar la entidad `Cliente` agregando la relación `@ManyToOne` con `UnidadNegocio`.
- [x] 2.2 Modificar `ClienteRepository` agregando o actualizando métodos de búsqueda para filtrar por `unidad_negocio_id` (y considerar búsquedas globales si es necesario).
- [x] 2.3 Actualizar `ClienteServiceImpl` para inyectar y usar el `UnidadNegocioContextHolder` en todos los métodos de lectura y escritura.

## 3. Backend: Aislamiento Finanzas (Cheques y Gastos)

- [x] 3.1 Modificar las entidades `Cheque` y `Gasto` agregando la relación `@ManyToOne` con `UnidadNegocio`.
- [x] 3.2 Modificar `ChequeRepository` y `GastoRepository` para añadir filtrado por `unidad_negocio_id`.
- [x] 3.3 Actualizar `ChequeService`, `GastoService` (y revisar `FinanzasServiceImpl`) para usar el contexto de negocio en listados y totales.

## 4. Frontend: Integración Auth y Negocios

- [x] 4.1 Modificar el método de `login` en `frontend/src/store/useAuthStore.js` para extraer `negociosDisponibles` desde el `AuthResponseDTO` y guardarlo en el store (junto a setear el primer negocio como activo si no lo está).
- [x] 4.2 En `DashboardLayout.jsx`, eliminar el `useEffect` que hacía un GET a `/api/negocios`, ya que la lista ahora proviene puramente de los claims/response del login.

## 5. Frontend: Verificación UI Clientes y Finanzas

- [x] 5.1 Realizar prueba de humo (end-to-end) creando un cliente y un gasto desde la vista de "Herramientas". Verificar que al cambiar a "Vivero", dichos registros no aparezcan en el listado.
