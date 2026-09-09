package com.vivero.gestion.dto;

import lombok.Data;

/** Línea de {@link EntregaPendienteRequestDTO}: producto + cantidad, SIN precio (Decisión 12 de design.md). */
@Data
public class EntregaPendienteDetalleRequestDTO {
    private Long productoId;
    private Integer cantidad;
}
