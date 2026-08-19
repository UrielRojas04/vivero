package com.vivero.gestion.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecepcionPedidoDTO {
    // Debe traer, sin excepción, un ítem por cada PedidoDetalle del pedido (payload incompleto se
    // rechaza — tarea 6.6). El frontend manda todos los ítems, no sólo los que el usuario tocó.
    private List<RecepcionItemDTO> items;
}
