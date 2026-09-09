package com.vivero.gestion.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BandejasDisponiblesDTO {
    private String variedad;
    private int stockFisico;
    private int encargadas;
    private int disponible;
    private Integer diasParaCosecha; // null si ya hay stock físico, o número de días si solo hay siembra
    private String duenoAnterior;
    private boolean esDevolucion;
}
