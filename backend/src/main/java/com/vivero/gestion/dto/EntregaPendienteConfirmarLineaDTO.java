package com.vivero.gestion.dto;

import java.math.BigDecimal;

import lombok.Data;

/**
 * Precio por línea al confirmar, identificada por `detalleId` (no `productoId`: Decisión 13 de
 * design.md -- la misma entrega puede repetir el mismo producto en dos líneas con precio distinto).
 */
@Data
public class EntregaPendienteConfirmarLineaDTO {
    private Long detalleId;
    private BigDecimal precioUnitario;
}
