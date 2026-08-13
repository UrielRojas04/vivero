package com.vivero.gestion.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.Formula;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Entity
@Table(name = "productos")
@SQLDelete(sql = "UPDATE productos SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(nullable = false)
    private Integer stock = 0;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @Column(length = 100)
    private String lote;

    @Column(length = 100)
    private String dueno;

    @Column(precision = 10, scale = 2)
    private BigDecimal costoProducto;

    @Column(name = "porcentaje_ganancia")
    private BigDecimal porcentajeGanancia;

    @Column(precision = 5, scale = 2)
    private BigDecimal descuentoProveedor = BigDecimal.ZERO;

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    @Formula("(SELECT COALESCE(m.costo_unitario, p.costo_producto, 0) FROM movimientos_stock m LEFT JOIN productos p ON p.id = m.producto_id WHERE m.producto_id = id AND m.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') ORDER BY m.fecha DESC LIMIT 1)")
    private BigDecimal costoUnitarioHistorico;

    public Producto() {}

    public Producto(String nombre, String descripcion, BigDecimal precio, BigDecimal costoProducto, Integer stock, String lote, String dueno) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.costoProducto = costoProducto;
        this.descuentoProveedor = BigDecimal.ZERO;
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

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }

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
    
    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    
    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    // No setter for @Formula field
}
