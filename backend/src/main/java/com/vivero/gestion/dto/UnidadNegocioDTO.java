package com.vivero.gestion.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnidadNegocioDTO {
    private Long id;
    private String nombre;
    private String descripcion;
    private java.math.BigDecimal costoEnvioPorcentaje;
    private boolean activo;
}
