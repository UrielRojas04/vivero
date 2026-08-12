package com.vivero.gestion.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "variedades_plantas")
@Data
public class VariedadPlanta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nombre;
    private String descripcion;
    
    // Días de crecimiento por mes
    private Integer diasEnero;
    private Integer diasFebrero;
    private Integer diasMarzo;
    private Integer diasAbril;
    private Integer diasMayo;
    private Integer diasJunio;
    private Integer diasJulio;
    private Integer diasAgosto;
    private Integer diasSeptiembre;
    private Integer diasOctubre;
    private Integer diasNoviembre;
    private Integer diasDiciembre;
}
