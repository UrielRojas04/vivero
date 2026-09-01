## Why

El jefe tiene un tercer negocio — venta de bolsas de abono — que hoy se lleva en cuadernos de papel. Lo opera junto a un colega que **no es empleado sino socio con reparto de ganancias**: el colega retira bolsas del invernadero, las vende desde su propio depósito a sus propios clientes, y de a ratos le rinde plata al jefe. Nadie sabe con certeza cuántas bolsas hay en cada lado ni cuánta plata debería tener el colega en un momento dado.

El sistema ya resuelve el 80% de esto para Vivero y Herramientas (clientes, ventas, cuenta corriente con pagos parciales, insumos, finanzas). Lo que falta es específico y acotado: **stock separado por ubicación física**, **atribución automática de operaciones a la cuenta que las carga (Jefe o Colega)** y **la rendición de dinero interna entre los dos socios**.

## What Changes

- **Tercera unidad de negocio "Abono"** sembrada en `DataInitializer`, reutilizando tal cual `Cliente`, `Venta`, `Pago`, `FacturaCliente` y `CuentaCorrienteDinero` — cero cambios en esos módulos, sólo alcance por unidad.
- **Catálogo por categorías**: las 7 categorías de bolsa son 7 `Producto` normales de la unidad Abono, cada uno con su `precio`. Sin campo "categoría" nuevo, sin receta, sin conversión insumo→producto.
- **Stock por ubicación (lo verdaderamente nuevo)**: entidad nueva `StockAbono` (producto + ubicación + cantidad) y su bitácora `MovimientoStockAbono`, con dos ubicaciones fijas: `INVERNADERO` y `DEPOSITO_COLEGA`. **No se toca `Producto.stock` ni `MovimientoStock`**, que siguen sirviendo a Vivero y Herramientas sin riesgo.
  - Producción diaria: alta directa de N bolsas de una categoría a `INVERNADERO`.
  - Traslado: resta de `INVERNADERO`, suma a `DEPOSITO_COLEGA`, en una sola transacción.
  - Vista de stock por categoría × ubicación.
  - La venta de Abono descuenta de la ubicación que corresponde a la cuenta activa.
- **Cuenta activa Jefe/Colega**: segundo switcher en el sidebar, visible **sólo** cuando la unidad activa es Abono, seteado una vez y persistido — clonando el patrón existente de `unidadNegocioActiva` (Zustand + `localStorage` + header HTTP + `ThreadLocal`). Toda venta y todo traslado cargado se atribuye automáticamente a esa cuenta, **sin ningún select por operación**. El colega **no** tiene login propio ni cambia el RBAC.
- **Rendición Jefe↔Colega**: entidad nueva `RendicionColega` (movimientos internos) más el cálculo del saldo en caja del colega = ventas al contado del colega + cobranzas de sus clientes a crédito − entregas ya rendidas al jefe. Formulario para registrar una entrega de dinero.
- **Dashboard de Liquidación**: reporte que cruza ventas por cuenta, plata física en cada lado y la compensación teórica según el % de reparto. Puramente informativo, no mueve plata.
- **% de reparto configurable** por unidad: campo nuevo `porcentajeRepartoColega` en `UnidadNegocio`, editable desde Configuración, siguiendo el precedente de `costoEnvioPorcentaje` / `ivaPorcentaje`.
- **Insumos alcanzados por unidad** — **BREAKING** (interno): `Insumo` hoy es global y no tiene `unidadNegocio`; se le agrega la relación y se retrofitea todo lo existente a Vivero (id 1). Sin esto, las camionadas de abono compradas a proveedores contaminarían las finanzas del Vivero.
- **Finanzas sin IDs hardcodeados** — **BREAKING** (interno): `FinanzasServiceImpl.resumen()` decide hoy con `unidadId == 1L` / `unidadId == 2L`. Se reemplaza por una capacidad declarada en `UnidadNegocio`, para que Abono use el modelo **gastos de insumo vs. ventas** (igual que Vivero) y **nunca** el costeo por capas de Herramientas.
- **Frontend generalizado a N unidades** — **BREAKING** (interno): `DashboardLayout` y `Finanzas.jsx` asumen dos unidades (`isHerramientas = id === 2`, `unidadNegocioActiva === '2'`). Se reemplaza el booleano por identidad de unidad, más un tema/acento propio para Abono.
- **Fuera de alcance explícito**: Pedidos a Proveedores, costeo por capas (`CapaCostoStock`), bandejas, siembras, remitos, cheques y cualquier login nuevo.

## Capabilities

