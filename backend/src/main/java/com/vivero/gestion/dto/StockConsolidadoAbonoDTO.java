package com.vivero.gestion.dto;

public class StockConsolidadoAbonoDTO {
    private Long productoId;
    private String nombreProducto;
    private String nombreCategoria;
    private Integer stockInvernadero;
    private Integer stockColega;
    private Integer stockTotal;

    public StockConsolidadoAbonoDTO(Long productoId, String nombreProducto, String nombreCategoria, Integer stockInvernadero, Integer stockColega, Integer stockTotal) {
        this.productoId = productoId;
        this.nombreProducto = nombreProducto;
        this.nombreCategoria = nombreCategoria;
        this.stockInvernadero = stockInvernadero;
        this.stockColega = stockColega;
        this.stockTotal = stockTotal;
    }

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }

    public String getNombreProducto() { return nombreProducto; }
    public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }

    public String getNombreCategoria() { return nombreCategoria; }
    public void setNombreCategoria(String nombreCategoria) { this.nombreCategoria = nombreCategoria; }

    public Integer getStockInvernadero() { return stockInvernadero; }
    public void setStockInvernadero(Integer stockInvernadero) { this.stockInvernadero = stockInvernadero; }

    public Integer getStockColega() { return stockColega; }
    public void setStockColega(Integer stockColega) { this.stockColega = stockColega; }

    public Integer getStockTotal() { return stockTotal; }
    public void setStockTotal(Integer stockTotal) { this.stockTotal = stockTotal; }
}
