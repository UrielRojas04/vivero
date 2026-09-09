package com.vivero.gestion.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

/**
 * Regla dura 5: nunca entidades JPA en endpoints. `clienteId` obligatorio (Decisión 7 de
 * design.md, no admite cliente casual). `firmaBase64` obligatoria (Decisión 5).
 */
@Data
public class EntregaPendienteRequestDTO {
    private Long clienteId;
    private String observacion;
    private String firmaBase64;
    private List<EntregaPendienteDetalleRequestDTO> detalles = new ArrayList<>();
}
