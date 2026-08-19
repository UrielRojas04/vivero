package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.vivero.gestion.models.EstadoPedido;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedidoDTO {
    private Long id;
    private Long proveedorId;
    private String proveedorNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaRecepcion;
    private EstadoPedido estado;
    private String usuarioNombre;
    private String observaciones;
    private List<PedidoDetalleDTO> detalles;
    // Calculado (Σ cantidadPedida × costoUnitarioPactado), no persistido — Open Question 5 de
    // design.md, recomendación aplicada.
    private BigDecimal total;
}
