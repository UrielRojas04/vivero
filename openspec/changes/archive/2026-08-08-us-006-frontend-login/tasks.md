## 1. Setup inicial del Frontend

- [x] 1.1 Eliminar el directorio `frontend` actual si existe y crear un nuevo proyecto Vite con React (`npx create-vite@latest frontend --template react`).
- [x] 1.2 Instalar dependencias base en `frontend/`: `npm install`, `npm install zustand react-router-dom axios lucide-react`.
- [x] 1.3 Configurar TailwindCSS v4: instalar `tailwindcss@next @tailwindcss/vite@next` y configurar `vite.config.js` y el archivo `index.css`.

## 2. Gestión de Estado y Ruteo

- [x] 2.1 Crear el store global con Zustand en `src/store/useAuthStore.js` para manejar `token`, `user` y las acciones `login`/`logout`.
- [x] 2.2 Configurar React Router en `src/App.jsx` con rutas para `/login` y `/dashboard`.
- [x] 2.3 Crear un componente `ProtectedRoute` que redirija a `/login` si no hay token en el store.
- [x] 2.4 Configurar la instancia base de Axios en `src/api/axios.js` para que inyecte automáticamente el token (Bearer) sacado de Zustand en cada petición al backend.

## 3. Interfaces de Usuario

- [x] 3.1 Crear el componente `Login.jsx`. Diseño moderno usando TailwindCSS (sombras sutiles, bordes redondeados). Formulario con `username` y `password` (y PIN).
- [x] 3.2 Implementar la llamada a `/api/auth/login` desde el formulario, guardando el token y redirigiendo a `/dashboard`.
- [x] 3.3 Crear el layout principal en `Dashboard.jsx` con un sidebar/navbar básico y un mensaje de bienvenida.

## 4. Verificación

- [x] 4.1 Levantar el backend (`./mvnw spring-boot:run`).
- [x] 4.2 Levantar el frontend (`npm run dev`) y verificar que el login interactúa correctamente con el backend, almacena el token de manera unificada y permite el acceso al Dashboard.
