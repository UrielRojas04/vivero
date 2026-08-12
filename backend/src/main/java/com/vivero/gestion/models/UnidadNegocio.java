package com.vivero.gestion.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "unidades_negocio")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnidadNegocio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String descripcion;
    
    @Column(precision = 5, scale = 2)
    private java.math.BigDecimal costoEnvioPorcentaje = java.math.BigDecimal.ZERO;
    
    private boolean activo = true;
}
