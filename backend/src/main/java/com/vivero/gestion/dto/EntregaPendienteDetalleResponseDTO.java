package com.vivero.gestion.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Línea de {@link EntregaPendienteResponseDTO}. `precioListaActual` es sólo informativo (el
 * precio de catálogo del producto AL MOMENTO DE CONSULTAR, no el que se va a cobrar -- ese lo fija
 * el dueño recién al confirmar). `detalleId` es lo que `EntregaPendienteConfirmarRequestDTO`
 * espera para identificar cada línea (no `productoId`: la misma entrega puede repetir el mismo
 * producto en dos líneas con precio distinto, Decisión 13 de design.md).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaPendienteDetalleResponseDTO {
    private Long detalleId;
    private Long productoId;
    private String productoNombre;
    private Integer cantidad;
    private BigDecimal precioListaActual;
}
