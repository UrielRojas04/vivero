// Archivo: src/main/java/com/vivero/gestion/models/Ubicacion.java
package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "ubicaciones")
@Data
public class Ubicacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nombre;
    private String tipo;   // "INVERNADERO" o "TELA"

    private Integer capacidadMax = 0;
    private Boolean bloqueada = false; //INDICA SI LA ZONA ESTÁ OPERATIVA
}