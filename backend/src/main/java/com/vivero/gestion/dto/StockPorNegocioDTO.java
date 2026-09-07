package com.vivero.gestion.dto;

public class StockPorNegocioDTO {
    private String productoNombre;
    private Integer cantidad;

    public StockPorNegocioDTO() {
    }

    public StockPorNegocioDTO(String productoNombre, Integer cantidad) {
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
    }

    public String getProductoNombre() {
        return productoNombre;
    }

    public void setProductoNombre(String productoNombre) {
        this.productoNombre = productoNombre;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }
}
