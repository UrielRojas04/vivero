package com.vivero.gestion.dto;

public class StockPorNegocioDTO {
    private String productoNombre;
    private Integer cantidad;
    private String duenoAnterior;
    private boolean esDevolucion;
    // Sólo se completa para productos de Abono (pedido del dueño 2026-09-09) -- el resto de los
    // negocios no categoriza productos, así que queda null y el frontend simplemente no la muestra.
    private String categoriaAbonoNombre;

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

    public StockPorNegocioDTO(String productoNombre, Integer cantidad, String categoriaAbonoNombre) {
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
        this.categoriaAbonoNombre = categoriaAbonoNombre;
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

    public String getCategoriaAbonoNombre() {
        return categoriaAbonoNombre;
    }

    public void setCategoriaAbonoNombre(String categoriaAbonoNombre) {
        this.categoriaAbonoNombre = categoriaAbonoNombre;
    }
}
