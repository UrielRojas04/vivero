package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class VentaDetalleRequestDTO {
    private Long productoId;
    private Integer cantidad;
    // Precio por unidad ajustado para esta línea, opcional (Decisión 1 de design.md de
    // precio-editable-confirmacion-venta). null => el backend cae al precio de lista del
    // producto, comportamiento idéntico al de antes de este change.
    private BigDecimal precioUnitario;

    public VentaDetalleRequestDTO() {}

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
}
