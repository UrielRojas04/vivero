package com.vivero.gestion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;
import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        // Esta línea fuerza a la JVM a usar UTC antes de arrancar Spring
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(BackendApplication.class, args);
    }

    @PostConstruct
    public void init(){
        // Refuerzo para asegurar que la app use UTC
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}