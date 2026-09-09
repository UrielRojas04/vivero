package com.vivero.gestion.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Respuesta dedicada de GET /{id}/firma (Decisión 6 de design.md): la firma nunca viaja en un listado. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaPendienteFirmaDTO {
    private String firmaBase64;
}
