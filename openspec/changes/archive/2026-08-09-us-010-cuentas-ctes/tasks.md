## 1. Backend: Entidades de Cuentas Corrientes

- [x] 1.1 Crear entidad JPA `CuentaCorrienteDinero` con `id`, `cliente` (relación OneToOne con Cliente) y `balancePesos` (BigDecimal).
- [x] 1.2 Crear entidad JPA `CuentaCorrienteBandejas` con `id`, `cliente` (relación OneToOne con Cliente) y `balanceBandejas` (Integer).
- [x] 1.3 Actualizar la entidad `Cliente` para mapear de manera bidireccional (con `mappedBy`) a `CuentaCorrienteDinero` y `CuentaCorrienteBandejas` usando `cascade = CascadeType.ALL, fetch = FetchType.LAZY`.

## 2. Backend: DTO y Servicio (Inicialización y Exposición)

- [x] 2.1 Actualizar `ClienteDTO` para incluir `balanceDinero` (BigDecimal) y `balanceBandejas` (Integer).
- [x] 2.2 Actualizar `ClienteRepository` con un `@EntityGraph(attributePaths = {"cuentaCorrienteDinero", "cuentaCorrienteBandejas"})` o una `@Query` con `JOIN FETCH` en los métodos de listado para evitar N+1.
- [x] 2.3 En `ClienteServiceImpl.create(...)`, instanciar y asignar a `0` ambas cuentas corrientes al nuevo cliente antes del `save`.
- [x] 2.4 Actualizar el mapeo de Entidad a DTO (en `ClienteServiceImpl`) para extraer los balances desde las cuentas asociadas. (Manejar nulls en caso de clientes viejos si es que la base no arranca limpia).

## 3. Frontend: Adaptación UI (Cuentas Corrientes)

- [x] 3.1 Actualizar la tabla desktop en `Clientes.jsx` agregando las columnas "Saldo Dinero" y "Saldo Bandejas".
- [x] 3.2 Actualizar las cards de la vista mobile en `Clientes.jsx` agregando pequeñas píldoras o insignias con los saldos.
- [x] 3.3 Colorear los saldos según su valor (Ej: verde para saldos a favor o 0, rojo para deuda de dinero, naranja/rojo para deuda de bandejas).

## 4. Testing e Integración

- [x] 4.1 Reconstruir backend (Docker) para aplicar migraciones/cambios de Hibernate y compilar Frontend.
- [x] 4.2 Probar crear un cliente nuevo y verificar que nazca con saldo `$0` y `0 bandejas`.
- [x] 4.3 Verificar que el listado de clientes carga correctamente con la nueva información visual (N+1 queries comprobados en consola).
