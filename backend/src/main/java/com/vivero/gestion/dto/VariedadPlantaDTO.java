package com.vivero.gestion.dto;

import lombok.Data;

@Data
public class VariedadPlantaDTO {
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
    private Boolean enUso;
}
