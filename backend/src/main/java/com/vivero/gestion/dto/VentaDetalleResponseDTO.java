package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class VentaDetalleResponseDTO {
    private Long id;
    private Long productoId;
    private String productoNombre;
    private Integer cantidad;
    private BigDecimal precioUnitarioHistorico;
    private BigDecimal subtotal;

    public VentaDetalleResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitarioHistorico() { return precioUnitarioHistorico; }
    public void setPrecioUnitarioHistorico(BigDecimal precioUnitarioHistorico) { this.precioUnitarioHistorico = precioUnitarioHistorico; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
