## ADDED Requirements

### Requirement: Frontend Base SPA
El sistema MUST tener una SPA construida con Vite, React 19 y TailwindCSS v4 que maneje el estado de autenticación de forma global usando Zustand.

#### Scenario: Acceso restringido sin autenticación
- **WHEN** un usuario no autenticado intenta acceder a la ruta `/dashboard`
- **THEN** el sistema lo redirige a la pantalla de `/login`

#### Scenario: Acceso permitido con autenticación
- **WHEN** un usuario autenticado y con JWT en el store global accede a `/dashboard`
- **THEN** el sistema le permite visualizar la página

### Requirement: Diseño y UI
La interfaz gráfica MUST presentar un diseño moderno (ej. glassmorphism) sin depender fuertemente de librerías de componentes externas.

#### Scenario: Carga de la aplicación
- **WHEN** el usuario ingresa al root `/`
- **THEN** puede ver la interfaz con la paleta de colores y estilos base definidos en TailwindCSS v4
