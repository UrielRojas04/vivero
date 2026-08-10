# Etapa de construcción
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de producción
FROM nginx:alpine
# Copiamos el build de Vite (que genera en dist/) a la carpeta de nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos una configuración básica de nginx para SPA (Single Page Applications)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
