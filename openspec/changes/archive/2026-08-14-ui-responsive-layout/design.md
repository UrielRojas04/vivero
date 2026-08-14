## Context

Actualmente el frontend está implementado en React con Tailwind CSS. El `DashboardLayout.jsx` define un esquema de Grid o Flex que asume espacio horizontal abundante (Desktop). Para soportar dispositivos móviles (ej. 320px - 480px de ancho), es necesario que este Layout se vuelva dinámico, utilizando Media Queries (a través de las clases `md:`, `lg:` de Tailwind) para ocultar paneles no críticos y superponerlos bajo demanda.

## Goals / Non-Goals

**Goals:**
- Que el `Sidebar` desaparezca en anchos menores a `md` (768px).
- Incorporar un botón en el `Navbar` para hacer *toggle* del Sidebar en mobile.
- Cuando el Sidebar se abre en mobile, debe comportarse como un Drawer superpuesto, con un fondo oscuro (backdrop) detrás para cerrar al hacer click.
- Mantener el comportamiento exacto de escritorio (ancho fijo, sin backdrop) cuando la pantalla es ancha.

**Non-Goals:**
- Adaptar las pantallas internas (Ventas, Finanzas, etc.). Esas tendrán sus propios changes en el roadmap. Este change es SOLO estructural (`Layout`, `Sidebar`, `Navbar`).

## Decisions

- **State Management para Sidebar:** Se utilizará un estado local (`useState`) en `DashboardLayout` llamado `isSidebarOpen` (o se utilizará uno de Zustand si se prefiere persistencia, pero local es suficiente para UI efímera).
- **Drawer Behavior:** En pantallas pequeñas, el Sidebar se posicionará `fixed` con `z-index` alto. Se agregará un `div` con `fixed inset-0 bg-black/50` condicional a `isSidebarOpen` para el backdrop. En pantallas `md:`, se volverá `sticky` o `fixed` normal sin tapar contenido y con su respectivo margen izquierdo.
- **Botón Hamburguesa:** Se agregará al `Navbar.jsx`, utilizando el icono `Menu` de `lucide-react`.

## Risks / Trade-offs

- **Z-Index Conflicts:** El backdrop y el drawer podrían quedar tapados por modales existentes si los z-index no están bien estratificados.
  *Mitigación:* Se usará `z-40` para el Sidebar/Backdrop y se validará que los modales actuales tengan `z-50`.
