## Context

Actualmente el sistema cuenta con la gestión de Productos (Plantas) en el frontend. Se necesita incorporar de forma análoga la gestión de Insumos (sustratos, herramientas, perlitas, etc.). Esto requiere una nueva vista en el `DashboardLayout` consumiendo la API de insumos existente.
Además, según el feedback del usuario, es mandatorio que el diseño sea **100% responsive (mobile-first)** para facilitar su uso desde celulares, manteniendo la estética moderna (glassmorphism) ya implementada.

## Goals / Non-Goals

**Goals:**
- Proveer una vista de grilla/lista responsiva para los Insumos.
- Reutilizar o replicar el patrón de formulario modal (glassmorphism, animaciones) adaptado a las propiedades del Insumo.
- Asegurar que la vista sea perfectamente usable en dispositivos móviles (tablas adaptables o vista de tarjetas en mobile).

**Non-Goals:**
- No se modificará el backend (`InsumoController`), asumimos que ya provee los endpoints necesarios (`GET /api/insumos`, `POST`, `PUT`, `DELETE`).
- No se manejará lógica financiera ni ventas todavía (eso es parte de cambios posteriores).

## Decisions

- **UI Responsive (Tarjetas vs Tablas):** En vista de escritorio (md o lg en adelante), se usará una tabla similar a la de Productos. En vista móvil (por defecto), los insumos se renderizarán como tarjetas apiladas (cards) para evitar el scroll horizontal forzado, o una tabla comprimida optimizada.
- **Formulario Modal Reusable:** Se creará un `InsumoForm.jsx` que siga el mismo patrón que `ProductoForm.jsx`, utilizando las animaciones del tailwind theme (`fadeIn`, `scaleIn`) agregadas en el change anterior.
- **Estado Local:** La data de la lista de insumos se manejará con estado local (`useState`, `useEffect`) dentro de `Insumos.jsx`, ya que no se necesita compartir globalmente como el JWT.

## Risks / Trade-offs

- **Duplicación de Código (DRY):** Al crear `Insumos.jsx` e `InsumoForm.jsx` va a haber código muy similar a Productos.
  *Mitigación*: Mantendremos la duplicación por ahora para no sobre-abstraer componentes (prematura optimización), ya que en un futuro los insumos pueden requerir campos específicos que las plantas no tienen (ej: litros, kilos, marca).
- **Usabilidad en Móviles:** Modales con muchos campos pueden ser difíciles de usar en celulares.
  *Mitigación*: El formulario será de una sola columna en pantallas chicas, aprovechando todo el ancho disponible y asegurando un fácil touch.
