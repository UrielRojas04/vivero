package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class VentaDetalleResponseDTO {
    private Long id;
    private Long productoId;
    private String productoNombre;
    private Integer cantidad;
    private BigDecimal precioUnitarioHistorico;
    private BigDecimal costoUnitarioHistorico;
    private BigDecimal costoBaseHistorico;
    private BigDecimal descuentoPorcentajeHistorico;
    private BigDecimal envioPorcentajeHistorico;
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
    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    public void setCostoUnitarioHistorico(BigDecimal costoUnitarioHistorico) { this.costoUnitarioHistorico = costoUnitarioHistorico; }
    public BigDecimal getCostoBaseHistorico() { return costoBaseHistorico; }
    public void setCostoBaseHistorico(BigDecimal costoBaseHistorico) { this.costoBaseHistorico = costoBaseHistorico; }
    public BigDecimal getDescuentoPorcentajeHistorico() { return descuentoPorcentajeHistorico; }
    public void setDescuentoPorcentajeHistorico(BigDecimal descuentoPorcentajeHistorico) { this.descuentoPorcentajeHistorico = descuentoPorcentajeHistorico; }
    public BigDecimal getEnvioPorcentajeHistorico() { return envioPorcentajeHistorico; }
    public void setEnvioPorcentajeHistorico(BigDecimal envioPorcentajeHistorico) { this.envioPorcentajeHistorico = envioPorcentajeHistorico; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
