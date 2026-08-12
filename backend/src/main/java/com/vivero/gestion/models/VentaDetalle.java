package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "venta_detalles")
@SQLDelete(sql = "UPDATE venta_detalles SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class VentaDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id")
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;

    private Integer cantidad;
    private BigDecimal precioUnitarioHistorico;

    private BigDecimal subtotal;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    public VentaDetalle() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Venta getVenta() { return venta; }
    public void setVenta(Venta venta) { this.venta = venta; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitarioHistorico() { return precioUnitarioHistorico; }
    public void setPrecioUnitarioHistorico(BigDecimal precioUnitarioHistorico) { this.precioUnitarioHistorico = precioUnitarioHistorico; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
