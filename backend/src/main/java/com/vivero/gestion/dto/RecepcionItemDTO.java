package com.vivero.gestion.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecepcionItemDTO {
    private Long detalleId;
    private Integer cantidadRecibida;
}
