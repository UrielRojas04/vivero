## 1. Modificación Estructural del Layout

- [x] 1.1 Modificar `DashboardLayout.jsx` para incluir un estado local `isSidebarOpen`.
- [x] 1.2 Adaptar las clases del layout principal en `DashboardLayout.jsx` para que use el 100% del ancho en mobile y respete el margen del Sidebar solo a partir de `md:`.

## 2. Componentes de Navegación

- [x] 2.1 Actualizar `Navbar.jsx` agregando un botón "Hamburguesa" que sea visible solo en pantallas chicas (`md:hidden`) para hacer toggle de `isSidebarOpen`.
- [x] 2.2 Modificar `Sidebar.jsx` para que tenga un diseño de "Drawer" (colapsable) en resoluciones menores a `md`.
- [x] 2.3 Agregar un overlay/backdrop (fondo oscuro) al `Sidebar.jsx` o `DashboardLayout.jsx` que permita cerrar el Sidebar al hacer click fuera de él en dispositivos móviles.

## 3. Revisión y Ajustes Finales

- [x] 3.1 Verificar que los z-index de Sidebar y el overlay sean suficientes para sobreponerse al contenido, pero inferiores a los de los modales.
- [x] 3.2 Probar la responsividad colapsando y abriendo la ventana del navegador (o en dispositivo real).
