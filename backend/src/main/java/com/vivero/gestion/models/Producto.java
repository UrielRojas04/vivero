package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marca_id")
    private Marca marca;

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

    // Se conserva sin tocar como red de rollback (Decisión 8 de design.md de
    // costeo-flexible-por-producto): la fórmula deja de leerla en el grupo 5/6 de ese change,
    // pero la columna y su valor no se borran.
    @Column(precision = 5, scale = 2)
    private BigDecimal descuentoProveedor = BigDecimal.ZERO;

    // Lista libre de descuentos ESTABLES del producto (Decisión 1). Se combinan en cascada
    // (Decisión 2), nunca se suman. @BatchSize evita el N+1 en el listado (Decisión 11).
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    private List<ProductoDescuento> descuentos = new ArrayList<>();

    // Nullable, SIN valor por defecto a propósito (Decisión 5): null == "hereda el default de la
    // unidad de negocio", 0 == "no aplica para este producto". Inicializarlos en ZERO como hace
    // descuentoProveedor destruiría esa distinción antes de que exista (tarea 2.4).
    @Column(name = "iva_porcentaje", precision = 5, scale = 2)
    private BigDecimal ivaPorcentaje;

    @Column(name = "costo_envio_porcentaje", precision = 5, scale = 2)
    private BigDecimal costoEnvioPorcentaje;

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

    public Marca getMarca() { return marca; }
    public void setMarca(Marca marca) { this.marca = marca; }

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

    public List<ProductoDescuento> getDescuentos() { return descuentos; }
    public void setDescuentos(List<ProductoDescuento> descuentos) { this.descuentos = descuentos; }

    public BigDecimal getIvaPorcentaje() { return ivaPorcentaje; }
    public void setIvaPorcentaje(BigDecimal ivaPorcentaje) { this.ivaPorcentaje = ivaPorcentaje; }

    public BigDecimal getCostoEnvioPorcentaje() { return costoEnvioPorcentaje; }
    public void setCostoEnvioPorcentaje(BigDecimal costoEnvioPorcentaje) { this.costoEnvioPorcentaje = costoEnvioPorcentaje; }

    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    
    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    // No setter for @Formula field
}
