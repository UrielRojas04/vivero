## Context

Las pantallas de catálogo (Productos, Insumos, Siembras) tienen un diseño clásico de tabla de datos, con una fila de acciones arriba (Buscador, botón "Nuevo"). En pantallas menores a 768px, las tablas HTML clásicas `<table>` sin `overflow-x-auto` rompen el viewport de la página. Además, los modales con ancho fijo o márgenes grandes quedan inaccesibles en pantallas pequeñas.

## Goals / Non-Goals

**Goals:**
- Envolver las tablas de datos en contenedores con `overflow-x-auto` para que sean scrollables horizontalmente sin romper el layout general.
- Hacer que la cabecera de la página (Título + Botón Nuevo) se adapte (ej. usar Flexbox wrap o columnas en mobile).
- Hacer que los Modales asociados a estas pantallas sean `w-full h-full` en anchos menores a `sm` o `md`, eliminando márgenes para que parezcan una nueva pantalla.

**Non-Goals:**
- Refactorizar las tablas a un sistema de Cards (tarjetas). Mantendremos la tabla por simplicidad, pero agregaremos el scroll horizontal que es el estándar más rápido y efectivo para interfaces administrativas en mobile.

## Decisions

- **Tablas Scrollables:** Se envolverá la etiqueta `<table>` en un `<div className="overflow-x-auto w-full">`. Se añadirá `min-w-max` o `whitespace-nowrap` a celdas críticas para que no se aprieten las columnas de forma ilegible.
- **Botones de acción superior:** La fila que contiene el `<input>` de búsqueda y el botón `<button>` de nuevo registro usará `flex-col sm:flex-row`, para que en mobile ocupen el 100% del ancho y caigan uno abajo del otro.
- **Modales Fullscreen:** En `ProductoForm.jsx`, `InsumoForm.jsx` y `SiembraForm.jsx`, el contenedor principal del modal cambiará de un tamaño fijo/max a `fixed inset-0 sm:inset-auto sm:max-w-md` etc.

## Risks / Trade-offs

- **Experiencia de Modales:** Un modal fullscreen en mobile puede perder el contexto del fondo.
  *Mitigación:* Es un trade-off aceptable y un estándar en apps móviles para evitar problemas con el teclado virtual tapando inputs.
