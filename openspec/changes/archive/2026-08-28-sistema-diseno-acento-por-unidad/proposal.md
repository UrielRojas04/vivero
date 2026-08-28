## Why

El dueño del negocio encargó un rediseño visual completo del ERP a una herramienta de diseño externa y trajo de vuelta la especificación cerrada (`design/implementacion.md` + `design/vivero-tokens.css` + mockups en `design/UI mockups request/`). Hoy el frontend usa una paleta emerald cableada archivo por archivo (~2.500 ocurrencias de clases Tailwind literales en 51 archivos), sin distinción entre el verde "de marca" y el verde "semántico de estado", y sin ninguna diferenciación visual entre las dos unidades de negocio (Vivero y Herramientas): el operario no tiene una señal de contexto que le diga en cuál está trabajando.

Este change **ejecuta fielmente** esa especificación ya definida. No hay decisiones de diseño que tomar: hay que trasladar los tokens, cablear el acento por unidad y barrer el frontend entero para que use los tokens en vez de literales.

## What Changes

- **Sistema de tokens único en `frontend/src/index.css`**: se reemplaza el bloque `@theme` actual por la paleta neutral cálida compartida (`paper`, `canvas`, `line`, `line-strong`, `thead`, `faint`, `muted`, `body`, `ink`), la escala semántica fija (`ok`, `warn`, `danger`, cada una con `-ink`/`-bg`/`-line`), tipografía IBM Plex Sans/Mono y radios chatos (`--radius-base: 2px`, `--radius-panel: 4px`).
- **Acento por unidad de negocio**: `--color-accent` se define de forma indirecta (`var(--accent)`), y los bloques `[data-unidad="vivero"]` / `[data-unidad="herramientas"]` (copiados tal cual de `design/vivero-tokens.css`) fijan el valor. `DashboardLayout` setea `document.documentElement.dataset.unidad` según la unidad activa. Un solo interruptor retiñe todo el árbol; **no** se duplican componentes ni se pasan props de tema.
- **Modo oscuro** vía el bloque `@media (prefers-color-scheme: dark)` de la spec (redefine neutrales, semánticos y acentos).
- **Barrido de clases en 51 archivos** del frontend: literales Tailwind (`bg-emerald-600`, `bg-white`, `border-gray-200`, `rounded-xl`, `shadow-sm`, …) → tokens (`bg-accent`, `bg-paper`, `border-line`, `rounded-base`, borde 1px). Importes numéricos pasan a `font-mono tabular-nums`.
- **Separación explícita marca vs. semántica**: los verdes/ámbar/rojos que hoy codifican un **estado de negocio** (pagado / parcial / deuda / vencido / stock) pasan a `ok`/`warn`/`danger` (colores fijos, idénticos en ambas unidades). Sólo el verde de **marca/interacción** (botón primario, nav activo, focus ring, link) pasa a `accent`. Esta separación no existe hoy y es la razón por la que el barrido **no puede** hacerse con find-replace ciego.
- **Sidebar rediseñado** (`DashboardLayout.jsx`): barra de identidad de 4px en `bg-accent`, cabecera de logo de 104px con el logo real por unidad (Vivero sobre papel; Herramientas sobre placa oscura `--accent-plate`), placa "UNIDAD DE NEGOCIO" en `bg-accent-soft` reemplazando visualmente al `<select>` gris, e ítem activo con `bg-accent-soft border-l-[3px] border-accent` (sin `rounded-lg`).
- **Login desmarcado**: `Login.jsx` deja de usar el ícono `Leaf` y el título "Vivero ERP". Pasa a ser una pantalla neutra, sin logo ni acento de ninguna unidad — la unidad todavía no se conoce en el momento del login.
- **`font-factura` se elimina**: `--font-factura` desaparece del `@theme` y su única ocurrencia real (`FacturaCliente.jsx`) se borra; IBM Plex Sans pasa a ser la fuente global, así que no hay cambio visual por esta eliminación.
- **Assets**: los logos `IL_Marca.FINAL-01.png` y `logo_herramientas_sin_fondo.png` se copian de `logos/` a `frontend/src/assets/` (directorio nuevo) para poder importarlos desde Vite.
- **NO cambia**: flujos, campos, lógica de negocio, endpoints, navegación, permisos, ni nada del backend. Es un rediseño visual puro.

## Capabilities

### New Capabilities
- `sistema-diseno-visual`: el sistema de diseño transversal del frontend — tokens de color/tipografía/espaciado/radio, la regla de acento por unidad de negocio vía `data-unidad`, la separación normativa entre color de marca y color semántico, y la presentación de importes en tipografía monoespaciada tabular.

### Modified Capabilities
- `frontend-core`: el requisito "Diseño y UI" cambia de contrato — de un diseño "moderno (ej. glassmorphism)" definido de forma laxa a un sistema de diseño editorial y plano gobernado por tokens, con acento condicionado por la unidad de negocio activa y una pantalla de login sin marca de unidad.

## Impact

**Frontend (único afectado). 51 archivos + 2 fundacionales + assets:**

- Fundacionales: `frontend/src/index.css`, `frontend/index.html`, `frontend/src/layouts/DashboardLayout.jsx`.
- `frontend/src/pages/` (22 archivos): FacturaCliente, Finanzas, NuevaVenta, Productos, UsuariosAdmin, Siembras, CuentaCorrienteCliente, Pedidos, Insumos, Cheques, PedidoNuevo, Clientes, Configuracion, Proveedores, Facturas, VariedadesPlantas, HistorialVentas, VariedadesBandejas, DevolucionBandejas, Login, VentasLayout, Dashboard.
- `frontend/src/components/` (22 archivos) + `frontend/src/components/pedidos/` (4 archivos).
- `frontend/src/utils/` (3 archivos: `chequeDisplay.js`, `saldoDisplay.js`, `bandejasDisplay.js` — verificados como 100 % semánticos).
- Assets nuevos: `frontend/src/assets/` (directorio nuevo con los 2 logos).

**Sin impacto**: backend, base de datos, API, contratos DTO, permisos RBAC, rutas de React Router.

**Riesgo principal**: el volumen. 51 archivos × ~2.500 ocurrencias, con una regla de criterio (marca vs. semántica) que hay que aplicar archivo por archivo. El plan de ejecución por grupos con checkpoints intermedios obligatorios está en `design.md`.

**Riesgo puntual**: `FacturaCliente.jsx` contiene la lógica de exportación a imagen (`capturarNodoComoImagen`, `esperarProximoFrame`), ya corregida dos veces. Ese código **no se toca**; sólo cambian las clases del contenido que exporta, y la exportación se re-verifica como parte del checkpoint de ese grupo.
