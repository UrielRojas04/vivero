package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class ProductoDTO {

    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private Integer stock;
    private String lote;
    private String dueno;
    private BigDecimal costoProducto;
    private BigDecimal porcentajeGanancia;
    private BigDecimal descuentoProveedor;
    private BigDecimal costoUnitarioHistorico;

    public ProductoDTO() {}

    public ProductoDTO(Long id, String nombre, String descripcion, BigDecimal precio, BigDecimal costoProducto, Integer stock, String lote, String dueno) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.costoProducto = costoProducto;
        this.stock = stock;
        this.lote = lote;
        this.dueno = dueno;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }

    public String getDueno() { return dueno; }
    public void setDueno(String dueno) { this.dueno = dueno; }

    public BigDecimal getCostoProducto() { return costoProducto; }
    public void setCostoProducto(BigDecimal costoProducto) { this.costoProducto = costoProducto; }

    public BigDecimal getPorcentajeGanancia() { return porcentajeGanancia; }
    public void setPorcentajeGanancia(BigDecimal porcentajeGanancia) { this.porcentajeGanancia = porcentajeGanancia; }

    public BigDecimal getDescuentoProveedor() { return descuentoProveedor; }
    public void setDescuentoProveedor(BigDecimal descuentoProveedor) { this.descuentoProveedor = descuentoProveedor; }

    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    public void setCostoUnitarioHistorico(BigDecimal costoUnitarioHistorico) { this.costoUnitarioHistorico = costoUnitarioHistorico; }
}
