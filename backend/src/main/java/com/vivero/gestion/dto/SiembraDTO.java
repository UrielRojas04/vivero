package com.vivero.gestion.dto;

import java.time.LocalDate;

import com.vivero.gestion.models.EstadoSiembra;
import com.vivero.gestion.models.TipoOrigenSiembra;

import lombok.Data;

@Data
public class SiembraDTO {
    private Long id;
    private VariedadPlantaDTO variedadPlanta;
    private VariedadBandejaDTO variedadBandeja;
    private LocalDate fechaEstimada;
    private String dueno;
    private String codigoLote;
    private String numeroSiembra;
    private LocalDate fechaSiembraInicio;
    private LocalDate fechaSiembraFin;
    private TipoOrigenSiembra tipoOrigen;
    private Integer cantidad;
    private EstadoSiembra estado;
}
