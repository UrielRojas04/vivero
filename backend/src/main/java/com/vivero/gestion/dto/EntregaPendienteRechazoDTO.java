package com.vivero.gestion.dto;

import lombok.Data;

/** Body de POST /{id}/rechazar. `motivo` es opcional (Decisión 2 de design.md). */
@Data
public class EntregaPendienteRechazoDTO {
    private String motivo;
}
