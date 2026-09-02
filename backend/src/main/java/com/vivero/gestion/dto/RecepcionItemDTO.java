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
    // Opcional (grupo 12, extensión post-cierre de codigo-barras-herramientas): código de barras
    // escaneado/tipeado en el momento de confirmar la recepción, para no tener que ir después al
    // catálogo. null/vacío cuando el usuario no usó el escáner para esta línea.
    private String codigoBarra;
}
