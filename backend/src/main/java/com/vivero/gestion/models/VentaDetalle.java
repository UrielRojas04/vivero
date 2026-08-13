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
    @Column(name = "costo_unitario_historico", precision = 12, scale = 2)
    private BigDecimal costoUnitarioHistorico = BigDecimal.ZERO;

    @Column(name = "costo_base_historico", precision = 12, scale = 2)
    private BigDecimal costoBaseHistorico = BigDecimal.ZERO;

    @Column(name = "descuento_porc_historico", precision = 5, scale = 2)
    private BigDecimal descuentoPorcentajeHistorico = BigDecimal.ZERO;

    @Column(name = "envio_porc_historico", precision = 5, scale = 2)
    private BigDecimal envioPorcentajeHistorico = BigDecimal.ZERO;

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
    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    public void setCostoUnitarioHistorico(BigDecimal costoUnitarioHistorico) { this.costoUnitarioHistorico = costoUnitarioHistorico; }
    public BigDecimal getCostoBaseHistorico() { return costoBaseHistorico; }
    public void setCostoBaseHistorico(BigDecimal costoBaseHistorico) { this.costoBaseHistorico = costoBaseHistorico; }
    public BigDecimal getDescuentoPorcentajeHistorico() { return descuentoPorcentajeHistorico; }
    public void setDescuentoPorcentajeHistorico(BigDecimal descuentoPorcentajeHistorico) { this.descuentoPorcentajeHistorico = descuentoPorcentajeHistorico; }
    public BigDecimal getEnvioPorcentajeHistorico() { return envioPorcentajeHistorico; }
    public void setEnvioPorcentajeHistorico(BigDecimal envioPorcentajeHistorico) { this.envioPorcentajeHistorico = envioPorcentajeHistorico; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
