# Stage 1: Build con Maven
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# Copiar pom.xml primero para cachear dependencias
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copiar código fuente y compilar
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# Stage 2: Runtime liviano
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
