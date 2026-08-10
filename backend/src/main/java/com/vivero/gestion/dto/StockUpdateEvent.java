package com.vivero.gestion.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockUpdateEvent {
    private Long productoId;
    private Integer nuevoStock;
}
