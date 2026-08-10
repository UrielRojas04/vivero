package com.vivero.gestion.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HistorialBandejasDTO {
    private Long id;
    private Long clienteId;
    private String clienteNombre;
    private Long ventaId;
    private Integer cantidad;
    private String tipo;
    private LocalDateTime fecha;
    private String usuarioNombre;
}
