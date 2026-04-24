package com.vivero.gestion.models;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "tipos_bandeja")
@Data
public class TipoBandeja {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer celdas; // 325, 200, 140, etc.
    private String descripcion;
}