package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class PasarStockRequestDTO {
    private BigDecimal precioVenta;
    private Integer stock;

    public PasarStockRequestDTO() {}

    public PasarStockRequestDTO(BigDecimal precioVenta, Integer stock) {
        this.precioVenta = precioVenta;
        this.stock = stock;
    }

    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }

    public void setPrecioVenta(BigDecimal precioVenta) {
        this.precioVenta = precioVenta;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }
}