### New Capabilities
- `negocio-abono`: la unidad Abono como tercera unidad de negocio — catálogo de 7 categorías como productos, qué módulos existentes alcanza (clientes, ventas, cuenta corriente, insumos, finanzas), qué módulos quedan ocultos, y el `%` de reparto configurable.
- `stock-abono-ubicaciones`: stock de bolsas desagregado por ubicación física, producción diaria, traslados Invernadero→Depósito Colega, vista consolidada y descuento de stock en la venta según la cuenta activa.
- `cuenta-abono-activa`: la cuenta operativa (Jefe/Colega) como contexto de sesión — selección, persistencia, propagación al backend y atribución automática de ventas y traslados sin preguntar por operación.
- `rendicion-colega`: relación financiera interna entre jefe y colega — cálculo del saldo en caja del colega, registro de rendiciones de dinero, y el dashboard de liquidación según el % acordado.

### Modified Capabilities
- `multi-negocio-core`: la propagación y el filtrado por unidad dejan de asumir dos unidades; el sistema soporta N unidades y el seed incorpora Abono.
- `catalogo-insumos`: los insumos pasan a estar alcanzados por unidad de negocio (hoy son globales y visibles/computables desde cualquier unidad).
- `finanzas-ui`: el resumen de rentabilidad deja de decidir por ID de unidad y pasa a decidir por capacidad declarada; Abono se computa con el modelo insumos-vs-ventas y suma una vista de liquidación.
- `frontend-core`: el layout, la navegación y la identidad visual dejan de ser binarios Vivero/Herramientas y admiten una tercera unidad, más el alojamiento del segundo switcher.

## Impact

**Backend — entidades nuevas**
- `models/UbicacionAbono.java` (enum), `models/CuentaAbono.java` (enum), `models/StockAbono.java`, `models/MovimientoStockAbono.java`, `models/RendicionColega.java`

**Backend — modificado**
- `models/UnidadNegocio.java`: `+ porcentajeRepartoColega`, `+ modeloCostoInsumos` (o flag equivalente)
- `models/Insumo.java`: `+ unidadNegocio` (**BREAKING**, requiere retrofit a Vivero)
- `models/Venta.java`: `+ cuentaAbono` (nullable, sólo poblado en Abono)
- `services/impl/FinanzasServiceImpl.java`: elimina `unidadId == 1L` / `== 2L`
- `repositories/InsumoRepository.java`: `sumarGastosInsumos` pasa a estar alcanzado por unidad
- `services/impl/InsumoServiceImpl.java`, `controllers/InsumoController.java`: alcance por unidad
- `services/impl/VentaServiceImpl.java`: bifurca el descuento de stock cuando la unidad es Abono
- `security/`: `CuentaAbonoFilter` + `CuentaAbonoContextHolder` (clones de `UnidadNegocioFilter` / `UnidadNegocioContextHolder`)
- `config/DataInitializer.java`: seed de la unidad Abono, sus 7 categorías y el retrofit de insumos

**Backend — endpoints nuevos**
- `/api/abono/stock`, `/api/abono/produccion`, `/api/abono/traslados`, `/api/abono/rendiciones`, `/api/abono/liquidacion`

**Frontend**
- `store/useAuthStore.js`: `+ cuentaAbonoActiva` / `setCuentaAbonoActiva`
- `api/axios.js`: `+ header X-Cuenta-Abono`
- `layouts/DashboardLayout.jsx`: segundo switcher, navegación e identidad para 3 unidades
- `pages/Finanzas.jsx`: quita los literales `'1'` / `'2'`
- Páginas nuevas: `StockAbono.jsx`, `ProduccionAbono.jsx`, `TrasladosAbono.jsx`, `RendicionColega.jsx`, `LiquidacionAbono.jsx`
- `pages/Configuracion.jsx`: campo `% de reparto`
- `App.jsx`: rutas nuevas

**Base de datos**
- Tablas nuevas: `stock_abono`, `movimientos_stock_abono`, `rendiciones_colega`
- Columnas nuevas: `insumos.unidad_negocio_id`, `ventas.cuenta_abono`, `unidades_negocio.porcentaje_reparto_colega`
- Manejado por `ddl-auto` + retrofit en `DataInitializer`, siguiendo la práctica del repo

**No se toca**: `Producto.stock`, `MovimientoStock`, `CapaCostoStock`, `HistorialBandejas`, `Siembra`, `Pedido`, `Cheque`, el modelo RBAC y las tablas de usuarios.

## Gobernanza

Nivel **MEDIO** (lógica de negocio y dominio financiero, no autenticación ni facturación regulatoria). Toca dinero real, stock real y ventas reales, y modifica dos rutas compartidas con negocios en producción (`Insumo` y `FinanzasServiceImpl`).

Implicancias para el apply:
1. Implementar con **checkpoints**, exponiendo al usuario cada decisión no obvia (especialmente el retrofit de insumos y el reemplazo de los IDs hardcodeados en Finanzas).
2. Las tareas que tocan código compartido de Vivero/Herramientas exigen la red de seguridad de TDD: correr los tests existentes ANTES de modificar y capturar la línea de base.
3. Ninguna tarea de Abono puede alterar números ya visibles de Vivero o Herramientas. El invariante es explícito: con Abono sembrado pero sin datos, los dashboards de Vivero y Herramientas devuelven exactamente los mismos valores que antes del change.
