FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn

RUN ./mvnw dependency:go-offline -B

COPY src ./src

RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/moustass-auth-service-1.0.0.jar app.jar

RUN mkdir -p logs

EXPOSE 8000

ENTRYPOINT ["java", "-jar", "app.jar"]