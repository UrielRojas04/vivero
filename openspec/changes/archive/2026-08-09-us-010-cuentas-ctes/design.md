## Context

En el sistema, los clientes acumulan deudas o saldos a favor (tanto en dinero físico/transferencia como en bandejas retornables). Según la base de conocimiento (`04_modelo_de_datos.md`), estas cuentas corrientes tienen un alcance **global** (se vinculan al `Cliente` y no a la `UnidadNegocio`).

## Goals / Non-Goals

**Goals:**
- Crear la base de datos estructural para guardar saldos de bandejas y dinero.
- Inicializar estos saldos en `0` cada vez que se crea un nuevo cliente en el sistema.
- Exponer los balances en el listado de clientes de la UI para una rápida visualización.

**Non-Goals:**
- **NO** se implementará en este change el registro histórico de movimientos (ej. sumar deuda tras una venta). Solo dejaremos la estructura base (balances) preparada. Los movimientos de caja y el impacto de las ventas se harán en los changes de Ventas (`us-012`).

## Decisions

1. **Estructura de Entidades (1:1)**:
   - Se crearán `CuentaCorrienteDinero` (con `BigDecimal balancePesos`) y `CuentaCorrienteBandejas` (con `Integer balanceBandejas`).
   - Se vincularán al `Cliente` usando `@OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)`.
   
2. **DTO y Controller**:
   - `ClienteDTO` será extendido para incluir `balanceDinero` y `balanceBandejas`.
   - Esto evita llamadas adicionales al servidor; la grilla de clientes tendrá los datos listos al cargar.

3. **Inicialización Automática**:
   - En `ClienteServiceImpl.create(...)`, antes de guardar el cliente, se instanciarán ambas cuentas en `0` y se le asignarán al nuevo `Cliente`.

## Risks / Trade-offs

- **[Riesgo] Problema N+1 en las consultas de JPA**: Al tener cuentas 1:1 en LAZY, si se consultan 100 clientes y luego se mapea su balance, habrá 100 consultas extras.
  - **Mitigación**: Usaremos `@EntityGraph` o una query con `JOIN FETCH` en `ClienteRepository.findAll()` para asegurar que se traigan las cuentas corrientes en una sola consulta SQL.
