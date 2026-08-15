# Mini Roadmap: UI Responsiva (Mobile-First)

Este es el plan de acción para hacer que todo el Sistema Vivero sea 100% responsivo, cómodo y profesional en celulares (iPhone, Samsung, Motorola) sin perder la potencia en escritorio.

## Reglas de Diseño "Mobile-First"
- **Cards en vez de Tablas:** Todas las secciones que usen tablas para listar datos (Catálogos, Historiales, Cheques, etc.) deben implementar un diseño dual: `<div className="grid grid-cols-1 gap-4 sm:hidden">` para mostrar tarjetas (Cards) en móviles, y `<div className="hidden sm:block">` para mantener la tabla en pantallas grandes. Las tarjetas deben mostrar la misma información que la tabla, con acciones accesibles mediante botones amplios (`flex-1`).
- **Navegación:** `Sidebar` oculto por defecto, accesible vía menú hamburguesa (Drawer).
- **Modales:** Ocupan 100% de la pantalla (`h-full`, `rounded-none`, `max-h-screen`) y con scroll interno. Teclados numéricos deben abrirse automáticamente en campos monetarios (`inputMode="numeric"`).
- **Acciones:** Botones grandes y "touch-friendly", agrupados lógicamente (ej. side-by-side).

Usaremos Tailwind CSS (`sm:`, `md:`, `lg:`) para que las tablas se conviertan en tarjetas o se puedan scrollear, los menús se colapsen y los modales ocupen toda la pantalla en móviles.

## Etapa 1: Estructura Global y Navegación
**Change propuesto:** `ui-responsive-layout` **(✅ COMPLETADO Y ARCHIVADO)**
- **Sidebar (Menú lateral):** Ocultarlo por defecto en celulares y agregar un botón "Hamburguesa" en la barra superior para abrirlo como un cajón deslizante (Drawer).
- **Navbar (Barra superior):** Ajustar el perfil del usuario, el selector de Unidad de Negocio y los botones de logout para que no se superpongan en pantallas chicas.
- **Contenedores principales:** Asegurar que el `DashboardLayout` tenga los paddings correctos en mobile para aprovechar al máximo la pantalla.

## Etapa 2: Catálogos (Productos e Insumos)
**Change propuesto:** `ui-responsive-catalogo`
- **Grillas y Tablas:** Transformar las tablas de ABM (Productos, Insumos, Marcas) en un diseño de "Tarjetas" (Cards) en mobile, o hacer que la tabla sea scrolleable horizontalmente de forma elegante.
- **Modales de ABM:** Hacer que los modales de "Nuevo Producto" o "Editar Insumo" ocupen el 100% del ancho y alto en celulares (fullscreen modal), con botones fijos abajo para fácil acceso con el pulgar.
- **Buscadores y Botones:** Poner el buscador en una fila completa y los botones de acción ("Nuevo") flotantes (FAB) o debajo del buscador para que no queden apretados.

## Etapa 3: Punto de Venta (Core)
**Change propuesto:** `ui-responsive-ventas`
- **Pantalla Nueva Venta:** Reorganizar la pantalla dividida. En celular, mostrar primero la búsqueda de clientes y productos, y el "Carrito" dejarlo como un panel colapsable abajo o un botón flotante que indique la cantidad de items y abra el resumen a pantalla completa.
- **Modal de Liquidación:** Ajustar los inputs numéricos (descuentos, pagos múltiples) para que el teclado numérico del celular sea cómodo, apilando los métodos de pago verticalmente.
- **Historial de Ventas:** Adaptar la tabla y el modal del comprobante/remito para que se lean bien en vertical.

## Etapa 4: Clientes y Cuentas Corrientes
**Change propuesto:** `ui-responsive-clientes`
- **ABM Clientes:** Listado de clientes adaptado a celular, priorizando nombre y saldo.
- **Panel de Cuentas Corrientes:** Ajustar los modales de "Ajustar Saldo" para que se vean bien. Mostrar claramente si el saldo es Deuda o a Favor con tipografía grande y colores vivos en mobile.

## Etapa 5: Finanzas y Cheques
**Change propuesto:** `ui-responsive-finanzas`
- **Gestión de Cheques:** El panel de cheques suele tener muchas columnas (banco, monto, fechas, estado). En celular, mostrar una vista tipo lista de tarjetas donde destaquen el monto y los días restantes para cobro.
- **Gestión de Cheques:** El panel de cheques suele tener muchas columnas (banco, monto, fechas, estado). En celular, mostrar una vista tipo lista de tarjetas donde destaquen el monto y los días restantes para cobro.
- **Modales de Endoso/Rechazo:** Ajustar el `ChequeEstadoModal` para que los radio buttons y selectores de clientes caigan bien al dedo.

## Etapa 6: Mejoras de UX Cross-Sección ✅ COMPLETADO
**Sesión:** 2026-08-14 — Aplicado sin change dedicado (parte de `ui-responsive-catalogo`)

### ✅ Card Layout en TODAS las secciones
Se aplicó el patrón `grid sm:hidden` (cards) + `hidden sm:block` (tabla) a las páginas que aún no lo tenían:
- `VariedadesPlantas.jsx` — cards + tabla desktop
- `VariedadesBandejas.jsx` — cards + tabla desktop
- `UsuariosAdmin.jsx` — cards por tab (Usuarios / Roles) + tabla desktop

`Clientes`, `Productos`, `Insumos` y `Siembras` ya lo tenían implementado correctamente.

### ✅ Modal de Confirmación de Eliminación (`askConfirm`) en TODAS las secciones
Se migró todo llamado directo a `handleDelete` (sin confirmación) al patrón unificado `askConfirm`:
- `Siembras.jsx` — fix en card mobile (el botón desktop ya lo tenía)
- `VariedadesBandejas.jsx` — **bug fix crítico**: `pushToast` y `askConfirm` no estaban desestructurados del store (RTE en runtime)
- `UsuariosAdmin.jsx` — ya tenía `askConfirm`, se mantuvo en ambas vistas

### Regla establecida para nuevas secciones
> Toda acción de eliminación DEBE usar `askConfirm({ title, message, variant: 'danger', confirmLabel, onConfirm })`.  
> Jamás llamar `handleDelete(id)` directamente desde un `onClick`.

### Pendiente de esta etapa
- [ ] Teclados numéricos (`type="number" inputMode="numeric"`) en todos los formularios con campos monetarios o de cantidad (SiembraForm, InsumoForm, ProductoForm, ClienteForm)
- [ ] Botón "Conversor" de Siembras: actualmente `flex-row` pero revisar comportamiento en viewports muy pequeños (< 360px)
