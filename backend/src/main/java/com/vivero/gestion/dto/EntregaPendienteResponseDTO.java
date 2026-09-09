package com.vivero.gestion.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.vivero.gestion.models.EstadoEntregaPendiente;

import lombok.Data;

/**
 * Detalle completo de una entrega (con sus líneas), SIN la firma (Decisión 6 de design.md) --
 * la firma se pide aparte con GET /{id}/firma.
 */
@Data
public class EntregaPendienteResponseDTO {
    private Long id;
    private LocalDateTime fecha;
    private Long clienteId;
    private String clienteNombre;
    private Long usuarioRegistroId;
    private String usuarioRegistroNombre;
    private EstadoEntregaPendiente estado;
    private String observacion;
    private List<EntregaPendienteDetalleResponseDTO> detalles = new ArrayList<>();

    // Resolución (confirmación o rechazo), nulos mientras la entrega esté PENDIENTE.
    private Long ventaId;
    private Long usuarioResolucionId;
    private String usuarioResolucionNombre;
    private LocalDateTime fechaResolucion;
    private String motivoRechazo;
}
