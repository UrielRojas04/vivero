package com.vivero.gestion.dto;

import java.time.LocalDateTime;

import com.vivero.gestion.models.EstadoEntregaPendiente;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de listado (Decisión 6 de design.md): a propósito NUNCA incluye la firma -- una página de
 * 20 entregas con la firma embebida serían ~400 KB de base64 por request para una imagen que el
 * dueño mira una vez. La firma se pide aparte, de a una, con GET /{id}/firma.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaPendienteResumenDTO {
    private Long id;
    private LocalDateTime fecha;
    private Long clienteId;
    private String clienteNombre;
    private String usuarioRegistroNombre;
    private EstadoEntregaPendiente estado;
    private Integer cantidadLineas;
    private Integer cantidadTotalUnidades;
}
