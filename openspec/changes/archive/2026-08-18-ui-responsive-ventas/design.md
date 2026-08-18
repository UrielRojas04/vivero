## Context

El módulo de Punto de Venta (Core) tiene la pantalla más compleja (`NuevaVenta.jsx`) que fue diseñada para PC con un split de 60/40 (Búsqueda vs Carrito). En móviles, este diseño se vuelve inutilizable debido al espacio horizontal limitado. Adicionalmente, los inputs del `LiquidacionModal` abren teclados de texto en lugar de teclados numéricos, y la tabla de historial requiere scroll en dispositivos móviles.

## Goals / Non-Goals

**Goals:**
- Que `NuevaVenta.jsx` sea funcional en pantallas menores a 768px.
- Que el carrito pase a un modal o panel inferior en formato mobile.
- Que todos los inputs monetarios y de cantidades usen el teclado nativo numérico (`type="number"` y `inputMode="numeric"`).
- Que el historial de ventas adopte el patrón Card (como ya se implementó en otras vistas de catálogo).

**Non-Goals:**
- Reescribir la lógica de carrito global o el state management (zustand).
- Alterar el backend. Todo el cambio es puramente visual y de UX.

## Decisions

- **Layout Mobile del Carrito:** En lugar de apilar (que requeriría mucho scroll vertical para llegar al botón de cobro), en `sm:hidden` el panel de carrito se moverá a un modal fullscreen con un FAB (Floating Action Button) o barra fija inferior que indique el total y cantidad de ítems.
- **Teclado Numérico:** Se empleará `type="number"` combinado con `inputMode="numeric"` y `pattern="[0-9]*"` para garantizar máxima compatibilidad con iOS y Android sin renderizar spinners nativos feos (usando CSS para esconder spinners).

## Risks / Trade-offs

- **Complejidad del State:** Extraer el carrito a un modal en mobile y mantenerlo a la derecha en desktop en el mismo archivo JSX puede ensuciar el código (mucha renderización condicional). **Mitigación:** Extraer el UI del carrito a un subcomponente o controlar las clases de Tailwind de forma que se reutilice el mismo DOM (ej: `fixed inset-0 z-50 bg-white sm:relative sm:block sm:inset-auto sm:z-auto`).
