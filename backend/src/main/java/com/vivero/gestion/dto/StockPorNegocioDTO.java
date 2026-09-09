package com.vivero.gestion.dto;

public class StockPorNegocioDTO {
    private String productoNombre;
    private Integer cantidad;
    private String duenoAnterior;
    private boolean esDevolucion;

    public StockPorNegocioDTO() {
    }

    public StockPorNegocioDTO(String productoNombre, Integer cantidad) {
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
    }

    public StockPorNegocioDTO(String productoNombre, Integer cantidad, String duenoAnterior, boolean esDevolucion) {
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
        this.duenoAnterior = duenoAnterior;
        this.esDevolucion = esDevolucion;
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

    public String getDuenoAnterior() {
        return duenoAnterior;
    }

    public void setDuenoAnterior(String duenoAnterior) {
        this.duenoAnterior = duenoAnterior;
    }

    public boolean isEsDevolucion() {
        return esDevolucion;
    }

    public void setEsDevolucion(boolean esDevolucion) {
        this.esDevolucion = esDevolucion;
    }
}
