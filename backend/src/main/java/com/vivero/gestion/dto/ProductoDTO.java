package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductoDTO {

    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private Integer stock;
    private Long marcaId;
    private String marcaNombre;
    private String lote;
    private String dueno;
    private BigDecimal costoProducto;
    private BigDecimal porcentajeGanancia;
    private BigDecimal descuentoProveedor;
    private BigDecimal costoUnitarioHistorico;

    // Campos nuevos de costeo-flexible-por-producto (grupo 8). ivaPorcentaje y
    // costoEnvioPorcentaje viajan tal cual: null == "hereda el default de la unidad de negocio"
    // (Decisión 5) — el service los persiste respetando ese null, nunca lo convierte en 0.
    private List<ProductoDescuentoDTO> descuentos = new ArrayList<>();
    private BigDecimal ivaPorcentaje;
    private BigDecimal costoEnvioPorcentaje;

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

    public Long getMarcaId() { return marcaId; }
    public void setMarcaId(Long marcaId) { this.marcaId = marcaId; }

    public String getMarcaNombre() { return marcaNombre; }
    public void setMarcaNombre(String marcaNombre) { this.marcaNombre = marcaNombre; }

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

    public List<ProductoDescuentoDTO> getDescuentos() { return descuentos; }
    public void setDescuentos(List<ProductoDescuentoDTO> descuentos) { this.descuentos = descuentos; }

    public BigDecimal getIvaPorcentaje() { return ivaPorcentaje; }
    public void setIvaPorcentaje(BigDecimal ivaPorcentaje) { this.ivaPorcentaje = ivaPorcentaje; }

    public BigDecimal getCostoEnvioPorcentaje() { return costoEnvioPorcentaje; }
    public void setCostoEnvioPorcentaje(BigDecimal costoEnvioPorcentaje) { this.costoEnvioPorcentaje = costoEnvioPorcentaje; }
}
